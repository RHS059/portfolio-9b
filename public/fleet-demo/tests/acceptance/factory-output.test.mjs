import test from 'node:test';import assert from 'node:assert/strict';
import{resolve}from'node:path';import{pathToFileURL,fileURLToPath}from'node:url';
const root=process.env.FLEET_FACTORY_ROOT||process.env.FLEET_DEMO_ROOT||fileURLToPath(new URL('../../',import.meta.url));
const load=p=>import(pathToFileURL(resolve(root,p)));let T;
try{T=await import(process.env.FLEET_THREE_MODULE||'three');}catch(e){if(process.env.FLEET_THREE_MODULE||e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
const{createFactory}=await load('src/render/facilities/factory/index.js');
const check=(name,fn)=>test(name,{skip:T?false:'Actual Three runtime is required'},fn);
const near=(a,b,e=1e-5)=>assert.ok(Math.hypot(...a.map((n,i)=>n-b[i]))<e,`${a} != ${b}`);
function release(g){g.userData.dispose?.();const gs=new Set(),ms=new Set();g.traverse(o=>{if(o.geometry)gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)ms.add(m);});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());}
function withFactory(fn){const f=createFactory({THREE:T});try{return fn(f);}finally{release(f);}}
const stage=(id,p)=>Object.freeze({id,active:true,stage:'complete',armAction:'handoff-output',outputTransferProgress:p,outputProductId:`product-${id}`});
const targets=[['qa:QA-01:input',[37,26,1.225]],['qa:QA-01:test',[42,26,1.225]],['qa:QA-01:output',[47,26,1.225]],['dispatch:DISPATCH-01:input',[50,-12,1.225]],['dispatch:DISPATCH-01:pickup',[50,-16,1.225]],['dispatch:DISPATCH-02:input',[62,-12,1.225]],['dispatch:DISPATCH-02:pickup',[62,-16,1.225]]];
const fixedTargets=[['qa:QA-01:roller-input',[37.855,26,1.225]],['qa:QA-01:test',[42,26,1.225]],['qa:QA-01:roller-output',[46.145,26,1.225]],['dispatch:DISPATCH-01:roller-input',[50,-12.855,1.225]],['dispatch:DISPATCH-01:pickup',[50,-16,1.225]],['dispatch:DISPATCH-02:roller-input',[62,-12.855,1.225]],['dispatch:DISPATCH-02:pickup',[62,-16,1.225]]];

check('outgoing carrier, QA and dispatch mounts match the agreed site-root coordinates',()=>withFactory(f=>{
  for(const c of f.userData.getCellMounts()){
    near(c.carrier,[c.output[0],c.output[1],1.53]);near(c.output,[c.carrier[0],c.carrier[1],1.7]);near(c.pickup,[c.carrier[0]-3,c.carrier[1]-4,1.225]);
    near(f.userData.getMount(`cell:${c.id}:carrier-output`).position.toArray(),c.carrier);near(f.userData.getMount(`cell:${c.id}:dispatch-pickup`).position.toArray(),c.pickup);
  }
  for(const[id,p]of [...targets,...fixedTargets])near(f.userData.getMount(id).position.toArray(),p);
  for(let i=1;i<=4;i++)near(f.userData.getMount(`qa:QA-01:CARGO-0${i}:input`).position.toArray(),[37,26,1.225]);
}));

check('actual carrier table and station rollers meet support planes after one geographic transform',()=>withFactory(f=>{
  f.userData.setDetailLevel('detail');f.position.set(143,-231,2);f.rotation.z=.41;f.updateWorldMatrix(true,true);
  const meshes=[];f.traverseVisible(o=>{if(o.isMesh&&!o.isInstancedMesh)meshes.push(o);});
  const points=[...f.userData.getCellMounts().map(c=>c.carrier),...fixedTargets.map(([,p])=>p)];
  for(const p of points){const expected=new T.Vector3(...p).applyMatrix4(f.matrixWorld),ray=new T.Raycaster(expected.clone().add(new T.Vector3(0,0,.08)),new T.Vector3(0,0,-1)),hit=ray.intersectObjects(meshes)[0];assert.ok(hit,`No actual support under ${p}`);near(hit.point.toArray(),expected.toArray());}
}));

check('canonical output handoff requires an explicit product identity and shares the renderer pose',()=>withFactory(f=>{
  f.userData.setDetailLevel('detail');
  for(const c of f.userData.getCellMounts()){
    for(const p of[0,.12,.3,.47,.65,.9,1]){
      f.userData.setCellPoses([stage(c.id,p)]);const state=f.userData.getAssemblyState().find(s=>s.id===c.id),pose=f.userData.getOutputHandoff(c.id,p);
      assert.equal(state.outputProductId,`product-${c.id}`);assert.equal(state.handoffPending,false);near(state.productSupport,pose.carrierPosition);near(state.tool,pose.tool);assert.equal(state.contactAccepted,true);assert.equal(state.contactEngaged,pose.contactEngaged);assert.equal(pose.carrierModel,'original-drone-carrier-v1');assert.equal(pose.transferReady,true);assert.deepEqual(f.userData.getHandledCargoIds(),[]);
    }
    let parked;
    for(const p of[.2,.6,1]){f.userData.setCellPoses([{...stage(c.id,p),outputProductId:null,contactAccepted:true,transferReady:true}]);const state=f.userData.getAssemblyState().find(s=>s.id===c.id);assert.equal(state.productSupport,null);assert.equal(state.contactAccepted,false);assert.equal(state.carryingProduct,false);if(parked)near(state.tool,parked);else parked=state.tool;}
  }
}));

check('canonical carrier path is immutable, continuous and preserves paused and replayed mechanism poses',()=>withFactory(f=>{
  for(const c of f.userData.getCellMounts()){
    near(f.userData.getOutputHandoff(c.id,0).carrierPosition,c.carrier);near(f.userData.getOutputHandoff(c.id,1).carrierPosition,c.pickup);
    const a=f.userData.getOutputHandoff(c.id,.47),before=JSON.stringify(a);assert.ok(Object.isFrozen(a));assert.ok(Object.isFrozen(a.carrierPosition));
    f.userData.getOutputHandoff(c.id,1);f.userData.getOutputHandoff(c.id,0);assert.deepEqual(f.userData.getOutputHandoff(c.id,.47),a);assert.equal(JSON.stringify(a),before);
    for(const p of[.055,.095,.12,.3,.65,.9,.925,.94]){const a=f.userData.getOutputHandoff(c.id,p-1e-7),b=f.userData.getOutputHandoff(c.id,p+1e-7);near(a.carrierPosition,b.carrierPosition,1e-5);near(a.tool,b.tool,1e-5);}
    assert.equal(a.transferReady,true);assert.equal(a.coordinateSpace,'site-root');
  }
  const id=f.userData.getCellMounts()[0].id,input=Object.freeze([stage(id,.47)]);f.userData.setCellPoses(input);f.userData.setDetailLevel('detail');const original=f.userData.getAssemblyState();
  f.userData.update({timeSeconds:1e9,paused:true,process:{factoryAssembly:{cells:input}}});assert.deepEqual(f.userData.getAssemblyState(),original);
  f.userData.setDetailLevel('overview');f.userData.setCellPoses([stage(id,1)]);f.userData.setDetailLevel('detail');f.userData.setCellPoses(input);assert.deepEqual(f.userData.getAssemblyState(),original);
}));

check('actual combined carrier and finished-drone envelope clears the QA passage at unchanged scale',async()=>{
  const{createProductCarrier}=await load('src/render/facilities/factory/carrier.js'),product=createProductCarrier({THREE:T});product.userData.setProgress(1);product.updateWorldMatrix(true,true);
  function eachMeshMatrix(root,fn){root.traverseVisible(o=>{if(!o.isMesh)return;if(o.isInstancedMesh){for(let i=0;i<o.count;i++){const m=new T.Matrix4();o.getMatrixAt(i,m);fn(o,m.premultiply(o.matrixWorld));}}else fn(o,o.matrixWorld);});}
  const body=new T.Box3();eachMeshMatrix(product,(mesh,m)=>{const p=mesh.geometry.getAttribute('position');for(let i=0;i<p.count;i++)body.expandByPoint(new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(m));});
  assert.deepEqual(product.scale.toArray(),[1,1,1]);assert.ok(Math.max(body.max.x-body.min.x,body.max.y-body.min.y)>2.5,'Use the complete deployed aircraft, not an incoming carton');
  // The canonical combined model already includes the .17 drone-base offset.
  // Ignore exact bottom support contact while rejecting any volume penetration.
  const swept=new T.Box3(new T.Vector3(37+body.min.x,26+body.min.y,1.225+body.min.z+1e-5),new T.Vector3(47+body.max.x,26+body.max.y,1.225+body.max.z));
  try{withFactory(f=>{
    f.userData.setDetailLevel('detail');f.userData.setCellPoses([]);f.updateWorldMatrix(true,true);const collisions=[];
    eachMeshMatrix(f,(mesh,m)=>{const p=mesh.geometry.getAttribute('position'),index=mesh.geometry.index,n=index?index.count:p.count;
      for(let i=0;i<n;i+=3){const vs=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,index?index.getX(i+j):i+j).applyMatrix4(m));if(swept.intersectsTriangle(new T.Triangle(...vs))){collisions.push(mesh.name);break;}}
    });
    assert.deepEqual([...new Set(collisions)],[],'QA fixture intersects the true-scale swept drone envelope');
  });}finally{release(product);}
});
