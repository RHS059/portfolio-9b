import test from 'node:test';
import assert from 'node:assert/strict';
import {createPort} from './index.js';
let THREE;try{THREE=await import(process.env.FLEET_THREE_MODULE||'three');}catch(error){if(process.env.FLEET_THREE_MODULE)throw error;}
const check=(name,fn)=>test(name,{skip:THREE?false:'Actual Three module required'},fn);
const geography={footprintLocal:[[0,0],[600,0],[600,500],[0,500],[0,0]],quayLocal:[[0,0],[600,0]],quayAlongUnit:[1,0],quayLandwardUnit:[0,1],yardLanes:[{id:'lane',points:[[0,250],[600,250]]}]};
check('missing geography returns an explicit empty tagged group',()=>{const g=createPort({THREE});assert.equal(g.userData.status,'geography-unavailable');assert.equal(g.userData.siteId,'oict');assert.equal(g.children.length,0);});
check('mapped assets stay at local origin with no opaque terminal pad',()=>{const g=createPort({THREE,geography});assert.equal(g.userData.status,'mapped');assert.deepEqual(g.position.toArray(),[0,0,0]);assert.deepEqual(g.scale.toArray(),[1,1,1]);assert.equal(g.getObjectByName('mapped-terminal-outline').children.filter(c=>c.isMesh).length,0);});
check('default overview is instanced and detail changes geometry visibility only',()=>{
 const g=createPort({THREE,geography}),far=g.getObjectByName('representative-container-rows'),near=g.getObjectByName('representative-containers');assert.ok(far.isInstancedMesh&&near.isInstancedMesh);assert.equal(far.parent.visible,true);assert.equal(near.parent.visible,false);const layout=g.userData.layout;g.userData.setDetailLevel('detail');assert.equal(far.parent.visible,false);assert.equal(near.parent.visible,true);assert.equal(g.userData.layout,layout);
});
check('disposal blocks detail updates and leaves GPU cleanup to renderer',()=>{
 const g=createPort({THREE,geography});let freed=0;g.traverse(o=>o.geometry?.addEventListener('dispose',()=>freed++));g.userData.dispose();g.userData.dispose();g.userData.setDetailLevel('detail');assert.equal(g.userData.detailLevel,'overview');assert.equal(freed,0);assert.ok(g.children.length>0);
});
function configureProcess(g) {
 const bindings=g.userData.processAnchors.flatMap((b,i)=>[
  ...b.pickupSlots.map((s,j)=>({id:`ship-${i}-slot-${j}`,parentId:`SHIP-${i}`,ownerKind:'ship',berthIndex:i,position:s.position})),
  {id:`crane-${i}-hook`,parentId:`CRANE-${i}`,ownerKind:'crane',berthIndex:i,position:b.pickup.position},
  {id:`trailer-${i}-deck`,parentId:`TRAILER-${i}`,ownerKind:'trailer',berthIndex:i,position:[b.trailer.position[0],b.trailer.position[1],b.trailer.position[2]]},
 ]);
 g.userData.setProcessAnchorBindings(bindings);return bindings;
}
const shipCargo=(i=0,j=0)=>({id:`CARGO-${i}-${j}`,owner:{kind:'ship',id:`SHIP-${i}`,anchorId:`ship-${i}-slot-${j}`},attachment:{parentId:`SHIP-${i}`,anchorId:`ship-${i}-slot-${j}`},transferId:`T-${i}-${j}`});
const craneCargo=(p=.5,i=0)=>({...shipCargo(i),owner:{kind:'crane',id:`CRANE-${i}`,anchorId:`crane-${i}-hook`},attachment:{parentId:`CRANE-${i}`,anchorId:`crane-${i}-hook`},motion:{fromAnchorId:`ship-${i}-slot-0`,toAnchorId:`trailer-${i}-deck`,progress:p}});
check('two ships and four tracked slots are bounded and idle without explicit cargo input',()=>{
 const g=createPort({THREE,geography});configureProcess(g);assert.equal(g.userData.processAnchors.length,2);
 const before=g.userData.getProcessInspection();g.userData.update({timeSeconds:999999});assert.deepEqual(g.userData.getProcessInspection(),before);
 assert.equal(before.capacity,4);assert.ok(before.cargo.every(c=>!c.visible));
 let draws=0,meshes=0;g.traverse(o=>{if(o.isMesh||o.isLineSegments)draws++;if(o.userData.kind==='process-cargo')meshes++;});assert.ok(draws<=57,`bounded to 57 draws; found ${draws}`);assert.equal(meshes,4);
});
check('explicit snapshots move one cargo ID and exactly one crane; trailer handoff hides the port copy',()=>{
 const g=createPort({THREE,geography});configureProcess(g);g.userData.update({process:{cargo:[shipCargo()]}});
 const first=g.userData.getProcessInspection().cargo.find(c=>c.visible);assert.equal(first.cargoId,'CARGO-0-0');
 g.userData.update({process:{cargo:[craneCargo(.5)]}});const carried=g.userData.getProcessInspection().cargo.filter(c=>c.visible);assert.equal(carried.length,1);assert.equal(carried[0].cargoId,first.cargoId);assert.equal(carried[0].owner.kind,'crane');assert.equal(carried[0].position[2],30);
 const trailers={...shipCargo(),owner:{kind:'trailer',id:'TRAILER-0',anchorId:'trailer-0-deck'},attachment:{parentId:'TRAILER-0',anchorId:'trailer-0-deck'}};
 g.userData.update({process:{cargo:[trailers]}});assert.ok(g.userData.getProcessInspection().cargo.every(c=>!c.visible));
});
check('pause, repeated updates, backwards replay and input reordering are deterministic',()=>{
 const g=createPort({THREE,geography});configureProcess(g);
 const snap={paused:true,timeSeconds:40,process:{cargo:[craneCargo(.5),shipCargo(1,0)]}},original=JSON.stringify(snap);
 g.userData.update(snap);const a=g.userData.getProcessInspection();
 for(let i=0;i<10;i++)g.userData.update({...snap,timeSeconds:999+i});assert.deepEqual(g.userData.getProcessInspection(),a);
 g.userData.update({process:{cargo:snap.process.cargo.slice().reverse()}});assert.deepEqual(g.userData.getProcessInspection(),a);
 g.userData.update({process:{cargo:[craneCargo(1)]}});g.userData.update(snap);assert.deepEqual(g.userData.getProcessInspection(),a);assert.equal(JSON.stringify(snap),original);
 assert.ok(Object.isFrozen(a.cargo[0].worldPosition));
});
check('malformed duplicate IDs and concurrent claims on the same hoist fail closed',()=>{
 const g=createPort({THREE,geography});configureProcess(g);
 g.userData.update({process:{cargo:[shipCargo(),shipCargo()]}});assert.equal(g.userData.processStatus,'invalid-duplicate-cargo');assert.ok(g.userData.getProcessInspection().cargo.every(c=>!c.visible));
 g.userData.update({process:{cargo:[craneCargo(),{...craneCargo(),id:'SECOND'}]}});assert.equal(g.userData.processStatus,'invalid-hoist-occupancy');assert.ok(g.userData.getProcessInspection().cargo.every(c=>!c.visible));
});
check('disposal freezes motion and allocates or releases no renderer-owned resources',()=>{
 const g=createPort({THREE,geography});configureProcess(g);g.userData.update({process:{cargo:[craneCargo(.25)]}});let freed=0;g.traverse(o=>o.geometry?.addEventListener('dispose',()=>freed++));g.userData.dispose();const before=g.userData.getProcessInspection();g.userData.update({process:{cargo:[craneCargo(.9)]}});assert.deepEqual(g.userData.getProcessInspection(),before);assert.equal(freed,0);assert.equal(g.userData.setProcessAnchorBindings([]),false);
});
check('external renderer mode drives the crane while hiding all local cargo copies',()=>{
 const g=createPort({THREE,geography});configureProcess(g);g.userData.setCargoRenderer('external');g.userData.update({process:{cargo:[craneCargo(.5)]}});const info=g.userData.getProcessInspection();assert.equal(info.cargoRenderer,'external');assert.ok(info.cargo.every(c=>!c.visible));assert.equal(info.cargo.filter(c=>c.cargoId).length,1);assert.equal(info.cargo.find(c=>c.cargoId).position[2],30);
 g.userData.setCargoRenderer('local');assert.equal(g.userData.getProcessInspection().cargo.filter(c=>c.visible).length,1);
});
check('palletized kit uses exact factory support-origin envelope rather than a shipping container',()=>{
 const g=createPort({THREE,geography});configureProcess(g);g.userData.update({process:{cargo:[shipCargo()]}});const cargo=g.getObjectByName('tracked-port-cargo-slot-1');cargo.position.set(0,0,0);cargo.rotation.set(0,0,0);g.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(cargo);const size=bounds.getSize(new THREE.Vector3());assert.ok(Math.abs(size.x-1.19)<1e-5);assert.ok(Math.abs(size.y-1)<1e-5);assert.ok(Math.abs(size.z-.677)<1e-5);assert.ok(Math.abs(bounds.min.z)<1e-6);
});
check('explicit cargo yaw preserves attachment orientation without a vehicle-axis assumption',()=>{
 const g=createPort({THREE,geography}),bindings=configureProcess(g).map(a=>({...a,rotationZ:.73}));g.userData.setProcessAnchorBindings(bindings);g.userData.update({process:{cargo:[craneCargo(.5)]}});const visible=g.userData.getProcessInspection().cargo.find(c=>c.visible);assert.ok(Math.abs(visible.worldQuaternion[2]-Math.sin(.73/2))<1e-9);assert.ok(Math.abs(visible.worldQuaternion[3]-Math.cos(.73/2))<1e-9);
});
