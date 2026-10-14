import { authorityAt, activeExclusions } from '../source-policy/index.js';
import { normalizeOdometer } from './normalize.js';
import { assertTime, immutable, stableJSON, timestamp } from './shared.js';

function fact(kind, vehicleId, ids, summary, details = {}, severity = 'review') {
  return { id: `${kind}:${vehicleId}:${ids.join(',')}`, kind, severity, vehicleId, evidenceReadingIds: ids, summary, details };
}
function compareId(a, b) { return a.id.localeCompare(b.id) || stableJSON(a).localeCompare(stableJSON(b)); }

/** A deterministic projection, not a writer and not a historical service scheduler. */
export function evaluateReadings({ readings = [], policies = [], exclusions = [], asOf, vehicles = [] }) {
  assertTime(asOf, 'asOf');
  const now = timestamp(asOf);
  const ids = [...new Set([...vehicles.map(v => typeof v === 'string' ? v : v.id), ...readings.filter(r => r.field === 'odometer').map(r => r.vehicleId), ...policies.filter(p => p.field === 'odometer').map(p => p.vehicleId)])].sort();
  const reviewFacts = [], decisions = [], results = [];
  const rows = [...readings].sort(compareId);
  const duplicateConflicts = new Set();
  const unique = new Map();
  const outsideScope = new Map();
  for (const row of rows) {
    // Ingestion rejects identity conflicts globally. A historical odometer projection,
    // however, cannot be poisoned by an unseen future receipt or another field.
    if (row.field !== 'odometer' || timestamp(row.importedAt) > now) {
      outsideScope.set(stableJSON(row), row);
      continue;
    }
    const existing = unique.get(row.id);
    if (existing) {
      const { importedAt: ignoredA, ...a } = existing;
      const { importedAt: ignoredB, ...b } = row;
      if (stableJSON(a) !== stableJSON(b)) { duplicateConflicts.add(row.vehicleId); duplicateConflicts.add(existing.vehicleId); }
      else if (timestamp(row.importedAt) < timestamp(existing.importedAt)) unique.set(row.id, row);
    } else unique.set(row.id, row);
  }
  const prepared = [...unique.values(), ...outsideScope.values()].sort(compareId).map(row => {
    const decision = { readingId: row.id, vehicleId: row.vehicleId, sourceId: row.sourceId, field: row.field, status: 'pending', reason: null, valueKm: null, observedAt: row.observedAt, importedAt: row.importedAt, exclusionIds: [] };
    if (row.field !== 'odometer') { decision.status = 'unsupported-field'; decision.reason = 'not-odometer'; }
    else if (!Number.isFinite(timestamp(row.importedAt)) || !Number.isFinite(timestamp(row.observedAt))) { decision.status = 'invalid'; decision.reason = 'invalid-reading-time'; }
    else if (timestamp(row.importedAt) > now) { decision.status = 'not-yet-imported'; decision.reason = 'outside-replay-cutoff'; }
    else if (timestamp(row.observedAt) > timestamp(row.importedAt)) { decision.status = 'invalid'; decision.reason = 'observation-after-import'; }
    if (decision.status === 'pending') {
      try { decision.valueKm = normalizeOdometer(row.value, row.unit); }
      catch (error) { decision.status = 'invalid'; decision.reason = error.code; }
    }
    const matching = activeExclusions(exclusions, row, asOf);
    decision.exclusionIds = matching.map(e => e.id).sort();
    if (matching.length && decision.status === 'pending') { decision.status = 'excluded'; decision.reason = 'explicit-exclusion'; }
    decisions.push(decision);
    return { row, decision };
  });
  for (const vehicleId of ids) {
    const entries = prepared.filter(e => e.row.vehicleId === vehicleId && e.row.field === 'odometer');
    const visible = entries.filter(e => e.decision.status !== 'not-yet-imported');
    const authority = authorityAt(policies, vehicleId, 'odometer', asOf);
    const result = { vehicleId, status: 'unresolved', reason: authority.reason, sourceId: authority.policy?.sourceId ?? null, valueKm: null, readingId: null, observedAt: null, importedAt: null, policyId: authority.policy?.id ?? null, policyVersion: authority.policy?.version ?? null, evidenceReadingIds: visible.map(e => e.row.id).sort() };
    const sourceId = result.sourceId;
    if (duplicateConflicts.has(vehicleId)) result.reason = 'duplicate-reading-id-conflict';
    else if (authority.status === 'resolved') {
      const sourceEntries = visible.filter(e => e.row.sourceId === sourceId);
      if (!sourceEntries.length) result.reason = 'missing-authoritative-reading';
      else if (sourceEntries.some(e => !Number.isFinite(timestamp(e.row.observedAt)) || !Number.isFinite(timestamp(e.row.importedAt)))) result.reason = 'invalid-authoritative-reading';
      else {
        const newestTime = Math.max(...sourceEntries.map(e => timestamp(e.row.observedAt)));
        const newest = sourceEntries.filter(e => timestamp(e.row.observedAt) === newestTime).sort((a, b) => a.row.id.localeCompare(b.row.id));
        result.evidenceReadingIds = newest.map(e => e.row.id);
        if (newest.some(e => e.decision.status === 'excluded')) result.reason = 'authoritative-reading-excluded';
        else if (newest.some(e => e.decision.status === 'invalid')) result.reason = 'invalid-authoritative-reading';
        else if ((now - newestTime) / 3600000 > authority.policy.maxAgeHours) result.reason = 'stale-authoritative-reading';
        else if (new Set(newest.map(e => e.decision.valueKm)).size !== 1) result.reason = 'ambiguous-authoritative-reading';
        else {
          const priorHigher = sourceEntries.filter(e => timestamp(e.row.observedAt) < newestTime && e.decision.status === 'pending' && e.decision.valueKm > newest[0].decision.valueKm);
          if (priorHigher.length) {
            result.reason = 'authoritative-odometer-regression';
            result.evidenceReadingIds.push(...priorHigher.map(e => e.row.id));
          } else {
            const selected = newest[0];
            Object.assign(result, { status: 'resolved', reason: 'explicit-authority', valueKm: selected.decision.valueKm, readingId: selected.row.id, observedAt: selected.row.observedAt, importedAt: selected.row.importedAt });
            selected.decision.status = 'selected'; selected.decision.reason = 'explicit-authority';
          }
        }
      }
    }
    for (const entry of entries) {
      if (entry.decision.status !== 'pending') continue;
      if (authority.status !== 'resolved') { entry.decision.status = 'unresolved'; entry.decision.reason = authority.reason; }
      else if (entry.row.sourceId !== sourceId) { entry.decision.status = 'non-authoritative'; entry.decision.reason = 'different-explicit-authority'; }
      else if (result.status !== 'resolved') { entry.decision.status = 'unresolved'; entry.decision.reason = result.reason; }
      else { entry.decision.status = 'superseded'; entry.decision.reason = 'older-or-equivalent-authoritative-observation'; }
    }
    if (result.status === 'unresolved') reviewFacts.push(fact('unresolved-authority', vehicleId, result.evidenceReadingIds, `Odometer remains unresolved: ${result.reason}.`, { reason: result.reason, sourceId }, 'attention'));
    else reviewFacts.push(fact('explicit-selection', vehicleId, [result.readingId], `Source ${sourceId} is authoritative for this vehicle; arrival order did not choose it.`, { sourceId, valueKm: result.valueKm, policyId: result.policyId }, 'info'));
    const validVisible = visible.filter(e => e.decision.valueKm !== null);
    const newestBySource = new Map();
    for (const entry of validVisible) {
      const previous = newestBySource.get(entry.row.sourceId);
      if (!previous || timestamp(entry.row.observedAt) > timestamp(previous.row.observedAt)) newestBySource.set(entry.row.sourceId, entry);
    }
    const sourceHeads = [...newestBySource.values()].sort((a, b) => a.row.sourceId.localeCompare(b.row.sourceId));
    if (sourceHeads.length > 1 && new Set(sourceHeads.map(e => e.decision.valueKm)).size > 1) {
      reviewFacts.push(fact('cross-source-disagreement', vehicleId, sourceHeads.map(e => e.row.id), 'Available sources report different odometers; authority must be explicit.', { sources: sourceHeads.map(e => ({ sourceId: e.row.sourceId, valueKm: e.decision.valueKm, observedAt: e.row.observedAt, importedAt: e.row.importedAt })) }));
    }
    for (const source of new Set(validVisible.map(e => e.row.sourceId))) {
      const sourceEntries = validVisible.filter(e => e.row.sourceId === source);
      const repeats = new Map();
      for (const entry of sourceEntries) {
        const key = `${entry.row.observedAt}:${entry.decision.valueKm}`;
        repeats.set(key, [...(repeats.get(key) || []), entry]);
      }
      for (const group of repeats.values()) if (new Set(group.map(e => e.row.importedAt)).size > 1) {
        reviewFacts.push(fact('repeated-unchanged-observation', vehicleId, group.map(e => e.row.id).sort(), 'The same observation was delivered on multiple import runs; a fresh import does not make it a fresh observation.', { sourceId: source, observedAt: group[0].row.observedAt, importedAt: group.map(e => e.row.importedAt).sort(), valueKm: group[0].decision.valueKm }));
      }
    }
    for (const entry of entries.filter(e => e.decision.status === 'invalid')) reviewFacts.push(fact('invalid-raw-reading', vehicleId, [entry.row.id], 'Raw reading was preserved but cannot establish a canonical odometer.', { reason: entry.decision.reason }, 'attention'));
    results.push(result);
  }
  return immutable({ asOf, canonicalUnit: 'km', vehicles: results, decisions, reviewFacts: reviewFacts.sort((a, b) => a.id.localeCompare(b.id)) });
}
