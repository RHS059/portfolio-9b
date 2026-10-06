import { vehiclePosition } from '../map/world.js';
/** Copy the narrow read-only boundary. No renderer receives mutable domain objects. */
export function normalizeSnapshot(input = {}) {
  const seen = new Set();
  const vehicles = (Array.isArray(input.vehicles) ? input.vehicles : []).filter(v=> {
    if (!v || typeof v.id !== 'string' || seen.has(v.id)) return false;
    seen.add(v.id); return true;
  }).map(v=> Object.freeze({
    id:v.id, progress:Math.max(0,Math.min(1,Number.isFinite(v.progress)?v.progress:0)),
    routeId:typeof v.routeId==='string'?v.routeId:'delivery', status:String(v.status||'Available'),
    model:v.model==='van'?'van':'truck',
    ...(Number.isFinite(v.x)&&Number.isFinite(v.y)?{x:v.x,y:v.y,heading:Number.isFinite(v.heading)?v.heading:0}:{}),
  }));
  return Object.freeze({timeSeconds:Number.isFinite(input.timeSeconds)?input.timeSeconds:0,
    paused:!!input.paused, selectedId:typeof input.selectedId==='string'?input.selectedId:null,
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
    const smooth = before && before.routeId===v.routeId && Math.abs(before.progress-v.progress)<0.25;
    const sample = smooth ? {...v,progress:before.progress+(v.progress-before.progress)*t} : v;
    return {...v,...vehiclePosition(sample)};
  });
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
  sample(now=0){return interpolateSnapshots(this.previous,this.current,(now-this.receivedAt)/this.interval);}
}
export class FrameMetrics {
  constructor(capacity=600){this.capacity=capacity;this.samples=[];this.previous=null;this.longFrames=0;}
  frame(now){if(this.previous!==null){const dt=now-this.previous;if(dt>0&&dt<1000){this.samples.push(dt);if(this.samples.length>this.capacity)this.samples.shift();if(dt>50)this.longFrames++;}}this.previous=now;}
  reset(){this.previous=null;this.samples=[];this.longFrames=0;}
  get(){const sorted=[...this.samples].sort((a,b)=>a-b),n=sorted.length;const p=f=>n?sorted[Math.min(n-1,Math.ceil(n*f)-1)]:null;const mean=n?this.samples.reduce((a,b)=>a+b,0)/n:null;return {samples:n,fps:mean?1000/mean:null,p95Ms:p(.95),p99Ms:p(.99),longFrames:this.longFrames,measurement:'Browser RAF cadence; not a certified GPU benchmark',targetFps:30,preferredFps:60};}
}
