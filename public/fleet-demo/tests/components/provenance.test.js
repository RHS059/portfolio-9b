import test from 'node:test';
import assert from 'node:assert/strict';
import {createProvenancePanel,renderProvenance} from '../../src/ui/provenance/index.js';
import {normalizeModel,reviewState,selectedPolicy,matchingExclusions} from '../../src/ui/provenance/model.js';
import {renderSourceControls,sourceAlreadyExcluded} from '../../src/ui/source-controls/index.js';
import {createScenario,replayReadings,applyConfigurationCommand,reviewImports,createSimulatedReviewProvider} from '../../src/domain/readings/index.js';

function view(state=createScenario({authorityApplied:false}),vehicleId='TRK-104',extra={}) {
  const evaluation=replayReadings(state,{asOf:state.asOf});
  return {mode:'then',selectedVehicleId:vehicleId,readings:state.readings,policies:state.policies,exclusions:state.exclusions,decisions:evaluation.decisions,serviceHistory:state.serviceFacts,review:null,configurationVersion:state.configVersion,authorityStatus:evaluation.vehicles.find(v=>v.vehicleId===vehicleId)?.status,canonical:evaluation.vehicles.find(v=>v.vehicleId===vehicleId),vehicles:state.vehicles,asOf:state.asOf,notifications:[],...extra};
}
function command(state,patch) {return applyConfigurationCommand(state,{id:`test-${state.configVersion}`,expectedVersion:state.configVersion,effectiveFrom:state.asOf,reason:'Explicit component test',...patch});}
const settle=()=>new Promise(resolve=>setImmediate(resolve));

// Minimal lifecycle/event host. HTML/semantics are checked separately; this is not a browser emulator.
class Host {
  constructor(doc){this.ownerDocument=doc;this.children=[];this.listeners={};this.attributes={};this.scrollTop=0;this.innerHTML='';this.dataset={};}
  appendChild(el){el.parent=this;this.children.push(el);return el;}
  setAttribute(key,value){this.attributes[key]=value;}
  addEventListener(type,callback){this.listeners[type]=callback;}
  removeEventListener(type,callback){if(this.listeners[type]===callback)delete this.listeners[type];}
  querySelectorAll(){return [];}
  contains(el){return el===this || el?._root===this || this.children.includes(el);}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(el=>el!==this);}
}
function host(callback) {
  const doc={activeElement:null};doc.createElement=()=>new Host(doc);
  const container=new Host(doc);const sibling=new Host(doc);container.appendChild(sibling);
  const panel=createProvenancePanel({container,onAction:callback});const root=container.children[1];
  return {panel,root,container,sibling,click(dataset,disabled=false){const target={_root:root,dataset,disabled,closest:()=>target};root.listeners.click?.({target});},change(kind,value){const target={_root:root,value,matches:selector=>selector===`[data-${kind}]`};root.listeners.change?.({target});}};
}

test('Then panel distinguishes clocks, units, synthetic service facts and unresolved authority',()=>{
  const html=renderProvenance(view());
  assert.match(html,/Unresolved/);assert.match(html,/Observed/);assert.match(html,/Imported/);
  assert.match(html,/A · 120,000 km/);assert.match(html,/B · 80,300 mi/);assert.match(html,/v1-a-3/);
  assert.match(html,/2026-01-05 12:00:00 UTC/);assert.match(html,/2026-01-12 02:00:00 UTC/);
  assert.match(html,/synthetic examples/);assert.match(html,/does not erase visits or reverse work orders/);
  assert.doesNotMatch(html,/data-action="review-imports"/);assert.doesNotMatch(html,/Then · I added controls/);
});
test('vehicle isolation filters readings and service facts without touching the shared inputs',()=>{
  const m=view(),before=JSON.stringify(m);const other=renderProvenance({...m,selectedVehicleId:'TRK-208'});
  assert.match(other,/v2-a-3/);assert.doesNotMatch(other,/v1-b-3/);assert.doesNotMatch(other,/service-example-1/);
  assert.match(other,/0 service examples for TRK-208/);assert.equal(JSON.stringify(m),before);
});
test('rendering respects domain decisions rather than choosing the largest/latest source',()=>{
  const html=renderProvenance(view(createScenario()));
  assert.match(html,/Using B/);assert.match(html,/different provider is chosen/);assert.match(html,/non authoritative/);
  assert.match(html,/Derived normalization: 129,230.323 km/);assert.match(html,/Source chosen/);
});
test('raw values and every external string are escaped against markup injection',()=>{
  const m=view();m.readings=[{id:'"><img src=x onerror=alert(1)>',vehicleId:'TRK-104',sourceId:'<script>A</script>',field:'odometer',value:'<img>',unit:'"km',observedAt:'<svg>',importedAt:'2026-01-12T02:00:00Z'}];
  const html=renderProvenance(m);assert.doesNotMatch(html,/<img|<script>|<svg>/);assert.match(html,/&lt;img/);assert.match(html,/&lt;script&gt;/);
});
test('four exclusion controls include the exact reading and visible integration-wide consequences',()=>{
  const m=normalizeModel(view());const html=renderProvenance(m);
  for(const s of ['field','vehicle','integration'])assert.match(html,new RegExp(`option value="${s}"`));
  assert.match(html,/data-scope="reading"/);assert.match(html,/data-reading="v1-b-3"/);
  assert.match(renderSourceControls(m,{scope:'integration',idPrefix:'x'}),/affects every vehicle/);
});
test('individual authoritative exclusion remains visible and unresolved; no older row is revived',()=>{
  let state=createScenario();state=command(state,{type:'exclude-reading',readingId:'v1-b-3'});
  const m=view(state),html=renderProvenance(m);assert.equal(m.authorityStatus,'unresolved');
  assert.match(html,/newest reading from the chosen source is excluded/);assert.match(html,/Excluded · raw retained/);assert.match(html,/v1-b-3/);
  assert.equal(state.readings.length,9);assert.equal(state.serviceFacts.length,2);
});
test('existing field exclusion does not disable broader exclusions or the unmigrated vehicle',()=>{
  const state=command(createScenario(),{type:'exclude-source',vehicleId:'TRK-104',sourceId:'A',field:'odometer'});
  const m=normalizeModel(view(state));assert.equal(sourceAlreadyExcluded(m,'A','field'),true);assert.equal(sourceAlreadyExcluded(m,'A','vehicle'),false);assert.equal(sourceAlreadyExcluded(m,'A','integration'),false);
  assert.equal(sourceAlreadyExcluded(normalizeModel(view(state,'TRK-208')),'A','field'),false);
});
test('future and expired exclusion rules never masquerade as current',()=>{
  const m=normalizeModel(view());m.exclusions=[{id:'future',sourceId:'B',effectiveFrom:'2026-02-01T00:00:00Z'},{id:'expired',sourceId:'B',effectiveFrom:'2026-01-01T00:00:00Z',effectiveUntil:m.asOf}];
  assert.deepEqual(matchingExclusions(m,m.rows.find(r=>r.sourceId==='B')),[]);assert.equal(sourceAlreadyExcluded(m,'B','integration'),false);
});
test('authority selection honors effective date/version and does not show ambiguous policy as selected',()=>{
  const m=normalizeModel(view(createScenario()));assert.equal(selectedPolicy(m).sourceId,'B');
  m.policies=[...m.policies,{...selectedPolicy(m),id:'conflict',sourceId:'A'}];assert.equal(selectedPolicy(m),null);
});
test('equivalent timestamp spellings cannot conceal an authority conflict',()=>{
  const m=normalizeModel(view(createScenario())),policy=selectedPolicy(m);m.policies=[...m.policies,{...policy,id:'conflict',sourceId:'A',effectiveFrom:policy.effectiveFrom.replace('Z','.000Z')}];assert.equal(selectedPolicy(m),null);
});
test('Today simulated review is explicitly labeled and renders evidence/in-app notification only',async()=>{
  const state=createScenario({authorityApplied:false}),review=await reviewImports(state,createSimulatedReviewProvider());
  const m=view(state,'TRK-104',{mode:'today',review:{...review,vehicleId:'TRK-104'},notifications:[{text:'Check the source',recipient:'Fleet operator'}]});
  const html=renderProvenance(m);assert.match(html,/Simulated review · no live AI call/);assert.match(html,/Evidence:/);assert.match(html,/In-app notification · demo/);assert.match(html,/shown here only/);assert.match(html,/No external messages are sent/);
});
test('recorded review needs matching version, replay cutoff and selected vehicle',()=>{
  const m=view(),review={mode:'recorded',vehicleId:'TRK-104',configVersion:1,asOf:m.asOf,findings:[],summary:'RECORDED_FINDING'};
  assert.equal(reviewState({...m,review}).kind,'current');
  for(const r of [{...review,configVersion:2},{...review,asOf:'2026-01-11T03:00:00Z'},{...review,vehicleId:'TRK-208'},{...review,configVersion:undefined}]){
    const html=renderProvenance({...m,mode:'today',review:r,notifications:[{text:'STALE_NOTIFICATION'}]});
    assert.match(html,/data-review-state="stale"/);assert.doesNotMatch(html,/RECORDED_FINDING|STALE_NOTIFICATION/);
  }
  assert.match(renderProvenance({...m,mode:'today',review}),/Recorded review · not a live model call/);
});
test('unverified live or unknown provider modes cannot claim a live review',()=>{
  for(const mode of ['live','unknown']){
    const html=renderProvenance({...view(),mode:'today',review:{mode,summary:'UNVERIFIED_SUMMARY',label:'Live AI completed'}});
    assert.match(html,/Review mode not verified/);assert.doesNotMatch(html,/UNVERIFIED_SUMMARY|Live AI completed/);
  }
});
test('busy review disables its button and never emits a second request',()=>{
  const calls=[],h=host(a=>calls.push(a));h.panel.update(view(undefined,'TRK-104',{mode:'today',reviewing:true}));
  h.click({action:'review-imports'});assert.deepEqual(calls,[]);assert.match(h.root.innerHTML,/Reviewing imports…/);h.panel.dispose();
});
test('component emits exact authority command without mutating frozen input',async()=>{
  const calls=[],h=host(a=>calls.push(a)),m=view(),before=JSON.stringify(m);h.panel.update(m);
  h.click({action:'set-authority',source:'B'});h.click({action:'set-authority',source:'B'});
  assert.deepEqual(calls,[{type:'set-authority',vehicleId:'TRK-104',sourceId:'B'}]);assert.equal(JSON.stringify(m),before);await settle();h.panel.dispose();
});
test('component dispatches vehicle-scoped and exact-reading exclusions from authoritative UI fields',async()=>{
  const calls=[],h=host(a=>calls.push(a));h.panel.update(view());
  h.change('exclusion-scope','vehicle');h.click({action:'add-exclusion',scope:'choose',source:'A'});await settle();
  h.click({action:'add-exclusion',scope:'reading',source:'B',reading:'v1-b-3'});await settle();
  assert.deepEqual(calls,[{type:'add-exclusion',scope:'vehicle',sourceId:'A',vehicleId:'TRK-104',field:'odometer'},{type:'add-exclusion',scope:'reading',sourceId:'B',vehicleId:'TRK-104',field:'odometer',readingId:'v1-b-3'}]);h.panel.dispose();
});
test('invalid source, row, scope and unsupported action cannot generate commands',()=>{
  const calls=[],h=host(a=>calls.push(a));h.panel.update(view());
  h.click({action:'set-authority',source:'C'});h.click({action:'add-exclusion',scope:'reading',source:'A',reading:'v1-b-3'});h.click({action:'delete-record'});h.click({action:'review-imports'});h.change('vehicle-select','UNKNOWN');
  assert.deepEqual(calls,[]);h.panel.dispose();
});
test('vehicle selection resets broad exclusion scope to the narrow default',async()=>{
  const calls=[],h=host(a=>calls.push(a));h.panel.update(view());h.change('exclusion-scope','integration');
  h.change('vehicle-select','TRK-208');await settle();assert.deepEqual(calls,[{type:'select-vehicle',vehicleId:'TRK-208'}]);
  h.panel.update(view(undefined,'TRK-208'));assert.match(h.root.innerHTML,/option value="field" selected/);h.panel.dispose();
});
test('replay/review commands have no write payload and failed dispatch remains usable',async()=>{
  const calls=[],h=host(a=>{calls.push(a);if(calls.length===1)throw new Error('Version changed. Refresh.');});
  h.panel.update(view(undefined,'TRK-104',{mode:'today'}));h.click({action:'replay'});assert.match(h.root.innerHTML,/Version changed\. Refresh\./);
  h.click({action:'review-imports'});await settle();assert.deepEqual(calls,[{type:'replay'},{type:'review-imports'}]);h.panel.dispose();
});
test('asynchronous action failure is visible and does not trap controls',async()=>{
  const h=host(()=>Promise.reject(new Error('Not applied')));h.panel.update(view());h.click({action:'replay'});await settle();assert.match(h.root.innerHTML,/Not applied/);assert.equal(h.root.attributes['aria-busy'],'false');h.panel.dispose();
});
test('dispose removes only the component, detaches handlers and tolerates later completion/update',async()=>{
  let finish;const h=host(()=>new Promise(resolve=>{finish=resolve;}));h.panel.update(view());h.click({action:'replay'});h.panel.dispose();h.panel.dispose();finish();await settle();h.panel.update(view());
  assert.deepEqual(h.container.children,[h.sibling]);assert.deepEqual(h.root.listeners,{});
});
test('empty model renders safe empty states with associated labels and native buttons',()=>{
  const html=renderProvenance({});assert.match(html,/No raw readings/);assert.match(html,/for="fleet-provenance-vehicle"/);assert.match(html,/id="fleet-provenance-vehicle"/);assert.match(html,/aria-live="polite"/);assert.doesNotMatch(html,/undefined|NaN/);
});
test('integrated UI command and replay preserve raw/service facts and other vehicle policy',async()=>{
  let state=createScenario({authorityApplied:false});const raw=JSON.stringify(state.readings),service=JSON.stringify(state.serviceFacts);let h;
  h=host(action=>{if(action.type==='set-authority')state=command(state,{...action,field:'odometer'});h.panel.update(view(state));});h.panel.update(view(state));
  h.click({action:'set-authority',source:'B'});await settle();h.click({action:'replay'});await settle();
  assert.match(h.root.innerHTML,/Source chosen/);assert.match(h.root.innerHTML,/Using B/);assert.equal(replayReadings(state).vehicles.find(v=>v.vehicleId==='TRK-208').sourceId,'A');assert.equal(JSON.stringify(state.readings),raw);assert.equal(JSON.stringify(state.serviceFacts),service);h.panel.dispose();
});
test('App reimport command preserves its CI selector and carries no write payload',async()=>{
  const calls=[],h=host(a=>calls.push(a));h.panel.update(view());assert.match(h.root.innerHTML,/data-action="reimport"/);h.click({action:'reimport'});await settle();assert.deepEqual(calls,[{type:'reimport'}]);h.panel.dispose();
});

test('review detail stays expandable and the app can supply its own vehicle tabs',async()=>{
 const state=createScenario({authorityApplied:false}),review=await reviewImports(state,createSimulatedReviewProvider());
 const html=renderProvenance(view(state,'TRK-104',{mode:'today',review:{...review,vehicleId:'TRK-104'},showVehicleSelector:false}));
 assert.match(html,/<details data-details-key="review-details"><summary>Evidence and review details/);assert.doesNotMatch(html,/data-vehicle-select/);assert.doesNotMatch(html,/<details[^>]* open/);
});
