import test from 'node:test';
import assert from 'node:assert/strict';
import {MapStartupDiagnostics} from '../../src/render/core/map-startup.js';
import {createFleetScene} from '../../src/render/core/index.js';
import {installDomHost,Element} from './dom-host.js';

test('startup diagnostics retain stalled source readiness after map retirement without GPU calls',()=>{
 const trace=new MapStartupDiagnostics();const map={isStyleLoaded:()=>true,loaded:()=>false,getSource:()=>({}),isSourceLoaded:()=>false,getCanvas:()=>{throw Error('must not query graphics');}};
 trace.begin(10);trace.record('created',11,map);trace.record('style.load',20,map);for(let i=0;i<4;i++)trace.record('render',30+i,map);trace.record('startup-timeout',15011,map);
 assert.deepEqual({...trace.get().current,events:[]},{attempt:1,startedAt:10,lastAt:15011,phase:'startup-timeout',renderCount:4,lastRenderAt:33,styleLoaded:true,mapLoaded:false,sourceLoaded:false,events:[]});
 const copy=trace.get();copy.current.phase='tampered';assert.equal(trace.get().current.phase,'startup-timeout');
 for(let i=0;i<4;i++){trace.begin(20000+i);for(let j=0;j<20;j++)trace.record('sourcedata',j,map,{sourceId:'openmaptiles',sourceDataType:'content',isSourceLoaded:false});}
 assert.equal(trace.get().previous.length,2);assert.equal(trace.get().current.events.length,16);
});

test('scene startup delegates context creation to MapLibre without a disposable probe',async t=>{
 const host=installDomHost(t),container=new Element('div');let created=0,removed=0;
 globalThis.THREE={};globalThis.maplibregl={Map:class{constructor({container}){created++;this.canvas=new Element('canvas');container.append(this.canvas);}on(){}getCenter(){return{toArray:()=>[0,0]};}getZoom(){return 1;}getPitch(){return 0;}getBearing(){return 0;}getCanvas(){return this.canvas;}remove(){removed++;this.canvas.remove();}}};
 // The minimal DOM deliberately has no getContext: a spare probe would throw.
 const scene=createFleetScene({container});t.after(()=>scene.dispose());assert.equal(created,1);assert.equal(scene.getMetrics().initializing,true);assert.equal(scene.getMetrics().mapStartup.current.phase,'created');
 scene.dispose();assert.equal(removed,1);assert.equal(host.frames.size,0);await host.settle();
});

test('MapLibre context creation failure retains the usable fallback and diagnostic cause',async t=>{
 const host=installDomHost(t),container=new Element('div');globalThis.THREE={};globalThis.maplibregl={Map:class{constructor(){throw Error('WebGL context unavailable');}}};
 const scene=createFleetScene({container});assert.equal(scene.getMetrics().initializing,false);assert.match(scene.getMetrics().renderer,/fallback/);assert.equal(scene.getMetrics().mapStartup.current.phase,'constructor-error');assert.match(scene.getMetrics().mapStartup.current.events.at(-1).error,/WebGL context unavailable/);
 scene.dispose();await host.settle();
});
