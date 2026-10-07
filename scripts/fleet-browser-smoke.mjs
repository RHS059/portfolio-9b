import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {routeDistance,toLocal} from '../public/fleet-demo/src/render/map/world.js';
import {ordinaryRoadRouteInfo} from '../public/fleet-demo/src/render/map/cargo-layout.js';
import {exerciseCargoFlow} from './fleet-cargo-browser-checks.mjs';
import {STORY_TITLE} from '../public/fleet-demo/src/app/story-timeline.js';
import {createPerformanceProbe,profileRenderingWindows} from './fleet-performance-diagnostics.mjs';
import {createRequire} from 'node:module';
const require=createRequire(path.join(process.env.PLAYWRIGHT_PACKAGE || '/tmp/fleet-browser','package.json'));
const {chromium}=require('playwright');
const root=path.resolve('public/fleet-demo'),out=path.resolve(process.env.FLEET_SMOKE_EVIDENCE_DIR||'fleet-browser-evidence');
await fs.mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.webp':'image/webp'};
const server=http.createServer(async(req,res)=>{try{const target=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname.replace(/\/$/,'/index.html')));if(!target.startsWith(root+path.sep))throw Error('outside root');const body=await fs.readFile(target);res.writeHead(200,{'content-type':mime[path.extname(target)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end('Not found');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=process.env.FLEET_DEMO_URL||`http://127.0.0.1:${server.address().port}/`;
let browser,page,phase='bootstrap';const evidence={url,browserConfiguration:'Playwright Chromium defaults; detected renderer is recorded separately',startedAt:new Date().toISOString(),checks:[],errors:[],console:[],contextCycles:[],notes:['CI Chromium software rendering is functional evidence, not named-hardware GPU performance.']};
try{
 browser=await chromium.launch({headless:true});
 page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1});
 page.on('pageerror',error=>evidence.errors.push(String(error)));
 page.on('console',msg=>{if(['warning','warn','error'].includes(msg.type())||/THREE\.WebGLRenderer: Context (Lost|Restored)\./.test(msg.text()))evidence.console.push({level:msg.type(),text:msg.text(),phase,url:page.url(),location:msg.location(),at:new Date().toISOString()});});
 await page.addInitScript(()=>{
   const ids=new WeakMap();let generation=0;const events=[];
   const describe=canvas=>{let gl;const metrics=window.__fleetDemo?.getMetrics?.();const initialized=canvas.className.includes('maplibregl')?!!metrics?.viewState:typeof metrics?.overlayContextLost==='boolean';if(initialized)try{gl=canvas.getContext('webgl2')||canvas.getContext('webgl');}catch{}if(!ids.has(canvas))ids.set(canvas,++generation);return{generation:ids.get(canvas),className:canvas.className,isConnected:canvas.isConnected,width:canvas.width,height:canvas.height,contextLost:gl?.isContextLost?.()??null,attributes:gl?.getContextAttributes?.()??null};};
   window.__fleetGraphicsDiagnostics=()=>({events:[...events],canvases:[...document.querySelectorAll('.fleet-three-overlay,.maplibregl-canvas')].map(describe)});
   for(const type of ['webglcontextlost','webglcontextrestored'])document.addEventListener(type,event=>{const record={type,at:performance.now(),canvas:describe(event.target),metrics:window.__fleetDemo?.getMetrics?.()??null};events.push(record);if(events.length>100)events.shift();},true);
 });
 await page.goto(url,{waitUntil:'domcontentloaded'});
 if(evidence.errors.length)throw new Error(`Startup page error: ${evidence.errors[0]}`);
 await page.waitForFunction(()=>{const m=window.__fleetDemo?.getMetrics?.();return m?.ready&&!m.initializing&&m.mapTilesLoaded&&!m.cameraMoving;},undefined,{timeout:30000});
 if(process.env.REQUIRE_FACILITIES==='1')await page.waitForFunction(()=>window.__fleetDemo.getMetrics().facilitiesLoaded,undefined,{timeout:15000});
 if(process.env.REQUIRE_MAPPED_PORT==='1')await page.waitForFunction(()=>{const m=window.__fleetDemo.getMetrics();return m.portStatus==='mapped'&&m.portRowCount>0&&m.portContainerCount>0&&m.portCraneCount>0;},undefined,{timeout:15000});
 await page.locator('#reset').click();await page.locator('#pause').click();
 await page.waitForTimeout(800);
 await page.waitForFunction(()=>{const m=window.__fleetDemo.getMetrics();return m.ready&&m.mapTilesLoaded&&!m.cameraMoving;},undefined,{timeout:30000});
 await page.waitForFunction(()=>{const m=window.__fleetDemo.getMetrics();return m.vehicleDetailState==='ready'&&m.vehicleDetail.models.some(v=>v.id==='TRK-104');},undefined,{timeout:15000});
 const projectedTarget=await page.evaluate(()=>{const m=window.__fleetDemo.getMetrics(),v=m.cameraTarget;return{point:window.__fleetDemo.projectScenePoint([v.x,v.y,0]),width:m.width,height:m.height};});assert.ok(projectedTarget.point&&projectedTarget.point.x>=0&&projectedTarget.point.x<=projectedTarget.width&&projectedTarget.point.y>=0&&projectedTarget.point.y<=projectedTarget.height,'Read-only scene projection must locate the followed truck inside the actual viewport');evidence.projectedTarget=projectedTarget;
 phase='initial-scene';await page.screenshot({path:path.join(out,'01-desktop-initial.png'),fullPage:true});
 const state=()=>page.evaluate(()=>window.__fleetDemo.getState());
 const setPaused=async value=>{if((await state()).simulation.paused!==value)await page.locator('#pause').click();};
 const exploreScene=async()=>{if(!(await state()).exploring)await page.locator('#explore-scene').click();};
 const closeSource=async()=>{if(await page.locator('#source-dialog').isVisible())await page.locator('#source-close').click();};
 const advanceToStage=async target=>{await closeSource();await page.locator(`[data-scene-index="${target}"]`).click();assert.equal((await state()).stage,target);};
 const openSource=async()=>{if(!await page.locator('#source-dialog').isVisible()){await advanceToStage(6);await page.locator('#open-source-controls').click();}};
 const openReview=async()=>{await advanceToStage(7);await page.locator('#run-story-review').click();};
 const chooseTruck=async id=>{await openSource();const picker=page.locator('[data-vehicle-select]');if(!await picker.isVisible())await page.getByText('Check another truck',{exact:true}).click();await picker.selectOption(id);await closeSource();};
 await advanceToStage(2);await exploreScene();
 for(const id of ['depot','oict','centerpoint']){
   phase=`facility-${id}`;await page.locator(`[data-focus="${id}"]`).click();await page.waitForTimeout(750);await page.waitForFunction(()=>{const m=window.__fleetDemo.getMetrics();return m.mapTilesLoaded&&!m.cameraMoving;},undefined,{timeout:20000});await page.screenshot({path:path.join(out,`facility-${id}.png`),fullPage:true});
   if(id==='depot'){
     await page.waitForFunction(()=>window.__fleetDemo.getMetrics().vehicleDetail.models.some(v=>v.id==='TRK-104'));
     evidence.vehicleDetail=await page.evaluate(()=>window.__fleetDemo.getMetrics().vehicleDetail);assert.ok(evidence.vehicleDetail.visible<=3);const bayTractor=evidence.vehicleDetail.models.find(v=>v.id==='TRK-104');assert.equal(bayTractor.kind,'truck');assert.equal(bayTractor.variant,'tractor');assert.equal(bayTractor.wheelCount,10);assert.ok(bayTractor.bounds.min[1]>-1,'Workshop contains the tractor without its road trailer');
     await page.screenshot({path:path.join(out,'vehicle-detail-workshop.png'),fullPage:true});evidence.checks.push('Selected workshop tractor has no trailer in the bounded detailed model pool');
   }
   if(id==='centerpoint'){
     await page.waitForFunction(()=>window.__fleetDemo.getMetrics().factoryDetailLevel==='detail');
     const connected=!!(await state()).cargoProcess,wasPaused=(await state()).simulation.paused;if(connected&&!wasPaused)await page.locator('#pause').click();if(connected){await page.evaluate(()=>window.__fleetDemo.seekScene(0));await page.locator('[data-focus="centerpoint"]').click();}
     if(connected)await page.waitForFunction(()=>window.__fleetDemo.getMetrics().factoryAssemblyState.some(cell=>cell.active&&cell.armAction==='assemble-drone'));
     evidence.factoryDetail=await page.evaluate(()=>window.__fleetDemo.getMetrics());assert.ok(evidence.factoryDetail.factoryAssemblyState.length>0);
     if(!connected)assert.ok(evidence.factoryDetail.factoryAssemblyState.every(cell=>cell.progress===0),'Assembly stays idle without an explicit process snapshot');
     await page.screenshot({path:path.join(out,'factory-detail.png'),fullPage:true});evidence.checks.push(connected?'Factory assembly follows the explicit inbound process snapshot':'Factory detail is visible and assembly stays idle without process input');
     if(!connected&&!wasPaused)await page.locator('#pause').click();
     const approachProgress=routeDistance('port-to-factory',1)/routeDistance('delivery',1)-.000001,approachTime=connected?ordinaryRoadRouteInfo().approachTimeSeconds:((approachProgress-.59+1)%1)/.006;
     await page.evaluate(time=>window.__fleetDemo.seekScene(time),approachTime);await page.locator('[data-focus="centerpoint"]').click();await page.waitForTimeout(750);await page.screenshot({path:path.join(out,'factory-approach-close.png'),fullPage:true});
     const factoryBox=await page.locator('.maplibregl-canvas').boundingBox();await page.mouse.move(factoryBox.x+factoryBox.width*.5,factoryBox.y+factoryBox.height*.5);
     for(let step=0;step<12;step++){if(await page.evaluate(()=>window.__fleetDemo.getMetrics().viewState.zoom<=15.3))break;await page.mouse.wheel(0,550);await page.waitForTimeout(750);}
     await page.waitForFunction(()=>{const m=window.__fleetDemo.getMetrics();return m.mapTilesLoaded&&!m.cameraMoving&&m.viewState.zoom<=15.3&&m.vehicleDetail.visible===0;},undefined,{timeout:20000});
     evidence.factoryOverview=await page.evaluate(()=>window.__fleetDemo.getMetrics());await page.screenshot({path:path.join(out,'factory-approach-overview.png'),fullPage:true});
     await page.locator('[data-focus="centerpoint"]').click();if(!wasPaused)await page.locator('#pause').click();evidence.checks.push('Factory approach is exercised in close and overview LOD with the scene clock paused');

   }
   if(id==='oict'&&process.env.REQUIRE_MAPPED_PORT==='1'){
     evidence.portOverview=await page.evaluate(()=>window.__fleetDemo.getMetrics());assert.equal(evidence.portOverview.portStatus,'mapped');
     const box=await page.locator('.maplibregl-canvas').boundingBox();await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);for(let step=0;step<6;step++){if(await page.evaluate(()=>window.__fleetDemo.getMetrics().portDetailLevel==='detail'))break;await page.mouse.wheel(0,-600);await page.waitForTimeout(850);}
     await page.waitForFunction(()=>{const m=window.__fleetDemo.getMetrics();return m.portDetailLevel==='detail'&&m.mapTilesLoaded&&!m.cameraMoving;},undefined,{timeout:20000});
     evidence.portDetail=await page.evaluate(()=>window.__fleetDemo.getMetrics());await page.screenshot({path:path.join(out,'facility-oict-detail.png'),fullPage:true});evidence.checks.push('Mapped terminal footprint loads and switches to individual containers at inspection scale');
   }
 }
 if(process.env.REQUIRE_CARGO_FLOW==='1'){assert.ok((await state()).cargoProcess,'Connected process must be enabled');await exerciseCargoFlow({page,evidence,out,setPhase:value=>{phase=value;}});}
 await page.locator('[data-focus="depot"]').click();
 phase='manual-camera';
 const sceneBox=await page.locator('.maplibregl-canvas').boundingBox();
 const mx=sceneBox.x+sceneBox.width*.72,my=sceneBox.y+sceneBox.height*.62;
 await page.mouse.move(mx,my);await page.mouse.down();await page.mouse.move(mx+80,my+40,{steps:8});await page.mouse.up();
 await page.waitForFunction(()=>!window.__fleetDemo.getMetrics().cameraMoving);
 await page.screenshot({path:path.join(out,'06-pan-alignment.png'),fullPage:true});
 await page.mouse.move(mx,my);await page.mouse.down({button:'right'});await page.mouse.move(mx-65,my+30,{steps:8});await page.mouse.up({button:'right'});
 await page.waitForFunction(()=>!window.__fleetDemo.getMetrics().cameraMoving);
 await page.screenshot({path:path.join(out,'07-orbit-alignment.png'),fullPage:true});
 evidence.checks.push('manual map pan and orbit remain usable with scene overlay');
 await page.locator('#reset').click();
 await page.waitForFunction(()=>{const m=window.__fleetDemo.getMetrics();return m.ready&&m.mapTilesLoaded&&!m.cameraMoving;});

 phase='source-workflow';await setPaused(true);const initial=await state();
 const initialView=await page.evaluate(()=>window.__fleetDemo.getMetrics().viewState);assert.ok(initialView.zoom>17,'Opening must actually frame the moving truck');assert.ok(Math.abs(initialView.pitch-52)<.01,'Reset restores ISO pitch');assert.ok(Math.abs(initialView.bearing+28)<.01,'Reset restores ISO bearing');
 assert.equal(initial.evaluation.vehicles.find(v=>v.vehicleId==='TRK-104').status,'unresolved');
 assert.equal(initial.evaluation.vehicles.find(v=>v.vehicleId==='TRK-208').sourceId,'A');
 const raw=JSON.stringify(initial.scenario.readings),services=JSON.stringify(initial.scenario.serviceFacts);
 evidence.checks.push('guided initial state: migrated vehicle unresolved, unmigrated vehicle A');
 assert.equal(await page.locator('#project-info').isVisible(),true);assert.equal(await page.locator('#story-content').isVisible(),false);assert.equal(initial.intro,true);assert.equal((await page.locator('#intro-panel h1').innerText()).replace(/\s+/g,' ').trim(),STORY_TITLE);assert.ok((await page.locator('#project-info').innerText()).includes('UX Designer, 2× App Developer, 1× Support Agent, 1× Customer Success Manager'));
 assert.equal(await page.evaluate(()=>{const info=document.querySelector('#project-info').getBoundingClientRect(),world=document.querySelector('.world-panel').getBoundingClientRect();return info.right<=world.left;}),true);
 await page.locator('#start-story').click();assert.equal((await state()).selectedVehicleId,'TRK-104');assert.equal((await state()).follow,true);assert.equal(await page.locator('#source-inspector').isVisible(),false);await advanceToStage(2);assert.equal((await state()).follow,false);await openSource();assert.equal(await page.locator('#source-inspector').isVisible(),true);
 evidence.checks.push('left opening metadata and teaser transition into the story and source inspector');
 await openReview();
 await page.locator('[data-action="review-imports"]').click();
 await page.waitForFunction(()=>window.__fleetDemo.getState().review!==null);
 const reviewed=await state();assert.equal(reviewed.review.mode,'simulated');assert.equal(JSON.stringify(reviewed.scenario.readings),raw);assert.equal(JSON.stringify(reviewed.scenario.serviceFacts),services);
 evidence.checks.push('Today simulated review is labeled and leaves raw/service records unchanged');
 await page.screenshot({path:path.join(out,'02-today-review.png'),fullPage:true});
 await page.locator('[data-action="set-authority"][data-source="B"]').click();
 const fixed=await state();assert.equal(fixed.evaluation.vehicles.find(v=>v.vehicleId==='TRK-104').sourceId,'B');assert.equal(fixed.evaluation.vehicles.find(v=>v.vehicleId==='TRK-104').status,'resolved');assert.equal(fixed.evaluation.vehicles.find(v=>v.vehicleId==='TRK-208').sourceId,'A');assert.equal(JSON.stringify(fixed.scenario.readings),raw);assert.equal(JSON.stringify(fixed.scenario.serviceFacts),services);
 if(fixed.cargoProcess?.capabilities?.outgoing===false){const truck=await page.evaluate(()=>window.__fleetDemo.getSceneSnapshot().vehicles.find(v=>v.id==='TRK-104'));assert.equal(truck.routeId,'depot-bay');assert.match(truck.status,/^ready for work$/i);}
 evidence.checks.push('explicit B repair resolves only migrated vehicle and preserves immutable records');
 await page.getByText('More source controls',{exact:true}).click();
 await page.locator('[data-action="replay"]').click();
 await page.locator('[data-action="replay"]').click();
 await page.locator('[data-action="reimport"]').click();
 const replay=await state();assert.equal(replay.scenario.readings.length,initial.scenario.readings.length);assert.equal(replay.scenario.serviceFacts.length,initial.scenario.serviceFacts.length);
 evidence.checks.push('repeated replay and duplicate batch do not duplicate raw/service facts');
 await closeSource();await exploreScene();
 for(const mode of ['2d','3d','iso']){await page.locator(`[data-view="${mode}"]`).click();assert.equal((await state()).view,mode);}
 await page.locator('#follow').click();assert.equal((await state()).follow,true);
 await setPaused(true);const paused=(await state()).simulation.timeSeconds;await page.waitForTimeout(200);assert.equal((await state()).simulation.timeSeconds,paused);
 evidence.checks.push('camera modes/follow/pause controls operate without data mutation');
 await chooseTruck('TRK-208');assert.equal((await state()).selectedVehicleId,'TRK-208');
 await page.locator('#about-toggle').click();assert.equal(await page.locator('#about-panel').isVisible(),true);await page.keyboard.press('Escape');assert.equal(await page.locator('#about-panel').isVisible(),false);
 await page.locator('#reset').click();const reset=await state();assert.equal(reset.evaluation.vehicles.find(v=>v.vehicleId==='TRK-104').status,'unresolved');assert.equal(reset.intro,true);assert.equal(await page.locator('#story-content').isVisible(),false);assert.equal(reset.follow,true);assert.equal(reset.selectedVehicleId,'TRK-104');assert.equal(reset.simulation.paused,false);
 evidence.checks.push('selection, about dismissal and reset restore expected state');
 phase='steady-1080p';evidence.interactionMetrics=await page.evaluate(()=>window.__fleetDemo.getMetrics());
 await page.setViewportSize({width:1920,height:1080});
 await page.waitForTimeout(1000);
 const performanceProbe=await createPerformanceProbe(page),performanceBefore=await performanceProbe.capture();
 evidence.settledMeasurement=await page.evaluate(()=>new Promise(resolve=>{const frames=[];let start,last;const sample=now=>{if(start===undefined)start=now;if(last!==undefined)frames.push(now-last);last=now;if(now-start<10000)requestAnimationFrame(sample);else{const sorted=[...frames].sort((a,b)=>a-b);resolve({durationMs:now-start,samples:frames.length,fps:1000/(frames.reduce((a,b)=>a+b,0)/frames.length),p95Ms:sorted[Math.ceil(sorted.length*.95)-1],p99Ms:sorted[Math.ceil(sorted.length*.99)-1],longFrames:frames.filter(x=>x>50).length,metrics:window.__fleetDemo.getMetrics()});}};requestAnimationFrame(sample);}));
 evidence.performanceCounters=performanceProbe.delta(performanceBefore,await performanceProbe.capture());await performanceProbe.dispose();
 evidence.environment={os:os.platform()+' '+os.release(),cpus:os.cpus().map(c=>c.model),memoryBytes:os.totalmem(),viewport:{width:1920,height:1080},hardwareBenchmark:false};
 await page.screenshot({path:path.join(out,'05-settled-1080p.png'),fullPage:true});
 phase='diagnostic-profiling';evidence.renderProfiles=await profileRenderingWindows({page,out});
 phase='responsive-390';await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:path.join(out,'03-mobile.png'),fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
assert.equal(await page.evaluate(()=>document.querySelector('#start-story').getBoundingClientRect().bottom<=document.querySelector('.world-panel').getBoundingClientRect().top),true);
 evidence.checks.push('390px opening places project metadata and Next before the scene without overflow');
 await page.setViewportSize({width:1600,height:1000});
 await openSource();
 await page.locator('[data-action="set-authority"][data-source="B"]').click();
 await chooseTruck('TRK-208');await exploreScene();await setPaused(true);
 for(const selector of ['.fleet-three-overlay','.maplibregl-canvas','.maplibregl-canvas']){
   await page.waitForFunction(()=>{const m=window.__fleetDemo.getMetrics();return m.ready&&!m.cameraMoving;});
   const beforeLoss=await state();
   phase=`${selector}-context-loss`;
   const viewBefore=await page.evaluate(()=>window.__fleetDemo.getMetrics().viewState);
   const available=await page.evaluate(selector=>{const canvas=document.querySelector(selector);if(!canvas)return false;const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');const ext=gl?.getExtension('WEBGL_lose_context');if(!ext)return false;window.__fleetTestContextExtension=ext;window.__fleetTestContext=gl;window.__fleetTestCanvas=canvas;window.__fleetTestContextSelector=selector;window.__fleetTestLossSnapshot=null;canvas.addEventListener('webglcontextlost',event=>{const fallback=document.querySelector('svg[aria-label="Oakland fleet map, 2D fallback"]');window.__fleetTestLossSnapshot={nativeEvent:{type:event.type,isTrusted:event.isTrusted,className:canvas.className,contextLost:gl.isContextLost()},metrics:window.__fleetDemo.getMetrics(),fallbackVisible:!!fallback&&getComputedStyle(fallback).display!=='none',status:document.querySelector('.fleet-scene-status')?.textContent,resetEnabled:!document.querySelector('#reset').disabled};},{once:true});ext.loseContext();return true;},selector);
   assert.equal(available,true,`Context-loss extension required for ${selector}`);
   await page.waitForFunction(()=>window.__fleetTestLossSnapshot!==null,undefined,{timeout:10000,polling:50});
   assert.equal(JSON.stringify((await state()).scenario.readings),JSON.stringify(beforeLoss.scenario.readings));
   assert.equal(await page.locator('#reset').isEnabled(),true);
   assert.equal(await page.evaluate(()=>window.__fleetTestContext.isContextLost()),true);
   const lossSnapshot=await page.evaluate(()=>window.__fleetTestLossSnapshot);assert.equal(lossSnapshot.nativeEvent.type,'webglcontextlost');assert.equal(lossSnapshot.nativeEvent.isTrusted,true);assert.ok(lossSnapshot.nativeEvent.className.includes(selector.slice(1)));assert.equal(lossSnapshot.nativeEvent.contextLost,true);assert.equal(lossSnapshot.metrics.contextLost,true);assert.equal(lossSnapshot.fallbackVisible,true);assert.equal(lossSnapshot.resetEnabled,true);
   const cycle={selector,afterHandlers:lossSnapshot,loss:await page.evaluate(()=>({metrics:window.__fleetDemo.getMetrics(),graphics:window.__fleetGraphicsDiagnostics()}))};evidence.contextCycles.push(cycle);
   // A screenshot with an intentionally lost GPU context can stall Chromium's compositor.
   // Record the real lost state, then restore immediately; capture pixels after recovery.
   phase=`${selector}-context-recovery`;cycle.restoreCommand=await page.evaluate(()=>{const gl=window.__fleetTestContext,canvas=window.__fleetTestCanvas,isCurrent=canvas.isConnected&&document.querySelector(window.__fleetTestContextSelector)===canvas;if(isCurrent)window.__fleetTestContextExtension.restoreContext();const errors=[];for(let i=0;i<4;i++){const code=gl.getError();if(code===gl.NO_ERROR)break;errors.push(code);}return{path:isCurrent?'native-restoration':'replacement-canvas',lostCanvasConnected:canvas.isConnected,errors,contextLost:gl.isContextLost()};});
   await page.waitForTimeout(200);
   cycle.afterRestore=await page.evaluate(()=>{const gl=window.__fleetTestContext,errors=[];for(let i=0;i<4;i++){const code=gl.getError();if(code===gl.NO_ERROR)break;errors.push(code);}return{errors,contextLost:gl.isContextLost(),metrics:window.__fleetDemo.getMetrics()};});
   await page.waitForFunction(()=>{const m=window.__fleetDemo.getMetrics();return !m.contextLost&&m.ready&&m.renderer.includes('Three');},undefined,{timeout:15000});
   cycle.recovered=await page.evaluate(()=>({metrics:window.__fleetDemo.getMetrics(),graphics:window.__fleetGraphicsDiagnostics()}));
   await page.screenshot({path:path.join(out,selector.includes('three')?'04-overlay-recovered.png':`04-map-recovered-${evidence.contextCycles.length}.png`),fullPage:true});
   const viewAfter=await page.evaluate(()=>window.__fleetDemo.getMetrics().viewState);
   assert.ok(Math.abs(viewAfter.zoom-viewBefore.zoom)<.01);assert.ok(Math.abs(viewAfter.pitch-viewBefore.pitch)<.01);assert.ok(Math.abs(viewAfter.bearing-viewBefore.bearing)<.01);
   if(beforeLoss.follow){
     const tracking=await page.evaluate(()=>{const m=window.__fleetDemo.getMetrics();return{camera:m.camera,target:m.cameraTarget,view:m.viewState};});
     assert.equal(tracking.camera.focus,beforeLoss.selectedVehicleId);assert.equal(tracking.camera.follow,true);assert.equal(tracking.target.id,beforeLoss.selectedVehicleId);
     const center=toLocal(tracking.view.center),errorMeters=Math.hypot(center[0]-tracking.target.x,center[1]-tracking.target.y);
     assert.ok(errorMeters<20,`Recovered camera trails the moving truck by ${errorMeters}m`);cycle.followTracking={...tracking,errorMeters};
   }else for(let i=0;i<2;i++)assert.ok(Math.abs(viewAfter.center[i]-viewBefore.center[i])<.00001);
   const recovered=await state();
   assert.equal(JSON.stringify(recovered.scenario),JSON.stringify(beforeLoss.scenario),'Recovery preserves readings, services and configuration');
   assert.equal(recovered.intro,beforeLoss.intro);assert.equal(recovered.selectedVehicleId,beforeLoss.selectedVehicleId);assert.equal(recovered.mode,beforeLoss.mode);assert.equal(recovered.view,beforeLoss.view);assert.equal(recovered.follow,beforeLoss.follow);assert.equal(recovered.simulation.paused,beforeLoss.simulation.paused);
   if(beforeLoss.cargoProcess){await page.waitForFunction(()=>window.__fleetDemo.getMetrics().cargoProcessRender?.active,undefined,{timeout:15000});assert.equal(recovered.cargoProcess.outgoingEnabled,beforeLoss.cargoProcess.outgoingEnabled);if(beforeLoss.simulation.paused)assert.deepEqual(recovered.cargoProcess,beforeLoss.cargoProcess);assert.deepEqual((await page.evaluate(()=>window.__fleetDemo.getMetrics().cargoProcessRender)).errors,[]);}
   if(beforeLoss.simulation.paused)assert.equal(recovered.simulation.timeSeconds,beforeLoss.simulation.timeSeconds);
   else assert.ok(recovered.simulation.timeSeconds>beforeLoss.simulation.timeSeconds,'Live simulation continues through recovery');
   evidence.checks.push(`${selector} actual context loss and recovery preserve records, source policy, selection and pause state`);
   if(selector.includes('three')){await page.locator('#reset').click();assert.equal((await state()).simulation.paused,false);await exploreScene();await setPaused(false);await page.locator('#overview').click();assert.equal((await state()).follow,false);}
   else if(evidence.contextCycles.length===2){await page.locator('#follow').click();await page.waitForFunction(()=>{const m=window.__fleetDemo.getMetrics();return m.camera.follow&&m.camera.focus===window.__fleetDemo.getState().selectedVehicleId&&m.viewState.zoom>17&&!m.cameraMoving;});}

 }
 phase='legacy-reno';await page.locator('#about-toggle').click();await page.getByRole('link',{name:'Original Reno console ↗'}).click();await page.waitForLoadState('domcontentloaded');await page.getByRole('button',{name:'Live',exact:true}).click();
 for(const mode of ['2D','3D','Isometric'])await page.getByRole('button',{name:mode,exact:true}).click();
 await page.getByRole('button',{name:'Follow vehicle',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Following',exact:true}).isVisible(),true);await page.getByRole('button',{name:'Following',exact:true}).click();
 evidence.checks.push('original Reno Live, 2D, 3D, Isometric and follow controls remain usable');
 await page.goBack({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__fleetDemo?.getMetrics?.());phase='back-navigation';await page.keyboard.press('Escape');assert.equal(await page.locator('#about-panel').isVisible(),false);await setPaused(false);const backTime=(await state()).simulation.timeSeconds;await page.waitForTimeout(150);assert.ok((await state()).simulation.timeSeconds>backTime);await openReview();assert.equal((await state()).mode,'today');
 evidence.checks.push('Back navigation restores an operating scene and controls');
 phase='reduced-motion';await page.emulateMedia({reducedMotion:'reduce'});await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__fleetDemo?.getState?.());assert.equal((await state()).simulation.paused,true);await page.locator('#reset').click();assert.equal((await state()).simulation.paused,true);
 evidence.checks.push('reduced-motion preference pauses initial scene and reset');
 evidence.checks.push('original Reno console remains reachable');
 // The preserved legacy console may log unrelated external-map warnings; new page exceptions are captured above.
 evidence.unexpectedGraphicsWarnings=evidence.console.filter(m=>m.phase!=='legacy-reno'&&/INVALID_OPERATION|INVALID_VALUE|buffer overflow|element array buffer/i.test(m.text));
 assert.deepEqual(evidence.errors,[]);assert.deepEqual(evidence.unexpectedGraphicsWarnings,[],'New-demo graphics warnings need investigation');
 evidence.graphicsDiagnostics=await page.evaluate(()=>window.__fleetGraphicsDiagnostics?.()??null);
 evidence.result='passed';
}catch(error){
 evidence.result='failed';evidence.failure=String(error);evidence.failurePhase=phase;
 if(page&&!page.isClosed()){
   try{evidence.failureMetrics=await page.evaluate(()=>window.__fleetDemo?.getMetrics?.()??null);evidence.graphicsDiagnostics=await page.evaluate(()=>window.__fleetGraphicsDiagnostics?.()??null);if(!evidence.failureMetrics?.contextLost)await page.screenshot({path:path.join(out,'failure.png'),fullPage:true,timeout:5000});else evidence.diagnosticNote='Lost-state screenshot omitted to avoid blocking the compositor; native context and DOM state are recorded.';}catch(diagnosticError){evidence.diagnosticFailure=String(diagnosticError);}
 }
 throw error;
}
finally{await fs.writeFile(path.join(out,'result.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence,null,2));await browser?.close();await new Promise(resolve=>server.close(resolve));}
