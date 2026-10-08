import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {navigateStory,enterCameraView,pauseScene,stopCameraFollow} from './fleet-browser-controls.mjs';

const counters=['Timestamp','TaskDuration','ScriptDuration','LayoutDuration','RecalcStyleDuration','LayoutCount','RecalcStyleCount','JSHeapUsedSize'];
const difference=(before,after)=>Object.fromEntries(counters.map(name=>[name,Number.isFinite(before[name])&&Number.isFinite(after[name])?after[name]-before[name]:null]));

export async function createPerformanceProbe(page){
  const session=await page.context().newCDPSession(page);
  await session.send('Performance.enable');
  const capture=async()=>{
    const result=await session.send('Performance.getMetrics');
    const metrics=Object.fromEntries(result.metrics.filter(item=>counters.includes(item.name)).map(item=>[item.name,item.value]));
    const scene=await page.evaluate(()=>{
      const m=window.__fleetDemo.getMetrics(),s=window.__fleetDemo.getState();
      return {timeSeconds:s.simulation.timeSeconds,paused:s.simulation.paused,selectedVehicleId:s.selectedVehicleId,camera:m.camera,view:m.viewState,
        mapRenderCount:m.mapRenderCount,drawFrames:m.drawFrames,drawCalls:m.drawCalls,triangles:m.triangles,entities:m.entities,visibleEntities:m.visibleEntities,
        detailIds:m.vehicleDetail.models.map(v=>v.id),hardware:m.hardware,width:m.width,height:m.height,devicePixelRatio:window.devicePixelRatio,
        canvases:[...document.querySelectorAll('#world canvas')].map(c=>({className:c.className,width:c.width,height:c.height,cssWidth:c.clientWidth,cssHeight:c.clientHeight}))};
    });
    return {metrics,scene};
  };
  return {capture,delta:(before,after)=>({before,after,counterDeltas:difference(before.metrics,after.metrics),mapRenders:after.scene.mapRenderCount-before.scene.mapRenderCount,sceneDraws:after.scene.drawFrames-before.scene.drawFrames}),
    async dispose(){await session.send('Performance.disable');await session.detach();}};
}

/** Profiled diagnostics are separate from the unprofiled acceptance cadence. */
export async function profileRenderingWindows({page,out}){
  const session=await page.context().newCDPSession(page),probe=await createPerformanceProbe(page),windows=[];
  const facts=await page.evaluate(()=>{const s=window.__fleetDemo.getState().scenario;return{readings:s.readings,services:s.serviceFacts,policies:s.policies};});
  await session.send('Profiler.enable');await session.send('Profiler.setSamplingInterval',{interval:1000});
  try{
    for(const [index,follow]of [true,false,true].entries()){
      await navigateStory(page,0);await enterCameraView(page);
      if(!follow)await stopCameraFollow(page);assert.equal(await page.evaluate(()=>window.__fleetDemo.getState().follow),follow);
      await page.waitForFunction(()=>{const m=window.__fleetDemo.getMetrics();return m.ready&&m.mapTilesLoaded&&!m.cameraMoving;});
      await page.waitForTimeout(750);
      await page.waitForFunction(()=>{const m=window.__fleetDemo.getMetrics();return m.ready&&m.mapTilesLoaded&&!m.cameraMoving;});
      const before=await probe.capture();
      await session.send('Profiler.start');
      await page.locator('#pause').click();
      const cadence=await page.evaluate(()=>new Promise(resolve=>{
        const intervals=[];let start,last;function sample(now){if(start===undefined)start=now;if(last!==undefined)intervals.push(now-last);last=now;
          if(now-start<10000)requestAnimationFrame(sample);else{const sorted=[...intervals].sort((a,b)=>a-b);resolve({durationMs:now-start,samples:intervals.length,fps:intervals.length*1000/(now-start),p95Ms:sorted[Math.ceil(sorted.length*.95)-1],p99Ms:sorted[Math.ceil(sorted.length*.99)-1]});}}
        requestAnimationFrame(sample);
      }));
      const after=await probe.capture(),{profile}=await session.send('Profiler.stop'),profileFile=`diagnostic-${index+1}-follow-${follow?'on':'off'}.cpuprofile`;
      await fs.writeFile(path.join(out,profileFile),JSON.stringify(profile));
      windows.push({follow,profiled:true,profileFile,cadence,...probe.delta(before,after)});
    }
  }finally{
    await session.send('Profiler.disable');await session.detach();await probe.dispose();
    await navigateStory(page,0);await pauseScene(page,false);
    await page.waitForFunction(()=>window.__fleetDemo.getMetrics().ready);
  }
  const afterFacts=await page.evaluate(()=>{const s=window.__fleetDemo.getState().scenario;return{readings:s.readings,services:s.serviceFacts,policies:s.policies};});
  assert.deepEqual(afterFacts,facts,'Profiling must preserve source records, policies and service facts');
  return {note:'CPU-profiled diagnostic windows; compare within this runner, not with unprofiled cadence or physical GPU claims.',windows};
}
