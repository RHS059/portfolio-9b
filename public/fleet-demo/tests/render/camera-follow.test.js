import test from 'node:test';
import assert from 'node:assert/strict';
import {createCameraController} from '../../src/render/camera/controller.js';
test('following a newly focused truck applies its full camera target before normal follow updates',()=>{
 const jumps=[],eases=[],map={getContainer:()=>({getBoundingClientRect:()=>({width:1200,height:800})}),jumpTo:value=>jumps.push(value),easeTo:value=>eases.push(value)};
 const camera=createCameraController(()=>map);camera.setFollow(true);camera.setView('iso',{focusId:'TRK-208'});
 camera.update([{id:'TRK-208',x:100,y:200}],100);assert.equal(eases.length,0);assert.equal(jumps.length,1);assert.equal(jumps[0].zoom,18.3);assert.equal(jumps[0].pitch,52);assert.equal(jumps[0].bearing,-28);
 camera.update([{id:'TRK-208',x:101,y:201}],150);assert.equal(jumps.length,1);
 camera.update([{id:'TRK-208',x:102,y:202}],180);assert.equal(jumps.length,2);assert.notDeepEqual(jumps[1].center,jumps[0].center);
});
test('paused follow leaves the static basemap idle and resumes tracking when the truck moves',()=>{
 const jumps=[],map={getContainer:()=>({getBoundingClientRect:()=>({width:1200,height:800})}),jumpTo:v=>jumps.push(v),easeTo:()=>{}};
 const camera=createCameraController(()=>map);camera.setFollow(true);camera.setFocus('TRK-208');
 const held=[{id:'TRK-208',x:100,y:200}];camera.update(held,100);
 for(let time=180;time<=10100;time+=80)camera.update(held,time);
 assert.equal(jumps.length,1,'An unchanged followed pose must not invalidate map rendering');
 camera.update([{...held[0],x:101}],10180);assert.equal(jumps.length,2);
 camera.setFocus('TRK-208');camera.update(held,10200);assert.equal(jumps.length,3,'Explicit focus still applies its target');
});
