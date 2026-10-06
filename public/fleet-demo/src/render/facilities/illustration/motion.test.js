import test from 'node:test';
import assert from 'node:assert/strict';
import { illustrativePosition } from './motion.js';
const path=[[0,0],[10,0],[10,10],[0,10],[0,0]];
test('illustration follows supplied time and never accumulates frame delta',()=>{
 const a=illustrativePosition({timeSeconds:5},path,40);assert.equal(a.x,5);assert.equal(a.y,0);
 for(let i=0;i<30;i++)assert.deepEqual(illustrativePosition({timeSeconds:5},path,40),a);
});
test('pause and reset are deterministic from frozen visual snapshots',()=>{
 const s=Object.freeze({timeSeconds:15,paused:true}),pose=illustrativePosition(s,path,40);
 assert.deepEqual(illustrativePosition(s,path,40),pose);assert.deepEqual(illustrativePosition({timeSeconds:0},path,40),illustrativePosition(undefined,path,40));
});
test('negative or absent clocks normalize to the start',()=>{
 for(const timeSeconds of [-1,NaN,Infinity,undefined])assert.deepEqual(illustrativePosition({timeSeconds},path,40),illustrativePosition({timeSeconds:0},path,40));
});
test('wrapping has identical location and heading at a period boundary',()=>{
 assert.deepEqual(illustrativePosition({timeSeconds:40},path,40),illustrativePosition({timeSeconds:0},path,40));
});
test('authority and issue flags cannot change sorting geometry',()=>{
 assert.deepEqual(illustrativePosition({timeSeconds:5,issueActive:true,authorityResolved:false},path,40),illustrativePosition({timeSeconds:5,issueActive:false,authorityResolved:true},path,40));
});
test('invalid visual paths and periods fail explicitly',()=>{
 assert.throws(()=>illustrativePosition({},[],40),TypeError);assert.throws(()=>illustrativePosition({},path,0),RangeError);
});
