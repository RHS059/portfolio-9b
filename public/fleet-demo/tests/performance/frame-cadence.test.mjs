import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeFrames,measureFrameCadence} from './frame-cadence.mjs';

test('frame summary uses measured elapsed time and preserves long pauses',()=>{
  const result=summarizeFrames([0,10,20,1020]);
  assert.equal(result.intervals,3);assert.equal(result.elapsedMs,1020);
  assert.equal(result.rafPerSecond,3000/1020);assert.equal(result.p95Ms,1000);
  assert.equal(result.intervalsOver50ms,1);
  assert.match(result.measurement,/not a certified.*GPU/);
});
test('no samples produces no invented FPS',()=>{
  const result=summarizeFrames([]);assert.equal(result.rafPerSecond,null);assert.equal(result.p95Ms,null);
});
test('invalid/non-increasing intervals are not counted as frames',()=>{
  const result=summarizeFrames([0,0,-1,NaN,20,30]);assert.equal(result.intervals,1);assert.equal(result.elapsedMs,10);
});
test('real measurement requires named environment and source revision',async()=>{
  await assert.rejects(()=>measureFrameCadence(null),/Name the measured environment/);
});
