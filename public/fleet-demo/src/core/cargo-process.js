/**
 * Deterministic, illustrative material flow. There is no timer, randomness, mutable
 * domain input, reading, maintenance decision or service-history dependency here.
 * Coordinates belong to the renderer: every material handoff uses a named anchor.
 */
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => {const t=clamp(value);return t*t*(3-2*t);};
const pad = value => String(value).padStart(2, '0');
export const CARGO_PROCESS_VERSION = 'illustrative-cargo/v1';
export const CARGO_PROCESS_LIMITS = freeze({shipments:4, ships:2, trucks:4, cranes:4, forklifts:4, floorRobots:4, cells:4, products:4, qaStations:1, dispatchStaging:2, outboundVehicles:2, outboundCapacity:1, events:128});

let boundary = 0;
export const CARGO_STAGES = freeze([
  ['ship',6], ['ship-unloading',10], ['truck-loading',6], ['truck-loaded',4],
  ['road-transit',32], ['bay-arrival',4], ['forklift-unloading',10], ['storage',6],
  ['robot-transport',10], ['box-opening',6], ['drone-assembly',24], ['complete',10],
].map(([id, duration]) => {const start = boundary; boundary += duration; return {id, start, end:boundary, duration};}));
export const CARGO_CYCLE_SECONDS = boundary;
/** Optional populated presentation. Reset to app time zero reproduces this frame. */
export const CARGO_PRESENTATION_OFFSET_SECONDS = 102.5;
const phases = Object.fromEntries(CARGO_STAGES.map(stage => [stage.id, stage]));
/** Product times share a slot's incoming clock, continuing beyond its kit rollover. */
export const PRODUCT_STAGES = freeze([
  ['assembling',94,118], ['ready',118,122], ['qa-transport',122,130], ['qa-testing',130,138],
  ['dispatch-transport',138,146], ['dispatch-staged',146,152], ['outbound-loading',152,156],
  ['outbound-loaded',156,158], ['outbound-transit',158,178], ['fleet-received',178,222],
].map(([id,start,end])=>({id,start,end,duration:end-start})));
export const OUTBOUND_FLEET_ID = 'outgoing-fleet';
const cellIds = ['frame-jig','motor-install','propeller-install','final-assembly'];
export const CARGO_SLOTS = freeze(cellIds.map((cellId, index) => {
  const n = pad(index + 1), slotId = `CARGO-${n}`, shipId = `SHIP-${pad(1 + Math.floor(index / 2))}`;
  const outboundVehicleId=`OUTBOUND-${501+index%2}`,outboundTrailerId=`TRAILER-${501+index%2}`,dispatchBayId=`factory-dispatch-${pad(index%2+1)}`,dispatchStagingId=`DISPATCH-${pad(index%2+1)}`;
  const truckId = `CARGO-${401 + index}`, trailerId = `TRAILER-${401 + index}`, craneId = `CRANE-${n}`, bayId = `factory-receiving-${pad(index % 2 + 1)}`;
  return {id:slotId, index, offsetSeconds:index * CARGO_CYCLE_SECONDS / 4, shipId, truckId, trailerId, craneId, bayId,
    forkliftId:`FORKLIFT-${n}`, workerId:`WORKER-${n}`, robotId:`AMR-${n}`, cellId,
    outboundVehicleId,outboundTrailerId,dispatchBayId,dispatchStagingId,qaStationId:'QA-01',
    anchors:{ship:`ship:${shipId}:slot-${n}`, quay:`port:${craneId}:transfer`,
      truckLoad:`trailer:${trailerId}:load`, portTruck:`port:${truckId}:park`,
      bayTruck:`bay:${bayId}:truck`, bayApproach:`bay:${bayId}:approach`, bayHandoff:`bay:${bayId}:handoff`,
      storage:`storage:${slotId}`, storageRobotPickup:`storage:${slotId}:robot-pickup`, cellReceivingDock:`cell:${cellId}:receiving-dock`, cellInput:`cell:${cellId}:input`, cellOutput:`cell:${cellId}:output`,
      forkliftPark:`bay:${bayId}:${slotId}:forklift-park`, robotPark:`storage:${slotId}:robot-park`,
      cellDispatchPickup:`cell:${cellId}:dispatch-pickup`,qaInput:`qa:QA-01:${slotId}:input`,
      qaTest:`qa:QA-01:${slotId}:test`,qaOutput:`qa:QA-01:${slotId}:output`,
      qaBypassIn:`qa:QA-01:${slotId}:bypass-in`,qaBypassOut:`qa:QA-01:${slotId}:bypass-out`,
      dispatchStaging:`dispatch:${dispatchStagingId}:${slotId}:staging`,dispatchInput:`dispatch:${dispatchStagingId}:${slotId}:input`,
      dispatchVehicle:`bay:${dispatchBayId}:vehicle`,outboundLoad:`trailer:${outboundTrailerId}:load`,
      fleetHandoff:`fleet:${OUTBOUND_FLEET_ID}:${outboundVehicleId}:handoff`,
      forkliftStowed:`forklift:FORKLIFT-${n}:stowed-forks`,
    },
  };
}));

/** Finite nonnegative seconds; the cap keeps IDs and modulo math within safe precision. */
function seconds(value) {return Number.isFinite(value) ? Math.max(0, Math.min(value, Number.MAX_SAFE_INTEGER / 1024)) : 0;}
const owner = (kind, id, anchorId) => ({kind,id,anchorId});
const motion = (fromAnchorId, toAnchorId, progress) => ({fromAnchorId,toAnchorId,progress:clamp(progress)});
const resting = anchorId => motion(anchorId,anchorId,0);
const cargoIdFor = (slot, cycle) => `${slot.id}-B${String(cycle + 1).padStart(4,'0')}`;
function phaseAt(slot, timeSeconds) {
  const elapsed = timeSeconds - slot.offsetSeconds;
  const waiting = elapsed < 0;
  const cycle = waiting ? 0 : Math.floor(elapsed / CARGO_CYCLE_SECONDS);
  const localTime = waiting ? 0 : elapsed - cycle * CARGO_CYCLE_SECONDS;
  const definition = CARGO_STAGES.find(stage => localTime < stage.end) || CARGO_STAGES.at(-1);
  return {cycle,localTime,waiting,stage:definition.id,progress:waiting ? 0 : clamp((localTime-definition.start)/definition.duration)};
}

/** Cargo-bottom support above the floor; contact geometry belongs to the renderer. */
function incomingForkHeight(progress) {
  if(progress<.05)return 1.23+.12*smooth(progress/.05);
  if(progress<.20)return 1.35;
  if(progress<.30)return 1.35-.80*smooth((progress-.20)/.10);
  if(progress<.70)return .55;
  if(progress<.80)return .55+.545*smooth((progress-.70)/.10);
  if(progress<.95)return 1.095;
  return 1.095-.12*smooth((progress-.95)/.05);
}
function incomingLoadPhase(progress) {
  return progress<.05?'lift':progress<.20?'extract':progress<.30?'lower':progress<.70?'carry':progress<.80?'raise':progress<.95?'insert':'place';
}

function sampleSlot(slot, timeSeconds, outgoingEnabled=true) {
  // An inbound preview completes once, then holds this fixture's real output.
  const sampleTime=outgoingEnabled?timeSeconds:Math.min(timeSeconds,slot.offsetSeconds+phases['drone-assembly'].end);
  const {cycle,localTime,waiting,stage,progress} = phaseAt(slot,sampleTime), a = slot.anchors;
  const cargoId = cargoIdFor(slot,cycle), productId = `DRONE-${cargoId}`;
  let materialOwner = owner('ship',slot.shipId,a.ship), materialMotion = resting(a.ship);
  if (stage === 'ship-unloading') {materialOwner=owner('crane',slot.craneId,a.quay);materialMotion=motion(a.ship,a.quay,progress);}
  else if (stage === 'truck-loading') {materialOwner=owner('crane',slot.craneId,a.quay);materialMotion=motion(a.quay,a.truckLoad,progress);}
  else if (['truck-loaded','road-transit','bay-arrival'].includes(stage)) {materialOwner=owner('trailer',slot.trailerId,a.truckLoad);materialMotion=resting(a.truckLoad);}
  else if (stage === 'forklift-unloading') {materialOwner=owner('forklift',slot.forkliftId,'forks');materialMotion=motion(a.bayHandoff,a.storage,progress);}
  else if (stage === 'storage') {materialOwner=owner('storage',slot.id,a.storage);materialMotion=motion(a.storage,a.storageRobotPickup,smooth(localTime-77));}
  else if (stage === 'robot-transport') {
    if(localTime<87){materialOwner=owner('floor-robot',slot.robotId,'payload');materialMotion=motion(a.storageRobotPickup,a.cellReceivingDock,(localTime-78)/9);}
    else{materialOwner=owner('workcell',slot.cellId,a.cellInput);materialMotion=motion(a.cellReceivingDock,a.cellInput,smooth(localTime-87));}
  }
  else if (['box-opening','drone-assembly'].includes(stage)) {materialOwner=owner('workcell',slot.cellId,a.cellInput);materialMotion=resting(a.cellInput);}
  else if (stage === 'complete') {materialOwner=owner('consumed',slot.cellId,a.cellInput);materialMotion=resting(a.cellInput);}

  const boxOpen = stage==='box-opening' ? progress : ['drone-assembly','complete'].includes(stage) ? 1 : 0;
  const assemblyProgress = stage==='drone-assembly' ? progress : stage==='complete' ? 1 : 0;
  const cargo = {id:cargoId,slotId:slot.id,batch:cycle+1,cycleIndex:cycle,transferId:cargoId,carrierId:materialOwner.id,stage,progress,waiting,visible:stage!=='complete',
    kind:'drone-parts-kit',owner:materialOwner,attachment:{parentId:materialOwner.id,anchorId:materialOwner.anchorId},
    motion:materialMotion,shipId:slot.shipId,truckId:slot.truckId,trailerId:slot.trailerId,bayId:slot.bayId,forkliftId:slot.forkliftId,
    robotId:slot.robotId,cellId:slot.cellId,boxOpen,assemblyProgress,productId,
  };

  // After unloading, the open flatbed clears its loading area and returns EMPTY to port.
  // A separate cargo route is selected by semantic endpoints, never the story truck.
  const departure = phases.storage.start + 2, returnEnd = departure + phases['road-transit'].duration;
  let truckStage='port-waiting',truckProgress=0,routeId='cargo-port',fromAnchorId=a.portTruck,toAnchorId=a.portTruck;
  if (['ship-unloading','truck-loading'].includes(stage)) truckStage='loading';
  if (stage==='truck-loaded') truckStage='loaded';
  if (stage==='road-transit') {truckStage='loaded-transit';truckProgress=progress;routeId='cargo-outbound';fromAnchorId=a.portTruck;toAnchorId=a.bayApproach;}
  else if (stage==='bay-arrival') {truckStage=progress<.75?'docking':'parked';truckProgress=clamp(progress/.75);routeId='cargo-arrival';fromAnchorId=a.bayApproach;toAnchorId=a.bayTruck;}
  else if (localTime>=phases['bay-arrival'].end && localTime<departure) {truckStage='unloading';routeId='cargo-bay';fromAnchorId=a.bayTruck;toAnchorId=a.bayTruck;}
  else if (localTime>=departure && localTime<returnEnd) {truckStage='empty-return';truckProgress=(localTime-departure)/(returnEnd-departure);routeId='cargo-return';fromAnchorId=a.bayTruck;toAnchorId=a.portTruck;}
  const truckCargo=materialOwner.kind==='trailer'?cargoId:null;
  const loadAccessProgress=stage==='truck-loading'?1:stage==='bay-arrival'?clamp((progress-.75)/.25):stage==='forklift-unloading'?1:stage==='storage'?1-clamp((localTime-phases.storage.start)/2):0;
  const secureProgress=stage==='truck-loaded'?progress:stage==='road-transit'?1:stage==='bay-arrival'?1-loadAccessProgress:0;
  const loadSecured=truckCargo!==null&&secureProgress===1;
  const travelCycle=cycle+(localTime>=returnEnd?1:0);
  const truck={id:slot.truckId,slotId:slot.id,model:'truck',bodyStyle:'open-flatbed',inspectable:false,stage:truckStage,status:truckStage,
    routeId,progress:truckProgress,motion:motion(fromAnchorId,toAnchorId,truckProgress),bayId:slot.bayId,
    cargoId:truckCargo,loaded:truckCargo!==null,loadProgress:stage==='truck-loading'?progress:truckCargo?1:0,
    loadAccessProgress,secureProgress,loadSecured,travelCycle,trailerId:slot.trailerId,trailerAttached:true,reversing:false,
    stopped:!['loaded-transit','empty-return','docking'].includes(truckStage),
    trailer:{id:slot.trailerId,attached:true,cargoId:truckCargo,loadAccessProgress,secureProgress,loadSecured},
    // The center must remain on this exterior bay anchor throughout unloading.
    stopAnchorId:routeId==='cargo-bay'||truckStage==='parked'?a.bayTruck:null,
  };

  let forkliftStage='waiting',forkliftMotion=resting(a.forkliftPark);
  if (stage==='bay-arrival') {forkliftStage=progress<.75?'waiting':'approaching';forkliftMotion=motion(a.forkliftPark,a.bayHandoff,clamp((progress-.75)/.25));}
  else if (stage==='forklift-unloading') {forkliftStage='carrying';forkliftMotion=motion(a.bayHandoff,a.storage,progress);}
  else if (stage==='storage') {forkliftStage='returning';forkliftMotion=motion(a.storage,a.forkliftPark,progress);}
  const forklift={id:slot.forkliftId,slotId:slot.id,workerId:slot.workerId,bayId:slot.bayId,stage:forkliftStage,
    progress:forkliftMotion.progress,motion:forkliftMotion,cargoId:materialOwner.kind==='forklift'?cargoId:null,
    carrying:materialOwner.kind==='forklift',forkHeight:stage==='bay-arrival' ? .18+1.05*clamp((progress-.75)/.25) : stage==='forklift-unloading' ? incomingForkHeight(progress) : stage==='storage' ? (progress<=.25?.975:progress>=.40?.18:.975-.795*smooth((progress-.25)/.15)) : .18,
    forkHeightReference:'cargo-bottom',forkPocketOffset:.095,
    loadPhase:stage==='forklift-unloading'?incomingLoadPhase(progress):'empty',
    grip:materialOwner.kind==='forklift'?1:0,operatorPresent:true,
  };
  let robotStage='waiting',robotMotion=resting(a.robotPark);
  if (stage==='storage') {robotStage=localTime<77?'approaching':'waiting-for-transfer';robotMotion=motion(a.robotPark,a.storageRobotPickup,clamp((localTime-72)/5));}
  else if (stage==='robot-transport') {robotStage=localTime<87?'carrying':'cell-transfer';robotMotion=motion(a.storageRobotPickup,a.cellReceivingDock,clamp((localTime-78)/9));}
  else if (localTime>=phases['box-opening'].start && localTime<phases['box-opening'].start+10) {robotStage='returning';robotMotion=motion(a.cellReceivingDock,a.robotPark,(localTime-phases['box-opening'].start)/10);}
  const floorRobot={id:slot.robotId,slotId:slot.id,stage:robotStage,progress:robotMotion.progress,motion:robotMotion,
    cargoId:materialOwner.kind==='floor-robot'?cargoId:null,payload:materialOwner.kind==='floor-robot'?'parts-kit':null,
    carrying:materialOwner.kind==='floor-robot',lift:materialOwner.kind==='floor-robot'?1:0,
  };
  const craneActive=['ship-unloading','truck-loading'].includes(stage);
  let craneMotion=resting(a.ship);
  if (craneActive) craneMotion=materialMotion;
  else if (stage==='truck-loaded') craneMotion=motion(a.truckLoad,a.ship,progress);
  const crane={id:slot.craneId,slotId:slot.id,shipId:slot.shipId,truckId:slot.truckId,
    stage:craneActive?stage:stage==='truck-loaded'?'returning':'waiting',progress:craneMotion.progress,motion:craneMotion,
    cargoId:materialOwner.kind==='crane'?cargoId:null,grip:materialOwner.kind==='crane'?1:0,
  };
  const active=['box-opening','drone-assembly'].includes(stage);
  const receiving=stage==='robot-transport'&&localTime>=87;
  const cell={id:slot.cellId,cargoId:active||receiving?cargoId:null,stage:receiving?'receiving':active?stage:stage==='complete'?'complete':'idle',active,
    receivingProgress:receiving?smooth(localTime-87):active?1:0,
    progress:active?clamp((localTime-phases['box-opening'].start)/(phases['drone-assembly'].end-phases['box-opening'].start)):stage==='complete'?1:0,
    boxOpen,assemblyProgress,armAction:stage==='box-opening'?'open-box':stage==='drone-assembly'?'assemble-drone':'park',
  };
  const product=sampleProduct(slot,sampleTime);
  if(!outgoingEnabled&&product.completed){
    product.stage='ready';product.stageProgress=0;product.held=true;product.holdReason='outgoing-disabled';
    product.owner=owner('workcell',slot.cellId,a.cellOutput);product.carrierId=slot.cellId;
    product.attachment={parentId:slot.cellId,anchorId:a.cellOutput};product.motion=resting(a.cellOutput);
  }
  cell.outputProductId=product.visible&&product.owner.kind==='workcell'?product.id:null;
  cell.outputTransferProgress=product.stage==='ready'?product.stageProgress:0;
  // Finished-output activity is independent of already-consumed input custody.
  if(outgoingEnabled&&product.stage==='ready'){cell.armAction='handoff-output';cell.active=true;}
  return {cargo,truck,forklift:outgoingEnabled?outgoingForklift(slot,forklift,product):forklift,floorRobot:outgoingEnabled?outgoingRobot(slot,floorRobot,product):floorRobot,crane,cell,product};
}

/** Retain an outgoing product across kit rollover; replace it only at next assembly. */
function sampleProduct(slot,timeSeconds) {
  const elapsed=timeSeconds-slot.offsetSeconds,started=elapsed>=PRODUCT_STAGES[0].start;
  const cycle=started?Math.floor((elapsed-PRODUCT_STAGES[0].start)/CARGO_CYCLE_SECONDS):0;
  const age=started?elapsed-cycle*CARGO_CYCLE_SECONDS:Math.max(0,elapsed);
  const phase=started?PRODUCT_STAGES.find(p=>age<p.end):null,stage=phase?.id||'pending';
  const stageProgress=phase?clamp((age-phase.start)/phase.duration):0,a=slot.anchors;
  const sourceCargoId=cargoIdFor(slot,cycle),id=`DRONE-${sourceCargoId}`;
  let custody=owner('workcell',slot.cellId,a.cellOutput),travel=resting(a.cellOutput);
  if(stage==='ready')travel=motion(a.cellOutput,a.cellDispatchPickup,stageProgress);
  else if(stage==='qa-transport'){custody=owner('floor-robot',slot.robotId,'payload');travel=motion(a.cellDispatchPickup,a.qaInput,stageProgress);}
  else if(stage==='qa-testing'){custody=owner('qa-station',slot.qaStationId,a.qaInput);travel=age<132?motion(a.qaInput,a.qaTest,smooth((age-130)/2)):age<136?resting(a.qaTest):motion(a.qaTest,a.qaOutput,smooth((age-136)/2));}
  else if(stage==='dispatch-transport'){custody=owner('floor-robot',slot.robotId,'payload');travel=motion(a.qaOutput,a.dispatchInput,stageProgress);}
  else if(stage==='dispatch-staged'){custody=owner('dispatch-staging',slot.dispatchStagingId,a.dispatchStaging);travel=motion(a.dispatchInput,a.dispatchStaging,smooth((age-146)/2));}
  else if(stage==='outbound-loading'){custody=owner('forklift',slot.forkliftId,'forks');travel=motion(a.dispatchStaging,a.outboundLoad,stageProgress);}
  else if(['outbound-loaded','outbound-transit'].includes(stage)){custody=owner('trailer',slot.outboundTrailerId,a.outboundLoad);travel=resting(a.outboundLoad);}
  else if(stage==='fleet-received'){custody=owner('fleet',OUTBOUND_FLEET_ID,a.fleetHandoff);travel=resting(a.fleetHandoff);}
  const assemblyProgress=stage==='assembling'?stageProgress:started?1:0;
  return {id,sourceCargoId,slotId:slot.id,cycleIndex:cycle,transferId:id,cellId:slot.cellId,
    stage,stageProgress,progress:assemblyProgress,assemblyProgress,lifecycleTimeSeconds:age,
    visible:started&&stage!=='fleet-received',completed:started&&age>=118,qaPassed:started&&age>=138,
    owner:custody,carrierId:custody.id,attachment:{parentId:custody.id,anchorId:custody.anchorId},motion:travel,
    qaStationId:slot.qaStationId,dispatchStagingId:slot.dispatchStagingId,
    outboundVehicleId:slot.outboundVehicleId,outboundTrailerId:slot.outboundTrailerId,dispatchBayId:slot.dispatchBayId,destinationId:OUTBOUND_FLEET_ID,
  };
}

/** The existing AMR works the output stream only during its proven idle window. */
function outgoingRobot(slot,base,product) {
  const t=product.lifecycleTimeSeconds,a=slot.anchors;
  if(product.stage==='pending'||t<118||t>=158)return base;
  let stage,travel;
  if(t<122){stage='output-approaching';travel=motion(a.robotPark,a.cellDispatchPickup,(t-118)/4);}
  else if(t<130){stage='qa-transport';travel=product.motion;}
  else if(t<138){stage='qa-bypass';travel=t<132?motion(a.qaInput,a.qaBypassIn,(t-130)/2):t<136?motion(a.qaBypassIn,a.qaBypassOut,(t-132)/4):motion(a.qaBypassOut,a.qaOutput,(t-136)/2);}
  else if(t<146){stage='dispatch-transport';travel=product.motion;}
  else if(t<148){stage='dispatch-transfer';travel=resting(a.dispatchInput);}
  else{stage='output-returning';travel=motion(a.dispatchInput,a.robotPark,(t-148)/10);}
  const carrying=product.owner.kind==='floor-robot';
  return {...base,flow:'outgoing',stage,progress:travel.progress,motion:travel,cargoId:null,
    productId:carrying?product.id:null,carrying,payload:carrying?'finished-drone':null,lift:carrying?1:0};
}

/** Outgoing fork supports are resolved from asset anchors, never guessed carrier heights. */
function outgoingForklift(slot,base,product) {
  const t=product.lifecycleTimeSeconds,a=slot.anchors;
  if(product.stage==='pending'||t<146||t>=166)return base;
  let stage,travel,support;
  if(t<152){stage='dispatch-approaching';travel=motion(a.forkliftPark,a.dispatchStaging,(t-146)/6);support=motion(a.forkliftStowed,a.dispatchStaging,clamp((t-150)/2));}
  else if(t<156){stage='outbound-loading';travel=product.motion;support=product.motion;}
  else{stage='dispatch-returning';travel=motion(a.outboundLoad,a.forkliftPark,(t-156)/10);support=motion(a.outboundLoad,a.forkliftStowed,clamp((t-156)/2));}
  const carrying=product.owner.kind==='forklift';
  const {forkHeight,...actor}=base;
  return {...actor,flow:'outgoing',stage,progress:travel.progress,motion:travel,cargoId:null,
    productId:carrying?product.id:null,carrying,grip:carrying?1:0,
    forkHeightMode:'anchors',forkSupportMotion:support};
}

function sampleOutboundVehicles(products,timeSeconds) {
  return [0,1].map(index=>{
    const slot=CARGO_SLOTS[index],id=slot.outboundVehicleId;
    const active=products.find(p=>p.outboundVehicleId===id&&p.stage!=='pending'&&p.lifecycleTimeSeconds>=146&&p.lifecycleTimeSeconds<200);
    const a=active?CARGO_SLOTS.find(s=>s.id===active.slotId).anchors:slot.anchors,t=active?.lifecycleTimeSeconds??0;
    let stage='waiting',routeId='cargo-dispatch-bay',progress=0,travel=resting(a.dispatchVehicle),secureProgress=0;
    if(active&&t<152){stage='preparing';}
    else if(active&&t<156){stage='loading';}
    else if(active&&t<158){stage='securing';secureProgress=(t-156)/2;}
    else if(active&&t<178){stage='outbound-transit';secureProgress=1;routeId='cargo-dispatch-outbound';progress=(t-158)/20;travel=motion(a.dispatchVehicle,a.fleetHandoff,progress);}
    else if(active){stage='empty-return';routeId='cargo-dispatch-return';progress=(t-178)/22;travel=motion(a.fleetHandoff,a.dispatchVehicle,progress);}
    const firstReturn=slot.offsetSeconds+200,travelCycle=timeSeconds<firstReturn?0:Math.floor((timeSeconds-firstReturn)/64)+1;
    const productIds=active?.owner.kind==='trailer'&&active.owner.id===slot.outboundTrailerId?[active.id]:[];
    return {id,model:'truck',bodyStyle:'open-flatbed',inspectable:false,trailerAttached:true,trailerId:slot.outboundTrailerId,bayId:slot.dispatchBayId,stage,status:stage,
      routeId,progress,motion:travel,travelCycle,reversing:false,stopped:routeId==='cargo-dispatch-bay',secureProgress,loadSecured:productIds.length>0&&secureProgress===1,
      trailer:{id:slot.outboundTrailerId,attached:true,productIds},
      stopAnchorId:routeId==='cargo-dispatch-bay'?a.dispatchVehicle:null,
      capacity:CARGO_PROCESS_LIMITS.outboundCapacity,productIds,productId:productIds[0]||null,loaded:productIds.length>0,
      destinationId:OUTBOUND_FLEET_ID,qaPassed:productIds.length?active.qaPassed:null};
  });
}

/**
 * Primary integration API. Sample with the existing 20 Hz simulation clock.
 * Pausing is represented, not a second time authority: the caller freezes seconds.
 * Reset/rewind/repeated calls always produce the same deeply frozen state.
 * Optional presentationOffsetSeconds populates the pipeline without another clock.
 * timeSeconds remains the caller's time; processTimeSeconds is the sampled phase.
 */
export function sampleCargoProcess(timeSeconds=0, {paused=false,presentationOffsetSeconds=0,outgoingEnabled=true}={}) {
  const time=seconds(timeSeconds),offset=seconds(presentationOffsetSeconds),processTime=seconds(time+offset);
  const outgoing=outgoingEnabled!==false;
  const slots=CARGO_SLOTS.map(slot=>sampleSlot(slot,processTime,outgoing));
  const cargo=slots.map(slot=>slot.cargo),products=slots.map(slot=>slot.product);
  const qaStations=[{id:'QA-01',capacity:1,productIds:products.filter(p=>p.owner.kind==='qa-station').map(p=>p.id)}];
  const dispatchStaging=[0,1].map(i=>({id:CARGO_SLOTS[i].dispatchStagingId,bayId:CARGO_SLOTS[i].dispatchBayId,capacity:1,sortKey:'destination-fleet',productIds:products.filter(p=>p.owner.kind==='dispatch-staging'&&p.dispatchStagingId===CARGO_SLOTS[i].dispatchStagingId).map(p=>p.id)}));
  const ships=['SHIP-01','SHIP-02'].map(id=>({id,stage:'berthed',cargoIds:cargo.filter(c=>c.owner.kind==='ship'&&c.owner.id===id).map(c=>c.id)}));
  return freeze({version:CARGO_PROCESS_VERSION,illustrative:true,outgoingEnabled:outgoing,capabilities:{outgoing,onePassHold:!outgoing},label:'Illustrative cargo and drone assembly; not dispatch or production records',
    timeSeconds:time,processTimeSeconds:processTime,presentationOffsetSeconds:offset,paused:!!paused,cycleSeconds:CARGO_CYCLE_SECONDS,cargo,ships,
    trucks:slots.map(slot=>slot.truck),cranes:slots.map(slot=>slot.crane),forklifts:slots.map(slot=>slot.forklift),
    floorRobots:slots.map(slot=>slot.floorRobot),products,qaStations:outgoing?qaStations:[],dispatchStaging:outgoing?dispatchStaging:[],outboundVehicles:outgoing?sampleOutboundVehicles(products,processTime):[],
    factoryAssembly:{cells:slots.map(slot=>slot.cell)},
  });
}

/**
 * Bounded semantic transition log for (fromSeconds, toSeconds]. Derived from time;
 * no accumulated history and no side effects. A reset/rewind emits no stale events.
 * Large seeks report omittedCount and retain the most recent bounded transitions.
 * With a presentation offset, inputs/event.timeSeconds stay in the caller's clock;
 * event.processTimeSeconds records the phase clock. Earlier warm-up is not replayed.
 */
export function cargoEventsBetween(fromSeconds, toSeconds, {limit=CARGO_PROCESS_LIMITS.events,presentationOffsetSeconds=0,outgoingEnabled=true}={}) {
  const offset=seconds(presentationOffsetSeconds);
  const from=seconds(seconds(fromSeconds)+offset),to=seconds(seconds(toSeconds)+offset);
  const capacity=Number.isFinite(limit)?Math.max(0,Math.min(CARGO_PROCESS_LIMITS.events,Math.floor(limit))):CARGO_PROCESS_LIMITS.events;
  if(to<=from)return freeze({events:[],omittedCount:0});
  const latest=[];let total=0;
  for(const slot of CARGO_SLOTS)for(const phase of [...CARGO_STAGES,{id:'workcell-received',stage:'robot-transport',start:87,type:'cargo-handed-to-workcell'}]){
    const firstTime=slot.offsetSeconds+phase.start;
    const firstCycle=Math.max(0,Math.floor((from-firstTime)/CARGO_CYCLE_SECONDS)+1);
    const lastCycle=Math.min(outgoingEnabled===false?0:Infinity,Math.floor((to-firstTime)/CARGO_CYCLE_SECONDS));
    if(lastCycle<firstCycle)continue;
    total+=lastCycle-firstCycle+1;
    for(let cycle=Math.max(firstCycle,lastCycle-capacity+1);cycle<=lastCycle;cycle++){
      const at=firstTime+cycle*CARGO_CYCLE_SECONDS,cargo=sampleSlot(slot,at).cargo;
      latest.push({id:`${cargo.id}:${phase.id}`,timeSeconds:at-offset,processTimeSeconds:at,cargoId:cargo.id,slotId:slot.id,stage:phase.stage||phase.id,
        type:phase.type|| (phase.id==='complete'?'drone-completed':phase.id==='ship'?'shipment-ready':'cargo-stage-entered'),owner:cargo.owner,
        ...(phase.id==='complete'?{productId:cargo.productId}:{}),
      });
    }
  }
  latest.sort((a,b)=>a.timeSeconds-b.timeSeconds||a.slotId.localeCompare(b.slotId)||a.id.localeCompare(b.id));
  const events=capacity?latest.slice(-capacity):[];
  return freeze({events,omittedCount:total-events.length});
}

/** Additive finished-product events; same bounded app-clock semantics as cargo events. */
export function productEventsBetween(fromSeconds,toSeconds,{limit=CARGO_PROCESS_LIMITS.events,presentationOffsetSeconds=0,outgoingEnabled=true}={}) {
  const offset=seconds(presentationOffsetSeconds),from=seconds(seconds(fromSeconds)+offset),to=seconds(seconds(toSeconds)+offset);
  const capacity=Number.isFinite(limit)?Math.max(0,Math.min(CARGO_PROCESS_LIMITS.events,Math.floor(limit))):CARGO_PROCESS_LIMITS.events;
  if(to<=from)return freeze({events:[],omittedCount:0});
  const latest=[];let total=0;
  for(const slot of CARGO_SLOTS)for(const phase of outgoingEnabled===false?PRODUCT_STAGES.filter(p=>['assembling','ready'].includes(p.id)):PRODUCT_STAGES){
    const firstTime=slot.offsetSeconds+phase.start;
    const firstCycle=Math.max(0,Math.floor((from-firstTime)/CARGO_CYCLE_SECONDS)+1),lastCycle=Math.min(outgoingEnabled===false?0:Infinity,Math.floor((to-firstTime)/CARGO_CYCLE_SECONDS));
    if(lastCycle<firstCycle)continue;
    total+=lastCycle-firstCycle+1;
    for(let cycle=Math.max(firstCycle,lastCycle-capacity+1);cycle<=lastCycle;cycle++){
      const at=firstTime+cycle*CARGO_CYCLE_SECONDS,product=sampleProduct(slot,at);
      latest.push({id:`${product.id}:${phase.id}`,timeSeconds:at-offset,processTimeSeconds:at,
        productId:product.id,sourceCargoId:product.sourceCargoId,slotId:slot.id,stage:phase.id,
        type:phase.id==='dispatch-transport'?'product-qa-passed':phase.id==='fleet-received'?'product-fleet-received':'product-stage-entered',
        owner:product.owner,qaPassed:product.qaPassed});
    }
  }
  latest.sort((a,b)=>a.timeSeconds-b.timeSeconds||a.slotId.localeCompare(b.slotId)||a.id.localeCompare(b.id));
  const events=capacity?latest.slice(-capacity):[];
  return freeze({events,omittedCount:total-events.length});
}

/** Optional seekable adapter for standalone consumers. It never creates a timer. */
export function createCargoProcess({presentationOffsetSeconds=0,outgoingEnabled=true}={}) {
  let timeSeconds=0,paused=false;
  const offset=seconds(presentationOffsetSeconds);
  const outgoing=outgoingEnabled!==false;
  const sample=()=>sampleCargoProcess(timeSeconds,{paused,presentationOffsetSeconds:offset,outgoingEnabled:outgoing});
  return Object.freeze({
    snapshotAt:(time,options={})=>sampleCargoProcess(time,{paused,presentationOffsetSeconds:offset,outgoingEnabled:outgoing,...options}),
    getSnapshot:sample,
    tick(deltaSeconds=0){if(!paused)timeSeconds=seconds(timeSeconds+seconds(deltaSeconds));return sample();},
    setPaused(value){paused=!!value;return sample();},
    pause(){paused=true;return sample();},
    resume(){paused=false;return sample();},
    reset(){timeSeconds=0;return sample();},
  });
}
