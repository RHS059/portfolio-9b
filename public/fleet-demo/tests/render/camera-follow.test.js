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
