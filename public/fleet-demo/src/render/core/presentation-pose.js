import {MODEL_REGISTRY} from './models.js';
import {SITES} from '../map/world.js';
export function modelGroundContact(kind='truck'){
 return Math.min(...(MODEL_REGISTRY[kind]||MODEL_REGISTRY.truck).map(([, ,height,,,z])=>z-height/2));
}
export function isNearFactory(vehicle){const f=SITES.find(s=>s.id==='centerpoint');return Math.hypot(Math.max(0,Math.abs(vehicle.x-f.x)-f.width/2),Math.max(0,Math.abs(vehicle.y-f.y)-f.depth/2))<=25;}
/** Visual scale never affects simulation. Near the workshop, authored-meter clearance wins. */
export function isInsideDepot(vehicle){
 const depot=SITES.find(s=>s.id==='depot');
 return vehicle.routeId==='depot-bay'||Math.abs(vehicle.x-depot.x)<=depot.width/2&&Math.abs(vehicle.y-depot.y)<=depot.depth/2;
}
export function vehiclePresentationPose(vehicle,roadScale=1,baySupportElevation=0){
 const parked=vehicle.routeId==='depot-bay'||/^(workshop|in-service|in-bay)$/i.test(vehicle.status||'');
 const scale=parked||isInsideDepot(vehicle)||isNearFactory(vehicle)||vehicle.routeId?.startsWith('cargo-')?1:roadScale;
 return {scale,z:parked?baySupportElevation-modelGroundContact(vehicle.model):.15};
}

/** Service tractors leave their trailers outside the workshop trip. */
export function vehicleModelVariant(vehicle){if(vehicle.model==='van')return'van';return vehicle.trailerAttached===false||['depot','depot-bay','factory-to-depot','depot-to-factory'].includes(vehicle.routeId)||/^(workshop|in-service|maintenance|in-bay)$/i.test(vehicle.status||'')?'tractor':'truck';}
