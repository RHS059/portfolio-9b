import test from'node:test';import assert from'node:assert/strict';
import{resolve}from'node:path';import{pathToFileURL,fileURLToPath}from'node:url';
const root=process.env.FLEET_DEMO_ROOT||fileURLToPath(new URL('../../',import.meta.url));
const{sampleCargoProcess:sample,createCargoProcess,cargoEventsBetween,productEventsBetween}=await import(pathToFileURL(resolve(root,'src/core/cargo-process.js')));
const cellIds=['frame-jig','motor-install','propeller-install','final-assembly'];
const materials=s=>Object.fromEntries(['cargo','products','ships','trucks','cranes','forklifts','floorRobots','factoryAssembly','qaStations','dispatchStaging','outboundVehicles'].map(k=>[k,s[k]]));
const frozen=o=>!o||typeof o!=='object'||Object.isFrozen(o)&&Object.values(o).every(frozen);
function audit(s){
 assert.equal(s.outgoingEnabled,false);assert.deepEqual(s.capabilities,{outgoing:false,onePassHold:true});
 for(const k of['qaStations','dispatchStaging','outboundVehicles'])assert.deepEqual(s[k],[]);
 assert.equal(s.cargo.length,4);assert.equal(s.products.length,4);assert.equal(new Set(s.cargo.map(c=>c.id)).size,4);assert.equal(new Set(s.products.map(p=>p.id)).size,4);
 const claims=[];for(const ship of s.ships)for(const id of ship.cargoIds)claims.push({id,kind:'ship',owner:ship.id});
 for(const[list,kind]of[['cranes','crane'],['forklifts','forklift'],['floorRobots','floor-robot']])for(const a of s[list]){if(a.cargoId)claims.push({id:a.cargoId,kind,owner:a.id});assert.ok(a.productId==null);assert.notEqual(a.flow,'outgoing');}
 for(const truck of s.trucks){if(truck.cargoId)claims.push({id:truck.cargoId,kind:'trailer',owner:truck.trailerId});assert.equal(truck.trailer.cargoId,truck.cargoId);}
 for(const c of s.factoryAssembly.cells)if(c.cargoId)claims.push({id:c.cargoId,kind:'workcell',owner:c.id});
 for(let i=0;i<4;i++){
  const c=s.cargo[i],p=s.products[i],cell=s.factoryAssembly.cells[i],id=`CARGO-0${i+1}-B0001`;assert.equal(c.id,id);assert.equal(c.batch,1);assert.equal(c.cycleIndex,0);assert.equal(p.id,'DRONE-'+id);assert.equal(p.sourceCargoId,id);assert.equal(cell.id,cellIds[i]);
  const holders=claims.filter(x=>x.id===id),passive=['storage','consumed'].includes(c.owner.kind);assert.equal(holders.length,passive?0:1);if(!passive){assert.equal(holders[0].kind,c.owner.kind);assert.equal(holders[0].owner,c.owner.id);}
  assert.equal(c.attachment.parentId,c.owner.id);assert.equal(c.attachment.anchorId,c.owner.anchorId);assert.equal(p.owner.kind,'workcell');assert.equal(p.owner.id,cellIds[i]);assert.equal(p.qaPassed,false);
  const productHolders=s.factoryAssembly.cells.filter(x=>x.outputProductId===p.id);assert.equal(productHolders.length,p.visible?1:0);assert.notEqual(cell.armAction,'handoff-output');assert.equal(cell.outputTransferProgress,0);
  if(s.processTimeSeconds>=i*32+118){assert.equal(c.visible,false);assert.equal(c.owner.kind,'consumed');assert.equal(cell.cargoId,null);assert.equal(cell.active,false);assert.equal(cell.armAction,'park');assert.equal(p.visible,true);assert.equal(p.completed,true);assert.equal(p.stage,'ready');assert.equal(p.held,true);assert.equal(p.holdReason,'outgoing-disabled');assert.equal(p.motion.fromAnchorId,`cell:${cellIds[i]}:output`);assert.deepEqual(p.motion,{fromAnchorId:p.motion.toAnchorId,toAnchorId:p.motion.toAnchorId,progress:0});assert.equal(s.trucks[i].loaded,false);assert.equal(s.trucks[i].travelCycle,1);}
 }
 const occupied=s.trucks.filter(t=>['cargo-arrival','cargo-bay'].includes(t.routeId));assert.equal(new Set(occupied.map(t=>t.bayId)).size,occupied.length);
}

test('inbound-only preview conserves exactly four first-batch kits and held products at20Hz',()=>{
 let count=0;for(const offset of[0,102.5])for(let tick=0;tick<=600*20;tick++){const time=tick/20,s=sample(time,{outgoingEnabled:false,presentationOffsetSeconds:offset});audit(s);assert.equal(s.timeSeconds,time);assert.equal(s.processTimeSeconds,time+offset);count++;}assert.equal(count,24002);
});

test('completed cells never admit another kit while the ordinary clock keeps advancing',()=>{
 for(const offset of[0,102.5]){const options={outgoingEnabled:false,presentationOffsetSeconds:offset},held=sample(300,options);assert.ok(frozen(held));for(const t of[301,512,1e5,1e9,1e12]){const s=sample(t,options);audit(s);assert.deepEqual(materials(s),materials(held));assert.equal(s.timeSeconds,t);assert.equal(s.paused,false);}}
});

test('first-completion boundaries retain product identity with no output transfer or replacement',()=>{
 for(let slot=0;slot<4;slot++){const at=slot*32+118;const before=sample(at-1e-7,{outgoingEnabled:false}),done=sample(at,{outgoingEnabled:false}),later=sample(at+128,{outgoingEnabled:false});assert.equal(before.products[slot].id,done.products[slot].id);assert.equal(before.products[slot].completed,false);assert.equal(done.products[slot].completed,true);assert.equal(done.factoryAssembly.cells[slot].active,false);assert.deepEqual(done.products[slot],later.products[slot]);audit(before);audit(done);audit(later);}
});

test('preview event streams partition exactly and contain no later-batch, QA, dispatch or receipt events',()=>{
 for(const offset of[0,102.5]){const options={outgoingEnabled:false,presentationOffsetSeconds:offset};for(const fn of[cargoEventsBetween,productEventsBetween]){
  const all=fn(0,1e9,options),parts=[];for(let i=0;i<600*20;i++)parts.push(...fn(i/20,(i+1)/20,options).events);assert.deepEqual(parts,all.events);assert.equal(all.omittedCount,0);assert.equal(new Set(parts.map(e=>e.id)).size,parts.length);assert.deepEqual(fn(600,1e9,options),{events:[],omittedCount:0});
  for(const e of parts){assert.match(e.productId||e.cargoId,/-B0001$/);assert.ok(!/qa|dispatch|outbound|fleet/.test(e.type));if(fn===productEventsBetween){assert.ok(['assembling','ready'].includes(e.stage));assert.equal(e.qaPassed,false);}}
 }}
});

test('preview pause, seek and reset preserve the explicit mode without changing the full-process default',()=>{
 const options={outgoingEnabled:false,presentationOffsetSeconds:102.5},p=createCargoProcess(options),initial=p.getSnapshot();p.tick(500);const held=p.pause();p.tick(999);assert.deepEqual(p.getSnapshot(),held);assert.deepEqual(materials(p.snapshotAt(1e7)),materials(held));assert.deepEqual(p.getSnapshot(),held);p.reset();p.resume();assert.deepEqual(p.getSnapshot(),initial);assert.equal(sample(500).outgoingEnabled,true);assert.ok(sample(500).cargo.some(c=>c.batch>1));assert.equal(sample(500).outboundVehicles.length,2);
});

test('preview audit rejects hidden outgoing work, replacement kits and missing held products',()=>{
 const mutate=fn=>{const s=structuredClone(sample(500,{outgoingEnabled:false}));fn(s);assert.throws(()=>audit(s));};
 mutate(s=>s.outboundVehicles.push({id:'OUTBOUND-501'}));mutate(s=>{s.floorRobots[0].productId=s.products[0].id;});mutate(s=>{s.products[0].visible=false;});mutate(s=>{s.cargo[0].id='CARGO-01-B0002';});mutate(s=>{s.factoryAssembly.cells[0].armAction='handoff-output';});
});
