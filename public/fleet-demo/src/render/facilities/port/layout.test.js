import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPortLayout,pointInPolygon,footprintClearance,segmentsIntersect,segmentDistance} from './layout.js';
const synthetic={footprintLocal:[[0,0],[600,0],[600,500],[0,500],[0,0]],quayLocal:[[0,0],[600,0]],quayAlongUnit:[1,0],quayLandwardUnit:[0,1],yardLanes:[{id:'test-lane',points:[[0,250],[600,250]]}]};
test('rejects missing footprint/quay/lanes instead of inventing geography',()=>{
 for(const g of [undefined,{}, {...synthetic,quayLocal:[]},{...synthetic,yardLanes:[]}])assert.throws(()=>createPortLayout(g),TypeError);
});
test('segment clearance detects crossing, collinear overlap and endpoint containment',()=>{
 assert.ok(segmentsIntersect([0,0],[10,10],[0,10],[10,0]));assert.ok(segmentsIntersect([0,0],[10,0],[4,0],[20,0]));assert.equal(segmentDistance([0,0],[10,0],[0,8],[10,8]),8);
 assert.equal(footprintClearance([[0,0],[10,0],[10,10],[0,10]],[[[2,2],[3,3]]]),0);
});
test('layout preserves its input and publishes frozen exact footprints',()=>{
 const before=JSON.stringify(synthetic),l=createPortLayout(synthetic);assert.equal(JSON.stringify(synthetic),before);assert.ok(Object.isFrozen(l));assert.ok(Object.isFrozen(l.rows));assert.ok(l.rows.length>0);assert.ok(Object.isFrozen(l.rows[0].corners[0]));
});
test('all rectangle edges respect polygon and artistic lane/boundary margins',()=>{
 const l=createPortLayout(synthetic),boundary=l.footprint.map((p,i)=>[p,l.footprint[(i+1)%l.footprint.length]]),lanes=l.yardLanes.flatMap(r=>r.points.slice(1).map((p,i)=>[r.points[i],p]));
 for(const row of [...l.rows,...l.cranes]){assert.ok(row.corners.every(p=>pointInPolygon(p,l.footprint)));assert.ok(footprintClearance(row.corners,boundary)>=8);assert.ok(footprintClearance(row.corners,lanes)>=12);}
});
test('concave perimeter is respected across edges, not only rectangle corners',()=>{
 const g={...synthetic,footprintLocal:[[0,0],[600,0],[600,500],[330,500],[330,140],[300,140],[300,500],[0,500],[0,0]]};const l=createPortLayout(g);const b=l.footprint.map((p,i)=>[p,l.footprint[(i+1)%l.footprint.length]]);
 for(const r of l.rows)assert.ok(footprintClearance(r.corners,b)>=8);
});
test('representative budgets and ordering are deterministic',()=>{
 const a=createPortLayout(synthetic),b=createPortLayout(synthetic);assert.deepEqual(a,b);assert.ok(a.rows.length<=80);assert.ok(a.cranes.length<=9);
});
let actual;
if(process.env.FLEET_PORT_GEOGRAPHY_JSON)actual=JSON.parse(fs.readFileSync(process.env.FLEET_PORT_GEOGRAPHY_JSON,'utf8'));
else {try{actual=(await import('../../map/oict-geography.js')).OICT_GEOGRAPHY;}catch{}}
test('public mapped terminal placement fits the full quay and avoids all supplied lanes',{skip:actual?false:'Mapped geography module or FLEET_PORT_GEOGRAPHY_JSON required'},()=>{
 const l=createPortLayout(actual),boundary=l.footprint.map((p,i)=>[p,l.footprint[(i+1)%l.footprint.length]]),lanes=l.yardLanes.flatMap(r=>r.points.slice(1).map((p,i)=>[r.points[i],p]));
 assert.equal(l.yardLanes.length,68);assert.ok(l.quayLengthMeters>1800&&l.quayLengthMeters<1850);assert.ok(l.rows.length>=30);assert.ok(l.cranes.length>=5);
 for(const r of [...l.rows,...l.cranes]){assert.ok(r.corners.every(p=>pointInPolygon(p,l.footprint)));assert.ok(footprintClearance(r.corners,boundary)>=8);assert.ok(footprintClearance(r.corners,lanes)>=12);}
 const xs=l.rows.map(r=>r.center[0]),ys=l.rows.map(r=>r.center[1]);assert.ok(Math.max(...xs)-Math.min(...xs)>1400);assert.ok(Math.max(...ys)-Math.min(...ys)>850);
});
