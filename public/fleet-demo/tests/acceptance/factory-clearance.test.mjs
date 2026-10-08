import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {pointInRing,edges,intersects} from './geometry-assertions.mjs';
const root=process.env.FLEET_DEMO_ROOT||fileURLToPath(new URL('../../',import.meta.url));
const load=p=>import(pathToFileURL(resolve(root,p)));
const [{SITES,ROUTES,routePosition},{MODEL_REGISTRY},{vehicleModelVariant,vehiclePresentationPose},{DETAIL_MODEL_METADATA}]=await Promise.all([
  load('src/render/map/world.js'),load('src/render/core/models.js'),load('src/render/core/presentation-pose.js'),load('src/render/vehicles/detail-model.js')]);
const factory=SITES.find(s=>s.id==='centerpoint');
const building=[[-75,-45],[75,-45],[75,45],[-75,45]];
function overlaps(a,b){return a.some(p=>pointInRing(p,b))||b.some(p=>pointInRing(p,a))||edges(a).some(([p,q])=>edges(b).some(([r,s])=>intersects(p,q,r,s)));}
function overviewBounds(kind){const parts=MODEL_REGISTRY[kind];return{min:[Math.min(...parts.map(([w,d,h,x,y])=>x-w/2)),Math.min(...parts.map(([w,d,h,x,y])=>y-d/2))],max:[Math.max(...parts.map(([w,d,h,x,y])=>x+w/2)),Math.max(...parts.map(([w,d,h,x,y])=>y+d/2))]};}
function footprint(v,bounds,scale){const c=Math.cos(v.heading),s=Math.sin(v.heading);return [[bounds.min[0],bounds.min[1]],[bounds.max[0],bounds.min[1]],[bounds.max[0],bounds.max[1]],[bounds.min[0],bounds.max[1]]].map(([x,y])=>[v.x+(x*c+y*s)*scale-factory.x,v.y+(-x*s+y*c)*scale-factory.y]);}

test('full presentation footprints stay outside factory in overview and close inspection',()=>{
  for(const zoom of [15,18.3])for(const routeId of Object.keys(ROUTES)){
    const roadScale=Math.min(2,Math.max(1,2**(16.3-zoom)));
    for(let tick=0;tick<=4000;tick++){
      const progress=tick/4000,v={id:'acceptance-route',model:'truck',status:'available',routeId,...routePosition(routeId,progress)},kind=vehicleModelVariant(v);
      const bounds=zoom<17.5?overviewBounds(kind):DETAIL_MODEL_METADATA[kind].bounds,{scale}=vehiclePresentationPose(v,roadScale),shape=footprint(v,bounds,scale);
      assert.ok(!overlaps(shape,building),`${routeId} progress=${progress} zoom=${zoom} scale=${scale} intersects factory: ${JSON.stringify(shape)}`);
    }
  }
});

test('clearance polygon guard detects crossing edges even with all vehicle corners outside',()=>{
  assert.equal(overlaps([[-100,-1],[100,-1],[100,1],[-100,1]],building),true);
  assert.equal(overlaps([[80,50],[90,50],[90,60],[80,60]],building),false);
});
