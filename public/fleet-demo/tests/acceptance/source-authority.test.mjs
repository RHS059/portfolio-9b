import test from 'node:test';
import assert from 'node:assert/strict';
import { domain as d, reviewAdapter } from './load-domain.mjs';
import { acceptanceFixture, AS_OF, command, vehicle, decision } from './fixture.mjs';

test('frozen scenario contract identifies migrated TRK-104/B and independent TRK-208/A', () => {
  const state = d.createScenario();
  const projection = d.replayReadings(state);
  assert.equal(vehicle(projection).sourceId,'B');
  assert.equal(vehicle(projection,'TRK-208').sourceId,'A');
  assert.equal(vehicle(projection).status,'resolved');
  assert.equal(vehicle(projection,'TRK-208').status,'resolved');
  assert.equal(state.fixture.synthetic,true);
  assert.match(projection.provenance,/derived replay.*not historical/i);
});

test('explicit B authority beats the later imported frozen A reading', () => {
  const state=acceptanceFixture(), result=d.replayReadings(state);
  assert.equal(vehicle(result).readingId,'104-B-2');
  assert.equal(vehicle(result).valueKm,130200);
  assert.equal(vehicle(result,'TRK-208').valueKm,210200);
  assert.equal(decision(result,'104-A-2').status,'non-authoritative');
  assert.equal(decision(result,'104-A-2').observedAt,'2026-01-05T00:00:00Z');
  assert.equal(decision(result,'104-A-2').importedAt,'2026-01-12T02:00:00Z');
});

test('raw records, units, timestamps and service facts survive replay/configuration unchanged', () => {
  const state=acceptanceFixture(), before=JSON.stringify(state);
  const changed=d.applyConfigurationCommand(state,command());
  const projection=d.replayReadings(changed);
  assert.deepEqual(changed.readings,state.readings);
  assert.deepEqual(changed.serviceFacts,state.serviceFacts);
  assert.deepEqual(projection.serviceFacts,state.serviceFacts);
  assert.deepEqual(projection.consequenceEvents,state.consequenceEvents);
  assert.equal(JSON.stringify(state),before);
  assert.ok(Object.isFrozen(changed.readings[0]));
  assert.throws(()=>{changed.readings[0].value=0;},TypeError);
});

test('vehicle+field exclusion on A leaves TRK-208/A and other fields independent', () => {
  const state=acceptanceFixture(), next=d.applyConfigurationCommand(state,command());
  const result=d.replayReadings(next);
  assert.equal(decision(result,'104-A-2').status,'excluded');
  assert.deepEqual(decision(result,'104-A-2').exclusionIds,['acceptance-command']);
  assert.deepEqual(vehicle(result,'TRK-208'),vehicle(d.replayReadings(state),'TRK-208'));
  assert.equal(d.activeExclusions(next.exclusions,state.readings.find(r=>r.id==='104-A-hours'),AS_OF).length,0);
});

test('vehicle-only exclusion covers its fields but not another vehicle', () => {
  const state=acceptanceFixture(); const c=command(); delete c.field;
  const next=d.applyConfigurationCommand(state,c);
  assert.equal(d.activeExclusions(next.exclusions,state.readings.find(r=>r.id==='104-A-hours'),AS_OF).length,1);
  assert.equal(d.activeExclusions(next.exclusions,state.readings.find(r=>r.id==='208-A-2'),AS_OF).length,0);
});

test('explicit integration-wide exclusion has a visibly broader result', () => {
  const c=command(); delete c.vehicleId; delete c.field;
  const result=d.replayReadings(d.applyConfigurationCommand(acceptanceFixture(),c));
  assert.equal(vehicle(result).status,'resolved');
  assert.equal(vehicle(result,'TRK-208').reason,'authoritative-reading-excluded');
});

test('individual-reading exclusion is pinned to raw identity and cannot silently resurrect an older row', () => {
  const state=acceptanceFixture();
  const next=d.applyConfigurationCommand(state,command({type:'exclude-reading',readingId:'104-B-2',sourceId:'B',vehicleId:'TRK-104'}));
  assert.deepEqual(Object.fromEntries(['readingId','sourceId','vehicleId','field'].map(k=>[k,next.exclusions[0][k]])),{readingId:'104-B-2',sourceId:'B',vehicleId:'TRK-104',field:'odometer'});
  const result=d.replayReadings(next);
  assert.equal(vehicle(result).reason,'authoritative-reading-excluded');
  assert.equal(vehicle(result).valueKm,null);
  assert.equal(vehicle(result,'TRK-208').status,'resolved');
  assert.equal(decision(result,'104-B-1').exclusionIds.length,0);
});

test('conflicting row-exclusion scope is rejected rather than silently normalized',()=>{
  const state=acceptanceFixture(),before=JSON.stringify(state);
  assert.throws(()=>d.applyConfigurationCommand(state,command({type:'exclude-reading',readingId:'104-B-2',sourceId:'A',vehicleId:'TRK-208'})),{code:'EXCLUSION_SCOPE_MISMATCH'});
  assert.equal(JSON.stringify(state),before);
});

test('stale selected A source remains unresolved despite fresh B input', () => {
  const state=d.applyConfigurationCommand(acceptanceFixture(),command({type:'set-authority',sourceId:'A',maxAgeHours:48}));
  const result=vehicle(d.replayReadings(state));
  assert.equal(result.sourceId,'A'); assert.equal(result.reason,'stale-authoritative-reading');
  assert.equal(result.valueKm,null); assert.equal(result.readingId,null);
});

test('missing selected source remains unresolved with no latest/max fallback', () => {
  const state=acceptanceFixture();
  const result=d.replayReadings({...state,readings:state.readings.filter(r=>r.sourceId!=='B')});
  assert.equal(vehicle(result).reason,'missing-authoritative-reading');
  assert.equal(vehicle(result).sourceId,'B'); assert.equal(vehicle(result).valueKm,null);
  assert.equal(vehicle(result,'TRK-208').status,'resolved');
});

test('missing vehicle authority is distinct from missing readings', () => {
  const state=acceptanceFixture();
  const result=d.replayReadings({...state,policies:state.policies.filter(p=>p.vehicleId!=='TRK-104')});
  assert.equal(vehicle(result).reason,'missing-authority'); assert.equal(vehicle(result).sourceId,null);
});

test('configuration commands version-check, append once, and reject changed duplicate commands', () => {
  const state=acceptanceFixture(), c=command(), next=d.applyConfigurationCommand(state,c);
  assert.equal(next.configVersion,2); assert.equal(state.configVersion,1);
  assert.equal(d.applyConfigurationCommand(next,c),next);
  assert.throws(()=>d.applyConfigurationCommand(next,{...c,id:'second-command'}),{code:'STALE_CONFIG_VERSION'});
  assert.throws(()=>d.applyConfigurationCommand(next,{...c,reason:'changed'}),{code:'COMMAND_ID_CONFLICT'});
  assert.equal(next.exclusions.length,1);
});

test('configuration effective date and exclusive end boundary are honored by replay', () => {
  const state=d.applyConfigurationCommand(acceptanceFixture(),command({effectiveUntil:'2026-01-12T04:00:00Z'}));
  assert.equal(decision(d.replayReadings(state,{asOf:'2026-01-12T02:59:59Z'}),'104-A-2').status,'non-authoritative');
  assert.equal(decision(d.replayReadings(state),'104-A-2').status,'excluded');
  assert.equal(decision(d.replayReadings(state,{asOf:'2026-01-12T04:00:00Z'}),'104-A-2').status,'non-authoritative');
});

test('duplicate imports retain original receipt and do not duplicate service history', () => {
  const state=acceptanceFixture();
  const outcome=d.importReadings(state,state.readings.map(r=>({...r,importedAt:'2026-01-13T00:00:00Z'})));
  assert.equal(outcome.importedCount,0); assert.equal(outcome.duplicateCount,state.readings.length);
  assert.equal(outcome.state,state); assert.deepEqual(outcome.state.serviceFacts,state.serviceFacts);
});

test('conflicting duplicate import fails atomically without overwriting raw evidence', () => {
  const state=acceptanceFixture(), before=JSON.stringify(state);
  assert.throws(()=>d.importReadings(state,[{...state.readings[0],id:'new-reading'},{...state.readings[0],value:9}]),{code:'READING_ID_CONFLICT'});
  assert.equal(JSON.stringify(state),before);
});

test('replay is deterministic across input order and repeated runs', () => {
  const state=acceptanceFixture(), expected=d.replayReadings(state);
  assert.deepEqual(d.replayReadings({...state,readings:[...state.readings].reverse()}),expected);
  assert.deepEqual(d.replayReadings(state),expected);
  assert.equal(expected.rawReadingCount,state.readings.length);
});

test('replay respects import cutoff while preserving not-yet-imported evidence', () => {
  const result=d.replayReadings(acceptanceFixture(),{asOf:'2026-01-12T00:30:00Z'});
  assert.equal(vehicle(result).readingId,'104-B-1');
  assert.equal(decision(result,'104-B-2').reason,'outside-replay-cutoff');
});

test('equal-time conflicting selected-source rows remain unresolved', () => {
  const state=acceptanceFixture(), row=state.readings.find(r=>r.id==='104-B-2');
  const result=d.replayReadings({...state,readings:[...state.readings,{...row,id:'104-B-conflict',value:130201}]});
  assert.equal(vehicle(result).reason,'ambiguous-authoritative-reading'); assert.equal(vehicle(result).valueKm,null);
});

test('invalid selected-source raw input remains evidence and does not fall back', () => {
  const state=acceptanceFixture();
  const result=d.replayReadings({...state,readings:state.readings.map(r=>r.id==='104-B-2'?{...r,unit:'bananas'}:r)});
  assert.equal(vehicle(result).reason,'invalid-authoritative-reading'); assert.equal(vehicle(result).valueKm,null);
  assert.equal(decision(result,'104-B-2').status,'invalid');
});

test('default Today review is labeled simulated/no model call and cannot mutate policy/history', async () => {
  const state=acceptanceFixture(), before=JSON.stringify(state), result=await d.reviewImports(state);
  assert.equal(result.mode,'simulated'); assert.match(result.label,/no model call/i);
  assert.equal(result.advisoryOnly,true); assert.equal(result.requiresHumanDecision,true);
  assert.equal(result.notificationChannel,'in-app'); assert.equal(JSON.stringify(state),before);
  assert.equal(result.configVersion,state.configVersion); assert.equal(result.provenance.inputHash.length,64);
});

test('recorded review is bound to exact original input and honestly distinct from live review', async () => {
  const state=acceptanceFixture(), input=d.buildReviewInput(state);
  const provider=d.createRecordedReviewProvider({input,review:{findings:[{summary:'Synthetic test recording',evidenceReadingIds:['104-A-2'],confidence:'low'}]}});
  const result=await d.reviewImports(state,provider);
  assert.equal(result.mode,'recorded'); assert.match(result.label,/not a live model call/);
  assert.equal(result.provenance.configVersion,1); assert.equal(result.asOf,AS_OF);
  assert.deepEqual(result.findings[0].evidenceReadingIds,['104-A-2']);
});

for (const change of ['configuration','raw input','replay cutoff']) {
  test(`recorded review rejects changed ${change} rather than restamping old findings`, async () => {
    const state=acceptanceFixture();
    const provider=d.createRecordedReviewProvider({input:d.buildReviewInput(state),review:{findings:[]}});
    let next=state, options={};
    if(change==='configuration')next=d.applyConfigurationCommand(state,command());
    if(change==='raw input')next=d.importReadings(state,[{...state.readings[0],id:'additional-raw-event'}]).state;
    if(change==='replay cutoff')options={asOf:'2026-01-12T04:00:00Z'};
    await assert.rejects(()=>d.reviewImports(next,provider,options),error=>error.code==='RECORDED_REVIEW_INPUT_MISMATCH'&&error.recordedProvenance.inputHash!==error.requestedProvenance.inputHash);
  });
}

test('review response cannot smuggle executable commands or unknown evidence', async () => {
  const state=acceptanceFixture();
  const provider={mode:'simulated',label:'Synthetic adversarial test',async review(){return {commands:[command()],findings:[{summary:'Check evidence',evidenceReadingIds:['104-A-2'],execute:command()}]};}};
  const result=await d.reviewImports(state,provider);
  assert.equal(result.commands,undefined); assert.equal(result.findings[0].execute,undefined);
  await assert.rejects(()=>d.reviewImports(state,{...provider,async review(){return{findings:[{summary:'Unknown evidence',evidenceReadingIds:['not-a-record']}]};}}),{code:'INVALID_REVIEW_OUTPUT'});
});

test('application review adapter emits only an in-app advisory for the selected vehicle', async () => {
  const state=acceptanceFixture(), result=await reviewAdapter.reviewFixture({domain:d,scenario:state,vehicleId:'TRK-104'});
  assert.equal(result.live,false); assert.equal(result.notification.channel,'in-app only');
  assert.equal(result.notification.recipient,'Fleet manager');
  const ids=new Set(state.readings.filter(r=>r.vehicleId==='TRK-104').map(r=>r.id));
  assert.ok(result.findings.every(f=>f.evidenceReadingIds.some(id=>ids.has(id))));
  assert.match(result.caveat,/cannot alter raw readings, service history or source policies/i);
});
