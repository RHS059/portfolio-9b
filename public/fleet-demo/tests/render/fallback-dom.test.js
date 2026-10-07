import test from 'node:test';
import assert from 'node:assert/strict';
import {createFallback} from '../../src/render/core/fallback.js';
import {createFleetScene} from '../../src/render/core/index.js';
import {installDomHost,Element} from './dom-host.js';
test('actual SVG fallback constructs, resizes and focuses the mapped port without a scope error',async t=>{
 const host=installDomHost(t),container=new Element('div'),selected=[];
 const fallback=createFallback({container,onSelect:id=>selected.push(id)});
 for(const size of [[1200,800],[390,440]]){fallback.resize(...size);for(const id of ['oict','centerpoint','depot',null])fallback.setFocus(id,true);}
 const port=container.walk().find(n=>n.getAttribute('data-id')==='oict');assert.ok(port);assert.equal(port.children.filter(n=>n.tagName==='polygon').length,1);assert.equal(port.children.filter(n=>n.tagName==='rect').length,0);
 for(const id of ['centerpoint','depot']){const site=container.walk().find(n=>n.getAttribute('data-id')===id);assert.equal(site.children.filter(n=>n.tagName==='rect').length,5);}
 fallback.update([{id:'TRK-104',x:0,y:0,heading:0,status:'workshop',inspectable:true},{id:'TRAFFIC-001',x:20,y:20,heading:0,status:'moving',inspectable:false}]);
 container.walk().find(n=>n.getAttribute('data-entity-id')==='TRK-104').dispatchEvent(new Event('click'));assert.deepEqual(selected,['TRK-104']);
 assert.equal(container.walk().find(n=>n.getAttribute('data-entity-id')==='TRAFFIC-001').getAttribute('role'),'img');
 await host.settle();assert.equal(fallback.getMetrics().ready,true);fallback.dispose();assert.equal(container.children.length,0);
});
test('actual scene runs no-WebGL startup, snapshot update, port focus, resize and idempotent cleanup',async t=>{
 const host=installDomHost(t),container=new Element('div'),statuses=[];
 const scene=createFleetScene({container,onStatus:s=>statuses.push(s)});
 assert.equal(scene.getMetrics().initializing,false);assert.match(statuses.at(-1).message,/WebGL libraries unavailable/);
 const raw=Object.freeze({timeSeconds:1,paused:false,selectedId:'TRK-104',vehicles:Object.freeze([Object.freeze({id:'TRK-104',progress:.2,routeId:'delivery',status:'moving'})])});scene.update(raw);host.flush();scene.setFocus('oict');scene.setView('2d');container.width=390;container.height=440;scene.resize();await host.settle();host.flush();
 assert.equal(scene.getMetrics().ready,true);assert.equal(scene.getMetrics().width,390);assert.equal(scene.getMetrics().camera.focus,'oict');assert.equal(raw.vehicles[0].progress,.2);
 scene.dispose();scene.dispose();assert.equal(host.frames.size,0);assert.equal(container.children.length,0);assert.equal(scene.getMetrics().disposed,true);
});
