import {MAP_REGION,tileIntersectsRegion} from './region.js';
let nextId=0;
/** Public MapLibre addProtocol API. No access to sourceCaches, painter or tile internals. */
export function createRegionProtocol(maplibre,metadataURL,{fetchResource=globalThis.fetch,region=MAP_REGION}={}){
 const scheme=`fleet-region-${++nextId}`,prefix=`${scheme}://`,active=new Set();let disposed=false;
 const metrics={metadataRequests:0,tileRequests:0,culledTiles:0,fetchedTiles:0,downloadedBytes:0,errors:0};
 const supported=typeof maplibre.addProtocol==='function'&&typeof maplibre.removeProtocol==='function';
 async function load(params,abortController){
  if(disposed)throw new DOMException('Region source disposed','AbortError');
  const controller=new AbortController(),abort=()=>controller.abort();abortController?.signal.addEventListener('abort',abort,{once:true});if(abortController?.signal.aborted)abort();active.add(controller);
  try{
   if(params.url===`${prefix}metadata`){metrics.metadataRequests++;const response=await fetchResource(metadataURL,{signal:controller.signal});if(!response.ok)throw Error(`Map metadata ${response.status}`);const metadata=await response.json();if(!Array.isArray(metadata.tiles)||!metadata.tiles.length)throw Error('Map metadata has no tile templates');return{data:{...metadata,bounds:[...region.bounds],tiles:metadata.tiles.map(template=>`${prefix}tile/{z}/{x}/{y}/${encodeURIComponent(template)}`)}};}
   const match=params.url.slice(prefix.length).match(/^tile\/(\d+)\/(\d+)\/(\d+)\/(.+)$/);if(!match)throw Error('Invalid region tile URL');
   const [,zs,xs,ys,encoded]=match,z=Number(zs),x=Number(xs),y=Number(ys);metrics.tileRequests++;
   if(!tileIntersectsRegion(z,x,y,region)){metrics.culledTiles++;return{data:new ArrayBuffer(0)};}
   const url=decodeURIComponent(encoded).replaceAll('{z}',zs).replaceAll('{x}',xs).replaceAll('{y}',ys);
   if(!url.startsWith('https://'))throw Error('Map tile template requires HTTPS');
   metrics.fetchedTiles++;const response=await fetchResource(url,{signal:controller.signal});if(!response.ok)throw Error(`Map tile ${response.status}`);const data=await response.arrayBuffer();metrics.downloadedBytes+=data.byteLength;return{data,cacheControl:response.headers?.get('cache-control')||undefined,expires:response.headers?.get('expires')||undefined};
  }catch(error){if(error.name!=='AbortError')metrics.errors++;throw error;}
  finally{active.delete(controller);abortController?.signal.removeEventListener('abort',abort);}
 }
 if(supported)maplibre.addProtocol(scheme,load);
 return{url:supported?`${prefix}metadata`:metadataURL,getMetrics:()=>({...metrics,activeRequests:active.size,tileCulling:supported?'circle-intersection + source bounds':'source bounds only'}),dispose(){if(disposed)return;disposed=true;for(const controller of active)controller.abort();active.clear();if(supported)maplibre.removeProtocol(scheme);}};
}
