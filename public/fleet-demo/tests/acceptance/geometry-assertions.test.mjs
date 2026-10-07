import test from 'node:test';
import assert from 'node:assert/strict';
import {pointInRing,polygonBoundaryDistance,laneFootprintDistance,segmentDistance,polygonArea} from './geometry-assertions.mjs';

test('independent geometry checker catches an edge crossing a concave water notch',()=>{
  const yard=[[0,0],[10,0],[10,10],[7,10],[7,3],[3,3],[3,10],[0,10]];
  const bridge=[[1,8],[9,8],[9,9],[1,9]];
  assert.ok(bridge.every(p=>pointInRing(p,yard)));
  assert.equal(polygonBoundaryDistance(bridge,yard),0);
});
test('lane checker catches crossing, contained and separated lane segments',()=>{
  const footprint=[[0,0],[10,0],[10,10],[0,10]];
  assert.equal(laneFootprintDistance([[-2,5],[12,5]],footprint),0);
  assert.equal(laneFootprintDistance([[2,5],[8,5]],footprint),0);
  assert.equal(laneFootprintDistance([[12,0],[12,10]],footprint),2);
});
test('boundary checker handles closed rings and outside corners',()=>{
  const boundary=[[0,0],[10,0],[10,10],[0,10],[0,0]];
  assert.equal(polygonBoundaryDistance([[2,2],[8,2],[8,8],[2,8]],boundary),2);
  assert.equal(polygonBoundaryDistance([[-1,2],[8,2],[8,8],[-1,8]],boundary),-1);
  assert.equal(polygonArea(boundary),100);
});
test('segment distance handles degenerate, collinear and proper crossing cases',()=>{
  assert.equal(segmentDistance([0,0],[0,0],[1,0],[2,0]),1);
  assert.equal(segmentDistance([0,0],[3,0],[1,0],[5,0]),0);
  assert.equal(segmentDistance([0,0],[4,4],[0,4],[4,0]),0);
});
