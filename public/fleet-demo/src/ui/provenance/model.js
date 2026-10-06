/** Presentation-only helpers. Domain decisions remain owned by the app adapter. */
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const list = value => Array.isArray(value) ? value : [];
export const humanize = value => String(value || 'not evaluated').replaceAll('-', ' ');
export const reasonLabel = value => ({
  'explicit-authority':'The odometer comes from the source chosen for this vehicle.',
  'missing-authority':'Choose a source for this vehicle. There is no automatic fallback.',
  'different-explicit-authority':'A different provider is chosen for this vehicle.',
  'older-or-equivalent-authoritative-observation':'A newer or equivalent observation is used from the chosen source.',
  'authoritative-reading-excluded':'The newest reading from the chosen source is excluded. No older reading is substituted.',
  'explicit-exclusion':'Excluded by an explicit rule. The original record is retained.',
  'stale-authoritative-reading':'The chosen source has not reported a recent enough observation.',
  'missing-authoritative-reading':'No reading is available from the chosen source.',
  'authoritative-source-excluded':'The chosen source is excluded by a rule.',
  'ambiguous-authoritative-reading':'The chosen source has conflicting readings at the same time.',
  'ambiguous-authority':'More than one source policy applies. A decision is needed.',
  'authoritative-odometer-regression':'The chosen source reports an unexplained decrease.',
  'invalid-authoritative-reading':'The chosen source has a reading that cannot be used.',
  'outside-replay-cutoff':'This record was imported after the replay time.',
}[value] || humanize(value));
export const formatNumber = value => typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('en-US', {maximumFractionDigits: 3}) : String(value ?? 'Unknown');
export function timeLabel(value) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return value ? `${value} (invalid timestamp)` : 'Not supplied';
  return new Date(value).toISOString().replace('T', ' ').replace('.000Z', ' UTC');
}
export function activeAt(record, asOf) {
  if (!asOf || !Number.isFinite(Date.parse(asOf))) return !record.effectiveUntil;
  const at = Date.parse(asOf);
  return Date.parse(record.effectiveFrom) <= at && (!record.effectiveUntil || at < Date.parse(record.effectiveUntil));
}
export function selectedPolicy(model) {
  const candidates = list(model.policies).filter(p => p.vehicleId === model.selectedVehicleId && p.field === 'odometer' && activeAt(p, model.asOf));
  if (!candidates.length) return null;
  const sorted = [...candidates].sort((a,b) => Date.parse(b.effectiveFrom)-Date.parse(a.effectiveFrom) || (b.version ?? 0)-(a.version ?? 0));
  const best = sorted[0];
  const same = sorted.filter(p => Date.parse(p.effectiveFrom) === Date.parse(best.effectiveFrom) && (p.version ?? 0) === (best.version ?? 0));
  return new Set(same.map(p => `${p.sourceId}:${p.maxAgeHours}`)).size === 1 ? best : null;
}
export function normalizeModel(input = {}) {
  const selectedVehicleId = String(input.selectedVehicleId || '');
  const readings = list(input.readings), policies = list(input.policies), exclusions = list(input.exclusions);
  const vehicleIds = [...new Set([...list(input.vehicles).map(v => typeof v === 'string' ? v : v.id), ...readings.map(r => r.vehicleId), ...policies.map(p => p.vehicleId), selectedVehicleId].filter(Boolean))].sort();
  const rows = readings.filter(r => r.vehicleId === selectedVehicleId).slice().sort((a,b) => (String(b.importedAt || '').localeCompare(String(a.importedAt || ''))) || String(a.id).localeCompare(String(b.id)));
  const sources = [...new Set([...rows.map(r => r.sourceId), ...policies.filter(p => p.vehicleId === selectedVehicleId).map(p => p.sourceId)].filter(Boolean))].sort();
  return {...input, selectedVehicleId, readings, policies, exclusions, vehicleIds, rows, sources,
    mode: input.mode === 'today' ? 'today' : 'then', decisions: list(input.decisions), serviceHistory: list(input.serviceHistory).filter(s => s.vehicleId === selectedVehicleId), notifications: list(input.notifications), configurationVersion: input.configurationVersion ?? '?'};
}
export function matchingExclusions(model, row) {
  return model.exclusions.filter(rule => activeAt(rule,model.asOf) && (!rule.readingId || rule.readingId === row.id) && (!rule.sourceId || rule.sourceId === row.sourceId) && (!rule.vehicleId || rule.vehicleId === row.vehicleId) && (!rule.field || rule.field === row.field));
}
export function reviewState(model) {
  const review = model.review;
  if (!review) return {kind:'empty', label:'Demo review · no live model call'};
  if (!['recorded','simulated'].includes(review.mode)) return {kind:'unsupported', label:'Review mode not verified for this demo'};
  if (review.vehicleId && review.vehicleId !== model.selectedVehicleId) return {kind:'stale', label:'Review belongs to another vehicle'};
  const version = review.provenance?.configVersion ?? review.configVersion;
  const asOf = review.provenance?.asOf ?? review.asOf;
  if (version == null || version !== model.configurationVersion || (model.asOf && asOf !== model.asOf)) return {kind:'stale', label:'Review is not current for this configuration'};
  return {kind:'current', label:review.mode === 'recorded' ? 'Recorded review · not a live model call' : 'Deterministic demo review · no model call'};
}
