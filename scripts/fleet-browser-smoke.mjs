import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(path.join(process.env.PLAYWRIGHT_PACKAGE || '/tmp/fleet-browser','package.json'));
const {chromium}=require('playwright');
const root=path.resolve('public/fleet-demo'),out=path.resolve('fleet-browser-evidence');
await fs.mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.webp':'image/webp'};
const server=http.createServer(async(req,res)=>{try{const target=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname.replace(/\/$/,'/index.html')));if(!target.startsWith(root+path.sep))throw Error('outside root');const body=await fs.readFile(target);res.writeHead(200,{'content-type':mime[path.extname(target)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end('Not found');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}/`;
let browser;const evidence={url,startedAt:new Date().toISOString(),checks:[],errors:[],notes:['CI Chromium software rendering is functional evidence, not named-hardware GPU performance.']};
try{
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1});
 page.on('pageerror',error=>evidence.errors.push(String(error)));
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__fleetDemo?.getMetrics?.(),{timeout:30000});
 await page.waitForTimeout(1200);
 await page.screenshot({path:path.join(out,'01-desktop-initial.png'),fullPage:true});
 const state=()=>page.evaluate(()=>window.__fleetDemo.getState());
 const initial=await state();
 assert.equal(initial.evaluation.vehicles.find(v=>v.vehicleId==='TRK-104').status,'unresolved');
 assert.equal(initial.evaluation.vehicles.find(v=>v.vehicleId==='TRK-208').sourceId,'A');
 const raw=JSON.stringify(initial.scenario.readings),services=JSON.stringify(initial.scenario.serviceFacts);
 evidence.checks.push('guided initial state: migrated vehicle unresolved, unmigrated vehicle A');
 await page.locator('[data-mode="today"]').click();
 await page.locator('[data-action="review-imports"]').click();
 await page.waitForFunction(()=>window.__fleetDemo.getState().review!==null);
 const reviewed=await state();assert.equal(reviewed.review.mode,'simulated');assert.equal(JSON.stringify(reviewed.scenario.readings),raw);assert.equal(JSON.stringify(reviewed.scenario.serviceFacts),services);
 evidence.checks.push('Today simulated review is labeled and leaves raw/service records unchanged');
 await page.screenshot({path:path.join(out,'02-today-review.png'),fullPage:true});
 await page.locator('[data-action="set-authority"][data-source="B"]').click();
 const fixed=await state();assert.equal(fixed.evaluation.vehicles.find(v=>v.vehicleId==='TRK-104').sourceId,'B');assert.equal(fixed.evaluation.vehicles.find(v=>v.vehicleId==='TRK-104').status,'resolved');assert.equal(fixed.evaluation.vehicles.find(v=>v.vehicleId==='TRK-208').sourceId,'A');assert.equal(JSON.stringify(fixed.scenario.readings),raw);assert.equal(JSON.stringify(fixed.scenario.serviceFacts),services);
 evidence.checks.push('explicit B repair resolves only migrated vehicle and preserves immutable records');
 await page.locator('[data-action="replay"]').click();
 await page.locator('[data-action="replay"]').click();
 await page.locator('[data-action="reimport"]').click();
 const replay=await state();assert.equal(replay.scenario.readings.length,initial.scenario.readings.length);assert.equal(replay.scenario.serviceFacts.length,initial.scenario.serviceFacts.length);
 evidence.checks.push('repeated replay and duplicate batch do not duplicate raw/service facts');
 for(const mode of ['2d','3d','iso']){await page.locator(`[data-view="${mode}"]`).click();assert.equal((await state()).view,mode);}
 await page.locator('#follow').click();assert.equal((await state()).follow,true);
 await page.locator('#pause').click();const paused=(await state()).simulation.timeSeconds;await page.waitForTimeout(200);assert.equal((await state()).simulation.timeSeconds,paused);
 evidence.checks.push('camera modes/follow/pause controls operate without data mutation');
 await page.locator('[data-vehicle="TRK-208"]').click();assert.equal((await state()).selectedVehicleId,'TRK-208');
 await page.locator('#about-toggle').click();assert.equal(await page.locator('#about-panel').isVisible(),true);await page.keyboard.press('Escape');assert.equal(await page.locator('#about-panel').isVisible(),false);
 await page.locator('#reset').click();const reset=await state();assert.equal(reset.evaluation.vehicles.find(v=>v.vehicleId==='TRK-104').status,'unresolved');assert.equal(reset.follow,false);assert.equal(reset.simulation.paused,false);
 evidence.checks.push('selection, about dismissal and reset restore expected state');
 evidence.metrics=await page.evaluate(()=>window.__fleetDemo.getMetrics());
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:path.join(out,'03-mobile.png'),fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
 evidence.checks.push('390px responsive layout has no horizontal overflow');
 await page.setViewportSize({width:1600,height:1000});
 const beforeLoss=await state();
 const lost=await page.evaluate(()=>{const canvas=document.querySelector('.maplibregl-canvas');if(!canvas)return false;canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true}));return true;});
 if(lost){await page.waitForTimeout(150);assert.equal(JSON.stringify((await state()).scenario.readings),JSON.stringify(beforeLoss.scenario.readings));await page.screenshot({path:path.join(out,'04-context-loss.png'),fullPage:true});evidence.checks.push('context-loss fallback preserves source records');}
 await page.getByRole('link',{name:'Original Reno console ↗'}).click();await page.waitForLoadState('domcontentloaded');await page.waitForTimeout(1000);assert.ok((await page.content()).includes('Northrange Logistics'));
 await page.goBack({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__fleetDemo?.getMetrics?.());const backTime=(await state()).simulation.timeSeconds;await page.waitForTimeout(150);assert.ok((await state()).simulation.timeSeconds>backTime);await page.locator('[data-mode="today"]').click();assert.equal((await state()).mode,'today');
 evidence.checks.push('Back navigation restores an operating scene and controls');
 evidence.checks.push('original Reno console remains reachable');
 // The preserved legacy console may log unrelated external-map warnings; new page exceptions are captured above.
 assert.deepEqual(evidence.errors,[]);
 evidence.result='passed';
}catch(error){evidence.result='failed';evidence.failure=String(error);throw error;}
finally{await fs.writeFile(path.join(out,'result.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence,null,2));await browser?.close();await new Promise(resolve=>server.close(resolve));}
