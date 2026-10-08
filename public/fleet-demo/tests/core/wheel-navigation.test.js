import test from 'node:test';
import assert from 'node:assert/strict';
import {forwardSceneLabelWheel} from '../../src/app/wheel-navigation.js';
class Wheel {constructor(type,init){this.type=type;Object.assign(this,init);}}
const values={deltaX:2,deltaY:550,deltaZ:0,deltaMode:0,clientX:900,clientY:430,screenX:950,screenY:480,ctrlKey:true,shiftKey:false,altKey:true,metaKey:false};
test('label wheel input preserves pointer, deltas and modifiers on the actual map surface',()=>{
 let prevented=0;const events=[],event={...values,target:{closest:selector=>selector==='.fleet-scene-label'},preventDefault:()=>prevented++};
 assert.equal(forwardSceneLabelWheel(event,{dispatchEvent:e=>events.push(e)},Wheel),true);assert.equal(prevented,1);assert.equal(events.length,1);
 for(const[key,value]of Object.entries(values))assert.equal(events[0][key],value);assert.equal(events[0].type,'wheel');assert.equal(events[0].bubbles,true);assert.equal(events[0].cancelable,true);
});
test('normal canvas, cancelled input and missing map remain untouched without forwarding loops',()=>{
 let events=0,prevented=0;const canvas={dispatchEvent:()=>events++},base={...values,preventDefault:()=>prevented++};
 assert.equal(forwardSceneLabelWheel({...base,target:{closest:()=>null}},canvas,Wheel),false);
 assert.equal(forwardSceneLabelWheel({...base,defaultPrevented:true,target:{closest:()=>true}},canvas,Wheel),false);
 assert.equal(forwardSceneLabelWheel({...base,target:{closest:()=>true}},null,Wheel),false);
 assert.equal(forwardSceneLabelWheel({...base,target:{closest:()=>true}},canvas,null),false);
 assert.equal(events,0);assert.equal(prevented,0);
});
