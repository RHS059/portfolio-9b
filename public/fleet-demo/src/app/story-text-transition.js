/** Cancel-safe left-column text transition. No timers or listeners are created per scene. */
export function createStoryTextTransition({element,reducedMotion=()=>false,readOpacity=()=>element?Number.parseFloat(globalThis.getComputedStyle?.(element)?.opacity??'1'):1}={}) {
  let generation=0,animation=null,phase='idle',renderedKey=null,targetKey=null,paint=null,afterCommit=null,disposed=false;
  const originalPointer=element?.style?.pointerEvents??'';
  function cancel(){generation++;animation?.cancel?.();animation=null;}
  function restore(){if(!element)return;element.style.opacity='';element.style.pointerEvents=originalPointer;element.removeAttribute?.('aria-busy');}
  function commit(){const render=paint;render?.();renderedKey=targetKey;const callback=afterCommit;afterCommit=null;callback?.();}
  function finish(){if(disposed)return;cancel();phase='idle';commit();restore();}
  function update(key,render){
    if(disposed)return;paint=render;
    if(key===targetKey&&phase!=='idle')return;
    if(key===renderedKey&&phase==='idle'){targetKey=key;render();return;}
    const opacity=Math.max(0,Math.min(1,readOpacity()||0));cancel();targetKey=key;
    if(renderedKey===null||reducedMotion()||typeof element?.animate!=='function'){phase='idle';commit();restore();return;}
    const current=generation;phase='out';element.style.pointerEvents='none';element.setAttribute?.('aria-busy','true');
    animation=element.animate([{opacity},{opacity:0}],{duration:120,easing:'ease-in',fill:'forwards'});
    Promise.resolve(animation.finished).then(()=>{
      if(disposed||current!==generation)return;
      element.style.opacity='0';animation?.cancel?.();animation=null;commit();
      if(disposed||current!==generation)return;
      phase='in';element.style.pointerEvents=originalPointer;
      animation=element.animate([{opacity:0},{opacity:1}],{duration:180,easing:'ease-out',fill:'forwards'});
      return Promise.resolve(animation.finished).then(()=>{if(disposed||current!==generation)return;animation?.cancel?.();animation=null;phase='idle';restore();});
    }).catch(()=>{if(!disposed&&current===generation)finish();});
  }
  return {
    update,finish,
    afterCommit(callback){if(disposed)return;if(phase==='out')afterCommit=callback;else callback();},
    getState:()=>({phase,renderedKey,targetKey}),
    dispose(){if(disposed)return;disposed=true;cancel();phase='idle';paint=null;afterCommit=null;restore();},
  };
}
