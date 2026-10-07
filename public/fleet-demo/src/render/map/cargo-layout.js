import {SITES,toLocal} from './world.js';
import {ROAD_ROUTE_LNGLAT} from './route-data.js';
import {CARGO_LAYOUT} from './cargo-layout-data.js';
import {OICT_GEOGRAPHY} from './oict-geography.js';
import {createPortLayout} from '../facilities/port/layout.js';
import {createCargoRoutes,trafficCircuitPhase,ORDINARY_TRAFFIC_SLOTS} from './cargo-routes.js';
export {CARGO_LAYOUT};
const port=SITES.find(s=>s.id==='oict'),factory=SITES.find(s=>s.id==='centerpoint');
const clamp=t=>Math.max(0,Math.min(1,Number.isFinite(t)?t:0));
export const localAt=(site,p)=>[site.x+p[0],site.y+p[1],p[2]??0];
export const rotateXY=(point,heading)=>[point[0]*Math.cos(heading)+point[1]*Math.sin(heading),-point[0]*Math.sin(heading)+point[1]*Math.cos(heading),point[2]??0];
export function offsetPose(pose,local){const d=rotateXY(local,pose.heading);return[pose.x+d[0],pose.y+d[1],(pose.z||0)+d[2]];}
export function polylineSample(points,progress=0){
 const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1])),total=lengths.reduce((a,b)=>a+b,0);let remaining=clamp(progress)*total;
 for(let i=0;i<lengths.length;i++)if(remaining<=lengths[i]||i===lengths.length-1){const a=points[i],b=points[i+1],t=lengths[i]?remaining/lengths[i]:0;return{x:a[0]+(b[0]-a[0])*t,y:a[1]+(b[1]-a[1])*t,z:(a[2]??.15)+((b[2]??.15)-(a[2]??.15))*t,heading:Math.atan2(b[0]-a[0],b[1]-a[1]),presentationDistanceMeters:clamp(progress)*total};}else remaining-=lengths[i];
 const p=points[0];return{x:p[0],y:p[1],z:p[2]??.15,heading:0,presentationDistanceMeters:0};
}
const truckSlots=new Map(CARGO_LAYOUT.slots.map((slot,i)=>[`CARGO-${401+i}`,slot]));
export const cargoSlot=actor=>CARGO_LAYOUT.slots.find(slot=>slot.id===actor.slotId)||truckSlots.get(actor.id);
const factoryPoint=(x,y,z=.15)=>localAt(factory,[x,y,z]);
const publicRoad=ROAD_ROUTE_LNGLAT.slice(0,-4).map(p=>[...toLocal(p),.15]);
const routes=new Map();
const portLayout=createPortLayout(OICT_GEOGRAPHY);
export const CARGO_ROUTE_CONFIGS=CARGO_LAYOUT.slots.map(slot=>({
 id:`CARGO-${401+CARGO_LAYOUT.slots.indexOf(slot)}`,
 portPose:(()=>{const p=localAt(port,slot.port.truckRoot);return{x:p[0],y:p[1],z:p[2],heading:slot.port.truckHeading};})(),
 bayPose:(()=>{const p=localAt(factory,slot.factory.truckRoot);return{x:p[0],y:p[1],z:p[2],heading:slot.factory.truckHeading};})(),
 roadPoints:publicRoad,portBoundary:{point:localAt(port,[...portLayout.origin,0]),landward:portLayout.landward},
 buildingBounds:{min:localAt(factory,CARGO_LAYOUT.factory.buildingBounds.min),max:localAt(factory,CARGO_LAYOUT.factory.buildingBounds.max)},
 obstacles:[{min:localAt(factory,[-123,-113,0]),max:localAt(factory,[-67,-85,8])}],
}));
const fleetRoad=publicRoad.slice(Math.floor(publicRoad.length/3));
for(let i=0;i<2;i++){const start=fleetRoad[0],next=fleetRoad[1];CARGO_ROUTE_CONFIGS.push({...CARGO_ROUTE_CONFIGS[i],id:`OUTBOUND-${501+i}`,portPose:{x:start[0],y:start[1],z:.15,heading:Math.atan2(next[0]-start[0],next[1]-start[1])},bayPose:{x:factory.x+[28,56][i],y:factory.y-56.5,z:.15,heading:Math.PI/2},roadPoints:fleetRoad,portBoundary:null});}
const ordinaryBase=CARGO_ROUTE_CONFIGS[0];CARGO_ROUTE_CONFIGS.push({...ordinaryBase,id:'ORDINARY-ROAD',portPose:{...ordinaryBase.portPose,x:ordinaryBase.portPose.x+portLayout.landward[0]*28,y:ordinaryBase.portPose.y+portLayout.landward[1]*28},bayPose:{...ordinaryBase.bayPose,x:factory.x+52,y:factory.y-68}});
for(const [i,base]of CARGO_ROUTE_CONFIGS.slice(0,4).entries())CARGO_ROUTE_CONFIGS.push({...base,id:`ORDINARY-ROAD-${base.id.slice(-3)}`,ordinaryTraffic:true,portPose:{...ordinaryBase.portPose,x:ordinaryBase.portPose.x+portLayout.landward[0]*60+portLayout.along[0]*(140+i*60),y:ordinaryBase.portPose.y+portLayout.landward[1]*60+portLayout.along[1]*(140+i*60)},bayPose:{x:factory.x+100,y:factory.y-90,z:.15,heading:Math.PI/2}});
CARGO_ROUTE_CONFIGS.push({...ordinaryBase,id:'ORDINARY-PREVIEW-208',portPose:{...ordinaryBase.portPose,x:ordinaryBase.portPose.x+portLayout.landward[0]*75,y:ordinaryBase.portPose.y+portLayout.landward[1]*75},bayPose:{x:factory.x+100,y:factory.y-90,z:.15,heading:Math.PI/2}});
export function cargoRouteSet(actor){const config=CARGO_ROUTE_CONFIGS.find(c=>c.id===actor.id);if(!config)return null;if(!routes.has(config.id))routes.set(config.id,createCargoRoutes(config));return routes.get(config.id);}
export function cargoTruckRoute(actor){return cargoRouteSet(actor)?.points(actor.routeId)||null;}
export function cargoTruckRig(actor){return cargoRouteSet(actor)?.sample(actor.routeId,actor.progress,actor.travelCycle??actor.cycleIndex??0)||null;}
export function ordinaryRoadRouteInfo({slotIndex=0,presentationOffsetSeconds=102.5}={}){const slot=ORDINARY_TRAFFIC_SLOTS[slotIndex]||ORDINARY_TRAFFIC_SLOTS[0],route=cargoRouteSet({id:slot.trafficRouteId}),timing=route.ordinaryTimetable,toApp=local=>(local+slot.carrierIndex*32+timing.leaderDelaySeconds-presentationOffsetSeconds+256)%128;return{trafficRouteId:slot.trafficRouteId,approachTimeSeconds:toApp(timing.approachLocalSeconds),stopTimeSeconds:toApp(timing.stopLocalSeconds),approachProgress:timing.approachLocalSeconds/128,circuitLengthMeters:route.length};}
export function roadTruckPosition(actor){if(Number.isFinite(actor.x)&&Number.isFinite(actor.y)||actor.routeId!=='delivery')return null;const rig=cargoRouteSet({id:actor.trafficRouteId||'ORDINARY-ROAD'}).sample(actor.trafficPhase||'cargo-circuit',actor.progress,actor.travelCycle||0),attached=actor.model!=='van'&&actor.trailerAttached!==false&&!/^(workshop|in-service|maintenance|in-bay)$/i.test(actor.status||'');return{...rig.tractor,...(attached?{rig,bodyStyle:'open-flatbed'}:{}),presentationDistanceMeters:rig.tractorTravel};}
export function cargoTruckPosition(actor){const rig=cargoTruckRig(actor);return rig?{...rig.tractor,rig,presentationDistanceMeters:rig.tractorTravel}:null;}
export function trailerLoadPose(rig,{outbound=false}={}){const p=offsetPose(rig.trailer,CARGO_LAYOUT.factory.flatbedCargoAnchorLocal);return{position:p,heading:rig.trailer.heading-CARGO_LAYOUT.factory.cargoYawRelative+(outbound?Math.PI:0)};}
export function staticCargoAnchors(){
 const anchors=new Map();
 CARGO_LAYOUT.slots.forEach((slot,i)=>{const n=String(i+1).padStart(2,'0'),a=slot.factory,cell=CARGO_LAYOUT.factory.workcells[i];
  anchors.set(`ship:${slot.shipId}:slot-${n}`,localAt(port,slot.port.shipCargo));anchors.set(`port:${slot.craneId}:transfer`,localAt(port,slot.port.transfer));anchors.set(`port:CARGO-${401+i}:park`,localAt(port,slot.port.truckRoot));
  for(const[key,p]of [['truck',a.truckRoot],['approach',a.approach],['handoff',a.handoff]])anchors.set(`bay:${a.bayId}:${key}`,localAt(factory,p));
  const actual=trailerLoadPose(cargoRouteSet({id:`CARGO-${401+i}`}).baySample);anchors.set(`bay:${a.bayId}:${slot.id}:handoff`,actual.position);anchors.set(`bay:${a.bayId}:handoff`,actual.position);
  anchors.set(`storage:${slot.id}`,localAt(factory,a.storage));anchors.set(`storage:${slot.id}:robot-park`,localAt(factory,a.robotPark));anchors.set(`bay:${a.bayId}:${slot.id}:forklift-park`,localAt(factory,[a.forkliftPark[0],a.forkliftPark[1]-1.65,.43]));anchors.set(`forklift:FORKLIFT-${n}:stowed-forks`,localAt(factory,[a.forkliftPark[0],a.forkliftPark[1]-1.65,.43]));
  const dx=[28,56][i%2];anchors.set(`bay:factory-dispatch-0${i%2+1}:vehicle`,factoryPoint(dx,-56.5));anchors.set(`qa:QA-01:${slot.id}:input`,factoryPoint(37,26,1.225));anchors.set(`dispatch:DISPATCH-0${i%2+1}:${slot.id}:staging`,factoryPoint(50+(i%2)*12,-16,1.225));anchors.set(`cell:${cell.id}:dispatch-pickup`,factoryPoint(cell.center[0]-3,cell.center[1]-4,1.225));
  anchors.set(`storage:${slot.id}:robot-pickup`,localAt(factory,[a.storage[0],a.storage[1]-1.8,1.225]));anchors.set(`qa:QA-01:${slot.id}:test`,factoryPoint(42,26,1.225));anchors.set(`qa:QA-01:${slot.id}:output`,factoryPoint(47,26,1.225));anchors.set(`dispatch:DISPATCH-0${i%2+1}:${slot.id}:input`,factoryPoint(50+(i%2)*12,-12,1.225));
  anchors.set(`cell:${cell.id}:receiving-dock`,factoryPoint(cell.input[0],cell.center[1]+4.9,1.225));anchors.set(`qa:QA-01:${slot.id}:bypass-in`,factoryPoint(37,21,1.225));anchors.set(`qa:QA-01:${slot.id}:bypass-out`,factoryPoint(47,21,1.225));
  anchors.set(`cell:${cell.id}:input`,localAt(factory,cell.input));anchors.set(`cell:${cell.id}:output`,localAt(factory,cell.output));
 });return anchors;
}
export function floorMotionPoints(actor,from,to){
 const slot=cargoSlot(actor),index=CARGO_LAYOUT.slots.indexOf(slot),cell=CARGO_LAYOUT.factory.workcells[index];if(!cell)return[from,to];
 const p=(x,y)=>factoryPoint(x,y,from[2]),west=cell.center[0]-8.5,rear=cell.center[1]+6.5;
 if(actor.stage==='carrying')return[from,p(from[0]-factory.x,from[1]-factory.y-1.2),p(from[0]-factory.x-4,from[1]-factory.y-1.2),p(from[0]-factory.x-4,-36),p(west,-36),p(west,rear),p(cell.input[0],rear),to];
 if(actor.stage==='returning')return[from,p(cell.input[0],rear),p(west,rear),p(west,-36),p(to[0]-factory.x-4,-36),p(to[0]-factory.x-4,to[1]-factory.y),to];
 if(actor.stage==='qa-transport')return[from,p(cell.center[0]-3,cell.center[1]-7),p(west,cell.center[1]-7),p(west,-15),p(30,-15),p(30,26),to];
 if(actor.stage==='output-returning'){const exitX=from[0]-factory.x+(index%2?3:-3);return[from,p(from[0]-factory.x,from[1]-factory.y+1.2),p(exitX,from[1]-factory.y+1.2),p(exitX,-36),p(to[0]-factory.x-4,-36),p(to[0]-factory.x-4,to[1]-factory.y),to];}
 if(actor.stage==='dispatch-transport')return index%2?[from,p(67,26),p(67,-12),to]:[from,p(48,26),p(48,21),p(30,21),p(30,-12),to];
 if(actor.stage==='output-approaching')return[from,p(from[0]-factory.x-4,from[1]-factory.y),p(from[0]-factory.x-4,-36),p(west,-36),p(west,cell.center[1]-7),p(cell.center[0]-3,cell.center[1]-7),to];
 return[from,to];
}
