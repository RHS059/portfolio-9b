import test from 'node:test';
import assert from 'node:assert/strict';
import {createCargoRoutes,cargoFootprints,cargoIntersectsBounds} from '../../src/render/map/cargo-routes.js';
import {ROAD_ROUTE_LNGLAT} from '../../src/render/map/route-data.js';
import {SITES,toLocal} from '../../src/render/map/world.js';
import {CARGO_LAYOUT} from '../../src/render/map/cargo-layout-data.js';
import {createPortLayout} from '../../src/render/facilities/port/layout.js';
import {OICT_GEOGRAPHY} from '../../src/render/map/oict-geography.js';
import {TRACTOR_TRAILER_ANCHORS,FLATBED_CARGO_METADATA} from '../../src/render/vehicles/detail-model.js';
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const factory=SITES.find(s=>s.id==='centerpoint'),port=SITES.find(s=>s.id==='oict'),workshop=SITES.find(s=>s.id==='depot');
const buildingBounds={min:[factory.x-75,factory.y-45],max:[factory.x+75,factory.y+45]};
const workshopBounds={min:[workshop.x-42.5,workshop.y-30],max:[workshop.x+42.5,workshop.y+30]};
const portLayout=createPortLayout(OICT_GEOGRAPHY),portBoundary={point:[port.x+portLayout.origin[0],port.y+portLayout.origin[1]],landward:portLayout.landward};
const routeFor=slot=>createCargoRoutes({portPose:{x:port.x+slot.port.truckRoot[0],y:port.y+slot.port.truckRoot[1],z:.15,heading:slot.port.truckHeading},bayPose:{x:factory.x+slot.factory.truckRoot[0],y:factory.y+slot.factory.truckRoot[1],z:.15,heading:Math.PI/2},roadPoints:ROAD_ROUTE_LNGLAT.slice(0,-4).map(toLocal),buildingBounds,obstacles:[workshopBounds],portBoundary});
const routes=CARGO_LAYOUT.slots.map(routeFor);
const transform=(pose,[x,y,z])=>[pose.x+x*Math.cos(pose.heading)+y*Math.sin(pose.heading),pose.y-x*Math.sin(pose.heading)+y*Math.cos(pose.heading),pose.z+z];
function samePose(a,b,tolerance=1e-7){for(const part of ['tractor','trailer']){assert.ok(Math.hypot(a[part].x-b[part].x,a[part].y-b[part].y,a[part].z-b[part].z)<tolerance);assert.ok(Math.abs(wrap(a[part].heading-b[part].heading))<tolerance);}for(const key of ['tractorTravel','trailerTravel'])assert.ok(Math.abs(a[key]-b[key])<tolerance);}
test('the continuous cargo circuit joins every moving and stationary phase without yaw or wheel resets',()=>{
 for(const r of routes){assert.ok(r.periodicYawError<1e-10);for(const[a,b]of [['cargo-port','cargo-outbound'],['cargo-outbound','cargo-arrival'],['cargo-arrival','cargo-bay'],['cargo-bay','cargo-return']]){
   samePose(r.sample(a,1),r.sample(b,0));samePose(r.sample(a,1-1e-10),r.sample(b,1e-10),2e-6);
  }
  samePose(r.sample('cargo-return',1),r.sample('cargo-port',0,1));
  samePose(r.sample('cargo-return',1-1e-10),r.sample('cargo-port',0,1),2e-6);
  samePose(r.sample('cargo-port',0,1),r.sample('cargo-outbound',0,1));
 }
});
test('full tractor and trailer swept rectangles remain exterior on both directions, including all connector turns',()=>{
 for(const r of routes){assert.deepEqual(r.checkClearance({stepMeters:.25}),[]);for(const phase of ['cargo-port','cargo-outbound','cargo-arrival','cargo-bay','cargo-return'])for(let i=0;i<=12000;i++){
  const s=r.sample(phase,i/12000);assert.ok(Math.abs(s.relativeAngle)<.75,'no jackknife');
  for(const part of ['tractor','trailer'])for(const key of ['x','y','z','heading'])assert.ok(Number.isFinite(s[part][key]));
  assert.equal(s.tractor.scale,1);assert.equal(s.trailer.scale,1);
  assert.equal(cargoIntersectsBounds(s,buildingBounds),false);assert.equal(cargoIntersectsBounds(s,workshopBounds),false);
  assert.ok(Object.values(cargoFootprints(s)).every(points=>points.length===4));
  const kingpin=transform(s.trailer,TRACTOR_TRAILER_ANCHORS.trailer.kingpin);assert.ok(Math.hypot(...kingpin.map((v,i)=>v-s.hitch[i]))<1e-9);
 }}
});
test('arrival is a forward pull-through into fixed exterior bays, with actual parked load transform',()=>{
 for(let i=0;i<routes.length;i++){const r=routes[i],s=r.sample('cargo-bay'),slot=CARGO_LAYOUT.slots[i],previous=r.sample('cargo-arrival',0);
  assert.ok(Math.abs(s.tractor.x-(factory.x+slot.factory.truckRoot[0]))<1e-8);assert.ok(Math.abs(s.tractor.y-(factory.y-56.5))<1e-8);assert.equal(s.tractor.heading,Math.PI/2);
  assert.ok(s.tractor.x>previous.tractor.x);assert.ok(s.tractorTravel>previous.tractorTravel);assert.ok(s.trailerTravel>previous.trailerTravel);
  assert.ok(Math.abs(s.relativeAngle)<.0005);const load=transform(s.trailer,FLATBED_CARGO_METADATA.slots[0].support);
  assert.ok(Math.abs(load[0]-(s.tractor.x-9.1))<1e-6);assert.ok(Math.abs(load[1]-s.tractor.y)<.005);assert.ok(Math.abs(load[2]-1.48)<1e-10);
  samePose(s,r.sample('cargo-bay',1));samePose(s,r.sample('cargo-bay',.25));
 }
});
test('cargo seeking is deterministic, bounded and independent of query order or animation clock',()=>{
 for(const r of routes){const a=r.sample('cargo-return',.371,3);r.sample('cargo-outbound',.99,7);r.sample('cargo-arrival',.1);assert.deepEqual(r.sample('cargo-return',.371,3),a);assert.deepEqual(r.sample('cargo-outbound',-1),r.sample('cargo-outbound',0));assert.deepEqual(r.sample('cargo-return',Infinity),r.sample('cargo-return',0));assert.equal(r.sample('unknown',.5),null);assert.equal(r.points('unknown'),null);assert.ok(r.points('cargo-return').length>2);}
 assert.deepEqual(routeFor(CARGO_LAYOUT.slots[0]).sample('cargo-return',.371,3),routes[0].sample('cargo-return',.371,3));
});
test('collision predicate checks finite footprints, including a building lying wholly inside a long trailer',()=>{
 const r=routes[0],s=r.sample('cargo-bay'),center=transform(s.trailer,[0,-6,0]);assert.equal(cargoIntersectsBounds(s,{min:[center[0]-.1,center[1]-.1],max:[center[0]+.1,center[1]+.1]}),true);
});
test('dispatch aliases start at the factory bay and close after outbound/drop/return with continuous wheel travel',()=>{
 for(const r of routes){const bay=r.sample('cargo-dispatch-bay');assert.equal(bay.tractorTravel,0);assert.equal(bay.trailerTravel,0);samePose(bay,r.sample('cargo-dispatch-outbound',0));samePose(r.sample('cargo-dispatch-outbound',1),r.sample('cargo-dispatch-return',0));samePose(r.sample('cargo-dispatch-return',1),r.sample('cargo-dispatch-bay',0,1));samePose(r.sample('cargo-dispatch-return',1-1e-10),r.sample('cargo-dispatch-bay',0,1),2e-6);assert.ok(r.sample('cargo-dispatch-return',.5).tractorTravel>r.sample('cargo-dispatch-outbound',1).tractorTravel);}
});

test('terminal maneuvers keep both finite bodies landward of the mapped quay',()=>{for(const r of routes)for(const phase of ['cargo-outbound','cargo-return'])for(let i=0;i<=12000;i++)assert.equal(cargoIntersectsBounds(r.sample(phase,i/12000),portBoundary),false);});
test('ordinary road traffic can use the complete validated circuit without an out-and-back cusp',()=>{for(const r of routes){samePose(r.sample('cargo-circuit',1),r.sample('cargo-circuit',0,1));assert.equal(r.phaseDistances['cargo-circuit'],r.length);const a=r.sample('cargo-circuit',.341);r.sample('cargo-circuit',.1);assert.deepEqual(r.sample('cargo-circuit',.341),a);}});

test('the complete road circuit also clears the larger box-trailer envelope',()=>{for(const r of routes)assert.deepEqual(r.checkClearance({stepMeters:.25,trailerStyle:'box'}),[]);});
test('runtime route traces retain only three float64 channels on the unchanged 0.2 meter grid',()=>{for(const r of routes){assert.equal(r.sampleCount,Math.ceil(r.length/.2)+1);assert.equal(r.storageBytes,r.sampleCount*24);assert.ok(r.storageBytes<1.1e6);}});
test('lane/connector joins and ordinary bypass preserve finite hitch geometry and service-slot clearance',async()=>{
 const {CARGO_ROUTE_CONFIGS}=await import('../../src/render/map/cargo-layout.js'),r=createCargoRoutes(CARGO_ROUTE_CONFIGS.find(c=>c.id==='ORDINARY-ROAD'));
 assert.deepEqual(r.checkClearance({stepMeters:.1,trailerStyle:'box'}),[]);
 for(const span of Object.values(r.publicRoadSpans))for(const meters of span){const phase=meters/r.length;const {trafficCircuitPhase}=await import('../../src/render/map/cargo-routes.js');samePose(r.sample('cargo-circuit',trafficCircuitPhase(phase-1e-10)),r.sample('cargo-circuit',trafficCircuitPhase(phase+1e-10)),2e-6);}
 assert.ok(r.bayPose.y<factory.y-65);for(const c of CARGO_ROUTE_CONFIGS.filter(c=>c.id.startsWith('CARGO-'))){assert.ok(Math.hypot(c.portPose.x-r.portSample.tractor.x,c.portPose.y-r.portSample.tractor.y)>19);assert.ok(Math.abs(c.bayPose.y-r.bayPose.y)>10);}
});

test('active ordinary preview has one clocked story truck, smooth held endpoints and deterministic reset',async()=>{
 const {sampleOrdinaryTraffic,ORDINARY_TRAFFIC_SLOTS}=await import('../../src/render/map/cargo-routes.js');
 assert.equal(ORDINARY_TRAFFIC_SLOTS.length,1);assert.equal(ORDINARY_TRAFFIC_SLOTS[0].id,'TRK-208');const first=sampleOrdinaryTraffic(0);assert.equal(first.status,'moving');assert.equal(first.trafficPhase,'ordinary-circuit');assert.equal(first.trafficRouteId,'ORDINARY-PREVIEW-208');sampleOrdinaryTraffic(812);assert.deepEqual(sampleOrdinaryTraffic(0),first);assert.deepEqual(sampleOrdinaryTraffic(NaN),first);
 const {CARGO_ROUTE_CONFIGS}=await import('../../src/render/map/cargo-layout.js'),config=CARGO_ROUTE_CONFIGS.find(c=>c.id==='ORDINARY-PREVIEW-208');assert.ok(config,'active preview must provide its explicit route configuration');
 const r=createCargoRoutes(config);samePose(r.sample('ordinary-circuit',1),r.sample('ordinary-circuit',0,1));
 for(const t of[24,28,60,64,72,76,104,108]){const e=.0001,a=r.sample('ordinary-circuit',(t-e)/128),b=r.sample('ordinary-circuit',t/128),c=r.sample('ordinary-circuit',(t+e)/128);assert.ok(Math.abs((b.tractorTravel-a.tractorTravel)/e-(c.tractorTravel-b.tractorTravel)/e)<.01);}
});

test('enabled inbound preview has no mixed whole-body contacts through first run and a complete post-hold repeat',async()=>{
 const {sampleCargoProcess}=await import('../../src/core/cargo-process.js'),{sampleOrdinaryTraffic}=await import('../../src/render/map/cargo-routes.js'),{CARGO_ROUTE_CONFIGS,cargoTruckRig,roadTruckPosition}=await import('../../src/render/map/cargo-layout.js'),{vehiclePosition}=await import('../../src/render/map/world.js');
 const initial=sampleCargoProcess(0,{presentationOffsetSeconds:102.5,outgoingEnabled:false});assert.equal(initial.capabilities?.outgoing,false);assert.equal(initial.outboundVehicles.length,0);
 const overlaps=(a,b)=>{for(const p of[a,b])for(let i=0;i<2;i++){const x=p[i+1][1]-p[i][1],y=p[i][0]-p[i+1][0],aa=a.map(v=>v[0]*x+v[1]*y),bb=b.map(v=>v[0]*x+v[1]*y);if(Math.max(...aa)<=Math.min(...bb)||Math.max(...bb)<=Math.min(...aa))return false;}return true;};
 for(let frame=0;frame<=128000;frame++){const time=frame*.002,state=sampleCargoProcess(time,{presentationOffsetSeconds:102.5,outgoingEnabled:false}),actors=state.trucks.map(a=>({id:a.id,rig:cargoTruckRig(a)}));actors.push({id:'TRK-208',rig:roadTruckPosition(sampleOrdinaryTraffic(time)).rig});
  for(let i=0;i<actors.length;i++)for(let j=i+1;j<actors.length;j++){const a=actors[i],b=actors[j];if(Math.hypot(a.rig.tractor.x-b.rig.tractor.x,a.rig.tractor.y-b.rig.tractor.y)>30)continue;a.poly??=Object.values(cargoFootprints(a.rig,'box'));b.poly??=Object.values(cargoFootprints(b.rig,'box'));assert.equal(a.poly.some(p=>b.poly.some(q=>overlaps(p,q))),false,`${a.id}/${b.id} at${time}`);}
  const phase=((time+13)%32)/32,service=phase<.4?{routeId:'factory-to-depot',progress:phase/.4}:phase<.65?{routeId:'depot-bay',progress:0}:{routeId:'depot-to-factory',progress:(phase-.65)/.35};
  for(const path of[service,{routeId:'depot-bay',progress:0}]){const p=vehiclePosition(path),poly=cargoFootprints({tractor:p,trailer:p}).tractor;for(const actor of actors){if(Math.hypot(p.x-actor.rig.tractor.x,p.y-actor.rig.tractor.y)>30)continue;actor.poly??=Object.values(cargoFootprints(actor.rig,'box'));assert.equal(actor.poly.some(q=>overlaps(poly,q)),false,`TRK-104/${actor.id} at${time}`);}}
 }
});

test('port route admission includes every actual column, container-row envelope and moored hull',async()=>{
 const {createPortRouteObstacles}=await import('../../src/render/map/cargo-routes.js'),{CARGO_ROUTE_CONFIGS,cargoRouteSet}=await import('../../src/render/map/cargo-layout.js');
 const obstacles=createPortRouteObstacles(portLayout,port);assert.ok(Object.isFrozen(obstacles));assert.equal(obstacles.filter(o=>o.kind==='gantry-column').length,36);assert.equal(obstacles.filter(o=>o.kind==='container-row').length,61);assert.equal(obstacles.filter(o=>o.kind==='moored-hull').length,2);assert.equal(obstacles.length,99);
 for(const o of obstacles){assert.ok(Object.isFrozen(o));assert.ok(Object.isFrozen(o.polygon));assert.ok(o.polygon.every(p=>Object.isFrozen(p)&&p.every(Number.isFinite)));assert.equal(o.clearanceMeters,.35);}
 for(const id of['CARGO-401','CARGO-402','CARGO-403','CARGO-404','ORDINARY-PREVIEW-208']){const config=CARGO_ROUTE_CONFIGS.find(c=>c.id===id);assert.equal(config.obstacles.filter(o=>o.kind).length,99,`${id} must admit all actual port obstacles`);assert.deepEqual(cargoRouteSet({id}).checkClearance({stepMeters:.1,trailerStyle:'box'}),[],id);}
});

test('CARGO404 departure clears both historically penetrated seaward gantry columns with the articulated trailer',async()=>{
 const {cargoRouteSet}=await import('../../src/render/map/cargo-layout.js'),route=cargoRouteSet({id:'CARGO-404'}),crane=portLayout.cranes.find(c=>c.id==='schematic-gantry-5');
 for(const x of[-10,10]){const polygon=[[-.6,-.6],[.6,-.6],[.6,.6],[-.6,.6]].map(([dx,dy])=>[port.x+crane.center[0]+portLayout.along[0]*(x+dx)+portLayout.landward[0]*(-13+dy),port.y+crane.center[1]+portLayout.along[1]*(x+dx)+portLayout.landward[1]*(-13+dy)]);
  for(let i=0;i<=1000;i++){const rig=route.sample('cargo-circuit',.015+i*.000015);assert.equal(cargoIntersectsBounds(rig,{polygon},'box'),false,`gantry5 leg${x},-13 at${i}`);}
 }
});
