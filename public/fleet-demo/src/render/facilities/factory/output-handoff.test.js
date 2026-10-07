import test from 'node:test';
import assert from 'node:assert/strict';
import {createFactory} from './index.js';
import {factoryCellView} from './process-view.js';
import {outputHandoffPose,OUTPUT_HANDOFF} from './output-handoff.js';
let THREE;
try { THREE=await import(process.env.FLEET_THREE_MODULE||'three'); }
catch(error) { if(process.env.FLEET_THREE_MODULE)throw error; }
const check=(name,fn)=>test(name,{skip:THREE?false:'Actual Three required'},fn);
const near=(a,b,t=1e-6)=>assert.ok(Math.hypot(...a.map((x,i)=>x-b[i]))<t,`${a} != ${b}`);
const cell=p=>({id:'frame-jig',active:true,stage:'complete',armAction:'handoff-output',outputTransferProgress:p,outputProductId:'DRONE-CARGO-01-B0001'});

test('outgoing action reads only explicit transfer progress and product identity',()=>{
 const snapshot={process:{factoryAssembly:{cells:[cell(.5)]}}},before=JSON.stringify(snapshot);
 const view=factoryCellView(snapshot,'frame-jig');
 assert.equal(view.armAction,'handoff-output');assert.equal(view.outputTransferProgress,.5);
 assert.equal(view.outputProductId,'DRONE-CARGO-01-B0001');assert.equal(view.cargoId,null);
 assert.equal(JSON.stringify(snapshot),before);assert.ok(Object.isFrozen(view));
 assert.equal(factoryCellView({process:{factoryAssembly:{cells:[{...cell(undefined),progress:.8}]}}},'frame-jig').outputTransferProgress,0);
});
test('carrier remains at assembly support before grasp and reaches exact AMR support after release',()=>{
 near(outputHandoffPose(0).productSupport,[0,0,1.53]);near(outputHandoffPose(.1).productSupport,[0,0,1.53]);
 near(outputHandoffPose(1).productSupport,[-3,-4,1.225]);
 for(let i=0;i<=100;i++){const p=outputHandoffPose(i/100);assert.equal(p.tool,null);assert.equal(p.gripPoint,null);assert.equal(p.contactAccepted,false);assert.equal(p.transferReady,false);}
 assert.ok(Object.isFrozen(outputHandoffPose(.5).productSupport));
});
check('factory exposes site-root carrier/pickup and paired QA/dispatch mount nodes',()=>{
 const f=createFactory({THREE});
 for(const c of f.userData.getCellMounts()){assert.equal(c.output[2],1.7);assert.equal(c.carrier[2],1.53);assert.equal(c.pickup[2],1.225);near(f.userData.getMount('cell:'+c.id+':carrier-output').position.toArray(),c.carrier);near(f.userData.getMount('cell:'+c.id+':dispatch-pickup').position.toArray(),c.pickup);}
 for(const [id,point] of [['qa:QA-01:CARGO-01:input',[37,26,1.225]],['qa:QA-01:test',[42,26,1.225]],['qa:QA-01:output',[47,26,1.225]],['dispatch:DISPATCH-01:input',[50,-12,1.225]],['dispatch:DISPATCH-01:pickup',[50,-16,1.225]],['dispatch:DISPATCH-02:pickup',[62,-16,1.225]]])near(f.userData.getMount(id).position.toArray(),point);
});
check('actual jig and roller meshes meet their declared support heights',()=>{
 const f=createFactory({THREE});f.userData.setDetailLevel('detail');f.updateMatrixWorld(true);
 const meshes=[];f.traverseVisible(o=>{if(o.isMesh&&!o.isInstancedMesh)meshes.push(o);});
 const points=[[-16,5,1.53],[9,5,1.53],[37,26,1.225],[42,26,1.225],[47,26,1.225],[50,-12,1.225],[50,-16,1.225],[62,-12,1.225],[62,-16,1.225]];
 for(const [x,y,z]of points){const ray=new THREE.Raycaster(new THREE.Vector3(x,y,z+.1),new THREE.Vector3(0,0,-1));const hits=ray.intersectObjects(meshes);assert.ok(hits.length,`No support at ${x},${y}`);assert.ok(Math.abs(hits[0].point.z-z)<1e-5,`Support at ${x},${y}: ${hits[0].point.z} != ${z}`);}
});
check('QA portal leaves the full-size aircraft passage above its roller plane clear',()=>{
 const f=createFactory({THREE});f.userData.setDetailLevel('detail');f.updateMatrixWorld(true);
 const meshes=[];f.traverseVisible(o=>{if(o.isMesh)meshes.push(o);});
 for(const y of[24.55,25,26,27,27.45])for(const z of[1.24,1.4,1.7,2,2.3]){
  const ray=new THREE.Raycaster(new THREE.Vector3(36.7,y,z),new THREE.Vector3(1,0,0),0,10.6);
  assert.equal(ray.intersectObjects(meshes).length,0,`Blocked QA passage at y=${y},z=${z}`);
 }
});
check('unverified outgoing contact cannot move the arm or expose an accepted product support',()=>{
 const f=createFactory({THREE});let original,parked;
 for(const p of[0,.12,.3,.65,.9,1,.3]){
  f.userData.setCellPoses([cell(p)]);const actual=f.userData.getAssemblyState()[0],expected=f.userData.getOutputHandoff('frame-jig',p);
  if(parked)near(actual.tool,parked);else parked=actual.tool;assert.equal(actual.productSupport,null);assert.equal(actual.contactEngaged,false);assert.equal(actual.contactAccepted,false);assert.equal(actual.handoffPending,true);assert.equal(expected.transferReady,false);assert.equal(actual.outputProductId,cell(p).outputProductId);
  f.userData.setDetailLevel('detail');f.userData.setDetailLevel('overview');assert.deepEqual(f.userData.getHandledCargoIds(),[]);
  if(p===.3){if(original)assert.deepEqual(actual,original);else original=actual;}
 }
});
