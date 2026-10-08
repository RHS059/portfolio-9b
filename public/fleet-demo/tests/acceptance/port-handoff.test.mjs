import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { pointInRing, edges, segmentDistance } from './geometry-assertions.mjs';

const root=process.env.FLEET_DEMO_ROOT||fileURLToPath(new URL('../../',import.meta.url));
const portRoot=process.env.FLEET_PORT_ROOT||root;
let T,createPort,geography;
try{T=await import(process.env.FLEET_THREE_MODULE||'three');}catch(e){if(process.env.FLEET_THREE_MODULE||e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
try{({createPort}=await import(pathToFileURL(resolve(portRoot,'src/render/facilities/port/index.js'))));}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
if(process.env.FLEET_PORT_GEOGRAPHY_JSON)geography=JSON.parse(await readFile(process.env.FLEET_PORT_GEOGRAPHY_JSON,'utf8'));
else try{({OICT_GEOGRAPHY:geography}=await import(pathToFileURL(resolve(root,'src/render/map/oict-geography.js'))));}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
const missing=!T?'Actual Three runtime unavailable':!createPort?'Port module unavailable':!geography?'Mapped port geography unavailable':false;
if(process.env.REQUIRE_CARGO_PROCESS==='1')test('required port handoff prerequisites exist',()=>assert.equal(missing,false));
const check=(name,fn)=>test(name,{skip:missing},fn);
const freeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};
const recursivelyFrozen=o=>!o||typeof o!=='object'||(Object.isFrozen(o)&&Object.values(o).every(recursivelyFrozen));
const close=(actual,expected,epsilon=1e-6)=>{assert.equal(actual.length,expected.length);actual.forEach((n,i)=>assert.ok(Math.abs(n-expected[i])<epsilon,`${actual} != ${expected}`));};
const snapshot=(cargo,timeSeconds=0)=>freeze({timeSeconds,paused:true,process:{cargo}});
function release(group){group.userData.dispose?.();const gs=new Set(),ms=new Set();group.traverse(o=>{if(o.geometry)gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)ms.add(m);});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());}
function fixture(group){
  assert.equal(typeof group.userData.setProcessAnchorBindings,'function','Connected port anchor adapter is required');
  assert.equal(typeof group.userData.getProcessInspection,'function','Read-only cargo evidence is required');
  const layouts=group.userData.processAnchors;assert.equal(layouts.length,2);
  const bindings=layouts.flatMap((l,b)=>[
    ...l.pickupSlots.map((p,i)=>({id:`ship-${b}-slot-${i}`,parentId:`ship-${b}`,ownerKind:'ship',berthIndex:b,position:p.position.slice()})),
    {id:`hook-${b}`,parentId:`crane-${b}`,ownerKind:'crane',berthIndex:b,position:[l.origin[0],l.origin[1],30]},
    {id:`deck-${b}`,parentId:`trailer-${b}`,ownerKind:'trailer',berthIndex:b,position:[l.trailer.position[0],l.trailer.position[1],l.trailer.position[2]+1]},
  ]);
  group.userData.setProcessAnchorBindings(bindings);
  const cargo=(slot,kind='ship',progress=0)=>{const b=Math.floor(slot/2),anchor=kind==='ship'?`ship-${b}-slot-${slot%2}`:kind==='crane'?`hook-${b}`:`deck-${b}`,ownerId=`${kind}-${b}`;
    return {id:`acceptance-cargo-${slot}`,cycleIndex:1,transferId:`transfer-${slot}`,owner:{kind,id:ownerId,anchorId:anchor},attachment:{parentId:ownerId,anchorId:anchor},...(kind==='crane'?{motion:{fromAnchorId:`ship-${b}-slot-${slot%2}`,toAnchorId:`deck-${b}`,progress}}:{})};};
  return {layouts,bindings,cargo,inspect:()=>group.userData.getProcessInspection(),update:s=>group.userData.update(s)};
}
function withPort(fn){const group=createPort({THREE:T,geography});try{return fn(group,fixture(group));}finally{release(group);}}

check('independent port evidence shows two vessels entirely seaward and four hidden cargo slots',()=>withPort((group,f)=>{
  const ring=geography.footprintLocal;
  for(const b of f.layouts){const corners=b.ship.corners;assert.ok(corners.every(p=>!pointInRing(p,ring)));assert.ok(ring.every(p=>!pointInRing(p,corners)));for(const [a,b]of edges(corners))for(const[c,d]of edges(ring))assert.ok(segmentDistance(a,b,c,d)>0,'Ship hull crosses mapped land');}
  const evidence=f.inspect();assert.equal(evidence.capacity,4);assert.equal(evidence.cargo.length,4);assert.equal(evidence.cargo.filter(c=>c.visible).length,0);assert.ok(recursivelyFrozen(evidence));
}));

check('four cargo identities remain in stable bounded slots when input order changes',()=>withPort((group,f)=>{
  const cargo=Array.from({length:4},(_,i)=>f.cargo(i));const input=snapshot(cargo),before=JSON.stringify(input);f.update(input);
  const first=f.inspect();assert.equal(first.cargo.filter(c=>c.visible).length,4);assert.equal(new Set(first.cargo.map(c=>c.cargoId)).size,4);
  f.update(snapshot([...cargo].reverse()));const next=f.inspect();
  for(const a of first.cargo){const b=next.cargo.find(c=>c.cargoId===a.cargoId);assert.equal(b.slot,a.slot);close(b.worldPosition,a.worldPosition);}
  assert.equal(JSON.stringify(input),before);assert.ok(recursivelyFrozen(next));
}));

check('world cargo poses apply facility placement exactly once',()=>withPort((group,f)=>{
  group.position.set(713,-241,7);group.rotation.z=.43;f.update(snapshot([f.cargo(0)]));
  const visible=f.inspect().cargo.find(c=>c.visible),anchor=f.bindings.find(a=>a.id===visible.anchorId);
  const expected=new T.Vector3(...anchor.position).applyMatrix4(group.matrixWorld).toArray();close(visible.worldPosition,expected);
}));

check('crane endpoints meet explicit anchors and trailer ownership removes the port representation',()=>withPort((group,f)=>{
  const start=f.bindings.find(a=>a.id==='ship-0-slot-0').position,end=f.bindings.find(a=>a.id==='deck-0').position;
  f.update(snapshot([f.cargo(0,'crane',0)]));close(f.inspect().cargo.find(c=>c.visible).position,start);
  f.update(snapshot([f.cargo(0,'crane',1)]));close(f.inspect().cargo.find(c=>c.visible).position,end);
  f.update(snapshot([f.cargo(0,'trailer')]));assert.equal(f.inspect().cargo.filter(c=>c.visible).length,0,'Port retains a cloned load after trailer handoff');
}));

check('port poses depend on explicit process progress and replay identically',()=>withPort((group,f)=>{
  const input=snapshot([f.cargo(0,'crane',.36)],12);f.update(input);const initial=f.inspect();
  f.update(snapshot([f.cargo(0,'crane',.36)],900));assert.deepEqual(f.inspect(),initial,'Wall time advanced cargo without a changed process input');
  f.update(snapshot([f.cargo(0,'crane',.87)],22));f.update(input);assert.deepEqual(f.inspect(),initial);
  group.userData.setDetailLevel('detail');assert.deepEqual(f.inspect(),initial);group.userData.setDetailLevel('overview');assert.deepEqual(f.inspect(),initial);
}));

check('duplicate identity, excess capacity and competing hoist claims leave no visible ghost load',()=>withPort((group,f)=>{
  f.update(snapshot([f.cargo(0)]));assert.equal(f.inspect().cargo.filter(c=>c.visible).length,1);
  f.update(snapshot([f.cargo(0),f.cargo(0)]));assert.equal(f.inspect().status,'invalid-duplicate-cargo');assert.equal(f.inspect().cargo.filter(c=>c.visible).length,0);
  f.update(snapshot([f.cargo(0,'crane'),f.cargo(1,'crane')]));assert.equal(f.inspect().status,'invalid-hoist-occupancy');assert.equal(f.inspect().cargo.filter(c=>c.visible).length,0);
  f.update(snapshot(Array.from({length:5},(_,i)=>({...f.cargo(i%4),id:`excess-${i}`}))));assert.equal(f.inspect().status,'invalid-cargo-capacity');assert.equal(f.inspect().cargo.filter(c=>c.visible).length,0);
}));

check('malformed attachment facts and missing snapshots clear old cargo instead of inventing motion',()=>withPort((group,f)=>{
  const cargo=f.cargo(0);f.update(snapshot([cargo]));assert.equal(f.inspect().cargo.filter(c=>c.visible).length,1);
  f.update(snapshot([{...cargo,attachment:{parentId:'wrong-owner',anchorId:cargo.owner.anchorId}}]));assert.equal(f.inspect().cargo.filter(c=>c.visible).length,0);
  f.update(snapshot([cargo]));f.update({timeSeconds:3e6});assert.equal(f.inspect().status,'idle-awaiting-snapshot');assert.equal(f.inspect().cargo.filter(c=>c.visible).length,0);
}));

check('transport pallet geometry preserves the agreed physical size and bottom-support origin',async()=>{
  const {createPalletCargo}=await import(pathToFileURL(resolve(portRoot,'src/render/facilities/port/process-assets.js')));
  const cargo=createPalletCargo(T);
  try{
    cargo.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(cargo);
    close(bounds.min.toArray(),[-.595,-.5,0],1e-5);close(bounds.max.toArray(),[.595,.5,.677],1e-5);
    assert.deepEqual(cargo.scale.toArray(),[1,1,1]);assert.equal(cargo.userData.origin,'pallet-bottom-center');
    for(const support of [8.5,1.33,.975]){cargo.position.z=support;cargo.updateMatrixWorld(true);const b=new T.Box3().setFromObject(cargo);assert.ok(Math.abs(b.min.z-support)<1e-5);assert.ok(Math.abs(b.max.z-support-.677)<1e-5);}
  }finally{release(cargo);}
});

check('external cargo rendering keeps resolved crane poses while suppressing every local duplicate',()=>withPort((group,f)=>{
  f.update(snapshot([f.cargo(0,'crane',.4)]));const before=f.inspect().cargo.find(c=>c.cargoId);assert.equal(before.visible,true);
  group.userData.setCargoRenderer('external');f.update(snapshot([f.cargo(0,'crane',.4)]));const during=f.inspect(),same=during.cargo.find(c=>c.cargoId===before.cargoId);
  assert.equal(during.cargoRenderer,'external');assert.equal(during.cargo.filter(c=>c.visible).length,0);close(same.worldPosition,before.worldPosition);
  assert.deepEqual(same.owner,before.owner);assert.equal(same.transferId,before.transferId);
  group.userData.setCargoRenderer('local');const after=f.inspect();assert.equal(after.cargo.filter(c=>c.visible).length,1);close(after.cargo.find(c=>c.visible).worldPosition,before.worldPosition);
}));
