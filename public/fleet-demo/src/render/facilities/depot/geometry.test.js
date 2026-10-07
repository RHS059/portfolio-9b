import test from 'node:test';
import assert from 'node:assert/strict';
// Optional actual-Three verification: set FLEET_THREE_MODULE to a local module path.
const modulePath = process.env.FLEET_THREE_MODULE;
let THREE;
try { THREE = await import(modulePath || 'three'); } catch (error) {
  if (modulePath) throw error;
}
const testThree = (name, fn) => test(name, { skip: THREE ? false : 'Three is injected at runtime; set FLEET_THREE_MODULE for actual geometry checks' }, fn);
import {createFacilities,createDepot,createWorkshop,createFactory,createPort} from '../index.js';

testThree('adapter returns an untagged Group with three independently placeable sites',()=>{
 const root=createFacilities({THREE});assert.ok(root.isGroup);assert.deepEqual(root.position.toArray(),[0,0,0]);
 const placed=[];root.traverse(o=>{if(o.userData.siteId)placed.push(o)});assert.equal(root.userData.siteId,undefined);assert.equal(placed.length,3);assert.deepEqual(placed.map(o=>o.userData.siteId),['depot','oict','centerpoint']);for(const child of placed){assert.equal(child.parent,root);assert.deepEqual(child.position.toArray(),[0,0,0]);}root.userData.dispose();
});
testThree('actual geometry remains within declared local meter bounds',()=>{
 for(const create of [createDepot,createWorkshop,createFactory,createPort]){const group=create({THREE});group.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(group);const {min,max}=group.userData.bounds;for(let i=0;i<3;i++){assert.ok(box.min.toArray()[i]>=min[i]-.0001,`${group.name} min ${i}`);assert.ok(box.max.toArray()[i]<=max[i]+.0001,`${group.name} max ${i}`);}group.userData.dispose();}
});
testThree('workshop bay centers line up with the renderer depot-bay endpoint',()=>{
 const depot=createDepot({THREE});assert.deepEqual(depot.userData.bayCenters[0],[-12,6,0]);assert.deepEqual(depot.userData.workshop.position.toArray(),[0,6,0]);depot.userData.dispose();
});
testThree('static geometry is batched and its materials are opaque',()=>{
 const root=createFacilities({THREE});let draws=0;root.traverse(o=>{if(o.geometry){draws++;assert.ok(o.geometry.getAttribute('position').array.every(Number.isFinite));assert.equal(o.material.transparent,false);}});assert.ok(draws<=45,`draw calls ${draws}`);root.userData.dispose();
});
testThree('update preserves caller snapshot and geographic transforms',()=>{
 const root=createFacilities({THREE}),depot=root.children[0];depot.position.set(123,456,0);const snapshot=Object.freeze({vehicles:Object.freeze([Object.freeze({id:'TRK-104',status:'workshop'})]),selectedId:'TRK-104'});const before=JSON.stringify(snapshot);root.userData.update(snapshot);assert.equal(JSON.stringify(snapshot),before);assert.equal(depot.userData.presentation.occupied,1);assert.deepEqual(depot.position.toArray(),[123,456,0]);root.userData.dispose();
});
testThree('replay clears all previous occupancy',()=>{
 const root=createFacilities({THREE}),depot=root.children[0];root.userData.update({vehicles:[{id:'TRK-104',status:'workshop'},{id:'TRK-208',status:'workshop'}]});root.userData.update({vehicles:[]});assert.deepEqual(depot.userData.presentation.occupants,[]);const plates=depot.userData.workshop.children.filter(o=>o.name.startsWith('bay-occupancy'));assert.ok(plates.every(o=>o.userData.occupantId===null));root.userData.dispose();
});
testThree('dispose stops updates but leaves resource disposal to the renderer exactly once',()=>{
 const root=createFacilities({THREE}),depot=root.children[0],geometries=new Set(),materials=new Set(),counts=new Map();root.userData.update({vehicles:[{id:'TRK-104',status:'workshop'}]});root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material)});for(const resource of [...geometries,...materials]){counts.set(resource,0);resource.addEventListener('dispose',()=>counts.set(resource,counts.get(resource)+1));}root.userData.dispose();root.userData.dispose();root.userData.update({});assert.equal(root.children.length,3);assert.equal(depot.userData.presentation.occupied,1);assert.ok([...counts.values()].every(count=>count===0));for(const resource of [...geometries,...materials])resource.dispose();assert.ok([...counts.values()].every(count=>count===1));
});
testThree('independent instances share no disposable material or presentation state',()=>{
 const a=createFacilities({THREE}),b=createFacilities({THREE});a.userData.update({vehicles:[{id:'TRK-104',status:'workshop'}]});assert.equal(b.children[0].userData.presentation.occupied,0);a.userData.dispose();assert.ok(b.children[0].children.length>0);b.userData.dispose();
});
testThree('visual robots preserve site transforms, replay deterministically and stop on dispose',()=>{
 const root=createFacilities({THREE}),factory=root.children[2];factory.position.set(25,50,0);root.userData.update(Object.freeze({timeSeconds:20,paused:true,vehicles:Object.freeze([])}));const robot=factory.getObjectByName('factory-sorter-01'),pose=robot.position.clone();root.userData.update({timeSeconds:40});assert.notDeepEqual(robot.position.toArray(),pose.toArray());root.userData.update({timeSeconds:20});assert.deepEqual(robot.position.toArray(),pose.toArray());assert.deepEqual(factory.position.toArray(),[25,50,0]);root.userData.dispose();root.userData.update({timeSeconds:0});assert.deepEqual(robot.position.toArray(),pose.toArray());
});
testThree('all moving props stay within the symbolic footprint throughout their loops',()=>{
 for(const create of [createFactory,createPort]){const group=create({THREE}),{min,max}=group.userData.bounds;for(let timeSeconds=0;timeSeconds<=120;timeSeconds+=2){group.userData.update({timeSeconds});group.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(group);for(let i=0;i<3;i++){assert.ok(box.min.toArray()[i]>=min[i]-.0001);assert.ok(box.max.toArray()[i]<=max[i]+.0001);}}group.userData.dispose();}
});
