import {createOriginalWorkflow,createOriginalWorkflowPreview} from '../ui/original-workflow/index.js';
import {buildConfigurationCommand} from './commands.js';
import {forwardSceneLabelWheel} from './wheel-navigation.js';
import {createSimulation} from '../core/simulation.js';
import {sampleCargoProcess,CARGO_PRESENTATION_OFFSET_SECONDS} from '../core/cargo-process.js';
import {sampleOrdinaryTraffic} from '../render/map/cargo-routes.js';
import {STORY_SCENES,STORY_DURATION,sampleStory,sceneTime,sampleMileage,sampleCost} from './story-timeline.js';
import {createStoryTextTransition} from './story-text-transition.js';
import {reviewFixture} from './review-adapter.js';
import {createProvenancePanel as createFallbackPanel} from './fallback-provenance.js';
const sampleProcess=(timeSeconds,paused)=>sampleCargoProcess(timeSeconds,{paused,presentationOffsetSeconds:CARGO_PRESENTATION_OFFSET_SECONDS,outgoingEnabled:false});
const mountedControllers=new WeakMap();
const freezeScene=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freezeScene);Object.freeze(value);}return value;};
const receiptMoney=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
/** One clock controls the story and renderer. Editorial overlays never mutate domain records. */
export function mountFleetDemo({root=document,theme={}}={}) {
  if(!root?.querySelector)throw new TypeError('Fleet demo requires a DOM root');
  mountedControllers.get(root)?.dispose();
  const doc=root.ownerDocument||document,cleanups=[];
  const $=selector=>root.matches?.(selector)?root:root.querySelector(selector),$$=selector=>[...root.querySelectorAll(selector)];
  let disposed=false,debugAPI,scenario,evaluation,domain,scene,panel,sim,originalWorkflow,originalPreview,ready=false;
  let story=sampleStory(0),stage=0,intro=true,mode='then',selectedVehicleId='TRK-104',view='iso',follow=true;
  let review=null,notifications=[],commandSequence=0,reviewing=false,reviewSequence=0;
  let exploring=false,activeDialog=null,dialogReturnFocus=null,visibilityPauseState=null;
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const sidebarTransition=createStoryTextTransition({element:$('#sidebar-story-body'),reducedMotion:()=>reducedMotion.matches});
  function on(target,type,listener,options){if(!target)throw new Error(`Missing Fleet control for ${type}`);target.addEventListener(type,listener,options);cleanups.push(()=>target.removeEventListener(type,listener,options));}
  function dispose(){if(disposed)return;disposed=true;ready=false;reviewSequence++;for(const remove of cleanups.splice(0))remove();sidebarTransition.dispose();originalWorkflow?.dispose();originalPreview?.dispose();sim?.dispose();scene?.dispose();panel?.dispose();if(window.__fleetDemo===debugAPI)delete window.__fleetDemo;if(mountedControllers.get(root)?.dispose===dispose)mountedControllers.delete(root);}
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
    $$('#pause').forEach(button=>{const label=paused?'Play story':'Pause story';button.setAttribute('aria-label',label);button.setAttribute('title',label);button.setAttribute('aria-pressed',String(!paused));button.disabled=!ready;});
    $$('[data-playback-icon]').forEach(icon=>{icon.hidden=(icon.dataset.playbackIcon==='play')!==paused;});
    $('#pause').disabled=!ready;$('#story-progress').disabled=!ready;
    $$('[data-view]').forEach(button=>{button.disabled=!ready;});
  }
  function applySceneCamera(){
    if(exploring)return;
    selectedVehicleId='TRK-104';follow=stage<=1;
    // The scene wrapper’s setFollow also sets focus. Do it before the atomic view command.
    scene?.setFollow(follow);
    if(stage===8){scene?.setView(view);scene?.setFocus(null);}
    else scene?.setView(view,{focusId:stage<=1?'TRK-104':'depot'});
  }
  function renderStory(){
    const workspace=$('.workspace');workspace.dataset.intro=String(intro);workspace.dataset.scene=story.id;workspace.dataset.exploring=String(exploring);
    const beat=story,beatIndex=stage,isIntro=intro;
    sidebarTransition.update(beat.id,()=>{
    $('#intro-panel').hidden=!isIntro;$('#story-content').hidden=isIntro;$('#project-info').hidden=!isIntro;
    $('#chapter-number').textContent=`SCENE ${String(beatIndex+1).padStart(2,'0')} / 09`;$('#chapter-number').hidden=beatIndex===6;
    $('#sidebar-scenes').hidden=![1,4,6,7].includes(beatIndex);
    $$('[data-story-sidebar]').forEach(element=>{element.hidden=element.dataset.storySidebar!==beat.id;});
    $('#chapter-title').textContent=beat.title;$('#chapter-copy').textContent=beat.copy;
    $('#chapter-title').hidden=[1,6,7].includes(beatIndex);$('#chapter-copy').hidden=[1,6,7].includes(beatIndex)||!beat.copy;
    $('#open-source-controls').hidden=beatIndex!==6;$('#run-story-review').hidden=beatIndex!==7;
    const takeaways={6:'<strong>90% faster</strong><p>Data issue resolution went from weeks to hours.</p>'};
    $('#chapter-takeaway').innerHTML=takeaways[beatIndex]||'';
    const body=$('#sidebar-story-body');if(body.dataset.scene!==beat.id){body.scrollTop=0;body.dataset.scene=beat.id;}
    });
    $('#previous-chapter').disabled=!ready||stage===0;$('#previous-chapter').hidden=stage===0;
    $('#next-chapter').disabled=!ready||stage===8;$('#next-chapter').hidden=stage===8;$('#next-chapter').setAttribute('aria-label','Next scene');
    $$('[data-story-overlay]').forEach(element=>{element.hidden=exploring||element.dataset.storyOverlay!==story.id;});
    renderPlayback();
  }
  function renderPresentation(){
    const clockTime=seconds=>`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
    $('#story-elapsed').textContent=clockTime(story.timeSeconds);$('#story-duration').textContent=clockTime(STORY_DURATION);
    $('#story-progress').style.backgroundImage=`linear-gradient(to right,#fff ${story.timeSeconds/STORY_DURATION*100}%,#ffffff40 ${story.timeSeconds/STORY_DURATION*100}%)`;
    $('#story-progress').value=String(story.timeSeconds);$('#story-progress').setAttribute('aria-valuetext',`Scene ${stage+1} of 9: ${story.label}, ${Math.round(story.progress*100)} percent`);
    if(stage===4){const mileage=sampleMileage(story.elapsedSeconds);$('#mileage-day').textContent=String(mileage.day);$('#mileage-current').textContent=mileage.current.toLocaleString('en-US');$('#mileage-value').textContent=mileage.display.toLocaleString('en-US');$('#mileage-alert').textContent=mileage.maintenanceDue?'Preventive maintenance appears due. Again.':mileage.atCurrent?'Current reading imported':'Stale reading imported again';$('#mileage-alert').dataset.due=String(mileage.maintenanceDue);}
    const cost=sampleCost(stage===5?story.progress:stage>5?1:0);
    if(stage===5){$('#cost-caption').textContent=cost.visits===1?'1 service':'2 services in one week';$('#cost-total').textContent=receiptMoney(cost.totalCost);$('#cost-duplicate').textContent=receiptMoney(cost.repeatCost);$$('[data-cost-visit]').forEach(item=>item.dataset.active=String(Number(item.dataset.costVisit)<=cost.visits));}

    // The miniature shares the story clock; 1.5× completes a repair and reset within this scene.
    if(stage===6)originalPreview?.render(story.elapsedSeconds*1.5,{paused:sim?.getState().paused??true,reducedMotion:reducedMotion.matches});
    if(stage===7){const active=Math.min(2,Math.floor((story.elapsedSeconds%9)/3));$$('[data-agent-step]').forEach(row=>row.dataset.active=String(Number(row.dataset.agentStep)<=active));}
  }
  function render(){
    renderStory();renderPresentation();
    const canonical=evaluation?.vehicles.find(v=>v.vehicleId===selectedVehicleId);
    $('#canonical-reading').textContent=canonical?.status==='resolved'?`${Math.round(canonical.valueKm/1.609344).toLocaleString('en-US')} mi`:'Unresolved';
    $('#canonical-source').textContent=canonical?.status==='resolved'?`Provider ${canonical.sourceId}`:'No usable reading from the chosen source';
    $('#mode-description').textContent=mode==='then'?'These controls choose one vehicle’s odometer source and exclude readings without deleting history.':'Review the flagged readings, then choose the source.';
    if(panel&&scenario)panel.update({mode,compact:true,showVehicleSelector:true,selectedVehicleId,readings:scenario.readings,policies:scenario.policies,exclusions:scenario.exclusions,decisions:evaluation.decisions,serviceHistory:scenario.serviceFacts||[],review:review?.vehicleId===selectedVehicleId?review:null,configurationVersion:scenario.configVersion,authorityStatus:canonical?.status||'unresolved',canonical,vehicles:scenario.vehicles,notifications,asOf:scenario.asOf,reviewing,assumptions:scenario.fixture?.assumptions||[]});
    if(scene&&sim){const current=sim.getState();scene.update(snapshot(current.timeSeconds,current.paused));}
  }
  function syncClock({timeSeconds,paused}){
    const next=sampleStory(timeSeconds),changed=next.index!==stage,completionChanged=next.complete!==story.complete;story=next;stage=next.index;intro=stage===0;
    if(changed){mode=stage===7?'today':'then';render();applySceneCamera();}
    if(completionChanged)renderPlayback();if(story.complete&&!paused&&!exploring)setPaused(true);
    renderPresentation();scene?.update(snapshot(timeSeconds,sim?.getState().paused??paused));
  }
  function focusStoryText(){sidebarTransition.afterCommit(()=>{const title=[1,6,7].includes(stage)?$(`[data-story-sidebar="${story.id}"] h2`):intro?$('#intro-panel h1'):$('#chapter-title');title?.setAttribute('tabindex','-1');title?.focus?.({preventScroll:true});});}

  function setChapter(index){
    if(!ready)return;
    closeDialog(false);exploring=false;setPaused(true);const target=Math.min(STORY_SCENES.length-1,Math.max(0,index));
    if(sim)sim.seek(sceneTime(target));else{story=sampleStory(sceneTime(target));stage=story.index;intro=stage===0;render();}
    render();applySceneCamera();focusStoryText();
  }
  function togglePlayback(){if(!sim)return;if(story.complete&&!exploring)sim.seek(0);setPaused(!sim.getState().paused);}
  function enterManualView(){setPaused(true);exploring=true;renderStory();}
  function focusFacility(id){enterManualView();follow=false;scene?.setFollow(false);scene?.setFocus(id);}
  function selectEntity(id){setPaused(true);if(['oict','centerpoint','depot'].includes(id)){focusFacility(id);return;}selectVehicle(id);}
  function selectVehicle(id){if(!['TRK-104','TRK-208'].includes(id))return;selectedVehicleId=id;scene?.setFocus(id);render();}
  function openDialog(id){
    setPaused(true);if(activeDialog)closeDialog(false);dialogReturnFocus=doc.activeElement;activeDialog=$(id);activeDialog.hidden=false;$('.workspace').dataset.dialogOpen='true';activeDialog.querySelector('button')?.focus();
  }
  function closeDialog(restore=true){if(!activeDialog)return;if(activeDialog===originalWorkflow?.element){originalWorkflow.close({restoreFocus:restore});return;}activeDialog.hidden=true;activeDialog=null;$('.workspace').dataset.dialogOpen='false';if(restore&&dialogReturnFocus?.isConnected)dialogReturnFocus.focus({preventScroll:true});dialogReturnFocus=null;}
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
    $('#source-dialog').hidden=true;$('.workspace').dataset.dialogOpen='false';
    $('#story-progress').max=String(STORY_DURATION);
    on($('#previous-chapter'),'click',()=>setChapter(stage-1));on($('#next-chapter'),'click',()=>setChapter(stage+1));
    on($('#story-progress'),'input',event=>{if(!ready)return;exploring=false;setPaused(true);sim?.seek(Number(event.target.value));render();applySceneCamera();});
    on($('#pause'),'click',togglePlayback);
    on($('#open-original-workflow'),'click',()=>{if(activeDialog)closeDialog(false);originalWorkflow?.open({returnFocus:$('#open-original-workflow')});});
    on($('#open-source-controls'),'click',()=>{mode='then';openDialog('#source-dialog');render();});
    on($('#run-story-review'),'click',()=>{mode='today';openDialog('#source-dialog');render();void handleAction({type:'review-imports'});});
    on($('#source-close'),'click',()=>closeDialog());
    $$('[data-view]').forEach(button=>on(button,'click',()=>{enterManualView();view=button.dataset.view;$$('[data-view]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));scene?.setView(view);}));
    on($('#world'),'pointerdown',()=>{enterManualView();follow=false;scene?.setFollow(false);});
    on($('#world'),'wheel',event=>{enterManualView();forwardSceneLabelWheel(event,$('#world .maplibregl-canvas-container'));},{passive:false});
    on(doc,'keydown',event=>{
      if(activeDialog){
        if(event.key==='Escape'){event.preventDefault();closeDialog();}
        if(event.key==='Tab'){const focusable=[...activeDialog.querySelectorAll('button:not(:disabled),[href],input,select,summary,[tabindex="0"]')].filter(element=>!element.hidden&&element.getClientRects().length);const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&doc.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first?.focus();}}
        return;
      }
      if(event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.target?.closest?.('input,select,textarea,[contenteditable="true"]'))return;
      if(event.key==='ArrowRight'){event.preventDefault();setChapter(stage+1);}else if(event.key==='ArrowLeft'){event.preventDefault();setChapter(stage-1);}else if(event.code==='Space'&&!event.target?.closest?.('button,a,summary')){event.preventDefault();togglePlayback();}
    });
    on(reducedMotion,'change',event=>{if(event.matches){setPaused(true);sidebarTransition.finish();}});
    on(doc,'visibilitychange',()=>{if(doc.hidden){visibilityPauseState=sim?.getState().paused??true;setPaused(true);}else if(visibilityPauseState!==null){setPaused(visibilityPauseState);visibilityPauseState=null;}});
  }
  async function main(){
    originalPreview=createOriginalWorkflowPreview({container:$('#original-workflow-preview')});
    originalWorkflow=createOriginalWorkflow({container:$('.workspace'),reducedMotion,onOpen(){setPaused(true);activeDialog=originalWorkflow.element;dialogReturnFocus=null;$('.workspace').dataset.dialogOpen='true';},onClose(){activeDialog=null;$('.workspace').dataset.dialogOpen='false';if(!disposed)setPaused(true);}});
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
    sim=createSimulation({onTick:syncClock});sim.setPaused(true);render();
    on(window,'resize',()=>{scene?.resize();});
    let suspendedPauseState=null;
    on(window,'pagehide',event=>{if(event.persisted){suspendedPauseState=sim?.getState().paused??true;setPaused(true);}else dispose();});
    on(window,'pageshow',event=>{if(event.persisted&&suspendedPauseState!==null){setPaused(suspendedPauseState);suspendedPauseState=null;scene?.resize();render();}});
    debugAPI={
      getState:()=>({intro,mode,stage,exploring,textTransition:sidebarTransition.getState(),story:{...story,paused:sim.getState().paused},selectedVehicleId,view,follow,scenario,evaluation,review,simulation:sim.getState(),cargoProcess:sampleProcess(sim.getState().timeSeconds,sim.getState().paused)}),
      getMetrics:()=>scene?.getMetrics?.(),projectScenePoint:position=>scene?.projectPoint?.(position)??null,
      getSceneSnapshot:()=>{const current=sim.getState();return freezeScene(snapshot(current.timeSeconds,current.paused));},
      seekScene:timeSeconds=>{if(disposed)return;sim.seek(timeSeconds);render();},seekStory:(index,progress=0)=>{if(disposed)return;setPaused(true);sim.seek(sceneTime(index,progress));render();},
      version:'fleet-demo/nine-scene-v1'
    };window.__fleetDemo=debugAPI;
  }
  const controller={ready:main().catch(error=>{dispose();throw error;}),dispose};mountedControllers.set(root,controller);return controller;
}
