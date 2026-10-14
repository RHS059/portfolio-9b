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
  page.on('pageerror',error=>evidence.errors.push({phase,error:String(error)}));
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
    navigation:await styles(page.getByRole('link',{name:'Work',exact:true}),controlProperties),
    cta:await styles(page.locator('#start-story'),controlProperties),
    card:await styles(page.locator('.world-panel'),['borderRadius']),
    footer:await styles(page.locator('footer'),[...styleProperties,'backgroundColor','borderTopColor']),
  };
  for(const key of Object.keys(evidence.styles.home))compare(`Fleet ${key} exactly matches the actual homepage`,evidence.styles.fleet[key],evidence.styles.home[key]);
  assert.equal(await page.locator('#project-info dt').count(),6);
  assert.equal(await page.locator('#story-content').isVisible(),false);
  assert.equal(await page.locator('.inspector-panel').isVisible(),false);
  assert.equal(await page.locator('#about-panel').isVisible(),false);
  const introOrder=await page.locator('#intro-panel').evaluate(el=>{const children=[el.querySelector('h1'),el.querySelector('#project-info'),el.querySelector('p'),el.querySelector('#start-story')];return children.every((node,i)=>i===0||!!(children[i-1].compareDocumentPosition(node)&Node.DOCUMENT_POSITION_FOLLOWING));});
  assert.equal(introOrder,true,'Project name, fields, teaser and Next retain their hierarchy');
  await noOverflow('desktop native shell has no horizontal overflow');
  await capture('02-fleet-native-intro-desktop.png');

  phase='native-story';
  await page.locator('#start-story').click();
  await page.waitForFunction(()=>window.__fleetDemo.getState().intro===false);
  assert.equal(await page.locator('#source-inspector').isVisible(),true);
  compare('Inspector uses the actual portfolio card radius',await styles(page.locator('.inspector-panel'),['borderRadius']),evidence.styles.home.card);
  assert.equal(await page.locator('#story-content').isVisible(),true);
  const providerB=page.locator('#provenance [data-action="set-authority"][data-source="B"]');
  // Data controls inherit the same shared button typography and border/radius.
  const dataButton=await styles(providerB,[...styleProperties,'borderTopColor','borderTopWidth','borderRadius']);
  compare('Source controls consume the actual portfolio button style',dataButton,Object.fromEntries(Object.keys(dataButton).map(key=>[key,evidence.styles.home.navigation[key]])));
  for(const [label,selector] of [['story navigation','#story-steps [data-stage="1"]'],['individual reading controls','#provenance .fp-record button']]){
    const actual=await styles(page.locator(selector).first(),[...styleProperties,'borderTopColor','borderTopWidth','borderRadius']);
    compare(`${label} reuse the actual portfolio button appearance`,actual,Object.fromEntries(Object.keys(actual).map(key=>[key,evidence.styles.home.navigation[key]])));
  }
  await capture('03-fleet-native-story-desktop.png');
  const before=await page.evaluate(()=>{const s=window.__fleetDemo.getState().scenario;return{readings:JSON.stringify(s.readings),serviceFacts:JSON.stringify(s.serviceFacts)};});
  await page.locator('[data-mode="today"]').click();
  await page.locator('#provenance [data-action="review-imports"]').click();
  await page.waitForFunction(()=>!!window.__fleetDemo.getState().review);
  assert.match(await page.locator('.fp-review-mode').innerText(),/Simulated review · no live AI call/);
  const after=await page.evaluate(()=>{const s=window.__fleetDemo.getState().scenario;return{readings:JSON.stringify(s.readings),serviceFacts:JSON.stringify(s.serviceFacts)};});
  compare('Today review preserves original readings and service records',after,before);
  await capture('04-fleet-native-today-desktop.png');
  await page.locator('#about-toggle').click();
  assert.equal(await page.locator('#about-panel').isVisible(),true);
  assert.match(await page.locator('#about-panel').innerText(),/exact maintenance-trigger rule is unknown/);
  assert.equal(await page.locator('#about-panel a[href="/fleet-demo/reno.html"]').count(),1);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#about-panel').isVisible(),false);
  evidence.checks.push('Next reveals source/story controls; Today is honestly labeled; Details opens and Escape closes');

  phase='spa-remount';
  await page.evaluate(()=>{window.__fleetPrevious=window.__fleetDemo;});
  await page.getByRole('link',{name:'Work',exact:true}).click();
  await page.waitForURL(url=>url.pathname==='/');
  await page.getByRole('heading',{name:'Reid Slaughter',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>typeof window.__fleetDemo),'undefined');
  const stoppedTime=await page.evaluate(()=>window.__fleetPrevious.getState().simulation.timeSeconds);
  await page.waitForTimeout(200);
  assert.equal(await page.evaluate(()=>window.__fleetPrevious.getState().simulation.timeSeconds),stoppedTime,'Detached simulation must stop');
  await page.goBack();await ready(page);
  assert.equal(await page.evaluate(()=>window.__fleetDemo!==window.__fleetPrevious&&window.__fleetDemo.getState().intro),true);
  assert.equal(await page.locator('.fleet-scene-root').count(),1);
  assert.equal(await page.locator('.fp-panel').count(),1);
  await page.locator('#start-story').click();
  assert.equal(await page.locator('#source-inspector').isVisible(),true);
  await page.locator('#reset').click();
  assert.equal(await page.locator('#intro-panel').isVisible(),true);
  evidence.checks.push('SPA Work/Back disposes old simulation and remounts one functional scene/panel; Reset restores intro');

  phase='mobile';
  await page.setViewportSize({width:390,height:844});
  await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
  await page.getByRole('heading',{name:'Reid Slaughter',exact:true}).waitFor();
  const mobileSidebar=await styles(page.locator('aside').first(),sidebarProperties);
  await capture('05-main-portfolio-mobile.png');
  await page.goto(origin+'/fleet-demo',{waitUntil:'domcontentloaded'});await ready(page);await mappedScene(page);
  compare('Mobile sidebar exactly matches the actual homepage',await styles(page.locator('aside[aria-label="Fleet case study"]'),sidebarProperties),mobileSidebar);
  await page.waitForTimeout(200);await noOverflow('mobile native shell has no horizontal overflow');
  await capture('06-fleet-native-intro-mobile.png');
  await page.locator('#start-story').click();
  await noOverflow('mobile story has no horizontal overflow');
  await capture('07-fleet-native-story-mobile.png');

  phase='interrupted-mount';
  const interrupted=await browser.newPage({viewport:{width:1280,height:900}});
  interrupted.on('pageerror',error=>evidence.errors.push({phase:'interrupted-mount',error:String(error)}));
  let heldResolve;
  const held=new Promise(resolve=>{heldResolve=resolve;});
  await interrupted.route('**/fleet-demo/src/app/bridge.js',async route=>{
    heldResolve();await new Promise(resolve=>{releaseInterrupted=resolve;});await route.continue();
  });
  await interrupted.goto(origin+'/fleet-demo',{waitUntil:'domcontentloaded'});
  let holdTimeout;
  try{await Promise.race([held,new Promise((_,reject)=>{holdTimeout=setTimeout(()=>reject(new Error('Bridge request was not observed')),45000);})]);}
  finally{clearTimeout(holdTimeout);}
  await interrupted.getByRole('link',{name:'Work',exact:true}).click();
  await interrupted.waitForURL(url=>url.pathname==='/');
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
