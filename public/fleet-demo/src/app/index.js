import {buildConfigurationCommand} from './commands.js';
import {forwardSceneLabelWheel} from './wheel-navigation.js';
import {createSimulation} from '../core/simulation.js';
import {reviewFixture} from './review-adapter.js';
import {createProvenancePanel as createFallbackPanel} from './fallback-provenance.js';

const mountedControllers=new WeakMap();
const freezeScene=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freezeScene);Object.freeze(value);}return value;};
const escapeStory=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/** Mount one isolated controller; the caller owns route lifetime and dependency loading. */
export function mountFleetDemo({root=document,theme={}}={}) {
  if(!root?.querySelector)throw new TypeError('Fleet demo requires a DOM root');
  mountedControllers.get(root)?.dispose();
  const doc=root.ownerDocument||document,cleanups=[];
  let disposed=false,debugAPI;
  function on(target,type,listener,options){if(!target)throw new Error(`Missing Fleet control for ${type}`);target.addEventListener(type,listener,options);cleanups.push(()=>target.removeEventListener(type,listener,options));}
  function dispose(){
    if(disposed)return;disposed=true;ready=false;reviewSequence++;
    for(const remove of cleanups.splice(0))remove();
    sim?.dispose();scene?.dispose();panel?.dispose();
    if(window.__fleetDemo===debugAPI)delete window.__fleetDemo;
    if(mountedControllers.get(root)?.dispose===dispose)mountedControllers.delete(root);
  }
  const $ = selector => root.matches?.(selector) ? root : root.querySelector(selector);
  const $$ = selector => [...root.querySelectorAll(selector)];
  const chapters = [
    {title:'Two shop visits in one week',copy:'In this example, TRK-104 came in twice for an oil change and tire rotation. The customer paid for repeat work and lost use of the truck during each visit.'},
    {title:'The provider change was only partly finished',copy:'TRK-104 had moved to Provider B. TRK-208 still used Provider A, so the old account had to stay connected.'},
    {title:'The old mileage kept coming back',copy:'Provider A kept sending the reading taken before TRK-104’s device was removed. Provider B had newer readings. Each night, the system switched between them.'},
    {title:'Choose the source for each truck',copy:'Use Provider B for TRK-104. TRK-208 still needs Provider A. Exclude old readings without deleting them or changing completed service records.'},
    {title:'Review the next imports',copy:'Compare the controls I added then with an agent review today. A person still chooses the vehicle’s odometer source.'}
  ];
  let scenario, evaluation, domain, scene, panel, sim;
  let intro=true;
  let mode='then', stage=0, selectedVehicleId='TRK-208', view='iso', follow=true;
  let review=null, notifications=[], commandSequence=0, reviewing=false, reviewSequence=0;
  let lastMetricUpdate=0;
  let ready=false, initialCameraHandled=false, manualCameraUsed=false;
  const chapterSites=['depot','depot','depot','depot','depot'];
  const feedback = text => { $('#app-feedback').textContent=text; };

  function snapshot(timeSeconds=0,paused=false){
    const travel=(rate,offset)=>{const distance=timeSeconds*rate+offset;return {progress:distance%1,travelCycle:Math.floor(distance)};};
    const resolved=evaluation?.vehicles.find(v=>v.vehicleId==='TRK-104')?.status==='resolved';
    const shop=stage<=2 || (stage>=3 && !resolved);
    // Illustrative repeated visit loop only; it never schedules or modifies service facts.
    const servicePhase=((timeSeconds+13)%32)/32;
    const servicePose=servicePhase<.4?{routeId:'factory-to-depot',progress:servicePhase/.4,status:'en-route-to-service'}:servicePhase<.65?{routeId:'depot-bay',progress:0,status:'workshop'}:{routeId:'depot-to-factory',progress:(servicePhase-.65)/.35,status:'returning'};
    return {timeSeconds,paused,selectedId:selectedVehicleId,stage,issueActive:stage>0&&!resolved,authorityResolved:!!resolved,
      vehicles:[
        {id:'TRK-104',...(shop?(stage===0?{routeId:'depot-bay',progress:0,status:'workshop'}:servicePose):{...travel(.008,.12),routeId:'delivery',status:'moving'})},
        {id:'TRK-208',...travel(.006,.59),routeId:'delivery',status:'moving'},
        {id:'VAN-311',model:'van',inspectable:false,...travel(.012,.21),routeId:'delivery',status:'moving'},
        ...Array.from({length:9},(_,i)=>({id:`TRAFFIC-${String(i+1).padStart(3,'0')}`,inspectable:false,...travel(.008+i*.0004,i*.111),routeId:'delivery',status:'moving'}))
      ],facilities:[{id:'oict',label:'OICT container terminal'},{id:'centerpoint',label:'Drone factory'},{id:'depot',label:'Fleet workshop'}]};
  }
  function evaluate(){evaluation=domain.replayReadings(scenario,{asOf:scenario.asOf});}
  function render(){
    const chapter=chapters[stage];
    $('.workspace').dataset.intro=String(intro);$('#intro-panel').hidden=!intro;$('#story-content').hidden=intro;$('#project-info').hidden=!intro;
    $('.inspector-panel').hidden=intro||stage<2;$('#source-inspector').hidden=intro||stage<3;$('#reading-context').hidden=intro||stage<3;$('#review-controls').hidden=intro||stage!==4;
    $('#story-evidence').hidden=intro||stage!==2;
    if(stage===2){const rows=(scenario?.readings||[]).filter(row=>row.vehicleId==='TRK-104'&&row.field==='odometer');$('#story-evidence').innerHTML=['A','B'].map(source=>{const row=rows.filter(r=>r.sourceId===source).sort((a,b)=>String(b.importedAt).localeCompare(String(a.importedAt)))[0];return `<p><strong>Provider ${source}</strong><br>${row?`${escapeStory(Number(row.value).toLocaleString('en-US'))} ${escapeStory(row.unit)}<br><small>Observed ${escapeStory(row.observedAt.slice(0,10))}</small>`:'No reading supplied'}</p>`;}).join('');}
    $('#follow').setAttribute('aria-pressed',String(follow));
    $('#mode-description').textContent=mode==='then'?'I added controls to choose the odometer source for each vehicle and exclude readings from its old provider.':'An agent would check incoming readings, flag suspicious records and notify the fleet manager.';
    $$('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
    $('#chapter-number').textContent=`CHAPTER ${String(stage+1).padStart(2,'0')} / 05`;
    $('#chapter-title').textContent=chapter.title;
    $('#chapter-copy').textContent=chapter.copy;
    $('#next-chapter').innerHTML=stage===4?'Back to project <span>↺</span>':'Next <span>↗</span>';
    $$('[data-vehicle]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.vehicle===selectedVehicleId)));
    const canonical=evaluation?.vehicles.find(v=>v.vehicleId===selectedVehicleId);
    $('#selected-asset').textContent=selectedVehicleId;
    $('#asset-role').textContent=selectedVehicleId==='TRK-104'?'Migrated to Provider B':'Still uses Provider A';
    const visits=(scenario?.serviceFacts||[]).filter(record=>record.vehicleId===selectedVehicleId).length;$('#service-visits').textContent=String(visits);$('#service-summary').textContent=visits?'Oil change + tire rotation':'Illustrative service history';$('#maintenance-cost').textContent='Amount not provided';$('#maintenance-cost-note').textContent=visits?'Repeat labor and parts':'For the selected truck';
    $('#canonical-reading').textContent=canonical?.status==='resolved'?`${Math.round(canonical.valueKm/1.609344).toLocaleString('en-US')} mi`:'Unresolved';
    $('#canonical-source').textContent=canonical?.status==='resolved'?`Provider ${canonical.sourceId}`:'No usable reading from the chosen source';
    $('#integrity-count').textContent=scenario?`${scenario.readings.length} readings kept`:'Raw records kept';
    if(panel&&scenario)panel.update({mode,compact:true,showVehicleSelector:true,selectedVehicleId,readings:scenario.readings,policies:scenario.policies,exclusions:scenario.exclusions,decisions:evaluation.decisions,serviceHistory:scenario.serviceFacts||[],review:review?.vehicleId===selectedVehicleId?review:null,configurationVersion:scenario.configVersion,authorityStatus:canonical?.status||'unresolved',canonical,vehicles:scenario.vehicles,notifications,asOf:scenario.asOf,reviewing,assumptions:scenario.fixture?.assumptions||[]});
    if(scene&&sim){const s=sim.getState();scene.update(snapshot(s.timeSeconds,s.paused));}
  }
  function focusChapter(){if(intro){scene?.setFocus('TRK-208');scene?.setFollow(follow);}else if(!follow)scene?.setFocus(chapterSites[stage]);}
  function focusStoryText(){const title=intro?$('#intro-panel h1'):$('#chapter-title');const side=root.querySelector('aside');if(side)side.scrollTop=0;title?.setAttribute?.('tabindex','-1');title?.focus?.({preventScroll:true});if(matchMedia('(max-width: 900px)').matches)(intro?$('#intro-panel'):$('#story-content')).scrollIntoView?.({block:'start',behavior:'auto'});}
  function showIntro(){intro=true;stage=0;mode='then';selectedVehicleId='TRK-208';follow=true;manualCameraUsed=false;initialCameraHandled=true;render();scene?.resize();scene?.setFollow(true);scene?.setView(view,{focusId:selectedVehicleId});focusStoryText();}
  function setChapter(next){if(next<0||next>=chapters.length){showIntro();return;}intro=false;stage=next;selectedVehicleId='TRK-104';follow=false;if(stage!==4)mode='then';scene?.setFollow(false);render();focusChapter();focusStoryText();}
  function focusFacility(id){manualCameraUsed=true;follow=false;$('#follow').setAttribute('aria-pressed','false');scene?.setFollow(false);scene?.setFocus(id);}
  function selectEntity(id){if(['oict','centerpoint','depot'].includes(id)){focusFacility(id);return;}selectVehicle(id);}
  function selectVehicle(id){if(!['TRK-104','TRK-208'].includes(id))return;selectedVehicleId=id;scene?.setFocus(id);render();}
  async function handleAction(action){
    if(disposed||!ready)return;
    try{
      if(action.type==='select-vehicle'){selectVehicle(action.vehicleId);return;}
      if(action.type==='review-imports'){
        if(reviewing)return;
        reviewing=true;const request=++reviewSequence;const reviewedScenario=scenario;const reviewedVehicle=selectedVehicleId;render();
        const result=await reviewFixture({domain,scenario:reviewedScenario,vehicleId:reviewedVehicle});
        if(disposed||request!==reviewSequence||scenario!==reviewedScenario)return;
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
    on($('#start-story'),'click',()=>setChapter(0));
    $$('[data-mode]').forEach(b=>on(b,'click',()=>{mode=b.dataset.mode;render();}));
    on($('#previous-chapter'),'click',()=>setChapter(stage-1));
    on($('#next-chapter'),'click',()=>setChapter(stage+1));
    $$('[data-view]').forEach(b=>on(b,'click',()=>{manualCameraUsed=true;view=b.dataset.view;$$('[data-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));scene?.setView(view);}));
    $$('[data-focus]').forEach(b=>on(b,'click',()=>focusFacility(b.dataset.focus)));
    $$('[data-vehicle]').forEach(b=>on(b,'click',()=>selectVehicle(b.dataset.vehicle)));
    on($('#overview'),'click',()=>focusFacility(null));
    on($('#world'),'pointerdown',()=>{manualCameraUsed=true;if(intro&&follow){follow=false;scene?.setFollow(false);$('#follow').setAttribute('aria-pressed','false');}});
    on($('#world'),'wheel',event=>{manualCameraUsed=true;forwardSceneLabelWheel(event,$('#world .maplibregl-canvas-container'));},{passive:false});
    on($('#follow'),'click',()=>{manualCameraUsed=true;follow=!follow;$('#follow').setAttribute('aria-pressed',String(follow));scene?.setFollow(follow);if(follow)scene?.setFocus(selectedVehicleId);});
    on($('#pause'),'click',()=>{if(!sim)return;const paused=!sim.getState().paused;sim.setPaused(paused);$('#pause').textContent=paused?'▶ Play':'Ⅱ Pause';$('#run-status').textContent=paused?'Scene paused':'Scene running';render();});
    on($('#reset'),'click',()=>{
      if(!domain)return;
      scenario=domain.createScenario({authorityApplied:false});evaluate();intro=true;stage=0;
      reviewSequence++;reviewing=false;review=null;notifications=[];commandSequence=0;
      selectedVehicleId='TRK-208';mode='then';view='iso';follow=true;scene?.setFollow(false);
      manualCameraUsed=false;initialCameraHandled=true;
      $$('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));$('#follow').setAttribute('aria-pressed','true');
      sim?.reset();const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;sim?.setPaused(reduce);
      $('#pause').textContent=reduce?'▶ Play':'Ⅱ Pause';$('#run-status').textContent=reduce?'Scene paused · reduced motion':'Scene running';
      feedback('Demo reset.');render();scene?.resize();scene?.setFollow(true);scene?.setView(view,{focusId:selectedVehicleId});focusStoryText();
    });
    const about=visible=>{$('#about-panel').hidden=!visible;$('#about-toggle').setAttribute('aria-expanded',String(visible));};
    on($('#about-toggle'),'click',()=>about($('#about-panel').hidden));
    on($('#about-close'),'click',()=>about(false));
    on(doc,'keydown',event=>{if(event.key==='Escape')about(false);});
  }
  function updateMetrics(time){
    if(time-lastMetricUpdate<2000)return;lastMetricUpdate=time;
    const m=scene?.getMetrics?.();if(!m)return;
    const fps=m.fps??m.averageFps??m.fpsAverage;
    $('#performance').textContent=Number.isFinite(fps)?`${Math.round(fps)} RAF/s · p95 ${Math.round(m.p95Ms||0)} ms · GPU target unverified`:(m.renderer||m.mode||'Browser scene')+' · hardware performance unverified';
  }
  async function main(){
    bind();render();
    try{domain=await import('../domain/readings/index.js');if(disposed)return;scenario=domain.createScenario({authorityApplied:false});evaluate();}
    catch(error){if(disposed)return;feedback(`The source-policy module could not load: ${error.message}`);if($('#scene-loading'))$('#scene-loading').textContent='The reading controls could not load. Please reload the demo.';throw error;}
    let createPanel=createFallbackPanel;
    try{const module=await import('../ui/provenance/index.js');if(disposed)return;if(typeof module.createProvenancePanel==='function')createPanel=module.createProvenancePanel;}catch{/* The app-owned panel is a complete functional fallback during integration. */}
    try{panel=createPanel({container:$('#provenance'),onAction:handleAction,theme});}
    catch(error){console.warn('Provenance panel failed; using built-in controls',error.message);panel=createFallbackPanel({container:$('#provenance'),onAction:handleAction,theme});}
    try{
      const {createFleetScene}=await import('../render/core/index.js');if(disposed)return;
      scene=createFleetScene({container:$('#world'),onSelect:selectEntity,onStatus(status){if(disposed)return;$('#scene-notice').hidden=['ready','loading','fallback'].includes(status.kind);$('#scene-notice').textContent=status.message;}});
      scene.setView(view);scene.setFocus(selectedVehicleId);scene.setFollow(follow);initialCameraHandled=true;$('#scene-loading')?.remove();
    }catch(error){if(disposed)return;if($('#scene-loading'))$('#scene-loading').textContent=`Scene unavailable: ${error.message}. Source controls are still usable.`;console.error(error);}
    if(disposed)return;ready=true;render();
    sim=createSimulation({onTick({timeSeconds,paused}){scene?.update(snapshot(timeSeconds,paused));if(!initialCameraHandled&&scene?.getMetrics?.().ready){initialCameraHandled=true;if(!manualCameraUsed)focusChapter();}updateMetrics(performance.now());}});
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){sim.setPaused(true);$('#pause').textContent='▶ Play';$('#run-status').textContent='Scene paused · reduced motion';}
    on(window,'resize',()=>scene?.resize());
    let suspendedPauseState=null;
    on(window,'pagehide',event=>{
      if(event.persisted){suspendedPauseState=sim?.getState().paused??false;sim?.setPaused(true);}
      else{dispose();}
    });
    on(window,'pageshow',event=>{if(event.persisted&&suspendedPauseState!==null){sim?.setPaused(suspendedPauseState);suspendedPauseState=null;scene?.resize();render();}});
    debugAPI={getState:()=>({intro,mode,stage,selectedVehicleId,view,follow,scenario,evaluation,review,simulation:sim.getState()}),getMetrics:()=>scene?.getMetrics?.(),getSceneSnapshot:()=>{const current=sim.getState();return freezeScene(snapshot(current.timeSeconds,current.paused));},seekScene:timeSeconds=>{if(disposed)return;sim.seek(timeSeconds);render();},version:'fleet-demo/v1'};window.__fleetDemo=debugAPI;
  }
  const controller={ready:main().catch(error=>{dispose();throw error;}),dispose};
  mountedControllers.set(root,controller);
  return controller;
}
