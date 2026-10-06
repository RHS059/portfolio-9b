import {escapeHTML as esc, formatNumber, timeLabel, humanize, reasonLabel, matchingExclusions} from '../provenance/model.js';

export function renderReadingHistory(model) {
  const decisions = new Map(model.decisions.filter(d => !d.vehicleId || d.vehicleId === model.selectedVehicleId).map(d => [d.readingId,d]));
  return `<section class="fp-history" aria-label="Immutable raw reading history">
    <p class="fp-kicker">03 / IMPORT HISTORY</p><h3>Original records</h3>
    <p class="fp-meta">${model.rows.length} raw record${model.rows.length===1?'':'s'} · newest import first. A new import does not make an old observation current.</p>
    <ol class="fp-records">${model.rows.map(row => {
      const decision = decisions.get(row.id), rules = matchingExclusions(model,row);
      const excluded = rules.length > 0 || decision?.status === 'excluded';
      return `<li class="fp-record" data-reading-id="${esc(row.id)}">
        <div class="fp-record-head"><strong>${esc(row.sourceId)} · ${esc(formatNumber(row.value))} ${esc(row.unit)}</strong><span class="fp-badge">${esc(humanize(decision?.status || 'raw record'))}</span></div>
        <p class="fp-reading-id">${esc(row.id)} · ${esc(row.field || 'field not supplied')}</p>
        <dl class="fp-times"><dt>Observed</dt><dd>${esc(timeLabel(row.observedAt))}</dd><dt>Imported</dt><dd>${esc(timeLabel(row.importedAt))}</dd></dl>
        <p class="fp-reason">${esc(reasonLabel(decision?.reason || 'No derived decision supplied'))}</p>
        ${Number.isFinite(decision?.valueKm) ? `<p class="fp-meta">Derived normalization: ${esc(formatNumber(decision.valueKm))} km</p>` : ''}
        ${rules.length ? `<p class="fp-meta">Rule${rules.length===1?'':'s'}: ${rules.map(rule => esc(rule.id)).join(', ')}</p>` : ''}
        <button type="button" data-action="add-exclusion" data-scope="reading" data-reading="${esc(row.id)}" data-source="${esc(row.sourceId)}" data-ui-key="exclude-reading-${esc(row.id)}" aria-label="Exclude reading ${esc(row.id)}" ${excluded?'disabled':''}>${excluded?'Excluded · raw retained':'Exclude this reading'}</button>
      </li>`;
    }).join('') || '<li class="fp-empty">No raw readings for this vehicle.</li>'}</ol>
  </section>`;
}
