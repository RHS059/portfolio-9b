import test from 'node:test';
import assert from 'node:assert/strict';
import {createProvenancePanel,renderProvenance} from '../../src/ui/provenance/index.js';
import {normalizeModel} from '../../src/ui/provenance/model.js';
import {renderSourceControls} from '../../src/ui/source-controls/index.js';
import {createScenario,replayReadings,reviewImports,createSimulatedReviewProvider} from '../../src/domain/readings/index.js';

function model(extra={}) {
  const scenario=createScenario({authorityApplied:false}),evaluation=replayReadings(scenario,{asOf:scenario.asOf});
  return {compact:true,mode:'then',selectedVehicleId:'TRK-104',readings:scenario.readings,policies:scenario.policies,exclusions:scenario.exclusions,decisions:evaluation.decisions,serviceHistory:scenario.serviceFacts,configurationVersion:scenario.configVersion,authorityStatus:'unresolved',canonical:evaluation.vehicles.find(v=>v.vehicleId==='TRK-104'),vehicles:scenario.vehicles,asOf:scenario.asOf,...extra};
}
function enclosingDetails(html,needle) {
  const at=html.indexOf(needle);assert.ok(at>=0,`Expected ${needle}`);
  const stack=[];
  for(const match of html.slice(0,at).matchAll(/<details\b([^>]*)>|<\/details>/g)){
    if(match[0].startsWith('</'))stack.pop();
    else stack.push({key:match[1].match(/data-details-key="([^"]+)"/)?.[1],open:/\bopen\b/.test(match[1])});
  }
  return stack;
}

test('compact story presentation exposes a single source choice without a duplicate status/header stack',()=>{
  const html=renderProvenance(model());
  assert.equal((html.match(/data-action="set-authority"/g)||[]).length,2);
  assert.deepEqual(enclosingDetails(html,'data-action="set-authority"'),[]);
  assert.doesNotMatch(html,/<div class="fp-state"|<h3>Choose the source|01 \/ TRK-104/);
  assert.match(html,/<div class="fp-visually-hidden" role="status" aria-live="polite"/);
  assert.match(html,/data-ui-key="reading-status"/);
  assert.doesNotMatch(html,/<details[^>]*\bopen\b/);
});

test('broader settings, replay and reimport begin inside closed More source controls',()=>{
  const html=renderProvenance(model());
  for(const needle of ['data-exclusion-scope','data-action="add-exclusion"','data-action="replay"','data-action="reimport"']) {
    const ancestors=enclosingDetails(html,needle);
    assert.ok(ancestors.some(d=>d.key==='more-source-controls'&&!d.open),needle);
  }
  const broad=renderSourceControls(normalizeModel(model()),{idPrefix:'compact',scope:'integration',compact:true});
  assert.match(broad,/affects every vehicle/);
  assert.match(broad,/<summary>More source controls<\/summary>/);
});

test('original values, service facts and vehicle selection remain available behind closed disclosures',()=>{
  const input=model(),before=JSON.stringify(input),html=renderProvenance(input);
  for(const needle of ['data-reading-id="v1-b-3"','aria-label="Preserved service history"'])assert.ok(enclosingDetails(html,needle).some(d=>d.key==='original-records'&&!d.open));
  assert.ok(enclosingDetails(html,'data-vehicle-select').some(d=>d.key==='other-vehicle'&&!d.open));
  assert.match(html,/80,300 mi/);assert.match(html,/120,000 km/);assert.match(html,/service-example-1/);
  assert.match(html,/<summary>Check another truck<\/summary>/);
  assert.equal(JSON.stringify(input),before);
  assert.doesNotMatch(renderProvenance({...input,showVehicleSelector:false}),/data-vehicle-select|Check another truck/);
});

test('compact Today keeps its honest advisory result and notification while detailed evidence stays closed',async()=>{
  const scenario=createScenario({authorityApplied:false});
  const review=await reviewImports(scenario,createSimulatedReviewProvider());
  const input=model({mode:'today',review:{...review,vehicleId:'TRK-104'},notifications:[{text:'Check this truck before changing its source',recipient:'Fleet manager'}]});
  const before=JSON.stringify(input),html=renderProvenance(input);
  assert.match(html,/<section class="fp-review"/);assert.match(html,/Simulated review · no live AI call/);
  assert.deepEqual(enclosingDetails(html,'data-action="review-imports"'),[]);
  assert.deepEqual(enclosingDetails(html,'Manager notification'),[]);
  assert.ok(enclosingDetails(html,'Evidence:').some(d=>d.key==='review-details'&&!d.open));
  assert.match(html,/No external messages are sent/);assert.match(html,/Recommendations never change mileage/);
  assert.doesNotMatch(html,/<p class="fp-kicker">TODAY \/ REVIEW/);
  assert.equal(JSON.stringify(input),before);
});

test('compact mode does not relax stale-review or external-string safeguards',()=>{
  const input=model({mode:'today',review:{mode:'simulated',vehicleId:'TRK-208',configVersion:1,summary:'STALE_FINDING'},notifications:[{text:'STALE_NOTIFICATION'}]});
  let html=renderProvenance(input);assert.match(html,/data-review-state="stale"/);assert.doesNotMatch(html,/STALE_FINDING|STALE_NOTIFICATION/);
  input.readings=[{id:'<img src=x>',vehicleId:'TRK-104',sourceId:'<script>A</script>',value:'<svg>',unit:'km'}];
  html=renderProvenance(input);assert.doesNotMatch(html,/<img|<script>|<svg>/);assert.match(html,/&lt;script&gt;/);
});

test('compact updates retain presentation mode and the existing validated action contract',async()=>{
  const calls=[],doc={activeElement:null};
  class Host {
    constructor(){this.ownerDocument=doc;this.children=[];this.listeners={};this.attributes={};this.scrollTop=0;}
    appendChild(node){this.children.push(node);return node;}
    setAttribute(k,v){this.attributes[k]=v;}
    addEventListener(k,v){this.listeners[k]=v;}
    removeEventListener(k){delete this.listeners[k];}
    querySelectorAll(){return [];}
    contains(node){return node?._root===this;}
    remove(){}
  }
  doc.createElement=()=>new Host();
  const container=new Host(),panel=createProvenancePanel({container,onAction:a=>calls.push(a)}),root=container.children[0];
  const click=dataset=>{const target={_root:root,dataset,disabled:false};target.closest=()=>target;root.listeners.click({target});};
  panel.update(model());assert.equal(root.attributes['data-presentation'],'compact');
  click({action:'set-authority',source:'INVALID'});assert.deepEqual(calls,[]);
  click({action:'set-authority',source:'B'});await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(calls,[{type:'set-authority',vehicleId:'TRK-104',sourceId:'B'}]);
  assert.equal(root.attributes['data-presentation'],'compact');assert.match(root.innerHTML,/More source controls/);
  panel.update({...model(),compact:false});assert.equal(root.attributes['data-presentation'],'full');assert.match(root.innerHTML,/<div class="fp-state"/);
  panel.dispose();
});
