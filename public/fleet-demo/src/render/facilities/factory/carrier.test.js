import test from 'node:test';import assert from 'node:assert/strict';
import {createProductCarrier,PRODUCT_CARRIER} from './carrier.js';
import {createFactory} from './index.js';import {sampleOutputTransfer} from './output-handoff.js';import {assemblyPose} from './cycle.js';
import {createRollerAMR} from './equipment.js';
let T;try{T=await import(process.env.FLEET_THREE_MODULE||'three');}catch(e){if(process.env.FLEET_THREE_MODULE)throw e;}
const check=(name,fn)=>test(name,{skip:T?false:'Actual Three required'},fn),near=(a,b,e=1e-6)=>assert.ok(Math.hypot(...a.map((x,i)=>x-b[i]))<e,`${a} != ${b}`);
function triangles(root){const out=[];root.updateMatrixWorld(true);root.traverseVisible(o=>{if(!o.isMesh)return;const a=o.geometry.getAttribute('position'),idx=o.geometry.index?.array;
 for(let n=0;n<(o.isInstancedMesh?o.count:1);n++){const m=o.matrixWorld.clone();if(o.isInstancedMesh){const local=new T.Matrix4();o.getMatrixAt(n,local);m.multiply(local);}const vs=[];for(let i=0;i<a.count;i++)vs.push(new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(m));for(let i=0;i<(idx?.length||a.count);i+=3){const points=[0,1,2].map(j=>vs[idx?idx[i+j]:i+j]);out.push({name:o.name,index:n,points,box:new T.Box3().setFromPoints(points)});}}
 });return out;}
function intersects(a,b){if(!a.box.intersectsBox(b.box))return false;const edges=p=>[p[1].clone().sub(p[0]),p[2].clone().sub(p[1]),p[0].clone().sub(p[2])],ea=edges(a.points),eb=edges(b.points),na=ea[0].clone().cross(ea[1]),nb=eb[0].clone().cross(eb[1]),axes=[na,nb,...ea.flatMap(e=>eb.map(f=>e.clone().cross(f))),...ea.map(e=>e.clone().cross(na)),...eb.map(e=>e.clone().cross(nb))];
 for(const axis of axes){if(axis.lengthSq()<1e-16)continue;axis.normalize();const pa=a.points.map(p=>p.dot(axis)),pb=b.points.map(p=>p.dot(axis));if(Math.max(...pa)<Math.min(...pb)-1e-7||Math.max(...pb)<Math.min(...pa)-1e-7)return false;}return true;}
const cell=p=>({id:'frame-jig',active:false,stage:'complete',armAction:'handoff-output',outputTransferProgress:p,outputProductId:'DRONE-TEST'});

check('original carrier has a fixed skid mount, bounded frame and accessible side grip',()=>{
 const c=createProductCarrier({THREE:T});near(c.userData.bodyMount.position.toArray(),[0,0,.17]);near(c.userData.gripMount.position.toArray(),[-1.25,0,.17]);
 const box=new T.Box3();for(const t of triangles(c.getObjectByName('product-carrier-frame')))box.union(t.box);
 near(box.min.toArray(),PRODUCT_CARRIER.bounds.min);near(box.max.toArray(),PRODUCT_CARRIER.bounds.max);
 c.userData.setProgress(1);const full=new T.Box3();for(const t of triangles(c))full.union(t.box);near(full.min.toArray(),c.userData.bounds.min);near(full.max.toArray(),c.userData.bounds.max);assert.equal(c.userData.body.userData.installedPartIds.length,10);assert.deepEqual(c.scale.toArray(),[1,1,1]);
});
check('side-grip transfer preserves actual arm link lengths and endpoint continuity',()=>{
 for(let i=0;i<=800;i++){const h=sampleOutputTransfer(i/800),p=assemblyPose({tool:h.tool.map((v,j)=>v-(j===2?.25:0)),wristLift:h.wristLift});near([Math.hypot(...p.shoulder.map((v,j)=>v-p.elbow[j]))],[2.25]);near([Math.hypot(...p.elbow.map((v,j)=>v-p.wrist[j]))],[2]);}
 near(sampleOutputTransfer(0).tool,sampleOutputTransfer(1).tool);assert.equal(sampleOutputTransfer(0).wristLift,.55);assert.equal(sampleOutputTransfer(1).wristLift,.55);
});
check('the actual finished drone never intersects any moving arm triangle during handoff',()=>{
 const f=createFactory({THREE:T}),c=createProductCarrier({THREE:T});f.userData.setDetailLevel('detail');c.userData.setProgress(1);f.add(c);
 for(let i=0;i<=100;i++){const p=i/100;f.userData.setCellPoses([cell(p)]);const h=f.userData.getOutputHandoff('frame-jig',p);c.position.fromArray(h.carrierPosition);f.updateMatrixWorld(true);const body=triangles(c.userData.body),arm=triangles(f.getObjectByName('assembly-articulation'));
  for(const a of body)for(const b of arm)if(intersects(a,b))assert.fail(`Arm intersects aircraft at progress ${p}: body ${a.name}/${a.index} ${a.box.min.toArray()}..${a.box.max.toArray()} arm ${b.name}/${b.index} ${b.box.min.toArray()}..${b.box.max.toArray()}`);
 }
});
check('renderer carrier grip and factory tool coincide only during explicit engagement',()=>{
 const f=createFactory({THREE:T}),c=createProductCarrier({THREE:T});f.userData.setDetailLevel('detail');f.add(c);
 for(const p of[.12,.2,.3,.5,.65,.8,.9]){f.userData.setCellPoses([cell(p)]);const h=f.userData.getOutputHandoff('frame-jig',p);c.position.fromArray(h.carrierPosition);f.updateMatrixWorld(true);near(c.userData.gripMount.getWorldPosition(new T.Vector3()).toArray(),f.userData.getAssemblyState()[0].tool);assert.equal(f.userData.getAssemblyState()[0].contactEngaged,true);}
});
check('actual jaw faces touch the actual carrier handle after geographic rotation',()=>{
 const f=createFactory({THREE:T}),c=createProductCarrier({THREE:T});f.userData.setDetailLevel('detail');f.position.set(100,-200,4);f.rotation.z=.43;f.add(c);
 for(const p of[.12,.2,.3,.5,.65,.8,.9]){
  f.userData.setCellPoses([cell(p)]);const h=f.userData.getOutputHandoff('frame-jig',p);c.position.fromArray(h.carrierPosition);f.updateMatrixWorld(true);
  const origin=c.localToWorld(new T.Vector3(-1.25,0,.14)),arm=[],frame=[];
  f.getObjectByName('assembly-articulation').traverse(o=>{if(o.isMesh)arm.push(o);});c.getObjectByName('product-carrier-frame').traverse(o=>{if(o.isMesh)frame.push(o);});
  for(const sign of[-1,1]){const direction=new T.Vector3(sign,0,0).applyQuaternion(f.getWorldQuaternion(new T.Quaternion())),ray=new T.Raycaster(origin,direction,0,.2),jaw=ray.intersectObjects(arm)[0],handle=ray.intersectObjects(frame)[0];assert.ok(jaw&&handle);near([jaw.distance],[.06],1e-5);near([handle.distance],[.06],1e-5);near(jaw.point.toArray(),handle.point.toArray(),1e-5);}
 }
});
check('carrier and aircraft clear the actual jig and fixtures throughout the full sweep',()=>{
 const f=createFactory({THREE:T}),c=createProductCarrier({THREE:T});f.userData.setDetailLevel('detail');c.userData.setProgress(1);f.add(c);f.updateMatrixWorld(true);
 const broad=new T.Box3(new T.Vector3(-21, -.5,1.2),new T.Vector3(-14,7,3.1));
 const fixed=triangles(f.getObjectByName('assembly-station-solids')).filter(t=>t.box.intersectsBox(broad));
 for(let i=0;i<=100;i++){
  const p=i/100,h=f.userData.getOutputHandoff('frame-jig',p);c.position.fromArray(h.carrierPosition);f.updateMatrixWorld(true);
  for(const a of triangles(c))for(const b of fixed){if(Math.min(a.box.max.z,b.box.max.z)-Math.max(a.box.min.z,b.box.min.z)<1e-6)continue;if(intersects(a,b))assert.fail(`Carrier/fixture collision at ${p}`);}
 }
});
check('carrier appearance replays exactly without moving the renderer-owned root or cloning products',()=>{
 const c=createProductCarrier({THREE:T});c.position.set(12,3,.7);const buffers=()=>{const out=[];c.traverse(o=>{if(o.instanceMatrix)out.push(Array.from(o.instanceMatrix.array));});return out;};
 c.userData.setProgress(1);const complete=buffers();c.userData.setProgress(.2);c.userData.setProgress(1);assert.deepEqual(buffers(),complete);near(c.position.toArray(),[12,3,.7]);
 let bodies=0;c.traverse(o=>{if(o.name==='assembly-product')bodies++;});assert.equal(bodies,1);
 c.userData.dispose();c.userData.setProgress(0);assert.deepEqual(buffers(),complete);
});
check('the combined carrier keeps a bounded draw budget and renderer-owned resource disposal',()=>{
 const c=createProductCarrier({THREE:T});c.userData.setProgress(1);let calls=0,faces=0,freed=0;
 c.traverseVisible(o=>{if(!o.geometry)return;calls++;if(o.isMesh)faces+=(o.geometry.index?.count||o.geometry.getAttribute('position').count)/3*(o.isInstancedMesh?o.count:1);o.geometry.addEventListener('dispose',()=>freed++);});
 assert.ok(calls<=10);assert.ok(faces<3000);c.userData.dispose();assert.equal(freed,0);
});
check('actual AMR bodies fit beside the fixed QA and dispatch roller beds',()=>{
 const f=createFactory({THREE:T});f.userData.setDetailLevel('detail');f.updateMatrixWorld(true);const fixed=triangles(f.getObjectByName('assembly-station-solids'));
 for(const [x,y,yaw]of[[37,26,-Math.PI/2],[47,26,Math.PI/2],[50,-12,Math.PI],[62,-12,Math.PI]]){
  const amr=createRollerAMR({THREE:T});amr.position.set(x,y,.25);amr.rotation.z=yaw;f.add(amr);f.updateMatrixWorld(true);
  for(const a of triangles(amr))for(const b of fixed)if(intersects(a,b))assert.fail(`AMR intersects fixed machinery at ${x},${y}`);
  f.remove(amr);
 }
});
