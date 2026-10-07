import test from 'node:test';import assert from 'node:assert/strict';
import {SITES,ROUTES,routePosition,FACTORY_DISPATCH_STOP}from'../../src/render/map/world.js';
import {DETAIL_MODEL_METADATA}from'../../src/render/vehicles/detail-model.js';
import {vehiclePresentationPose,vehicleModelVariant}from'../../src/render/core/presentation-pose.js';
import {MODEL_REGISTRY}from'../../src/render/core/models.js';
const factory=SITES.find(s=>s.id==='centerpoint');
test('fleet delivery ends at exterior dispatch, separate from incoming cargo bays',()=>{const p=routePosition('port-to-factory',1);assert.ok(Math.hypot(p.x-FACTORY_DISPATCH_STOP[0],p.y-FACTORY_DISPATCH_STOP[1])<1e-8);assert.ok(p.y+DETAIL_MODEL_METADATA.truck.bounds.max[1]<factory.y-45);assert.ok(p.x-factory.x>40);});
test('all authored fleet routes keep complete vehicle envelopes outside drone factory',()=>{
 for(const routeId of Object.keys(ROUTES)){const meta=/depot/.test(routeId)?DETAIL_MODEL_METADATA.tractor:DETAIL_MODEL_METADATA.truck;for(let step=0;step<=4000;step++){const pose=routePosition(routeId,step/4000),c=Math.cos(pose.heading),s=Math.sin(pose.heading);for(const x of [meta.bounds.min[0],meta.bounds.max[0]])for(const y of [meta.bounds.min[1],meta.bounds.max[1]]){const px=pose.x+x*c+y*s-factory.x,py=pose.y-x*s+y*c-factory.y;assert.ok(!(Math.abs(px)<75&&Math.abs(py)<45),`${routeId} at${step/4000} enters factory`);}}}
});
test('service starts at the exterior dispatch stop and joins the existing workshop bay continuously',()=>{const start=routePosition('factory-to-depot',0),end=routePosition('factory-to-depot',1),bay=routePosition('depot-bay',0);assert.equal(start.x,FACTORY_DISPATCH_STOP[0]);assert.equal(start.y,FACTORY_DISPATCH_STOP[1]);assert.deepEqual([end.x,end.y],[bay.x,bay.y]);const first=routePosition('delivery',0),last=routePosition('delivery',1);assert.ok(Math.hypot(first.x-last.x,first.y-last.y)<1e-8);});

test('both overview and close LOD keep actual far/detailed envelopes outside the factory',()=>{
 for(const roadScale of [1,2])for(const routeId of Object.keys(ROUTES))for(let step=0;step<=2000;step++){
  const v={id:'TRK-104',model:'truck',routeId,status:'moving',...routePosition(routeId,step/2000)},variant=vehicleModelVariant(v),pose=vehiclePresentationPose(v,roadScale,.36),meta=DETAIL_MODEL_METADATA[variant],parts=MODEL_REGISTRY[variant];
  const xs=[meta.bounds.min[0],meta.bounds.max[0],...parts.flatMap(([w,,,x])=>[x-w/2,x+w/2])],ys=[meta.bounds.min[1],meta.bounds.max[1],...parts.flatMap(([,l,,,y])=>[y-l/2,y+l/2])];
  for(const x of [Math.min(...xs),Math.max(...xs)])for(const y of [Math.min(...ys),Math.max(...ys)]){const px=v.x+(x*Math.cos(v.heading)+y*Math.sin(v.heading))*pose.scale-factory.x,py=v.y+(-x*Math.sin(v.heading)+y*Math.cos(v.heading))*pose.scale-factory.y;assert.ok(!(Math.abs(px)<75&&Math.abs(py)<45),`${routeId} scale${roadScale} progress${step/2000}`);}
 }
 const arrival={model:'truck',routeId:'port-to-factory',...routePosition('port-to-factory',1)};assert.equal(vehiclePresentationPose(arrival,2).scale,1);
});
test('cargo carriers always retain meter scale so cargo supports never move with camera LOD',()=>{for(const routeId of ['cargo-port','cargo-outbound','cargo-arrival','cargo-bay','cargo-return'])assert.equal(vehiclePresentationPose({model:'truck',routeId,x:10000,y:10000},2).scale,1);});
