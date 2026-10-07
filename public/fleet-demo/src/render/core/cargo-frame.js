import {sampleIncomingForkTransfer} from '../map/fork-transfer.js';
import {forkContactOffset,FORK_CONTACT} from './fork-contact.js';
import {sampleFloorRoute} from '../map/floor-routes.js';
import {CARGO_LAYOUT,staticCargoAnchors,cargoTruckRig,cargoRouteSet,trailerLoadPose,localAt,offsetPose,polylineSample,floorMotionPoints} from '../map/cargo-layout.js';
import {SITES} from '../map/world.js';
import {samplePortTransfer} from '../facilities/port/process-motion.js';
const factory=SITES.find(s=>s.id==='centerpoint'),port=SITES.find(s=>s.id==='oict');
const clamp=p=>Math.max(0,Math.min(1,Number.isFinite(p)?p:0)),mix=(a,b,t)=>a+(b-a)*t;
const yaw=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
const pose=(position,heading=0)=>({position,heading});
let base;
/** CPU-only transform adapter. Ownership and progress come exclusively from the snapshot. */
export function resolveCargoFrame(process,{mounts=[],outputHandoffs={}}={}){
 if(!process)return {actors:[],cargo:[],products:[],trucks:[],bindings:[],errors:[]};
 if(!base)base=staticCargoAnchors();const anchors=new Map([...base].map(([id,p])=>[id,pose(p)])),errors=[],trucks=[];
 for(const slot of CARGO_LAYOUT.slots){const index=CARGO_LAYOUT.slots.indexOf(slot);anchors.set(`ship:${slot.shipId}:slot-${String(index+1).padStart(2,'0')}`,pose(localAt(port,slot.port.shipCargo),-slot.port.cargoRotationZ));anchors.set(`port:${slot.craneId}:transfer`,pose(localAt(port,slot.port.transfer),-slot.port.cargoRotationZ));}
 for(const mount of mounts)if(mount?.id&&Array.isArray(mount.position))anchors.set(mount.id,pose(mount.position,mount.heading||0));
 for(const truck of [...process.trucks,...process.outboundVehicles]){const rig=cargoTruckRig(truck);if(!rig){errors.push(`Unresolved vehicle route: ${truck.id}/${truck.routeId}`);continue;}const load=trailerLoadPose(rig,{outbound:truck.id.startsWith('OUTBOUND-')}),item={...truck,rig,load};trucks.push(item);anchors.set(`trailer:${truck.trailerId}:load`,load);if(truck.id.startsWith('OUTBOUND-'))anchors.set(`fleet:outgoing-fleet:${truck.id}:handoff`,trailerLoadPose(cargoRouteSet(truck).sample('cargo-dispatch-outbound',1),{outbound:true}));}
 for(const slot of CARGO_LAYOUT.slots){const i=CARGO_LAYOUT.slots.indexOf(slot),id=CARGO_LAYOUT.factory.workcells[i].id,key=`cell:${id}:output`,actual=anchors.get(`cell:${id}:carrier-output`);if(actual)anchors.set(key,actual);else{const p=anchors.get(key);anchors.set(key,pose([p.position[0],p.position[1],p.position[2]-.17],p.heading));}}
 const slotFor=actor=>CARGO_LAYOUT.slots.find(s=>s.id===actor.slotId);
 const cargoFor=actor=>process.cargo.find(c=>c.id===actor.cargoId);
 const get=(id,actor)=>{const slot=slotFor(actor);if(slot&&id===`bay:${slot.factory.bayId}:handoff`){const truck=trucks.find(t=>t.slotId===slot.id);if(truck)return trailerLoadPose(cargoRouteSet(truck).baySample);}return anchors.get(id);};
 const motion=(actor)=>{const a=get(actor.motion?.fromAnchorId,actor),b=get(actor.motion?.toAnchorId,actor);if(!a||!b){errors.push(`Unresolved anchor: ${actor.id}`);return null;}return{a,b,t:clamp(actor.motion.progress)};};
 const actors=[];
 for(const actor of process.forklifts){const m=motion(actor);if(!m)continue;const {a,b,t}=m,slot=slotFor(actor),outgoing=actor.flow==='outgoing';let supportZ;
  if(actor.forkHeightMode==='anchors'){const fa=get(actor.forkSupportMotion?.fromAnchorId,actor),fb=get(actor.forkSupportMotion?.toAnchorId,actor);supportZ=fa&&fb?mix(fa.position[2],fb.position[2],clamp(actor.forkSupportMotion.progress)):factory.z||.43;}else supportZ=.25+(actor.forkHeight||.18);
  // A smooth side pickup backs away from the trailer. Its tangent is north at both ends.
  const reverse=actor.stage==='carrying',dy=b.position[1]-a.position[1],bend=Math.min(6,Math.abs(dy)/3),u=1-t;
  let x=mix(a.position[0],b.position[0],3*t*t-2*t*t*t),y=reverse?u*u*u*a.position[1]+3*u*u*t*(a.position[1]+bend)+3*u*t*t*(b.position[1]-bend)+t*t*t*b.position[1]:mix(a.position[1],b.position[1],t);
  if(actor.stage==='returning'){const points=[a.position,[a.position[0],a.position[1]+4,a.position[2]],[b.position[0],a.position[1]+4,b.position[2]],b.position],q=polylineSample(points,t);x=q.x;y=q.y;}
  if(actor.stage==='outbound-loading'){const u=clamp(t/.7);x=mix(a.position[0],b.position[0],u*u*(3-2*u));y=mix(a.position[1],b.position[1],t*t*(3-2*t));}
  if(actor.stage==='dispatch-returning'){const q=polylineSample([a.position,[a.position[0],factory.y-38,a.position[2]],[b.position[0],factory.y-38,b.position[2]],b.position],t);x=q.x;y=q.y;}
  const dx=(b.position[0]-a.position[0])*6*t*(1-t),ddy=reverse?3*u*u*bend+6*u*t*(dy-2*bend)+3*t*t*bend:dy;
  let heading=reverse?Math.atan2(dx,ddy)+Math.PI:Math.PI;
  let payloadHeading=reverse?yaw(a.heading,b.heading,t)+(heading-Math.PI):yaw(a.heading,b.heading,t);
  let travelMeters=Math.hypot(b.position[0]-a.position[0],dy)*t*(reverse?-1:1);
  if(actor.stage==='approaching')heading=Math.PI+yaw(a.heading,b.heading,t);
  if(reverse){const transfer=sampleIncomingForkTransfer(a,b,t);x=transfer.x;y=transfer.y;heading=transfer.heading;payloadHeading=transfer.payloadHeading;travelMeters=transfer.travelMeters;}
  if(actor.stage==='dispatch-approaching')heading=Math.PI*(1-t*t*(3-2*t));
  if(actor.stage==='outbound-loading'){heading=Math.PI*t*t*(3-2*t);payloadHeading=heading+yaw(a.heading,b.heading-Math.PI,t);}
  const support=[x,y,supportZ],root=[x-1.65*Math.sin(heading),y-1.65*Math.cos(heading),.25];
  const result={...actor,kind:'forklift',position:root,heading,support:pose(support,payloadHeading),forkContactOffset:forkContactOffset(actor),liftHeight:supportZ-.25+forkContactOffset(actor)-FORK_CONTACT.tineTopLocalZ,travelMeters};actors.push(result);anchors.set(`forklift:${actor.id}:stowed-forks`,pose([root[0],root[1],.43]));
 }
 for(const actor of process.floorRobots){const m=motion(actor);if(!m)continue;const points=floorMotionPoints(actor,m.a.position,m.b.position),p=sampleFloorRoute(points,m.t);actors.push({...actor,kind:'amr',position:[p.x,p.y,.25],heading:p.heading,support:pose([p.x,p.y,1.225],p.heading+yaw(m.a.heading,m.b.heading,m.t)),travelMeters:p.presentationDistanceMeters});}
 const resolveMaterial=(item,product=false)=>{if(!item?.owner||item.attachment?.parentId!==item.owner.id){errors.push(`Invalid custody: ${item?.id}`);return null;}let p;
  if(item.owner.kind==='forklift'||item.owner.kind==='floor-robot'){const actor=actors.find(a=>a.id===item.owner.id);p=actor?.support;}
  else if(item.owner.kind==='crane'){const m=motion(item);if(m){const position=samplePortTransfer(m.a.position,m.b.position,m.t);p=pose(position,yaw(m.a.heading,m.b.heading,m.t));}}
  else if(product&&item.stage==='ready'){const handoff=outputHandoffs[item.cellId];if(handoff?.contactAccepted&&handoff.position)p=pose(handoff.position,0);else{const m=motion(item);if(m)p=pose(m.a.position.map((v,i)=>mix(v,m.b.position[i],m.t)),yaw(m.a.heading,m.b.heading,m.t));}}
  else if(item.motion?.fromAnchorId!==item.motion?.toAnchorId){const m=motion(item);if(m)p=pose(m.a.position.map((v,i)=>mix(v,m.b.position[i],m.t)),yaw(m.a.heading,m.b.heading,m.t));}
  else p=get(item.motion?.toAnchorId||item.owner.anchorId,item);
  if(!p){errors.push(`Missing custody mount: ${item.id}/${item.owner.anchorId}`);return null;}
  return{...item,position:p.position,heading:p.heading,parentId:item.owner.id,bindingStatus:'bound',visible:item.visible!==false&&item.owner.kind!=='consumed'&&item.owner.kind!=='fleet'};
 };
 const cargo=process.cargo.map(c=>resolveMaterial(c)).filter(Boolean),products=process.products.map(p=>resolveMaterial(p,true)).filter(Boolean),bindings=[];
 CARGO_LAYOUT.slots.forEach((slot,i)=>{const number=String(i+1).padStart(2,'0');for(const [id,parentId,ownerKind]of[[`ship:${slot.shipId}:slot-${number}`,slot.shipId,'ship'],[`port:${slot.craneId}:transfer`,slot.craneId,'crane'],[`trailer:TRAILER-${401+i}:load`,`TRAILER-${401+i}`,'trailer']]){const p=anchors.get(id);if(p)bindings.push({id,parentId,ownerKind,berthIndex:slot.port.berthIndex,position:[p.position[0]-port.x,p.position[1]-port.y,p.position[2]],rotationZ:-p.heading});}});
 return{actors,cargo,products,trucks,bindings,errors};
}
