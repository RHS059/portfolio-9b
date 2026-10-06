import {escapeHTML as esc, normalizeModel, reviewState, selectedPolicy, humanize, reasonLabel, timeLabel, list} from './model.js';
import {panelStyles} from './styles.js';
import {renderSourceControls, EXCLUSION_SCOPES, sourceAlreadyExcluded} from '../source-controls/index.js';
import {renderReadingHistory} from '../reading-history/index.js';

let instanceCount = 0;

function renderReview(model) {
  if (model.mode !== 'today') return `<p class="fp-meta">Then · I added controls to choose the odometer source for each vehicle and exclude readings from its old provider.</p>`;
  const state = reviewState(model), review = model.review;
  const current = state.kind === 'current';
  const findingItems = current ? list(review.findings) : [];
  return `<section class="fp-card" aria-label="Today advisory import review" data-review-state="${state.kind}">
    <p class="fp-kicker">TODAY / AGENT REVIEW</p><h3>Check incoming readings</h3>
    <span class="fp-review-mode">${esc(state.label)}</span>
    <p>An agent would check incoming readings, flag suspicious records and notify the fleet manager. Source changes still need an explicit choice.</p>
    <button type="button" data-action="review-imports" data-ui-key="review-imports" class="fp-wide" ${model.reviewing?'disabled':''}>${model.reviewing?'Reviewing imports…':'Review imports ↗'}</button>
    ${state.kind==='stale' || state.kind==='unsupported' ? '<p class="fp-reason">Findings and notifications are withheld. Run a review for the current vehicle and configuration.</p>' : ''}
    ${current ? `<p class="fp-meta">Configuration v${esc(review.provenance?.configVersion ?? review.configVersion)} · ${esc(timeLabel(review.provenance?.asOf ?? review.asOf))}</p>
      ${review.label ? `<p class="fp-meta">Provider label: ${esc(review.label)}</p>` : ''}
      ${findingItems.length ? `<ol class="fp-findings">${findingItems.map(f => `<li><strong>${esc(humanize(f.severity))}</strong><p>${esc(f.summary)}</p><p class="fp-meta">Evidence: ${list(f.evidenceReadingIds).map(esc).join(', ') || 'No reading IDs supplied'} · confidence ${esc(f.confidence || 'unknown')}</p>${f.suggestedAction?`<p>Suggested next step: ${esc(f.suggestedAction)}</p>`:''}</li>`).join('')}</ol>` : `<p>${esc(review.summary || 'No advisory findings returned for this vehicle.')}</p>`}
      ${review.recommendation?`<p class="fp-meta">${esc(review.recommendation)}</p>`:''}
      ${review.provenance?.inputHash?`<details data-details-key="review-provenance"><summary>Reviewed snapshot provenance</summary><p class="fp-meta">${esc(review.provenance.hashAlgorithm || 'Digest')}: ${esc(review.provenance.inputHash)}</p></details>`:''}
      ${model.notifications.map(n => `<div class="fp-notification" role="status"><strong>In-app notification · demo</strong><span>${esc(n.text)}</span><p class="fp-meta">${esc(n.recipient || 'Responsible operator')} · shown here only</p></div>`).join('')}` : ''}
    <p class="fp-preserve">Recommendations never change mileage, source policy or service history. No external messages are sent.</p>
  </section>`;
}

/** Pure renderer exported for dependency-free component tests and adapter previews. */
export function renderProvenance(model, {idPrefix = 'fleet-provenance', scope = 'field', error = ''} = {}) {
  const m = normalizeModel(model), canonical = m.canonical;
  const resolved = m.authorityStatus === 'resolved';
  return `<style>${panelStyles}</style>
    <label class="fp-label" for="${idPrefix}-vehicle">Inspect vehicle</label>
    <select id="${idPrefix}-vehicle" data-vehicle-select data-ui-key="vehicle-select">${m.vehicleIds.map(id => `<option value="${esc(id)}" ${id===m.selectedVehicleId?'selected':''}>${esc(id)}</option>`).join('')}</select>
    <div class="fp-state" role="status" aria-live="polite" tabindex="-1" data-ui-key="reading-status"><strong>Odometer used for maintenance</strong><p>${resolved?'Source chosen':'Unresolved'} · ${esc(canonical?.reason ? reasonLabel(canonical.reason) : resolved ? 'The reading follows the source chosen for this vehicle.' : 'Choose a source with an eligible reading. There is no automatic fallback.')}</p></div>
    ${error?`<p class="fp-error" role="alert">${esc(error)}</p>`:''}
    ${renderReview(m)}
    ${renderSourceControls(m,{idPrefix,scope})}
    ${renderReadingHistory(m)}
    <section class="fp-card" aria-label="Preserved service history"><p class="fp-kicker">04 / SERVICE FACTS</p><h3>Shop visits stay on the record</h3><p>Shop technicians reported repeated oil changes and tire rotations. Exact historical scheduling rules are unknown; these records and scene movements are synthetic examples.</p>
      <p class="fp-meta">${m.serviceHistory.length} service example${m.serviceHistory.length===1?'':'s'} for ${esc(m.selectedVehicleId)} · retained unchanged</p>
      ${m.serviceHistory.length?`<details data-details-key="service-history"><summary>Inspect service examples</summary><ol class="fp-service-list">${m.serviceHistory.map(s => `<li><strong>${esc(s.work)}</strong><br>${esc(timeLabel(s.recordedAt))}<br><small>${esc(s.id)} · ${esc(s.provenance || 'Synthetic service example')}</small></li>`).join('')}</ol></details>`:''}
      <p class="fp-preserve">A replay does not erase visits or reverse work orders.</p></section>`;
}

/**
 * Native ES-module component; dispatches the frozen v1 commands only.
 * The app owns version checks, effective dating, data writes and review providers.
 */
export function createProvenancePanel({container,onAction} = {}) {
  if (!container?.ownerDocument || typeof onAction !== 'function') throw new TypeError('A DOM container and onAction callback are required.');
  const doc = container.ownerDocument, root = doc.createElement('div');
  const idPrefix = `fleet-provenance-${++instanceCount}`;
  root.className = 'fp-panel';
  root.setAttribute('role','region');
  root.setAttribute('aria-label','Fleet source provenance');
  container.appendChild(root);
  let model = normalizeModel(), scope = 'field', disposed = false, pending = false, error = '';

  function render() {
    if (disposed) return;
    const active = doc.activeElement;
    const focusKey = root.contains(active) ? active?.dataset?.uiKey : null;
    const opened = [...root.querySelectorAll('details[open][data-details-key]')].map(el => el.dataset.detailsKey);
    const scrollTop = container.scrollTop;
    root.innerHTML = renderProvenance(model,{idPrefix,scope,error});
    for (const el of root.querySelectorAll('details[data-details-key]')) if (opened.includes(el.dataset.detailsKey)) el.open=true;
    root.setAttribute('aria-busy',String(pending || !!model.reviewing));
    if (pending) for (const el of root.querySelectorAll('button[data-action],select')) el.disabled=true;
    if (focusKey) {
      const keyed=[...root.querySelectorAll('[data-ui-key]')];
      const prior=keyed.find(el => el.dataset.uiKey===focusKey);
      (prior && !prior.disabled ? prior : keyed.find(el => el.dataset.uiKey==='reading-status'))?.focus({preventScroll:true});
    }
    container.scrollTop=scrollTop;
  }

  function dispatch(action) {
    if (disposed || pending) return;
    pending = true; error = ''; render();
    let result;
    try { result=onAction(action); }
    catch (cause) { pending=false; error=cause?.message || 'The action could not be applied.'; render(); return; }
    Promise.resolve(result).catch(cause => {error=cause?.message || 'The action could not be applied.';}).finally(() => {pending=false;render();});
  }

  const click = event => {
    const button=event.target?.closest?.('button[data-action]');
    if (!button || !root.contains(button) || button.disabled || pending || disposed) return;
    const {action:type,source:sourceId,reading:readingId}=button.dataset;
    if (type==='review-imports') {if (model.mode==='today' && !model.reviewing) dispatch({type});return;}
    if (type==='replay' || type==='reimport') {dispatch({type});return;}
    if (!model.selectedVehicleId) return;
    if (type==='set-authority' && model.sources.includes(sourceId) && selectedPolicy(model)?.sourceId!==sourceId) {
      dispatch({type,vehicleId:model.selectedVehicleId,sourceId});return;
    }
    if (type==='add-exclusion') {
      if (button.dataset.scope==='reading') {
        const row=model.rows.find(r => r.id===readingId && r.sourceId===sourceId);
        if (row) dispatch({type,scope:'reading',sourceId:row.sourceId,vehicleId:row.vehicleId,field:row.field,readingId:row.id});
      } else if (button.dataset.scope==='choose' && model.sources.includes(sourceId) && !sourceAlreadyExcluded(model,sourceId,scope)) {
        dispatch({type,scope,sourceId,vehicleId:model.selectedVehicleId,field:'odometer'});
      }
    }
  };
  const change = event => {
    if (disposed || pending || !root.contains(event.target)) return;
    if (event.target.matches?.('[data-exclusion-scope]') && Object.hasOwn(EXCLUSION_SCOPES,event.target.value)) {scope=event.target.value;render();}
    if (event.target.matches?.('[data-vehicle-select]') && model.vehicleIds.includes(event.target.value) && event.target.value!==model.selectedVehicleId) dispatch({type:'select-vehicle',vehicleId:event.target.value});
  };
  root.addEventListener('click',click);
  root.addEventListener('change',change);
  return {
    update(next) {
      if (disposed) return;
      const m=normalizeModel(next);
      if (m.selectedVehicleId!==model.selectedVehicleId) scope='field';
      model=m;render();
    },
    dispose() {
      if (disposed) return;
      disposed=true;root.removeEventListener('click',click);root.removeEventListener('change',change);root.remove();
    }
  };
}
