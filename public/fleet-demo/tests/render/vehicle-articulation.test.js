import test from 'node:test';
import assert from 'node:assert/strict';
import {createDetailedVehicle,createDetailedTractor,createDetailedTrailer,detailedWheelLayout,detailedTrailerWheelLayout,DETAIL_MODEL_METADATA,TRACTOR_TRAILER_ANCHORS,FLATBED_CARGO_METADATA} from '../../src/render/vehicles/detail-model.js';
let T;try{T=await import(process.env.FLEET_THREE_MODULE||'three');}catch{}
const actual=(name,fn)=>test(name,{skip:!T?'Set FLEET_THREE_MODULE to pinned Three r128':false},fn);
const near=(a,b,e=1e-5)=>assert.ok(Math.abs(a-b)<=e,`${a} != ${b}`);
function vertexBounds(group){
 group.updateMatrixWorld(true);const bounds=new T.Box3(),matrix=new T.Matrix4(),instance=new T.Matrix4(),point=new T.Vector3();
 group.traverse(o=>{if(!o.geometry)return;const positions=o.geometry.getAttribute('position');
  for(let i=0;i<(o.isInstancedMesh?o.count:1);i++){
   matrix.copy(o.matrixWorld);if(o.isInstancedMesh){o.getMatrixAt(i,instance);matrix.multiply(instance);}
   for(let j=0;j<positions.count;j++)bounds.expandByPoint(point.fromBufferAttribute(positions,j).applyMatrix4(matrix));
  }
 });return bounds;
}
function alignedRig(tractor,trailer,position,tractorHeading,trailerHeading){
 tractor.group.position.fromArray(position);tractor.group.rotation.z=-tractorHeading;tractor.group.updateMatrixWorld(true);
 const hitch=new T.Vector3(...TRACTOR_TRAILER_ANCHORS.tractor.fifthWheel).applyMatrix4(tractor.group.matrixWorld);
 trailer.group.rotation.z=-trailerHeading;
 const kingpin=new T.Vector3(...TRACTOR_TRAILER_ANCHORS.trailer.kingpin).applyAxisAngle(new T.Vector3(0,0,1),-trailerHeading);
 trailer.group.position.copy(hitch).sub(kingpin);trailer.group.updateMatrixWorld(true);return hitch;
}

test('separate anchors and pallet support/pick bounds are immutable and use model meters',()=>{
 assert.ok(Object.isFrozen(TRACTOR_TRAILER_ANCHORS));assert.ok(Object.isFrozen(TRACTOR_TRAILER_ANCHORS.tractor.fifthWheel));
 assert.deepEqual(TRACTOR_TRAILER_ANCHORS.tractor.fifthWheel,[0,1.28,1.195]);
 assert.deepEqual(TRACTOR_TRAILER_ANCHORS.trailer.kingpin,[0,0,1.195]);
 const wheels=detailedTrailerWheelLayout();assert.equal(wheels.length,8);assert.deepEqual([...new Set(wheels.map(w=>w.y))],[-8.28,-9.58]);
 const cargo=FLATBED_CARGO_METADATA;assert.deepEqual(cargo.palletDimensions,[1.2,1,.19]);assert.deepEqual(cargo.cartonDimensions,[.805,.605,.487]);
 assert.equal(cargo.supportOrigin,'pallet-bottom-center');assert.ok(Object.isFrozen(cargo.slots));
 for(const slot of cargo.slots){assert.ok(Object.isFrozen(slot));assert.ok(Object.isFrozen(slot.support));near(slot.support[2],1.33);near(slot.loadTop[2]-slot.support[2],.677);
  for(const axis of [0,1]){assert.ok(slot.pickBounds.min[axis]>=cargo.deck.min[axis]);assert.ok(slot.pickBounds.max[axis]<=cargo.deck.max[axis]);}
 }
});
actual('f76 default attached truck and maintenance-only constructor remain compatible',()=>{
 const full=createDetailedVehicle({THREE:T}),tractor=createDetailedVehicle({THREE:T,trailerAttached:false});
 assert.equal(full.group.userData.trailerAttached,true);assert.equal(full.wheelLayout.length,18);assert.ok(full.group.userData.features.includes('box-trailer'));
 assert.equal(tractor.group.userData.trailerAttached,false);assert.equal(tractor.wheelLayout.length,10);assert.equal(detailedWheelLayout('truck',false).length,10);
 assert.ok(!tractor.group.userData.features.includes('box-trailer'));assert.strictEqual(tractor.metadata,DETAIL_MODEL_METADATA.tractor);
 near(vertexBounds(tractor.group).min.y,-.81);near(vertexBounds(full.group).min.y,-10.389);full.dispose();tractor.dispose();
});
actual('separable box/flatbed bounds include all actual instance vertices at multiple wheel phases',()=>{
 for(const style of ['box','flatbed']){
  const trailer=createDetailedTrailer({THREE:T,style}),metadata=DETAIL_MODEL_METADATA[style==='box'?'boxTrailer':'flatbedTrailer'];
  assert.equal(trailer.group.userData.articulatedPart,'trailer');assert.equal(trailer.group.userData.trailerStyle,style);
  assert.equal(trailer.wheelLayout.length,8);assert.equal(trailer.group.children.length,7);assert.strictEqual(trailer.metadata,metadata);
  assert.ok(trailer.group.userData.features.includes('trailer-kingpin'));assert.ok(trailer.group.userData.features.includes('trailer-axle'));
  for(const distance of [0,.325,-2,400]){
   trailer.setDistance(distance);const bounds=vertexBounds(trailer.group);
   for(const [i,axis] of ['x','y','z'].entries()){
    assert.ok(bounds.min[axis]>=metadata.bounds.min[i]-1e-5);assert.ok(bounds.max[axis]<=metadata.bounds.max[i]+1e-5);
    if(distance===0){near(bounds.min[axis],metadata.bounds.min[i]);near(bounds.max[axis],metadata.bounds.max[i]);}
   }
  }trailer.dispose();
 }
});
actual('open flatbed exposes every pallet support from above and has no roof or baked cargo',()=>{
 const trailer=createDetailedTrailer({THREE:T});trailer.group.updateMatrixWorld(true);
 const names=trailer.group.userData.features;assert.ok(names.includes('flatbed-deck'));assert.ok(!names.includes('box-trailer'));assert.ok(!names.some(n=>/roof|carton|pallet/.test(n)));
 for(const slot of FLATBED_CARGO_METADATA.slots)for(const dx of [-.59,0,.59])for(const dy of [-.49,0,.49]){
  const ray=new T.Raycaster(new T.Vector3(slot.support[0]+dx,slot.support[1]+dy,8),new T.Vector3(0,0,-1));
  const hit=ray.intersectObjects(trailer.group.children,true)[0];assert.ok(hit);near(hit.point.z,1.33);
 }
 trailer.dispose();
});
actual('actual hitch and kingpin coincide at independently rotated poses without changing geometry',()=>{
 const tractor=createDetailedTractor({THREE:T}),trailer=createDetailedTrailer({THREE:T});
 for(const headings of [[0,0],[.8,.45],[-1.3,-1.7],[Math.PI,Math.PI]]){
  const hitch=alignedRig(tractor,trailer,[32,-80,.15],...headings);
  const kingpin=new T.Vector3(...trailer.metadata.anchors.kingpin).applyMatrix4(trailer.group.matrixWorld);near(hitch.distanceTo(kingpin),0);
 }
 assert.equal(tractor.group.userData.trailerAttached,false);tractor.dispose();trailer.dispose();
});
actual('accepted exterior receiving poses keep the entire attached vehicle south of the factory wall',()=>{
 for(const style of ['box','flatbed'])for(const x of [-56,-40]){
  const tractor=createDetailedTractor({THREE:T}),trailer=createDetailedTrailer({THREE:T,style});
  alignedRig(tractor,trailer,[x,-56.5,0],Math.PI,Math.PI);
  assert.ok(vertexBounds(tractor.group).max.y< -45);assert.ok(vertexBounds(trailer.group).max.y<=-46.111+1e-5);
  tractor.dispose();trailer.dispose();
 }
});
actual('tractor and trailer wheel travel pause/rewind independently and disposal is idempotent',()=>{
 const tractor=createDetailedTractor({THREE:T}),trailer=createDetailedTrailer({THREE:T}),matrix=new T.Matrix4();
 const before=Array.from(tractor.wheelBatches[0].instanceMatrix.array);trailer.setDistance(.325);
 assert.deepEqual(Array.from(tractor.wheelBatches[0].instanceMatrix.array),before);
 const version=trailer.wheelBatches[0].instanceMatrix.version;trailer.setDistance(.325);assert.equal(trailer.wheelBatches[0].instanceMatrix.version,version);
 trailer.setDistance(0);trailer.wheelBatches[0].getMatrixAt(0,matrix);near(matrix.elements[5],1);
 let resources=0,disposed=0;for(const model of [tractor,trailer])model.group.traverse(o=>{for(const resource of [o.geometry,o.material])if(resource){resources++;resource.addEventListener('dispose',()=>disposed++);}});
 tractor.dispose();trailer.dispose();tractor.dispose();trailer.dispose();assert.equal(disposed,resources);
});

test('tapered flatbed neck clears the cab footprint through independently checked right-angle articulation',()=>{
 const cab=[[-1.19,2.21],[1.19,2.21],[1.19,5.5],[-1.19,5.5]];
 function separated(a,b){
  for(const poly of [a,b])for(let i=0;i<poly.length;i++){
   const p=poly[i],q=poly[(i+1)%poly.length],length=Math.hypot(q[0]-p[0],q[1]-p[1]),axis=[-(q[1]-p[1])/length,(q[0]-p[0])/length];
   const aa=a.map(v=>v[0]*axis[0]+v[1]*axis[1]),bb=b.map(v=>v[0]*axis[0]+v[1]*axis[1]);
   // Include the narrow neck's 0.035 m edge-rail thickness in clearance.
   if(Math.min(...bb)-Math.max(...aa)>.04||Math.min(...aa)-Math.max(...bb)>.04)return true;
  }return false;
 }
 for(let degrees=-90;degrees<=90;degrees+=3){
  const angle=degrees*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
  const polygon=FLATBED_CARGO_METADATA.deckOutline.map(([x,y])=>[x*c-y*s,x*s+y*c+1.28]);
  assert.ok(separated(polygon,cab),`deck neck clips cab at ${degrees} degrees`);
 }
});
test('canonical rear load support accepts preserved 0/90 degree cargo yaw without deck overhang',()=>{
 const cargo=FLATBED_CARGO_METADATA;assert.deepEqual(cargo.slots[0].support,[0,-10.38,1.33]);
 for(const slot of cargo.slots)for(const yaw of cargo.acceptedPalletYaw)for(const x of [-.6,.6])for(const y of [-.5,.5]){
  const px=slot.support[0]+x*Math.cos(yaw)-y*Math.sin(yaw),py=slot.support[1]+x*Math.sin(yaw)+y*Math.cos(yaw);
  assert.ok(px>=cargo.deck.min[0]&&px<=cargo.deck.max[0]);assert.ok(py>=cargo.deck.min[1]&&py<=cargo.deck.max[1]);
 }
});
actual('canonical receiving load support is the supplied world anchor at both bays',()=>{
 for(const x of [-56,-40]){
  const tractor=createDetailedTractor({THREE:T}),trailer=createDetailedTrailer({THREE:T});
  alignedRig(tractor,trailer,[x,-56.5,.15],Math.PI,Math.PI);
  const support=new T.Vector3(...FLATBED_CARGO_METADATA.slots[0].support).applyMatrix4(trailer.group.matrixWorld);
  near(support.x,x);near(support.y,-47.4);near(support.z,1.48);tractor.dispose();trailer.dispose();
 }
});
