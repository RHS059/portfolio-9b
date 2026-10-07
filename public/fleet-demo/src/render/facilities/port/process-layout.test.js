import test from 'node:test';
import assert from 'node:assert/strict';
import { createPortLayout, pointInPolygon, footprintClearance, segmentsIntersect } from './layout.js';
import { createPortProcessLayout, PORT_PROCESS_DIMENSIONS } from './process-layout.js';
import { OICT_GEOGRAPHY } from '../../map/oict-geography.js';
const layout=createPortLayout(OICT_GEOGRAPHY);
const processLayout=createPortProcessLayout(layout);
test('one deterministic, explicitly illustrative berth derives from an admitted mapped crane',()=>{
 assert.deepEqual(createPortProcessLayout(layout),processLayout);
 assert.equal(processLayout.craneId,'schematic-gantry-5');
 assert.equal(processLayout.ship.surveyed,false);
 assert.ok(Object.isFrozen(processLayout.pickup.position));
 assert.match(processLayout.approximation,/not surveyed/);
 assert.equal(createPortProcessLayout({cranes:[]}),null);
});
test('whole ship footprint is seaward, clear of all mapped land and quay',()=>{
 const corners=processLayout.ship.corners;
 const boundary=layout.footprint.map((p,i)=>[p,layout.footprint[(i+1)%layout.footprint.length]]);
 assert.ok(corners.every(p=>!pointInPolygon(p,layout.footprint)));
 assert.ok(layout.footprint.every(p=>!pointInPolygon(p,corners)));
 for(let i=0;i<corners.length;i++)for(const [a,b]of boundary)assert.ok(!segmentsIntersect(corners[i],corners[(i+1)%corners.length],a,b));
 const quay=layout.quay.slice(1).map((p,i)=>[layout.quay[i],p]);assert.ok(footprintClearance(corners,quay)>=8);
 assert.ok(Math.abs(Math.hypot(corners[0][0]-corners[1][0],corners[0][1]-corners[1][1])-168)<1e-8);
 assert.ok(Math.abs(Math.hypot(corners[1][0]-corners[2][0],corners[1][1]-corners[2][1])-26)<1e-8);
});
test('trailer load pose is between unchanged crane feet and leaves mapped lanes untouched',()=>{
 const crane=layout.cranes.find(c=>c.id===processLayout.craneId);
 assert.ok(pointInPolygon(processLayout.trailer.position,crane.corners));
 assert.equal(processLayout.trailer.position[2],1.33);
 assert.equal(processLayout.pickup.position[2],PORT_PROCESS_DIMENSIONS.deckHeight);
 assert.equal(processLayout.rotationZ,layout.rotationZ);
});
