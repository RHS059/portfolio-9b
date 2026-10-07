import test from 'node:test';
import assert from 'node:assert/strict';
import {STORY_SCENES,STORY_DURATION,sampleStory,sceneTime,sampleMileage,sampleCost} from '../../src/app/story-timeline.js';
test('nine scenes are contiguous, finite and immutable',()=>{
 assert.equal(STORY_SCENES.length,9);assert.equal(new Set(STORY_SCENES.map(s=>s.id)).size,9);assert.equal(STORY_DURATION,124);
 let end=0;for(const scene of STORY_SCENES){assert.equal(scene.start,end);assert.ok(scene.duration>=10);assert.ok(Object.isFrozen(scene));end+=scene.duration;}
 assert.equal(end,STORY_DURATION);assert.ok(Object.isFrozen(STORY_SCENES));
});
test('story boundaries, scrubbing and replay are deterministic',()=>{
 assert.equal(sampleStory(-1).index,0);assert.equal(sampleStory(NaN).index,0);
 for(let index=0;index<9;index++){const item=STORY_SCENES[index];assert.equal(sampleStory(sceneTime(index)).id,item.id);assert.equal(sampleStory(sceneTime(index,.5)).progress,.5);assert.equal(sampleStory(item.start+item.duration-.001).id,item.id);}
 assert.equal(sampleStory(124).index,8);assert.equal(sampleStory(124).complete,true);assert.equal(sampleStory(1000).progress,1);
 assert.equal(sceneTime(-10),0);assert.equal(sceneTime(50),114);assert.equal(sceneTime(NaN),0);assert.deepEqual(sampleStory(65),sampleStory(65));
});
test('mileage loops from stale30k to50k/50.5k/51k without creating data records',()=>{
 for(let cycle=0;cycle<3;cycle++){const stale=sampleMileage(cycle*3),current=sampleMileage(cycle*3+2);assert.equal(stale.display,30000);assert.equal(stale.maintenanceDue,false);assert.equal(current.display,50000+cycle*500);assert.equal(current.maintenanceDue,true);assert.equal(current.illustrative,true);}
 assert.deepEqual(sampleMileage(0),sampleMileage(9));assert.deepEqual(sampleMileage(2),sampleMileage(11));
});
test('two-week illustration keeps counts separate from unknown real costs',()=>{
 assert.deepEqual(sampleCost(0),{day:1,visitDays:[1,4,8,12],visits:1,repeatVisits:0,unitCost:null,totalCost:null,repeatCost:null,illustrative:true});
 const last=sampleCost(1);assert.equal(last.day,14);assert.equal(last.visits,4);assert.equal(last.repeatVisits,3);assert.equal(last.repeatCost,null);
 assert.equal(sampleCost(1,200).repeatCost,600);assert.equal(sampleCost(1,200).totalCost,800);assert.equal(sampleCost(1,'').repeatCost,null);assert.equal(sampleCost(1,-2).repeatCost,null);assert.equal(sampleCost(1,0).repeatCost,0);
});
