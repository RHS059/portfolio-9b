import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkflowDialog} from '../../src/ui/original-workflow/dialog.js';
function fixture(){
  const doc={activeElement:null};
  class Host extends EventTarget {
    constructor(tag){super();this.tagName=tag;this.ownerDocument=doc;this.children=[];this.attributes={};this.dataset={};this.isConnected=true;this.open=false;}
    setAttribute(k,v){this.attributes[k]=v;}appendChild(child){child.parent=this;this.children.push(child);return child;}walk(){return this.children.flatMap(child=>[child,...child.walk()]);}
    querySelectorAll(selector){return this.walk().filter(el=>selector.includes('button')?el.tagName==='button':selector==='[data-original-close]'?Object.hasOwn(el.dataset,'originalClose'):false);}querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
    closest(){return null;}contains(el){return el===this||this.walk().includes(el);}showModal(){this.open=true;}close(){this.open=false;this.dispatchEvent(new Event('close'));}focus(){doc.activeElement=this;}remove(){this.removed=true;}
  }
  doc.createElement=tag=>new Host(tag);const trigger=new Host('button');doc.activeElement=trigger;let opens=0,closes=0,inner=false;
  const dialog=createWorkflowDialog({container:{ownerDocument:doc,appendChild(){}},onOpen:()=>opens++,onClose:()=>closes++,onEscape:()=>{if(inner){inner=false;return true;}return false;}});
  const native=dialog.element,first=native.querySelector('[data-original-close]'),last=new Host('button');dialog.body.appendChild(last);
  const key=(key,shiftKey=false)=>{const e=new Event('keydown',{cancelable:true});Object.assign(e,{key,shiftKey});native.dispatchEvent(e);return e;};return {doc,native,first,last,trigger,dialog,key,setInner(v){inner=v;},counts:()=>({opens,closes})};
}
test('idempotent open and close return focus to the actual trigger',()=>{const f=fixture();f.dialog.open();f.dialog.open();assert.equal(f.native.open,true);assert.equal(f.doc.activeElement,f.first);assert.deepEqual(f.counts(),{opens:1,closes:0});f.dialog.close();f.dialog.close();assert.equal(f.doc.activeElement,f.trigger);assert.deepEqual(f.counts(),{opens:1,closes:1});});
test('Tab cycles both ways and Escape dismisses an inner workflow layer before the modal',()=>{const f=fixture();f.dialog.open();assert.equal(f.key('Tab',true).defaultPrevented,true);assert.equal(f.doc.activeElement,f.last);assert.equal(f.key('Tab').defaultPrevented,true);assert.equal(f.doc.activeElement,f.first);f.setInner(true);f.key('Escape');assert.equal(f.dialog.isOpen,true);f.key('Escape');assert.equal(f.dialog.isOpen,false);});
test('native cancel and disposal remove listeners without duplicate callbacks',()=>{const f=fixture();f.dialog.open();const e=new Event('cancel',{cancelable:true});f.native.dispatchEvent(e);assert.equal(e.defaultPrevented,true);assert.equal(f.dialog.isOpen,false);f.dialog.open();f.dialog.dispose();f.dialog.dispose();assert.equal(f.native.removed,true);assert.deepEqual(f.counts(),{opens:2,closes:1});f.key('Escape');f.dialog.open();assert.deepEqual(f.counts(),{opens:2,closes:1});});
test('scene navigation may close without restoring focus to a now-hidden trigger',()=>{const f=fixture();f.dialog.open();f.dialog.close({restoreFocus:false});assert.equal(f.doc.activeElement,f.first);assert.equal(f.dialog.isOpen,false);});
