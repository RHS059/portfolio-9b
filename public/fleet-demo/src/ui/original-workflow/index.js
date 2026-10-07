import {createWorkflowState,reduceWorkflow,sampleWorkflow,WORKFLOW_DURATION,assetLabel} from './model.js';
import {renderWorkflowScreen,phaseDescription} from './view.js';
import {originalWorkflowStyles} from './styles.js';
import {createWorkflowPlayback} from './playback.js';
import {createWorkflowDialog} from './dialog.js';
let sequence=0;
const reduced=value=>typeof value==='function'?!!value():typeof value==='boolean'?value:!!value?.matches;
function createSurface(container,{preview=false,idPrefix}={}){
  const doc=container.ownerDocument,root=doc.createElement('div');root.className=preview?'ow-preview':'ow-player';
  const style=doc.createElement('style'),shell=doc.createElement('div'),screen=doc.createElement('div'),cursor=doc.createElementNS('http://www.w3.org/2000/svg','svg');
  style.textContent=originalWorkflowStyles;shell.className='ow-screen-shell';shell.dataset.playing='false';screen.dataset.originalScreen='';
  cursor.setAttribute('class','ow-cursor');cursor.setAttribute('aria-hidden','true');cursor.setAttribute('viewBox','0 0 20 27');cursor.innerHTML='<path d="M2 1v21l5-5 4 8 4-2-4-8h7Z" fill="#fff" stroke="#273844" stroke-width="1.5" stroke-linejoin="round"/>';
  root.appendChild(style);shell.appendChild(screen);shell.appendChild(cursor);root.appendChild(shell);
  let play=null,status=null;
  if(!preview){
    const controls=doc.createElement('div'),reset=doc.createElement('button');play=doc.createElement('button');status=doc.createElement('p');
    controls.className='ow-player-controls';play.type='button';play.dataset.originalPlay='';play.textContent='Pause loop';reset.type='button';reset.dataset.originalReset='';reset.textContent='Reset';
    status.className='ow-sr';status.dataset.originalStatus='';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    for(const element of [play,reset,status])controls.appendChild(element);root.appendChild(controls);
  }
  container.appendChild(root);let lastKey='',lastState=null,cursorVisible=false;
  function positionCursor(){
    if(!lastState||!cursorVisible)return;const target=screen.querySelector(`[data-ow-target="${lastState.cursorTarget}"]`);if(!target)return;
    const rect=target.getBoundingClientRect(),base=shell.getBoundingClientRect();
    cursor.style.transform=`translate(${Math.max(0,rect.left-base.left+shell.scrollLeft+Math.min(rect.width*.52,250))}px,${Math.max(0,rect.top-base.top+shell.scrollTop+rect.height*.55)}px)`;
  }
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(positionCursor):null;observer?.observe(shell);
  return {
    root,screen,shell,
    render(state,{playing=false,showCursor=true,focusKey=null}={}){
      lastState=state;shell.dataset.playing=String(playing);cursorVisible=showCursor;cursor.setAttribute('visibility',showCursor?'visible':'hidden');const key=JSON.stringify(state);
      if(key!==lastKey){lastKey=key;screen.innerHTML=renderWorkflowScreen(state,{preview,idPrefix});if(focusKey)screen.querySelector(`[data-ow-key="${focusKey}"]`)?.focus({preventScroll:true});}
      if(play){play.textContent=playing?'Pause loop':'Play loop';play.setAttribute('aria-pressed',String(playing));}
      if(status)status.textContent=state.notice||phaseDescription(state);positionCursor();
    },
    dispose(){observer?.disconnect();root.remove();},
  };
}
/** Read-only miniature: no clock, timers, imports or network work of its own. */
export function createOriginalWorkflowPreview({container}={}){
  if(!container?.ownerDocument)throw new TypeError('A DOM container is required.');
  const surface=createSurface(container,{preview:true,idPrefix:`ow-preview-${++sequence}`});
  surface.root.setAttribute('role','img');surface.root.setAttribute('aria-label','Original WEX workflow: select a missing-asset transaction, choose the vehicle, and save the link.');surface.render(createWorkflowState(),{playing:false,showCursor:false});
  let disposed=false;
  return {
    render(timeSeconds=0,{paused=false,reducedMotion=false}={}){if(disposed)return;const motion=reduced(reducedMotion);surface.render(sampleWorkflow(motion?0:timeSeconds),{playing:!paused&&!motion,showCursor:!motion});},
    dispose(){if(disposed)return;disposed=true;surface.dispose();},
  };
}
/** Local WEX sample state is separate from odometer and service history. */
export function createOriginalWorkflow({container,onOpen=()=>{},onClose=()=>{},reducedMotion}={}){
  if(!container?.ownerDocument)throw new TypeError('A DOM container is required.');
  const doc=container.ownerDocument,win=doc.defaultView||globalThis,preference=reducedMotion??win.matchMedia?.('(prefers-reduced-motion: reduce)');
  let disposed=false,state=createWorkflowState(),manual=false,player,surface;
  const dialog=createWorkflowDialog({container,onOpen(){onOpen();},onClose(){player?.pause();onClose();},onEscape(){if(state.view==='records')return false;act({type:'cancel'});return true;}});
  surface=createSurface(dialog.body,{idPrefix:`ow-modal-${++sequence}`});
  const getFocusKey=()=>surface.root.contains(doc.activeElement)?doc.activeElement?.dataset?.owKey:null;
  function render(focusKey=null){surface.render(state,{playing:!!player?.getState().playing,showCursor:!manual&&!reduced(preference),focusKey});}
  player=createWorkflowPlayback({duration:WORKFLOW_DURATION,requestFrame:win.requestAnimationFrame?.bind(win),cancelFrame:win.cancelAnimationFrame?.bind(win),now:()=>win.performance.now(),onTime(time,{playing}){if(!manual)state=sampleWorkflow(time);surface.render(state,{playing,showCursor:!manual&&!reduced(preference)});}});
  function act(action){
    manual=true;player.pause();const previous=state;state=reduceWorkflow(state,action);if(state===previous){render();return;}
    state={...state,phase:state.view==='picker'?'asset-picker':state.view==='asset'?(state.chosenAssetId?'asset-chosen':'asset-dialog'):state.links[state.selectedRecordId]?'linked':'unmatched'};
    const focusKey=action.type==='open-asset'?'picker-toggle':action.type==='open-picker'?'asset-TRK-104':action.type==='choose-asset'?'set-asset':action.type==='set-asset'?`record-${state.selectedRecordId}`:action.type==='cancel'?(state.view==='asset'?'picker-toggle':'asset-button'):getFocusKey();render(focusKey);
  }
  function click(event){
    const target=event.target.closest?.('[data-action],[data-original-play],[data-original-reset]');if(!target||!surface.root.contains(target)||target.disabled)return;
    if(target.hasAttribute('data-original-play')){if(player.getState().playing)player.pause();else if(manual){manual=false;player.restart({play:true});}else player.play();return;}
    if(target.hasAttribute('data-original-reset')){manual=true;state=createWorkflowState();player.restart();render('asset-button');return;}
    act({type:target.dataset.action,id:target.dataset.record||target.dataset.asset});
  }
  const visibility=()=>{if(doc.hidden)player.pause();};
  const motionChange=()=>{if(reduced(preference))player.pause();render();};
  surface.root.addEventListener('click',click);doc.addEventListener('visibilitychange',visibility);preference?.addEventListener?.('change',motionChange);render();
  return {
    element:dialog.element,get isOpen(){return dialog.isOpen;},
    getState:()=>({open:dialog.isOpen,manual,...player.getState(),workflow:structuredClone(state)}),
    open(options={}){if(disposed||dialog.isOpen)return;manual=false;state=createWorkflowState();dialog.open(options);player.restart({play:!reduced(preference)&&!doc.hidden});},
    close(options){dialog.close(options);},
    dispose(){if(disposed)return;disposed=true;player.dispose();surface.root.removeEventListener('click',click);doc.removeEventListener('visibilitychange',visibility);preference?.removeEventListener?.('change',motionChange);surface.dispose();dialog.dispose();},
  };
}
export {WORKFLOW_DURATION,assetLabel};
