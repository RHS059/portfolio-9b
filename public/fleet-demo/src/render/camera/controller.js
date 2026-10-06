import { toLngLat,SITES } from '../map/world.js';
export const VIEW_PRESETS=Object.freeze({iso:{pitch:52,bearing:-28},'3d':{pitch:65,bearing:-16},'2d':{pitch:0,bearing:0}});
export function createCameraController(getMap){
  let mode='iso',focus=null,follow=false,last=0,pendingFocus=false;
  return {
    setView(next){if(!VIEW_PRESETS[next])return;mode=next;getMap()?.easeTo({...VIEW_PRESETS[next],duration:450});},
    setFocus(id){if(id===focus)return;focus=id;pendingFocus=!!id;const s=SITES.find(s=>s.id===id);if(s){pendingFocus=false;getMap()?.easeTo({center:toLngLat([s.x,s.y]),zoom:17.4,duration:650});}},
    setFollow(value){follow=!!value;},
    update(entities,now){if(!focus)return;const v=entities.find(v=>v.id===focus);if(!v)return;if(pendingFocus){pendingFocus=false;getMap()?.easeTo({center:toLngLat([v.x,v.y]),zoom:16.6,duration:550});}if(follow&&now-last>=80){last=now;getMap()?.jumpTo({center:toLngLat([v.x,v.y])});}},
    get(){return {mode,focus,follow};}
  };
}
