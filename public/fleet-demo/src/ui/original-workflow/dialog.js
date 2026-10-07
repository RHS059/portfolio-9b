let dialogSequence=0;
/** Native top-layer dialog with explicit focus, keyboard and route cleanup. */
export function createWorkflowDialog({container,onOpen=()=>{},onClose=()=>{},onEscape=()=>false}={}){
  if(!container?.ownerDocument)throw new TypeError('A connected DOM container is required.');
  const doc=container.ownerDocument,dialog=doc.createElement('dialog'),titleId=`original-workflow-title-${++dialogSequence}`;
  dialog.className='ow-dialog';dialog.setAttribute('data-original-workflow-dialog','');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby',titleId);
  const shell=doc.createElement('div'),header=doc.createElement('header'),heading=doc.createElement('div'),era=doc.createElement('span'),title=doc.createElement('h2'),closeButton=doc.createElement('button'),body=doc.createElement('div');
  shell.className='ow-dialog-shell';header.className='ow-modal-header';era.textContent='2019–2022';title.id=titleId;title.textContent='The original workflow';
  closeButton.type='button';closeButton.dataset.originalClose='';closeButton.setAttribute('aria-label','Close original workflow');closeButton.textContent='×';body.dataset.originalBody='';
  heading.appendChild(era);heading.appendChild(title);header.appendChild(heading);header.appendChild(closeButton);shell.appendChild(header);shell.appendChild(body);dialog.appendChild(shell);container.appendChild(dialog);
  let opened=false,disposed=false,returnFocus=null;
  const focusable=()=>[...dialog.querySelectorAll('button:not([disabled]),select:not([disabled]),input:not([disabled]),a[href],[tabindex="0"]')].filter(el=>!el.closest('[hidden],[inert]'));
  function finish({notify=true,restoreFocus=true}={}){if(!opened)return;opened=false;if(dialog.open)dialog.close();if(notify)onClose();if(restoreFocus&&returnFocus?.isConnected)returnFocus.focus({preventScroll:true});returnFocus=null;}
  function keydown(event){
    if(!opened)return;event.stopPropagation();
    if(event.key==='Escape'){event.preventDefault();if(!onEscape())finish();return;}
    if(event.key!=='Tab')return;const items=focusable(),first=items[0],last=items.at(-1);
    if(!first){event.preventDefault();dialog.focus();return;}
    if(event.shiftKey&&(doc.activeElement===first||!dialog.contains(doc.activeElement))){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&(doc.activeElement===last||!dialog.contains(doc.activeElement))){event.preventDefault();first.focus();}
  }
  const cancel=event=>{event.preventDefault();if(!onEscape())finish();};
  const nativeClose=()=>finish();
  const click=event=>{if(event.target===dialog||event.target.closest?.('[data-original-close]'))finish();};
  dialog.addEventListener('keydown',keydown);dialog.addEventListener('cancel',cancel);dialog.addEventListener('close',nativeClose);dialog.addEventListener('click',click);
  return {
    element:dialog,body,get isOpen(){return opened;},
    open(options={}){if(disposed||opened)return;returnFocus=options.returnFocus||doc.activeElement;dialog.showModal();opened=true;onOpen();closeButton.focus({preventScroll:true});},
    close:options=>finish(options),
    dispose(){if(disposed)return;disposed=true;finish({notify:false,restoreFocus:false});dialog.removeEventListener('keydown',keydown);dialog.removeEventListener('cancel',cancel);dialog.removeEventListener('close',nativeClose);dialog.removeEventListener('click',click);dialog.remove();},
  };
}
