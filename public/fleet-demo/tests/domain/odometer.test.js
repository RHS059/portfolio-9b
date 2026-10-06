import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createScenario, evaluateReadings, replayReadings, normalizeOdometer,
  importReadings, applyConfigurationCommand, buildReviewInput,
  createSimulatedReviewProvider, createRecordedReviewProvider, reviewImports,
} from '../../src/domain/readings/index.js';

const copy = value => structuredClone(value);
const vehicle = (result, id = 'TRK-104') => result.vehicles.find(v => v.vehicleId === id);
const evaluate = state => evaluateReadings(state);
const command = (state, patch = {}) => applyConfigurationCommand(state, {
  id: 'test-command', type: 'set-authority', expectedVersion: state.configVersion,
  effectiveFrom: '2026-01-12T02:30:00Z', vehicleId: 'TRK-104', sourceId: 'B', ...patch,
});

test('partial migration chooses B for migrated truck and retains A for unmigrated truck', () => {
  const result = evaluate(createScenario());
  assert.equal(vehicle(result).sourceId, 'B');
  assert.equal(vehicle(result).readingId, 'v1-b-3');
  assert.equal(vehicle(result).valueKm, 129230.3232);
  assert.equal(vehicle(result, 'TRK-208').sourceId, 'A');
  assert.equal(vehicle(result, 'TRK-208').valueKm, 210400);
});

test('reversing import array order cannot change canonical decisions or review facts', () => {
  const original = createScenario();
  assert.deepEqual(evaluate({ ...original, readings: [...original.readings].reverse() }), evaluate(original));
});

test('later imported frozen A cannot overrule B and raw observed/imported times remain distinct', () => {
  const state = createScenario(), result = evaluate(state);
  const a = state.readings.find(r => r.id === 'v1-a-3');
  const b = state.readings.find(r => r.id === 'v1-b-3');
  assert.ok(a.importedAt > b.importedAt);
  assert.ok(a.observedAt < b.observedAt);
  assert.equal(vehicle(result).readingId, b.id);
  assert.equal(result.decisions.find(d => d.readingId === a.id).status, 'non-authoritative');
});

test('changing migrated truck authority leaves other truck configuration and decisions intact', () => {
  const original = createScenario();
  const changed = command(original, { sourceId: 'A' });
  assert.deepEqual(vehicle(evaluate(changed), 'TRK-208'), vehicle(evaluate(original), 'TRK-208'));
  assert.equal(vehicle(evaluate(changed)).sourceId, 'A');
  assert.equal(vehicle(evaluate(changed)).reason, 'stale-authoritative-reading');
  assert.deepEqual(changed.policies[1], original.policies[1]);
  assert.equal(original.configVersion, 1);
  assert.equal(changed.configVersion, 2);
});

test('missing authority is unresolved with no latest or largest fallback', () => {
  const state = createScenario();
  const result = vehicle(evaluate({ ...state, policies: state.policies.filter(p => p.vehicleId !== 'TRK-104') }));
  assert.equal(result.reason, 'missing-authority'); assert.equal(result.valueKm, null); assert.equal(result.readingId, null);
});

test('missing authoritative source data stays unresolved despite another source', () => {
  const state = command(createScenario(), { sourceId: 'C' });
  assert.equal(vehicle(evaluate(state)).reason, 'missing-authoritative-reading');
});

test('stale authoritative data is checked by observation age, never fresh import age', () => {
  const state = command(createScenario(), { sourceId: 'A' });
  const result = vehicle(evaluate(state));
  assert.equal(result.reason, 'stale-authoritative-reading'); assert.equal(result.valueKm, null);
});

test('freshness boundary is inclusive and one millisecond over is unresolved', () => {
  const state = createScenario();
  assert.equal(vehicle(evaluate({ ...state, asOf: '2026-01-14T00:30:00Z' })).status, 'resolved');
  assert.equal(vehicle(evaluate({ ...state, asOf: '2026-01-14T00:30:00.001Z' })).reason, 'stale-authoritative-reading');
});

test('individual newest-row exclusion preserves raw evidence and never resurrects an older row', () => {
  const state = createScenario();
  const changed = command(state, { type: 'exclude-reading', readingId: 'v1-b-3', reason: 'Operator rejected this one record' });
  assert.equal(vehicle(evaluate(changed)).reason, 'authoritative-reading-excluded');
  assert.equal(vehicle(evaluate(changed)).valueKm, null);
  assert.deepEqual(changed.readings, state.readings);
  assert.deepEqual(vehicle(evaluate(changed), 'TRK-208'), vehicle(evaluate(state), 'TRK-208'));
  assert.equal(changed.exclusions[0].readingId, 'v1-b-3');
});

test('excluding one older row does not exclude the whole source', () => {
  const state = command(createScenario(), { type: 'exclude-reading', readingId: 'v1-b-1', reason: 'One bad source row' });
  assert.equal(vehicle(evaluate(state)).readingId, 'v1-b-3');
});

test('per-vehicle source exclusion keeps integration A usable for unmigrated vehicle', () => {
  const state = createScenario();
  const changed = command(state, { type: 'exclude-source', sourceId: 'A', field: 'odometer', reason: 'Migrated only this truck' });
  const result = evaluate(changed);
  assert.equal(vehicle(result).sourceId, 'B');
  assert.equal(vehicle(result, 'TRK-208').sourceId, 'A');
  assert.equal(vehicle(result, 'TRK-208').status, 'resolved');
  assert.ok(result.decisions.filter(d => d.vehicleId === 'TRK-104' && d.sourceId === 'A').every(d => d.status === 'excluded'));
});

test('integration-wide exclusion has explicit effect on every matching vehicle', () => {
  const state = command(createScenario(), { type: 'exclude-source', sourceId: 'A', vehicleId: undefined, reason: 'Explicit integration-wide exclusion' });
  assert.equal(vehicle(evaluate(state), 'TRK-208').reason, 'authoritative-reading-excluded');
  assert.equal(vehicle(evaluate(state)).status, 'resolved');
});

test('field-specific exclusion does not leak into odometer', () => {
  const state = command(createScenario(), { type: 'exclude-source', sourceId: 'B', field: 'engine-hours', reason: 'Separate field only' });
  assert.equal(vehicle(evaluate(state)).status, 'resolved');
});

test('future-effective command does not apply early and applies at exact boundary', () => {
  const state = command(createScenario(), { sourceId: 'A', effectiveFrom: '2026-01-13T00:00:00Z' });
  assert.equal(vehicle(evaluate(state)).sourceId, 'B');
  assert.equal(vehicle(evaluate({ ...state, asOf: '2026-01-13T00:00:00Z' })).sourceId, 'A');
});

test('exclusion expiration is exclusive', () => {
  const state = command(createScenario(), { type: 'exclude-reading', readingId: 'v1-b-3', reason: 'Time-bounded review', effectiveUntil: '2026-01-12T04:00:00Z' });
  assert.equal(vehicle(evaluate(state)).reason, 'authoritative-reading-excluded');
  assert.equal(vehicle(evaluate({ ...state, asOf: '2026-01-12T04:00:00Z' })).status, 'resolved');
});

test('stale version writes fail without mutating configuration', () => {
  const state = createScenario(), before = JSON.stringify(state);
  assert.throws(() => command(state, { expectedVersion: 0 }), { code: 'STALE_CONFIG_VERSION' });
  assert.equal(JSON.stringify(state), before);
});

test('identical command retries are idempotent, changed reuse of id is rejected', () => {
  const original = createScenario();
  const cmd = { id: 'retry-id', type: 'set-authority', expectedVersion: 1, effectiveFrom: '2026-01-12T02:30:00Z', vehicleId: 'TRK-104', sourceId: 'B' };
  const changed = applyConfigurationCommand(original, cmd);
  assert.equal(applyConfigurationCommand(changed, cmd), changed);
  assert.throws(() => applyConfigurationCommand(changed, { ...cmd, sourceId: 'A' }), { code: 'COMMAND_ID_CONFLICT' });
});

test('new version at same effective time supersedes old policy without deleting it', () => {
  let state = command(createScenario(), { id: 'to-a', sourceId: 'A' });
  state = command(state, { id: 'back-to-b', sourceId: 'B' });
  assert.equal(vehicle(evaluate(state)).sourceId, 'B');
  assert.equal(state.policies.length, 4);
  assert.equal(state.configVersion, 3);
});

test('conflicting policies with same effective time and version stay ambiguous', () => {
  const state = createScenario();
  const policy = state.policies[0];
  assert.equal(vehicle(evaluate({ ...state, policies: [...state.policies, { ...policy, id: 'conflict', sourceId: 'A' }] })).reason, 'ambiguous-authority');
});

test('same-time conflicting authoritative rows stay ambiguous instead of selecting maximum', () => {
  const state = createScenario(), b = state.readings.find(r => r.id === 'v1-b-3');
  const result = evaluate({ ...state, readings: [...state.readings, { ...b, id: 'same-time-conflict', value: 99999 }] });
  assert.equal(vehicle(result).reason, 'ambiguous-authoritative-reading'); assert.equal(vehicle(result).valueKm, null);
});

test('same-time equivalent mixed-unit rows resolve deterministically', () => {
  const state = createScenario(), b = state.readings.find(r => r.id === 'v1-b-3');
  const result = evaluate({ ...state, readings: [...state.readings, { ...b, id: 'equivalent-km', unit: 'km', value: 129230.3232 }] });
  assert.equal(vehicle(result).status, 'resolved'); assert.equal(vehicle(result).valueKm, 129230.3232);
});

test('unit normalization is explicit, finite, non-negative and does not mutate raw values', () => {
  assert.equal(normalizeOdometer(1, 'mi'), 1.609344);
  assert.equal(normalizeOdometer(1000, 'm'), 1);
  assert.equal(normalizeOdometer(12.25, 'km'), 12.25);
  for (const value of [-1, Infinity, NaN, '12', Number.MAX_SAFE_INTEGER]) assert.throws(() => normalizeOdometer(value, 'km'));
  assert.throws(() => normalizeOdometer(2, 'furlong'), { code: 'INVALID_UNIT' });
  assert.equal(createScenario().readings[0].unit, 'mi');
});

test('invalid newest authority unit remains raw and unresolved rather than using older valid row', () => {
  const state = createScenario(), b = state.readings.find(r => r.id === 'v1-b-3');
  const changed = importReadings(state, [{ ...b, id: 'bad-unit', observedAt: '2026-01-12T02:00:00Z', importedAt: '2026-01-12T02:30:00Z', unit: 'unknown' }]).state;
  assert.equal(vehicle(evaluate(changed)).reason, 'invalid-authoritative-reading');
  assert.equal(changed.readings.at(-1).unit, 'unknown');
});

test('regressing authoritative value is unresolved and never replaced by a maximum', () => {
  const state = createScenario(), b = state.readings.find(r => r.id === 'v1-b-3');
  const changed = importReadings(state, [{ ...b, id: 'regression', observedAt: '2026-01-12T02:00:00Z', importedAt: '2026-01-12T02:30:00Z', value: 20000 }]).state;
  assert.equal(vehicle(evaluate(changed)).reason, 'authoritative-odometer-regression');
  assert.equal(vehicle(evaluate(changed)).valueKm, null);
});

test('duplicate imports retain one immutable raw event and original receipt time', () => {
  const state = createScenario(), repeated = { ...state.readings[0], importedAt: '2026-01-12T02:50:00Z' };
  const result = importReadings(state, [repeated, repeated]);
  assert.equal(result.state, state); assert.equal(result.importedCount, 0); assert.equal(result.duplicateCount, 2);
  assert.equal(result.state.readings[0].importedAt, '2026-01-10T01:00:00Z');
});

test('new imports are copied, frozen and duplicate rows inside the batch are counted once', () => {
  const state = createScenario(), row = { ...state.readings[0], id: 'new-row' };
  const result = importReadings(state, [row, row]);
  assert.equal(result.importedCount, 1); assert.equal(result.duplicateCount, 1);
  row.value = 999;
  assert.equal(result.state.readings.at(-1).value, 80000);
  assert.ok(Object.isFrozen(result.state.readings.at(-1)));
});

test('same raw id cannot overwrite values, source, or observation time; imports are atomic', () => {
  const state = createScenario();
  for (const patch of [{ value: 1 }, { sourceId: 'C' }, { observedAt: '2026-01-01T00:00:00Z' }]) {
    assert.throws(() => importReadings(state, [{ ...state.readings[0], id: 'new-before-conflict' }, { ...state.readings[0], ...patch }]), { code: 'READING_ID_CONFLICT' });
    assert.equal(state.readings.length, 9);
  }
});

test('direct evaluation also rejects conflicting stable raw ids', () => {
  const state = createScenario();
  assert.equal(vehicle(evaluate({ ...state, readings: [...state.readings, { ...state.readings[0], value: 2 }] })).reason, 'duplicate-reading-id-conflict');
});

test('duplicate direct evaluation is idempotent', () => {
  const state = createScenario();
  assert.deepEqual(evaluate({ ...state, readings: [...state.readings, ...state.readings] }), evaluate(state));
});

test('replay cutoff uses imported time as visibility and observed time for ranking', () => {
  const state = createScenario();
  const before = replayReadings(state, { asOf: '2026-01-10T00:59:00Z' });
  assert.equal(vehicle(before).reason, 'missing-authoritative-reading');
  const after = replayReadings(state, { asOf: '2026-01-10T01:01:00Z' });
  assert.equal(vehicle(after).readingId, 'v1-b-1');
  assert.equal(vehicle(after, 'TRK-208').reason, 'missing-authoritative-reading');
});

test('evaluation, replay and config change never mutate raw or service inputs', () => {
  const mutable = copy(createScenario()), before = copy(mutable);
  evaluate(mutable); replayReadings(mutable); command(mutable);
  assert.deepEqual(mutable, before);
  const replay = replayReadings(mutable);
  assert.deepEqual(replay.serviceFacts, before.serviceFacts);
  assert.match(replay.provenance, /derived replay/);
  assert.match(replay.provenance, /not historical service facts/);
});

test('reset and independent scenarios cannot leak configuration or raw changes', () => {
  const first = createScenario(), second = createScenario();
  assert.notEqual(first, second); assert.notEqual(first.readings, second.readings);
  const changed = command(first, { type: 'exclude-reading', readingId: 'v1-b-3', reason: 'Only this scenario' });
  assert.equal(vehicle(evaluate(changed)).status, 'unresolved');
  assert.deepEqual(second, createScenario());
  assert.equal(vehicle(evaluate(second)).status, 'resolved');
});

test('repeated replay is identical and cannot create service records', () => {
  const state = createScenario();
  assert.deepEqual(replayReadings(state), replayReadings(state));
  assert.equal(state.serviceFacts.length, 2);
});

test('invalid times are not silently accepted and future observations are suspicious', () => {
  assert.throws(() => evaluate({ ...createScenario(), asOf: 'tomorrow' }), { code: 'INVALID_TIME' });
  assert.throws(() => command(createScenario(), { effectiveFrom: '2026-01-12' }), { code: 'INVALID_TIME' });
  const state = createScenario(), b = state.readings.find(r => r.id === 'v1-b-3');
  const imported = importReadings(state, [{ ...b, id: 'future-observation', observedAt: '2026-01-13T02:00:00Z' }]).state;
  assert.equal(vehicle(evaluate(imported)).reason, 'invalid-authoritative-reading');
});

test('unknown vehicle and row configuration writes are rejected without broadening scope', () => {
  assert.throws(() => command(createScenario(), { vehicleId: 'typo' }), { code: 'UNKNOWN_VEHICLE' });
  assert.throws(() => command(createScenario(), { type: 'exclude-reading', readingId: 'typo', reason: 'Mistake' }), { code: 'UNKNOWN_READING' });
  assert.throws(() => command(createScenario(), { type: 'exclude-source', reason: '' }), { code: 'INVALID_INPUT' });
});

test('review facts distinguish repeated frozen observations from new imports and cite raw evidence', () => {
  const result = evaluate(createScenario());
  const frozen = result.reviewFacts.find(f => f.kind === 'repeated-unchanged-observation');
  assert.equal(frozen.details.sourceId, 'A');
  assert.equal(frozen.details.observedAt, '2026-01-05T12:00:00Z');
  assert.deepEqual(frozen.evidenceReadingIds, ['v1-a-1', 'v1-a-2', 'v1-a-3']);
  assert.ok(result.reviewFacts.some(f => f.kind === 'cross-source-disagreement'));
});

test('review fixture is synthetic, compact JSON, includes expected invariants and no credentials', () => {
  const input = buildReviewInput(createScenario());
  assert.equal(input.synthetic, true);
  assert.ok(input.expectedInvariantChecks.length >= 9);
  assert.ok(input.assumptions.some(a => a.includes('historical maintenance scheduler')));
  assert.ok(JSON.stringify(input).length < 20000);
  assert.ok(Object.isFrozen(input.rawReadings[0]));
});

test('simulated review is explicitly labeled and returns only in-app advisory notifications', async () => {
  const result = await reviewImports(createScenario(), createSimulatedReviewProvider());
  assert.equal(result.mode, 'simulated'); assert.match(result.label, /no model call/);
  assert.equal(result.advisoryOnly, true); assert.equal(result.notificationChannel, 'in-app'); assert.equal(result.requiresHumanDecision, true);
  assert.ok(result.findings.length >= 2);
});

test('recorded review is clearly labeled; model action fields cannot execute', async () => {
  const state = createScenario(), before = JSON.stringify(state);
  const provider = createRecordedReviewProvider({ input: buildReviewInput(createScenario()), review: { findings: [{ severity: 'attention', summary: 'Review A frozen data.', evidenceReadingIds: ['v1-a-3'], command: { type: 'set-authority', sourceId: 'A' } }], execute: true } });
  const result = await reviewImports(state, provider);
  assert.equal(result.mode, 'recorded'); assert.match(result.label, /not a live model call/);
  assert.equal(result.findings[0].command, undefined); assert.equal(result.execute, undefined);
  assert.equal(JSON.stringify(state), before);
});

test('review provider receives frozen snapshots and cannot mutate original authority or raw rows', async () => {
  const state = createScenario(), before = JSON.stringify(state);
  await reviewImports(state, { mode: 'live', label: 'Test provider boundary', async review(input) {
    assert.throws(() => { input.policies[0].sourceId = 'A'; }, TypeError);
    assert.throws(() => { input.rawReadings[0].value = 0; }, TypeError);
    return { findings: [] };
  } });
  assert.equal(JSON.stringify(state), before);
});

test('unknown evidence ids and malformed review results fail closed', async () => {
  await assert.rejects(() => reviewImports(createScenario(), createRecordedReviewProvider({ input: buildReviewInput(createScenario()), review: { findings: [{ summary: 'Invented evidence', evidenceReadingIds: ['not-real'] }] } })), { code: 'INVALID_REVIEW_OUTPUT' });
  await assert.rejects(() => reviewImports(createScenario(), { mode: 'simulated', async review() { return {}; } }), { code: 'INVALID_REVIEW_OUTPUT' });
});

test('fixture expressly labels service examples and consequences without invented scheduler or financial amounts', () => {
  const state = createScenario();
  assert.ok(state.serviceFacts.every(s => /synthetic/.test(s.provenance)));
  assert.ok(state.consequenceEvents.every(s => /illustrat/.test(s.provenance)));
  assert.ok(state.fixture.assumptions.some(s => /not a reconstruction/.test(s)));
  assert.ok(Object.isFrozen(state.serviceFacts[0]));
});

test('guided demo starts unresolved only for migrated truck and human B command fixes only that truck', () => {
  const state = createScenario({ authorityApplied: false });
  assert.equal(vehicle(evaluate(state)).reason, 'missing-authority');
  assert.equal(vehicle(evaluate(state), 'TRK-208').status, 'resolved');
  const changed = command(state);
  assert.equal(vehicle(evaluate(changed)).sourceId, 'B');
  assert.equal(vehicle(evaluate(changed)).status, 'resolved');
  assert.deepEqual(vehicle(evaluate(state), 'TRK-208'), vehicle(evaluate(changed), 'TRK-208'));
  assert.match(buildReviewInput(state).expectedInvariantChecks[0], /human explicitly/);
});

test('empty scope values fail rather than broadening an exclusion', () => {
  for (const patch of [{ vehicleId: '' }, { field: '' }, { field: null }]) assert.throws(() => command(createScenario(), { type: 'exclude-source', reason: 'Must stay narrow', ...patch }), { code: 'INVALID_INPUT' });
  assert.throws(() => command(createScenario(), { effectiveUntil: '' }), { code: 'INVALID_TIME' });
});

test('impossible calendar dates and missing timestamp precision are rejected', () => {
  for (const asOf of ['2026-02-30T03:00:00Z', '2026-01-12T24:00:00Z', '2026-01-12T03:00Z', '2026-01-12T03:00:00+25:00']) assert.throws(() => evaluate({ ...createScenario(), asOf }), { code: 'INVALID_TIME' });
  assert.equal(vehicle(evaluate({ ...createScenario(), asOf: '2026-01-12T04:00:00+01:00' })).readingId, 'v1-b-3');
});

test('review expectations track current visible evidence rather than inventing unseen row ids', () => {
  const state = createScenario();
  const input = buildReviewInput(state, { asOf: '2026-01-10T01:01:00Z' });
  assert.ok(input.expectedFlags.every(f => !f.evidenceReadingIds.includes('v1-b-3')));
  assert.ok(input.expectedFlags.some(f => f.kind === 'unresolved-authority'));
});

test('recorded review requires the exact original input snapshot', () => {
  assert.throws(() => createRecordedReviewProvider({ review: { findings: [] } }), { code: 'UNBOUND_RECORDED_REVIEW' });
});

test('matching recorded review preserves original SHA-256, configuration and replay cutoff', async () => {
  const state = createScenario({ authorityApplied: false });
  const input = buildReviewInput(state);
  const provider = createRecordedReviewProvider({ input, review: { findings: [{ summary: 'Authority is missing for the migrated vehicle.', evidenceReadingIds: ['v1-b-3'] }] } });
  const first = await reviewImports(state, provider), second = await reviewImports(state, provider);
  assert.deepEqual(first, second);
  assert.equal(first.configVersion, input.configVersion); assert.equal(first.asOf, input.asOf);
  assert.equal(first.provenance.configVersion, input.configVersion); assert.equal(first.provenance.asOf, input.asOf);
  assert.equal(first.provenance.hashAlgorithm, 'SHA-256'); assert.match(first.provenance.inputHash, /^[0-9a-f]{64}$/);
  assert.equal(provider.recording.configVersion, input.configVersion);
  assert.ok(Object.isFrozen(provider.recording.input.rawReadings[0]));
});

test('recorded missing-authority review cannot be restamped after authority is fixed', async () => {
  const original = createScenario({ authorityApplied: false });
  const provider = createRecordedReviewProvider({ input: buildReviewInput(original), review: { findings: [{ summary: 'Authority is missing.', evidenceReadingIds: ['v1-b-3'] }] } });
  const accepted = await reviewImports(original, provider);
  const changed = command(original);
  await assert.rejects(() => reviewImports(changed, provider), error => {
    assert.equal(error.code, 'RECORDED_REVIEW_INPUT_MISMATCH');
    assert.equal(error.recordedProvenance.configVersion, 1);
    assert.equal(error.requestedProvenance.configVersion, 2);
    assert.equal(error.recordedProvenance.inputHash, accepted.provenance.inputHash);
    assert.notEqual(error.recordedProvenance.inputHash, error.requestedProvenance.inputHash);
    return true;
  });
  assert.deepEqual(await reviewImports(original, provider), accepted);
});

test('recorded review cannot be reused for a different replay cutoff', async () => {
  const state = createScenario();
  const asOf = '2026-01-10T01:01:00Z';
  const provider = createRecordedReviewProvider({ input: buildReviewInput(state, { asOf }), review: { findings: [] } });
  const result = await reviewImports(state, provider, { asOf });
  assert.equal(result.asOf, asOf); assert.equal(result.provenance.asOf, asOf);
  await assert.rejects(() => reviewImports(state, provider), error => {
    assert.equal(error.code, 'RECORDED_REVIEW_INPUT_MISMATCH');
    assert.equal(error.recordedProvenance.asOf, asOf); assert.equal(error.requestedProvenance.asOf, state.asOf);
    return true;
  });
});

test('new imports invalidate recordings even when configuration version and cutoff are unchanged', async () => {
  const state = createScenario();
  const provider = createRecordedReviewProvider({ input: buildReviewInput(state), review: { findings: [] } });
  const changed = importReadings(state, [{ ...state.readings[0], id: 'new-evidence' }]).state;
  assert.equal(changed.configVersion, state.configVersion); assert.equal(changed.asOf, state.asOf);
  await assert.rejects(() => reviewImports(changed, provider), { code: 'RECORDED_REVIEW_INPUT_MISMATCH' });
});

test('recording is copied and frozen; editing supplied input or output cannot change its binding', async () => {
  const state = createScenario(), input = copy(buildReviewInput(state));
  const review = { findings: [{ summary: 'Original finding.', evidenceReadingIds: ['v1-a-3'] }] };
  const provider = createRecordedReviewProvider({ input, review });
  input.rawReadings[0].value = 0; input.configVersion = 999; review.findings[0].summary = 'Tampered finding.';
  const result = await reviewImports(state, provider);
  assert.equal(result.findings[0].summary, 'Original finding.'); assert.equal(result.configVersion, 1);
  assert.throws(() => { provider.recording.input.policies[0].sourceId = 'A'; }, TypeError);
});

test('canonical key ordering tolerates equivalent serialized snapshots but raw evidence changes do not', async () => {
  const state = createScenario(), input = buildReviewInput(state);
  const reordered = Object.fromEntries(Object.entries(input).reverse());
  const provider = createRecordedReviewProvider({ input: reordered, review: { findings: [] } });
  assert.equal((await reviewImports(state, provider)).findings.length, 0);
  const changed = copy(state); changed.readings[0].value += 1;
  await assert.rejects(() => reviewImports(changed, provider), { code: 'RECORDED_REVIEW_INPUT_MISMATCH' });
});

test('unbound or wrong-hash custom recorded providers fail closed', async () => {
  const state = createScenario();
  await assert.rejects(() => reviewImports(state, { mode: 'recorded', async review() { return { findings: [] }; } }), { code: 'RECORDED_REVIEW_INPUT_MISMATCH' });
  await assert.rejects(() => reviewImports(state, { mode: 'recorded', async review() { return { findings: [], provenance: { configVersion: state.configVersion, asOf: state.asOf, inputHash: 'wrong' } }; } }), { code: 'RECORDED_REVIEW_INPUT_MISMATCH' });
});

test('async live reviews are stamped with the snapshot reviewed, not a subsequently changed mutable caller', async () => {
  const state = copy(createScenario()), originalVersion = state.configVersion, originalAsOf = state.asOf;
  const result = await reviewImports(state, { mode: 'live', async review() {
    state.configVersion = 999; state.asOf = '2026-01-20T00:00:00Z'; state.readings = [];
    return { findings: [{ summary: 'Original snapshot evidence.', evidenceReadingIds: ['v1-b-3'] }] };
  } });
  assert.equal(result.configVersion, originalVersion); assert.equal(result.asOf, originalAsOf);
  assert.equal(result.provenance.configVersion, originalVersion); assert.equal(result.provenance.asOf, originalAsOf);
});
