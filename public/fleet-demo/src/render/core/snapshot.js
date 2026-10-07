import { vehiclePosition,routeDistance } from '../map/world.js';
import {cargoTruckPosition,roadTruckPosition} from '../map/cargo-layout.js';
import {normalizeCargoProcess,normalizeAssembly,interpolateCargoProcess} from './cargo-snapshot.js';
/** Copy the narrow read-only boundary. No renderer receives mutable domain objects. */
export function normalizeSnapshot(input = {}) {
  const seen = new Set();
  const vehicles = (Array.isArray(input.vehicles) ? input.vehicles : []).filter(v=> {
    if (!v || typeof v.id !== 'string' || seen.has(v.id)) return false;
    seen.add(v.id); return true;
  }).map(v=> Object.freeze({
    ...Object.fromEntries(['trafficSlot','trafficRouteId','trafficPhase','slotId','cycleIndex','travelCycle','trailerId','bodyStyle','reversing','stopped','loaded','cargoId','productId','bayId','rearDoorOpen','secureProgress','loadSecured'].filter(key=>['string','number','boolean'].includes(typeof v[key])).map(key=>[key,v[key]])),id:v.id, progress:Math.max(0,Math.min(1,Number.isFinite(v.progress)?v.progress:0)),
    routeId:typeof v.routeId==='string'?v.routeId:'delivery', status:String(v.status||'Available'),
    model:v.model==='van'?'van':'truck',trailerAttached:v.trailerAttached!==false,inspectable:v.inspectable!==false,
    ...(Number.isFinite(v.x)&&Number.isFinite(v.y)?{x:v.x,y:v.y,heading:Number.isFinite(v.heading)?v.heading:0}:{}),
  }));
  const factoryAssembly=normalizeAssembly(input.factoryAssembly),cargoProcess=normalizeCargoProcess(input.cargoProcess);
  return Object.freeze({timeSeconds:Number.isFinite(input.timeSeconds)?input.timeSeconds:0,
    paused:!!input.paused,...(factoryAssembly?{factoryAssembly}:{}),...(cargoProcess?{cargoProcess}:{}), selectedId:typeof input.selectedId==='string'?input.selectedId:null,
    stage:String(input.stage||''), vehicles:Object.freeze(vehicles),
    facilities:Object.freeze((input.facilities||[]).map(f=>Object.freeze({id:String(f.id),label:String(f.label||f.id)}))),
    issueActive:!!input.issueActive, authorityResolved:!!input.authorityResolved });
}
export function interpolateSnapshots(previous, current, alpha = 1) {
  const old = new Map((previous?.vehicles||[]).map(v=>[v.id,v]));
  const t = current.paused || !previous || current.timeSeconds < previous.timeSeconds ? 1 : Math.max(0,Math.min(1,alpha));
  return current.vehicles.map(v=> {
    const before = old.get(v.id);
    // A replay, route switch or wrapped route is a new pose, never a sweep across town.
    const smooth = !v.routeId.startsWith('cargo-') && before && before.routeId===v.routeId && before.trafficPhase===v.trafficPhase && before.trafficRouteId===v.trafficRouteId && Math.abs(before.progress-v.progress)<0.25;
    const sample = smooth ? {...v,progress:before.progress+(v.progress-before.progress)*t} : v;
    const pose=sample.routeId.startsWith('cargo-')?cargoTruckPosition(sample):(roadTruckPosition(sample)||vehiclePosition(sample));
    return pose?{...sample,...pose,presentationDistanceMeters:pose.presentationDistanceMeters??routeDistance(sample.routeId,sample.progress)}:null;
  }).filter(Boolean);
}
export class SnapshotBuffer {
  constructor(){this.current=normalizeSnapshot();this.previous=null;this.receivedAt=0;this.interval=50;}
  update(snapshot, now=0){
    const next=normalizeSnapshot(snapshot);
    const reset=next.timeSeconds<this.current.timeSeconds;
    this.previous=reset?null:this.current;
    this.interval=Math.max(16,Math.min(250,now-this.receivedAt||50));
    this.current=next;this.receivedAt=now;
  }
  presentation(now=0){
    if(this.presentationAt===now&&this.presentationCurrent===this.current)return this.presentationValue;
    const process=this.current.paused?this.current.cargoProcess:interpolateCargoProcess(this.previous?.cargoProcess,this.current.cargoProcess,(now-this.receivedAt)/this.interval);
    const next=process?{...this.current,timeSeconds:process.timeSeconds,cargoProcess:process,factoryAssembly:process.factoryAssembly,vehicles:[...this.current.vehicles.filter(v=>!v.routeId.startsWith('cargo-')),...process.trucks,...process.outboundVehicles]}:this.current;
    this.presentationAt=now;this.presentationCurrent=this.current;this.presentationValue=next;return next;
  }
  sample(now=0){return interpolateSnapshots(this.previous,this.presentation(now),(now-this.receivedAt)/this.interval);}
}
export class FrameMetrics {
  constructor(capacity=600){this.capacity=capacity;this.samples=[];this.previous=null;this.longFrames=0;}
  frame(now){if(this.previous!==null){const dt=now-this.previous;if(dt>0&&Number.isFinite(dt)){this.samples.push(dt);if(this.samples.length>this.capacity)this.samples.shift();if(dt>50)this.longFrames++;}}this.previous=now;}
  suspend(){this.previous=null;}
  reset(){this.previous=null;this.samples=[];}
  get(){const sorted=[...this.samples].sort((a,b)=>a-b),n=sorted.length;const p=f=>n?sorted[Math.min(n-1,Math.ceil(n*f)-1)]:null;const mean=n?this.samples.reduce((a,b)=>a+b,0)/n:null;return {samples:n,fps:mean?1000/mean:null,p95Ms:p(.95),p99Ms:p(.99),longFrames:this.longFrames,longFramesScope:'lifetime foreground',percentileScope:`last ${n} foreground intervals`,measurement:'Browser RAF cadence; not a certified GPU benchmark',targetFps:30,preferredFps:60};}
}
