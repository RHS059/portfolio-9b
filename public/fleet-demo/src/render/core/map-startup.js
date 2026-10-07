/** Bounded CPU-only startup diagnostics; never creates or queries a graphics context. */
export class MapStartupDiagnostics {
  constructor(){this.attempt=0;this.current=null;this.previous=[];}
  begin(now){if(this.current){this.previous.push(structuredClone(this.current));if(this.previous.length>2)this.previous.shift();}this.current={attempt:++this.attempt,startedAt:now,phase:'constructing',renderCount:0,events:[]};}
  readiness(map){
    const read=fn=>{try{return fn()??null;}catch{return null;}};
    return{styleLoaded:read(()=>map?.isStyleLoaded?.()),mapLoaded:read(()=>map?.loaded?.()),sourceLoaded:read(()=>map?.getSource?.('openmaptiles')?map.isSourceLoaded('openmaptiles'):false)};
  }
  record(type,now,map,event={}){if(!this.current)return;const current=this.current;current.lastAt=now;if(type==='render'){current.renderCount++;current.lastRenderAt=now;return;}current.phase=type;Object.assign(current,this.readiness(map));const entry={type,at:now};for(const key of ['sourceId','sourceDataType','isSourceLoaded'])if(event[key]!==undefined)entry[key]=event[key];if(event.error)entry.error=String(event.error.message||event.error).slice(0,300);current.events.push(entry);if(current.events.length>16)current.events.shift();}
  get(map){return{current:this.current?structuredClone({...this.current,...(map?this.readiness(map):{})}):null,previous:structuredClone(this.previous)};}
}
