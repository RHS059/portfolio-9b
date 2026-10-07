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
const pad = value => String(value).padStart(2, '0');
export const CARGO_PROCESS_VERSION = 'illustrative-cargo/v1';
export const CARGO_PROCESS_LIMITS = freeze({shipments:4, ships:2, trucks:4, cranes:4, forklifts:4, floorRobots:4, cells:4, products:4, events:128});

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
const cellIds = ['frame-jig','motor-install','propeller-install','final-assembly'];
export const CARGO_SLOTS = freeze(cellIds.map((cellId, index) => {
  const n = pad(index + 1), slotId = `CARGO-${n}`, shipId = `SHIP-${pad(1 + Math.floor(index / 2))}`;
  const truckId = `CARGO-${401 + index}`, trailerId = `TRAILER-${401 + index}`, craneId = `CRANE-${n}`, bayId = `factory-receiving-${pad(index % 2 + 1)}`;
  return {id:slotId, index, offsetSeconds:index * CARGO_CYCLE_SECONDS / 4, shipId, truckId, trailerId, craneId, bayId,
    forkliftId:`FORKLIFT-${n}`, workerId:`WORKER-${n}`, robotId:`AMR-${n}`, cellId,
    anchors:{ship:`ship:${shipId}:slot-${n}`, quay:`port:${craneId}:transfer`,
      truckLoad:`trailer:${trailerId}:load`, portTruck:`port:${truckId}:park`,
      bayTruck:`bay:${bayId}:truck`, bayApproach:`bay:${bayId}:approach`, bayHandoff:`bay:${bayId}:handoff`,
      storage:`storage:${slotId}`, cellInput:`cell:${cellId}:input`, cellOutput:`cell:${cellId}:output`,
      forkliftPark:`bay:${bayId}:${slotId}:forklift-park`, robotPark:`storage:${slotId}:robot-park`,
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

function sampleSlot(slot, timeSeconds) {
  const {cycle,localTime,waiting,stage,progress} = phaseAt(slot,timeSeconds), a = slot.anchors;
  const cargoId = cargoIdFor(slot,cycle), productId = `DRONE-${cargoId}`;
  let materialOwner = owner('ship',slot.shipId,a.ship), materialMotion = resting(a.ship);
  if (stage === 'ship-unloading') {materialOwner=owner('crane',slot.craneId,a.quay);materialMotion=motion(a.ship,a.quay,progress);}
  else if (stage === 'truck-loading') {materialOwner=owner('crane',slot.craneId,a.quay);materialMotion=motion(a.quay,a.truckLoad,progress);}
  else if (['truck-loaded','road-transit','bay-arrival'].includes(stage)) {materialOwner=owner('trailer',slot.trailerId,a.truckLoad);materialMotion=resting(a.truckLoad);}
  else if (stage === 'forklift-unloading') {materialOwner=owner('forklift',slot.forkliftId,'forks');materialMotion=motion(a.bayHandoff,a.storage,progress);}
  else if (stage === 'storage') {materialOwner=owner('storage',slot.id,a.storage);materialMotion=resting(a.storage);}
  else if (stage === 'robot-transport') {materialOwner=owner('floor-robot',slot.robotId,'payload');materialMotion=motion(a.storage,a.cellInput,progress);}
  else if (['box-opening','drone-assembly'].includes(stage)) {materialOwner=owner('workcell',slot.cellId,a.cellInput);materialMotion=resting(a.cellInput);}
  else if (stage === 'complete') {materialOwner=owner('consumed',slot.cellId,a.cellInput);materialMotion=resting(a.cellInput);}

  const boxOpen = stage==='box-opening' ? progress : ['drone-assembly','complete'].includes(stage) ? 1 : 0;
  const assemblyProgress = stage==='drone-assembly' ? progress : stage==='complete' ? 1 : 0;
  const cargo = {id:cargoId,slotId:slot.id,batch:cycle+1,cycleIndex:cycle,transferId:cargoId,carrierId:materialOwner.id,stage,progress,waiting,visible:stage!=='complete',
    kind:'drone-parts-kit',owner:materialOwner,attachment:{parentId:materialOwner.id,anchorId:materialOwner.anchorId},
    motion:materialMotion,shipId:slot.shipId,truckId:slot.truckId,trailerId:slot.trailerId,bayId:slot.bayId,forkliftId:slot.forkliftId,
    robotId:slot.robotId,cellId:slot.cellId,boxOpen,assemblyProgress,productId,
  };

  // After its material is unloaded, the semi closes up and returns EMPTY to port.
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
  const rearDoorOpen=stage==='bay-arrival'?clamp((progress-.75)/.25):stage==='forklift-unloading'?1:stage==='storage'?1-clamp((localTime-phases.storage.start)/2):0;
  const truck={id:slot.truckId,slotId:slot.id,model:'truck',inspectable:false,stage:truckStage,status:truckStage,
    routeId,progress:truckProgress,motion:motion(fromAnchorId,toAnchorId,truckProgress),bayId:slot.bayId,
    cargoId:truckCargo,loaded:truckCargo!==null,loadProgress:stage==='truck-loading'?progress:truckCargo?1:0,
    rearDoorOpen,trailerId:slot.trailerId,trailerAttached:true,reversing:truckStage==='docking',
    stopped:!['loaded-transit','empty-return','docking'].includes(truckStage),
    trailer:{id:slot.trailerId,attached:true,cargoId:truckCargo,rearDoorOpen},
    // The center must remain on this exterior bay anchor throughout unloading.
    stopAnchorId:routeId==='cargo-bay'||truckStage==='parked'?a.bayTruck:null,
  };

  let forkliftStage='waiting',forkliftMotion=resting(a.forkliftPark);
  if (stage==='bay-arrival') {forkliftStage=progress<.75?'waiting':'approaching';forkliftMotion=motion(a.forkliftPark,a.bayHandoff,clamp((progress-.75)/.25));}
  else if (stage==='forklift-unloading') {forkliftStage='carrying';forkliftMotion=motion(a.bayHandoff,a.storage,progress);}
  else if (stage==='storage') {forkliftStage='returning';forkliftMotion=motion(a.storage,a.forkliftPark,progress);}
  const forklift={id:slot.forkliftId,slotId:slot.id,workerId:slot.workerId,bayId:slot.bayId,stage:forkliftStage,
    progress:forkliftMotion.progress,motion:forkliftMotion,cargoId:materialOwner.kind==='forklift'?cargoId:null,
    carrying:materialOwner.kind==='forklift',forkHeight:stage==='bay-arrival' ? .18+1.05*clamp((progress-.75)/.25) : stage==='forklift-unloading' ? (progress<.15?1.23-.68*progress/.15:progress>.85?.55+.425*(progress-.85)/.15:.55) : stage==='storage' ? .975-.795*clamp(progress/.25) : .18,
    grip:materialOwner.kind==='forklift'?1:0,operatorPresent:true,
  };
  let robotStage='waiting',robotMotion=resting(a.robotPark);
  if (stage==='storage') {robotStage='approaching';robotMotion=motion(a.robotPark,a.storage,progress);}
  else if (stage==='robot-transport') {robotStage='carrying';robotMotion=motion(a.storage,a.cellInput,progress);}
  else if (localTime>=phases['box-opening'].start && localTime<phases['box-opening'].start+10) {robotStage='returning';robotMotion=motion(a.cellInput,a.robotPark,(localTime-phases['box-opening'].start)/10);}
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
  const cell={id:slot.cellId,cargoId:active?cargoId:null,stage:active?stage:stage==='complete'?'complete':'idle',active,
    progress:active?clamp((localTime-phases['box-opening'].start)/(phases['drone-assembly'].end-phases['box-opening'].start)):stage==='complete'?1:0,
    boxOpen,assemblyProgress,armAction:stage==='box-opening'?'open-box':stage==='drone-assembly'?'assemble-drone':'park',
  };
  const product={id:productId,sourceCargoId:cargoId,cellId:slot.cellId,visible:['drone-assembly','complete'].includes(stage),
    stage:stage==='complete'?'ready':'assembling',progress:assemblyProgress,
    owner:owner('workcell',slot.cellId,a.cellOutput),attachment:{parentId:slot.cellId,anchorId:a.cellOutput},
  };
  return {cargo,truck,forklift,floorRobot,crane,cell,product};
}

/**
 * Primary integration API. Sample with the existing 20 Hz simulation clock.
 * Pausing is represented, not a second time authority: the caller freezes seconds.
 * Reset/rewind/repeated calls always produce the same deeply frozen state.
 * Optional presentationOffsetSeconds populates the pipeline without another clock.
 * timeSeconds remains the caller's time; processTimeSeconds is the sampled phase.
 */
export function sampleCargoProcess(timeSeconds=0, {paused=false,presentationOffsetSeconds=0}={}) {
  const time=seconds(timeSeconds),offset=seconds(presentationOffsetSeconds),processTime=seconds(time+offset);
  const slots=CARGO_SLOTS.map(slot=>sampleSlot(slot,processTime));
  const cargo=slots.map(slot=>slot.cargo);
  const ships=['SHIP-01','SHIP-02'].map(id=>({id,stage:'berthed',cargoIds:cargo.filter(c=>c.owner.kind==='ship'&&c.owner.id===id).map(c=>c.id)}));
  return freeze({version:CARGO_PROCESS_VERSION,illustrative:true,label:'Illustrative cargo and drone assembly; not dispatch or production records',
    timeSeconds:time,processTimeSeconds:processTime,presentationOffsetSeconds:offset,paused:!!paused,cycleSeconds:CARGO_CYCLE_SECONDS,cargo,ships,
    trucks:slots.map(slot=>slot.truck),cranes:slots.map(slot=>slot.crane),forklifts:slots.map(slot=>slot.forklift),
    floorRobots:slots.map(slot=>slot.floorRobot),products:slots.map(slot=>slot.product),
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
export function cargoEventsBetween(fromSeconds, toSeconds, {limit=CARGO_PROCESS_LIMITS.events,presentationOffsetSeconds=0}={}) {
  const offset=seconds(presentationOffsetSeconds);
  const from=seconds(seconds(fromSeconds)+offset),to=seconds(seconds(toSeconds)+offset);
  const capacity=Number.isFinite(limit)?Math.max(0,Math.min(CARGO_PROCESS_LIMITS.events,Math.floor(limit))):CARGO_PROCESS_LIMITS.events;
  if(to<=from)return freeze({events:[],omittedCount:0});
  const latest=[];let total=0;
  for(const slot of CARGO_SLOTS)for(const phase of CARGO_STAGES){
    const firstTime=slot.offsetSeconds+phase.start;
    const firstCycle=Math.max(0,Math.floor((from-firstTime)/CARGO_CYCLE_SECONDS)+1);
    const lastCycle=Math.floor((to-firstTime)/CARGO_CYCLE_SECONDS);
    if(lastCycle<firstCycle)continue;
    total+=lastCycle-firstCycle+1;
    for(let cycle=Math.max(firstCycle,lastCycle-capacity+1);cycle<=lastCycle;cycle++){
      const at=firstTime+cycle*CARGO_CYCLE_SECONDS,cargo=sampleSlot(slot,at).cargo;
      latest.push({id:`${cargo.id}:${phase.id}`,timeSeconds:at-offset,processTimeSeconds:at,cargoId:cargo.id,slotId:slot.id,stage:phase.id,
        type:phase.id==='complete'?'drone-completed':phase.id==='ship'?'shipment-ready':'cargo-stage-entered',owner:cargo.owner,
        ...(phase.id==='complete'?{productId:cargo.productId}:{}),
      });
    }
  }
  latest.sort((a,b)=>a.timeSeconds-b.timeSeconds||a.slotId.localeCompare(b.slotId)||a.id.localeCompare(b.id));
  const events=capacity?latest.slice(-capacity):[];
  return freeze({events,omittedCount:total-events.length});
}

/** Optional seekable adapter for standalone consumers. It never creates a timer. */
export function createCargoProcess({presentationOffsetSeconds=0}={}) {
  let timeSeconds=0,paused=false;
  const offset=seconds(presentationOffsetSeconds);
  const sample=()=>sampleCargoProcess(timeSeconds,{paused,presentationOffsetSeconds:offset});
  return Object.freeze({
    snapshotAt:(time,options={})=>sampleCargoProcess(time,{paused,presentationOffsetSeconds:offset,...options}),
    getSnapshot:sample,
    tick(deltaSeconds=0){if(!paused)timeSeconds=seconds(timeSeconds+seconds(deltaSeconds));return sample();},
    setPaused(value){paused=!!value;return sample();},
    pause(){paused=true;return sample();},
    resume(){paused=false;return sample();},
    reset(){timeSeconds=0;return sample();},
  });
}
