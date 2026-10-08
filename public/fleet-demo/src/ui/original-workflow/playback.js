/** Disposable clock used only by the open modal. The preview uses the story clock. */
export function createWorkflowPlayback({duration,onTime,requestFrame,cancelFrame,now=()=>performance.now()}={}){
  if(!Number.isFinite(duration)||duration<=0||typeof onTime!=='function')throw new TypeError('A positive duration and onTime callback are required.');
  const request=requestFrame||globalThis.requestAnimationFrame?.bind(globalThis),cancel=cancelFrame||globalThis.cancelAnimationFrame?.bind(globalThis);
  if(!request||!cancel)throw new TypeError('Animation frame scheduling is required.');
  let elapsed=0,playing=false,disposed=false,frame=null,previous=0;
  const publish=()=>onTime(elapsed,{playing});
  const stopFrame=()=>{if(frame!==null)cancel(frame);frame=null;};
  function tick(timestamp){frame=null;if(disposed||!playing)return;elapsed=(elapsed+Math.max(0,(timestamp-previous)/1000))%duration;previous=timestamp;publish();if(!disposed&&playing)frame=request(tick);}
  return {
    getState:()=>({timeSeconds:elapsed,playing,disposed}),
    play(){if(disposed||playing)return;playing=true;previous=now();publish();if(!disposed&&playing)frame=request(tick);},
    pause(){if(disposed)return;playing=false;stopFrame();publish();},
    seek(seconds=0){if(disposed)return;elapsed=((Number.isFinite(seconds)?seconds:0)%duration+duration)%duration;previous=now();publish();},
    restart({play=false}={}){if(disposed)return;stopFrame();elapsed=0;playing=play;previous=now();publish();if(!disposed&&playing)frame=request(tick);},
    dispose(){if(disposed)return;disposed=true;playing=false;stopFrame();},
  };
}
