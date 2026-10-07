import {vehiclePresentationPose} from './presentation-pose.js';
export const VEHICLE_DETAIL_LIMIT=3;
export const VEHICLE_DETAIL_MIN_ZOOM=17.5;
/** Camera-dependent choice changes presentation only. Input order never decides identity. */
export function selectDetailedVehicles(vehicles,{zoom,center=[0,0],selectedId,modelMetadata={},limit=VEHICLE_DETAIL_LIMIT}={}){
 if(!(zoom>=VEHICLE_DETAIL_MIN_ZOOM))return[];
 const distance=v=>(v.x-center[0])**2+(v.y-center[1])**2;
 const radius=v=>{const b=modelMetadata[v.model||'truck']?.bounds;return b?Math.hypot(Math.max(Math.abs(b.min[0]),Math.abs(b.max[0])),Math.max(Math.abs(b.min[1]),Math.abs(b.max[1]))):0;};
 return vehicles.filter(v=>Number.isFinite(v.x)&&Number.isFinite(v.y)&&(v.id===selectedId||distance(v)<=(250+radius(v))**2)).slice().sort((a,b)=>(Number(b.id===selectedId)-Number(a.id===selectedId))||distance(a)-distance(b)||(a.id<b.id?-1:a.id>b.id?1:0)).slice(0,Math.max(0,Math.min(VEHICLE_DETAIL_LIMIT,limit)));
}
/** At most three owned models. Rebinding slots never changes the scene snapshot. */
export function createVehicleDetailPool({THREE,scene,createDetailedVehicle,modelMetadata={},onFailure=()=>{}}){
 const slots=[],failedKinds=new Set();let disposed=false,visible=0;
 function release(slot){scene.remove(slot.api.group);slot.api.dispose();}
 function create(kind){try{const api=createDetailedVehicle({THREE,kind});if(!api?.group||typeof api.setDistance!=='function'||typeof api.dispose!=='function')throw new Error('Invalid detailed vehicle adapter');scene.add(api.group);return api;}catch(error){failedKinds.add(kind);onFailure(error);return null;}}
 return{
  update(vehicles,options){
   if(disposed)return new Set();const desired=selectDetailedVehicles(vehicles,{...options,modelMetadata}),used=new Set(),ids=new Set();for(const slot of slots)slot.api.group.visible=false;
   for(const vehicle of desired){
    const kind=vehicle.model==='van'?'van':'truck';if(failedKinds.has(kind))continue;
    let slot=slots.find(s=>s.id===vehicle.id&&!used.has(s));
    if(!slot)slot=slots.find(s=>!used.has(s)&&!desired.some(v=>v.id===s.id));
    if(!slot&&slots.length<VEHICLE_DETAIL_LIMIT){const api=create(kind);if(!api)continue;slot={id:vehicle.id,kind,api};slots.push(slot);}
    if(!slot)continue;
    if(slot.kind!==kind){release(slot);const api=create(kind);if(!api){slots.splice(slots.indexOf(slot),1);continue;}slot.api=api;slot.kind=kind;}
    slot.id=vehicle.id;used.add(slot);const {group}=slot.api,pose=vehiclePresentationPose(vehicle,options.roadScale??1,options.baySupportElevation??0);
    group.position.set(vehicle.x,vehicle.y,pose.z);group.rotation.z=-(vehicle.heading||0);group.scale.setScalar(pose.scale);group.visible=true;
    slot.api.setDistance(Number.isFinite(vehicle.presentationDistanceMeters)?vehicle.presentationDistanceMeters/pose.scale:0);ids.add(vehicle.id);
   }
   visible=ids.size;return ids;
  },
  getMetrics(){return{capacity:slots.length,visible,limit:VEHICLE_DETAIL_LIMIT,failedKinds:[...failedKinds],models:slots.filter(s=>s.api.group.visible).map(s=>({id:s.id,kind:s.kind,bounds:modelMetadata[s.kind]?.bounds||null,groundContact:modelMetadata[s.kind]?.groundContact??null,distance:s.api.getDistance?.()??null}))};},
  dispose(){if(disposed)return;disposed=true;for(const slot of slots)release(slot);slots.length=0;visible=0;}
 };
}
