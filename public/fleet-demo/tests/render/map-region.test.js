import test from 'node:test';
import assert from 'node:assert/strict';
import {MAP_REGION,regionContentPoints,tileIntersectsRegion,bayerKeep,BAYER_4,regionCoverage} from '../../src/render/map/region.js';
import {SITES,toLngLat} from '../../src/render/map/world.js';
import {CARGO_ROUTE_CONFIGS,cargoRouteSet} from '../../src/render/map/cargo-layout.js';
import {editorialMapStyle} from '../../src/render/map/style.js';
import {groundInverse,createRegionClip} from '../../src/render/map/region-clip.js';
import {createRegionProtocol} from '../../src/render/map/region-protocol.js';
import {createSvgRegion} from '../../src/render/map/region-svg.js';
import {installDomHost,Element} from './dom-host.js';

test('region is anchored at actual workshop and fully contains sites, ships, dock and routes before the dither starts',()=>{
 const workshop=SITES.find(s=>s.id==='depot');assert.deepEqual(MAP_REGION.lngLat,toLngLat([workshop.x,workshop.y]));
 for(const p of regionContentPoints())assert.ok(Math.hypot(p[0]-workshop.x,p[1]-workshop.y)<MAP_REGION.innerRadius-100);
 for(const config of CARGO_ROUTE_CONFIGS){const route=cargoRouteSet({id:config.id});for(let i=0;i<=100;i++){const rig=route.sample('cargo-circuit',i/100,0);for(const p of [rig.tractor,rig.trailer])assert.ok(Math.hypot(p.x-workshop.x,p.y-workshop.y)<MAP_REGION.innerRadius,`${config.id} at ${i}%`);}}
 assert.equal(MAP_REGION.outerRadius-MAP_REGION.innerRadius,350);assert.deepEqual(editorialMapStyle().sources.openmaptiles.bounds,[...MAP_REGION.bounds]);
});
test('conservative circle tile gate retains every intersecting tile including all edge crossings',()=>{
 const r=MAP_REGION,[cx,cy]=r.centerMercator,R=r.outerRadius*r.meterScale;
 for(const z of [0,10,12,14,16,18]){const n=2**z;for(let angle=0;angle<360;angle++){const x=cx+R*Math.cos(angle*Math.PI/180)*.999999,y=cy+R*Math.sin(angle*Math.PI/180)*.999999;assert.equal(tileIntersectsRegion(z,Math.floor(x*n),Math.floor(y*n)),true);}}
 assert.equal(tileIntersectsRegion(14,0,0),false);assert.equal(tileIntersectsRegion(2,-1,0),false);
 const n=2**16,x=Math.floor((cx+R*.95)*n),y=Math.floor((cy+R*.95)*n);assert.equal(tileIntersectsRegion(16,x,y),false,'rectangle corner does not enter circular region');
});
test('Bayer order is balanced, deterministic, periodic, with solid center and empty outside',()=>{
 assert.deepEqual([...BAYER_4].sort((a,b)=>a-b),Array.from({length:16},(_,i)=>i));const r=MAP_REGION;
 assert.equal(bayerKeep(...r.center),true);assert.equal(bayerKeep(r.center[0]+r.outerRadius+1,r.center[1]),false);
 assert.equal(regionCoverage(r.innerRadius),1);assert.equal(regionCoverage(r.outerRadius),0);assert.equal(regionCoverage((r.innerRadius+r.outerRadius)/2),.5);
 for(let y=0;y<4;y++)for(let x=0;x<4;x++){const b2=(x,y)=>2*x+3*y-4*x*y;assert.equal(4*b2(x%2,y%2)+b2(Math.floor(x/2),Math.floor(y/2)),BAYER_4[y*4+x]);}
});
test('public protocol culls before fetching and preserves metadata/cache headers; cleanup unregisters once',async()=>{
 const protocols=new Map(),calls=[],removed=[];const M={addProtocol:(id,fn)=>protocols.set(id,fn),removeProtocol:id=>{removed.push(id);protocols.delete(id);}};
 const source=createRegionProtocol(M,'https://fixture.invalid/planet',{fetchResource:async(url,options)=>{calls.push({url,options});return{ok:true,json:async()=>({tiles:['https://fixture.invalid/{z}/{x}/{y}.pbf'],maxzoom:14,attribution:'retained'}),arrayBuffer:async()=>new ArrayBuffer(7),headers:{get:k=>k==='cache-control'?'max-age=600':null}};}});
 const load=[...protocols.values()][0],metadata=await load({url:source.url},new AbortController());assert.equal(metadata.data.attribution,'retained');assert.deepEqual(metadata.data.bounds,[...MAP_REGION.bounds]);
 const tile=(x,y)=>metadata.data.tiles[0].replace('{z}','14').replace('{x}',x).replace('{y}',y);
 const empty=await load({url:tile(0,0)},new AbortController());assert.equal(empty.data.byteLength,0);assert.equal(calls.length,1);
 const [cx,cy]=MAP_REGION.centerMercator,data=await load({url:tile(Math.floor(cx*2**14),Math.floor(cy*2**14))},new AbortController());assert.equal(data.data.byteLength,7);assert.equal(data.cacheControl,'max-age=600');assert.equal(calls.length,2);assert.match(calls[1].url,/\/14\/\d+\/\d+\.pbf$/);
 assert.deepEqual(source.getMetrics(),{metadataRequests:1,tileRequests:2,culledTiles:1,fetchedTiles:1,downloadedBytes:7,errors:0,activeRequests:0,tileCulling:'circle-intersection + source bounds'});source.dispose();source.dispose();assert.equal(removed.length,1);
});
test('protocol cancellation reaches fetch and failed metadata is an explicit error',async()=>{
 let load,signal;const source=createRegionProtocol({addProtocol:(_,f)=>load=f,removeProtocol(){}},'https://fixture.invalid/planet',{fetchResource:async(_,options)=>{signal=options.signal;return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError'))));}});
 const abort=new AbortController(),promise=load({url:source.url},abort);abort.abort();await assert.rejects(promise,{name:'AbortError'});assert.equal(signal.aborted,true);assert.equal(source.getMetrics().errors,0);source.dispose();
});
test('ground inverse stays geographic through pan, pitch, bearing and viewport projection',()=>{
 const r=MAP_REGION,[cx,cy]=r.centerMercator,s=r.meterScale;
 for(const bearing of [0,.4,-1.2])for(const pitch of [0,.7,1.05])for(const pan of [0,500]){
  const a=Math.cos(bearing)/3000,b=-Math.sin(bearing)/3000,d=Math.sin(bearing)*Math.cos(pitch)/2100,e=Math.cos(bearing)*Math.cos(pitch)/2100,h=Math.sin(pitch)/9000;
  // Encode a known workshop-relative perspective transform as a MapLibre column-major matrix.
  const m=new Array(16).fill(0);m[0]=a/s;m[4]=-b/s;m[12]=-a*cx/s+b*cy/s+pan/3000;m[1]=d/s;m[5]=-e/s;m[13]=-d*cx/s+e*cy/s;m[7]=-h/s;m[15]=1+h*cy/s;
  const inv=groundInverse(m);assert.ok(inv);for(const [x,y]of [[0,0],[100,300],[-2700,1600]]){const w=h*y+1,nx=(a*x+b*y+pan/3000)/w,ny=(d*x+e*y)/w,k=inv[2]*nx+inv[5]*ny+inv[8],rx=(inv[0]*nx+inv[3]*ny+inv[6])/k,ry=(inv[1]*nx+inv[4]*ny+inv[7])/k;assert.ok(Math.abs(rx-x)<.01);assert.ok(Math.abs(ry-y)<.01);}
 }
 assert.equal(groundInverse(new Array(16).fill(0)),null);
});
test('SVG fallback builds geographic Bayer rings and a real outer circle clip',t=>{
 installDomHost(t);const svg=new Element('svg'),tiles=new Element('g');svg.append(tiles);const mask=createSvgRegion(svg,tiles);mask.update({center:{x:240,y:180},metersPerPixel:10,width:800,height:600});assert.match(tiles.getAttribute('clip-path'),/-outer/);assert.match(tiles.getAttribute('mask'),/fleet-region/);const outer=svg.walk().find(n=>n.tagName==='clipPath').firstChild;assert.equal(outer.getAttribute('r'),String(MAP_REGION.outerRadius/10));assert.equal(svg.walk().filter(n=>n.tagName==='pattern').length,32);mask.dispose();assert.equal(tiles.children.length,0);
});
test('GPU clip draws one alpha-clearing pass and releases resources exactly once, including lost contexts',()=>{
 const calls=[];let lost=false,id=0;const gl=new Proxy({isContextLost:()=>lost,createShader:()=>++id,createProgram:()=>++id,createBuffer:()=>++id,createVertexArray:()=>++id,getShaderParameter:()=>true,getProgramParameter:()=>true,getAttribLocation:()=>0,getUniformLocation:()=>1},{get(o,k){return k in o?o[k]:String(k).toUpperCase()===k?k:(...args)=>calls.push([k,...args]);}});
 const layer=createRegionClip();layer.onAdd({},gl);const r=MAP_REGION,[cx,cy]=r.centerMercator,s=r.meterScale,m=new Array(16).fill(0);m[0]=1/(3000*s);m[5]=1/(3000*s);m[12]=-cx*m[0];m[13]=-cy*m[5];m[15]=1;layer.render(gl,m);assert.equal(layer.getMetrics().frames,1);assert.deepEqual(calls.find(c=>c[0]==='drawArrays'),['drawArrays','TRIANGLES',0,3]);assert.ok(calls.some(c=>c[0]==='disable'&&c[1]==='BLEND'));assert.ok(calls.some(c=>c[0]==='disable'&&c[1]==='SCISSOR_TEST'));lost=true;layer.render(gl,m);assert.equal(layer.getMetrics().frames,1);layer.onRemove();layer.onRemove();assert.equal(calls.filter(c=>c[0]==='deleteProgram').length,1);assert.equal(calls.filter(c=>c[0]==='deleteBuffer').length,1);assert.equal(calls.filter(c=>c[0]==='deleteVertexArray').length,1);assert.equal(layer.getMetrics().ready,false);
});
