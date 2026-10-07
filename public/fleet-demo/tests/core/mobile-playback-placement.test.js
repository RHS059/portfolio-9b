import test from 'node:test';
import assert from 'node:assert/strict';
import {floatingPlaybackBottom} from '../../src/app/mobile-playback-placement.js';
const input={viewportHeight:844,bottom:14,height:46,left:120,right:270};
const bounds=(top,bottom)=>({top,bottom,left:24,right:366});
test('normal pause position stays unchanged when choices are clear or offscreen',()=>{
 for(const region of [bounds(200,330),bounds(900,1030),bounds(-140,-10),{top:780,bottom:900,left:280,right:390}])assert.equal(floatingPlaybackBottom({...input,region}),14);
});
test('pause lifts above choices without covering them or leaving the phone viewport',()=>{
 for(const top of [665,730,780,815]){const region=bounds(top,top+130),bottom=floatingPlaybackBottom({...input,region});const low=844-bottom,high=low-46;assert.ok(high>=8);assert.ok(low<=830);assert.ok(low<=region.top-12);}
});
test('safe area and short mobile viewports retain reachable non-overlapping pause',()=>{
 for(const [viewportHeight,bottom,top]of [[844,34,775],[360,14,270],[300,20,190]]){const region=bounds(top,top+120),position=floatingPlaybackBottom({...input,viewportHeight,bottom,region}),low=viewportHeight-position;assert.ok(low-46>=8);assert.ok(low<=region.top-12);}
});
test('invalid or cramped geometry preserves the safe-area inset',()=>{
 assert.equal(floatingPlaybackBottom({...input,region:bounds(NaN,800)}),14);assert.equal(floatingPlaybackBottom({}),14);
 const position=floatingPlaybackBottom({viewportHeight:200,bottom:70,height:46,left:120,right:270,region:bounds(5,100)});assert.ok(position>=70);
});

test('floating playback clears the camera icons on narrow phones and all supplied regions',()=>{
 for(const width of [320,390]){
  const left=(width-48)/2,right=left+48,regions=[{top:660,bottom:710,left:24,right:width-24},{top:770,bottom:826,left:width-182,right:width-28}];
  for(const order of [regions,[...regions].reverse()]){const bottom=floatingPlaybackBottom({viewportHeight:844,bottom:14,height:48,left,right,regions:order});const top=844-bottom-48,low=top+48;assert.ok(top>=8);assert.ok(low<=830);for(const region of regions)assert.ok(right<=region.left||left>=region.right||low<=region.top||top>=region.bottom);}
 }
});
