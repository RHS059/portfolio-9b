import test from 'node:test';import assert from 'node:assert/strict';
import{resolve}from'node:path';import{pathToFileURL,fileURLToPath}from'node:url';
const root=process.env.FLEET_DEMO_ROOT||fileURLToPath(new URL('../../',import.meta.url)),factoryRoot=process.env.FLEET_FACTORY_ROOT||root;
const load=(base,p)=>import(pathToFileURL(resolve(base,p)));let T;
try{T=await import(process.env.FLEET_THREE_MODULE||'three');}catch(e){if(process.env.FLEET_THREE_MODULE||e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
const[{createFactory},{createOpeningCarton,createForklift},{createAssemblyProduct},{createFactoryWorker},{sampleCargoProcess}]=await Promise.all([
load(factoryRoot,'src/render/facilities/factory/index.js'),load(factoryRoot,'src/render/facilities/factory/equipment.js'),load(factoryRoot,'src/render/facilities/factory/product.js'),load(factoryRoot,'src/render/facilities/factory/worker.js'),load(root,'src/core/cargo-process.js')]);
const check=(name,fn)=>test(name,{skip:T?false:'Actual Three runtime is required'},fn);
const near=(a,b,epsilon=1e-5)=>assert.ok(Math.hypot(...a.map((n,i)=>n-b[i]))<=epsilon,`${a} != ${b}`);
function release(group){group.userData.dispose?.();const gs=new Set(),ms=new Set();group.traverse(o=>{if(o.geometry)gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)ms.add(m);});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());}
function withFactory(fn){const f=createFactory({THREE:T});f.userData.setDetailLevel('detail');try{return fn(f);}finally{release(f);}}
const world=(f,point)=>new T.Vector3(...point).applyMatrix4(f.matrixWorld).toArray();
function instanceAt(group,point,size){let count=0;group.updateWorldMatrix(true,true);group.traverse(o=>{if(!o.isInstancedMesh)return;const m=new T.Matrix4(),p=new T.Vector3(),s=new T.Vector3(),q=new T.Quaternion();for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);m.premultiply(o.matrixWorld).decompose(p,q,s);if(p.distanceTo(new T.Vector3(...point))<1e-5&&s.distanceTo(new T.Vector3(...size))<1e-5)count++;}});return count;}

check('all four cell mounts and floor supports stay in the declared site-root space',()=>withFactory(f=>{
  assert.deepEqual(f.position.toArray(),[0,0,0]);const mounts=f.userData.getCellMounts();assert.equal(mounts.length,4);
  f.position.set(251,-187,3);f.rotation.z=.37;f.updateWorldMatrix(true,true);
  for(const m of mounts){assert.equal(m.input[2],1.225);assert.equal(m.output[2],1.7);for(const kind of['input','output'])near(f.userData.getMount(`cell:${m.id}:${kind}`).getWorldPosition(new T.Vector3()).toArray(),world(f,m[kind]));}
  const scene=new T.Group();scene.add(f);f.position.set(0,0,0);f.rotation.z=0;scene.updateMatrixWorld(true);
  for(const[x,y]of[[0,-40],[-65.3,-49.45],[-49.3,-49.45]]){const ray=new T.Raycaster(new T.Vector3(x,y,.75),new T.Vector3(0,0,-1));const hit=ray.intersectObjects(f.children,true).find(h=>h.object.isMesh);assert.ok(hit);near(hit.point.toArray(),[x,y,.25]);}
}));

check('gripper world contact meets actual animated flap edges across every cell and flap',()=>withFactory(f=>{
  f.position.set(251,-187,3);f.rotation.z=.37;
  const carton=createOpeningCarton({THREE:T});f.add(carton);const mounts=f.userData.getCellMounts();let contacts=0;
  for(let slot=0;slot<4;slot++)for(let frame=0;frame<=128;frame++){
    const p=frame/128,m=mounts[slot];carton.position.set(m.input[0],m.input[1],m.input[2]+.19);carton.userData.setOpen(p);
    f.userData.update({process:sampleCargoProcess(slot*32+88+6*p),timeSeconds:999});f.updateWorldMatrix(true,true);
    const state=f.userData.getAssemblyState().find(c=>c.id===m.id);if(!state.contactEngaged)continue;
    const side=carton.userData.openingState.side,flap=carton.children.find(c=>c.userData.side===side);assert.ok(flap);
    const local=side==='right'?[-.39,0,0]:side==='left'?[.39,0,0]:side==='front'?[0,-.29,0]:[0,.29,0];
    const actualEdge=new T.Vector3(...local).applyMatrix4(flap.matrixWorld).toArray();near(world(f,state.tool),actualEdge);contacts++;
  }
  assert.ok(contacts>250,'Check actual engaged flap contact, not just idle hover');carton.parent.remove(carton);release(carton);
}));

check('each assembly part has exclusive source, gripper or product custody at sampled transitions',()=>withFactory(f=>{
  const box=createOpeningCarton({THREE:T}),product=createAssemblyProduct({THREE:T}),m=f.userData.getCellMounts()[0];
  box.position.set(m.input[0],m.input[1],m.input[2]+.19);product.position.fromArray(m.output);f.add(box,product);const detail=f.getObjectByName('factory-close-detail');
  for(let op=0;op<10;op++)for(const phase of[.01,.159,.161,.4,.679,.681,.99]){
    const p=(op+phase)/10;box.userData.setAssemblyProgress(p);product.userData.setProgress(p);f.userData.update({process:sampleCargoProcess(94+24*p)});f.updateWorldMatrix(true,true);
    const state=f.userData.getAssemblyState()[0],part=product.userData.partMounts[op];assert.equal(state.partId,part.id);
    const source=box.userData.pickupMount.children.filter(c=>c.visible).length,held=instanceAt(detail,world(f,state.tool),part.size),installed=instanceAt(product,world(f,part.point.map((n,i)=>n+m.output[i])),part.size);
    assert.equal(source+(state.carrying?held:0)+(product.userData.installedPartIds.includes(part.id)?installed:0),1,`Part ${part.id} phase ${phase} duplicates or disappears`);
    assert.equal(source,phase<.16?1:0);assert.equal(held,phase>.16&&phase<.68?1:0);assert.equal(installed,phase>.68?1:0);assert.equal(state.carrying,phase>.16&&phase<.68);assert.equal(product.userData.installedPartIds.includes(part.id),phase>.68);
  }
  for(const phase of[.16,.68])for(let op=0;op<10;op++){
    const p=(op+phase)/10;box.userData.setAssemblyProgress(p);f.userData.update({process:sampleCargoProcess(94+24*p)});f.updateWorldMatrix(true,true);const state=f.userData.getAssemblyState()[0];
    const expected=phase===.16?box.userData.pickupMount.getWorldPosition(new T.Vector3()).toArray():world(f,product.userData.partMounts[op].point.map((n,i)=>n+m.output[i]));near(world(f,state.tool),expected);
  }
  f.remove(box,product);release(box);release(product);
}));

check('connected factory has no private cargo clones and repeated snapshots preserve actual pose buffers',()=>withFactory(f=>{
  const process=sampleCargoProcess(102.5,{paused:true}),before=JSON.stringify(process);f.userData.update({process});
  const capture=()=>{f.updateMatrixWorld(true);const result=[];f.traverse(o=>{if(o.isInstancedMesh)result.push([o.name,o.count,...o.instanceMatrix.array.slice(0,o.count*16)]);});return result;};
  const initial=capture();f.userData.update({timeSeconds:1e9,process});assert.deepEqual(capture(),initial);assert.equal(JSON.stringify(process),before);assert.deepEqual(f.userData.getHandledCargoIds(),[]);
  let privateCrates=0;f.traverse(o=>{if(o.name==='parts-carton'||o.name==='tracked-port-palletized-kit')privateCrates++;});assert.equal(privateCrates,0);
  f.userData.setDetailLevel('overview');f.userData.update({process:sampleCargoProcess(117)});f.userData.setDetailLevel('detail');const end=capture();assert.notDeepEqual(end,initial);f.userData.update({process});assert.deepEqual(capture(),initial);
}));

check('seated forklift operator keeps body geometry and unit scale while boots clear the platform and head clears the guard',()=>{
  const forklift=createForklift({THREE:T}),worker=createFactoryWorker({THREE:T});
  try{
    const body=worker.getObjectByName('worker-body'),before=body.children.filter(c=>c.geometry).map(c=>Array.from(c.geometry.getAttribute('position').array));
    worker.userData.update({seated:true});assert.deepEqual(worker.scale.toArray(),[1,1,1]);assert.deepEqual(body.scale.toArray(),[1,1,1]);assert.deepEqual(body.children.filter(c=>c.geometry).map(c=>Array.from(c.geometry.getAttribute('position').array)),before);
    forklift.position.z=.25;forklift.userData.seatMount.add(worker);forklift.updateMatrixWorld(true);let min=Infinity,max=-Infinity;
    worker.traverse(o=>{if(!o.geometry)return;const p=o.geometry.getAttribute('position');for(let i=0;i<(o.isInstancedMesh?o.count:1);i++){const m=o.matrixWorld.clone();if(o.isInstancedMesh){const instance=new T.Matrix4();o.getMatrixAt(i,instance);m.multiply(instance);}for(let j=0;j<p.count;j++){const v=new T.Vector3().fromBufferAttribute(p,j).applyMatrix4(m);min=Math.min(min,v.z);max=Math.max(max,v.z);}}});
    assert.ok(min>=.25+forklift.userData.operatorFootSupportZ-.02);assert.ok(max<.25+2.23);
  }finally{release(forklift);}
});
