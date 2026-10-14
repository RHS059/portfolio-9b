import test from 'node:test';
import assert from 'node:assert/strict';
import {createPort} from './index.js';
let THREE;try{THREE=await import(process.env.FLEET_THREE_MODULE||'three');}catch(error){if(process.env.FLEET_THREE_MODULE)throw error;}
const check=(name,fn)=>test(name,{skip:THREE?false:'Actual Three module required'},fn);
const geography={footprintLocal:[[0,0],[600,0],[600,500],[0,500],[0,0]],quayLocal:[[0,0],[600,0]],quayAlongUnit:[1,0],quayLandwardUnit:[0,1],yardLanes:[{id:'lane',points:[[0,250],[600,250]]}]};
check('missing geography returns an explicit empty tagged group',()=>{const g=createPort({THREE});assert.equal(g.userData.status,'geography-unavailable');assert.equal(g.userData.siteId,'oict');assert.equal(g.children.length,0);});
check('mapped assets stay at local origin with no opaque terminal pad',()=>{const g=createPort({THREE,geography});assert.equal(g.userData.status,'mapped');assert.deepEqual(g.position.toArray(),[0,0,0]);assert.deepEqual(g.scale.toArray(),[1,1,1]);assert.equal(g.getObjectByName('mapped-terminal-outline').children.filter(c=>c.isMesh).length,0);});
check('default overview is instanced and detail changes geometry visibility only',()=>{
 const g=createPort({THREE,geography}),far=g.getObjectByName('representative-container-rows'),near=g.getObjectByName('representative-containers');assert.ok(far.isInstancedMesh&&near.isInstancedMesh);assert.equal(far.parent.visible,true);assert.equal(near.parent.visible,false);const layout=g.userData.layout;g.userData.setDetailLevel('detail');assert.equal(far.parent.visible,false);assert.equal(near.parent.visible,true);assert.equal(g.userData.layout,layout);
});
check('disposal blocks detail updates and leaves GPU cleanup to renderer',()=>{
 const g=createPort({THREE,geography});let freed=0;g.traverse(o=>o.geometry?.addEventListener('dispose',()=>freed++));g.userData.dispose();g.userData.dispose();g.userData.setDetailLevel('detail');assert.equal(g.userData.detailLevel,'overview');assert.equal(freed,0);assert.ok(g.children.length>0);
});
