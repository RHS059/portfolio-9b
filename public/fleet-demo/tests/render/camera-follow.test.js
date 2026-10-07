import test from 'node:test';
import assert from 'node:assert/strict';
import {createCameraController} from '../../src/render/camera/controller.js';
import {toLngLat,toLocal} from '../../src/render/map/world.js';

const pose=(x,y=0,extra={})=>Object.freeze({id:'TRK-208',x,y,...extra});
function fixture(){
 const jumps=[],eases=[],bounds=[],map={getContainer:()=>({getBoundingClientRect:()=>({width:1200,height:800})}),jumpTo:v=>jumps.push(v),easeTo:v=>eases.push(v),fitBounds:(value,options)=>bounds.push({value,options})};
 const camera=createCameraController(()=>map);
 camera.setFollow(true);camera.setView('iso',{focusId:'TRK-208'});
 return {camera,jumps,eases,bounds,map};
}
const close=(actual,expected,tolerance=1e-6)=>assert.ok(Math.abs(actual-expected)<tolerance,`${actual} should equal ${expected}`);

test('new follow focus applies one complete target, then tracks every available frame',()=>{
 const {camera,jumps,eases}=fixture();
 camera.update([pose(100,200)],100);
 assert.equal(eases.length,0);assert.equal(jumps.length,1);
 assert.deepEqual(jumps[0],{center:toLngLat([100,200]),zoom:18.3,pitch:52,bearing:-28});
 for(const time of [116,132,148,180])camera.update([pose(100+(time-100)/20,200)],time);
 assert.equal(jumps.length,5,'The old 80 ms gate must not discard available frames');
 assert.ok(toLocal(jumps[1].center)[0]>100);
 assert.ok(toLocal(jumps[1].center)[0]<100.8,'The camera damps the target instead of jumping straight to it');
 assert.ok(jumps.slice(1).every(value=>Object.keys(value).join(',')==='center'));
 assert.equal(eases.length,0,'Following never restarts an easing animation');
});

test('follow damping has the same elapsed-time response at 60, 30, 13.43 FPS and uneven cadence',()=>{
 function run(times){const {camera,jumps}=fixture();camera.update([pose(0)],0);for(const time of times)camera.update([pose(time*.1)],time);return toLocal(jumps.at(-1).center)[0];}
 const uniform=hz=>{const times=[];for(let t=1000/hz;t<2000;t+=1000/hz)times.push(t);return [...times,2000];};
 const paths=[uniform(60),uniform(30),uniform(13.43),[10,35,100,190,280,415,500,710,850,1000,1180,1300,1500,1660,1820,2000]];
 const expected=200-12*(1-Math.exp(-2000/120));
 for(const times of paths)close(run(times),expected);
});

test('a corner is damped continuously without overshoot or cadence-dependent drift',()=>{
 function run(step){const {camera,jumps}=fixture();camera.update([pose(0)],0);for(let t=step;t<=1000;t+=step)camera.update([pose(t*.05)],t);for(let t=1000+step;t<=2000;t+=step)camera.update([pose(50,(t-1000)*.05)],t);return {jumps,center:toLocal(jumps.at(-1).center)};}
 const fast=run(10),slow=run(100);close(fast.center[0],slow.center[0]);close(fast.center[1],slow.center[1]);
 for(const jump of fast.jumps){const [x,y]=toLocal(jump.center);assert.ok(x>=-1e-6&&x<=50.000001&&y>=-1e-6&&y<=50.000001);}
});

test('a paused or stopped pose leaves the basemap idle and resumes without a catch-up sweep',()=>{
 const {camera,jumps}=fixture(),held=pose(100,200);
 camera.update([pose(99,200)],0);camera.update([held],16);const count=jumps.length,center=jumps.at(-1).center;
 for(let time=32;time<=10000;time+=16)camera.update([held],time);
 assert.equal(jumps.length,count);assert.deepEqual(jumps.at(-1).center,center);
 camera.update([pose(101,200)],10016);assert.equal(jumps.length,count+1);
 assert.ok(toLocal(jumps.at(-1).center)[0]<101);
 camera.setFocus('TRK-208');camera.update([held],10032);
 assert.deepEqual(jumps.at(-1).center,toLngLat([100,200]),'Explicit refocus still recenters exactly');
});

test('manual pan cancels pending focus and follow until an explicit follow or focus request',()=>{
 const {camera,jumps}=fixture();camera.markManual();camera.update([pose(0)],0);assert.equal(jumps.length,0);
 camera.setFollow(true);camera.update([pose(10)],16);assert.equal(jumps.length,1);
 camera.markManual();camera.update([pose(20)],32);assert.equal(jumps.length,1);assert.equal(camera.get().manual,true);
 camera.setFocus('TRK-208');camera.update([pose(30)],48);assert.equal(jumps.length,2);assert.equal(camera.get().manual,false);
 camera.setFollow(false);camera.update([pose(40)],64);assert.equal(jumps.length,2);
});

test('seek, replay, route switch and long stalls never sweep across unrelated poses',()=>{
 const variants=[
  [pose(100,0,{routeId:'delivery',progress:.5}),pose(80,0,{routeId:'delivery',progress:.4}),16],
  [pose(100,0,{routeId:'delivery',progress:.1}),pose(110,0,{routeId:'delivery',progress:.6}),16],
  [pose(100,0,{routeId:'delivery'}),pose(110,0,{routeId:'depot-bay'}),16],
  [pose(100,0,{trafficRouteId:'one'}),pose(110,0,{trafficRouteId:'two'}),16],
  [pose(100),pose(500),16],
  [pose(100),pose(110),2000],
 ];
 for(const [start,end,time]of variants){const {camera,jumps}=fixture();camera.update([start],0);camera.update([end],time);assert.deepEqual(jumps.at(-1).center,toLngLat([end.x,end.y]));assert.equal(jumps.length,2);}
});

test('reduced motion uses direct tracking, and explicit nonanimated vehicle focus stays nonanimated',()=>{
 const original=globalThis.matchMedia;globalThis.matchMedia=()=>({matches:true});
 try{const {camera,jumps,eases}=fixture();camera.update([pose(0)],0);camera.update([pose(1)],16);assert.deepEqual(jumps.at(-1).center,toLngLat([1,0]));camera.setFollow(false);camera.setView('3d',{focusId:'TRK-208'});camera.update([pose(2)],32);assert.equal(eases.at(-1).duration,0);}finally{if(original)globalThis.matchMedia=original;else delete globalThis.matchMedia;}
 const {camera,eases}=fixture();camera.setFollow(false);camera.setView('3d',{focusId:'TRK-208',animate:false});camera.update([pose(0)],0);assert.equal(eases.at(-1).duration,0);
});

test('nonanimated follow view changes apply the whole preset without a competing native ease',()=>{
 const {camera,jumps,eases}=fixture();camera.update([pose(0)],0);camera.setView('3d',{animate:false});camera.update([pose(1)],16);assert.equal(eases.length,0);assert.equal(jumps.length,2);assert.equal(jumps.at(-1).pitch,65);assert.equal(jumps.at(-1).bearing,-16);
 camera.setView('2d',{focusId:'TRK-208'});camera.update([pose(2)],32);assert.equal(jumps.at(-1).pitch,0);assert.equal(jumps.at(-1).bearing,0);
});

test('context recreation preserves a held view and starts moving again without resetting its orientation',()=>{
 const one={calls:[],jumpTo(v){this.calls.push(v);}},two={calls:[],jumpTo(v){this.calls.push(v);}};let map=one;
 const camera=createCameraController(()=>map);camera.setFollow(true);camera.setFocus('TRK-208');camera.update([pose(0)],0);camera.update([pose(1)],16);
 map=null;camera.update([pose(1)],100);map=two;camera.update([pose(1)],1000);assert.equal(two.calls.length,0);
 camera.update([pose(2)],1016);assert.equal(two.calls.length,1);assert.deepEqual(Object.keys(two.calls[0]),['center']);
});

test('missing and invalid target poses are ignored, and reappearing actors start from a fresh target',()=>{
 const {camera,jumps}=fixture();camera.update([pose(0)],0);camera.update([],16);camera.update([pose(NaN)],32);assert.equal(jumps.length,1);camera.update([pose(10)],48);assert.deepEqual(jumps.at(-1).center,toLngLat([10,0]));
});

test('following is read-only and supports changing the narrative vehicle identity atomically',()=>{
 const {camera,jumps}=fixture();const first=Object.freeze([pose(0)]),second=Object.freeze([pose(400,20,{id:'TRK-104'})]);const before=JSON.stringify([first,second]);
 camera.update(first,0);camera.setView('3d',{focusId:'TRK-104'});camera.update(second,16);
 assert.deepEqual(jumps.at(-1),{center:toLngLat([400,20]),zoom:18.3,pitch:65,bearing:-16});assert.equal(camera.get().focus,'TRK-104');assert.equal(JSON.stringify([first,second]),before);
});
