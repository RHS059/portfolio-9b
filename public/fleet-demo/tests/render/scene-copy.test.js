import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SITES} from '../../src/render/map/world.js';
import {createFleetScene} from '../../src/render/core/index.js';
import {installDomHost,Element} from './dom-host.js';

test('scene labels show identity and occupancy without explanatory captions',async t=>{
 const host=installDomHost(t),container=new Element('div');
 const scene=createFleetScene({container});
 scene.update({timeSeconds:1,paused:true,selectedId:'TRK-104',vehicles:[{id:'TRK-104',progress:0,routeId:'depot-bay',status:'workshop'}]});
 host.flush();
 const labels=container.walk().filter(n=>n.className==='fleet-scene-label');
 for(const site of SITES){const label=labels.find(n=>n.firstChild.textContent===site.label);assert.ok(label);if(site.id==='depot')assert.equal(label.lastChild.textContent,'1 / 2 bays occupied');else{assert.equal(label.lastChild.textContent,'');assert.equal(label.lastChild.hidden,true);}}
 const truck=labels.find(n=>n.firstChild.textContent==='TRK-104');assert.ok(truck);assert.equal(truck.lastChild.textContent,'workshop');
 assert.ok(container.walk().find(n=>n.className==='fleet-scene-credit').innerHTML.includes('OpenFreeMap'));
 assert.equal(container.walk().find(n=>n.className==='fleet-scene-status').hidden,false,'actionable fallback notice remains visible');
 scene.dispose();await host.settle();
});

test('floor text is limited to useful bay and process markers',async()=>{
 const text=[];
 for(const site of ['factory','workshop','depot']){const source=await readFile(new URL(`../../src/render/facilities/${site}/index.js`,import.meta.url),'utf8');text.push(...Array.from(source.matchAll(/b\.text\('([^']+)'/g),m=>m[1]));}
 assert.deepEqual(text,['INCOMING','ASSEMBLY','QA','DISPATCH','BAY 01','BAY 02']);
});
