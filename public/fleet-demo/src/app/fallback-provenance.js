const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const miles = row => row.unit === 'km' ? row.value / 1.609344 : row.value;
export function createProvenancePanel({container,onAction}) {
  let model;
  const listener = event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const type = button.dataset.action;
    onAction({type,vehicleId:model.selectedVehicleId,sourceId:button.dataset.source,readingId:button.dataset.reading,scope:button.dataset.scope || 'reading',field:'odometer'});
  };
  container.addEventListener('click',listener);
  return {
    update(next) {
      model=next;
      const rows=model.readings.filter(r=>r.vehicleId===model.selectedVehicleId);
      const sources=[...new Set(rows.map(r=>r.sourceId))];
      const canonical=model.canonical;
      const decisions=new Map((model.decisions||[]).map(d=>[d.readingId,d]));
      const current=canonical?.status==='resolved';
      container.innerHTML=`<div class="provenance-fallback">
        <div class="${current?'success-tag':'warning-tag'}"><strong>${current?'Authority resolved':'Authority unresolved'}</strong><br>${escape(canonical?.reason||'Choose a source for this vehicle. There is no automatic newest or highest fallback.')}</div>
        <div class="evidence-card"><span class="eyebrow">PER-VEHICLE AUTHORITY · V${model.configurationVersion}</span><h3>${escape(model.selectedVehicleId)} / odometer</h3><p>Choose a trusted source. Applies to this vehicle only.</p>${sources.map(source=>`<button class="mini-button" data-action="set-authority" data-source="${escape(source)}">Use ${escape(source)}</button>`).join('')}<p>Configuration is versioned and effective-dated. Results below are a derived replay.</p></div>
        ${model.mode==='today'?`<div class="evidence-card"><span class="review-label">Today · review assistant</span><h3>Review the incoming records</h3><p>A review explains evidence and notifies the responsible person. Deterministic policy still decides which reading is authoritative.</p><button class="mini-button" data-action="review-imports">Review imports ↗</button>${model.review?`<p><strong>${escape(model.review.label)}</strong></p><p>${escape(model.review.summary)}</p><p>${escape(model.review.recommendation)}</p><p>${escape(model.review.caveat)}</p>`:'<p>Demo adapter. No live model or secret API keys.</p>'}</div>`:''}
        <span class="eyebrow">IMMUTABLE IMPORT HISTORY · ${rows.length} RECORDS</span>
        ${rows.map(row=>{const d=decisions.get(row.id);return `<div class="record-row ${d?.status==='excluded'?'rejected':''}"><div><strong>${escape(row.sourceId)} · ${miles(row).toLocaleString('en-US',{maximumFractionDigits:0})} mi</strong><br><small>${escape(row.observedAt?.slice(0,10))} · ${escape(row.id)}</small><br><small>${escape(d?.reason||d?.status||'Raw record')}</small></div><button class="mini-button" data-action="add-exclusion" data-source="${escape(row.sourceId)}" data-reading="${escape(row.id)}" aria-label="Exclude reading ${escape(row.id)}">Exclude</button></div>`}).join('')}
        <div class="evidence-card"><h3>Exclusions stay explicit</h3><p>Suppress a source from this vehicle’s odometer. Raw records remain available in the import history.</p>${sources.map(source=>`<button class="mini-button" data-action="add-exclusion" data-scope="field" data-source="${escape(source)}">Exclude ${escape(source)} / odometer</button>`).join('')}<button class="mini-button" data-action="replay">Replay derived readings</button><p>${model.exclusions.length} exclusion rule(s) · no records deleted</p></div>
        <div class="evidence-card"><span class="eyebrow">REPORTED CONSEQUENCE</span><h3>Repeated preventive maintenance</h3><p>Shop technicians noticed repeat oil changes and tire rotations within the same week. The exact historic PM trigger is unknown. This scene is illustrative.</p><p>${model.serviceHistory.length} synthetic service facts retained. No automatic work order is generated from the review.</p></div>
        ${model.notifications.map(n=>`<div class="success-tag"><strong>In-app notification</strong><br>${escape(n.text)}<br><small>${escape(n.recipient)}</small></div>`).join('')}
      </div>`;
    },
    dispose(){container.removeEventListener('click',listener);container.replaceChildren();}
  };
}
