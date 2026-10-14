import test from 'node:test';
import assert from 'node:assert/strict';
import {createDetailedVehicle,detailedWheelLayout,wheelAngleForDistance,DETAIL_DRAW_BUDGET,DETAIL_GROUND_CONTACT,DETAIL_MODEL_METADATA} from '../../src/render/vehicles/detail-model.js';
import {WheelTravelTracker} from '../../src/render/vehicles/wheel-motion.js';
let T;try {T=await import(process.env.FLEET_THREE_MODULE||'three');}catch{}
const actual=(name,fn)=>test(name,{skip:!T?'Set FLEET_THREE_MODULE to pinned Three r128':false},fn);
const near=(a,b,tolerance=1e-6)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
function renderedBounds(group) {
  group.updateMatrixWorld(true);const result=new T.Box3(),matrix=new T.Matrix4();
  group.traverse(o=>{if(!o.geometry)return;o.geometry.computeBoundingBox();
    if(o.isInstancedMesh)for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);matrix.premultiply(o.matrixWorld);result.union(o.geometry.boundingBox.clone().applyMatrix4(matrix));}
    else result.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
  });return result;
}
function triangleCount(group) {let count=0;group.traverse(o=>{if(o.geometry)count+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3*(o.isInstancedMesh?o.count:1);});return count;}

test('wheel rotation is signed travel/radius, independent of elapsed wall time',()=>{
 near(wheelAngleForDistance(Math.PI*.5),-Math.PI);near(wheelAngleForDistance(-.5),1);
 near(wheelAngleForDistance(Math.PI),0);near(wheelAngleForDistance(NaN),0);near(wheelAngleForDistance(1,0),0);
});
test('semi has five axles and eighteen circular wheels; van has four',()=>{
 const layout=detailedWheelLayout();assert.equal(layout.length,18);assert.equal(new Set(layout.map(w=>w.y)).size,5);
 for(const wheel of layout)near(wheel.z-wheel.radius,DETAIL_GROUND_CONTACT);
 // Existing workshop rails: X ±1.35, width .5, Y ±8.5. At least each
 // axle's outer tire contact is supported, including the rear trailer tandem.
 for(const wheel of layout.filter(w=>Math.abs(w.x)>1.1)){assert.ok(Math.abs(wheel.y)<8.5);assert.ok(Math.abs(wheel.x)>=1.1&&Math.abs(wheel.x)<=1.6);}
 assert.equal(detailedWheelLayout('van').length,4);
 for(const wheel of detailedWheelLayout('van'))near(wheel.z-wheel.radius,DETAIL_GROUND_CONTACT);
});
test('wheel tracker uses actual travel, inverse root scale, pause and reverse',()=>{
 const tracker=new WheelTravelTracker(),base={id:'TRK',routeId:'delivery',heading:0,x:0,y:0,progress:0};
 assert.equal(tracker.sample(base,{timeSeconds:0}),0);
 near(tracker.sample({...base,y:1},{timeSeconds:1,scale:2}),.5);
 near(tracker.sample({...base,y:1},{timeSeconds:2,paused:true,scale:2}),.5);
 near(tracker.sample({...base,y:0},{timeSeconds:3,scale:2}),0);
});
test('wheel tracker rebases replay, route switch, wrap, teleport, and removed entities',()=>{
 const tracker=new WheelTravelTracker(),base={id:'TRK',routeId:'delivery',heading:0,x:0,y:0,progress:.2};
 tracker.sample(base,{timeSeconds:10});assert.equal(tracker.sample({...base,y:2},{timeSeconds:11}),2);
 assert.equal(tracker.sample(base,{timeSeconds:0}),0);
 assert.equal(tracker.sample({...base,y:3,routeId:'depot-bay'},{timeSeconds:1}),0);
 assert.equal(tracker.sample({...base,y:200,routeId:'depot-bay'},{timeSeconds:2}),0);
 assert.equal(tracker.sample({...base,y:201,routeId:'depot-bay',progress:.9},{timeSeconds:3}),0);
 tracker.retain([]);assert.equal(tracker.states.size,0);tracker.sample(base);tracker.reset();assert.equal(tracker.states.size,0);
});
actual('actual r128 close semi geometry has glass, grille, mirrors, coupling, fenders, rim spokes and door details',()=>{
 assert.equal(T.REVISION,'128');const model=createDetailedVehicle({THREE:T});
 const names=model.group.userData.features;
 for(const name of ['sloped-windshield','side-window','sleeper-cab','tapered-hood','grille-slat','headlight-lens','mirror-housing','cab-step','front-fender','fifth-wheel-coupling','axle','inset-alloy-rim','rim-spoke-opening','wheel-lug','rear-doors'])assert.ok(names.includes(name),name);
 assert.equal(model.group.userData.wheelCount,18);assert.equal(model.wheelBatches.length,3);
 assert.ok(model.group.children.length<=DETAIL_DRAW_BUDGET);assert.ok(triangleCount(model.group)<30000);
 model.group.traverse(o=>{if(!o.geometry)return;for(const attr of ['position','normal'])assert.ok(o.geometry.getAttribute(attr).array.every(Number.isFinite));assert.equal(o.material.side,T.DoubleSide);assert.equal(o.material.vertexColors,false);});
 const bounds=renderedBounds(model.group);near(bounds.min.z,.05);assert.ok(bounds.max.y<7.5);assert.ok(bounds.min.y> -10.5);assert.ok(bounds.max.z<4.4);assert.ok(bounds.max.x<1.8);
 model.dispose();
});
actual('actual wheel instances visibly rotate rim geometry, pause exactly and rewind deterministically',()=>{
 const model=createDetailedVehicle({THREE:T}),mesh=model.wheelBatches.find(o=>o.name.endsWith('ink'));
 const a=new T.Matrix4(),b=new T.Matrix4(),c=new T.Matrix4();mesh.getMatrixAt(0,a);
 const p=new T.Vector3(.18,.242,.072).applyMatrix4(a);
 model.setDistance(.325);mesh.getMatrixAt(0,b);assert.notDeepEqual(b.elements,a.elements);
 assert.ok(p.distanceTo(new T.Vector3(.18,.242,.072).applyMatrix4(b))>.1);
 const version=mesh.instanceMatrix.version;model.setDistance(.325);mesh.getMatrixAt(0,c);assert.deepEqual(c.elements,b.elements);assert.equal(mesh.instanceMatrix.version,version);
 model.setDistance(0);mesh.getMatrixAt(0,c);assert.deepEqual(c.elements,a.elements);
 for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,c);near(c.elements[12],model.wheelLayout[i].x);near(c.elements[13],model.wheelLayout[i].y);near(c.elements[14],model.wheelLayout[i].z);}
 model.dispose();
});
actual('actual van geometry uses four circular wheels at its own travel/radius',()=>{
 const model=createDetailedVehicle({THREE:T,kind:'van'});assert.equal(model.wheelLayout.length,4);const bounds=renderedBounds(model.group);near(bounds.min.z,.05);
 assert.ok(model.group.userData.features.includes('cargo-door-seam'));assert.ok(model.group.children.length<=DETAIL_DRAW_BUDGET);
 const ray=new T.Raycaster(new T.Vector3(0,10,2.569),new T.Vector3(0,-1,0));
 assert.equal(ray.intersectObjects(model.group.children,true)[0]?.object.name,'van-body-glass','windshield must sit outside the sloping body, not be buried');
 model.setDistance(.37);const matrix=new T.Matrix4();model.wheelBatches[0].getMatrixAt(0,matrix);near(matrix.elements[5],Math.cos(1)*.74);model.dispose();
});
actual('detail buffers and materials dispose once; updates allocate no new geometry',()=>{
 const model=createDetailedVehicle({THREE:T});const geometries=new Set(),materials=new Set();let disposed=0;
 model.group.traverse(o=>{if(o.geometry){geometries.add(o.geometry);o.geometry.addEventListener('dispose',()=>disposed++);}if(o.material){materials.add(o.material);o.material.addEventListener('dispose',()=>disposed++);}});
 for(let i=0;i<100;i++)model.setDistance(i/10);model.dispose();model.dispose();model.setDistance(11);
 assert.equal(disposed,geometries.size+materials.size);assert.ok(geometries.size<=DETAIL_DRAW_BUDGET);
});

actual('immutable model metadata bounds every transformed vertex and separates axle centers from support contacts',()=>{
 for(const kind of ['truck','van']) {
  const metadata=DETAIL_MODEL_METADATA[kind],model=createDetailedVehicle({THREE:T,kind});
  assert.ok(Object.isFrozen(metadata));assert.ok(Object.isFrozen(metadata.bounds));
  for(const key of ['min','max'])assert.ok(Object.isFrozen(metadata.bounds[key]));
  for(const key of ['wheelCenters','groundContacts']){
   assert.ok(Object.isFrozen(metadata[key]));assert.ok(metadata[key].every(Object.isFrozen));
   assert.strictEqual(model.group.userData[key],metadata[key]);
  }
  assert.strictEqual(model.group.userData.bounds,metadata.bounds);
  assert.equal(metadata.wheelCenters.length,model.wheelLayout.length);
  for(const [i,center] of metadata.wheelCenters.entries()){
   const contact=metadata.groundContacts[i];assert.equal(contact.wheelIndex,i);
   near(contact.x,center.x);near(contact.y,center.y);near(contact.z,center.z-center.radius);near(contact.z,.05);
  }
  const matrix=new T.Matrix4(),local=new T.Matrix4(),point=new T.Vector3();
  for(const distance of [0,.325,-2,400]){
   model.setDistance(distance);model.group.updateMatrixWorld(true);const bounds=new T.Box3();
   model.group.traverse(o=>{if(!o.geometry)return;const positions=o.geometry.getAttribute('position');
    for(let i=0;i<(o.isInstancedMesh?o.count:1);i++){
     matrix.copy(o.matrixWorld);if(o.isInstancedMesh){o.getMatrixAt(i,local);matrix.multiply(local);}
     for(let j=0;j<positions.count;j++)bounds.expandByPoint(point.fromBufferAttribute(positions,j).applyMatrix4(matrix));
    }
   });
   for(const [axis,key] of ['x','y','z'].entries()){
    assert.ok(bounds.min[key]>=metadata.bounds.min[axis]-metadata.boundsToleranceMeters,`${kind} min ${key} at ${distance}`);
    assert.ok(bounds.max[key]<=metadata.bounds.max[axis]+metadata.boundsToleranceMeters,`${kind} max ${key} at ${distance}`);
    if(distance===0){near(bounds.min[key],metadata.bounds.min[axis],metadata.boundsToleranceMeters);near(bounds.max[key],metadata.bounds.max[axis],metadata.boundsToleranceMeters);}
   }
  }
  model.dispose();
 }
});
