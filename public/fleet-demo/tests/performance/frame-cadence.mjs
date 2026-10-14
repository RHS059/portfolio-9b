/** Summarize measured timestamps. Synthetic unit-test samples are never demo evidence. */
export function summarizeFrames(timestamps) {
  const deltas=[];
  for(let i=1;i<timestamps.length;i++) {
    const dt=timestamps[i]-timestamps[i-1];
    if(Number.isFinite(dt)&&dt>0)deltas.push(dt);
  }
  const sorted=[...deltas].sort((a,b)=>a-b);
  const percentile=p=>sorted.length?sorted[Math.max(0,Math.ceil(sorted.length*p)-1)]:null;
  const elapsed=deltas.reduce((a,b)=>a+b,0);
  return {intervals:deltas.length,elapsedMs:elapsed||null,meanFrameMs:deltas.length?elapsed/deltas.length:null,
    rafPerSecond:elapsed?1000*deltas.length/elapsed:null,p95Ms:percentile(.95),p99Ms:percentile(.99),
    intervalsOver33_33ms:deltas.filter(dt=>dt>1000/30).length,intervalsOver50ms:deltas.filter(dt=>dt>50).length,
    measurement:'Observed browser requestAnimationFrame cadence; not a certified rendered-frame or GPU benchmark'};
}

export async function measureFrameCadence(page,{durationMs=10000,environmentName,sourceRevision}={}) {
  if(!environmentName||!sourceRevision)throw new Error('Name the measured environment and exact source revision.');
  if(!Number.isFinite(durationMs)||durationMs<1000)throw new Error('Measure at least 1000 ms.');
  const measured=await page.evaluate(duration=>new Promise(resolve=>{
    const timestamps=[],visibility=[];
    const start=performance.now();let finished=false,handle;
    const finish=timedOut=>{if(finished)return;finished=true;cancelAnimationFrame(handle);clearTimeout(timer);
      resolve({timestamps,visibility,timedOut,userAgent:navigator.userAgent,devicePixelRatio,
        viewport:{width:innerWidth,height:innerHeight},rendererMetrics:window.__fleetDemo?.getMetrics?.()??null});};
    const frame=now=>{timestamps.push(now);visibility.push(document.visibilityState);if(now-start>=duration)finish(false);else handle=requestAnimationFrame(frame);};
    const timer=setTimeout(()=>finish(true),duration+5000);handle=requestAnimationFrame(frame);
  }),durationMs);
  const summary=summarizeFrames(measured.timestamps);
  const renderer=measured.rendererMetrics?.renderer??'unknown';
  const hardware=measured.rendererMetrics?.hardware??'unavailable';
  return {recordedAt:new Date().toISOString(),environmentName,sourceRevision,...measured,summary,
    visibilityValid:measured.visibility.length>0&&measured.visibility.every(v=>v==='visible'),
    requestedTarget:{minimumRafPerSecond:30,preferredRafPerSecond:60,viewport:'1920x1080'},
    targetAssessment:'UNVERIFIED: cadence alone does not certify rendered FPS or target-device performance',
    renderingClassification:/fallback/i.test(renderer)?'fallback':/swiftshader|software|llvmpipe/i.test(hardware)?'software-rendered':'hardware-unverified'};
}
