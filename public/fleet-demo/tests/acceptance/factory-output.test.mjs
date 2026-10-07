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

check('outgoing carrier, QA and dispatch mounts match the agreed site-root coordinates',()=>withFactory(f=>{
  for(const c of f.userData.getCellMounts()){
    near(c.carrier,[c.output[0],c.output[1],1.53]);near(c.output,[c.carrier[0],c.carrier[1],1.7]);near(c.pickup,[c.carrier[0]-3,c.carrier[1]-4,1.225]);
    near(f.userData.getMount(`cell:${c.id}:carrier-output`).position.toArray(),c.carrier);near(f.userData.getMount(`cell:${c.id}:dispatch-pickup`).position.toArray(),c.pickup);
  }
  for(const[id,p]of targets)near(f.userData.getMount(id).position.toArray(),p);
  for(let i=1;i<=4;i++)near(f.userData.getMount(`qa:QA-01:CARGO-0${i}:input`).position.toArray(),[37,26,1.225]);
}));

check('actual carrier table and station rollers meet support planes after one geographic transform',()=>withFactory(f=>{
  f.userData.setDetailLevel('detail');f.position.set(143,-231,2);f.rotation.z=.41;f.updateWorldMatrix(true,true);
  const meshes=[];f.traverseVisible(o=>{if(o.isMesh&&!o.isInstancedMesh)meshes.push(o);});
  const points=[...f.userData.getCellMounts().map(c=>c.carrier),...targets.map(([,p])=>p)];
  for(const p of points){const expected=new T.Vector3(...p).applyMatrix4(f.matrixWorld),ray=new T.Raycaster(expected.clone().add(new T.Vector3(0,0,.08)),new T.Vector3(0,0,-1)),hit=ray.intersectObjects(meshes)[0];assert.ok(hit,`No actual support under ${p}`);near(hit.point.toArray(),expected.toArray());}
}));

check('unverified outgoing contact stays disabled and cannot be enabled by snapshot fields',()=>withFactory(f=>{
  f.userData.setDetailLevel('detail');
  const capture=()=>{const states=[];f.traverse(o=>{if(o.isInstancedMesh)states.push([o.name,o.count,...o.instanceMatrix.array.slice(0,o.count*16)]);});return states;};
  for(const c of f.userData.getCellMounts()){
    let parked,buffers;
    for(let i=0;i<=200;i++){
      const p=i/200,input=Object.freeze([{...stage(c.id,p),transferReady:true,contactAccepted:true,gripPoint:[0,0,.17]}]);f.userData.setCellPoses(input);
      const state=f.userData.getAssemblyState().find(s=>s.id===c.id),hint=f.userData.getOutputHandoff(c.id,p);
      assert.equal(state.outputProductId,`product-${c.id}`);assert.equal(state.handoffPending,true);assert.equal(state.productSupport,null);assert.equal(state.contactEngaged,false);assert.equal(state.contactAccepted,false);
      assert.equal(hint.transferReady,false);assert.equal(hint.contactAccepted,false);assert.equal(hint.gripPoint,null);assert.equal(hint.tool,null);assert.equal(hint.contact,null);
      if(parked){near(state.tool,parked);assert.deepEqual(capture(),buffers);}else{parked=state.tool;buffers=capture();}
      assert.deepEqual(f.userData.getHandledCargoIds(),[]);
    }
  }
}));

check('provisional carrier path is immutable and continuous without implying a usable physical handoff',()=>withFactory(f=>{
  for(const c of f.userData.getCellMounts()){
    near(f.userData.getOutputHandoff(c.id,0).carrierPosition,c.carrier);near(f.userData.getOutputHandoff(c.id,1).carrierPosition,c.pickup);
    const a=f.userData.getOutputHandoff(c.id,.47),before=JSON.stringify(a);assert.ok(Object.isFrozen(a));assert.ok(Object.isFrozen(a.carrierPosition));
    f.userData.getOutputHandoff(c.id,1);f.userData.getOutputHandoff(c.id,0);assert.deepEqual(f.userData.getOutputHandoff(c.id,.47),a);assert.equal(JSON.stringify(a),before);
    for(const p of[.12,.3,.65,.9])near(f.userData.getOutputHandoff(c.id,p-1e-7).carrierPosition,f.userData.getOutputHandoff(c.id,p+1e-7).carrierPosition,1e-5);
    assert.equal(a.transferReady,false);assert.equal(a.coordinateSpace,'site-root');
  }
  const id=f.userData.getCellMounts()[0].id,input=Object.freeze([stage(id,.47)]);f.userData.setCellPoses(input);f.userData.setDetailLevel('detail');const original=f.userData.getAssemblyState();
  f.userData.update({timeSeconds:1e9,paused:true,process:{factoryAssembly:{cells:input}}});assert.deepEqual(f.userData.getAssemblyState(),original);
  f.userData.setDetailLevel('overview');f.userData.setCellPoses([stage(id,1)]);f.userData.setDetailLevel('detail');f.userData.setCellPoses(input);assert.deepEqual(f.userData.getAssemblyState(),original);
}));

check('actual finished-drone envelope clears the entire QA passage at unchanged scale',async()=>{
  const{createAssemblyProduct}=await load('src/render/facilities/factory/product.js'),product=createAssemblyProduct({THREE:T});product.userData.setProgress(1);product.updateWorldMatrix(true,true);
  function eachMeshMatrix(root,fn){root.traverseVisible(o=>{if(!o.isMesh)return;if(o.isInstancedMesh){for(let i=0;i<o.count;i++){const m=new T.Matrix4();o.getMatrixAt(i,m);fn(o,m.premultiply(o.matrixWorld));}}else fn(o,o.matrixWorld);});}
  const body=new T.Box3();eachMeshMatrix(product,(mesh,m)=>{const p=mesh.geometry.getAttribute('position');for(let i=0;i<p.count;i++)body.expandByPoint(new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(m));});
  assert.deepEqual(product.scale.toArray(),[1,1,1]);assert.ok(Math.max(body.max.x-body.min.x,body.max.y-body.min.y)>2.5,'Use the complete deployed aircraft, not an incoming carton');
  // The explicit .17 offset is drone skid-base above carrier bottom. This checks
  // the drone only; combined cradle/gripper clearance remains blocked separately.
  const swept=new T.Box3(new T.Vector3(37+body.min.x,26+body.min.y,1.225+.17+body.min.z),new T.Vector3(47+body.max.x,26+body.max.y,1.225+.17+body.max.z));
  try{withFactory(f=>{
    f.userData.setDetailLevel('detail');f.userData.setCellPoses([]);f.updateWorldMatrix(true,true);const collisions=[];
    eachMeshMatrix(f,(mesh,m)=>{const p=mesh.geometry.getAttribute('position'),index=mesh.geometry.index,n=index?index.count:p.count;
      for(let i=0;i<n;i+=3){const vs=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,index?index.getX(i+j):i+j).applyMatrix4(m));if(swept.intersectsTriangle(new T.Triangle(...vs))){collisions.push(mesh.name);break;}}
    });
    assert.deepEqual([...new Set(collisions)],[],'QA fixture intersects the true-scale swept drone envelope');
  });}finally{release(product);}
});
