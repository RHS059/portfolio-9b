import {buildConfigurationCommand} from './commands.js';
import {createSimulation} from '../core/simulation.js';
import {reviewFixture} from './review-adapter.js';
import {createProvenancePanel as createFallbackPanel} from './fallback-provenance.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const chapters = [
  {title:'The shop noticed the repeats',short:'Back in the shop',copy:'The customer paid for unnecessary repeat oil changes and tire rotations. Each extra visit meant more shop work and less time with the vehicle available.'},
  {title:'Two providers still connected',short:'A partial migration',copy:'The customer was switching providers. TRK-104 had moved to B, while TRK-208 still used A. Both accounts stayed open. Each vehicle needed its own source setting.'},
  {title:'The old reading came back nightly',short:'Conflicting readings',copy:'Provider A’s odometer froze before its device was removed. Provider B had current readings. Each night, the system switched between old and current readings.'},
  {title:'Choose the source',short:'Stop using the old reading',copy:'Choose Provider B for TRK-104’s odometer. Keep TRK-208 on A. Exclude old readings at the integration, vehicle, field or individual-record level. Recalculate without changing the original readings or completed service records.'},
  {title:'Check before another visit',short:'Verify the readings',copy:'Check that TRK-104 uses B and TRK-208 still uses A. If the selected source has no usable reading, leave it unresolved. Importing the same records again must not duplicate them or create another service entry.'}
];
let scenario, evaluation, domain, scene, panel, sim;
let intro=true;
let mode='then', stage=0, selectedVehicleId='TRK-104', view='iso', follow=false;
let review=null, notifications=[], commandSequence=0, reviewing=false, reviewSequence=0;
let lastMetricUpdate=0;
let ready=false, initialCameraHandled=false, manualCameraUsed=false;
const chapterSites=['depot','depot','depot','depot','depot'];
const feedback = text => { $('#app-feedback').textContent=text; };

function snapshot(timeSeconds=0,paused=false){
  const resolved=evaluation?.vehicles.find(v=>v.vehicleId==='TRK-104')?.status==='resolved';
  const shop=stage<=2 || (stage>=3 && !resolved);
  // Illustrative repeated visit loop only; it never schedules or modifies service facts.
  const servicePhase=((timeSeconds+13)%32)/32;
  const servicePose=servicePhase<.4?{routeId:'factory-to-depot',progress:servicePhase/.4,status:'en-route-to-service'}:servicePhase<.65?{routeId:'depot-bay',progress:0,status:'workshop'}:{routeId:'depot-to-factory',progress:(servicePhase-.65)/.35,status:'returning'};
  return {timeSeconds,paused,selectedId:selectedVehicleId,stage,issueActive:stage>0&&!resolved,authorityResolved:!!resolved,
    vehicles:[
      {id:'TRK-104',...(shop?(stage===0?{routeId:'depot-bay',progress:0,status:'workshop'}:servicePose):{progress:(timeSeconds*.008+.12)%1,routeId:'delivery',status:'moving'})},
      {id:'TRK-208',progress:(timeSeconds*.006+.59)%1,routeId:'delivery',status:'moving'},
      {id:'VAN-311',model:'van',inspectable:false,progress:(timeSeconds*.012+.21)%1,routeId:'depot',status:'moving'},
      ...Array.from({length:9},(_,i)=>({id:`TRAFFIC-${String(i+1).padStart(3,'0')}`,inspectable:false,progress:(timeSeconds*(.008+i*.0004)+i*.111)%1,routeId:i%2?'delivery':'depot',status:'moving'}))
    ],facilities:[{id:'oict',label:'OICT container terminal'},{id:'centerpoint',label:'Drone factory'},{id:'depot',label:'Fleet workshop'}]};
}
function evaluate(){evaluation=domain.replayReadings(scenario,{asOf:scenario.asOf});}
function render(){
  const chapter=chapters[stage];
  $('.workspace').dataset.intro=String(intro);$('#intro-panel').hidden=!intro;$('#story-content').hidden=intro;$('#project-info').hidden=!intro;$('.inspector-panel').hidden=intro;$('#source-inspector').hidden=intro;
  $('#mode-description').textContent=mode==='then'?'I added controls to choose the odometer source for each vehicle and exclude readings from its old provider.':'An agent would check incoming readings, flag suspicious records and notify the fleet manager.';
  $$('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
  $('#story-steps').innerHTML=chapters.slice(0,4).map((c,i)=>`<button type="button" class="story-step" data-stage="${i}" ${stage===i||stage===4&&i===3?'aria-current="step"':''}><span class="step-number">0${i+1}</span>${c.short}</button>`).join('');
  $('#chapter-number').textContent=`CHAPTER ${String(stage+1).padStart(2,'0')} / 05`;
  $('#chapter-title').textContent=chapter.title;
  $('#chapter-copy').textContent=chapter.copy;
  $('#next-chapter').innerHTML=stage===4?'Start again <span>↺</span>':stage===3?'Check current readings <span>↗</span>':'Continue <span>↗</span>';
  $$('[data-vehicle]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.vehicle===selectedVehicleId)));
  const canonical=evaluation?.vehicles.find(v=>v.vehicleId===selectedVehicleId);
  $('#selected-asset').textContent=selectedVehicleId;
  $('#asset-role').textContent=selectedVehicleId==='TRK-104'?'Migrated to Provider B':'Still uses Provider A';
  $('#canonical-reading').textContent=canonical?.status==='resolved'?`${Math.round(canonical.valueKm/1.609344).toLocaleString('en-US')} mi`:'Unresolved';
  $('#canonical-source').textContent=canonical?.status==='resolved'?`Provider ${canonical.sourceId}`:'No usable reading from the chosen source';
  $('#integrity-count').textContent=scenario?`${scenario.readings.length} readings kept`:'Raw records kept';
  if(panel&&scenario)panel.update({mode,showVehicleSelector:false,selectedVehicleId,readings:scenario.readings,policies:scenario.policies,exclusions:scenario.exclusions,decisions:evaluation.decisions,serviceHistory:scenario.serviceFacts||[],review:review?.vehicleId===selectedVehicleId?review:null,configurationVersion:scenario.configVersion,authorityStatus:canonical?.status||'unresolved',canonical,vehicles:scenario.vehicles,notifications,asOf:scenario.asOf,reviewing,assumptions:scenario.fixture?.assumptions||[]});
  if(scene&&sim){const s=sim.getState();scene.update(snapshot(s.timeSeconds,s.paused));}
}
function focusChapter(){if(!follow)scene?.setFocus(chapterSites[stage]);}
function setChapter(next){intro=false;stage=next;render();focusChapter();}
function focusFacility(id){manualCameraUsed=true;follow=false;$('#follow').setAttribute('aria-pressed','false');scene?.setFollow(false);scene?.setFocus(id);}
function selectEntity(id){if(['oict','centerpoint','depot'].includes(id)){focusFacility(id);return;}selectVehicle(id);}
function selectVehicle(id){if(!['TRK-104','TRK-208'].includes(id))return;selectedVehicleId=id;scene?.setFocus(id);render();}
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
      feedback('Review finished. Check the flagged readings before changing a source.');render();return;
    }
    if(action.type==='reimport'){const result=domain.importReadings(scenario,scenario.readings);scenario=result.state;reviewSequence++;reviewing=false;review=null;notifications=[];evaluate();feedback(`${result.duplicateCount} duplicate record(s) ignored; ${result.importedCount} new record(s). Raw history and service facts were not duplicated.`);render();return;}
    if(action.type==='replay'){evaluate();feedback(`Readings recalculated using settings v${scenario.configVersion}. Original readings and service history are unchanged.`);render();return;}
    if(action.type==='set-authority'||action.type==='add-exclusion'){
      const command=buildConfigurationCommand({action,selectedVehicleId,configVersion:scenario.configVersion,asOf:scenario.asOf,id:`user-command-${++commandSequence}`});
      scenario=domain.applyConfigurationCommand(scenario,command);reviewSequence++;reviewing=false;review=null;notifications=[];evaluate();
      feedback(`Settings v${scenario.configVersion} applied to ${command.vehicleId||'the selected integration'}. Original readings and service records are preserved.`);render();return;
    }
    feedback('That control is not connected yet.');
  }catch(error){reviewing=false;feedback(`${error.code||'Unable to apply change'}: ${error.message}`);render();}
}
function bind(){
  $('#start-story').addEventListener('click',()=>{intro=false;stage=0;render();focusChapter();});
  $$('[data-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;render();}));
  $('#story-steps').addEventListener('click',event=>{const b=event.target.closest('[data-stage]');if(b)setChapter(Number(b.dataset.stage));});
  $('#next-chapter').addEventListener('click',()=>setChapter((stage+1)%chapters.length));
  $$('[data-view]').forEach(b=>b.addEventListener('click',()=>{manualCameraUsed=true;view=b.dataset.view;$$('[data-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));scene?.setView(view);}));
  $$('[data-focus]').forEach(b=>b.addEventListener('click',()=>focusFacility(b.dataset.focus)));
  $$('[data-vehicle]').forEach(b=>b.addEventListener('click',()=>selectVehicle(b.dataset.vehicle)));
  $('#overview').addEventListener('click',()=>focusFacility(null));
  $('#world').addEventListener('pointerdown',()=>{manualCameraUsed=true;});
  $('#world').addEventListener('wheel',()=>{manualCameraUsed=true;},{passive:true});
  $('#follow').addEventListener('click',()=>{manualCameraUsed=true;follow=!follow;$('#follow').setAttribute('aria-pressed',String(follow));scene?.setFollow(follow);if(follow)scene?.setFocus(selectedVehicleId);});
  $('#pause').addEventListener('click',()=>{if(!sim)return;const paused=!sim.getState().paused;sim.setPaused(paused);$('#pause').textContent=paused?'▶ Play':'Ⅱ Pause';$('#run-status').textContent=paused?'Scene paused':'Scene running';render();});
  $('#reset').addEventListener('click',()=>{
    if(!domain)return;
    scenario=domain.createScenario({authorityApplied:false});evaluate();intro=true;stage=0;
    reviewSequence++;reviewing=false;review=null;notifications=[];commandSequence=0;
    selectedVehicleId='TRK-104';mode='then';view='iso';follow=false;scene?.setFollow(false);
    manualCameraUsed=false;initialCameraHandled=true;
    $$('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));$('#follow').setAttribute('aria-pressed','false');
    sim?.reset();const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;sim?.setPaused(reduce);
    $('#pause').textContent=reduce?'▶ Play':'Ⅱ Pause';$('#run-status').textContent=reduce?'Scene paused · reduced motion':'Scene running';
    feedback('Demo reset.');render();scene?.resize();scene?.setView(view,{focusId:chapterSites[0]});
  });
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
  catch(error){feedback(`The source-policy module could not load: ${error.message}`);$('#scene-loading').textContent='The reading controls could not load. Please reload the demo.';throw error;}
  let createPanel=createFallbackPanel;
  try{const module=await import('../ui/provenance/index.js');if(typeof module.createProvenancePanel==='function')createPanel=module.createProvenancePanel;}catch{/* The app-owned panel is a complete functional fallback during integration. */}
  try{panel=createPanel({container:$('#provenance'),onAction:handleAction});}
  catch(error){console.warn('Provenance panel failed; using built-in controls',error.message);panel=createFallbackPanel({container:$('#provenance'),onAction:handleAction});}
  try{
    const {createFleetScene}=await import('../render/core/index.js');
    scene=await createFleetScene({container:$('#world'),onSelect:selectEntity,onStatus(status){$('#scene-notice').hidden=['ready','loading','fallback'].includes(status.kind);$('#scene-notice').textContent=status.message;}});
    scene.setView(view);$('#scene-loading')?.remove();
  }catch(error){$('#scene-loading').textContent=`Scene unavailable: ${error.message}. Source controls are still usable.`;console.error(error);}
  ready=true;render();
  sim=createSimulation({onTick({timeSeconds,paused}){scene?.update(snapshot(timeSeconds,paused));if(!initialCameraHandled&&scene?.getMetrics?.().ready){initialCameraHandled=true;if(!manualCameraUsed)focusChapter();}updateMetrics(performance.now());}});
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){sim.setPaused(true);$('#pause').textContent='▶ Play';$('#run-status').textContent='Scene paused · reduced motion';}
  window.addEventListener('resize',()=>scene?.resize());
  let suspendedPauseState=null;
  window.addEventListener('pagehide',event=>{
    if(event.persisted){suspendedPauseState=sim?.getState().paused??false;sim?.setPaused(true);}
    else{sim?.dispose();scene?.dispose();panel?.dispose();}
  });
  window.addEventListener('pageshow',event=>{if(event.persisted&&suspendedPauseState!==null){sim?.setPaused(suspendedPauseState);suspendedPauseState=null;scene?.resize();render();}});
  window.__fleetDemo={getState:()=>({intro,mode,stage,selectedVehicleId,view,follow,scenario,evaluation,review,simulation:sim.getState()}),getMetrics:()=>scene?.getMetrics?.(),version:'fleet-demo/v1'};
}
main().catch(error=>console.error('Fleet demo bootstrap failed',error));
