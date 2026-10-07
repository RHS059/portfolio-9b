import{roadTruckPosition}from'../../src/render/map/cargo-layout.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createVehicleDetailPool,selectDetailedVehicles} from '../../src/render/core/vehicle-detail.js';
import {normalizeSnapshot,interpolateSnapshots} from '../../src/render/core/snapshot.js';
import {routeDistance} from '../../src/render/map/world.js';
const vehicle=(id,x=0)=>({id,x,y:0,heading:.2,model:'truck',status:'moving',routeId:'delivery',presentationDistanceMeters:12});
const options={zoom:19,center:[0,0],selectedId:'selected',roadScale:2};
function fixture(){const instances=[],scene={children:[],add(g){this.children.push(g);},remove(g){this.children=this.children.filter(x=>x!==g);}},pool=createVehicleDetailPool({THREE:{},scene,createDetailedVehicle:({kind})=>{const api={group:{position:{set(...v){this.value=v;}},rotation:{z:0},scale:{setScalar(v){this.value=v;}}},kind,distances:[],disposed:0,setDistance(v){this.distances.push(v);},dispose(){this.disposed++;}};instances.push(api);return api;}});return{instances,pool,scene};}

test('near detail is bounded, selected first, stable by identity and camera-only',()=>{
 const raw=Object.freeze([Object.freeze(vehicle('c',3)),Object.freeze(vehicle('a',1)),Object.freeze(vehicle('b',2)),Object.freeze(vehicle('selected',400)),Object.freeze(vehicle('offscreen',500))]);
 assert.deepEqual(selectDetailedVehicles(raw,options).map(v=>v.id),['selected','a','b']);assert.deepEqual(selectDetailedVehicles([...raw].reverse(),options).map(v=>v.id),['selected','a','b']);assert.deepEqual(selectDetailedVehicles(raw,{...options,zoom:16}),[]);assert.equal(raw[0].presentationDistanceMeters,12);
});
test('detail pool reuses three models through reordering, culling and many entity changes',()=>{
 const f=fixture();f.pool.update([vehicle('a'),vehicle('b',1),vehicle('c',2)],options);const before=[...f.instances];f.pool.update([vehicle('c',2),vehicle('a'),vehicle('b',1)],options);assert.deepEqual(f.instances,before);
 for(let step=0;step<12;step++)f.pool.update([vehicle(`a${step}`),vehicle(`b${step}`,1),vehicle(`c${step}`,2)],options);
 assert.equal(f.instances.length,3);assert.equal(f.scene.children.length,3);assert.equal(f.pool.getMetrics().visible,3);f.pool.update([],{...options,zoom:12});assert.equal(f.pool.getMetrics().visible,0);assert.ok(f.scene.children.every(g=>!g.visible));f.pool.dispose();f.pool.dispose();assert.equal(f.scene.children.length,0);assert.ok(f.instances.every(api=>api.disposed===1));
});
test('absolute wheel travel repeats on pause and resets with snapshots independently of LOD',()=>{
 const old=normalizeSnapshot({timeSeconds:1,vehicles:[{id:'a',routeId:'delivery',progress:.1}]}),current=normalizeSnapshot({timeSeconds:2,vehicles:[{id:'a',routeId:'delivery',progress:.2}]});
 const middle=interpolateSnapshots(old,current,.5)[0];assert.ok(Math.abs(middle.presentationDistanceMeters-roadTruckPosition({routeId:'delivery',progress:.15}).presentationDistanceMeters)<1e-8);
 const pause=normalizeSnapshot({...current,paused:true});assert.deepEqual(interpolateSnapshots(old,pause,0),interpolateSnapshots(old,pause,1));const reset=normalizeSnapshot({timeSeconds:0,vehicles:[{id:'a',routeId:'delivery',progress:0}]});assert.equal(interpolateSnapshots(current,reset,0)[0].presentationDistanceMeters,0);assert.equal(routeDistance('depot-bay',1),0);
 const f=fixture(),v={...vehicle('a'),presentationDistanceMeters:20};f.pool.update([v],options);f.pool.update([v],options);f.pool.update([v],{...options,zoom:12});f.pool.update([{...v,presentationDistanceMeters:0}],options);assert.deepEqual(f.instances[0].distances,[10,10,0]);f.pool.dispose();
});
test('near workshop detail retains scale1 and current rail contact elevation',()=>{
 const f=fixture();f.pool.update([{...vehicle('a'),routeId:'depot-bay',status:'workshop'}],{...options,baySupportElevation:.36});const group=f.instances[0].group;assert.equal(group.scale.value,1);assert.ok(Math.abs(group.position.value[2]-.31)<1e-9);assert.equal(group.rotation.z,-.2);f.pool.dispose();
});

test('model-kind changes dispose old detail without growing the bounded pool',()=>{const f=fixture();f.pool.update([vehicle('a'),vehicle('b',1),vehicle('c',2)],options);f.pool.update([{...vehicle('a'),model:'van'},vehicle('b',1),vehicle('c',2)],options);assert.equal(f.instances[0].disposed,1);assert.equal(f.instances[3].kind,'van');assert.equal(f.pool.getMetrics().capacity,3);assert.equal(f.scene.children.length,3);f.pool.dispose();assert.ok(f.instances.every(api=>api.disposed===1));});

test('snapshot adapter copies explicit assembly progress and leaves absent process input idle',()=>{
 const input={factoryAssembly:{cells:[{id:'frame-jig',progress:.6},{id:'frame-jig',progress:.8},{id:'bad',progress:NaN}]}},snapshot=normalizeSnapshot(input);input.factoryAssembly.cells[0].progress=.9;
 assert.deepEqual(snapshot.factoryAssembly.cells,[{id:'frame-jig',progress:.6}]);assert.ok(Object.isFrozen(snapshot.factoryAssembly.cells[0]));assert.equal(normalizeSnapshot({timeSeconds:99}).factoryAssembly,undefined);
});
let T;try{T=await import(process.env.FLEET_THREE_MODULE||'three');}catch{}
const actual=(name,fn)=>test(name,{skip:!T?'Actual Three r128 module required':false},fn);
actual('accepted actual truck envelope clears workshop and each outer tire contact reaches a rail',async()=>{
 const {createDetailedVehicle,DETAIL_MODEL_METADATA}=await import('../../src/render/vehicles/detail-model.js');const {createDepot}=await import('../../src/render/facilities/depot/index.js');const {disposeObject}=await import('../../src/render/core/models.js');
 const model=createDetailedVehicle({THREE:T}),meta=DETAIL_MODEL_METADATA.truck,depot=createDepot({THREE:T});depot.updateMatrixWorld(true);const meshes=[];depot.traverse(o=>{if(o.isMesh)meshes.push(o);});
 assert.ok(meta.bounds.min[1]>-14);assert.ok(meta.bounds.max[1]<13.65);assert.ok(meta.bounds.min[0]>-4&&meta.bounds.max[0]<4);assert.ok(meta.bounds.max[2]+.31<7.5);
 for(const contact of meta.groundContacts.filter(c=>Math.abs(c.x)>1.1)){const ray=new T.Raycaster(new T.Vector3(-12+contact.x,6+contact.y,1),new T.Vector3(0,0,-1));const surface=ray.intersectObjects(meshes,false)[0]?.point.z;assert.ok(Math.abs(surface-(contact.z+.31))<1e-6,`wheel${contact.wheelIndex} rail contact`);}
 model.group.traverse(o=>{if(o.material){assert.equal(o.material.isMeshBasicMaterial,true);assert.equal(o.material.side,T.DoubleSide);}});model.dispose();depot.userData.dispose();disposeObject(depot);
});
actual('real detail pool renders exact models once, restores far instancing, and switches factory LOD without inventing activity',async()=>{
 const {createVehicleLayer}=await import('../../src/render/core/vehicle-layer.js');const {SITES,toLngLat}=await import('../../src/render/map/world.js');const depot=SITES.find(s=>s.id==='depot'),factory=SITES.find(s=>s.id==='centerpoint');let zoom=18.8,center=[depot.x,depot.y],distance=20;
 class Renderer{constructor(){this.info={render:{}};}setClearColor(){}setPixelRatio(){}setSize(){}render(){}dispose(){}forceContextLoss(){}}
 const vehicles=()=>[{...vehicle('TRK-104'),x:depot.x-12,y:depot.y+6,routeId:'depot-bay',status:'workshop',presentationDistanceMeters:distance},{...vehicle('far'),x:depot.x+400,y:depot.y}];
 const map={getContainer:()=>({getBoundingClientRect:()=>({width:900,height:700})}),getZoom:()=>zoom,getCenter:()=>({toArray:()=>toLngLat(center)}),triggerRepaint(){}},M={MercatorCoordinate:{fromLngLat:()=>({x:.2,y:.3,z:0,meterInMercatorCoordinateUnits:()=>1e-8})}};
 const layer=createVehicleLayer({THREE:{...T,WebGLRenderer:Renderer},maplibregl:M,getVehicles:vehicles,getSelected:()=> 'TRK-104',getView:()=> 'iso',canvas:{}});layer.onAdd(map,{getExtension:()=>null,getParameter:()=> 'test',RENDERER:0});await new Promise(resolve=>setImmediate(resolve));layer.render(null,new T.Matrix4().toArray());
 const snapshot=normalizeSnapshot({paused:true,factoryAssembly:{cells:[{id:'frame-jig',progress:.6}]}});layer.setFacilitySnapshot(snapshot);layer.draw();assert.equal(layer.detailState,'ready');assert.equal(layer.detailPool.getMetrics().visible,1);assert.equal(layer.detailPool.getMetrics().models[0].bounds.min[1],-.81);assert.equal(layer.detailPool.getMetrics().models[0].variant,'tractor');assert.equal(layer.meshes.get('truck').parts[0].count,1,'selected detail is excluded from far instances');
 distance=0;layer.draw();assert.equal(layer.detailPool.getMetrics().models[0].distance,0);zoom=14;layer.invalidate();layer.draw();assert.equal(layer.detailPool.getMetrics().visible,0);assert.equal(layer.meshes.get('truck').parts[0].count,1);assert.equal(layer.meshes.get('tractor').parts[0].count,1);
 zoom=18.3;center=[factory.x,factory.y];layer.invalidate();layer.draw();assert.equal(layer.factoryLOD,'detail');const plant=layer.facilities.children.find(g=>g.userData.siteId==='centerpoint');assert.equal(plant.userData.getAssemblyState().find(c=>c.id==='frame-jig').progress,.6);
 layer.setFacilitySnapshot(normalizeSnapshot({paused:true,timeSeconds:999}));layer.draw();assert.ok(plant.userData.getAssemblyState().every(c=>c.progress===0),'time alone cannot activate assembly');layer.onRemove();layer.onRemove();assert.equal(layer.detailPool.getMetrics().capacity,0);
});

test('workshop and service trips select tractor-only in every LOD without changing source snapshots',async()=>{
 const {vehicleModelVariant}=await import('../../src/render/core/presentation-pose.js');
 for(const routeId of ['depot-bay','factory-to-depot','depot-to-factory'])assert.equal(vehicleModelVariant({model:'truck',routeId}),'tractor');
 assert.equal(vehicleModelVariant({model:'truck',routeId:'delivery'}),'truck');assert.equal(vehicleModelVariant({model:'truck',routeId:'delivery',trailerAttached:false}),'tractor');assert.equal(vehicleModelVariant({model:'van',routeId:'depot-bay'}),'van');
 const input=Object.freeze({vehicles:Object.freeze([Object.freeze({id:'TRK-104',routeId:'delivery',trailerAttached:false})])});assert.equal(normalizeSnapshot(input).vehicles[0].trailerAttached,false);assert.equal(input.vehicles[0].trailerAttached,false);
});
actual('tractor-only asset omits trailer body and axles and exposes accurate compact bounds',async()=>{
 const {createDetailedVehicle,DETAIL_MODEL_METADATA}=await import('../../src/render/vehicles/detail-model.js');const {createModelGeometry}=await import('../../src/render/core/models.js');
 const model=createDetailedVehicle({THREE:T,trailerAttached:false}),meta=DETAIL_MODEL_METADATA.tractor;assert.equal(model.group.userData.trailerAttached,false);assert.equal(model.group.userData.wheelCount,10);assert.equal(new Set(model.wheelLayout.map(w=>w.y)).size,3);assert.ok(!model.group.userData.features.includes('box-trailer'));assert.ok(model.group.userData.features.includes('fifth-wheel-coupling'));
 model.group.updateMatrixWorld(true);const bounds=new T.Box3(),matrix=new T.Matrix4();model.group.traverse(o=>{if(!o.geometry)return;o.geometry.computeBoundingBox();if(o.isInstancedMesh)for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);matrix.premultiply(o.matrixWorld);bounds.union(o.geometry.boundingBox.clone().applyMatrix4(matrix));}else bounds.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));});
 for(const [i,axis]of ['x','y','z'].entries()){assert.ok(Math.abs(bounds.min[axis]-meta.bounds.min[i])<1e-5);assert.ok(Math.abs(bounds.max[axis]-meta.bounds.max[i])<1e-5);}assert.ok(bounds.max.y-bounds.min.y<8.3);const far=createModelGeometry(T,'tractor');far.computeBoundingBox();assert.ok(far.boundingBox.max.y-far.boundingBox.min.y<8.3);far.dispose();model.dispose();
});
