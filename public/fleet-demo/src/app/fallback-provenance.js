const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const miles = row => row.unit === 'km' ? row.value / 1.609344 : row.value;
export function createProvenancePanel({container,onAction,theme={}}) {
  let model;
  const listener = event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const type = button.dataset.action;
    onAction({type,vehicleId:model.selectedVehicleId,sourceId:button.dataset.source,readingId:button.dataset.reading,scope:button.dataset.scope==='choose'?(container.querySelector('[data-exclusion-scope]')?.value||'field'):(button.dataset.scope||'reading'),field:'odometer'});
  };
  container.addEventListener('click',listener);
  return {
    update(next) {
      model=next;
      const rows=model.readings.filter(r=>r.vehicleId===model.selectedVehicleId).sort((a,b)=>b.importedAt.localeCompare(a.importedAt));
      const sources=[...new Set(rows.map(r=>r.sourceId))];
      const services=model.serviceHistory.filter(s=>s.vehicleId===model.selectedVehicleId);
      const canonical=model.canonical;
      const decisions=new Map((model.decisions||[]).map(d=>[d.readingId,d]));
      const current=canonical?.status==='resolved';
      const reasonText={'missing-authority':'Choose which provider supplies this vehicle’s odometer.','stale-authoritative-reading':'The chosen provider’s latest observation is too old.','excluded-authoritative-reading':'The chosen provider’s reading is excluded.','missing-authoritative-reading':'The chosen provider has no usable reading.'}[canonical?.reason]||String(canonical?.reason||'').replaceAll('-',' ');
      const stateLabel=current?`Using Provider ${canonical.sourceId}`:canonical?.reason==='missing-authority'?'No odometer source selected':'No usable odometer reading';
      container.innerHTML=`<div class="provenance-fallback">
        <div class="${current?'success-tag':'warning-tag'}"><strong>${escape(stateLabel)}</strong><br>${escape(reasonText)}</div>
        <div class="evidence-card"><span class="eyebrow">ODOMETER SOURCE</span><h3>${escape(model.selectedVehicleId)} / odometer</h3><p>Use the provider installed on this vehicle.</p>${sources.map(source=>`<button class="mini-button" data-action="set-authority" data-source="${escape(source)}">Use ${escape(source)}</button>`).join('')}<details><summary>Source settings</summary><p>Version ${model.configurationVersion} · effective ${escape(model.asOf)}. Original readings stay unchanged.</p></details></div>
        ${model.mode==='today'?`<div class="evidence-card"><span class="review-label">Today · review assistant</span><h3>Review the incoming records</h3><p>The review flags readings for the fleet manager. It doesn’t change the selected source.</p><button class="mini-button" data-action="review-imports">Review imports ↗</button>${model.review?`<p><strong>${model.review.mode==='simulated'?'Simulated review · no live AI call':escape(model.review.label)}</strong></p><p>${escape(model.selectedVehicleId==='TRK-104'?'Provider A keeps sending the reading taken before its device was removed. Provider B has newer readings. Check which provider this truck uses before changing its source.':model.review.summary)}</p><details><summary>Evidence and review details</summary><p>${escape(model.review.summary)}</p><p>${escape(model.review.recommendation)}</p><p>${escape(model.review.caveat)}</p><p>Reading IDs: ${escape(model.review.evidenceReadingIds?.join(', '))}</p></details>`:'<p>Simulated review. No live AI call.</p>'}</div>`:''}
        <span class="eyebrow">ORIGINAL IMPORTED READINGS · ${rows.length} RECORDS</span>
        ${rows.slice(0,2).map(row=>{const d=decisions.get(row.id);return `<div class="record-row ${d?.status==='excluded'?'rejected':''}"><div><strong>${escape(row.sourceId)} · ${typeof row.value==='number'?row.value.toLocaleString('en-US'):escape(row.value)} ${escape(row.unit)}</strong><br><small>Observed ${escape(row.observedAt?.replace('T',' ').replace('Z',' UTC'))}<br>Imported ${escape(row.importedAt?.replace('T',' ').replace('Z',' UTC'))}</small><br><small>${escape((d?.reason||d?.status||'Original reading').replaceAll('-',' '))}</small></div><button class="mini-button" data-action="add-exclusion" data-source="${escape(row.sourceId)}" data-reading="${escape(row.id)}" aria-label="Exclude reading ${escape(row.id)}">Exclude</button></div>`}).join('')}<details><summary>All ${rows.length} original readings</summary>${rows.map(row=>`<div class="record-row"><span>${escape(row.id)} · ${escape(row.sourceId)}<br><small>Observed ${escape(row.observedAt)}<br>Imported ${escape(row.importedAt)}</small></span><span>${escape(row.value)} ${escape(row.unit)}<br><button class="mini-button" data-action="add-exclusion" data-source="${escape(row.sourceId)}" data-reading="${escape(row.id)}" aria-label="Exclude reading ${escape(row.id)}">Exclude</button></span></div>`).join('')}</details>
        <div class="evidence-card"><h3>Exclude readings</h3><p>Choose what to exclude. Excluding the whole integration also affects vehicles that still use it.</p><label>Exclusion scope <select data-exclusion-scope><option value="field">This vehicle + odometer field</option><option value="vehicle">This vehicle + all fields</option><option value="integration">Entire integration + all vehicles</option></select></label>${sources.map(source=>`<button class="mini-button" data-action="add-exclusion" data-scope="choose" data-source="${escape(source)}">Exclude ${escape(source)}</button>`).join('')}<button class="mini-button" data-action="replay">Recalculate readings</button><button class="mini-button" data-action="reimport">Re-import same batch</button><details><summary>Exclusion settings</summary><p>${model.exclusions.length} exclusion rule(s) · no records deleted</p><p>Effective at ${escape(model.asOf)} · config v${model.configurationVersion}</p></details></div>
        <div class="evidence-card"><h3>Shop visits this week</h3>${services.map(s=>`<p><strong>${escape(s.work)}</strong><br>${escape(s.recordedAt)}</p>`).join('')||'<p>No visits recorded for this vehicle.</p>'}<details><summary>Service record details</summary><p>These service examples are synthetic. The exact historic PM trigger is unknown. Reviews do not create work orders or erase visits.</p>${services.map(s=>`<p>${escape(s.id)}</p>`).join('')}</details></div>
        ${model.notifications.map(n=>`<div class="success-tag"><strong>Manager notification</strong><br>${escape(n.text)}<br><small>${escape(n.recipient)}</small></div>`).join('')}
      </div>`;
      if(theme.controlClassName)for(const control of container.querySelectorAll('button,select'))control.classList.add(...theme.controlClassName.split(/\s+/).filter(Boolean));
    },
    dispose(){container.removeEventListener('click',listener);container.replaceChildren();}
  };
}
