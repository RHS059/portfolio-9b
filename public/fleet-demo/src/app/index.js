import {createSimulation} from '../core/simulation.js';
import {reviewFixture} from './review-adapter.js';
import {createProvenancePanel as createFallbackPanel} from './fallback-provenance.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const chapters = [
  {title:'A migration in progress',short:'Partial migration',copy:'TRK-104 has moved from Provider A to Provider B. TRK-208 is still on A, so the old integration must stay active. The migration boundary belongs to each vehicle.'},
  {title:'The old reading returns',short:'Nightly conflict',copy:'Provider A’s last odometer froze before its device was removed. Nightly imports bring the old reading back alongside Provider B’s current reading. Raw imports show both streams.'},
  {title:'The shop spots the loop',short:'Repeated maintenance',copy:'Shop technicians notice repeat oil changes and tire rotations within the same week. The financial loss was not quantified. These shop visits illustrate the consequence; the exact old trigger is unknown.'},
  {title:'Make authority explicit',short:'Repair the boundary',copy:'Inspect TRK-104 and set Provider B as its odometer authority. Keep TRK-208 on A. Exclusions can apply to an integration, vehicle, field or individual reading. Then replay derived values without rewriting history.'},
  {title:'A trustworthy replay',short:'Verify the result',copy:'Verify TRK-104 uses its designated source and TRK-208 still uses A. Missing authoritative readings must remain unresolved. Re-importing the same record or replaying the same configuration must not duplicate anything.'}
];
let scenario, evaluation, domain, scene, panel, sim;
let mode='then', stage=0, selectedVehicleId='TRK-104', view='iso', follow=false;
let review=null, notifications=[], commandSequence=0, reviewing=false, reviewSequence=0;
let lastMetricUpdate=0;
let ready=false;
const feedback = text => { $('#app-feedback').textContent=text; };

function snapshot(timeSeconds=0,paused=false){
  const resolved=evaluation?.vehicles.find(v=>v.vehicleId==='TRK-104')?.status==='resolved';
  const shop=stage===2 || (stage>=3 && !resolved);
  // Illustrative repeated visit loop only; it never schedules or modifies service facts.
  const servicePhase=(timeSeconds%32)/32;
  const servicePose=servicePhase<.4?{routeId:'factory-to-depot',progress:servicePhase/.4,status:'en-route-to-service'}:servicePhase<.65?{routeId:'depot-bay',progress:0,status:'workshop'}:{routeId:'depot-to-factory',progress:(servicePhase-.65)/.35,status:'returning'};
  return {timeSeconds,paused,selectedId:selectedVehicleId,stage,issueActive:stage>0&&!resolved,authorityResolved:!!resolved,
    vehicles:[
      {id:'TRK-104',...(shop?servicePose:{progress:(timeSeconds*.008+.12)%1,routeId:'delivery',status:'moving'})},
      {id:'TRK-208',progress:(timeSeconds*.006+.59)%1,routeId:'delivery',status:'moving'},
      {id:'VAN-311',model:'van',progress:(timeSeconds*.012+.21)%1,routeId:'depot',status:'moving'},
      ...Array.from({length:9},(_,i)=>({id:`TRAFFIC-${String(i+1).padStart(3,'0')}`,progress:(timeSeconds*(.008+i*.0004)+i*.111)%1,routeId:i%2?'delivery':'depot',status:'moving'}))
    ],facilities:[{id:'oict',label:'OICT container terminal'},{id:'centerpoint',label:'CenterPoint fictional drone assembly'},{id:'depot',label:'Fleet workshop'}]};
}
function evaluate(){evaluation=domain.replayReadings(scenario,{asOf:scenario.asOf});}
function render(){
  const chapter=chapters[stage];
  $('#mode-description').textContent=mode==='then'?'“Here’s what I did back then.” Explicit validation and source controls made the integration boundary manageable.':'A review assistant flags suspect imports, explains its evidence and notifies the responsible person. You still approve source changes.';
  $$('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
  $('#story-steps').innerHTML=chapters.slice(0,4).map((c,i)=>`<button type="button" class="story-step" data-stage="${i}" ${stage===i||stage===4&&i===3?'aria-current="step"':''}><span class="step-number">0${i+1}</span>${c.short}</button>`).join('');
  $('#chapter-number').textContent=`CHAPTER ${String(stage+1).padStart(2,'0')} / 05`;
  $('#chapter-title').textContent=chapter.title;
  $('#chapter-copy').textContent=chapter.copy;
  $('#next-chapter').innerHTML=stage===4?'Start again <span>↺</span>':stage===3?'Verify current policy <span>↗</span>':'Continue <span>↗</span>';
  $$('[data-vehicle]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.vehicle===selectedVehicleId)));
  const canonical=evaluation?.vehicles.find(v=>v.vehicleId===selectedVehicleId);
  $('#selected-asset').textContent=selectedVehicleId;
  $('#asset-role').textContent=selectedVehicleId==='TRK-104'?'Migrated to Provider B':'Still uses Provider A';
  $('#canonical-reading').textContent=canonical?.status==='resolved'?`${Math.round(canonical.valueKm/1.609344).toLocaleString('en-US')} mi`:'Unresolved';
  $('#canonical-source').textContent=canonical?.status==='resolved'?`${canonical.sourceId} · derived replay`:'No silent source fallback';
  $('#integrity-count').textContent=scenario?`${scenario.readings.length} raw records`:'Raw records kept';
  if(panel&&scenario)panel.update({mode,selectedVehicleId,readings:scenario.readings,policies:scenario.policies,exclusions:scenario.exclusions,decisions:evaluation.decisions,serviceHistory:scenario.serviceFacts||[],review:review?.vehicleId===selectedVehicleId?review:null,configurationVersion:scenario.configVersion,authorityStatus:canonical?.status||'unresolved',canonical,vehicles:scenario.vehicles,notifications,asOf:scenario.asOf,reviewing});
  if(scene&&sim){const s=sim.getState();scene.update(snapshot(s.timeSeconds,s.paused));}
}
function selectVehicle(id){if(!['TRK-104','TRK-208'].includes(id))return;selectedVehicleId=id;scene?.setFocus(id);render();}
function sourceIdFor(label){return [...new Set(scenario.readings.map(r=>r.sourceId))].find(id=>id===label) || label;}
async function handleAction(action){
  if(!ready)return;
  try{
    if(action.type==='select-vehicle'){selectVehicle(action.vehicleId);return;}
    if(action.type==='review-imports'){
      if(reviewing)return;
      reviewing=true;const request=++reviewSequence;const reviewedScenario=scenario;const reviewedVehicle=selectedVehicleId;render();
      const result=await reviewFixture({domain,scenario:reviewedScenario,vehicleId:reviewedVehicle});
      if(request!==reviewSequence||scenario!==reviewedScenario)return;
      review=result;notifications=[review.notification];reviewing=false;
      feedback('Review finished. No readings, service history or configuration were changed.');render();return;
    }
    if(action.type==='reimport'){const result=domain.importReadings(scenario,scenario.readings);scenario=result.state;reviewSequence++;reviewing=false;review=null;notifications=[];evaluate();feedback(`${result.duplicateCount} duplicate record(s) ignored; ${result.importedCount} new record(s). Raw history and service facts were not duplicated.`);render();return;}
    if(action.type==='replay'){evaluate();feedback(`Derived replay complete for configuration v${scenario.configVersion}. Raw imports and service history are unchanged.`);render();return;}
    if(action.type==='set-authority'||action.type==='add-exclusion'){
      const vehicleId=action.vehicleId||selectedVehicleId;
      const command={id:`user-command-${++commandSequence}`,expectedVersion:scenario.configVersion,effectiveFrom:scenario.asOf,vehicleId,sourceId:sourceIdFor(action.sourceId),reason:'Explicit user choice in the synthetic working demo.'};
      if(action.type==='set-authority'){command.type='set-authority';command.field='odometer';}
      else if(action.scope==='reading'||action.readingId){command.type='exclude-reading';command.readingId=action.readingId;}
      else {command.type='exclude-source';if(action.scope==='integration')delete command.vehicleId;else if(action.scope==='field')command.field=action.field||'odometer';}
      scenario=domain.applyConfigurationCommand(scenario,command);reviewSequence++;reviewing=false;review=null;notifications=[];evaluate();
      feedback(`Configuration v${scenario.configVersion} applied to ${command.vehicleId||'the selected integration'}. Replay is derived; source and service records are preserved.`);render();return;
    }
    feedback('That control is not connected yet.');
  }catch(error){reviewing=false;feedback(`${error.code||'Unable to apply change'}: ${error.message}`);render();}
}
function bind(){
  $$('[data-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;render();}));
  $('#story-steps').addEventListener('click',event=>{const b=event.target.closest('[data-stage]');if(b){stage=Number(b.dataset.stage);render();}});
  $('#next-chapter').addEventListener('click',()=>{stage=(stage+1)%chapters.length;render();});
  $$('[data-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;$$('[data-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));scene?.setView(view);}));
  $$('[data-focus]').forEach(b=>b.addEventListener('click',()=>scene?.setFocus(b.dataset.focus)));
  $$('[data-vehicle]').forEach(b=>b.addEventListener('click',()=>selectVehicle(b.dataset.vehicle)));
  $('#follow').addEventListener('click',()=>{follow=!follow;$('#follow').setAttribute('aria-pressed',String(follow));scene?.setFollow(follow);if(follow)scene?.setFocus(selectedVehicleId);});
  $('#pause').addEventListener('click',()=>{if(!sim)return;const paused=!sim.getState().paused;sim.setPaused(paused);$('#pause').textContent=paused?'▶ Play':'Ⅱ Pause';$('#run-status').textContent=paused?'Scene paused':'Scene running';render();});
  $('#reset').addEventListener('click',()=>{if(!domain)return;scenario=domain.createScenario({authorityApplied:false});evaluate();stage=0;reviewSequence++;reviewing=false;review=null;notifications=[];commandSequence=0;selectedVehicleId='TRK-104';mode='then';view='iso';follow=false;scene?.setFollow(false);scene?.setView(view);scene?.setFocus(null);$$('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));$('#follow').setAttribute('aria-pressed','false');sim?.reset();sim?.setPaused(false);$('#pause').textContent='Ⅱ Pause';$('#run-status').textContent='Scene running';feedback('Demo reset. Original fixture restored.');render();});
  const about=visible=>{$('#about-panel').hidden=!visible;$('#about-toggle').setAttribute('aria-expanded',String(visible));};
  $('#about-toggle').addEventListener('click',()=>about($('#about-panel').hidden));$('#about-close').addEventListener('click',()=>about(false));document.addEventListener('keydown',event=>{if(event.key==='Escape')about(false);});
}
function updateMetrics(time){
  if(time-lastMetricUpdate<2000)return;lastMetricUpdate=time;
  const m=scene?.getMetrics?.();if(!m)return;
  const fps=m.fps??m.averageFps??m.fpsAverage;
  $('#performance').textContent=Number.isFinite(fps)?`${Math.round(fps)} RAF/s · p95 ${Math.round(m.p95Ms||0)} ms · GPU target unverified`:(m.renderer||m.mode||'Browser scene')+' · hardware performance unverified';
}
async function main(){
  bind();render();
  try{domain=await import('../domain/readings/index.js');scenario=domain.createScenario({authorityApplied:false});evaluate();}
  catch(error){feedback(`The source-policy module could not load: ${error.message}`);throw error;}
  let createPanel=createFallbackPanel;
  try{const module=await import('../ui/provenance/index.js');if(typeof module.createProvenancePanel==='function')createPanel=module.createProvenancePanel;}catch{/* The app-owned panel is a complete functional fallback during integration. */}
  panel=createPanel({container:$('#provenance'),onAction:handleAction});
  try{
    const {createFleetScene}=await import('../render/core/index.js');
    scene=await createFleetScene({container:$('#world'),onSelect:selectVehicle,onStatus(status){$('#scene-notice').hidden=false;$('#scene-notice').textContent=status.message;}});
    scene.setView(view);$('#scene-loading')?.remove();
  }catch(error){$('#scene-loading').textContent=`Scene unavailable: ${error.message}. Source controls are still usable.`;console.error(error);}
  ready=true;render();
  sim=createSimulation({onTick({timeSeconds,paused}){scene?.update(snapshot(timeSeconds,paused));updateMetrics(performance.now());}});
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){sim.setPaused(true);$('#pause').textContent='▶ Play';$('#run-status').textContent='Scene paused · reduced motion';}
  window.addEventListener('resize',()=>scene?.resize());
  let suspendedPauseState=null;
  window.addEventListener('pagehide',event=>{
    if(event.persisted){suspendedPauseState=sim?.getState().paused??false;sim?.setPaused(true);}
    else{sim?.dispose();scene?.dispose();panel?.dispose();}
  });
  window.addEventListener('pageshow',event=>{if(event.persisted&&suspendedPauseState!==null){sim?.setPaused(suspendedPauseState);suspendedPauseState=null;scene?.resize();render();}});
  window.__fleetDemo={getState:()=>({mode,stage,selectedVehicleId,view,follow,scenario,evaluation,review,simulation:sim.getState()}),getMetrics:()=>scene?.getMetrics?.(),version:'fleet-demo/v1'};
}
main().catch(error=>console.error('Fleet demo bootstrap failed',error));
