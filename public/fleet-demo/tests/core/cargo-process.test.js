import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CARGO_PROCESS_VERSION,CARGO_PROCESS_LIMITS,CARGO_CYCLE_SECONDS,CARGO_PRESENTATION_OFFSET_SECONDS,CARGO_SLOTS,PRODUCT_STAGES,OUTBOUND_FLEET_ID,CARGO_STAGES,
  sampleCargoProcess,cargoEventsBetween,productEventsBetween,createCargoProcess} from '../../src/core/cargo-process.js';

const at=(stage,progress=.5,slot=0,cycle=0)=>CARGO_SLOTS[slot].offsetSeconds+cycle*CARGO_CYCLE_SECONDS+CARGO_STAGES.find(s=>s.id===stage).start+CARGO_STAGES.find(s=>s.id===stage).duration*progress;
const first=(stage,progress=.5)=>sampleCargoProcess(at(stage,progress));
function assertFrozen(value) {if(value&&typeof value==='object'){assert.ok(Object.isFrozen(value));Object.values(value).forEach(assertFrozen);}}
function inRange(value) {assert.ok(Number.isFinite(value)&&value>=0&&value<=1,`Expected normalized progress, got ${value}`);}

test('fixed semantic contract is bounded, has two exterior receiving bays and assembly workcell IDs',()=>{
  assert.equal(CARGO_PROCESS_VERSION,'illustrative-cargo/v1');
  assert.equal(CARGO_CYCLE_SECONDS,128);
  assert.deepEqual(CARGO_SLOTS.map(s=>s.cellId),['frame-jig','motor-install','propeller-install','final-assembly']);
  assert.deepEqual(CARGO_SLOTS.map(s=>s.bayId),['factory-receiving-01','factory-receiving-02','factory-receiving-01','factory-receiving-02']);
  assert.deepEqual(CARGO_SLOTS.map(s=>s.truckId),['CARGO-401','CARGO-402','CARGO-403','CARGO-404']);
  assertFrozen(CARGO_SLOTS);assertFrozen(CARGO_STAGES);assertFrozen(CARGO_PROCESS_LIMITS);
  for(const slot of CARGO_SLOTS)for(const anchor of Object.values(slot.anchors))assert.equal(typeof anchor,'string');
});

test('each tracked kit follows the entire chain in order with exactly one material owner',()=>{
  const kinds=['ship','crane','crane','trailer','trailer','trailer','forklift','storage','floor-robot','workcell','workcell','consumed'];
  for(const [index,stage] of CARGO_STAGES.entries())for(let slot=0;slot<4;slot++){
    const s=sampleCargoProcess(at(stage.id,.5,slot)),cargo=s.cargo[slot],definition=CARGO_SLOTS[slot];
    assert.equal(cargo.stage,stage.id);assert.equal(cargo.owner.kind,kinds[index]);
    assert.equal(cargo.id,`${definition.id}-B0001`);assert.equal(cargo.transferId,cargo.id);assert.equal(cargo.cycleIndex,0);
    assert.equal(cargo.carrierId,cargo.owner.id);assert.equal(cargo.attachment.parentId,cargo.owner.id);
    assert.equal(cargo.attachment.anchorId,cargo.owner.anchorId);
    const actorClaims=[...s.ships.flatMap(v=>v.cargoIds),...s.cranes.map(v=>v.cargoId),...s.trucks.map(v=>v.cargoId),...s.forklifts.map(v=>v.cargoId),...s.floorRobots.map(v=>v.cargoId),...s.factoryAssembly.cells.map(v=>v.cargoId)].filter(id=>id===cargo.id);
    assert.equal(actorClaims.length,['storage','consumed'].includes(cargo.owner.kind)?0:1,`duplicate or missing holder at ${stage.id}`);
    assert.equal(s.trucks[slot].trailer.cargoId,s.trucks[slot].cargoId);
  }
});

test('cargo attaches to the trailer only after the crane actually finishes loading',()=>{
  const loading=first('truck-loading',.999),loaded=first('truck-loaded',0);
  assert.equal(loading.cargo[0].owner.kind,'crane');assert.equal(loading.trucks[0].loaded,false);
  assert.equal(loaded.cargo[0].owner.kind,'trailer');assert.equal(loaded.cargo[0].owner.id,'TRAILER-401');
  assert.equal(loaded.cargo[0].attachment.anchorId,'trailer:TRAILER-401:load');
  assert.equal(loaded.trucks[0].loaded,true);assert.equal(loaded.trucks[0].trailerAttached,true);
  assert.equal(loaded.cranes[0].cargoId,null);
});

test('road travel, forward pull-through, load release and parked unloading are separate phases',()=>{
  const road=first('road-transit'),arrival=first('bay-arrival',.3),parked=first('bay-arrival',.9),unloading=first('forklift-unloading');
  assert.equal(road.trucks[0].routeId,'cargo-outbound');assert.equal(road.trucks[0].reversing,false);
  assert.equal(arrival.trucks[0].routeId,'cargo-arrival');assert.equal(arrival.trucks[0].reversing,false);
  assert.equal(arrival.trucks[0].stopped,false);assert.equal(arrival.trucks[0].loadAccessProgress,0);
  assert.equal(parked.trucks[0].stopped,true);assert.equal(parked.trucks[0].reversing,false);
  assert.ok(parked.trucks[0].loadAccessProgress>0);assert.equal(parked.trucks[0].stopAnchorId,CARGO_SLOTS[0].anchors.bayTruck);
  assert.equal(unloading.trucks[0].routeId,'cargo-bay');assert.equal(unloading.trucks[0].stopped,true);
  assert.equal(unloading.trucks[0].loadAccessProgress,1);assert.equal(unloading.trucks[0].loaded,false);
  assert.equal(unloading.forklifts[0].cargoId,unloading.cargo[0].id);assert.equal(unloading.forklifts[0].operatorPresent,true);
});

test('flatbed clears loading access before returning empty, while the same cargo continues inside',()=>{
  const closing=sampleCargoProcess(73),returning=sampleCargoProcess(75),arrived=sampleCargoProcess(106);
  assert.equal(closing.trucks[0].stopped,true);assert.equal(closing.trucks[0].loadAccessProgress,.5);
  assert.equal(returning.trucks[0].routeId,'cargo-return');assert.equal(returning.trucks[0].loadAccessProgress,0);
  assert.equal(returning.trucks[0].loaded,false);assert.equal(returning.trucks[0].cargoId,null);
  assert.equal(returning.cargo[0].id,closing.cargo[0].id);assert.equal(returning.cargo[0].owner.kind,'storage');
  assert.equal(arrived.trucks[0].routeId,'cargo-port');assert.equal(arrived.trucks[0].stopped,true);
});

test('no two semis occupy the same receiving bay through many wraps',()=>{
  for(let t=0;t<=CARGO_CYCLE_SECONDS*8;t+=.5){
    const trucks=sampleCargoProcess(t).trucks.filter(v=>['cargo-arrival','cargo-bay'].includes(v.routeId));
    assert.equal(new Set(trucks.map(v=>v.bayId)).size,trucks.length,`receiving bay collision at ${t}`);
    for(const truck of trucks)assert.match(truck.motion.toAnchorId,/^bay:factory-receiving-0[12]:truck$/);
  }
});

test('forklift, storage, floor robot and workcell handoffs preserve cargo identity',()=>{
  const stages=['forklift-unloading','storage','robot-transport','box-opening','drone-assembly'];
  const samples=stages.map(stage=>first(stage));
  assert.equal(new Set(samples.map(s=>s.cargo[0].id)).size,1);
  assert.equal(samples[0].forklifts[0].carrying,true);assert.equal(samples[0].forklifts[0].grip,1);
  assert.equal(samples[1].forklifts[0].cargoId,null);assert.equal(samples[1].floorRobots[0].cargoId,null);
  assert.equal(samples[2].floorRobots[0].payload,'parts-kit');assert.equal(samples[2].floorRobots[0].carrying,true);
  assert.equal(samples[3].floorRobots[0].cargoId,null);assert.equal(samples[3].factoryAssembly.cells[0].cargoId,samples[3].cargo[0].id);
});

test('box opening precedes drone assembly and completed product retains source cargo ID',()=>{
  const opening=first('box-opening'),assembly=first('drone-assembly'),complete=first('complete',.1);
  assert.equal(opening.factoryAssembly.cells[0].armAction,'open-box');assert.equal(opening.cargo[0].boxOpen,.5);
  assert.equal(opening.cargo[0].assemblyProgress,0);assert.equal(opening.products[0].visible,false);
  assert.equal(assembly.factoryAssembly.cells[0].armAction,'assemble-drone');assert.equal(assembly.cargo[0].boxOpen,1);
  assert.equal(assembly.products[0].progress,.5);assert.equal(assembly.products[0].sourceCargoId,assembly.cargo[0].id);
  assert.equal(complete.cargo[0].visible,false);assert.equal(complete.products[0].stage,'ready');assert.equal(complete.products[0].progress,1);
  assert.equal(complete.products[0].id,assembly.products[0].id);
  let previous=-1;
  for(let t=88;t<=118;t+=.25){const cell=sampleCargoProcess(t).factoryAssembly.cells[0];assert.ok(cell.progress>=previous);previous=cell.progress;}
});

test('snapshots are deeply immutable, deterministic, seekable and insensitive to record inputs',()=>{
  const original=sampleCargoProcess(92),serialized=JSON.stringify(original);
  assertFrozen(original);assert.throws(()=>{original.cargo[0].owner.id='OTHER';},TypeError);
  assert.throws(()=>{original.factoryAssembly.cells.push({id:'fake',progress:1});},TypeError);
  sampleCargoProcess(1e9);sampleCargoProcess(0);
  assert.deepEqual(sampleCargoProcess(92),original);assert.equal(JSON.stringify(original),serialized);
  const unrelated={odometerKm:-10,issueActive:true,authorityResolved:false,serviceFacts:[{id:'real-service'}]};
  assert.deepEqual(sampleCargoProcess(92,unrelated),original);
  assert.equal(readFileSync(new URL('../../src/core/cargo-process.js',import.meta.url),'utf8').match(/^import\s/gm),null);
});

test('shared clock pause/reset and optional adapter never create a second timer',()=>{
  const process=createCargoProcess();assert.deepEqual(process.getSnapshot(),sampleCargoProcess(0));
  process.tick(75);const running=process.getSnapshot();assert.equal(running.timeSeconds,75);
  const paused=process.pause();process.tick(5000);assert.deepEqual(process.getSnapshot(),paused);
  assert.equal(process.snapshotAt(82).paused,true);assert.equal(process.getSnapshot().timeSeconds,75);
  process.resume();process.tick(7);assert.deepEqual(process.getSnapshot(),sampleCargoProcess(82));
  process.pause();assert.deepEqual(process.reset(),sampleCargoProcess(0,{paused:true}));
  process.setPaused(false);process.tick(82);assert.deepEqual(process.getSnapshot(),sampleCargoProcess(82));
  assert.deepEqual(sampleCargoProcess(82,{paused:true}).cargo,sampleCargoProcess(82).cargo);
});

test('invalid time/progress inputs stay finite and long sessions retain bounded actor counts',()=>{
  for(const invalid of [-1,NaN,Infinity,-Infinity,undefined,null,'50'])assert.deepEqual(sampleCargoProcess(invalid),sampleCargoProcess(0));
  for(const t of [0,3.5,62,128,129,1e6,1e12,Number.MAX_VALUE]){
    const s=sampleCargoProcess(t);assert.equal(s.cargo.length,4);assert.equal(s.ships.length,2);
    for(const name of ['trucks','cranes','forklifts','floorRobots','products'])assert.equal(s[name].length,4);
    assert.equal(s.factoryAssembly.cells.length,4);assert.equal(new Set(s.cargo.map(c=>c.id)).size,4);
    for(const actor of [...s.cargo,...s.trucks,...s.forklifts,...s.floorRobots,...s.cranes,...s.products,...s.factoryAssembly.cells]){
      inRange(actor.progress);if(actor.motion)inRange(actor.motion.progress);
    }
  }
  const a=sampleCargoProcess(0),b=sampleCargoProcess(128);
  assert.equal(b.cargo[0].cycleIndex,1);assert.notEqual(a.cargo[0].id,b.cargo[0].id);assert.equal(a.trucks[0].id,b.trucks[0].id);
});

test('transition events are deterministic, nonduplicating across partitions, bounded and reset-safe',()=>{
  const full=cargoEventsBetween(0,256),split=[...cargoEventsBetween(0,87).events,...cargoEventsBetween(87,256).events];
  assert.deepEqual(full.events,split);assert.equal(full.omittedCount,0);assert.equal(new Set(full.events.map(e=>e.id)).size,full.events.length);
  assert.equal(cargoEventsBetween(88,88).events.length,0);assert.equal(cargoEventsBetween(88,0).events.length,0);
  const complete=full.events.find(e=>e.cargoId==='CARGO-01-B0001'&&e.type==='drone-completed');
  assert.equal(complete.timeSeconds,118);assert.equal(complete.productId,'DRONE-CARGO-01-B0001');
  const bounded=cargoEventsBetween(0,1e12,{limit:12});assert.equal(bounded.events.length,12);assert.ok(bounded.omittedCount>12);
  assert.deepEqual(bounded,cargoEventsBetween(0,1e12,{limit:12}));assertFrozen(bounded);
  const empty=cargoEventsBetween(0,256,{limit:0});assert.equal(empty.events.length,0);assert.equal(empty.omittedCount,full.events.length);
  for(let i=1;i<bounded.events.length;i++)assert.ok(bounded.events[i].timeSeconds>=bounded.events[i-1].timeSeconds);
});

test('explicit warm start populates all four material-flow areas without changing the app clock',()=>{
  const options={presentationOffsetSeconds:CARGO_PRESENTATION_OFFSET_SECONDS};
  const warm=sampleCargoProcess(0,options),raw=sampleCargoProcess(CARGO_PRESENTATION_OFFSET_SECONDS);
  assert.equal(warm.timeSeconds,0);assert.equal(warm.processTimeSeconds,102.5);assert.equal(warm.presentationOffsetSeconds,102.5);
  assert.deepEqual(warm.cargo.map(c=>c.stage),['drone-assembly','forklift-unloading','road-transit','ship-unloading']);
  for(const key of ['cargo','ships','trucks','cranes','forklifts','floorRobots','products','factoryAssembly'])assert.deepEqual(warm[key],raw[key]);
  assert.equal(warm.cargo[0].assemblyProgress,8.5/24);assert.equal(warm.forklifts[1].carrying,true);
  assert.equal(warm.trucks[2].loaded,true);assert.equal(warm.cranes[3].cargoId,warm.cargo[3].id);
  assert.deepEqual(sampleCargoProcess(0).cargo.map(c=>c.stage),['ship','ship','ship','ship']);
  assertFrozen(warm);
});

test('warm start pauses and resets to the identical populated frame with stable cargo IDs',()=>{
  const options={presentationOffsetSeconds:CARGO_PRESENTATION_OFFSET_SECONDS},process=createCargoProcess(options);
  const initial=process.getSnapshot();process.tick(2000);process.pause();const paused=process.getSnapshot();
  process.tick(2000);assert.deepEqual(process.getSnapshot(),paused);process.reset();process.resume();
  assert.deepEqual(process.getSnapshot(),initial);assert.deepEqual(process.snapshotAt(0),initial);
  assert.deepEqual(process.snapshotAt(0,{presentationOffsetSeconds:0}),sampleCargoProcess(0));
  assert.deepEqual(sampleCargoProcess(20,{...options,paused:true}).cargo,sampleCargoProcess(20,options).cargo);
  for(const invalid of [-1,NaN,Infinity,-Infinity,null,'50'])assert.deepEqual(sampleCargoProcess(20,{presentationOffsetSeconds:invalid}),sampleCargoProcess(20));
});

test('offset events use app-clock intervals and agree exactly with sampled custody at each transition',()=>{
  const options={presentationOffsetSeconds:CARGO_PRESENTATION_OFFSET_SECONDS};
  const full=cargoEventsBetween(0,256,options),split=[...cargoEventsBetween(0,87,options).events,...cargoEventsBetween(87,256,options).events];
  assert.deepEqual(full.events,split);assert.equal(full.omittedCount,0);assert.equal(cargoEventsBetween(0,0,options).events.length,0);
  for(const event of full.events){
    assert.ok(event.timeSeconds>0);assert.equal(event.processTimeSeconds,event.timeSeconds+CARGO_PRESENTATION_OFFSET_SECONDS);
    const cargo=sampleCargoProcess(event.timeSeconds,options).cargo.find(c=>c.slotId===event.slotId);
    assert.equal(event.cargoId,cargo.id);assert.equal(event.stage,cargo.stage);assert.deepEqual(event.owner,cargo.owner);
  }
  const raw=cargoEventsBetween(CARGO_PRESENTATION_OFFSET_SECONDS,256+CARGO_PRESENTATION_OFFSET_SECONDS);
  assert.deepEqual(full.events.map(e=>e.id),raw.events.map(e=>e.id));
});

test('fork height meets exact trailer pickup and storage supports with continuous placement/retraction',()=>{
  const pickup=first('forklift-unloading',0),arrivalEnd=first('bay-arrival',1-1e-8),drop=first('storage',0),dropBefore=first('forklift-unloading',1-1e-8);
  assert.equal(pickup.forklifts[0].forkHeight,1.23);assert.ok(Math.abs(arrivalEnd.forklifts[0].forkHeight-1.23)<1e-6);
  assert.equal(drop.forklifts[0].forkHeight,.975);assert.ok(Math.abs(dropBefore.forklifts[0].forkHeight-.975)<1e-6);
  assert.equal(first('forklift-unloading',.5).forklifts[0].forkHeight,.55);
  assert.ok(Math.abs(first('storage',.5).forklifts[0].forkHeight-.18)<1e-12);
  assert.equal(pickup.forklifts[0].forkHeight+.25,1.48);assert.equal(drop.forklifts[0].forkHeight+.25,1.225);
});

test('outgoing product retains identity through assembly, QA, dispatch, carrier and receipt',()=>{
  const ownerKinds=['workcell','workcell','floor-robot','qa-station','floor-robot','dispatch-staging','forklift','trailer','trailer','fleet'];
  for(const [index,phase] of PRODUCT_STAGES.entries())for(const slot of CARGO_SLOTS){
    const s=sampleCargoProcess(slot.offsetSeconds+phase.start+phase.duration/2),p=s.products[slot.index];
    assert.equal(p.id,`DRONE-${slot.id}-B0001`);assert.equal(p.sourceCargoId,`${slot.id}-B0001`);
    assert.equal(p.stage,phase.id);assert.equal(p.owner.kind,ownerKinds[index]);assert.equal(p.carrierId,p.owner.id);
    assert.equal(p.attachment.parentId,p.owner.id);assert.equal(p.attachment.anchorId,p.owner.anchorId);
    assert.equal(p.destinationId,OUTBOUND_FLEET_ID);assert.equal(p.visible,phase.id!=='fleet-received');
    assert.equal(p.completed,phase.start>=118);assert.equal(p.qaPassed,phase.start>=138);
    if(p.stage==='assembling')assert.equal(p.progress,.5);else assert.equal(p.progress,1);
    const claims=[...s.floorRobots.map(a=>a.productId),...s.forklifts.map(a=>a.productId),...s.qaStations.flatMap(a=>a.productIds),...s.dispatchStaging.flatMap(a=>a.productIds),...s.outboundVehicles.flatMap(a=>a.productIds),...s.factoryAssembly.cells.map(a=>a.outputProductId)].filter(id=>id===p.id);
    assert.equal(claims.length,p.stage==='fleet-received'?0:1,`Duplicate/missing outgoing owner at ${p.stage}`);
  }
});

test('product survives inbound kit rollover until the next assembly, with no early replacement',()=>{
  const before=sampleCargoProcess(127.999),after=sampleCargoProcess(128),last=sampleCargoProcess(221.999),next=sampleCargoProcess(222);
  assert.equal(before.products[0].id,after.products[0].id);assert.notEqual(before.cargo[0].id,after.cargo[0].id);
  assert.equal(after.products[0].sourceCargoId,before.cargo[0].id);assert.equal(after.products[0].stage,'qa-transport');
  assert.equal(last.products[0].id,before.products[0].id);assert.equal(last.products[0].stage,'fleet-received');
  assert.equal(next.products[0].id,'DRONE-CARGO-01-B0002');assert.equal(next.products[0].sourceCargoId,next.cargo[0].id);
  assert.equal(next.products[0].stage,'assembling');assert.equal(next.products[0].cycleIndex,1);
});

test('dispatch cannot precede complete assembly and the full QA interval',()=>{
  const beforeComplete=sampleCargoProcess(117.999),qaStart=sampleCargoProcess(130),qaEnd=sampleCargoProcess(138),loaded=sampleCargoProcess(156);
  assert.equal(beforeComplete.products[0].completed,false);assert.equal(beforeComplete.products[0].qaPassed,false);
  assert.equal(qaStart.products[0].stage,'qa-testing');assert.equal(qaStart.products[0].qaPassed,false);
  assert.equal(sampleCargoProcess(137.999).products[0].qaPassed,false);
  assert.equal(qaEnd.products[0].qaPassed,true);assert.equal(qaEnd.products[0].stage,'dispatch-transport');
  assert.equal(loaded.outboundVehicles[0].productId,loaded.products[0].id);assert.equal(loaded.outboundVehicles[0].qaPassed,true);
  for(let t=0;t<1024;t+=.5)for(const p of sampleCargoProcess(t).products){
    if(['dispatch-transport','dispatch-staged','outbound-loading','outbound-loaded','outbound-transit','fleet-received'].includes(p.stage)){assert.equal(p.completed,true);assert.equal(p.qaPassed,true);assert.equal(p.assemblyProgress,1);}
  }
});

test('one QA station, two sort positions and two outbound vehicles never exceed capacity',()=>{
  for(let t=0;t<=128*8;t+=.5){const s=sampleCargoProcess(t);
    assert.equal(s.products.length,4);assert.equal(s.qaStations.length,1);assert.equal(s.dispatchStaging.length,2);assert.equal(s.outboundVehicles.length,2);
    const claims=[];
    for(const actor of [...s.qaStations,...s.dispatchStaging,...s.outboundVehicles]){assert.equal(actor.capacity,1);assert.ok(actor.productIds.length<=actor.capacity);claims.push(...actor.productIds);}
    assert.equal(new Set(claims).size,claims.length);
    const outboundActors=[...s.floorRobots,...s.forklifts].filter(a=>a.productId);
    for(const actor of outboundActors){assert.equal(actor.cargoId,null);assert.ok(actor.carrying);claims.push(actor.productId);}
    assert.equal(new Set(claims).size,claims.length);
    assert.ok(s.products.filter(p=>p.visible).length<=4);
  }
});

test('workcell transfer and empty machine returns use explicit matching endpoint anchors',()=>{
  const slot=CARGO_SLOTS[0],a=slot.anchors,ready=sampleCargoProcess(120),qa=sampleCargoProcess(122),drop=sampleCargoProcess(148),robotEnd=sampleCargoProcess(158),load=sampleCargoProcess(152),forkReturn=sampleCargoProcess(156),forkEnd=sampleCargoProcess(166);
  assert.equal(ready.factoryAssembly.cells[0].armAction,'handoff-output');assert.equal(ready.factoryAssembly.cells[0].outputTransferProgress,.5);
  assert.deepEqual(ready.products[0].motion,{fromAnchorId:a.cellOutput,toAnchorId:a.cellDispatchPickup,progress:.5});
  assert.equal(qa.products[0].motion.fromAnchorId,ready.products[0].motion.toAnchorId);
  assert.equal(drop.floorRobots[0].stage,'output-returning');assert.equal(drop.floorRobots[0].motion.fromAnchorId,a.dispatchInput);assert.equal(drop.floorRobots[0].motion.toAnchorId,a.robotPark);assert.equal(drop.floorRobots[0].carrying,false);
  assert.equal(robotEnd.floorRobots[0].motion.fromAnchorId,a.robotPark);
  assert.equal(load.forklifts[0].forkHeightMode,'anchors');assert.equal('forkHeight' in load.forklifts[0],false);assert.deepEqual(load.forklifts[0].forkSupportMotion,load.products[0].motion);
  assert.equal(forkReturn.forklifts[0].stage,'dispatch-returning');assert.equal(forkReturn.forklifts[0].motion.fromAnchorId,a.outboundLoad);assert.equal(forkReturn.forklifts[0].motion.toAnchorId,a.forkliftPark);assert.equal(forkReturn.forklifts[0].carrying,false);
  assert.equal(forkEnd.forklifts[0].motion.fromAnchorId,a.forkliftPark);
  assert.equal(sampleCargoProcess(186).forklifts[0].flow,undefined,'next inbound receiving cycle is free of outgoing work');
  assert.equal(sampleCargoProcess(200).floorRobots[0].flow,undefined,'next inbound AMR pickup is free of outgoing work');
});

test('outbound flatbed loads stopped, secures cargo before departure and returns empty before reuse',()=>{
  const loading=sampleCargoProcess(154).outboundVehicles[0],closing=sampleCargoProcess(157).outboundVehicles[0],leaving=sampleCargoProcess(158).outboundVehicles[0],received=sampleCargoProcess(178),back=sampleCargoProcess(200).outboundVehicles[0],next=sampleCargoProcess(216).outboundVehicles[0];
  assert.equal(loading.stopped,true);assert.equal(loading.bodyStyle,'open-flatbed');assert.equal(loading.loaded,false);assert.equal('rearDoorOpen' in loading,false);
  assert.equal(closing.stopped,true);assert.equal(closing.secureProgress,.5);assert.equal(closing.loadSecured,false);assert.equal(closing.loaded,true);
  assert.equal(leaving.stopped,false);assert.equal(leaving.secureProgress,1);assert.equal(leaving.loadSecured,true);assert.equal(leaving.routeId,'cargo-dispatch-outbound');
  assert.equal(leaving.model,'truck');assert.equal(leaving.trailerAttached,true);assert.equal(leaving.trailerId,'TRAILER-501');assert.deepEqual(leaving.trailer.productIds,leaving.productIds);
  assert.equal(sampleCargoProcess(158).products[0].owner.kind,'trailer');assert.equal(sampleCargoProcess(158).products[0].attachment.parentId,'TRAILER-501');
  assert.equal(received.outboundVehicles[0].loaded,false);assert.equal(received.outboundVehicles[0].routeId,'cargo-dispatch-return');
  assert.equal(received.products[0].stage,'fleet-received');assert.equal(received.products[0].visible,false);
  assert.equal(back.stopped,true);assert.equal(back.routeId,'cargo-dispatch-bay');assert.equal(next.stage,'loading');assert.equal(next.productId,null);
});

test('outgoing transitions conserve each completed product through a single terminal receipt',()=>{
  const result=productEventsBetween(0,512);assert.equal(result.omittedCount,0);
  const byProduct=new Map();for(const event of result.events){const list=byProduct.get(event.productId)||[];list.push(event);byProduct.set(event.productId,list);}
  for(const events of byProduct.values()){
    const receipt=events.filter(e=>e.type==='product-fleet-received');assert.ok(receipt.length<=1);
    if(receipt.length){assert.equal(events.filter(e=>e.stage==='ready').length,1);assert.equal(events.filter(e=>e.type==='product-qa-passed').length,1);assert.equal(events.filter(e=>e.stage==='outbound-loaded').length,1);}
    assert.equal(new Set(events.map(e=>e.sourceCargoId)).size,1);assert.equal(new Set(events.map(e=>e.id)).size,events.length);
  }
});

test('outgoing events are bounded and deterministic, with raw and warm snapshot agreement',()=>{
  for(const options of [{},{presentationOffsetSeconds:CARGO_PRESENTATION_OFFSET_SECONDS}]){
    const full=productEventsBetween(0,256,options),split=[...productEventsBetween(0,87,options).events,...productEventsBetween(87,256,options).events];
    assert.deepEqual(full.events,split);assert.equal(full.omittedCount,0);
    for(const event of full.events){const product=sampleCargoProcess(event.timeSeconds,options).products.find(p=>p.slotId===event.slotId);assert.equal(event.productId,product.id);assert.equal(event.stage,product.stage);assert.equal(event.qaPassed,product.qaPassed);assert.deepEqual(event.owner,product.owner);}
    assert.equal(productEventsBetween(60,0,options).events.length,0);assertFrozen(full);
  }
  const huge=productEventsBetween(0,1e12,{limit:7});assert.equal(huge.events.length,7);assert.ok(huge.omittedCount>7);assert.deepEqual(huge,productEventsBetween(0,1e12,{limit:7}));
  const process=createCargoProcess({presentationOffsetSeconds:CARGO_PRESENTATION_OFFSET_SECONDS});process.tick(52);const held=process.pause();process.tick(100);assert.deepEqual(process.getSnapshot(),held);process.reset();process.resume();assert.deepEqual(process.getSnapshot(),sampleCargoProcess(0,{presentationOffsetSeconds:CARGO_PRESENTATION_OFFSET_SECONDS}));
});

test('flatbeds use secure/load access state and never claim rear-door hardware',()=>{
  for(let t=0;t<512;t+=.5)for(const truck of [...sampleCargoProcess(t).trucks,...sampleCargoProcess(t).outboundVehicles]){
    assert.equal(truck.bodyStyle,'open-flatbed');assert.equal(truck.reversing,false);
    assert.equal('rearDoorOpen' in truck,false);assert.equal('rearDoorOpen' in truck.trailer,false);
    inRange(truck.secureProgress);if(truck.loadAccessProgress!==undefined)inRange(truck.loadAccessProgress);
    if(truck.loaded&&!truck.stopped)assert.equal(truck.loadSecured,true);
  }
  assert.equal(first('truck-loaded',.5).trucks[0].secureProgress,.5);
  assert.equal(first('road-transit').trucks[0].loadSecured,true);
  assert.equal(first('bay-arrival',.5).trucks[0].loadSecured,true);
  assert.equal(first('bay-arrival',.9).trucks[0].loadSecured,false);
});

test('incoming travelCycle advances at return completion and survives waiting and batch wrap',()=>{
  for(const slot of CARGO_SLOTS)for(let cycle=0;cycle<8;cycle++){
    const start=slot.offsetSeconds+cycle*128,read=t=>sampleCargoProcess(start+t).trucks[slot.index];
    assert.equal(read(105.999).travelCycle,cycle);assert.equal(read(105.999).routeId,'cargo-return');
    for(const t of [106,110,127.999,128,132,150,154])assert.equal(read(t).travelCycle,cycle+1,`travel cycle changed at ${start+t}`);
    // A normalized route-distance fixture checks that endpoint→waiting has no wheel rewind.
    const before=read(105.999),after=read(106),distance=v=>v.travelCycle*105+(v.routeId==='cargo-return'?55+v.progress*50:0);
    assert.ok(distance(after)>=distance(before));assert.ok(distance(after)-distance(before)<.01);
  }
});

test('shared outbound travelCycle advances every completed64-second trip, including idle gaps',()=>{
  for(let index=0;index<2;index++)for(let circuit=0;circuit<10;circuit++){
    const end=200+index*32+circuit*64,read=t=>sampleCargoProcess(t).outboundVehicles[index];
    assert.equal(read(end-.001).travelCycle,circuit);assert.equal(read(end-.001).routeId,'cargo-dispatch-return');
    for(const delta of [0,4,10,16,21.999,22])assert.equal(read(end+delta).travelCycle,circuit+1,`outbound travelCycle at ${end+delta}`);
    const distance=v=>v.travelCycle*40+(v.routeId==='cargo-dispatch-return'?20+v.progress*20:0);
    assert.ok(distance(read(end))>=distance(read(end-.001)));assert.ok(distance(read(end))-distance(read(end-.001))<.01);
  }
  assert.equal(sampleCargoProcess(0).outboundVehicles[0].travelCycle,0);
  const offset={presentationOffsetSeconds:CARGO_PRESENTATION_OFFSET_SECONDS};
  assert.equal(sampleCargoProcess(200-CARGO_PRESENTATION_OFFSET_SECONDS,offset).outboundVehicles[0].travelCycle,1);
});

test('incoming forks engage measured pockets, extract level, then lower clear of the trailer',()=>{
  for(const p of [0,.05,.1,.15]){
    const f=first('forklift-unloading',p).forklifts[0];assert.equal(f.forkHeight,1.23);assert.equal(f.loadPhase,'extract');
    assert.equal(f.forkHeightReference,'cargo-bottom');assert.equal(f.forkPocketOffset,.095);
    assert.equal(f.forkHeight+.25+f.forkPocketOffset,1.575,'fork contact is the pallet pocket above its1.48m bottom');
  }
  assert.ok(Math.abs(first('forklift-unloading',.225).forklifts[0].forkHeight-.89)<1e-12);
  assert.equal(first('forklift-unloading',.30).forklifts[0].forkHeight,.55);
  assert.equal(first('forklift-unloading',.85).forklifts[0].forkHeight,.55);
  assert.equal(first('storage',0).forklifts[0].forkHeight,.975);
});

test('storage hands off by eased roller transfer only after the adjacent AMR has stopped',()=>{
  const a=CARGO_SLOTS[0].anchors;
  for(const t of [72,74,76.999]){const s=sampleCargoProcess(t);assert.equal(s.cargo[0].motion.progress,0);assert.equal(s.cargo[0].owner.kind,'storage');assert.equal(s.floorRobots[0].motion.toAnchorId,a.storageRobotPickup);}
  const held=sampleCargoProcess(77),rolling=sampleCargoProcess(77.25),end=sampleCargoProcess(78);
  assert.equal(held.floorRobots[0].stage,'waiting-for-transfer');assert.equal(held.floorRobots[0].motion.progress,1);
  assert.deepEqual(rolling.cargo[0].motion,{fromAnchorId:a.storage,toAnchorId:a.storageRobotPickup,progress:.15625});
  assert.equal(rolling.cargo[0].owner.kind,'storage');assert.equal(rolling.floorRobots[0].cargoId,null);
  assert.equal(end.cargo[0].owner.kind,'floor-robot');assert.equal(end.cargo[0].motion.fromAnchorId,a.storageRobotPickup);assert.equal(end.cargo[0].motion.progress,0);
  assert.equal(end.floorRobots[0].cargoId,end.cargo[0].id);
});

test('QA rollers and empty AMR bypass use separate paired mounts and meet again at output',()=>{
  const a=CARGO_SLOTS[0].anchors,start=sampleCargoProcess(130),rollIn=sampleCargoProcess(130.5),testState=sampleCargoProcess(134),rollOut=sampleCargoProcess(137),handoff=sampleCargoProcess(138);
  assert.deepEqual(start.products[0].motion,{fromAnchorId:a.qaInput,toAnchorId:a.qaTest,progress:0});
  assert.equal(rollIn.products[0].motion.progress,.15625);assert.equal(rollIn.products[0].owner.kind,'qa-station');
  assert.deepEqual(testState.products[0].motion,{fromAnchorId:a.qaTest,toAnchorId:a.qaTest,progress:0});
  assert.deepEqual(testState.floorRobots[0].motion,{fromAnchorId:a.qaBypassIn,toAnchorId:a.qaBypassOut,progress:.5});
  assert.equal(testState.floorRobots[0].productId,null);assert.equal(testState.products[0].qaPassed,false);
  assert.equal(rollOut.products[0].motion.fromAnchorId,a.qaTest);assert.equal(rollOut.products[0].motion.toAnchorId,a.qaOutput);
  assert.equal(rollOut.floorRobots[0].motion.fromAnchorId,a.qaBypassOut);assert.equal(rollOut.floorRobots[0].motion.toAnchorId,a.qaOutput);
  assert.equal(handoff.products[0].owner.kind,'floor-robot');assert.equal(handoff.products[0].qaPassed,true);
  assert.equal(handoff.products[0].motion.fromAnchorId,a.qaOutput);assert.equal(handoff.products[0].motion.toAnchorId,a.dispatchInput);
});

test('dispatch rolls cargo off the stationary AMR before empty return and forklift pickup',()=>{
  const a=CARGO_SLOTS[0].anchors,start=sampleCargoProcess(146),rolling=sampleCargoProcess(146.5),returned=sampleCargoProcess(148),pickup=sampleCargoProcess(152);
  assert.equal(start.products[0].owner.kind,'dispatch-staging');assert.equal(start.products[0].motion.fromAnchorId,a.dispatchInput);
  assert.equal(rolling.products[0].motion.progress,.15625);assert.equal(rolling.products[0].motion.toAnchorId,a.dispatchStaging);
  for(const s of [start,rolling]){assert.equal(s.floorRobots[0].stage,'dispatch-transfer');assert.deepEqual(s.floorRobots[0].motion,{fromAnchorId:a.dispatchInput,toAnchorId:a.dispatchInput,progress:0});assert.equal(s.floorRobots[0].productId,null);}
  assert.equal(returned.products[0].motion.progress,1);assert.equal(returned.floorRobots[0].stage,'output-returning');
  assert.equal(returned.floorRobots[0].motion.fromAnchorId,a.dispatchInput);assert.equal(returned.floorRobots[0].motion.progress,0);
  assert.equal(pickup.products[0].owner.kind,'forklift');assert.equal(pickup.products[0].motion.fromAnchorId,a.dispatchStaging);
});

test('paired roller and bypass segment boundaries have no semantic position jumps',()=>{
  const eps=1e-7;
  const endpoint=m=>m.progress<eps?m.fromAnchorId:m.progress>1-eps?m.toAnchorId:null;
  for(const slot of CARGO_SLOTS)for(const [field,times] of [['cargo',[77,78]],['products',[130,132,136,138,146,148,152]],['floorRobots',[77,78,130,132,136,138,146,148,158]]]){
    for(const t of times){const before=sampleCargoProcess(slot.offsetSeconds+t-eps)[field][slot.index].motion,after=sampleCargoProcess(slot.offsetSeconds+t)[field][slot.index].motion;
      assert.equal(endpoint(before),endpoint(after),`${field} slot${slot.index} discontinuity at${t}`);
    }
  }
});
