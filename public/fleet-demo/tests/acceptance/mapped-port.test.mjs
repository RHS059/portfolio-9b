import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {pointInRing,polygonBoundaryDistance,laneFootprintDistance,polygonArea,edges,pointSegmentDistance,EPSILON} from './geometry-assertions.mjs';

const demoRoot=process.env.FLEET_DEMO_ROOT||fileURLToPath(new URL('../../',import.meta.url));
const portRoot=process.env.FLEET_PORT_ROOT||process.env.FLEET_FACILITIES_ROOT||demoRoot;
let geography,THREE,createPort,createFacilities;
if(process.env.FLEET_PORT_GEOGRAPHY_JSON)geography=JSON.parse(await readFile(process.env.FLEET_PORT_GEOGRAPHY_JSON,'utf8'));
else try{({OICT_GEOGRAPHY:geography}=await import(pathToFileURL(resolve(demoRoot,'src/render/map/oict-geography.js'))));}catch(error){if(error.code!=='ERR_MODULE_NOT_FOUND')throw error;}
try{THREE=await import(process.env.FLEET_THREE_MODULE||'three');}catch(error){if(process.env.FLEET_THREE_MODULE||error.code!=='ERR_MODULE_NOT_FOUND')throw error;}
try{({createPort,createFacilities}=await import(pathToFileURL(resolve(portRoot,'src/render/facilities/index.js'))));}catch(error){if(error.code!=='ERR_MODULE_NOT_FOUND')throw error;}
const missing=!geography?'Mapped geography is not integrated; provide OICT_GEOGRAPHY or FLEET_PORT_GEOGRAPHY_JSON':!THREE?'Actual Three module is required; set FLEET_THREE_MODULE':!createPort?'Mapped port component is not integrated':false;
if(process.env.REQUIRE_MAPPED_PORT==='1')test('required mapped-port test prerequisites are available',()=>assert.equal(missing,false));
const check=(name,fn)=>test(name,{skip:missing},fn);
function release(root){root.userData.dispose?.();const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)materials.add(m);});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}
function withPort(fn){const group=createPort({THREE,geography});try{return fn(group,group.userData.layout);}finally{release(group);}}
function finiteFootprint(corners){assert.ok(Array.isArray(corners)&&corners.length>=3);assert.ok(corners.every(p=>p.length>=2&&p.slice(0,2).every(Number.isFinite)));}

check('mapped port uses the complete supplied polygon and lanes in unshifted local meters',()=>withPort((group,layout)=>{
  assert.equal(group.userData.status,'mapped');assert.equal(group.userData.siteId,'oict');assert.deepEqual(group.position.toArray(),[0,0,0]);assert.deepEqual(group.scale.toArray(),[1,1,1]);
  const input=geography.footprintLocal,ring=JSON.stringify(input[0])===JSON.stringify(input.at(-1))?input.slice(0,-1):input;
  assert.deepEqual(layout.footprint,ring);assert.deepEqual(layout.quay,geography.quayLocal);
  assert.deepEqual(layout.yardLanes.map(l=>({id:String(l.id),points:l.points})),geography.yardLanes.map(l=>({id:String(l.id),points:l.points})));
  assert.ok(layout.bounds.max[0]-layout.bounds.min[0]>1000,'Mapped extent must not collapse to the old symbolic pad');
  assert.ok(polygonArea(layout.footprint)>1e6,'The full supplied terminal area must remain represented');
}));

check('every representative row and crane base clears concave boundary edges and all lane corridors',()=>withPort((group,layout)=>{
  assert.ok(layout.rows.length>0);assert.ok(layout.cranes.length>0);assert.ok(layout.rows.length<=layout.limits.maxRows);assert.ok(layout.cranes.length<=layout.limits.maxCranes);
  assert.equal(layout.limits.boundaryClearanceMeters,8);assert.equal(layout.limits.laneClearanceMeters,12);
  for(const asset of [...layout.rows,...layout.cranes]){
    finiteFootprint(asset.corners);
    const boundary=polygonBoundaryDistance(asset.corners,geography.footprintLocal);
    assert.ok(boundary+EPSILON>=layout.limits.boundaryClearanceMeters,`${asset.id} boundary clearance ${boundary}`);
    for(const lane of geography.yardLanes){const distance=laneFootprintDistance(lane.points,asset.corners);assert.ok(distance+EPSILON>=layout.limits.laneClearanceMeters,`${asset.id} intersects artistic corridor around lane ${lane.id}: ${distance}m`);}
  }
}));

check('quay basis follows mapped quay and crane bases stay landward with seaward boom direction',()=>withPort((group,layout)=>{
  const first=geography.quayLocal[0],last=geography.quayLocal.at(-1),length=Math.hypot(last[0]-first[0],last[1]-first[1]);
  const expected=[(last[0]-first[0])/length,(last[1]-first[1])/length];
  assert.ok(layout.along[0]*expected[0]+layout.along[1]*expected[1]>.9999);
  assert.ok(Math.abs(layout.along[0]*layout.landward[0]+layout.along[1]*layout.landward[1])<EPSILON);
  for(const crane of layout.cranes){
    for(const p of crane.corners)assert.ok((p[0]-first[0])*layout.landward[0]+(p[1]-first[1])*layout.landward[1]>0,`${crane.id} base reaches water side`);
    assert.ok(crane.boomSeawardMeters>0);const tip=[crane.center[0]-layout.landward[0]*crane.boomSeawardMeters,crane.center[1]-layout.landward[1]*crane.boomSeawardMeters];
    assert.ok((tip[0]-crane.center[0])*layout.landward[0]+(tip[1]-crane.center[1])*layout.landward[1]<0);
  }
}));

check('actual instanced container footprints fit independently checked row envelopes',()=>withPort((group,layout)=>{
  const matrix=new THREE.Matrix4();let inspected=0;
  group.traverse(mesh=>{
    if(!mesh.isInstancedMesh||!/^representative-container/.test(mesh.name))return;
    assert.ok(mesh.count>0);
    for(let index=0;index<mesh.count;index++){
      mesh.getMatrixAt(index,matrix);
      const corners=[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]].map(([x,y])=>{const p=new THREE.Vector3(x,y,0).applyMatrix4(matrix);return[p.x,p.y];});
      // Instanced matrices use Float32: permit at most 1 mm on an authored row edge.
      const inside=(p,ring)=>pointInRing(p,ring)||edges(ring).some(([a,b])=>pointSegmentDistance(p,a,b)<=.001);
      assert.ok(layout.rows.some(row=>corners.every(p=>inside(p,row.corners))),`${mesh.name} instance ${index} extends beyond every admitted row`);inspected++;
    }
  });
  assert.ok(inspected>layout.rows.length,'Both overview rows and individual-container representation must be checked');
}));

check('port LOD selects one bounded representation and does not mutate mapped input',()=>withPort((group,layout)=>{
  const before=JSON.stringify(geography),far=group.getObjectByName('representative-container-rows-level'),near=group.getObjectByName('representative-containers-level');
  assert.ok(far&&near);assert.equal(far.visible,true);assert.equal(near.visible,false);
  group.userData.setDetailLevel('detail');assert.equal(far.visible,false);assert.equal(near.visible,true);
  group.userData.setDetailLevel('overview');assert.equal(far.visible,true);assert.equal(near.visible,false);
  group.userData.update?.(Object.freeze({timeSeconds:9999,issueActive:true,authorityResolved:false}));assert.equal(JSON.stringify(geography),before);assert.ok(Object.isFrozen(layout.rows));
}));

// Articulated hardware is authored around its own origin. Test the rendered pose,
// including every parent transform and visibility, rather than unplaced mesh data.
function lowVisibleSurfaceCandidates(group){
  group.updateWorldMatrix(true,true);const candidates=[],vertex=new THREE.Vector3();
  group.traverseVisible(mesh=>{
    if(!mesh.isMesh||mesh.isInstancedMesh)return;
    const position=mesh.geometry.getAttribute('position');let maxZ=-Infinity,minZ=Infinity;
    for(let i=0;i<position.count;i++){vertex.fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld);minZ=Math.min(minZ,vertex.z);maxZ=Math.max(maxZ,vertex.z);}
    if(minZ<=.5&&maxZ<=.5)candidates.push(mesh.name);
  });
  return candidates;
}

check('mapped port has no opaque ground pad or invented low-level water-covering surface',()=>withPort(group=>{
  assert.deepEqual(lowVisibleSurfaceCandidates(group),[],'Visible world-space opaque ground-plane candidate');
}));

check('ground-surface guard rejects transformed low planes and ignores only elevated or hidden geometry',()=>{
  const root=new THREE.Group(),parent=new THREE.Group(),mesh=new THREE.Mesh(new THREE.PlaneGeometry(200,100),new THREE.MeshBasicMaterial());mesh.name='forbidden-water-cover';parent.add(mesh);root.add(parent);
  try{
    assert.deepEqual(lowVisibleSurfaceCandidates(root),['forbidden-water-cover']);
    parent.position.z=34;assert.deepEqual(lowVisibleSurfaceCandidates(root),[],'Elevated hoist geometry must use its world elevation');
    mesh.position.z=10;parent.position.z=-10;assert.deepEqual(lowVisibleSurfaceCandidates(root),['forbidden-water-cover'],'Nested transforms can move locally elevated geometry onto the ground');
    parent.visible=false;assert.deepEqual(lowVisibleSurfaceCandidates(root),[]);parent.visible=true;assert.deepEqual(lowVisibleSurfaceCandidates(root),['forbidden-water-cover'],'Revealing a pooled object must restore the guard');
  }finally{release(root);}
});

check('facility adapter forwards mapped geography exactly once and keeps depot/factory local',()=>{
  const root=createFacilities({THREE,geography:{oict:geography}});
  try{
    assert.equal(root.userData.siteId,undefined);assert.deepEqual(root.position.toArray(),[0,0,0]);
    assert.deepEqual(root.children.map(c=>c.userData.siteId).sort(),['centerpoint','depot','oict']);
    for(const child of root.children)assert.deepEqual(child.position.toArray(),[0,0,0]);
    const port=root.children.find(c=>c.userData.siteId==='oict');assert.equal(port.userData.status,'mapped');assert.ok(port.userData.layout.rows.length>0);
  }finally{release(root);}
});

check('missing geography stays explicitly unavailable rather than inventing a symbolic terminal',()=>{
  const group=createPort({THREE});try{assert.equal(group.userData.status,'geography-unavailable');assert.equal(group.children.length,0);}finally{release(group);}
});
