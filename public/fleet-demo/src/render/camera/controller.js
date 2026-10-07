import { toLngLat,SITES } from '../map/world.js';
export const VIEW_PRESETS=Object.freeze({iso:{pitch:52,bearing:-28},'3d':{pitch:65,bearing:-16},'2d':{pitch:0,bearing:0}});
export function motionDuration(milliseconds,reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||false){return reduced?0:milliseconds;}
export function viewportZoom(base,width=800,height=600){return base+Math.min(0,Math.log2(Math.max(200,width)/800),Math.log2(Math.max(200,height)/600));}
export function occupiedTopClearance(scene,obstacle){return obstacle&&obstacle.width>0&&obstacle.height>0&&obstacle.bottom>scene.top&&obstacle.top<scene.bottom&&obstacle.right>scene.left&&obstacle.left<scene.right?Math.max(12,obstacle.bottom-scene.top+12):12;}
export function captureMapView(map){if(!map)return null;const center=map.getCenter();return{center:center.toArray?center.toArray():[center.lng,center.lat],zoom:map.getZoom(),pitch:map.getPitch(),bearing:map.getBearing()};}
export function createCameraController(getMap){
  let mode='iso',focus=null,follow=false,last=0,pendingFocus=false,pendingOrientation=null,manual=false;
  function setFocus(id,animate=true,orientation=null){
    focus=id;manual=false;pendingFocus=!!id;pendingOrientation=orientation;const site=SITES.find(s=>s.id===id),map=getMap();
    if(!site)return;
    pendingFocus=false;if(!map)return;
    const duration=animate?motionDuration(650):0;
    if(site.focusBounds&&map.fitBounds){map.fitBounds(site.focusBounds,{padding:{top:130,bottom:90,left:40,right:40},maxZoom:16,bearing:VIEW_PRESETS[mode].bearing,...orientation,duration});return;}
    const rect=map.getContainer?.().getBoundingClientRect();
    map.easeTo({...orientation,center:toLngLat([site.focusX??site.x,site.focusY??site.y]),zoom:viewportZoom(site.focusZoom||17.4,rect?.width,rect?.height),duration});
  }
  return {
    setView(next,{focusId,animate=true}={}){if(!VIEW_PRESETS[next])return;mode=next;if(typeof focusId==='string')setFocus(focusId,animate,VIEW_PRESETS[next]);else getMap()?.easeTo({...VIEW_PRESETS[next],duration:animate?motionDuration(450):0});},
    setFocus,
    setFollow(value){follow=!!value;},
    markManual(){manual=true;pendingOrientation=null;},
    resize(){if(!manual&&SITES.some(s=>s.id===focus))setFocus(focus,false);},
    update(entities,now){if(!focus||!getMap())return;const v=entities.find(v=>v.id===focus);if(!v)return;if(pendingFocus){pendingFocus=false;getMap()?.easeTo({...pendingOrientation,center:toLngLat([v.x,v.y]),zoom:viewportZoom(18.3,getMap()?.getContainer?.().getBoundingClientRect().width,getMap()?.getContainer?.().getBoundingClientRect().height),duration:motionDuration(550)});pendingOrientation=null;}if(follow&&now-last>=80){last=now;getMap()?.jumpTo({center:toLngLat([v.x,v.y])});}},
    get(){return {mode,focus,follow,manual};}
  };
}
