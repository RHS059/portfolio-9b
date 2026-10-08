import {indexStaticMeshGeometry} from './indexed-geometry.js';
import {vehiclePresentationPose,vehicleModelVariant} from './presentation-pose.js';
export const VEHICLE_DETAIL_LIMIT=3;
export const VEHICLE_DETAIL_MIN_ZOOM=17.5;
/** Camera-dependent choice changes presentation only. Input order never decides identity. */
export function selectDetailedVehicles(vehicles,{zoom,center=[0,0],selectedId,modelMetadata={},limit=VEHICLE_DETAIL_LIMIT}={}){
 if(!(zoom>=VEHICLE_DETAIL_MIN_ZOOM))return[];
 const distance=v=>(v.x-center[0])**2+(v.y-center[1])**2;
 const radius=v=>{const b=modelMetadata[vehicleModelVariant(v)]?.bounds;return b?Math.hypot(Math.max(Math.abs(b.min[0]),Math.abs(b.max[0])),Math.max(Math.abs(b.min[1]),Math.abs(b.max[1]))):0;};
 return vehicles.filter(v=>Number.isFinite(v.x)&&Number.isFinite(v.y)&&(v.id===selectedId||distance(v)<=(250+radius(v))**2)).slice().sort((a,b)=>(Number(b.id===selectedId)-Number(a.id===selectedId))||distance(a)-distance(b)||(a.id<b.id?-1:a.id>b.id?1:0)).slice(0,Math.max(0,Math.min(VEHICLE_DETAIL_LIMIT,limit)));
}
/** At most three owned models. Rebinding slots never changes the scene snapshot. */
export function createVehicleDetailPool({THREE,scene,createDetailedVehicle,createDetailedTractor,createDetailedTrailer,modelMetadata={},onFailure=()=>{}}){
 const slots=[],failedKinds=new Set();let disposed=false,visible=0;
 function release(slot){scene.remove(slot.api.group);slot.api.dispose();}
 function create(kind,variant){try{let api;if(variant==='articulated'&&createDetailedTractor&&createDetailedTrailer){const tractor=createDetailedTractor({THREE}),trailer=createDetailedTrailer({THREE,style:'flatbed'}),group=new THREE.Group();group.add(tractor.group,trailer.group);group.userData.wheelCount=18;api={group,tractor,trailer,setDistance(){},getDistance:()=>tractor.getDistance(),dispose(){tractor.dispose();trailer.dispose();}};}else api=createDetailedVehicle({THREE,kind,trailerAttached:variant!=='tractor'});if(!api?.group||typeof api.setDistance!=='function'||typeof api.dispose!=='function')throw new Error('Invalid detailed vehicle adapter');(api.group.userData??={}).geometryIndexing=indexStaticMeshGeometry(THREE,api.group);scene.add(api.group);return api;}catch(error){failedKinds.add(kind);onFailure(error);return null;}}
 return{
  update(vehicles,options){
   if(disposed)return new Set();const desired=selectDetailedVehicles(vehicles,{...options,modelMetadata}),used=new Set(),ids=new Set();for(const slot of slots)slot.api.group.visible=false;
   for(const vehicle of desired){
    const kind=vehicle.model==='van'?'van':'truck',variant=vehicle.rig?'articulated':vehicleModelVariant(vehicle);if(failedKinds.has(kind))continue;
    let slot=slots.find(s=>s.id===vehicle.id&&!used.has(s));
    if(!slot)slot=slots.find(s=>!used.has(s)&&!desired.some(v=>v.id===s.id));
    if(!slot&&slots.length<VEHICLE_DETAIL_LIMIT){const api=create(kind,variant);if(!api)continue;slot={id:vehicle.id,kind,variant,api};slots.push(slot);}
    if(!slot)continue;
    if(slot.kind!==kind||slot.variant!==variant){release(slot);const api=create(kind,variant);if(!api){slots.splice(slots.indexOf(slot),1);continue;}slot.api=api;slot.kind=kind;slot.variant=variant;}
    slot.id=vehicle.id;used.add(slot);const {group}=slot.api,pose=vehiclePresentationPose(vehicle,options.roadScale??1,options.baySupportElevation??0);
    if(slot.api.tractor&&vehicle.rig){group.position.set(0,0,0);group.rotation.z=0;group.scale.setScalar(1);group.visible=true;for(const key of ['tractor','trailer']){const part=slot.api[key],p=vehicle.rig[key];part.group.position.set(p.x,p.y,p.z);part.group.rotation.z=-p.heading;part.setDistance(vehicle.rig[`${key}Travel`]||0);}ids.add(vehicle.id);continue;}
    group.position.set(vehicle.x,vehicle.y,pose.z);group.rotation.z=-(vehicle.heading||0);group.scale.setScalar(pose.scale);group.visible=true;
    slot.api.setDistance(Number.isFinite(vehicle.presentationDistanceMeters)?vehicle.presentationDistanceMeters/pose.scale:0);ids.add(vehicle.id);
   }
   visible=ids.size;return ids;
  },
  getMetrics(){return{capacity:slots.length,visible,limit:VEHICLE_DETAIL_LIMIT,failedKinds:[...failedKinds],models:slots.filter(s=>s.api.group.visible).map(s=>({id:s.id,kind:s.kind,variant:s.variant,wheelCount:s.api.group.userData?.wheelCount??null,bounds:modelMetadata[s.variant]?.bounds||null,groundContact:modelMetadata[s.variant]?.groundContact??null,distance:s.api.getDistance?.()??null,geometryIndexing:s.api.group.userData.geometryIndexing??null}))};},
  dispose(){if(disposed)return;disposed=true;for(const slot of slots)release(slot);slots.length=0;visible=0;}
 };
}
