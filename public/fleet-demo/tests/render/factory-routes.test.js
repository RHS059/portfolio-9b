import test from 'node:test';import assert from 'node:assert/strict';
import {SITES,ROUTES,routePosition,FACTORY_DISPATCH_STOP}from'../../src/render/map/world.js';
import {DETAIL_MODEL_METADATA}from'../../src/render/vehicles/detail-model.js';
const factory=SITES.find(s=>s.id==='centerpoint');
test('fleet delivery ends at exterior dispatch, separate from incoming cargo bays',()=>{const p=routePosition('port-to-factory',1);assert.ok(Math.hypot(p.x-FACTORY_DISPATCH_STOP[0],p.y-FACTORY_DISPATCH_STOP[1])<1e-8);assert.ok(p.y+DETAIL_MODEL_METADATA.truck.bounds.max[1]<factory.y-45);assert.ok(p.x-factory.x>40);});
test('all authored fleet routes keep complete vehicle envelopes outside drone factory',()=>{
 for(const routeId of Object.keys(ROUTES)){const meta=/depot/.test(routeId)?DETAIL_MODEL_METADATA.tractor:DETAIL_MODEL_METADATA.truck;for(let step=0;step<=4000;step++){const pose=routePosition(routeId,step/4000),c=Math.cos(pose.heading),s=Math.sin(pose.heading);for(const x of [meta.bounds.min[0],meta.bounds.max[0]])for(const y of [meta.bounds.min[1],meta.bounds.max[1]]){const px=pose.x+x*c+y*s-factory.x,py=pose.y-x*s+y*c-factory.y;assert.ok(!(Math.abs(px)<75&&Math.abs(py)<45),`${routeId} at${step/4000} enters factory`);}}}
});
test('service starts at the exterior dispatch stop and joins the existing workshop bay continuously',()=>{const start=routePosition('factory-to-depot',0),end=routePosition('factory-to-depot',1),bay=routePosition('depot-bay',0);assert.equal(start.x,FACTORY_DISPATCH_STOP[0]);assert.equal(start.y,FACTORY_DISPATCH_STOP[1]);assert.deepEqual([end.x,end.y],[bay.x,bay.y]);const first=routePosition('delivery',0),last=routePosition('delivery',1);assert.ok(Math.hypot(first.x-last.x,first.y-last.y)<1e-8);});
