import {escapeHTML as esc, selectedPolicy, activeAt, timeLabel} from '../provenance/model.js';

export const EXCLUSION_SCOPES = Object.freeze({
  field: 'This vehicle + odometer',
  vehicle: 'This vehicle + all fields',
  integration: 'Entire integration + all vehicles'
});
export function sourceAlreadyExcluded(model, sourceId, scope) {
  return model.exclusions.some(rule => !rule.readingId && rule.sourceId === sourceId && activeAt(rule,model.asOf) &&
    (scope === 'integration' ? !rule.vehicleId && !rule.field : scope === 'vehicle' ? (!rule.vehicleId || rule.vehicleId === model.selectedVehicleId) && !rule.field :
      (!rule.vehicleId || rule.vehicleId === model.selectedVehicleId) && (!rule.field || rule.field === 'odometer')));
}
export function renderSourceControls(model, {idPrefix, scope = 'field'} = {}) {
  const policy = selectedPolicy(model);
  const validScope = Object.hasOwn(EXCLUSION_SCOPES,scope) ? scope : 'field';
  const scopeId = `${idPrefix}-scope`, hintId = `${idPrefix}-scope-hint`;
  return `<section class="fp-card" aria-label="Vehicle source controls">
    <p class="fp-kicker">01 / ${esc(model.selectedVehicleId || 'VEHICLE')}</p>
    <h3>Choose the source</h3>
    <p>Choose the trusted source for this vehicle. Import order never chooses it.</p>
    <div class="fp-button-row" role="group" aria-label="Chosen odometer source">${model.sources.map(source => {
      const chosen = policy?.sourceId === source;
      return `<button type="button" data-action="set-authority" data-source="${esc(source)}" data-ui-key="authority-${esc(source)}" aria-pressed="${chosen}" ${chosen?'disabled':''}>${chosen?'Using':'Use'} ${esc(source)}</button>`;
    }).join('') || '<p>No source records are available.</p>'}</div>
    <p class="fp-meta">Configuration v${esc(model.configurationVersion)}${policy ? ` · effective ${esc(timeLabel(policy.effectiveFrom))}` : ' · no source selected yet'}</p>
    <p class="fp-preserve">Raw values and service history stay unchanged.</p>
  </section>
  <section class="fp-card" aria-label="Integration exclusions">
    <p class="fp-kicker">02 / EXCLUSIONS</p>
    <h3>Exclude old-provider readings</h3>
    <label class="fp-label" for="${scopeId}">Exclusion scope</label>
    <select id="${scopeId}" data-exclusion-scope data-ui-key="exclusion-scope" aria-describedby="${hintId}">${Object.entries(EXCLUSION_SCOPES).map(([value,label]) => `<option value="${value}" ${value===validScope?'selected':''}>${label}</option>`).join('')}</select>
    <p id="${hintId}" class="fp-scope-hint">${validScope==='integration' ? 'Integration-wide: affects every vehicle using that provider, including vehicles that have not migrated.' : validScope==='vehicle' ? 'Only this vehicle, but every field from the selected provider. Other vehicles keep their source.' : 'Only this vehicle’s odometer from the selected provider. Other vehicles and fields keep their source.'}</p>
    <div class="fp-button-row">${model.sources.map(source => {
      const excluded = sourceAlreadyExcluded(model,source,validScope);
      return `<button type="button" data-action="add-exclusion" data-source="${esc(source)}" data-scope="choose" data-ui-key="exclude-source-${esc(source)}" ${excluded?'disabled':''}>${excluded?'Excluded':'Exclude'} ${esc(source)}</button>`;
    }).join('')}</div>
    <p class="fp-meta">Excluded readings stay in the history. Individual records can be excluded below.</p>
    <details data-details-key="exclusion-rules"><summary>${model.exclusions.length} recorded exclusion rule${model.exclusions.length===1?'':'s'}</summary>${model.exclusions.length ? `<ul class="fp-rule-list">${model.exclusions.map(rule => `<li><strong>${esc(rule.sourceId || 'All sources')} · ${esc(rule.readingId ? `reading ${rule.readingId}` : `${rule.vehicleId || 'all vehicles'} / ${rule.field || 'all fields'}`)}</strong><span>${esc(rule.reason || 'No reason supplied')}</span><small>${esc(rule.id)} · v${esc(rule.version ?? '?')} · effective ${esc(timeLabel(rule.effectiveFrom))}${rule.effectiveUntil?` until ${esc(timeLabel(rule.effectiveUntil))}`:''}</small></li>`).join('')}</ul>` : '<p>No exclusions. Every raw record remains visible.</p>'}</details>
    <button type="button" data-action="replay" data-ui-key="replay" class="fp-wide">Recalculate using these settings ↗</button>
    <button type="button" data-action="reimport" data-ui-key="reimport" class="fp-wide">Re-import the same batch</button>
    <p class="fp-meta">Re-import ignores duplicates. Recalculating does not add or cancel service records.</p>
  </section>`;
}
