import test from 'node:test';import assert from 'node:assert/strict';
import{resolve}from'node:path';import{pathToFileURL,fileURLToPath}from'node:url';
import{pointInRing,edges,intersects}from'./geometry-assertions.mjs';
const root=process.env.FLEET_FACTORY_ROOT||process.env.FLEET_DEMO_ROOT||fileURLToPath(new URL('../../',import.meta.url));
const load=p=>import(pathToFileURL(resolve(root,p)));let T;try{T=await import(process.env.FLEET_THREE_MODULE||'three');}catch(e){if(process.env.FLEET_THREE_MODULE||e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
const[{createFactory},{createProductCarrier,PRODUCT_CARRIER},{sampleOutputTransfer}]=await Promise.all([load('src/render/facilities/factory/index.js'),load('src/render/facilities/factory/carrier.js'),load('src/render/facilities/factory/output-handoff.js')]);
const check=(name,fn)=>test(name,{skip:T?false:'Actual Three runtime is required'},fn),near=(a,b,e=1e-5)=>assert.ok(Math.hypot(...a.map((n,i)=>n-b[i]))<e,`${a} != ${b}`);
const input=(id,p,extra={})=>({id,active:true,stage:'complete',armAction:'handoff-output',outputTransferProgress:p,outputProductId:'PRODUCT-ACCEPTANCE',...extra});
function release(root){root.userData.dispose?.();const gs=new Set(),ms=new Set();root.traverse(o=>{if(o.geometry)gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)ms.add(m);});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());}
function meshParts(root){root.updateWorldMatrix(true,true);const parts=[];root.traverseVisible(o=>{if(!o.isMesh)return;for(let i=0;i<(o.isInstancedMesh?o.count:1);i++){const matrix=o.matrixWorld.clone();if(o.isInstancedMesh){const local=new T.Matrix4();o.getMatrixAt(i,local);matrix.multiply(local);}const p=o.geometry.getAttribute('position'),vertices=[];for(let n=0;n<p.count;n++)vertices.push(new T.Vector3().fromBufferAttribute(p,n).applyMatrix4(matrix));parts.push({name:o.name,type:o.geometry.type,matrix,vertices,index:o.geometry.index,box:new T.Box3().setFromPoints(vertices)});}});return parts;}
function tris(parts){return parts.flatMap(p=>{const out=[],count=p.index?p.index.count:p.vertices.length;for(let i=0;i<count;i+=3){const v=[0,1,2].map(j=>p.vertices[p.index?p.index.getX(i+j):i+j]);out.push({name:p.name,v,box:new T.Box3().setFromPoints(v)});}return out;});}
function crosses(a,b){
  if(!a.box.intersectsBox(b.box))return false;const ray=new T.Ray(),hit=new T.Vector3();
  for(const[from,to]of[[a,b],[b,a]])for(let i=0;i<3;i++){const start=from.v[i],end=from.v[(i+1)%3],delta=end.clone().sub(start),length=delta.length();if(length<1e-9)continue;ray.set(start,delta.divideScalar(length));if(ray.intersectTriangle(...to.v,false,hit)){const distance=hit.distanceTo(start);if(distance>1e-6&&distance<length-1e-6)return true;}}
  const normal=a.v[1].clone().sub(a.v[0]).cross(a.v[2].clone().sub(a.v[0]));if(normal.lengthSq()<1e-14)return false;normal.normalize();if(b.v.some(v=>Math.abs(v.clone().sub(a.v[0]).dot(normal))>1e-6))return false;
  const drop=['x','y','z'].sort((x,y)=>Math.abs(normal[y])-Math.abs(normal[x]))[0],axes=['x','y','z'].filter(x=>x!==drop),project=v=>axes.map(x=>v[x]),pa=a.v.map(project),pb=b.v.map(project);
  return pa.some(p=>pointInRing(p,pb))||pb.some(p=>pointInRing(p,pa))||edges(pa).some(([p,q])=>edges(pb).some(([r,s])=>intersects(p,q,r,s)));
}
function vertexInsideArm(vertex,part){if(!part.box.containsPoint(vertex))return false;const v=vertex.clone().applyMatrix4(part.matrix.clone().invert()),e=1e-5;if(part.type==='BoxGeometry')return Math.abs(v.x)<.5-e&&Math.abs(v.y)<.5-e&&Math.abs(v.z)<.5-e;if(part.type==='CylinderGeometry')return v.x*v.x+v.y*v.y<(.5-e)**2&&Math.abs(v.z)<.5-e;if(part.type==='SphereGeometry')return v.length()<.5-e;return false;}
function setup(){const f=createFactory({THREE:T}),c=createProductCarrier({THREE:T});f.userData.setDetailLevel('detail');c.userData.setProgress(1);f.add(c);return{f,c,dispose:()=>release(f)};}

check('canonical carrier preserves true scale, physical bounds and the same drone mount across assembly and transfer',()=>{
 const{f,c,dispose}=setup();try{const box=new T.Box3();meshParts(c).forEach(p=>box.union(p.box));near(box.min.toArray(),PRODUCT_CARRIER.combinedBounds.min);near(box.max.toArray(),PRODUCT_CARRIER.combinedBounds.max);assert.deepEqual(c.userData.bounds,PRODUCT_CARRIER.combinedBounds);assert.deepEqual(c.userData.frameBounds,PRODUCT_CARRIER.bounds);near(c.userData.bodyMount.position.toArray(),[0,0,.17]);assert.deepEqual(c.scale.toArray(),[1,1,1]);assert.equal(c.userData.carrierModel,'original-drone-carrier-v1');for(const p of[0,.3,.8,1]){c.userData.setProgress(p);near(c.userData.bodyMount.position.toArray(),[0,0,.17]);assert.deepEqual(c.userData.body.scale.toArray(),[1,1,1]);}}finally{dispose();}
});

check('complete carrier/drone and all arm parts clear actual fixtures through dense handoff samples',()=>{
 const{f,c,dispose}=setup();try{
  const fixed=tris(meshParts(f.getObjectByName('assembly-station-solids'))),armRoot=f.getObjectByName('assembly-articulation');
  const samples=[...Array.from({length:129},(_,i)=>i/128),...['.055','.095','.12','.3','.65','.9','.925','.94'].flatMap(Number).flatMap(p=>[p-1e-6,p,p+1e-6])];let checked=0;
  for(const cell of f.userData.getCellMounts())for(const p of samples){
    f.userData.setCellPoses([input(cell.id,p)]);const pose=f.userData.getOutputHandoff(cell.id,p);c.position.fromArray(pose.carrierPosition);f.updateWorldMatrix(true,true);
    const droneParts=meshParts(c.userData.body),drone=tris(droneParts),armParts=meshParts(armRoot),arm=tris(armParts),bodyBox=new T.Box3();droneParts.forEach(p=>bodyBox.union(p.box));
    let uppers=0,forearms=0;for(const actor of armParts){const scale=new T.Vector3();actor.matrix.decompose(new T.Vector3(),new T.Quaternion(),scale);if(Math.abs(scale.x-.42)<1e-5&&Math.abs(scale.y-.48)<1e-5){near([scale.z],[2.25]);uppers++;}if(Math.abs(scale.x-.28)<1e-5&&Math.abs(scale.y-.34)<1e-5){near([scale.z],[2]);forearms++;}}assert.equal(uppers,4);assert.equal(forearms,4);const nearbyArm=arm.filter(a=>a.box.intersectsBox(bodyBox));for(const a of drone)for(const b of nearbyArm)assert.ok(!crosses(a,b),`${cell.id} p=${p}: drone ${a.name} crosses arm ${b.name}`);
    for(const part of droneParts)for(const actor of armParts.filter(a=>a.box.intersectsBox(part.box)))for(const v of part.vertices)assert.ok(!vertexInsideArm(v,actor),`${cell.id} p=${p}: drone vertex lies inside ${actor.name}`);
    const carrier=tris(meshParts(c)),bounds=new T.Box3();carrier.forEach(t=>bounds.union(t.box));const nearbyFixed=fixed.filter(t=>t.box.intersectsBox(bounds));
    for(const a of carrier)for(const b of nearbyFixed){if(Math.min(a.box.max.z,b.box.max.z)-Math.max(a.box.min.z,b.box.min.z)<1e-6)continue;assert.ok(!crosses(a,b),`${cell.id} p=${p}: carrier crosses ${b.name}`);}
    checked++;
  }
  assert.ok(checked>=600);
 }finally{dispose();}
});

check('actual side-handle and jaw faces meet under rotated site placement, then release without a pose jump',()=>{
 const{f,c,dispose}=setup();try{f.position.set(713,-225,4);f.rotation.z=.43;const id=f.userData.getCellMounts()[0].id;
  for(const p of[.12,.2,.4,.65,.8,.9]){f.userData.setCellPoses([input(id,p)]);const pose=f.userData.getOutputHandoff(id,p);c.position.fromArray(pose.carrierPosition);f.updateWorldMatrix(true,true);assert.equal(pose.contactAccepted,true);assert.equal(pose.transferReady,true);
   const origin=c.localToWorld(new T.Vector3(-1.25,0,.14)),arm=[],handle=[];f.getObjectByName('assembly-articulation').traverseVisible(o=>{if(o.isMesh)arm.push(o);});c.getObjectByName('product-carrier-frame').traverseVisible(o=>{if(o.isMesh)handle.push(o);});
   for(const sign of[-1,1]){const direction=new T.Vector3(sign,0,0).applyQuaternion(f.quaternion),ray=new T.Raycaster(origin,direction,0,.15),a=ray.intersectObjects(arm)[0],h=ray.intersectObjects(handle)[0];assert.ok(a&&h);near(a.point.toArray(),h.point.toArray());near([a.distance],[.06]);}
  }
  const start=sampleOutputTransfer(0),end=sampleOutputTransfer(1);near(start.tool,end.tool);assert.equal(end.contactEngaged,false);near(end.carrierPosition,[-3,-4,1.225]);
  for(const p of[.055,.095,.12,.3,.65,.9,.925,.94]){const a=sampleOutputTransfer(p-1e-7),b=sampleOutputTransfer(p+1e-7);near(a.tool,b.tool);near(a.carrierPosition,b.carrierPosition);}
 }finally{dispose();}
});


check('independent mesh guard detects crossing, coplanar and enclosed geometry with separated controls',()=>{
 const tri=points=>{const v=points.map(p=>new T.Vector3(...p));return{v,box:new T.Box3().setFromPoints(v)};};
 const flat=tri([[-1,-1,0],[1,-1,0],[0,1,0]]);
 assert.equal(crosses(flat,tri([[0,-.5,-1],[0,-.5,1],[0,.5,0]])),true);
 assert.equal(crosses(flat,tri([[-.1,-.1,0],[.1,-.1,0],[0,.1,0]])),true);
 assert.equal(crosses(flat,tri([[-1,-1,2],[1,-1,2],[0,1,2]])),false);
 const cube={type:'BoxGeometry',matrix:new T.Matrix4(),box:new T.Box3(new T.Vector3(-.5,-.5,-.5),new T.Vector3(.5,.5,.5))};assert.equal(vertexInsideArm(new T.Vector3(0,0,0),cube),true);assert.equal(vertexInsideArm(new T.Vector3(.5,0,0),cube),false);assert.equal(vertexInsideArm(new T.Vector3(2,0,0),cube),false);
});


check('actual AMR bodies dock beside the fixed QA/dispatch beds and expose the matching carrier plane',async()=>{
 const{createRollerAMR}=await load('src/render/facilities/factory/equipment.js'),f=createFactory({THREE:T}),robot=createRollerAMR({THREE:T});f.userData.setDetailLevel('detail');f.userData.setCellPoses([]);f.updateWorldMatrix(true,true);
 const fixed=tris(meshParts(f.getObjectByName('assembly-station-solids')));f.add(robot);
 try{for(const[x,y]of[[37,26],[47,26],[50,-12],[62,-12]])for(let turn=0;turn<8;turn++){
  robot.position.set(x,y,.25);robot.rotation.z=turn*Math.PI/4;f.updateWorldMatrix(true,true);const mobile=tris(meshParts(robot)),bounds=new T.Box3();mobile.forEach(t=>bounds.union(t.box));const nearby=fixed.filter(t=>t.box.intersectsBox(bounds));
  for(const a of mobile)for(const b of nearby){if(Math.min(a.box.max.z,b.box.max.z)-Math.max(a.box.min.z,b.box.min.z)<1e-6)continue;assert.ok(!crosses(a,b),`AMR at ${x},${y} yaw=${turn} intersects ${b.name}`);}
  const meshes=[];robot.traverseVisible(o=>{if(o.isMesh)meshes.push(o);});const ray=new T.Raycaster(new T.Vector3(x,y,1.305),new T.Vector3(0,0,-1)),hit=ray.intersectObjects(meshes)[0];assert.ok(hit);near(hit.point.toArray(),[x,y,1.225]);near(robot.userData.payloadMount.getWorldPosition(new T.Vector3()).toArray(),[x,y,1.225]);
 }}finally{release(f);}
});
