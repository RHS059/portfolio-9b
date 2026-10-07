import {buildConfigurationCommand} from './commands.js';
import {forwardSceneLabelWheel} from './wheel-navigation.js';
import {createSimulation} from '../core/simulation.js';
import {sampleCargoProcess,CARGO_PRESENTATION_OFFSET_SECONDS} from '../core/cargo-process.js';
import {sampleOrdinaryTraffic} from '../render/map/cargo-routes.js';
import {STORY_SCENES,STORY_DURATION,sampleStory,sceneTime,sampleMileage,sampleCost} from './story-timeline.js';
import {reviewFixture} from './review-adapter.js';
import {createProvenancePanel as createFallbackPanel} from './fallback-provenance.js';
const sampleProcess=(timeSeconds,paused)=>sampleCargoProcess(timeSeconds,{paused,presentationOffsetSeconds:CARGO_PRESENTATION_OFFSET_SECONDS,outgoingEnabled:false});
const mountedControllers=new WeakMap();
const freezeScene=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freezeScene);Object.freeze(value);}return value;};
const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);
/** One clock controls the story and renderer. Editorial overlays never mutate domain records. */
export function mountFleetDemo({root=document,theme={}}={}) {
  if(!root?.querySelector)throw new TypeError('Fleet demo requires a DOM root');
  mountedControllers.get(root)?.dispose();
  const doc=root.ownerDocument||document,cleanups=[];
  const $=selector=>root.matches?.(selector)?root:root.querySelector(selector),$$=selector=>[...root.querySelectorAll(selector)];
  let disposed=false,debugAPI,scenario,evaluation,domain,scene,panel,sim,ready=false;
  let story=sampleStory(0),stage=0,intro=true,mode='then',selectedVehicleId='TRK-104',view='iso',follow=true;
  let review=null,notifications=[],commandSequence=0,reviewing=false,reviewSequence=0,lastMetricUpdate=0;
  let exploring=false,serviceCost=null,activeDialog=null,dialogReturnFocus=null,visibilityPauseState=null;
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  function on(target,type,listener,options){if(!target)throw new Error(`Missing Fleet control for ${type}`);target.addEventListener(type,listener,options);cleanups.push(()=>target.removeEventListener(type,listener,options));}
  function dispose(){if(disposed)return;disposed=true;ready=false;reviewSequence++;for(const remove of cleanups.splice(0))remove();sim?.dispose();scene?.dispose();panel?.dispose();if(window.__fleetDemo===debugAPI)delete window.__fleetDemo;if(mountedControllers.get(root)?.dispose===dispose)mountedControllers.delete(root);}
  const feedback=text=>{$('#app-feedback').textContent=text;};
  function snapshot(timeSeconds=0,paused=false){
    const beat=sampleStory(timeSeconds),cargoProcess=sampleProcess(timeSeconds,paused);
    const resolved=evaluation?.vehicles.find(v=>v.vehicleId==='TRK-104')?.status==='resolved';
    // The same illustrative truck is followed on an existing road, then placed in the shop.
    // These are presentation poses, not telemetry, schedules or new completed-service facts.
    const truckPose=beat.index<2?{...sampleOrdinaryTraffic(timeSeconds,0,{presentationOffsetSeconds:CARGO_PRESENTATION_OFFSET_SECONDS}),status:'On the road'}:{routeId:'depot-bay',progress:0,status:resolved?'Ready for work':'In the workshop'};
    return {timeSeconds,paused,cargoProcess,factoryAssembly:cargoProcess.factoryAssembly,selectedId:selectedVehicleId,stage:beat.index,story:{id:beat.id,index:beat.index,progress:beat.progress,elapsedSeconds:beat.elapsedSeconds,duration:beat.duration},issueActive:beat.index>=2&&!resolved,authorityResolved:!!resolved,
      vehicles:[...cargoProcess.trucks,...cargoProcess.outboundVehicles,{...truckPose,id:'TRK-104',model:'truck'},{...(beat.index<2?{routeId:'depot-bay',progress:0,status:'Parked'}:sampleOrdinaryTraffic(timeSeconds,0,{presentationOffsetSeconds:CARGO_PRESENTATION_OFFSET_SECONDS})),id:'TRK-208',model:'truck'}],
      facilities:[{id:'oict',label:'OICT container terminal'},{id:'centerpoint',label:'Drone factory'},{id:'depot',label:'Fleet workshop'}]};
  }
  function evaluate(){evaluation=domain.replayReadings(scenario,{asOf:scenario.asOf});}
  function setPaused(paused){sim?.setPaused(paused);renderPlayback();}
  function renderPlayback(){
    const paused=sim?.getState().paused??true;$('.workspace').dataset.playing=String(!paused);
    $('#mobile-pause').textContent=paused?'▶ Play story':'Ⅱ Pause story';$('#mobile-pause').setAttribute('aria-label',paused?'Play story':'Pause story');$('#mobile-pause').setAttribute('aria-pressed',String(!paused));$('#mobile-pause').disabled=!ready;
    $('#pause').textContent=paused?'▶ Play':'Ⅱ Pause';$('#pause').setAttribute('aria-label',paused?'Play story':'Pause story');$('#pause').setAttribute('aria-pressed',String(!paused));
    $('#run-status').textContent=paused?'Story and scene paused':'Story and scene playing';
    $('#playback-status').textContent=exploring?(paused?'Exploring scene · paused':'Exploring scene · playing'):story.complete?'End of story':paused?(reducedMotion.matches?'Paused · reduced motion':'Paused · explore at your pace'):'Autoplay · pause anytime';
  }
  function applySceneCamera(){
    if(exploring)return;
    selectedVehicleId='TRK-104';follow=stage<=1;
    // The scene wrapper’s setFollow also sets focus. Do it before the atomic view command.
    scene?.setFollow(follow);
    if(stage===8){scene?.setView(view,{animate:false});scene?.setFocus(null);}
    else scene?.setView(view,{focusId:stage<=1?'TRK-104':'depot'});
    $('#follow').setAttribute('aria-pressed',String(follow));
  }
  function renderStory(){
    const workspace=$('.workspace');workspace.dataset.intro=String(intro);workspace.dataset.scene=story.id;workspace.dataset.exploring=String(exploring);
    $('#explore-scene').setAttribute('aria-pressed',String(exploring));$('#explore-scene').textContent=exploring?'Return to story':'Explore scene';$('#explore-controls').hidden=!exploring;
    $('#intro-panel').hidden=!intro;$('#story-content').hidden=intro;$('#project-info').hidden=!intro;
    $('#chapter-number').textContent=`SCENE ${String(stage+1).padStart(2,'0')} / 09`;
    $('#chapter-title').textContent=story.title;$('#chapter-copy').textContent=story.copy;
    $('#story-position').textContent=`${String(stage+1).padStart(2,'0')} / 09 · ${story.label}`;
    $('#previous-chapter').disabled=stage===0;
    $('#next-chapter').textContent=stage===8?'Replay ↺':'Next →';$('#next-chapter').setAttribute('aria-label',stage===8?'Replay story':'Next scene');
    $('#open-source-controls').hidden=stage!==6;$('#run-story-review').hidden=stage!==7;$('#story-replay').hidden=stage!==8;
    const takeaways={1:'Fuel data and odometer data support different parts of fleet operations.',2:'A maintenance alert had become a real shop visit.',3:'A provider switch needs an explicit handover.',4:'Import time isn’t the same as observation time.',5:'The cost extends beyond the invoice.',6:'<strong>90% faster</strong><p>Data issue resolution improved from weeks to hours. This measures issue resolution, not maintenance savings.</p>',7:'Advisory agents. Human approval. An intact audit trail.',8:'Source selection is a product decision, with operational consequences.'};
    $('#chapter-takeaway').innerHTML=takeaways[stage]||'';
    $$('[data-story-overlay]').forEach(element=>{element.hidden=exploring||element.dataset.storyOverlay!==story.id;});
    $$('[data-scene-index]').forEach(button=>{const index=Number(button.dataset.sceneIndex);button.setAttribute('aria-current',index===stage?'step':'false');button.dataset.complete=String(index<stage);});
    renderPlayback();
  }
  function renderPresentation(){
    $('#story-progress').value=String(story.timeSeconds);$('#story-progress').setAttribute('aria-valuetext',`Scene ${stage+1} of 9: ${story.label}, ${Math.round(story.progress*100)} percent`);
    $('#selected-asset').textContent=selectedVehicleId;$('#asset-role').textContent=stage<2?'On the road · illustrative':stage<6?'Repeat maintenance · illustrative':'Source decision · illustrative';
    if(stage===4){const mileage=sampleMileage(story.elapsedSeconds);$('#mileage-day').textContent=String(mileage.day);$('#mileage-current').textContent=mileage.current.toLocaleString('en-US');$('#mileage-value').textContent=mileage.display.toLocaleString('en-US');$('#mileage-alert').textContent=mileage.maintenanceDue?'Preventive maintenance appears due. Again.':mileage.atCurrent?'Current reading imported':'Stale reading imported again';$('#mileage-alert').dataset.due=String(mileage.maintenanceDue);}
    const cost=sampleCost(stage===5?story.progress:stage>5?1:0,serviceCost);
    const visits=stage<2?0:stage<5?2:cost.visits,repeatVisits=stage<2?0:stage<5?1:cost.repeatVisits;
    $('#service-visits').textContent=stage<2?'—':String(visits);
    $('#service-summary').textContent=stage<2?'Following the same truck':stage<5?'Two visits in one week':`${repeatVisits} repeat ${repeatVisits===1?'visit':'visits'} · 14-day illustration`;
    $('#maintenance-cost').textContent=stage<5?'Amount not provided':cost.repeatCost===null?`${cost.repeatVisits} × service cost`:money(cost.repeatCost);
    $('#maintenance-cost-note').textContent=stage<5?'Labor, parts and downtime':cost.repeatCost===null?'Enter an illustrative cost above':'Illustrative repeat-service cost';
    if(stage===5){$('#cost-caption').textContent=`Day ${cost.day} of 14 · ${cost.visits} ${cost.visits===1?'service':'services'} · ${cost.repeatVisits} repeated`;$$('[data-cost-day]').forEach(cell=>cell.dataset.past=String(Number(cell.dataset.costDay)<=cost.day));}
    if(stage===7){const active=Math.min(2,Math.floor((story.elapsedSeconds%9)/3));$$('[data-agent-step]').forEach(row=>row.dataset.active=String(Number(row.dataset.agentStep)<=active));}
  }
  function render(){
    renderStory();renderPresentation();
    const canonical=evaluation?.vehicles.find(v=>v.vehicleId===selectedVehicleId);
    $('#canonical-reading').textContent=canonical?.status==='resolved'?`${Math.round(canonical.valueKm/1.609344).toLocaleString('en-US')} mi`:'Unresolved';
    $('#canonical-source').textContent=canonical?.status==='resolved'?`Provider ${canonical.sourceId}`:'No usable reading from the chosen source';
    $('#mode-description').textContent=mode==='then'?'These controls choose one vehicle’s odometer source and exclude readings without deleting history.':'This deterministic example review is advisory. A person must approve any source change; no live model is running.';
    $('#integrity-count').textContent=scenario?`${scenario.readings.length} readings kept`:'Raw records kept';
    if(panel&&scenario)panel.update({mode,compact:true,showVehicleSelector:true,selectedVehicleId,readings:scenario.readings,policies:scenario.policies,exclusions:scenario.exclusions,decisions:evaluation.decisions,serviceHistory:scenario.serviceFacts||[],review:review?.vehicleId===selectedVehicleId?review:null,configurationVersion:scenario.configVersion,authorityStatus:canonical?.status||'unresolved',canonical,vehicles:scenario.vehicles,notifications,asOf:scenario.asOf,reviewing,assumptions:scenario.fixture?.assumptions||[]});
    if(scene&&sim){const current=sim.getState();scene.update(snapshot(current.timeSeconds,current.paused));}
  }
  function syncClock({timeSeconds,paused}){
    const next=sampleStory(timeSeconds),changed=next.index!==stage,completionChanged=next.complete!==story.complete;story=next;stage=next.index;intro=stage===0;
    if(changed){mode=stage===7?'today':'then';render();applySceneCamera();}
    if(completionChanged)renderPlayback();if(story.complete&&!paused&&!exploring)setPaused(true);
    renderPresentation();scene?.update(snapshot(timeSeconds,sim?.getState().paused??paused));updateMetrics(performance.now());
  }
  function focusStoryText(){const title=intro?$('#intro-panel h1'):$('#chapter-title');title?.setAttribute('tabindex','-1');title?.focus?.({preventScroll:true});}
  function setChapter(index){
    closeDialog(false);exploring=false;setPaused(true);const target=index>=STORY_SCENES.length?0:Math.max(0,index);
    if(sim)sim.seek(sceneTime(target));else{story=sampleStory(sceneTime(target));stage=story.index;intro=stage===0;render();}
    render();applySceneCamera();focusStoryText();
  }
  function togglePlayback(){if(!sim)return;if(story.complete&&!exploring)sim.seek(0);setPaused(!sim.getState().paused);}
  function replay(){
    closeDialog(false);exploring=false;if(domain){scenario=domain.createScenario({authorityApplied:false});evaluate();}
    reviewSequence++;reviewing=false;review=null;notifications=[];commandSequence=0;selectedVehicleId='TRK-104';mode='then';view='iso';follow=true;serviceCost=null;$('#service-unit-cost').value='';
    $$('[data-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===view)));
    sim?.seek(0);setPaused(reducedMotion.matches);render();applySceneCamera();scene?.resize();focusStoryText();
  }
  function focusFacility(id){follow=false;scene?.setFollow(false);scene?.setFocus(id);$('#follow').setAttribute('aria-pressed','false');}
  function selectEntity(id){setPaused(true);if(['oict','centerpoint','depot'].includes(id)){focusFacility(id);return;}selectVehicle(id);}
  function selectVehicle(id){if(!['TRK-104','TRK-208'].includes(id))return;selectedVehicleId=id;scene?.setFocus(id);render();}
  function openDialog(id){
    setPaused(true);if(activeDialog)closeDialog(false);dialogReturnFocus=doc.activeElement;activeDialog=$(id);activeDialog.hidden=false;$('.workspace').dataset.dialogOpen='true';$('#about-toggle').setAttribute('aria-expanded',String(id==='#about-panel'));activeDialog.querySelector('button')?.focus();
  }
  function closeDialog(restore=true){if(!activeDialog)return;activeDialog.hidden=true;activeDialog=null;$('.workspace').dataset.dialogOpen='false';$('#about-toggle').setAttribute('aria-expanded','false');if(restore&&dialogReturnFocus?.isConnected)dialogReturnFocus.focus({preventScroll:true});dialogReturnFocus=null;}
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
    $('#source-dialog').hidden=true;$('#about-panel').hidden=true;$('.workspace').dataset.dialogOpen='false';
    // One mobile control stays reachable until the full playback control is on screen.
    if(typeof IntersectionObserver==='function'){
      const observer=new IntersectionObserver(entries=>{if(disposed)return;const entry=entries.find(item=>item.target===$('#pause'));if(entry)$('.workspace').dataset.playbackVisible=String(entry.isIntersecting&&entry.intersectionRatio>=.5);},{threshold:[0,.5,1]});
      observer.observe($('#pause'));cleanups.push(()=>observer.disconnect());
    }
    $('#scene-steps').innerHTML=STORY_SCENES.map(item=>`<button type="button" data-scene-index="${item.index}" aria-label="Scene ${item.index+1}: ${item.label}" title="${item.label}">${String(item.index+1).padStart(2,'0')}</button>`).join('');
    $('#cost-days').innerHTML=Array.from({length:14},(_,index)=>`<span data-cost-day="${index+1}" data-visit="${[1,4,8,12].includes(index+1)}">${index+1}</span>`).join('');
    $('#story-progress').max=String(STORY_DURATION);
    on($('#start-story'),'click',()=>setChapter(1));on($('#previous-chapter'),'click',()=>setChapter(stage-1));on($('#next-chapter'),'click',()=>setChapter(stage+1));
    $$('[data-scene-index]').forEach(button=>on(button,'click',()=>setChapter(Number(button.dataset.sceneIndex))));
    on($('#story-progress'),'input',event=>{setPaused(true);sim?.seek(Number(event.target.value));});
    on($('#explore-scene'),'click',()=>{closeDialog(false);setPaused(true);exploring=!exploring;render();if(!exploring)applySceneCamera();});
    on($('#mobile-pause'),'click',togglePlayback);on($('#pause'),'click',togglePlayback);on($('#reset'),'click',replay);on($('#story-replay'),'click',replay);
    on($('#service-unit-cost'),'focus',()=>setPaused(true));on($('#service-unit-cost'),'input',event=>{const value=event.target.value;serviceCost=value===''?null:Math.max(0,Math.min(100000,Number(value)));renderPresentation();});
    on($('#open-source-controls'),'click',()=>{mode='then';openDialog('#source-dialog');render();});
    on($('#run-story-review'),'click',()=>{mode='today';openDialog('#source-dialog');render();void handleAction({type:'review-imports'});});
    on($('#source-close'),'click',()=>closeDialog());
    on($('#about-toggle'),'click',()=>activeDialog===$('#about-panel')?closeDialog():openDialog('#about-panel'));on($('#about-close'),'click',()=>closeDialog());
    $$('[data-view]').forEach(button=>on(button,'click',()=>{view=button.dataset.view;$$('[data-view]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));scene?.setView(view);}));
    $$('[data-focus]').forEach(button=>on(button,'click',()=>focusFacility(button.dataset.focus)));
    on($('#overview'),'click',()=>focusFacility(null));
    on($('#follow'),'click',()=>{follow=!follow;scene?.setFollow(follow);if(follow)scene?.setFocus(selectedVehicleId);$('#follow').setAttribute('aria-pressed',String(follow));});
    on($('#world'),'pointerdown',()=>{setPaused(true);follow=false;scene?.setFollow(false);$('#follow').setAttribute('aria-pressed','false');});
    on($('#world'),'wheel',event=>{setPaused(true);forwardSceneLabelWheel(event,$('#world .maplibregl-canvas-container'));},{passive:false});
    on(doc,'keydown',event=>{
      if(activeDialog){
        if(event.key==='Escape'){event.preventDefault();closeDialog();}
        if(event.key==='Tab'){const focusable=[...activeDialog.querySelectorAll('button:not(:disabled),[href],input,select,summary,[tabindex="0"]')].filter(element=>!element.hidden&&element.getClientRects().length);const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&doc.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first?.focus();}}
        return;
      }
      if(event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.target?.closest?.('input,select,textarea,[contenteditable="true"]'))return;
      if(event.key==='ArrowRight'){event.preventDefault();setChapter(stage+1);}else if(event.key==='ArrowLeft'){event.preventDefault();setChapter(stage-1);}else if(event.code==='Space'&&!event.target?.closest?.('button,a,summary')){event.preventDefault();togglePlayback();}
    });
    on(reducedMotion,'change',event=>{if(event.matches)setPaused(true);});
    on(doc,'visibilitychange',()=>{if(doc.hidden){visibilityPauseState=sim?.getState().paused??true;setPaused(true);}else if(visibilityPauseState!==null){setPaused(visibilityPauseState);visibilityPauseState=null;}});
  }
  function updateMetrics(time){if(time-lastMetricUpdate<2000)return;lastMetricUpdate=time;const metrics=scene?.getMetrics?.();if(!metrics)return;const fps=metrics.fps??metrics.averageFps??metrics.fpsAverage;$('#performance').textContent=Number.isFinite(fps)?`${Math.round(fps)} RAF/s · p95 ${Math.round(metrics.p95Ms||0)} ms · GPU target unverified`:(metrics.renderer||metrics.mode||'Browser scene')+' · hardware performance unverified';}
  async function main(){
    bind();render();
    try{domain=await import('../domain/readings/index.js');if(disposed)return;scenario=domain.createScenario({authorityApplied:false});evaluate();}
    catch(error){if(disposed)return;feedback(`The source-policy module could not load: ${error.message}`);throw error;}
    let createPanel=createFallbackPanel;
    try{const module=await import('../ui/provenance/index.js');if(disposed)return;if(typeof module.createProvenancePanel==='function')createPanel=module.createProvenancePanel;}catch{/* Built-in fallback retains functional controls. */}
    try{panel=createPanel({container:$('#provenance'),onAction:handleAction,theme});}catch{panel=createFallbackPanel({container:$('#provenance'),onAction:handleAction,theme});}
    try{
      const {createFleetScene}=await import('../render/core/index.js');if(disposed)return;
      scene=createFleetScene({container:$('#world'),onSelect:selectEntity,onStatus(status){if(disposed)return;$('#scene-notice').hidden=['ready','loading','fallback'].includes(status.kind);$('#scene-notice').textContent=status.message;}});
      applySceneCamera();$('#scene-loading')?.remove();
    }catch(error){if(disposed)return;if($('#scene-loading'))$('#scene-loading').textContent=`Scene unavailable: ${error.message}. Story playback and source controls are still usable.`;}
    if(disposed)return;ready=true;
    sim=createSimulation({onTick:syncClock});sim.setPaused(reducedMotion.matches);render();
    on(window,'resize',()=>scene?.resize());
    let suspendedPauseState=null;
    on(window,'pagehide',event=>{if(event.persisted){suspendedPauseState=sim?.getState().paused??true;setPaused(true);}else dispose();});
    on(window,'pageshow',event=>{if(event.persisted&&suspendedPauseState!==null){setPaused(suspendedPauseState);suspendedPauseState=null;scene?.resize();render();}});
    debugAPI={
      getState:()=>({intro,mode,stage,exploring,story:{...story,paused:sim.getState().paused},selectedVehicleId,view,follow,scenario,evaluation,review,simulation:sim.getState(),cargoProcess:sampleProcess(sim.getState().timeSeconds,sim.getState().paused)}),
      getMetrics:()=>scene?.getMetrics?.(),projectScenePoint:position=>scene?.projectPoint?.(position)??null,
      getSceneSnapshot:()=>{const current=sim.getState();return freezeScene(snapshot(current.timeSeconds,current.paused));},
      seekScene:timeSeconds=>{if(disposed)return;sim.seek(timeSeconds);render();},seekStory:(index,progress=0)=>{if(disposed)return;setPaused(true);sim.seek(sceneTime(index,progress));render();},
      version:'fleet-demo/nine-scene-v1'
    };window.__fleetDemo=debugAPI;
  }
  const controller={ready:main().catch(error=>{dispose();throw error;}),dispose};mountedControllers.set(root,controller);return controller;
}
