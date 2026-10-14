import test from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation} from '../../src/core/simulation.js';
test('fixed clock pauses, resets, clamps suspension and disposes',()=>{let now=0,cb,cancelled=false;const sim=createSimulation({now:()=>now,schedule:f=>(cb=f,1),cancel:()=>cancelled=true});now=100;cb();assert.equal(sim.getState().timeSeconds,.1);sim.setPaused(true);now=500;cb();assert.equal(sim.getState().timeSeconds,.1);sim.setPaused(false);now=10000;cb();assert.ok(sim.getState().timeSeconds<=.35);sim.reset();assert.equal(sim.getState().timeSeconds,0);sim.dispose();assert.ok(cancelled);});
