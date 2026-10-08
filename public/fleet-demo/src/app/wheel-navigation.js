/** Keep map zoom available while the pointer rests on an interactive scene label. */
export function forwardSceneLabelWheel(event, canvasContainer, WheelEventClass=globalThis.WheelEvent) {
  if(event.defaultPrevented || !event.target?.closest?.('.fleet-scene-label') || !canvasContainer || typeof WheelEventClass!=='function')return false;
  const forwarded=new WheelEventClass('wheel',{
    bubbles:true,cancelable:true,composed:true,
    deltaX:event.deltaX,deltaY:event.deltaY,deltaZ:event.deltaZ,deltaMode:event.deltaMode,
    clientX:event.clientX,clientY:event.clientY,screenX:event.screenX,screenY:event.screenY,
    ctrlKey:event.ctrlKey,shiftKey:event.shiftKey,altKey:event.altKey,metaKey:event.metaKey,
  });
  event.preventDefault();
  canvasContainer.dispatchEvent(forwarded);
  return true;
}
