import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=process.env.FLEET_DEMO_ROOT||fileURLToPath(new URL('../../',import.meta.url));
const {sampleCargoProcess:sample,createCargoProcess,cargoEventsBetween:events}=await import(pathToFileURL(resolve(root,'src/core/cargo-process.js')));
const {createSimulation}=await import(pathToFileURL(resolve(root,'src/core/simulation.js')));
const frozen=o=>!o||typeof o!=='object'||Object.isFrozen(o)&&Object.values(o).every(frozen);
const close=(a,b,e=1e-8)=>assert.ok(Math.abs(a-b)<=e,`${a} differs from ${b}`);
// Independent timeline expectations from the published illustrative v1 contract.
const starts=[0,6,16,22,26,58,62,72,78,88,94,118];
const ownerKinds=['ship','crane','crane','trailer','trailer','trailer','forklift','storage','floor-robot','workcell','workcell','consumed'];
const stageNames=['ship','ship-unloading','truck-loading','truck-loaded','road-transit','bay-arrival','forklift-unloading','storage','robot-transport','box-opening','drone-assembly','complete'];
const cellIds=['frame-jig','motor-install','propeller-install','final-assembly'];

function audit(s){
  assert.equal(s.cargo.length,4);assert.equal(new Set(s.cargo.map(c=>c.id)).size,4);assert.equal(s.ships.length,2);
  const claims=[];
  for(const ship of s.ships)for(const id of ship.cargoIds)claims.push({id,kind:'ship',owner:ship.id});
  for(const [list,kind]of [['cranes','crane'],['forklifts','forklift'],['floorRobots','floor-robot']]){
    assert.equal(s[list].length,4);for(const a of s[list])if(a.cargoId)claims.push({id:a.cargoId,kind,owner:a.id});
  }
  for(const t of s.trucks){assert.equal(t.inspectable,false);assert.equal(t.trailerAttached,true);assert.equal(t.trailer.cargoId,t.cargoId);assert.equal(t.loaded,!!t.cargoId);if(t.cargoId)claims.push({id:t.cargoId,kind:'trailer',owner:t.trailerId});if(t.routeId==='cargo-return')assert.equal(t.cargoId,null);}
  for(const cell of s.factoryAssembly.cells)if(cell.cargoId)claims.push({id:cell.cargoId,kind:'workcell',owner:cell.id});
  const ids=new Set(s.cargo.map(c=>c.id));assert.ok(claims.every(c=>ids.has(c.id)),'Actor claims nonexistent cargo');
  for(const cargo of s.cargo){
    assert.equal(cargo.carrierId,cargo.owner.id);assert.equal(cargo.attachment.parentId,cargo.owner.id);assert.equal(cargo.attachment.anchorId,cargo.owner.anchorId);
    const held=claims.filter(c=>c.id===cargo.id),passive=['storage','consumed'].includes(cargo.owner.kind);
    assert.equal(held.length,passive?0:1,`${cargo.id} has ${held.length} active holders at ${s.processTimeSeconds}`);
    if(!passive){assert.equal(held[0].kind,cargo.owner.kind);assert.equal(held[0].owner,cargo.owner.id);}
    assert.ok(cargo.motion.progress>=0&&cargo.motion.progress<=1);
    const product=s.products.find(p=>p.sourceCargoId===cargo.id);assert.ok(product);assert.equal(product.id,cargo.productId);
    if(cargo.owner.kind==='consumed'){assert.equal(cargo.visible,false);assert.equal(product.visible,true);assert.equal(product.stage,'ready');assert.equal(product.progress,1);}
    if(cargo.stage==='box-opening'){assert.equal(product.visible,false);assert.equal(cargo.assemblyProgress,0);}
    if(cargo.stage==='drone-assembly')assert.equal(cargo.boxOpen,1);
  }
  const occupying=s.trucks.filter(t=>['cargo-arrival','cargo-bay'].includes(t.routeId));assert.equal(new Set(occupying.map(t=>t.bayId)).size,occupying.length,`Bay double booked at ${s.processTimeSeconds}`);
  for(const berth of ['SHIP-01','SHIP-02'])assert.ok(s.cranes.filter(c=>c.shipId===berth&&c.cargoId).length<=1,`Two kits claim one physical ship hoist at ${s.processTimeSeconds}`);
}

test('20 Hz conservation and exclusive bay/hoist occupancy hold across eight cycles and both startup modes',()=>{
  let samples=0;
  for(const offset of [0,102.5])for(let tick=0;tick<=128*8*20;tick++){audit(sample(tick/20,{presentationOffsetSeconds:offset}));samples++;}
  assert.equal(samples,40962);
});

test('all slot boundaries retain one batch identity and follow independent ownership expectations',()=>{
  for(let cycle=0;cycle<3;cycle++)for(let slot=0;slot<4;slot++)for(let phase=0;phase<starts.length;phase++){
    const time=slot*32+cycle*128+starts[phase],s=sample(time),cargo=s.cargo[slot];
    assert.equal(cargo.stage,stageNames[phase]);assert.equal(cargo.owner.kind,ownerKinds[phase]);assert.equal(cargo.cycleIndex,cycle);assert.equal(cargo.id,`CARGO-0${slot+1}-B${String(cycle+1).padStart(4,'0')}`);
    assert.equal(s.factoryAssembly.cells[slot].id,cellIds[slot]);audit(sample(Math.max(0,time-1e-7)));audit(s);audit(sample(time+1e-7));
  }
});

test('forklift pickup and release meet the agreed world support heights without a boundary jump',()=>{
  for(let slot=0;slot<4;slot++)for(let cycle=0;cycle<2;cycle++){
    const base=slot*32+128*cycle;
    close(.25+sample(base+62).forklifts[slot].forkHeight,1.48);
    close(sample(base+62-1e-8).forklifts[slot].forkHeight,sample(base+62).forklifts[slot].forkHeight,1e-6);
    close(.25+sample(base+72).forklifts[slot].forkHeight,1.225);
    close(sample(base+72-1e-8).forklifts[slot].forkHeight,sample(base+72).forklifts[slot].forkHeight,1e-6);
    assert.equal(sample(base+72).forklifts[slot].cargoId,null);
    assert.ok(sample(base+73).forklifts[slot].forkHeight<.975,'Empty fork lowers only after storage custody');
  }
});

test('absolute samples remain deeply frozen, order independent and separate from maintenance inputs',()=>{
  const options=Object.freeze({paused:true,presentationOffsetSeconds:102.5,authority:Object.freeze({'TRK-104':'B'}),rawReadings:Object.freeze([{id:'sentinel'}])});
  const a=sample(34.125,options),before=JSON.stringify(a);assert.ok(frozen(a));
  for(const t of [800,0,33,1e8,12])sample(t);
  assert.deepEqual(sample(34.125,options),a);assert.equal(JSON.stringify(a),before);
  assert.deepEqual(a,sample(34.125,{paused:true,presentationOffsetSeconds:102.5}));
  assert.throws(()=>a.cargo[0].owner.id='changed',TypeError);assert.equal(options.rawReadings[0].id,'sentinel');
});

test('one injected 20 Hz clock pauses all cargo values and reset reproduces populated startup',()=>{
  let now=0,cancelled=false,last,scheduled;
  const sim=createSimulation({now:()=>now,schedule:fn=>(scheduled=fn,7),cancel:id=>{assert.equal(id,7);cancelled=true;},onTick:s=>{last=sample(s.timeSeconds,{paused:s.paused,presentationOffsetSeconds:102.5});}});
  for(let i=0;i<100;i++){now+=50;scheduled();}assert.ok(last.timeSeconds>4.9);
  sim.setPaused(true);now+=50;scheduled();const held=last;
  for(let i=0;i<100;i++){now+=50;scheduled();assert.deepEqual(last,held);}
  sim.reset();scheduled();assert.deepEqual(last,sample(0,{paused:true,presentationOffsetSeconds:102.5}));
  sim.dispose();assert.equal(cancelled,true);const stopped=last;now+=1e6;scheduled();assert.equal(last,stopped);
});

test('optional process adapter seek does not move the live clock and replay preserves the configured offset',()=>{
  const process=createCargoProcess({presentationOffsetSeconds:102.5});process.tick(31.5);const held=process.pause();process.tick(500);assert.deepEqual(process.getSnapshot(),held);
  process.snapshotAt(700);assert.deepEqual(process.getSnapshot(),held);assert.deepEqual(process.reset(),sample(0,{paused:true,presentationOffsetSeconds:102.5}));
  process.resume();process.tick(31.5);assert.deepEqual(process.getSnapshot(),sample(31.5,{presentationOffsetSeconds:102.5}));
});

test('offset transition events partition without duplicates and match sampled ownership',()=>{
  for(const presentationOffsetSeconds of [0,102.5]){
    const options={presentationOffsetSeconds},whole=events(0,256,options),partition=[];
    for(let i=0;i<256*20;i++)partition.push(...events(i/20,(i+1)/20,options).events);
    assert.deepEqual(partition,whole.events);assert.equal(new Set(partition.map(e=>e.id)).size,partition.length);
    for(const e of partition){assert.ok(e.timeSeconds>0);const s=sample(e.timeSeconds,options),cargo=s.cargo.find(c=>c.id===e.cargoId);assert.ok(cargo);assert.equal(cargo.stage,e.stage);assert.deepEqual(cargo.owner,e.owner);}
    assert.equal(events(100,0,options).events.length,0);assert.equal(events(100,100,options).events.length,0);
  }
});

test('conservation audit rejects duplicate identities, orphan actor claims, double custody and occupied-bay conflicts',()=>{
  const mutate=(time,fn)=>{const s=structuredClone(sample(time));fn(s);assert.throws(()=>audit(s));};
  mutate(40,s=>{s.cargo[1].id=s.cargo[0].id;});
  mutate(40,s=>{s.forklifts[0].cargoId='missing-kit';});
  mutate(40,s=>{s.forklifts[0].cargoId=s.cargo[0].id;});
  mutate(40,s=>{s.trucks[0].cargoId=null;s.trucks[0].trailer.cargoId=null;s.trucks[0].loaded=false;});
  mutate(62,s=>{s.trucks[1].routeId='cargo-bay';s.trucks[1].bayId=s.trucks[0].bayId;});
  mutate(120,s=>{s.products[0].visible=false;});
});
