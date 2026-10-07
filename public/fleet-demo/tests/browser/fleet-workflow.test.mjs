import {navigateStory} from '../../../../scripts/fleet-browser-controls.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import os from 'node:os';
import {measureFrameCadence} from '../performance/frame-cadence.mjs';

// Opt-in browser execution. Missing URL is a reported skip, never a browser pass.
const url=process.env.FLEET_BROWSER_URL;
const require=process.env.PLAYWRIGHT_PACKAGE?createRequire(join(resolve(process.env.PLAYWRIGHT_PACKAGE),'package.json')):createRequire(import.meta.url);
const state=page=>page.evaluate(()=>window.__fleetDemo.getState());
const textSettled=page=>page.waitForFunction(()=>{const t=window.__fleetDemo.getState().textTransition;return !t||t.phase==='idle';});
const closeDialogs=async page=>{for(const [dialog,close]of [['#source-dialog','#source-close']])if(await page.locator(dialog).isVisible())await page.locator(close).click();};
const freshFixture=async page=>{await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__fleetDemo);await textSettled(page);};
const canonical=(s,id='TRK-104')=>s.evaluation.vehicles.find(v=>v.vehicleId===id);
const goToStage=async(page,target)=>{await navigateStory(page,target);await textSettled(page);};
const openInspector=async page=>{if(!await page.locator('#source-inspector').isVisible()){await goToStage(page,6);await page.locator('#open-source-controls').click();}};
const revealControl=async(page,selector)=>{
  await openInspector(page);const target=page.locator(`#provenance ${selector}`);
  for(let depth=0;depth<4&&!await target.isVisible();depth++){
    const disclosure=page.locator('#provenance details:not([open])').filter({has:page.locator(selector)}).first();
    if(!await disclosure.count())break;await disclosure.locator(':scope > summary').click();
  }
  return target;
};
const action=(page,name)=>({click:async()=>{await(await revealControl(page,`[data-action="${name}"]`)).click();}});
const authority=(page,source)=>({click:async()=>{await(await revealControl(page,`[data-action="set-authority"][data-source="${source}"]`)).click();}});
const chooseVehicle=async(page,id)=>{await(await revealControl(page,'[data-vehicle-select]')).selectOption(id);await page.locator('#source-close').click();};

test('Fleet browser acceptance: interactive workflow and honest review boundary', {skip:!url,timeout:180000},async t=>{
  const revision=process.env.FLEET_SOURCE_REVISION;
  const environment=process.env.FLEET_TEST_ENV;
  assert.ok(revision,'Set FLEET_SOURCE_REVISION to the exact tested commit and any overlay description.');
  assert.ok(environment,'Set FLEET_TEST_ENV to a named execution environment.');
  const evidence=resolve(process.env.FLEET_EVIDENCE_DIR||'tests/browser/evidence');
  await mkdir(evidence,{recursive:true});
  const report={url,revision,environment,startedAt:new Date().toISOString(),host:{platform:os.platform(),release:os.release(),architecture:os.arch()},viewport:{width:1920,height:1080},console:[],pageErrors:[],failedRequests:[],scenarios:[]};
  let browser,page,context;
  try {
    const {chromium}=require('playwright');
    browser=await chromium.launch({headless:true,...(process.env.FLEET_CHROMIUM_PATH?{executablePath:process.env.FLEET_CHROMIUM_PATH}:{})});
    report.browserVersion=browser.version();
    context=await browser.newContext({viewport:report.viewport,deviceScaleFactor:1});
    page=await context.newPage();
    page.on('console',message=>report.console.push({type:message.type(),text:message.text()}));
    page.on('pageerror',error=>report.pageErrors.push(error.message));
    page.on('requestfailed',request=>report.failedRequests.push({url:request.url(),error:request.failure()?.errorText}));
    await page.goto(url,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__fleetDemo,{timeout:45000});
    await freshFixture(page);if(!(await state(page)).simulation.paused)await page.locator('#pause').click();
    const initial=await state(page);
    report.panel=await page.locator('#provenance .fp-panel').count()?'source-panel':'built-in fallback';
    const unchanged=(next,prior)=>{assert.deepEqual(next.scenario.readings,prior.scenario.readings);assert.deepEqual(next.scenario.serviceFacts,prior.scenario.serviceFacts);};
    const run=async(name,fn)=>t.test(name,async()=>{try{await fn();report.scenarios.push({name,status:'passed'});}catch(error){report.scenarios.push({name,status:'failed',error:error.message});throw error;}});

    await run('initial fixture makes missing authority visible while TRK-208 remains A',async()=>{
      assert.equal(canonical(initial).reason,'missing-authority');assert.equal(canonical(initial,'TRK-208').sourceId,'A');
      assert.equal(canonical(initial,'TRK-208').status,'resolved');
      assert.equal(initial.intro,true);assert.equal(await page.locator('#story-content').isVisible(),false);
      assert.equal(await page.locator('#project-info').isVisible(),true);
    });
    await run('opening project details transition to source inspector',async()=>{
      assert.equal(await page.locator('#project-info').isVisible(),true);
      assert.equal(await page.locator('#source-inspector').isVisible(),false);
      await openInspector(page);assert.equal(await page.locator('#source-inspector').isVisible(),true);
    });
    await run('B authority fixes only migrated truck and retains raw/service evidence',async()=>{
      await authority(page,'B').click();const next=await state(page);
      assert.equal(canonical(next).sourceId,'B');assert.equal(canonical(next).readingId,'v1-b-3');
      assert.deepEqual(canonical(next,'TRK-208'),canonical(initial,'TRK-208'));unchanged(next,initial);
      assert.equal(next.scenario.configVersion,2);
    });
    await run('field-scoped A exclusion preserves unmigrated A vehicle',async()=>{
      await(await revealControl(page,'[data-exclusion-scope]')).selectOption('field');
      await page.locator('#provenance [data-action="add-exclusion"][data-scope="choose"][data-source="A"]').click();
      const next=await state(page);assert.equal(next.scenario.exclusions.length,1);
      assert.equal(next.scenario.exclusions[0].vehicleId,'TRK-104');assert.equal(next.scenario.exclusions[0].field,'odometer');
      assert.equal(canonical(next,'TRK-208').sourceId,'A');assert.equal(canonical(next,'TRK-208').status,'resolved');unchanged(next,initial);
    });
    await run('replay twice is stable and duplicate reimport is idempotent',async()=>{
      const prior=await state(page);await action(page,'replay').click();await action(page,'replay').click();
      const next=await state(page);assert.deepEqual(next.evaluation,prior.evaluation);unchanged(next,prior);
      await action(page,'reimport').click();const imported=await state(page);unchanged(imported,prior);assert.equal(imported.scenario.readings.length,prior.scenario.readings.length);
    });
    await run('Today review is advisory, truthfully labeled, and notifies in app',async()=>{
      await goToStage(page,7);await page.locator('#run-story-review').click();const prior=await state(page);
      await action(page,'review-imports').click();await page.waitForFunction(()=>window.__fleetDemo.getState().review);
      const next=await state(page);assert.ok(['simulated','recorded'].includes(next.review.mode));assert.equal(next.review.live,false);
      assert.match(next.review.label,/simulated|recorded/i);assert.equal(next.review.notification.channel,'in-app only');
      assert.equal(next.scenario.configVersion,prior.scenario.configVersion);assert.deepEqual(next.scenario.policies,prior.scenario.policies);unchanged(next,prior);
      const text=await page.locator('#provenance').innerText();assert.match(text,/Manager notification/i);assert.match(text,/simulated|recorded/i);
      await page.screenshot({path:resolve(evidence,'today-review-1920x1080.png'),fullPage:true});
    });
    await run('a policy change invalidates cached review and notifications',async()=>{
      await authority(page,'A').click();const next=await state(page);
      assert.equal(next.review,null);assert.equal(next.intro,false);assert.equal(await page.locator('#story-content').isVisible(),true);assert.equal(canonical(next).reason,'authoritative-reading-excluded');
      assert.equal(canonical(next).valueKm,null);assert.equal(canonical(next,'TRK-208').status,'resolved');
      assert.equal(await page.locator('#provenance .fp-notification').count(),0);
    });
    await run('fresh fixture plus stale A authority stays unresolved despite available B readings',async()=>{
      await freshFixture(page);await openInspector(page);await authority(page,'A').click();const next=await state(page);
      assert.equal(canonical(next).reason,'stale-authoritative-reading');assert.equal(canonical(next).valueKm,null);
      assert.equal(canonical(next,'TRK-208').status,'resolved');
    });
    await run('row exclusion of authoritative newest reading stays unresolved without older fallback',async()=>{
      await authority(page,'B').click();await(await revealControl(page,'[data-action="add-exclusion"][data-reading="v1-b-3"]')).click();
      const next=await state(page);assert.equal(canonical(next).reason,'authoritative-reading-excluded');assert.equal(canonical(next).readingId,null);
      assert.equal(canonical(next,'TRK-208').status,'resolved');unchanged(next,initial);
    });
    await run('vehicle selection and view controls do not mutate domain',async()=>{
      const prior=await state(page);await chooseVehicle(page,'TRK-208');if(!(await state(page)).simulation.paused)await page.locator('#pause').click();await page.locator('[data-view="iso"]').click();
      for(const view of ['2d','3d','iso'])await page.locator(`[data-view="${view}"]`).click();
      const next=await state(page);assert.equal(next.selectedVehicleId,'TRK-208');assert.deepEqual(next.scenario,prior.scenario);
    });
    await run('pause and resume control scene time without mutating records',async()=>{
      if(!(await state(page)).simulation.paused)await page.locator('#pause').click();const prior=await state(page);assert.equal(prior.simulation.paused,true);
      await page.waitForTimeout(200);const next=await state(page);assert.equal(next.simulation.timeSeconds,prior.simulation.timeSeconds);unchanged(next,prior);
      await page.locator('#pause').click();assert.equal((await state(page)).simulation.paused,false);
    });
    await run('source dialog closes with Escape and preserves its chosen settings',async()=>{
      await openInspector(page);const prior=await state(page);assert.equal(await page.locator('#source-dialog').isVisible(),true);
      await page.keyboard.press('Escape');assert.equal(await page.locator('#source-dialog').isVisible(),false);
      assert.deepEqual((await state(page)).scenario,prior.scenario);
    });
    await run('returning to the opening preserves chosen source settings and history',async()=>{
      const prior=await state(page);await goToStage(page,0);const next=await state(page);
      assert.deepEqual(next.scenario,prior.scenario);assert.equal(next.mode,'then');assert.equal(next.stage,0);assert.equal(next.selectedVehicleId,initial.selectedVehicleId);assert.equal(next.intro,true);assert.equal(next.simulation.paused,true);assert.equal(await page.locator('#story-content').isVisible(),false);
    });
    await run('reload honestly restores this in-memory fixture',async()=>{
      await freshFixture(page);await openInspector(page);await authority(page,'B').click();await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__fleetDemo);
      assert.deepEqual((await state(page)).scenario,initial.scenario);
    });
    await run('narrow viewport retains essential authority controls',async()=>{
      await page.setViewportSize({width:390,height:844});await authority(page,'B').click();assert.equal(canonical(await state(page)).status,'resolved');
      await page.screenshot({path:resolve(evidence,'narrow-390x844.png'),fullPage:true});await page.setViewportSize(report.viewport);
    });
    report.frameEvidence=await measureFrameCadence(page,{durationMs:10000,environmentName:environment,sourceRevision:revision});
    await page.screenshot({path:resolve(evidence,'final-1920x1080.png'),fullPage:true});
    await run('no unhandled browser JavaScript errors',async()=>assert.deepEqual(report.pageErrors,[]));
    report.status=report.scenarios.some(s=>s.status==='failed')?'failed':'passed';
  } catch(error) {
    report.status=browser?'failed':'blocked-before-browser';report.error=error.message;throw error;
  } finally {
    report.finishedAt=new Date().toISOString();await writeFile(resolve(evidence,'browser-report.json'),JSON.stringify(report,null,2));await browser?.close();
  }
});

test('Fleet dependency failure: source controls survive unavailable CDN scripts',{skip:!url,timeout:60000},async()=>{
  const {chromium}=require('playwright');let browser;
  try{
    browser=await chromium.launch({headless:true,...(process.env.FLEET_CHROMIUM_PATH?{executablePath:process.env.FLEET_CHROMIUM_PATH}:{})});
    const page=await browser.newPage({viewport:{width:1920,height:1080}});
    await page.route('https://unpkg.com/**',route=>route.abort('blockedbyclient'));
    await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__fleetDemo);
    await openInspector(page);await authority(page,'B').click();assert.equal(canonical(await state(page)).status,'resolved');
    assert.match(await page.locator('#scene-notice').innerText(),/unavailable|fallback|2D/i);
    const metrics=await page.evaluate(()=>window.__fleetDemo.getMetrics());assert.match(metrics.renderer,/fallback/i);
  }finally{await browser?.close();}
});
