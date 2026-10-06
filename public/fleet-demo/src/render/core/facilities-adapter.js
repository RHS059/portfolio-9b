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
