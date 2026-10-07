import {DETAIL_MODEL_METADATA} from '../vehicles/detail-model.js';
/** Instance slots are transient. IDs, including the selected ID, are not. */
export class EntityRegistry {
  constructor(){this.ids=[];this.byId=new Map();this.selectedId=null;}
  sync(entities){this.ids=entities.map(v=>v.id);this.byId=new Map(entities.map((v,i)=>[v.id,{entity:v,index:i}]));}
  select(id){this.selectedId=id||null;}
  idAt(index){return this.ids[index]??null;}
  selected(){return this.byId.get(this.selectedId)?.entity??null;}
  clear(){this.ids=[];this.byId.clear();this.selectedId=null;}
}
export function pickNearest(point, entities, project, maxDistance=24) {
  let best=null,distance=maxDistance;
  for(const entity of entities){if(entity.inspectable===false)continue;const p=project(entity);if(!p)continue;const d=Math.hypot(point.x-p.x,point.y-p.y);if(d<distance){best=entity.id;distance=d;}}
  return best;
}
/** Cull the whole articulated envelope; a visible trailer must survive an offscreen tractor root. */
export function cullProjected(entities,project,width,height,padding=80){return entities.filter(v=>{
 const points=[];
 if(v.rig){for(const [key,kind]of[['tractor','tractor'],['trailer','flatbedTrailer']]){const pose=v.rig[key],bounds=DETAIL_MODEL_METADATA[kind].bounds;if(!pose)continue;const c=Math.cos(pose.heading||0),s=Math.sin(pose.heading||0),scale=pose.scale||1;for(const x of[bounds.min[0],bounds.max[0]])for(const y of[bounds.min[1],bounds.max[1]])for(const z of[bounds.min[2],bounds.max[2]]){const p=project({...pose,x:pose.x+(x*c+y*s)*scale,y:pose.y+(-x*s+y*c)*scale,z:(pose.z||0)+z*scale});if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y))points.push(p);}}}
 else{const p=project(v);if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y))points.push(p);}
 if(!points.length)return false;return Math.max(...points.map(p=>p.x))>=-padding&&Math.max(...points.map(p=>p.y))>=-padding&&Math.min(...points.map(p=>p.x))<=width+padding&&Math.min(...points.map(p=>p.y))<=height+padding;
 });}

/** Facility inspection is local camera/selection state; unchanged 20Hz snapshots cannot erase it. */
export class InspectionSelection {
  constructor(facilityIds=[]){this.facilityIds=new Set(facilityIds);this.snapshotId=null;this.override=null;this.id=null;}
  update(snapshotId){if(snapshotId!==this.snapshotId)this.override=null;this.snapshotId=snapshotId;this.id=this.override||snapshotId;return this.id;}
  focus(id){this.override=this.facilityIds.has(id)?id:null;this.id=id;return this.id;}
}
