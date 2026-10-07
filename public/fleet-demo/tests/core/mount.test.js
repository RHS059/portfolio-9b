import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {mountFleetDemo} from '../../src/app/index.js';
import {installDomHost,Element} from '../render/dom-host.js';
const html=await readFile(new URL('../../index.html',import.meta.url),'utf8');
class HostElement extends Element {
 constructor(tag,doc){super(tag);this.ownerDocument=doc;this.listeners=new Map();this.scrollTop=0;this.className='';}
 addEventListener(type,fn,options){super.addEventListener(type,fn,options);let set=this.listeners.get(type);if(!set)this.listeners.set(type,set=new Set());set.add(fn);}
 removeEventListener(type,fn,options){super.removeEventListener(type,fn,options);this.listeners.get(type)?.delete(fn);}
 appendChild(node){this.append(node);return node;}
 contains(node){return node===this||this.walk().includes(node);}
 matches(selector){if(selector.startsWith('#'))return this.id===selector.slice(1);if(selector.startsWith('.'))return this.className.split(/\s+/).includes(selector.slice(1));const data=selector.match(/^\[data-([a-z-]+)(?:="([^"]+)")?\]$/);if(data){const key=data[1].replace(/-([a-z])/g,(_,c)=>c.toUpperCase());return Object.hasOwn(this.dataset,key)&&(data[2]===undefined||this.dataset[key]===data[2]);}return this.tagName===selector;}
 querySelectorAll(selector){return this.walk().filter(node=>selector.split(',').some(part=>node.matches?.(part.trim())));}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}
function setup(t){
 const host=installDomHost(t),doc=host.document;
 doc.createElement=tag=>new HostElement(tag,doc);doc.createElementNS=(_,tag)=>doc.createElement(tag);
 const prior=Object.getOwnPropertyDescriptor(globalThis,'matchMedia');globalThis.matchMedia=()=>({matches:false});t.after(()=>{if(prior)Object.defineProperty(globalThis,'matchMedia',prior);else delete globalThis.matchMedia;});
 const root=doc.createElement('main');root.className='workspace';root.dataset.intro='true';
 // A selector/event host, not an HTML parser or layout emulator. It executes the actual controller.
 for(const match of html.matchAll(/<([a-z][a-z0-9-]*)([^>]+)>/g)){
   const attrs=[...match[2].matchAll(/([a-z][a-z0-9-]*)="([^"]*)"/g)];
   if(!attrs.some(([,key])=>key==='id'||key==='class'||key.startsWith('data-')))continue;
   const node=doc.createElement(match[1]);for(const[,key,value]of attrs){node.setAttribute(key,value);if(key==='id')node.id=value;if(key==='class')node.className=value;if(key.startsWith('data-'))node.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=value;}
   if(node.className==='workspace')continue;root.append(node);
 }
 return{...host,root};
}
test('disposing before imports resolve prevents a late scene and removes control listeners',async t=>{
 const host=setup(t),controller=mountFleetDemo({root:host.root});controller.dispose();await controller.ready;await host.settle();
 assert.equal(host.frames.size,0);assert.equal(window.__fleetDemo,undefined);assert.equal(host.root.querySelector('#start-story').listeners.get('click').size,0);
 host.root.querySelector('#start-story').dispatchEvent(new Event('click'));assert.equal(host.root.dataset.intro,'true');controller.dispose();
});
test('same-root remount replaces the old controller and final disposal releases animation and handlers',async t=>{
 const host=setup(t),first=mountFleetDemo({root:host.root});await first.ready;await host.settle();host.flush();
 const start=host.root.querySelector('#start-story');assert.equal(start.listeners.get('click').size,1);start.dispatchEvent(new Event('click'));assert.equal(window.__fleetDemo.getState().intro,false);
 const original=window.__fleetDemo,second=mountFleetDemo({root:host.root});await second.ready;await host.settle();host.flush();
 assert.notEqual(window.__fleetDemo,original);assert.equal(window.__fleetDemo.getState().intro,true);assert.equal(start.listeners.get('click').size,1);
 start.dispatchEvent(new Event('click'));assert.equal(window.__fleetDemo.getState().intro,false);
 first.dispose();assert.ok(window.__fleetDemo,'Disposing an old controller cannot remove the new controller');second.dispose();assert.equal(window.__fleetDemo,undefined);assert.equal(host.frames.size,0);assert.equal(start.listeners.get('click').size,0);
});

test('inbound preview shares one clock, preserves the story trucks and holds completed output',async t=>{
 const host=setup(t),controller=mountFleetDemo({root:host.root});await controller.ready;await host.settle();host.flush();
 const api=window.__fleetDemo,truth=JSON.stringify(api.getState().scenario),first=api.getSceneSnapshot();
 assert.equal(first.cargoProcess.outgoingEnabled,false);assert.equal(first.cargoProcess.capabilities.onePassHold,true);
 assert.deepEqual(first.vehicles.map(v=>v.id).sort(),['CARGO-401','CARGO-402','CARGO-403','CARGO-404','TRK-104','TRK-208']);
 const opening=first.vehicles.find(v=>v.id==='TRK-208');assert.equal(opening.status,'moving');assert.equal(opening.routeId,'delivery');
 for(const seconds of [0,8.75,127.999,128,256,512,86400]){
  api.seekScene(seconds);const snapshot=api.getSceneSnapshot();assert.equal(snapshot.timeSeconds,seconds);assert.equal(snapshot.cargoProcess.timeSeconds,seconds);
  const ordinary=snapshot.vehicles.filter(v=>v.routeId==='delivery');assert.equal(ordinary.length,1);assert.equal(ordinary[0].id,'TRK-208');
  assert.ok(Number.isFinite(ordinary[0].progress)&&ordinary[0].progress>=0&&ordinary[0].progress<=1);
  if(seconds>=512){assert.equal(snapshot.cargoProcess.outboundVehicles.length,0);assert.ok(snapshot.cargoProcess.products.every(p=>p.held&&p.owner.kind==='workcell'));assert.ok(snapshot.cargoProcess.cargo.every(c=>c.batch===1));}
 }
 api.seekScene(128);const next=api.getSceneSnapshot().vehicles.find(v=>v.id==='TRK-208');assert.ok(Math.abs(next.progress-opening.progress)<1e-10);assert.equal(next.travelCycle,opening.travelCycle+1);
 assert.equal(JSON.stringify(api.getState().scenario),truth);controller.dispose();
});
