import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {domain as d,demoRoot} from './load-domain.mjs';
import {acceptanceFixture} from './fixture.mjs';

const uiRoot=process.env.FLEET_UI_ROOT||demoRoot;
const facilityRoot=process.env.FLEET_FACILITIES_ROOT||demoRoot;
const uiPath=resolve(uiRoot,'src/ui/provenance/index.js');
const facilityPath=resolve(facilityRoot,'src/render/facilities/workshop/state.js');
const input=()=>{
  const state=acceptanceFixture(), evaluation=d.replayReadings(state);
  return {mode:'then',selectedVehicleId:'TRK-104',readings:state.readings,policies:state.policies,exclusions:state.exclusions,
    decisions:evaluation.decisions,serviceHistory:state.serviceFacts,configurationVersion:state.configVersion,asOf:state.asOf,
    canonical:evaluation.vehicles[0],authorityStatus:evaluation.vehicles[0].status,vehicles:state.vehicles,notifications:[],review:null};
};

test('UI presentation boundary (not browser/layout verification)',{skip:!existsSync(uiPath)},async t=>{
  const {renderProvenance}=await import(pathToFileURL(uiPath));
  const {reviewState}=await import(pathToFileURL(resolve(uiRoot,'src/ui/provenance/model.js')));
  await t.test('source values and distinct observation/import timestamps remain readable',()=>{
    const model=input(), before=JSON.stringify(model),html=renderProvenance(model);
    assert.match(html,/104-A-2/);assert.match(html,/120,000/);assert.match(html,/km/);
    assert.match(html,/2026-01-05 00:00:00 UTC/);assert.match(html,/2026-01-12 02:00:00 UTC/);
    assert.equal(JSON.stringify(model),before);
  });
  await t.test('raw strings are escaped rather than inserted as executable markup',()=>{
    const model=input();model.readings=[{...model.readings[0],id:'<script>alert(1)</script>',sourceId:'<img src=x onerror=alert(1)>'}];
    const html=renderProvenance(model);assert.doesNotMatch(html,/<script>|<img src=x/);assert.match(html,/&lt;script&gt;/);
  });
  await t.test('current recorded review is honestly labeled and advisory',()=>{
    const model=input();model.mode='today';model.review={mode:'recorded',configVersion:1,asOf:model.asOf,vehicleId:'TRK-104',findings:[{summary:'Unique current finding',evidenceReadingIds:['104-A-2']}]};
    model.notifications=[{text:'Unique in-app alert',recipient:'Responsible operator'}];
    const html=renderProvenance(model);assert.match(html,/Recorded review.*not a live model call/);assert.match(html,/Unique current finding/);assert.match(html,/Manager notification/);
    assert.match(html,/Recommendations never change mileage, source policy or service history/);
  });
  for(const mismatch of ['version','cutoff','vehicle','live-mode'])await t.test(`${mismatch} review findings and notifications are withheld`,()=>{
    const model=input();model.mode='today';model.review={mode:'recorded',configVersion:1,asOf:model.asOf,vehicleId:'TRK-104',findings:[{summary:'DO_NOT_RENDER_STALE_FINDING',evidenceReadingIds:['104-A-2']}]};
    model.notifications=[{text:'DO_NOT_RENDER_STALE_NOTIFICATION'}];
    if(mismatch==='version')model.review.configVersion=0;
    if(mismatch==='cutoff')model.review.asOf='2026-01-01T00:00:00Z';
    if(mismatch==='vehicle')model.review.vehicleId='TRK-208';
    if(mismatch==='live-mode')model.review.mode='live';
    assert.notEqual(reviewState(model).kind,'current');
    const html=renderProvenance(model);assert.doesNotMatch(html,/DO_NOT_RENDER_STALE/);assert.match(html,/withheld/);
  });
  await t.test('Then mode does not surface Today findings',()=>{
    const model=input();model.review={mode:'simulated',configVersion:1,asOf:model.asOf,findings:[{summary:'TODAY_ONLY'}]};
    const html=renderProvenance(model);assert.doesNotMatch(html,/TODAY_ONLY|data-review-state=/);assert.match(html,/Choose the source/);assert.match(html,/source/i);
  });
});

test('Facility presentation follows declared shop status, never inferred maintenance',{skip:!existsSync(facilityPath)},async t=>{
  const {workshopPresentation}=await import(pathToFileURL(facilityPath));
  await t.test('source conflict, odometer, and animation time cannot create a shop visit',()=>{
    const baseline=workshopPresentation({vehicles:[{id:'TRK-104',status:'moving'}],issueActive:true});
    const later=workshopPresentation({vehicles:[{id:'TRK-104',status:'moving',odometer:0}],issueActive:true,timeSeconds:999999});
    assert.equal(baseline.occupied,0);assert.deepEqual(later,baseline);
  });
  await t.test('explicit service status drives bounded, deduplicated illustrative occupancy',()=>{
    const result=workshopPresentation({vehicles:[{id:'TRK-208',status:'workshop'},{id:'TRK-104',status:'in-service'},{id:'TRK-104',status:'workshop'},{id:'EXTRA',status:'maintenance'}]});
    assert.equal(result.occupied,2);assert.equal(result.overflow,1);assert.equal(new Set(result.occupants).size,2);
    assert.match(result.label,/fictional.*reconstruction/i);assert.ok(Object.isFrozen(result.occupants));
  });
  await t.test('resolving authority does not erase a separately declared in-bay visit',()=>{
    const snapshot={vehicles:[{id:'TRK-104',status:'workshop'}],authorityResolved:false};
    assert.deepEqual(workshopPresentation({...snapshot,authorityResolved:true}).occupants,workshopPresentation(snapshot).occupants);
  });
});
