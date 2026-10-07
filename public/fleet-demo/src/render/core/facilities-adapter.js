import {SITES} from '../map/world.js';
/** Place independently authored local-meter site groups exactly once.
 * The shared parent remains untransformed; nested meshes inherit one site transform.
 */
export function placeFacilityGroups(group){
 let placed=0;
 for(const child of group.children||[]){
  const id=child.userData?.siteId||child.name,site=SITES.find(s=>s.id===id);
  if(!site)continue;
  child.userData ||= {};
  if(!child.userData.fleetGeographicPlacement){child.position.x+=site.x;child.position.y+=site.y;child.userData.fleetGeographicPlacement={siteId:id,x:site.x,y:site.y};}
  placed++;
 }
 return placed;
}
/** Facility-authored surfaces, supplied with its bay contract (not the bay anchor z=0).
 * Rail box is 0.10m high at z=0.31m; workshop floor top is 0.25m.
 */
export const WORKSHOP_SURFACES=Object.freeze({floorTop:.25,railTop:.31+.10/2});
/** Prefer the actual assembled support mesh. The authored rail profile is the loading fallback. */
export function workshopSupportElevation(T,group){
 const depot=group.children?.find(child=>child.userData?.siteId==='depot'||child.name==='depot');
 const center=depot?.userData?.bayCenters?.[0];
 if(!depot||!center||!T.Raycaster)return WORKSHOP_SURFACES.railTop;
 group.updateMatrixWorld(true);
 const meshes=[];depot.traverse(object=>{if(object.isMesh)meshes.push(object);});
 const site=SITES.find(s=>s.id==='depot'),heights=[];
 for(const x of [-1.3,1.3])for(const y of [-6,5]){
   const ray=new T.Raycaster(new T.Vector3(site.x+center[0]+x,site.y+center[1]+y,1),new T.Vector3(0,0,-1),0,1.5);
   const hit=ray.intersectObjects(meshes,false).find(hit=>hit.point.z>=0&&hit.point.z<.8);
   if(hit)heights.push(hit.point.z);
 }
 return heights.length===4?Math.max(...heights):WORKSHOP_SURFACES.railTop;
}
/** Camera-only port detail choice. It cannot modify snapshots or operational outcomes. */
export function portDetailLevel(zoom,worldCenter){
 const port=SITES.find(s=>s.id==='oict'),x=worldCenter[0]-port.x,y=worldCenter[1]-port.y;
 return zoom>=16.2&&x>=-1130.295&&x<=1072.477&&y>=-446.578&&y<=1149.822?'detail':'overview';
}

/** Instanced geography sees the same projection reflection as vehicles. Keep both faces available. */
export function applyFacilityFacePolicy(T,group){group.traverse(object=>{if(object.isInstancedMesh)for(const material of Array.isArray(object.material)?object.material:[object.material]){material.side=T.DoubleSide;material.needsUpdate=true;}});}
