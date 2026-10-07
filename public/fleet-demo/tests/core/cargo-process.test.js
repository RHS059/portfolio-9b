import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CARGO_PROCESS_VERSION,CARGO_PROCESS_LIMITS,CARGO_CYCLE_SECONDS,CARGO_PRESENTATION_OFFSET_SECONDS,CARGO_SLOTS,CARGO_STAGES,
  sampleCargoProcess,cargoEventsBetween,createCargoProcess} from '../../src/core/cargo-process.js';

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

test('road travel, backing, door opening and parked unloading are separate phases',()=>{
  const road=first('road-transit'),backing=first('bay-arrival',.3),parked=first('bay-arrival',.9),unloading=first('forklift-unloading');
  assert.equal(road.trucks[0].routeId,'cargo-outbound');assert.equal(road.trucks[0].reversing,false);
  assert.equal(backing.trucks[0].routeId,'cargo-arrival');assert.equal(backing.trucks[0].reversing,true);
  assert.equal(backing.trucks[0].stopped,false);assert.equal(backing.trucks[0].rearDoorOpen,0);
  assert.equal(parked.trucks[0].stopped,true);assert.equal(parked.trucks[0].reversing,false);
  assert.ok(parked.trucks[0].rearDoorOpen>0);assert.equal(parked.trucks[0].stopAnchorId,CARGO_SLOTS[0].anchors.bayTruck);
  assert.equal(unloading.trucks[0].routeId,'cargo-bay');assert.equal(unloading.trucks[0].stopped,true);
  assert.equal(unloading.trucks[0].rearDoorOpen,1);assert.equal(unloading.trucks[0].loaded,false);
  assert.equal(unloading.forklifts[0].cargoId,unloading.cargo[0].id);assert.equal(unloading.forklifts[0].operatorPresent,true);
});

test('truck closes its rear doors before returning empty, while the same cargo continues inside',()=>{
  const closing=sampleCargoProcess(73),returning=sampleCargoProcess(75),arrived=sampleCargoProcess(106);
  assert.equal(closing.trucks[0].stopped,true);assert.equal(closing.trucks[0].rearDoorOpen,.5);
  assert.equal(returning.trucks[0].routeId,'cargo-return');assert.equal(returning.trucks[0].rearDoorOpen,0);
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
  const opening=first('box-opening'),assembly=first('drone-assembly'),complete=first('complete');
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
