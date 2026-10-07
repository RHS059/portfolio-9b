import { toLngLat,SITES } from '../map/world.js';
export const VIEW_PRESETS=Object.freeze({iso:{pitch:52,bearing:-28},'3d':{pitch:65,bearing:-16},'2d':{pitch:0,bearing:0}});
export function motionDuration(milliseconds,reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||false){return reduced?0:milliseconds;}
export function viewportZoom(base,width=800,height=600){return base+Math.min(0,Math.log2(Math.max(200,width)/800),Math.log2(Math.max(200,height)/600));}
export function captureMapView(map){if(!map)return null;const center=map.getCenter();return{center:center.toArray?center.toArray():[center.lng,center.lat],zoom:map.getZoom(),pitch:map.getPitch(),bearing:map.getBearing()};}
export function createCameraController(getMap){
  let mode='iso',focus=null,follow=false,last=0,pendingFocus=false,manual=false;
  function setFocus(id,animate=true){
    focus=id;manual=false;pendingFocus=!!id;const site=SITES.find(s=>s.id===id),map=getMap();
    if(!site)return;
    pendingFocus=false;if(!map)return;
    const duration=animate?motionDuration(650):0;
    if(site.focusBounds&&map.fitBounds){map.fitBounds(site.focusBounds,{padding:{top:130,bottom:90,left:40,right:40},maxZoom:16,bearing:VIEW_PRESETS[mode].bearing,duration});return;}
    const rect=map.getContainer?.().getBoundingClientRect();
    map.easeTo({center:toLngLat([site.focusX??site.x,site.focusY??site.y]),zoom:viewportZoom(site.focusZoom||17.4,rect?.width,rect?.height),duration});
  }
  return {
    setView(next){if(!VIEW_PRESETS[next])return;mode=next;getMap()?.easeTo({...VIEW_PRESETS[next],duration:motionDuration(450)});},
    setFocus,
    setFollow(value){follow=!!value;},
    markManual(){manual=true;},
    resize(){if(!manual&&SITES.some(s=>s.id===focus))setFocus(focus,false);},
    update(entities,now){if(!focus||!getMap())return;const v=entities.find(v=>v.id===focus);if(!v)return;if(pendingFocus){pendingFocus=false;getMap()?.easeTo({center:toLngLat([v.x,v.y]),zoom:16.6,duration:motionDuration(550)});}if(follow&&now-last>=80){last=now;getMap()?.jumpTo({center:toLngLat([v.x,v.y])});}},
    get(){return {mode,focus,follow,manual};}
  };
}
