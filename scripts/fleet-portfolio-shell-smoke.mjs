import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(path.join(process.env.PLAYWRIGHT_PACKAGE||'/tmp/fleet-browser','package.json'));
const {chromium}=require('playwright');
const origin=(process.env.FLEET_PORTFOLIO_URL||'http://127.0.0.1:3000').replace(/\/$/,'');
const output=path.resolve(process.env.FLEET_SHELL_EVIDENCE_DIR||'fleet-browser-evidence/native-shell');
await fs.mkdir(output,{recursive:true});
const evidence={origin,startedAt:new Date().toISOString(),checks:[],errors:[],styles:{},notes:['Nine-scene native shell, playback, accessibility and lifecycle evidence. Browser cadence is not a target-GPU benchmark.']};
let browser,page,releaseInterrupted,phase='start';
const styles=(locator,properties)=>locator.evaluate((element,keys)=>{const style=getComputedStyle(element);return Object.fromEntries(keys.map(key=>[key,style[key]]));},properties);
const ready=page=>page.waitForFunction(()=>window.__fleetDemo?.getState()?.scenario&&document.querySelector('.fleet-scene-root'),undefined,{timeout:60000});
const tornDown=page=>page.waitForFunction(()=>!document.querySelector('#intro-panel')&&!document.querySelector('.fleet-scene-root')&&typeof window.__fleetDemo==='undefined',undefined,{timeout:15000});
const state=()=>page.evaluate(()=>window.__fleetDemo.getState());
const check=(label)=>evidence.checks.push(label);
const capture=name=>page.screenshot({path:path.join(output,name),fullPage:true});
const paused=async()=>{if(!(await state()).simulation.paused)await page.locator('#pause').click();};
const seek=async(index,progress=0)=>page.evaluate(([index,progress])=>window.__fleetDemo.seekStory(index,progress),[index,progress]);
const noOverflow=async label=>{const size=await page.evaluate(()=>({width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth}));assert.ok(size.scrollWidth<=size.width+1,`${label}: ${JSON.stringify(size)}`);check(label);};
const dockGeometry=()=>page.locator('.story-dock').evaluate(element=>{const rect=element.getBoundingClientRect();return{width:rect.width,height:rect.height,controls:[...element.querySelectorAll('button')].map(button=>button.id||button.dataset.sceneIndex)};});
try{
 browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1});
 page.on('pageerror',error=>evidence.errors.push({phase,message:error.message,stack:error.stack,url:page.url()}));
 phase='portfolio-reference';await page.goto(origin+'/',{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Reid Slaughter',exact:true}).waitFor();
 const typography=['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','color'];
 evidence.styles.homeTitle=await styles(page.getByRole('heading',{name:'Reid Slaughter',exact:true}),typography);
 evidence.styles.homeSidebar=await styles(page.locator('aside').first(),['paddingTop','paddingRight','paddingBottom','paddingLeft','position']);
 evidence.styles.homeFooter=await styles(page.locator('footer'),['fontFamily','fontSize','backgroundColor','borderTopColor']);
 phase='opening';await page.goto(origin+'/fleet-demo',{waitUntil:'domcontentloaded'});await ready(page);
 assert.equal((await state()).simulation.paused,false,'Default story autoplays');await page.locator('#reset').click();await paused();
 assert.equal(await page.locator('iframe').count(),0);assert.equal(await page.locator('#project-info dt').count(),6);assert.equal(await page.locator('nav[aria-label="Portfolio navigation"]').count(),0);
 evidence.styles.fleetTitle=await styles(page.locator('#intro-panel h1'),typography);assert.deepEqual(evidence.styles.fleetTitle,evidence.styles.homeTitle);
 assert.deepEqual(await styles(page.locator('aside[aria-label="Fleet case study"]'),['paddingTop','paddingRight','paddingBottom','paddingLeft','position']),evidence.styles.homeSidebar);
 assert.deepEqual(await styles(page.locator('footer'),['fontFamily','fontSize','backgroundColor','borderTopColor']),evidence.styles.homeFooter);
 assert.equal(await page.locator('#scene-steps button').count(),9);assert.equal((await state()).story.id,'question');assert.equal((await state()).selectedVehicleId,'TRK-104');
 await page.waitForFunction(()=>window.__fleetDemo?.getMetrics?.()?.ready,undefined,{timeout:60000});evidence.graphics=await page.evaluate(()=>window.__fleetDemo.getMetrics());
 await capture('01-opening-desktop.png');check('Native opening preserves shared portfolio type/sidebar/footer, all six fields and nine-scene playback');
 const initialDock=await dockGeometry();
 const ids=['question','integration','repeat-service','provider-switch','mileage-loop','cost','solution','agents','learning'];
 for(let index=0;index<9;index++){
  phase=`scene-${index+1}`;await page.locator(`#scene-steps [data-scene-index="${index}"]`).click();
  const current=await state();assert.equal(current.story.id,ids[index]);assert.equal(current.story.index,index);assert.equal(current.story.paused,true);
  assert.equal(await page.locator(`[data-story-overlay="${ids[index]}"]`).isVisible(),true);
  assert.equal(await page.locator('[data-story-overlay]:visible').count(),1);
  assert.equal(await page.locator('#story-content').isVisible(),index!==0);
  const geometry=await dockGeometry();assert.ok(Math.abs(geometry.width-initialDock.width)<=1);assert.ok(Math.abs(geometry.height-initialDock.height)<=1);assert.deepEqual(geometry.controls,initialDock.controls);
  await noOverflow(`Scene ${index+1} has no horizontal overflow`);await capture(`${String(index+2).padStart(2,'0')}-${ids[index]}-desktop.png`);
 }
 check('All nine scene buttons pause and navigate with one visible overlay and an unchanged bottom dock');
 phase='providers';await seek(3,.5);
 const positions=await page.locator('[data-provider]').evaluateAll(elements=>elements.map(element=>({provider:element.dataset.provider,x:element.getBoundingClientRect().x})));
 assert.ok(positions.find(p=>p.provider==='samsara').x>positions.find(p=>p.provider==='verizon').x);
 assert.match(await page.locator('#world').evaluate(element=>getComputedStyle(element).filter),/blur\(7px\).*brightness\(0\.36\)/);
 assert.match(await page.locator('[data-story-overlay="provider-switch"]').innerText(),/FOR MONTHS/);
 phase='mileage';
 for(const [elapsed,value] of [[0,'30,000'],[2,'50,000'],[3,'30,000'],[5,'50,500'],[6,'30,000'],[8,'51,000'],[9,'30,000']]){await seek(4,elapsed/18);assert.equal(await page.locator('#mileage-value').innerText(),value);}
 check('Provider devices retain requested order and the blurred/dimmed background; mileage loop repeats exact illustrative values');
 phase='cost';await seek(5,0);assert.equal(await page.locator('#service-visits').innerText(),'1');await seek(5,.95);assert.equal(await page.locator('#service-visits').innerText(),'4');assert.equal(await page.locator('#maintenance-cost').innerText(),'3 × service cost');
 await page.locator('#service-unit-cost').fill('200');assert.equal(await page.locator('#maintenance-cost').innerText(),'$600');assert.match(await page.locator('#maintenance-cost-note').innerText(),/Illustrative/);
 await page.locator('#service-unit-cost').fill('');assert.equal(await page.locator('#maintenance-cost').innerText(),'3 × service cost');
 check('Four illustrative visits across two weeks show three repeat costs; unknown dollars stay unknown until the visitor enters an amount');
 phase='source-controls';await seek(6,.3);const truth=await page.evaluate(()=>{const value=window.__fleetDemo.getState().scenario;return{readings:JSON.stringify(value.readings),services:JSON.stringify(value.serviceFacts)};});
 await page.locator('#open-source-controls').click();assert.equal(await page.locator('#source-dialog').isVisible(),true);
 await page.locator('#provenance [data-action="set-authority"][data-source="B"]').click();
 await page.waitForFunction(()=>window.__fleetDemo.getState().evaluation.vehicles.find(v=>v.vehicleId==='TRK-104')?.status==='resolved');
 assert.deepEqual(await page.evaluate(()=>{const value=window.__fleetDemo.getState().scenario;return{readings:JSON.stringify(value.readings),services:JSON.stringify(value.serviceFacts)};}),truth);
 await page.keyboard.press('Escape');assert.equal(await page.locator('#source-dialog').isVisible(),false);assert.equal(await page.locator('#open-source-controls').evaluate(element=>element===document.activeElement),true);
 phase='advisory-review';await seek(7,.4);await page.locator('#run-story-review').click();await page.waitForFunction(()=>!!window.__fleetDemo.getState().review);assert.equal((await state()).mode,'today');assert.equal((await state()).simulation.paused,true);await page.keyboard.press('Escape');
 check('Source configuration and advisory review work in optional dialogs, preserve raw/service history and return focus on Escape');
 phase='manual-controls';await seek(4,.5);await page.locator('#previous-chapter').click();assert.equal((await state()).stage,3);await page.locator('#next-chapter').click();assert.equal((await state()).stage,4);
 await page.locator('#chapter-title').focus();await page.keyboard.press('ArrowLeft');assert.equal((await state()).stage,3);await page.keyboard.press('ArrowRight');assert.equal((await state()).stage,4);
 await page.locator('#story-progress').evaluate(element=>{element.value='75';element.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal((await state()).stage,5);assert.equal((await state()).simulation.paused,true);
 const before=(await state()).simulation.timeSeconds;await page.waitForTimeout(250);assert.equal((await state()).simulation.timeSeconds,before);
 await page.locator('#pause').click();await page.waitForTimeout(300);assert.ok((await state()).simulation.timeSeconds>before);await paused();
 // Cross every timed boundary using the public clock. No extra timer or skip function drives advancement.
 for(let index=0;index<8;index++){await seek(index,.99);await page.locator('#pause').click();await page.waitForFunction(expected=>window.__fleetDemo.getState().stage===expected,index+1,{timeout:4000});await paused();}
 await seek(8,.99);await page.locator('#pause').click();await page.waitForFunction(()=>window.__fleetDemo.getState().story.complete&&window.__fleetDemo.getState().simulation.paused,undefined,{timeout:4000});
 await page.locator('#reset').click();assert.equal((await state()).stage,0);assert.equal((await state()).scenario.configVersion,1);await paused();
 check('Keyboard/Back/Next/scrubber take manual control; Play advances each timed boundary and stops at the ending; Replay resets story and demo decisions');
 phase='scene-exploration';await seek(3,.5);await page.locator('#explore-scene').click();assert.equal((await state()).exploring,true);assert.equal(await page.locator('[data-story-overlay]:visible').count(),0);assert.equal(await page.locator('#world').evaluate(element=>getComputedStyle(element).filter),'none');assert.equal(await page.locator('#explore-controls').isVisible(),true);await page.evaluate(()=>window.__fleetDemo.seekScene(512));assert.equal((await state()).exploring,true);await page.locator('#explore-scene').click();assert.equal((await state()).exploring,false);await seek(0);check('Visible Explore scene removes overlays and blur, keeps geometry accessible at the same clock, and returns to the story');
 phase='details';await page.locator('#about-toggle').click();assert.equal(await page.locator('#about-panel').isVisible(),true);assert.equal((await state()).simulation.paused,true);await page.keyboard.press('Escape');assert.equal(await page.locator('#about-toggle').evaluate(element=>element===document.activeElement),true);
 phase='spa-remount';await page.evaluate(()=>{window.__fleetPrevious=window.__fleetDemo;});await page.locator('#about-toggle').click();await page.locator('#about-panel a[href="/projects/fleet-fuel-integration"]').click();await page.waitForURL(url=>url.pathname==='/projects/fleet-fuel-integration');await tornDown(page);
 const stoppedTime=await page.evaluate(()=>window.__fleetPrevious.getState().simulation.timeSeconds);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.__fleetPrevious.getState().simulation.timeSeconds),stoppedTime);
 await page.goBack();await ready(page);assert.equal(await page.evaluate(()=>window.__fleetDemo!==window.__fleetPrevious&&window.__fleetDemo.getState().intro),true);assert.equal(await page.locator('.fleet-scene-root').count(),1);assert.equal(await page.locator('.fp-panel').count(),1);await paused();check('Native route navigation disposes the clock and renderer, and Back mounts exactly one new instance');
 phase='mobile';await page.setViewportSize({width:390,height:844});await seek(0);const mobileDock=await dockGeometry();
 for(let index=0;index<9;index++){await seek(index,.5);await noOverflow(`Mobile scene ${index+1} has no horizontal overflow`);const geometry=await dockGeometry();assert.ok(Math.abs(geometry.width-mobileDock.width)<=1);assert.ok(Math.abs(geometry.height-mobileDock.height)<=1);if([0,3,4,5,8].includes(index))await capture(`mobile-${index+1}-${ids[index]}.png`);}
 check('All nine mobile scenes retain the bottom dock without horizontal overflow');
 phase='reduced-motion';const reduced=await browser.newPage({viewport:{width:1200,height:900},reducedMotion:'reduce'});await reduced.goto(origin+'/fleet-demo',{waitUntil:'domcontentloaded'});await ready(reduced);const reducedBefore=await reduced.evaluate(()=>window.__fleetDemo.getState());assert.equal(reducedBefore.simulation.paused,true);await reduced.waitForTimeout(250);assert.equal(await reduced.evaluate(()=>window.__fleetDemo.getState().simulation.timeSeconds),reducedBefore.simulation.timeSeconds);await reduced.locator('#reset').click();assert.equal(await reduced.evaluate(()=>window.__fleetDemo.getState().simulation.paused),true);await reduced.close();check('Reduced-motion preference starts paused and keeps replay paused until explicit Play');
 phase='interrupted-mount';const interrupted=await browser.newPage({viewport:{width:1280,height:900}});interrupted.on('pageerror',error=>evidence.errors.push({phase:'interrupted-mount',message:error.message}));let heldResolve;const held=new Promise(resolve=>{heldResolve=resolve;});
 await interrupted.route('**/fleet-demo/src/app/bridge.js',async route=>{heldResolve();await new Promise(resolve=>{releaseInterrupted=resolve;});await route.continue();});await interrupted.goto(origin+'/fleet-demo',{waitUntil:'domcontentloaded'});let timeout;try{await Promise.race([held,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Bridge request was not observed')),45000);})]);}finally{clearTimeout(timeout);}
 await interrupted.locator('#about-panel a[href="/projects/fleet-fuel-integration"]').dispatchEvent('click');await interrupted.waitForURL(url=>url.pathname==='/projects/fleet-fuel-integration');await tornDown(interrupted);releaseInterrupted();await interrupted.waitForTimeout(500);assert.equal(await interrupted.evaluate(()=>typeof window.__fleetDemo),'undefined');assert.equal(await interrupted.locator('.fleet-scene-root').count(),0);await interrupted.goBack();await ready(interrupted);assert.equal(await interrupted.locator('.fleet-scene-root').count(),1);await interrupted.close();check('Interrupted bridge loading cannot mount a late renderer; returning creates one working instance');
 assert.deepEqual(evidence.errors,[],'No native route JavaScript errors');evidence.result='passed';
}catch(error){evidence.result='failed';evidence.failure={phase,message:String(error),stack:error.stack};if(page)await capture('failure.png').catch(()=>{});process.exitCode=1;}
finally{evidence.completedAt=new Date().toISOString();await fs.writeFile(path.join(output,'report.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence,null,2));releaseInterrupted?.();await browser?.close();}
