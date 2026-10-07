import {escapeHTML as esc, normalizeModel, reviewState, selectedPolicy, humanize, reasonLabel, timeLabel, list} from './model.js';
import {panelStyles} from './styles.js';
import {renderSourceControls, EXCLUSION_SCOPES, sourceAlreadyExcluded} from '../source-controls/index.js';
import {renderReadingHistory} from '../reading-history/index.js';

let instanceCount = 0;

function renderReview(model) {
  if (model.mode !== 'today') return '<p class="fp-kicker">THEN / SOURCE CONTROLS</p>';
  const state = reviewState(model), review = model.review;
  const current = state.kind === 'current';
  const findings = current ? list(review.findings) : [];
  const repeatedA = model.rows.filter(r=>r.sourceId==='A');
  const oldObservation = repeatedA.length>1 && new Set(repeatedA.map(r=>`${r.observedAt}:${r.value}:${r.unit}`)).size===1;
  const summary = current && review.mode==='simulated' && oldObservation && model.sources.includes('B')
    ? 'Provider A keeps importing the same old observation. Provider B has newer readings. Check which provider this truck uses before changing its source.'
    : current ? (findings[0]?.summary || review.summary || 'No findings were returned for this vehicle.') : '';
  const shortSummary = summary.length>260 ? `${summary.slice(0,257)}…` : summary;
  return `<section class="fp-card" aria-label="Today advisory import review" data-review-state="${state.kind}">
    <p class="fp-kicker">TODAY / REVIEW</p><h3>Review incoming readings</h3>
    <span class="fp-review-mode">${esc(state.label)}</span>
    <button type="button" data-action="review-imports" data-ui-key="review-imports" class="fp-wide" ${model.reviewing?'disabled':''}>${model.reviewing?'Reviewing imports…':'Review imports ↗'}</button>
    ${state.kind==='stale' || state.kind==='unsupported' ? '<p class="fp-reason">Old findings are withheld. Run a new review for this vehicle and these settings.</p>' : ''}
    ${current ? `<p>${esc(shortSummary)}</p>
      <details data-details-key="review-details"><summary>Evidence and review details</summary>
        <p class="fp-meta">Settings v${esc(review.provenance?.configVersion ?? review.configVersion)} · ${esc(timeLabel(review.provenance?.asOf ?? review.asOf))}</p>
        ${review.label?`<p class="fp-meta">${esc(review.label)}</p>`:''}
        <ol class="fp-findings">${findings.map(f=>`<li><strong>${esc(humanize(f.severity))}</strong><p>${esc(f.summary)}</p><p class="fp-meta">Evidence: ${list(f.evidenceReadingIds).map(esc).join(', ')||'No reading IDs supplied'} · confidence ${esc(f.confidence||'unknown')}</p>${f.suggestedAction?`<p>${esc(f.suggestedAction)}</p>`:''}</li>`).join('')}</ol>
        ${review.recommendation?`<p class="fp-meta">${esc(review.recommendation)}</p>`:''}
        ${review.provenance?.inputHash?`<p class="fp-meta">Snapshot ${esc(review.provenance.hashAlgorithm||'digest')}: ${esc(review.provenance.inputHash)}</p>`:''}
        <p class="fp-meta">Recommendations never change mileage, source policy or service history. No external messages are sent.</p>
      </details>
      ${model.notifications.map(n=>`<div class="fp-notification" role="status"><strong>In-app notification · demo</strong><span>${esc(n.text)}</span><p class="fp-meta">${esc(n.recipient||'Fleet manager')} · shown here only</p></div>`).join('')}`:''}
  </section>`;
}

/** Pure renderer exported for dependency-free component tests and adapter previews. */
export function renderProvenance(model, {idPrefix = 'fleet-provenance', scope = 'field', error = ''} = {}) {
  const m = normalizeModel(model), canonical = m.canonical;
  const resolved = m.authorityStatus === 'resolved';
  return `<style>${panelStyles}</style>
    ${m.showVehicleSelector===false?'':`<label class="fp-label" for="${idPrefix}-vehicle">Inspect vehicle</label><select id="${idPrefix}-vehicle" data-vehicle-select data-ui-key="vehicle-select">${m.vehicleIds.map(id => `<option value="${esc(id)}" ${id===m.selectedVehicleId?'selected':''}>${esc(id)}</option>`).join('')}</select>`}
    <div class="fp-state" role="status" aria-live="polite" tabindex="-1" data-ui-key="reading-status"><strong>${!resolved&&canonical?.reason==='missing-authority'?'No odometer source selected':'Odometer used for maintenance'}</strong><p>${resolved?'Source chosen':'Unresolved'} · ${esc(canonical?.reason ? reasonLabel(canonical.reason) : resolved ? 'The reading follows the source chosen for this vehicle.' : 'Choose a source with an eligible reading. There is no automatic fallback.')}</p></div>
    ${error?`<p class="fp-error" role="alert">${esc(error)}</p>`:''}
    ${renderReview(m)}
    ${renderSourceControls(m,{idPrefix,scope})}
    ${renderReadingHistory(m)}
    <section class="fp-card" aria-label="Preserved service history"><p class="fp-kicker">04 / SERVICE FACTS</p><h3>Shop visits stay on the record</h3><p>The repeat oil changes and tire rotations stay in the history. These are synthetic examples.</p>
      <p class="fp-meta">${m.serviceHistory.length} service example${m.serviceHistory.length===1?'':'s'} for ${esc(m.selectedVehicleId)} · retained unchanged</p>
      ${m.serviceHistory.length?`<details data-details-key="service-history"><summary>Inspect service examples</summary><p class="fp-meta">Exact historical scheduling rules are unknown.</p><ol class="fp-service-list">${m.serviceHistory.map(s => `<li><strong>${esc(s.work)}</strong><br>${esc(timeLabel(s.recordedAt))}<br><small>${esc(s.id)} · ${esc(s.provenance || 'Synthetic service example')}</small></li>`).join('')}</ol></details>`:''}
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
