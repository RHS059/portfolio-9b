import { toLngLat,SITES } from '../map/world.js';
export const VIEW_PRESETS=Object.freeze({iso:{pitch:52,bearing:-28},'3d':{pitch:65,bearing:-16},'2d':{pitch:0,bearing:0}});
export function motionDuration(milliseconds,reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||false){return reduced?0:milliseconds;}
export function viewportZoom(base,width=800,height=600){return base+Math.min(0,Math.log2(Math.max(200,width)/800),Math.log2(Math.max(200,height)/600));}
export function occupiedTopClearance(scene,obstacle){return obstacle&&obstacle.width>0&&obstacle.height>0&&obstacle.bottom>scene.top&&obstacle.top<scene.bottom&&obstacle.right>scene.left&&obstacle.left<scene.right?Math.max(12,obstacle.bottom-scene.top+12):12;}
export function captureMapView(map){if(!map)return null;const center=map.getCenter();return{center:center.toArray?center.toArray():[center.lng,center.lat],zoom:map.getZoom(),pitch:map.getPitch(),bearing:map.getBearing()};}
const FOLLOW_RESPONSE_MS=120;
export const CAMERA_TRANSITION_MS=700;
export function cameraEase(value){const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);}
// Integrate a linearly moving target exactly, so damping is independent of RAF cadence.
function smoothFollow(center,previous,target,elapsed){
  const alpha=-Math.expm1(-elapsed/FOLLOW_RESPONSE_MS),travel=1-FOLLOW_RESPONSE_MS*alpha/elapsed;
  return center.map((value,i)=>value+(previous[i]-value)*alpha+(target[i]-previous[i])*travel);
}
export function createCameraController(getMap){
  const reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  let mode='iso',focus=null,follow=false,last=null,pendingFocus=false,pendingOrientation=null,pendingAnimate=true,pendingZoom=true,pendingDuration=CAMERA_TRANSITION_MS,manual=false,lastPosition=null,followCenter=null,lastPose=null,transition=null;
  function resetFollow(){last=null;lastPosition=null;followCenter=null;lastPose=null;}
  function cancelTransition(){transition=null;getMap()?.stop?.();}
  function currentView(map){return ['getCenter','getZoom','getPitch','getBearing'].every(key=>typeof map[key]==='function')?captureMapView(map):null;}
  function drawTransition(map,now){
    if(!transition)return false;
    // A rebuilt map starts from its saved view, never the stale pre-loss start pose.
    if(transition.map!==map){const from=currentView(map);if(!from){transition=null;return false;}transition={...transition,map,from,start:now,duration:Math.max(0,transition.duration-(transition.last-transition.start))};}
    transition.last=now;
    const {from,target,start,duration}=transition,t=reducedMotion?.matches||duration===0?1:Math.max(0,Math.min(1,(now-start)/duration)),weight=cameraEase(t),center=toLngLat(followCenter);
    const bearingDelta=((target.bearing-from.bearing+540)%360)-180;
    map.jumpTo(t===1?{...target,center}:{center:from.center.map((value,i)=>value+(center[i]-value)*weight),zoom:from.zoom+(target.zoom-from.zoom)*weight,pitch:from.pitch+(target.pitch-from.pitch)*weight,bearing:from.bearing+bearingDelta*weight});
    if(t===1)transition=null;
    return true;
  }
  function setFocus(id,animate=true,orientation=null){
    cancelTransition();focus=id;manual=false;pendingFocus=!!id;resetFollow();pendingOrientation=orientation;pendingAnimate=animate;pendingZoom=true;pendingDuration=CAMERA_TRANSITION_MS;const site=SITES.find(s=>s.id===id),map=getMap();
    if(!site)return;
    pendingFocus=false;if(!map)return;
    const duration=animate?motionDuration(CAMERA_TRANSITION_MS):0;
    if(site.focusBounds&&map.fitBounds){map.fitBounds(site.focusBounds,{padding:{top:130,bottom:90,left:40,right:40},maxZoom:16,bearing:VIEW_PRESETS[mode].bearing,...orientation,duration,easing:cameraEase,linear:true});return;}
    const rect=map.getContainer?.().getBoundingClientRect();
    map.easeTo({...orientation,center:toLngLat([site.focusX??site.x,site.focusY??site.y]),zoom:viewportZoom(site.focusZoom||17.4,rect?.width,rect?.height),duration,easing:cameraEase});
  }
  return {
    setView(next,{focusId,animate=true}={}){
      if(!VIEW_PRESETS[next])return;mode=next;
      if(typeof focusId==='string'){setFocus(focusId,animate,VIEW_PRESETS[next]);return;}
      cancelTransition();
      if((follow&&!manual||pendingFocus)&&focus&&!SITES.some(s=>s.id===focus)){pendingFocus=true;pendingOrientation=VIEW_PRESETS[next];pendingAnimate=animate;pendingZoom=false;pendingDuration=450;return;}
      getMap()?.easeTo({...VIEW_PRESETS[next],duration:animate?motionDuration(450):0,easing:cameraEase});
    },
    setFocus,
    setFollow(value){const next=!!value,changed=follow!==next||(manual&&next);if(changed||!next)cancelTransition();if(changed)resetFollow();follow=next;if(follow)manual=false;else{pendingFocus=false;pendingOrientation=null;}},
    markManual(){cancelTransition();manual=true;pendingFocus=false;pendingOrientation=null;},
    resize(){if(!manual&&SITES.some(s=>s.id===focus))setFocus(focus,false);},
    update(entities,now){
      const map=getMap();if(!focus||!map||manual||!Number.isFinite(now))return;
      const v=entities.find(v=>v.id===focus);
      if(!v||!Number.isFinite(v.x)||!Number.isFinite(v.y)){transition=null;resetFollow();return;}
      const position=[v.x,v.y];
      if(pendingFocus){
        pendingFocus=false;const rect=map.getContainer?.().getBoundingClientRect(),from=currentView(map),duration=pendingAnimate?motionDuration(pendingDuration):0;
        const target={...pendingOrientation,center:toLngLat(position),zoom:!pendingZoom&&from?from.zoom:viewportZoom(18.3,rect?.width,rect?.height)};
        pendingOrientation=null;last=now;lastPosition=position;followCenter=position;lastPose={...v};
        if(follow&&duration&&from){transition={map,from,target:{...from,...target},start:now,last:now,duration};drawTransition(map,now);}
        else if(follow)map.jumpTo(target);else map.easeTo({...target,duration,easing:cameraEase});
        return;
      }
      if(!follow)return;
      const elapsed=last===null?0:now-last;last=now;
      // A held/paused pose must leave both map and overlay idle, including after recovery.
      if(lastPosition&&lastPosition[0]===v.x&&lastPosition[1]===v.y){lastPose={...v};drawTransition(map,now);return;}
      const discontinuity=!lastPosition||!followCenter||elapsed<=0||elapsed>250||
        v.routeId!==lastPose?.routeId||v.trafficRouteId!==lastPose?.trafficRouteId||v.trafficPhase!==lastPose?.trafficPhase||
        (Number.isFinite(v.progress)&&Number.isFinite(lastPose?.progress)&&(v.progress<lastPose.progress||Math.abs(v.progress-lastPose.progress)>.25))||
        (lastPosition&&Math.hypot(v.x-lastPosition[0],v.y-lastPosition[1])>100);
      followCenter=discontinuity||reducedMotion?.matches?position:smoothFollow(followCenter,lastPosition,position,elapsed);
      lastPosition=position;lastPose={...v};if(!drawTransition(map,now))map.jumpTo({center:toLngLat(followCenter)});
    },
    get(){return {mode,focus,follow,manual,transitioning:!!transition};}
  };
}
