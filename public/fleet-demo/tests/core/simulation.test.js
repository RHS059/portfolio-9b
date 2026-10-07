import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation} from '../../src/core/simulation.js';
test('fixed clock pauses, resets, clamps suspension and disposes',()=>{let now=0,cb,cancelled=false;const sim=createSimulation({now:()=>now,schedule:f=>(cb=f,1),cancel:()=>cancelled=true});now=100;cb();assert.equal(sim.getState().timeSeconds,.1);sim.setPaused(true);now=500;cb();assert.equal(sim.getState().timeSeconds,.1);sim.setPaused(false);now=10000;cb();assert.ok(sim.getState().timeSeconds<=.35);sim.reset();assert.equal(sim.getState().timeSeconds,0);sim.dispose();assert.ok(cancelled);});

test('seeking the single visual clock is atomic, pause-preserving and reset-safe',()=>{
 let now=0,callback;const ticks=[];const sim=createSimulation({now:()=>now,schedule:fn=>(callback=fn,1),cancel:()=>{},onTick:state=>ticks.push(state)});
 sim.seek(64);assert.deepEqual(sim.getState(),{timeSeconds:64,paused:false});assert.deepEqual(ticks.at(-1),sim.getState());
 sim.setPaused(true);sim.seek(12.75);assert.deepEqual(sim.getState(),{timeSeconds:12.75,paused:true});now=1000;callback();assert.equal(sim.getState().timeSeconds,12.75);
 sim.setPaused(false);now=1050;callback();assert.equal(sim.getState().timeSeconds,12.8);
 for(const invalid of [-1,NaN,Infinity,'20'])assert.throws(()=>sim.seek(invalid),RangeError);assert.equal(sim.getState().timeSeconds,12.8);
 sim.reset();assert.equal(sim.getState().timeSeconds,0);sim.dispose();const count=ticks.length;sim.seek(40);assert.equal(ticks.length,count);assert.equal(sim.getState().timeSeconds,0);
});
