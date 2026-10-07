import test from 'node:test';
import assert from 'node:assert/strict';
import {createStoryTextTransition} from '../../src/app/story-text-transition.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function host(){
 const animations=[],attrs=new Map();let reduced=false,opacity=1,text='';
 const element={style:{pointerEvents:'auto',opacity:''},setAttribute:(key,value)=>attrs.set(key,value),removeAttribute:key=>attrs.delete(key),animate(frames,options){let resolve,reject;const finished=new Promise((yes,no)=>{resolve=yes;reject=no;});const item={frames,options,finished,end:resolve,cancel(){item.cancelled=true;reject(new Error('cancelled'));}};animations.push(item);return item;}};
 const transition=createStoryTextTransition({element,reducedMotion:()=>reduced,readOpacity:()=>opacity});
 return {element,animations,attrs,transition,get text(){return text;},set reduced(value){reduced=value;},set opacity(value){opacity=value;},paint:value=>()=>{text=value;}};
}
test('old text fades out before the new text fades in, with one final commit',async()=>{
 const h=host();h.transition.update('a',h.paint('A'));assert.equal(h.text,'A');assert.equal(h.animations.length,0);
 h.transition.update('b',h.paint('B'));assert.equal(h.text,'A');assert.equal(h.transition.getState().phase,'out');assert.equal(h.animations[0].options.duration,120);
 h.animations[0].end();await flush();assert.equal(h.text,'B');assert.equal(h.transition.getState().phase,'in');assert.equal(h.animations[1].options.duration,180);
 h.animations[1].end();await flush();assert.deepEqual(h.transition.getState(),{phase:'idle',renderedKey:'b',targetKey:'b'});assert.equal(h.element.style.opacity,'');assert.equal(h.element.style.pointerEvents,'auto');assert.equal(h.attrs.has('aria-busy'),false);
});
test('rapid next/back/scrub cancels older generations and only paints the latest target',async()=>{
 const h=host();h.transition.update('a',h.paint('A'));h.transition.update('b',h.paint('B'));h.transition.update('a',h.paint('A again'));h.transition.update('d',h.paint('D'));
 assert.equal(h.animations.length,3);assert.ok(h.animations[0].cancelled);assert.ok(h.animations[1].cancelled);
 h.animations[0].end();h.animations[1].end();await flush();assert.equal(h.text,'A');
 h.animations[2].end();await flush();assert.equal(h.text,'D');h.animations[3].end();await flush();assert.equal(h.transition.getState().renderedKey,'d');
});
test('retargeting during fade-in starts from the visible opacity and commits current text',async()=>{
 const h=host();h.transition.update('a',h.paint('A'));h.transition.update('b',h.paint('B'));h.animations[0].end();await flush();
 h.opacity=.35;h.transition.update('c',h.paint('C'));assert.ok(h.animations[1].cancelled);assert.equal(h.animations[2].frames[0].opacity,.35);
 h.animations[2].end();await flush();h.animations[3].end();await flush();assert.equal(h.text,'C');assert.equal(h.transition.getState().phase,'idle');
});
test('same-target renders reuse the pending animation and keep its latest paint callback',async()=>{
 const h=host();h.transition.update('a',h.paint('A'));h.transition.update('b',h.paint('B'));h.transition.update('b',h.paint('B latest'));assert.equal(h.animations.length,1);
 h.animations[0].end();await flush();assert.equal(h.text,'B latest');h.animations[1].end();await flush();h.transition.update('b',h.paint('B current'));assert.equal(h.text,'B current');assert.equal(h.animations.length,2);
});
test('reduced motion is immediate, including a preference change during transition',async()=>{
 const h=host();h.reduced=true;h.transition.update('a',h.paint('A'));h.transition.update('b',h.paint('B'));assert.equal(h.text,'B');assert.equal(h.animations.length,0);
 h.reduced=false;h.transition.update('c',h.paint('C'));h.reduced=true;h.transition.finish();await flush();assert.equal(h.text,'C');assert.equal(h.transition.getState().phase,'idle');assert.ok(h.animations[0].cancelled);
});
test('deferred focus runs once after the latest commit and disposal blocks late writes',async()=>{
 const h=host();let focus=0;h.transition.update('a',h.paint('A'));h.transition.update('b',h.paint('B'));h.transition.afterCommit(()=>focus++);h.transition.update('c',h.paint('C'));h.transition.afterCommit(()=>focus+=10);
 h.animations[1].end();await flush();assert.equal(focus,10);h.transition.dispose();h.animations[2].end();await flush();assert.equal(focus,10);assert.equal(h.text,'C');assert.equal(h.element.style.pointerEvents,'auto');
 const next=host();next.transition.update('a',next.paint('A'));next.transition.update('b',next.paint('B'));next.transition.dispose();next.animations[0].end();await flush();assert.equal(next.text,'A');next.transition.update('c',next.paint('C'));assert.equal(next.text,'A');
});
test('missing Web Animations API falls back to immediate text without timers',()=>{
 let text='';const transition=createStoryTextTransition({element:{style:{},removeAttribute(){}}});transition.update('a',()=>{text='A';});transition.update('b',()=>{text='B';});assert.equal(text,'B');assert.equal(transition.getState().phase,'idle');transition.dispose();
});
