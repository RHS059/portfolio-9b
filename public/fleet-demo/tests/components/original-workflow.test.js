import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createWorkflowState,reduceWorkflow,sampleWorkflow,SAMPLE_RECORDS,SAMPLE_ASSETS,WORKFLOW_DURATION} from '../../src/ui/original-workflow/model.js';
import {renderWorkflowScreen} from '../../src/ui/original-workflow/view.js';
import {originalWorkflowStyles} from '../../src/ui/original-workflow/styles.js';
test('observed screens proceed from unmatched row through picker and saved link, then loop',()=>{
  for(const[t,view,phase,linked]of [[0,'records','unmatched',false],[4.6,'asset','asset-dialog',false],[6,'picker','asset-picker',false],[11.7,'asset','asset-chosen',false],[14.7,'records','linked',true],[20.9,'records','linked',true],[21,'records','unmatched',false]]){
    const s=sampleWorkflow(t);assert.equal(s.view,view,t);assert.equal(s.phase,phase,t);assert.equal(!!s.links['DEMO-002'],linked,t);
  }
  assert.equal(WORKFLOW_DURATION,21);assert.deepEqual(sampleWorkflow(NaN),createWorkflowState());
});
test('manual repair requires choosing an existing asset and explicitly setting it',()=>{
  let s=createWorkflowState();const original=JSON.stringify(SAMPLE_RECORDS);assert.strictEqual(reduceWorkflow(s,{type:'set-asset'}),s);
  s=reduceWorkflow(s,{type:'open-asset'});assert.equal(s.view,'asset');assert.strictEqual(reduceWorkflow(s,{type:'set-asset'}),s);
  s=reduceWorkflow(s,{type:'open-picker'});assert.equal(s.view,'picker');assert.strictEqual(reduceWorkflow(s,{type:'choose-asset',id:'unknown'}),s);
  s=reduceWorkflow(s,{type:'choose-asset',id:'TRK-104'});assert.equal(s.view,'asset');assert.equal(s.links['DEMO-002'],undefined);
  s=reduceWorkflow(s,{type:'set-asset'});assert.equal(s.links['DEMO-002'],'TRK-104');assert.equal(s.savedMappings['CARD-307'],'TRK-104');assert.equal(s.notice,'All changes have been saved.');
  assert.equal(s.links['DEMO-003'],undefined);assert.equal(JSON.stringify(SAMPLE_RECORDS),original);assert.ok(Object.isFrozen(SAMPLE_RECORDS[1]));assert.equal(SAMPLE_RECORDS[1].importedAsset,'CARD-307');
});
test('cancel discards an uncommitted choice and reset restores the original sample',()=>{
  const cancelled=reduceWorkflow(sampleWorkflow(13),{type:'cancel'});assert.equal(cancelled.view,'records');assert.equal(cancelled.chosenAssetId,'');assert.equal(cancelled.links['DEMO-002'],undefined);
  assert.equal(reduceWorkflow(sampleWorkflow(8),{type:'cancel'}).view,'asset');assert.deepEqual(reduceWorkflow(sampleWorkflow(16),{type:'reset'}),createWorkflowState());
});
test('selection and refresh preserve other links and imported records',()=>{
  let s=reduceWorkflow(sampleWorkflow(16),{type:'select-record',id:'DEMO-003'});assert.equal(s.links['DEMO-002'],'TRK-104');assert.equal(s.selectedRecordId,'DEMO-003');const links=s.links;s=reduceWorkflow(s,{type:'refresh'});assert.strictEqual(s.links,links);assert.strictEqual(reduceWorkflow(s,{type:'select-record',id:'outside'}),s);
});
test('full screenshot chrome is reconstructed with synthetic records, without annotation panels',()=>{
  const html=renderWorkflowScreen(createWorkflowState());
  for(const label of ['Home','Dashboard','Maintenance Request','Quick Meter Update','WEX','Filter:','Standard','Main','Details','Set the Asset','Refresh','Trans. Number','Trans. Date','Created Date','Created Time','Reset Changes'])assert.ok(html.includes(label),label);
  assert.equal((html.match(/data-linked=/g)||[]).length,21);for(const r of SAMPLE_RECORDS)assert.ok(r.id.startsWith('DEMO-'));
  assert.doesNotMatch(html,/18253686860|18254272460|Asset Linking|Auto Update|Missing Asset<|<iframe|<video|<form|https?:\/\//);
});
test('linked result and asset picker preserve observed labels and actual controls',()=>{
  const linked=renderWorkflowScreen(sampleWorkflow(16));assert.match(linked,/Go To Fuel Log/);assert.match(linked,/All changes have been saved/);assert.doesNotMatch(linked,/supplied recording|title="/);
  const picker=renderWorkflowScreen(sampleWorkflow(8),{idPrefix:'unique'});
  for(const label of ['Select an Asset','Please select an Asset to link to the record','Select an Item','Asset Category','Asset No.','License Plate No.','VIN','Asset Status','Applied Query: Active Asset'])assert.ok(picker.includes(label),label);
  for(const a of SAMPLE_ASSETS)assert.ok(picker.includes(`data-asset="${a.id}"`));assert.match(picker,/id="unique-link-title"/);assert.match(picker,/inert/);assert.match(picker,/data-action="cancel"/);assert.match(renderWorkflowScreen(sampleWorkflow(5)),/data-action="set-asset"[^>]*disabled/);
});
test('preview scales the complete original composition; dense modal tables remain scrollable',()=>{
  assert.match(renderWorkflowScreen(createWorkflowState(),{preview:true}),/inert aria-hidden="true"/);assert.match(originalWorkflowStyles,/\.ow-preview \.ow-scaled-screen\{width:1128px;transform-origin:top left/);assert.doesNotMatch(originalWorkflowStyles,/\.ow-preview \.ow-table \[data-secondary\]\{display:none/);assert.match(originalWorkflowStyles,/\.ow-table-scroll\{overflow:auto/);assert.match(originalWorkflowStyles,/@media\(prefers-reduced-motion:reduce\)/);
});
test('local-only module retains the integrator cleanups and creates no preview clock',async()=>{
  const code=await readFile(new URL('../../src/ui/original-workflow/index.js',import.meta.url),'utf8');assert.doesNotMatch(code,/\bfetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|domain\/|reviewImports|createSimulatedReviewProvider|Sample records · changes stay in this demo/);
  assert.match(code,/status\.className='ow-sr'/);const preview=code.slice(code.indexOf('export function createOriginalWorkflowPreview'),code.indexOf('export function createOriginalWorkflow('));assert.doesNotMatch(preview,/requestAnimationFrame|setTimeout|setInterval|createWorkflowPlayback/);assert.match(code,/doc\.removeEventListener\('visibilitychange',visibility\)/);assert.match(code,/preference\?\.removeEventListener/);
});


test('SVG cursor uses a real visibility attribute for reduced motion and manual playback',async t=>{
 const {installDomHost}=await import('../render/dom-host.js');
 const {createOriginalWorkflowPreview}=await import('../../src/ui/original-workflow/index.js');
 const {document}=installDomHost(t),create=document.createElement;
 document.createElement=tag=>{const node=create(tag);node.ownerDocument=document;node.appendChild=child=>{node.append(child);return child;};return node;};
 document.createElementNS=(_,tag)=>document.createElement(tag);
 const container=document.createElement('div'),preview=createOriginalWorkflowPreview({container});
 const cursor=container.querySelector('svg');assert.equal(cursor.getAttribute('visibility'),'hidden');
 preview.render(7,{paused:false,reducedMotion:false});assert.equal(cursor.getAttribute('visibility'),'visible');
 preview.render(7,{paused:true,reducedMotion:true});assert.equal(cursor.getAttribute('visibility'),'hidden');
 preview.dispose();
});
