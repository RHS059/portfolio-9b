import {navigateStory} from './fleet-browser-controls.mjs';
import {sceneTime} from '../public/fleet-demo/src/app/story-timeline.js';
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
const ready=page=>page.waitForFunction(()=>window.__fleetDemo?.getState()?.scenario&&document.querySelector('.fleet-scene-root')&&document.querySelector('#pause')?.disabled===false,undefined,{timeout:60000});
const tornDown=page=>page.waitForFunction(()=>!document.querySelector('#intro-panel')&&!document.querySelector('.fleet-scene-root')&&typeof window.__fleetDemo==='undefined',undefined,{timeout:15000});
const state=()=>page.evaluate(()=>window.__fleetDemo.getState());
const check=(label)=>evidence.checks.push(label);
const capture=name=>page.screenshot({path:path.join(output,name),fullPage:true});
const paused=async()=>{if(!(await state()).simulation.paused)await page.locator('#pause').click();};
const settleText=()=>page.waitForFunction(()=>window.__fleetDemo.getState().textTransition?.phase==='idle',undefined,{timeout:3000});
const seek=async(index,progress=0)=>{await page.evaluate(([index,progress])=>window.__fleetDemo.seekStory(index,progress),[index,progress]);await settleText();};
const noOverflow=async label=>{const size=await page.evaluate(()=>({width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth}));assert.ok(size.scrollWidth<=size.width+1,`${label}: ${JSON.stringify(size)}`);check(label);};
const cameraGeometry=()=>page.locator('#camera-controls').evaluate(element=>{const rect=element.getBoundingClientRect(),stage=element.parentElement.getBoundingClientRect(),credit=document.querySelector('.fleet-scene-credit')?.getBoundingClientRect();return {insideStage:!!element.parentElement.querySelector('#world'),rightInset:stage.right-rect.right,bottomInset:stage.bottom-rect.bottom,aboveCredit:!credit||rect.bottom<=credit.top};});
const dockGeometry=()=>page.locator('.story-dock').evaluate(element=>{const rect=element.getBoundingClientRect();return{width:rect.width,height:rect.height,controls:[...element.querySelectorAll('button')].map(button=>button.id||button.dataset.sceneIndex)};});
const removedControls='#start-story, #start-story-manual, #story-advance-controls, #mobile-pause';
const transportGeometry=()=>page.locator('#story-transport').evaluate(element=>{
 const frame=element.getBoundingClientRect(),play=element.querySelector('#pause').getBoundingClientRect(),style=getComputedStyle(element);
 return {x:frame.x,y:frame.y,width:frame.width,height:frame.height,right:frame.right,bottom:frame.bottom,center:frame.x+frame.width/2,playCenter:play.x+play.width/2,position:style.position,clientWidth:element.clientWidth,scrollWidth:element.scrollWidth};
});
const assertTransport=async(index,{baseline,mobile=false,label=`Scene ${index+1}`}={})=>{
 assert.equal(await page.locator('#story-transport').count(),1,`${label}: one transport`);
 assert.equal(await page.locator(removedControls).count(),0,`${label}: obsolete controls are removed`);
 for(const [id,hidden,shortcut] of [['previous-chapter',index===0,'ArrowLeft'],['pause',false,'Space'],['next-chapter',index===8,'ArrowRight']]){
  const button=page.locator('#'+id);
  assert.equal(await button.count(),1,`${label}: one ${id} button`);
  assert.equal(await button.evaluate(element=>element.closest('#story-transport')?.id),'story-transport');
  assert.equal(await button.evaluate(element=>element.hidden),hidden,`${label}: ${id} hidden attribute`);
  assert.equal(await button.isVisible(),!hidden,`${label}: ${id} visibility`);
  if(!hidden)assert.equal(await button.isDisabled(),false,`${label}: ${id} is enabled`);
  assert.equal(await button.getAttribute('aria-keyshortcuts'),shortcut);
  assert.ok(await button.getAttribute('aria-label'));
  assert.ok(await button.getAttribute('title'));
  assert.equal((await button.innerText()).trim(),'');
 }
 assert.equal(await page.locator('#story-transport #story-progress').count(),1);
 assert.equal(await page.locator('#story-progress').getAttribute('min'),'0');
 assert.equal(await page.locator('#story-progress').getAttribute('max'),'124');
 assert.match(await page.locator('#story-progress').getAttribute('aria-valuetext'),new RegExp(`Scene ${index+1} of 9`));
 assert.equal((await page.locator('#story-duration').innerText()).trim(),'2:04');
 assert.match((await page.locator('#story-elapsed').innerText()).trim(),/^\d+:\d{2}$/);
 const geometry=await transportGeometry();
 assert.ok(Math.abs(geometry.playCenter-geometry.center)<=1.5,`${label}: Play stays centered: ${JSON.stringify(geometry)}`);
 assert.ok(geometry.scrollWidth<=geometry.clientWidth+1,`${label}: transport has no internal overflow`);
 if(baseline){
  for(const key of ['width','height','playCenter'])assert.ok(Math.abs(geometry[key]-baseline[key])<=1.5,`${label}: stable ${key}`);
 }
 if(mobile){
  const viewport=page.viewportSize();
  assert.equal(geometry.position,'fixed',`${label}: mobile transport is fixed`);
  assert.ok(geometry.x>=-1&&geometry.y>=0&&geometry.right<=viewport.width+1&&geometry.bottom<=viewport.height+1,`${label}: transport fits viewport: ${JSON.stringify(geometry)}`);
  assert.ok(viewport.height-geometry.bottom<=24,`${label}: transport sits at the bottom`);
  for(const selector of ['#pause','#story-progress','#story-elapsed','#story-duration',...(index===0?[]:['#previous-chapter']),...(index===8?[]:['#next-chapter'])]){
   const bounds=await page.locator(selector).boundingBox();
   assert.ok(bounds&&bounds.x>=-1&&bounds.y>=0&&bounds.x+bounds.width<=viewport.width+1&&bounds.y+bounds.height<=viewport.height+1,`${label}: ${selector} is inside viewport`);
  }
  assert.equal(await page.locator('#pause').evaluate(element=>{const rect=element.getBoundingClientRect();return element.contains(document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2));}),true,`${label}: Play is reachable without scrolling`);
 }
 return geometry;
};
const assertGlyphs=async(label,expected)=>{
 const glyphs=await page.locator('#story-transport svg:visible, #camera-controls svg:visible').evaluateAll(elements=>elements.map(svg=>{
  const shape=svg.querySelector('path'),frame=svg.getBoundingClientRect(),bounds=shape.getBoundingClientRect(),style=getComputedStyle(shape);
  return {name:svg.dataset.materialSymbol,width:bounds.width,height:bounds.height,inside:bounds.left>=frame.left-1&&bounds.right<=frame.right+1&&bounds.top>=frame.top-1&&bounds.bottom<=frame.bottom+1,fill:style.fill,opacity:style.opacity};
 }));
 assert.equal(glyphs.length,expected,`${label}: visible glyph count`);
 for(const glyph of glyphs){assert.ok(glyph.name,`${label}: Material Symbol name`);assert.ok(glyph.width>=7&&glyph.height>=7&&glyph.inside,`${label}: ${JSON.stringify(glyph)}`);assert.notEqual(glyph.fill,'none');assert.notEqual(glyph.fill,'rgba(0, 0, 0, 0)');assert.ok(Number(glyph.opacity)>0);}
 evidence.iconGlyphs??={};evidence.iconGlyphs[label]=glyphs;
};
try{
 browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1});
 page.on('pageerror',error=>evidence.errors.push({phase,message:error.message,stack:error.stack,url:page.url()}));
 phase='portfolio-reference';await page.goto(origin+'/',{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Reid Slaughter',exact:true}).waitFor();
 const typography=['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','color'];
 evidence.styles.homeTitle=await styles(page.getByRole('heading',{name:'Reid Slaughter',exact:true}),typography);
 evidence.styles.homeSidebar=await styles(page.locator('aside').first(),['paddingTop','paddingRight','paddingBottom','paddingLeft','position']);
 evidence.styles.homeFooter=await styles(page.locator('footer'),['fontFamily','fontSize','backgroundColor','borderTopColor']);
 phase='opening';await page.goto(origin+'/fleet-demo',{waitUntil:'domcontentloaded'});await ready(page);
 assert.equal((await state()).simulation.paused,true,'Intro waits for Play');await assertTransport(0);assert.equal((await page.locator('#story-elapsed').innerText()).trim(),'0:00');assert.equal(await page.locator('#reset, #explore-scene, #story-replay, #about-toggle, #about-panel').count(),0);
 assert.equal(await page.locator('iframe').count(),0);assert.equal(await page.locator('#project-info dt').count(),6);assert.equal(await page.locator('nav[aria-label="Portfolio navigation"]').count(),0);
 evidence.styles.fleetTitle=await styles(page.locator('#intro-panel h1'),typography);assert.deepEqual(evidence.styles.fleetTitle,evidence.styles.homeTitle);
 assert.deepEqual(await styles(page.locator('aside[aria-label="Fleet case study"]'),['paddingTop','paddingRight','paddingBottom','paddingLeft','position']),evidence.styles.homeSidebar);
 assert.deepEqual(await styles(page.locator('footer'),['fontFamily','fontSize','backgroundColor','borderTopColor']),evidence.styles.homeFooter);
 assert.equal(await page.locator('#scene-steps, #story-position, #playback-status, .impact-strip').count(),0);assert.equal((await state()).story.id,'question');assert.equal((await state()).selectedVehicleId,'TRK-104');
 await page.waitForFunction(()=>window.__fleetDemo?.getMetrics?.()?.ready,undefined,{timeout:60000});evidence.graphics=await page.evaluate(()=>window.__fleetDemo.getMetrics());
 assert.equal((await state()).view,'iso');assert.equal(await page.locator('[data-view=iso]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#overview, #follow, [data-focus]').count(),0);assert.equal(await page.locator('#camera-controls button').count(),3);const cameraPlacement=await cameraGeometry();assert.equal(cameraPlacement.insideStage,true);assert.ok(cameraPlacement.rightInset>=8&&cameraPlacement.rightInset<=16&&cameraPlacement.bottomInset>=28&&cameraPlacement.bottomInset<=40);assert.equal(cameraPlacement.aboveCredit,true);for(const id of ['previous-chapter','pause','next-chapter'])assert.ok(await page.locator('#'+id+' svg path').count());assert.equal(await page.locator('#pause [data-playback-icon=play]').isVisible(),true);await assertGlyphs('opening',5);check('Material Symbols use visible in-bounds SVG paths and accessible labels; camera icons remain above attribution, defaulting to ISO');
 await capture('01-opening-desktop.png');check('Native opening preserves shared portfolio type/sidebar/footer, all six fields and nine-scene playback');
 await page.locator('#pause').click();assert.equal((await state()).stage,0,'Play starts the current scene');assert.equal((await state()).simulation.paused,false);assert.equal(await page.locator('#pause [data-playback-icon=pause]').isVisible(),true);assert.equal(await page.locator('#pause').getAttribute('aria-label'),'Pause story');await assertGlyphs('playing-first-scene',5);await paused();
 await page.locator('#next-chapter').click();await settleText();assert.equal((await state()).stage,1);assert.equal((await state()).simulation.paused,true);await assertTransport(1);await assertGlyphs('middle',6);await page.locator('#previous-chapter').click();await settleText();await assertTransport(0);check('Play starts the selected scene, Pause stays in place, and Back/Forward move one scene while paused');
 const initialDock=await dockGeometry(),initialTransport=await transportGeometry();
 assert.equal(await page.locator('.story-dock > *').count(),1,'Dock contains only the continuous transport');
 const transportStyle=await styles(page.locator('#story-transport'),['backgroundColor','color','position']);evidence.styles.transport=transportStyle;const background=transportStyle.backgroundColor.match(/[\d.]+/g)?.map(Number);assert.ok(background&&background.slice(0,3).every(channel=>channel<100)&&(background.length<4||background[3]>.9),'Transport has an opaque dark background');assert.notEqual(transportStyle.position,'fixed','Desktop transport remains in the dock');
 phase='camera-transitions';evidence.cameraTransitions={};
 const cameraTrace=time=>page.evaluate(time=>new Promise(resolve=>{
   const started=performance.now(),samples=[];
   const sample=()=>{const m=window.__fleetDemo.getMetrics();samples.push({ms:performance.now()-started,view:m.viewState,camera:m.camera,moving:m.cameraMoving});};
   sample();const input=document.querySelector('#story-progress');input.value=String(time);input.dispatchEvent(new Event('input',{bubbles:true}));
   const tick=()=>{sample();if(performance.now()-started>=1200)resolve(samples);else requestAnimationFrame(tick);};requestAnimationFrame(tick);
 }),time);
 for(const [name,index,focus]of [['road-to-workshop',2,'depot'],['workshop-to-road',0,'TRK-104']]){
   const samples=await cameraTrace(sceneTime(index));evidence.cameraTransitions[name]=samples;
   assert.ok(samples.some(sample=>sample.moving),'Scene camera reports an active transition');
   assert.ok(new Set(samples.map(sample=>sample.view.center.join(','))).size>=3,'Scene camera must pass through intermediate positions');
   await page.waitForFunction(()=>!window.__fleetDemo.getMetrics().cameraMoving);
   assert.equal((await page.evaluate(()=>window.__fleetDemo.getMetrics().camera)).focus,focus);
 }
 await settleText();check('Scene camera eases through intermediate road/workshop positions and settles on the selected target');
 const ids=['question','integration','repeat-service','provider-switch','mileage-loop','cost','solution','agents','learning'];
 for(let index=0;index<9;index++){
  phase=`scene-${index+1}`;await navigateStory(page,index);await settleText();
  const current=await state();assert.equal(current.story.id,ids[index]);assert.equal(current.story.index,index);assert.equal(current.story.paused,true);
  const sidebarScene=[1,4,6,7].includes(index),mapOverlay=[3,5,8].includes(index);
  assert.equal(await page.locator('[data-story-overlay]:visible').count(),mapOverlay?1:0);
  assert.equal(await page.locator('[data-story-sidebar]:visible').count(),sidebarScene?1:0);
  if(sidebarScene){const card=page.locator(`[data-story-sidebar="${ids[index]}"]`);assert.equal(await card.evaluate(element=>!!element.closest('aside')),true);assert.equal(await page.locator(`#story-overlays [data-story-sidebar="${ids[index]}"]`).count(),0);const bounds=await card.evaluate(element=>({client:element.clientWidth,scroll:element.scrollWidth}));assert.ok(bounds.scroll<=bounds.client+1,`${ids[index]} sidebar content overflows`);}
  assert.equal(await page.locator('#chapter-number').isVisible(),index!==0&&index!==6);
  assert.equal(await page.locator('#story-content').isVisible(),index!==0);await assertTransport(index,{baseline:initialTransport});if(index===8)await assertGlyphs('last-scene',5);
  const geometry=await dockGeometry();assert.ok(Math.abs(geometry.width-initialDock.width)<=1);assert.ok(Math.abs(geometry.height-initialDock.height)<=1);assert.deepEqual(geometry.controls,initialDock.controls);
  await noOverflow(`Scene ${index+1} has no horizontal overflow`);await capture(`${String(index+2).padStart(2,'0')}-${ids[index]}-desktop.png`);
 }
 check('All nine scenes preserve centered Play and dock dimensions; Back hides only on the first scene, Forward only on the last; sidebar and map overlays remain correct');
 phase='providers';await seek(3,.5);
 const positions=await page.locator('[data-provider]').evaluateAll(elements=>elements.map(element=>({provider:element.dataset.provider,x:element.getBoundingClientRect().x})));
 assert.ok(positions.find(p=>p.provider==='samsara').x>positions.find(p=>p.provider==='verizon').x);
 await page.waitForFunction(()=>/blur\(7px\).*brightness\(0\.36\)/.test(getComputedStyle(document.querySelector('#world')).filter),undefined,{timeout:2500});
 assert.match(await page.locator('#world').evaluate(element=>getComputedStyle(element).filter),/blur\(7px\).*brightness\(0\.36\)/);
 assert.match(await page.locator('[data-story-overlay="provider-switch"]').innerText(),/FOR MONTHS/);
 phase='mileage';
 for(const [elapsed,value] of [[0,'30,000'],[2,'50,000'],[3,'30,000'],[5,'50,500'],[6,'30,000'],[8,'51,000'],[9,'30,000']]){await seek(4,elapsed/18);assert.equal(await page.locator('#mileage-value').innerText(),value);}
 await page.waitForFunction(()=>getComputedStyle(document.querySelector('#world')).filter==='none',undefined,{timeout:2500});assert.equal(await page.locator('#mileage-value').evaluate(element=>!!element.closest('aside')),true);check('Provider devices retain requested order and blur; the mileage loop is animated in the sidebar with an unobscured map');
 phase='cost';await seek(5,0);assert.equal(await page.locator('#cost-caption').innerText(),'1 service');assert.equal(await page.locator('#cost-total').innerText(),'$350.00');
 await seek(5,.75);assert.equal(await page.locator('#cost-caption').innerText(),'2 services in one week');assert.equal(await page.locator('#cost-total').innerText(),'$700.00');assert.equal(await page.locator('#cost-duplicate').innerText(),'$350.00');assert.match(await page.locator('[data-story-overlay=cost] header').innerText(),/Example cost/);assert.equal(await page.locator('#service-unit-cost').count(),0);
 assert.match(await page.locator('[data-story-overlay="cost"]').evaluate(element=>getComputedStyle(element).fontFamily),/monospace/i);assert.equal(await page.locator('[data-cost-visit]').count(),2);await capture('receipt-two-visits-desktop.png');check('Paper receipt has two aligned oil-change lines, $700.00 total and $350.00 duplicate cost');
 phase='source-controls';await seek(6,.3);const truth=await page.evaluate(()=>{const value=window.__fleetDemo.getState().scenario;return{readings:JSON.stringify(value.readings),services:JSON.stringify(value.serviceFacts)};});
 await page.locator('#open-source-controls').click();assert.equal(await page.locator('#source-dialog').isVisible(),true);
 await page.locator('#provenance [data-action="set-authority"][data-source="B"]').click();
 await page.waitForFunction(()=>window.__fleetDemo.getState().evaluation.vehicles.find(v=>v.vehicleId==='TRK-104')?.status==='resolved');
 assert.deepEqual(await page.evaluate(()=>{const value=window.__fleetDemo.getState().scenario;return{readings:JSON.stringify(value.readings),services:JSON.stringify(value.serviceFacts)};}),truth);
 await page.keyboard.press('Escape');assert.equal(await page.locator('#source-dialog').isVisible(),false);assert.equal(await page.locator('#open-source-controls').evaluate(element=>element===document.activeElement),true);
 phase='advisory-review';await seek(7,.4);await page.locator('#run-story-review').click();await page.waitForFunction(()=>!!window.__fleetDemo.getState().review);assert.equal((await state()).mode,'today');assert.equal((await state()).simulation.paused,true);await page.keyboard.press('Escape');
 check('Source configuration and advisory review work in optional dialogs, preserve raw/service history and return focus on Escape');
 phase='text-retargeting';await page.evaluate(()=>{for(const index of [1,3,2,7,4])window.__fleetDemo.seekStory(index,.2);});await settleText();assert.equal(await page.locator('#chapter-title').innerText(),(await state()).story.title);assert.equal((await state()).stage,4);check('Rapid next/back/scrub retargets left text without a stale commit');
 phase='manual-controls';await seek(4,.5);await page.locator('#previous-chapter').click();assert.equal((await state()).stage,3);assert.equal((await state()).simulation.paused,true);await page.locator('#next-chapter').click();assert.equal((await state()).stage,4);assert.equal((await state()).simulation.paused,true);await settleText();
 await page.locator('#chapter-title').focus();await page.keyboard.press('ArrowLeft');assert.equal((await state()).stage,3);await page.keyboard.press('ArrowRight');assert.equal((await state()).stage,4);await settleText();await page.locator('#chapter-title').focus();await page.keyboard.press('Space');assert.equal((await state()).simulation.paused,false);assert.equal((await state()).stage,4);await page.keyboard.press('Space');assert.equal((await state()).simulation.paused,true);
 await page.locator('#story-progress').evaluate(element=>{element.value='75';element.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal((await state()).stage,5);assert.equal((await state()).simulation.paused,true);assert.equal((await state()).simulation.timeSeconds,75);assert.equal((await page.locator('#story-elapsed').innerText()).trim(),'1:15');await assertTransport(5);
 await page.locator('#story-progress').focus();await page.keyboard.press('ArrowRight');assert.equal((await state()).stage,5,'Range arrow adjusts time, not scene');assert.ok(Math.abs((await state()).simulation.timeSeconds-75.1)<.01);await page.keyboard.press('Home');assert.equal((await state()).simulation.timeSeconds,0);await assertTransport(0,{baseline:initialTransport});assert.equal((await page.locator('#story-elapsed').innerText()).trim(),'0:00');await page.keyboard.press('End');assert.equal((await state()).simulation.timeSeconds,124);assert.equal((await page.locator('#story-elapsed').innerText()).trim(),'2:04');await assertTransport(8,{baseline:initialTransport});
 await seek(4,.5);const before=(await state()).simulation.timeSeconds;await page.waitForTimeout(250);assert.equal((await state()).simulation.timeSeconds,before);
 await page.locator('#pause').click();await page.waitForTimeout(300);assert.equal((await state()).stage,4,'Play resumes the selected scene');assert.ok((await state()).simulation.timeSeconds>before);await paused();
 // Cross every timed boundary using the public clock. No extra timer or skip function drives advancement.
 for(let index=0;index<8;index++){await seek(index,.99);await page.locator('#pause').click();await page.waitForFunction(expected=>window.__fleetDemo.getState().stage===expected,index+1,{timeout:4000});await paused();}
 await seek(8,.99);await page.locator('#pause').click();await page.waitForFunction(()=>window.__fleetDemo.getState().story.complete&&window.__fleetDemo.getState().simulation.paused,undefined,{timeout:4000});
 await assertTransport(8,{baseline:initialTransport});assert.equal((await page.locator('#story-elapsed').innerText()).trim(),'2:04');assert.equal(await page.locator('#pause [data-playback-icon=play]').isVisible(),true);await page.reload({waitUntil:'domcontentloaded'});await ready(page);assert.equal((await state()).stage,0);assert.equal((await state()).scenario.configVersion,1);assert.equal((await state()).simulation.paused,true);
 check('Keyboard/Back/Forward/scrubber pause playback and update m:ss time; Play advances timed scenes, the last Forward hides, and reload restores a fresh fixture');
 phase='manual-map';await seek(3,.5);assert.equal(await page.locator('[data-story-overlay="provider-switch"]').isVisible(),true);assert.equal((await state()).exploring,false);await page.locator('#camera-controls [data-view="iso"]').click();assert.equal((await state()).exploring,true);assert.equal(await page.locator('[data-story-overlay]:visible').count(),0);await page.waitForFunction(()=>getComputedStyle(document.querySelector('#world')).filter==='none',undefined,{timeout:2500});assert.equal(await page.locator('#camera-controls').isVisible(),true);await page.evaluate(()=>window.__fleetDemo.seekScene(512));assert.equal((await state()).exploring,true);await navigateStory(page,3);await settleText();assert.equal((await state()).exploring,false);assert.equal(await page.locator('[data-story-overlay="provider-switch"]').isVisible(),true);await seek(0);check('Pause keeps content readable; a visible camera control enters manual view and scene navigation returns to the story');
 phase='persistent-transport';await seek(3,.4);const selectedTime=(await state()).simulation.timeSeconds;await page.locator('#pause').click();assert.equal((await state()).stage,3);assert.ok((await state()).simulation.timeSeconds>=selectedTime);await page.locator('#next-chapter').click();await settleText();assert.equal((await state()).stage,4);assert.equal((await state()).simulation.paused,true);await assertTransport(4,{baseline:initialTransport});check('Transport remains outside sidebar fades; Forward from playback selects the next scene and pauses');
 phase='page-navigation';await seek(0);await page.goto(origin+'/',{waitUntil:'domcontentloaded'});await tornDown(page);await page.goBack();await ready(page);await settleText();assert.equal(await page.locator('.fleet-scene-root').count(),1);assert.equal(await page.locator('.fp-panel').count(),1);assert.equal((await state()).stage,0);await paused();check('Navigating away and Back retains exactly one live scene and panel without a Details entry');
 phase='mobile';const transportNode=await page.locator('#story-transport').elementHandle();evidence.mobileTransport={};
 for(const width of [320,390]){
  await page.setViewportSize({width,height:844});await page.evaluate(()=>window.scrollTo(0,0));await seek(0);
  assert.equal(await transportNode.evaluate(element=>element.isConnected&&element===document.querySelector('#story-transport')),true,'The same DOM transport crosses the mobile breakpoint');
  assert.equal((await state()).simulation.paused,true);const mobileTransport=await assertTransport(0,{mobile:true,label:`${width}px opening`});
  await page.screenshot({path:path.join(output,`mobile-${width}-opening-transport.png`),fullPage:false});
  await page.locator('#pause').click();assert.equal((await state()).stage,0);assert.equal((await state()).simulation.paused,false);assert.equal(await page.locator('#pause').getAttribute('aria-label'),'Pause story');await page.waitForTimeout(250);await page.locator('#pause').click();assert.equal((await state()).simulation.paused,true);assert.equal((await state()).stage,0,'Mobile Pause does not advance');assert.equal(await page.evaluate(()=>window.scrollY),0,'Mobile playback works without scrolling');
  for(let index=0;index<9;index++){
   await seek(index,.5);const geometry=await assertTransport(index,{baseline:mobileTransport,mobile:true,label:`${width}px scene ${index+1}`});await noOverflow(`${width}px scene ${index+1} has no horizontal overflow`);
   if([0,4,8].includes(index)){evidence.mobileTransport[`${width}px-scene-${index+1}`]=geometry;await assertGlyphs(`${width}px-scene-${index+1}`,index===0||index===8?5:6);await page.screenshot({path:path.join(output,`mobile-${width}-${index+1}-${ids[index]}.png`),fullPage:false});}
  }
  await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));await assertTransport(8,{baseline:mobileTransport,mobile:true,label:`${width}px scrolled`});assert.equal(await transportNode.evaluate(element=>element.isConnected&&element===document.querySelector('#story-transport')),true);
  const mobileCameraPlacement=await cameraGeometry();assert.equal(mobileCameraPlacement.insideStage,true);assert.equal(mobileCameraPlacement.aboveCredit,true);assert.ok(mobileCameraPlacement.rightInset>=8&&mobileCameraPlacement.bottomInset>=28);
  await page.evaluate(()=>window.scrollTo(0,0));await page.locator('#previous-chapter').click();await settleText();assert.equal((await state()).stage,7);assert.equal((await state()).simulation.paused,true);await page.locator('#next-chapter').click();await settleText();assert.equal((await state()).stage,8);assert.equal((await state()).simulation.paused,true);await assertTransport(8,{baseline:mobileTransport,mobile:true,label:`${width}px after navigation`});
 }
 await transportNode.dispose();check('The same single transport stays fixed, centered and reachable through all nine scenes and scroll positions at 320px and 390px, without overflow or duplicate playback buttons');
 phase='reduced-motion';const reduced=await browser.newPage({viewport:{width:1200,height:900},reducedMotion:'reduce'});await reduced.goto(origin+'/fleet-demo',{waitUntil:'domcontentloaded'});await ready(reduced);const reducedBefore=await reduced.evaluate(()=>window.__fleetDemo.getState());assert.equal(reducedBefore.simulation.paused,true);await reduced.evaluate(()=>window.__fleetDemo.seekStory(3,.5));assert.equal(await reduced.evaluate(()=>window.__fleetDemo.getState().textTransition.phase),'idle');const reducedTime=await reduced.evaluate(()=>window.__fleetDemo.getState().simulation.timeSeconds);await reduced.waitForTimeout(250);assert.equal(await reduced.evaluate(()=>window.__fleetDemo.getState().simulation.timeSeconds),reducedTime);await navigateStory(reduced,0);await reduced.locator('#next-chapter').click();assert.equal(await reduced.evaluate(()=>window.__fleetDemo.getState().stage),1);assert.equal(await reduced.evaluate(()=>window.__fleetDemo.getState().simulation.paused),true);await reduced.locator('#pause').click();assert.equal(await reduced.evaluate(()=>window.__fleetDemo.getState().stage),1);assert.equal(await reduced.evaluate(()=>window.__fleetDemo.getState().simulation.paused),false);await reduced.locator('#pause').click();assert.equal(await reduced.evaluate(()=>window.__fleetDemo.getState().simulation.paused),true);await reduced.close();check('Reduced motion starts paused, Forward stays paused, and explicit Play starts the selected scene');
 phase='interrupted-mount';const interrupted=await browser.newPage({viewport:{width:1280,height:900}});interrupted.on('pageerror',error=>evidence.errors.push({phase:'interrupted-mount',message:error.message}));let heldResolve;const held=new Promise(resolve=>{heldResolve=resolve;});
 await interrupted.route('**/fleet-demo/src/app/bridge.js',async route=>{heldResolve();await new Promise(resolve=>{releaseInterrupted=resolve;});await route.continue().catch(()=>{});},{times:1});await interrupted.goto(origin+'/fleet-demo',{waitUntil:'domcontentloaded'});let timeout;try{await Promise.race([held,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Bridge request was not observed')),45000);})]);}finally{clearTimeout(timeout);}
 await interrupted.goto(origin+'/',{waitUntil:'domcontentloaded'});await tornDown(interrupted);releaseInterrupted();await interrupted.waitForTimeout(500);assert.equal(await interrupted.evaluate(()=>typeof window.__fleetDemo),'undefined');assert.equal(await interrupted.locator('.fleet-scene-root').count(),0);await interrupted.goBack();await ready(interrupted);assert.equal(await interrupted.locator('.fleet-scene-root').count(),1);await interrupted.close();check('Interrupted bridge loading cannot mount a late renderer; returning creates one working instance');
 assert.deepEqual(evidence.errors,[],'No native route JavaScript errors');evidence.result='passed';
}catch(error){evidence.result='failed';evidence.failure={phase,message:String(error),stack:error.stack};if(page)await capture('failure.png').catch(()=>{});process.exitCode=1;}
finally{evidence.completedAt=new Date().toISOString();await fs.writeFile(path.join(output,'report.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence,null,2));releaseInterrupted?.();await browser?.close();}
