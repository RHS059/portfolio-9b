import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';

const require=createRequire(path.join(process.env.PLAYWRIGHT_PACKAGE||'/tmp/fleet-browser','package.json'));
const {chromium}=require('playwright');
const origin=(process.env.FLEET_PORTFOLIO_URL||'http://127.0.0.1:3000').replace(/\/$/,'');
const output=path.resolve(process.env.FLEET_SHELL_EVIDENCE_DIR||'fleet-browser-evidence/native-shell');
await fs.mkdir(output,{recursive:true});
const evidence={origin,startedAt:new Date().toISOString(),checks:[],errors:[],styles:{},notes:['Native shell/style/lifecycle evidence; graphics hardware performance is measured separately.']};
let browser,page,releaseInterrupted,phase='start';
const styleProperties=['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','color'];
const controlProperties=[...styleProperties,'backgroundColor','borderTopColor','borderTopWidth','borderRadius','paddingTop','paddingRight','paddingBottom','paddingLeft'];
const sidebarProperties=['width','paddingTop','paddingRight','paddingBottom','paddingLeft','position','top'];
const styles=(locator,properties)=>locator.evaluate((element,keys)=>{const style=getComputedStyle(element);return Object.fromEntries(keys.map(key=>[key,style[key]]));},properties);
const ready=page=>page.waitForFunction(()=>window.__fleetDemo?.getState()?.scenario&&document.querySelector('.fleet-scene-root'),undefined,{timeout:60000});
const mappedScene=page=>page.waitForFunction(()=>{const metrics=window.__fleetDemo?.getMetrics?.();return metrics?.ready&&metrics.renderer?.includes('Three')&&metrics.mapTilesLoaded===true&&!metrics.initializing&&!metrics.cameraMoving;},undefined,{timeout:60000});
const compare=(label,actual,expected)=>{assert.deepEqual(actual,expected,label);evidence.checks.push(label);};
const capture=(name)=>page.screenshot({path:path.join(output,name),fullPage:true});
const noOverflow=async(label)=>{const dimensions=await page.evaluate(()=>({width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth}));assert.ok(dimensions.scrollWidth<=dimensions.width+1,`${label}: ${JSON.stringify(dimensions)}`);evidence.checks.push(label);};
try{
  browser=await chromium.launch({headless:true});
  page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1});
  page.on('pageerror',error=>evidence.errors.push({phase,error:String(error),name:error.name,message:error.message,stack:error.stack||null,url:page.url()}));
  phase='home-reference';
  await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
  await page.getByRole('heading',{name:'Reid Slaughter',exact:true}).waitFor();
  await page.evaluate(()=>document.fonts.ready);
  const homeSidebar=page.locator('aside').first();
  evidence.styles.home={
    sidebar:await styles(homeSidebar,sidebarProperties),
    sidebarBackground:await homeSidebar.evaluate(el=>getComputedStyle(el.parentElement).backgroundColor),
    title:await styles(page.getByRole('heading',{name:'Reid Slaughter',exact:true}),styleProperties),
    navigation:await styles(page.getByRole('link',{name:'Work',exact:true}),controlProperties),
    cta:await styles(page.getByRole('link',{name:'Reach Out',exact:true}),controlProperties),
    card:await styles(page.locator('main article').first(),['borderRadius']),
    footer:await styles(page.locator('footer'),[...styleProperties,'backgroundColor','borderTopColor']),
  };
  await capture('01-main-portfolio-desktop.png');

  phase='native-intro';
  await page.goto(origin+'/fleet-demo',{waitUntil:'domcontentloaded'});
  await ready(page);await mappedScene(page);await page.evaluate(()=>document.fonts.ready);
  evidence.nativeGraphics=await page.evaluate(()=>window.__fleetDemo.getMetrics());
  evidence.checks.push('Native route mounts the Three scene with loaded map tiles before visual comparison');
  assert.equal(await page.locator('iframe').count(),0,'The native Fleet route must not isolate its UI in an iframe');
  const nativeSidebar=page.locator('aside[aria-label="Fleet case study"]');
  evidence.styles.fleet={
    sidebar:await styles(nativeSidebar,sidebarProperties),
    sidebarBackground:await nativeSidebar.evaluate(el=>getComputedStyle(el.parentElement).backgroundColor),
    title:await styles(page.getByRole('heading',{name:'Fleet Management',exact:true}),styleProperties),
    navigation:await styles(page.locator('#previous-chapter'),controlProperties),
    cta:await styles(page.locator('#start-story'),controlProperties),
    card:await styles(page.locator('.world-panel'),['borderRadius']),
    footer:await styles(page.locator('footer'),[...styleProperties,'backgroundColor','borderTopColor']),
  };
  for(const key of Object.keys(evidence.styles.home))compare(`Fleet ${key} exactly matches the actual homepage`,evidence.styles.fleet[key],evidence.styles.home[key]);
  assert.equal(await page.locator('#project-info dt').count(),6);
  assert.equal(await page.locator('#story-content').isVisible(),false);
  assert.equal(await page.locator('.inspector-panel').isVisible(),false);
  assert.equal(await page.locator('nav[aria-label="Portfolio navigation"]').count(),0);
  assert.equal(await page.locator('aside.inspector-panel').count(),0);
  assert.equal(await page.getByText('Inspect the evidence',{exact:true}).count(),0);
  assert.equal(await page.locator('.story-dock').isVisible(),true);
  const opening=await page.evaluate(()=>window.__fleetDemo.getState());
  assert.equal(opening.selectedVehicleId,'TRK-208');assert.equal(opening.follow,true);
  assert.equal(await page.evaluate(()=>window.__fleetDemo.getMetrics().camera.focus),'TRK-208');
  const openingTruck=await page.evaluate(()=>window.__fleetDemo.getSceneSnapshot().vehicles.find(v=>v.id==='TRK-208'));
  assert.equal(openingTruck.status,'moving');assert.equal(openingTruck.routeId,'delivery');
  assert.equal(await page.locator('#about-panel').isVisible(),false);
  const introOrder=await page.locator('#intro-panel').evaluate(el=>{const children=[el.querySelector('h1'),el.querySelector('#project-info'),el.querySelector('p'),el.querySelector('#start-story')];return children.every((node,i)=>i===0||!!(children[i-1].compareDocumentPosition(node)&Node.DOCUMENT_POSITION_FOLLOWING));});
  assert.equal(introOrder,true,'Project name, fields, teaser and Next retain their hierarchy');
  await noOverflow('desktop native shell has no horizontal overflow');
  await capture('02-fleet-native-intro-desktop.png');

  // Compare dimensions relative to the scene, not document position. On a phone,
  // the story sits above the scene; the persistent dock must still keep its shape.
  const dockGeometry=()=>page.locator('.story-dock').evaluate(el=>{
    const dock=el.getBoundingClientRect(),world=el.closest('.world-panel').getBoundingClientRect();
    return {width:dock.width,height:dock.height,left:dock.left-world.left,top:dock.top-world.top,worldWidth:world.width,worldHeight:world.height,controls:[...el.querySelectorAll('button')].map(button=>button.id||button.dataset.view||button.dataset.focus)};
  });
  const stableDock=async(expected,label)=>{
    const actual=await dockGeometry();
    for(const key of ['width','height','left','top','worldWidth','worldHeight'])assert.ok(Math.abs(actual[key]-expected[key])<=1,`${label}: ${key} changed ${expected[key]} → ${actual[key]}`);
    assert.deepEqual(actual.controls,expected.controls,`${label}: bottom controls changed`);
    evidence.checks.push(label);
  };
  const initialDock=await dockGeometry();
  phase='native-story';
  await page.locator('#start-story').click();
  await page.waitForFunction(()=>window.__fleetDemo.getState().intro===false);
  assert.equal(await page.locator('#source-inspector').isVisible(),false);
  assert.equal(await page.locator('#story-content').isVisible(),true);
  assert.equal(await page.locator('#review-controls').isVisible(),false);
  let state=await page.evaluate(()=>window.__fleetDemo.getState());
  assert.equal(state.stage,0);assert.equal(state.selectedVehicleId,'TRK-104');assert.equal(state.follow,false);
  assert.ok(['depot','TRK-104'].includes(await page.evaluate(()=>window.__fleetDemo.getMetrics().camera.focus)));
  const workshopTruck=await page.evaluate(()=>window.__fleetDemo.getSceneSnapshot().vehicles.find(v=>v.id==='TRK-104'));
  assert.equal(workshopTruck.status,'workshop');assert.equal(workshopTruck.routeId,'depot-bay');
  assert.match(await page.locator('#chapter-copy').innerText(),/oil change|tire rotation/i);
  assert.match(await page.locator('#service-visits').innerText(),/2/);
  assert.match(await page.locator('#maintenance-cost').innerText(),/not provided|repeat labor|—/i);
  await stableDock(initialDock,'First Next keeps the intro dock footprint and focuses the workshop truck');
  await capture('03-fleet-native-workshop-desktop.png');
  for(let stage=1;stage<=4;stage++){
    await page.locator('#next-chapter').click();
    await page.waitForFunction(expected=>window.__fleetDemo.getState().stage===expected,stage);
    assert.equal(await page.locator('#review-controls').isVisible(),stage===4);
    assert.equal(await page.locator('#source-inspector').isVisible(),stage>=3);
    await stableDock(initialDock,`Desktop story beat ${stage+1} retains the same bottom panel`);
    if(stage===2){assert.match(await page.locator('#story-evidence').innerText(),/Provider A|Provider B/);await capture('04-fleet-native-conflicting-readings-desktop.png');}
    if(stage===3){
      const providerB=page.locator('#provenance [data-action="set-authority"][data-source="B"]');
      await providerB.waitFor();
      const keys=[...styleProperties,'borderTopColor','borderTopWidth','borderRadius'];
      const dataButton=await styles(providerB,keys);
      compare('Compact source decisions consume the actual portfolio control style',dataButton,Object.fromEntries(keys.map(key=>[key,evidence.styles.home.navigation[key]])));
      const before=await page.evaluate(()=>{const s=window.__fleetDemo.getState().scenario;return{readings:JSON.stringify(s.readings),serviceFacts:JSON.stringify(s.serviceFacts)};});
      await providerB.click();
      await page.waitForFunction(()=>window.__fleetDemo.getState().evaluation.vehicles.find(v=>v.vehicleId==='TRK-104')?.status==='resolved');
      const after=await page.evaluate(()=>{const s=window.__fleetDemo.getState().scenario;return{readings:JSON.stringify(s.readings),serviceFacts:JSON.stringify(s.serviceFacts)};});
      compare('Choosing this truck’s source preserves original readings and completed shop visits',after,before);
      await stableDock(initialDock,'Source decision changes content without changing the bottom panel');
      await capture('05-fleet-native-source-choice-desktop.png');
    }
  }
  const beforeReview=await page.evaluate(()=>{const s=window.__fleetDemo.getState().scenario;return{readings:JSON.stringify(s.readings),serviceFacts:JSON.stringify(s.serviceFacts),policies:JSON.stringify(s.policies)};});
  await page.locator('[data-mode="today"]').click();
  await page.locator('#provenance [data-action="review-imports"]').click();
  await page.waitForFunction(()=>!!window.__fleetDemo.getState().review);
  assert.match(await page.locator('#provenance').innerText(),/simulated|no live AI/i);
  const afterReview=await page.evaluate(()=>{const s=window.__fleetDemo.getState().scenario;return{readings:JSON.stringify(s.readings),serviceFacts:JSON.stringify(s.serviceFacts),policies:JSON.stringify(s.policies)};});
  compare('Today review preserves original readings, shop visits and source policies',afterReview,beforeReview);
  await stableDock(initialDock,'Then/Today review retains the same bottom panel');
  await capture('06-fleet-native-today-desktop.png');
  for(let stage=3;stage>=0;stage--){await page.locator('#previous-chapter').click();await page.waitForFunction(expected=>window.__fleetDemo.getState().stage===expected,stage);await stableDock(initialDock,`Back to beat ${stage+1} keeps the bottom panel`);}
  await page.locator('#previous-chapter').click();
  await page.waitForFunction(()=>window.__fleetDemo.getState().intro===true);
  assert.equal(await page.evaluate(()=>window.__fleetDemo.getState().selectedVehicleId),'TRK-208');
  await stableDock(initialDock,'Back to the project introduction preserves the bottom panel');
  await page.locator('#about-toggle').click();
  assert.equal(await page.locator('#about-panel').isVisible(),true);
  assert.match(await page.locator('#about-panel').innerText(),/exact maintenance-trigger rule is unknown/);
  assert.equal(await page.locator('#about-panel a[href="/fleet-demo/reno.html"]').count(),1);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#about-panel').isVisible(),false);
  evidence.checks.push('Five click-through beats, Back to intro, advisory Today review and Details/Escape work');

  phase='spa-remount';
  await page.evaluate(()=>{window.__fleetPrevious=window.__fleetDemo;});
  await page.locator('#about-toggle').click();
  await page.locator('#about-panel a[href="/projects/fleet-fuel-integration"]').click();
  await page.waitForURL(url=>url.pathname==='/projects/fleet-fuel-integration');
  assert.equal(await page.evaluate(()=>typeof window.__fleetDemo),'undefined');
  const stoppedTime=await page.evaluate(()=>window.__fleetPrevious.getState().simulation.timeSeconds);
  await page.waitForTimeout(200);
  assert.equal(await page.evaluate(()=>window.__fleetPrevious.getState().simulation.timeSeconds),stoppedTime,'Detached simulation must stop');
  await page.goBack();await ready(page);
  assert.equal(await page.evaluate(()=>window.__fleetDemo!==window.__fleetPrevious&&window.__fleetDemo.getState().intro),true);
  assert.equal(await page.locator('.fleet-scene-root').count(),1);
  assert.equal(await page.locator('.fp-panel').count(),1);
  await page.locator('#start-story').click();
  assert.equal(await page.locator('#source-inspector').isVisible(),false);
  await page.locator('#reset').click();
  assert.equal(await page.locator('#intro-panel').isVisible(),true);
  evidence.checks.push('SPA case-study navigation/Back disposes the old simulation and remounts one scene/panel; Reset restores intro');

  phase='mobile';
  await page.setViewportSize({width:390,height:844});
  await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
  await page.getByRole('heading',{name:'Reid Slaughter',exact:true}).waitFor();
  const mobileSidebar=await styles(page.locator('aside').first(),sidebarProperties);
  await capture('07-main-portfolio-mobile.png');
  await page.goto(origin+'/fleet-demo',{waitUntil:'domcontentloaded'});await ready(page);await mappedScene(page);
  compare('Mobile sidebar exactly matches the actual homepage',await styles(page.locator('aside[aria-label="Fleet case study"]'),sidebarProperties),mobileSidebar);
  await page.waitForTimeout(200);await noOverflow('mobile native shell has no horizontal overflow');
  await capture('08-fleet-native-intro-mobile.png');
  const mobileDock=await dockGeometry();
  await page.locator('#start-story').click();
  for(let stage=0;stage<=4;stage++){
    if(stage){await page.locator('#next-chapter').click();await page.waitForFunction(expected=>window.__fleetDemo.getState().stage===expected,stage);}
    await noOverflow(`mobile story beat ${stage+1} has no horizontal overflow`);
    await stableDock(mobileDock,`Mobile story beat ${stage+1} retains the intro bottom-panel footprint`);
    if(stage===0||stage===4)await capture(`09-fleet-native-story-mobile-${stage}.png`);
  }
  await page.locator('#previous-chapter').click();assert.equal(await page.evaluate(()=>window.__fleetDemo.getState().stage),3);
  await page.locator('#reset').click();assert.equal(await page.locator('#intro-panel').isVisible(),true);
  await stableDock(mobileDock,'Mobile Back and Reset retain the bottom panel');

  phase='interrupted-mount';
  const interrupted=await browser.newPage({viewport:{width:1280,height:900}});
  interrupted.on('pageerror',error=>evidence.errors.push({phase:'interrupted-mount',error:String(error),name:error.name,message:error.message,stack:error.stack||null,url:interrupted.url()}));
  let heldResolve;
  const held=new Promise(resolve=>{heldResolve=resolve;});
  await interrupted.route('**/fleet-demo/src/app/bridge.js',async route=>{
    heldResolve();await new Promise(resolve=>{releaseInterrupted=resolve;});await route.continue();
  });
  await interrupted.goto(origin+'/fleet-demo',{waitUntil:'domcontentloaded'});
  let holdTimeout;
  try{await Promise.race([held,new Promise((_,reject)=>{holdTimeout=setTimeout(()=>reject(new Error('Bridge request was not observed')),45000);})]);}
  finally{clearTimeout(holdTimeout);}
  // Dispatch the native Next link while runtime loading is held. This tests
  // component cancellation independently of the controller-bound Details toggle.
  await interrupted.locator('#about-panel a[href="/projects/fleet-fuel-integration"]').dispatchEvent('click');
  await interrupted.waitForURL(url=>url.pathname==='/projects/fleet-fuel-integration');
  releaseInterrupted();await interrupted.waitForTimeout(500);
  assert.equal(await interrupted.evaluate(()=>typeof window.__fleetDemo),'undefined');
  assert.equal(await interrupted.locator('.fleet-scene-root').count(),0);
  await interrupted.goBack();await ready(interrupted);
  assert.equal(await interrupted.locator('.fleet-scene-root').count(),1);
  await interrupted.close();
  evidence.checks.push('Leaving before runtime readiness prevents late mount; Back still creates one working instance');
  assert.deepEqual(evidence.errors,[],'No native route JavaScript errors');
  evidence.result='passed';
}catch(error){
  evidence.result='failed';evidence.failure={phase,message:String(error),stack:error.stack};
  if(page)await page.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});
  process.exitCode=1;
}finally{
  evidence.completedAt=new Date().toISOString();
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify(evidence,null,2));
  console.log(JSON.stringify(evidence,null,2));
  releaseInterrupted?.();
  await browser?.close();
}
