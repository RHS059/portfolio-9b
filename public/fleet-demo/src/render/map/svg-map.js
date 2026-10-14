import {MAP_CDN} from './style.js';
import {decodeVectorTile} from './vector-tile.js';
const NS='http://www.w3.org/2000/svg';
const make=(tag,attrs={})=>{const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
const colors={landuse:['#e7e9e0','none'],park:['#e2e6dc','none'],water:['#d9e0da','#87958b'],waterway:['none','#a7b5ac'],building:['#e8ebe3','#899486'],transportation:['none','#87958b']};
/** Same OpenFreeMap TileJSON and vector tiles as the normal GPU map. */
export function createSvgMap(group,{onError=()=>{}}={}){
 let metadata=null,disposed=false,signature='',wanted=new Set(),errorCount=0;const cache=new Map(),pending=new Map();
 const metadataReady=fetch(MAP_CDN).then(r=>{if(!r.ok)throw new Error(`Map metadata ${r.status}`);return r.json();}).then(m=>metadata=m).catch(onError);
 const drawTile=(layers,x,y,z)=>{const node=make('g'),clipId=`fleet-tile-${z}-${x}-${y}`,clip=make('clipPath',{id:clipId}),body=make('g',{'clip-path':`url(#${clipId})`});clip.append(make('rect',{x:0,y:0,width:256,height:256}));node.append(clip,body);for(const name of ['landuse','park','water','waterway','transportation','building']){const layer=layers.find(l=>l.name===name);if(!layer)continue;const part=make('g');const [fill,stroke]=colors[name];for(const f of layer.features){if(name==='transportation'&&f.properties.class==='rail')continue;const d=f.paths.map(path=>path.map((p,i)=>`${i?'L':'M'}${p[0]},${p[1]}`).join(' ')+(f.type===3?'Z':'')).join(' ');part.append(make('path',{d,fill:f.type===3?fill:'none',stroke,'stroke-width':name==='transportation'?2.5:.6,'vector-effect':'non-scaling-stroke','fill-rule':'evenodd','stroke-linejoin':'round'}));}part.setAttribute('transform',`scale(${256/layer.extent})`);body.append(part);}return {node,x,y,z};};
 function position(tile,left,top,zoom){const k=2**(zoom-tile.z);tile.node.setAttribute('transform',`translate(${tile.x*256*k-left},${tile.y*256*k-top}) scale(${k})`);}
 let latest=null;
 function update({left,top,width,height,zoom}){if(disposed)return;latest={left,top,width,height,zoom};if(!metadata){metadataReady.then(()=>{if(metadata&&!disposed)update(latest);});return;}
  const z=Math.min(Math.floor(zoom),metadata.maxzoom||14),k=2**(zoom-z),minX=Math.floor(left/(256*k)),minY=Math.floor(top/(256*k)),maxX=Math.floor((left+width)/(256*k)),maxY=Math.floor((top+height)/(256*k));const next=`${z}/${minX}/${minY}/${maxX}/${maxY}`;
  if(next!==signature){signature=next;wanted=new Set();for(let x=minX;x<=maxX;x++)for(let y=minY;y<=maxY;y++){const key=`${z}/${x}/${y}`;wanted.add(key);if(!cache.has(key)&&!pending.has(key)){const controller=new AbortController();pending.set(key,controller);const url=metadata.tiles[0].replace('{z}',z).replace('{x}',x).replace('{y}',y);fetch(url,{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error(`Map tile ${r.status}`);return r.arrayBuffer();}).then(bytes=>{if(disposed)return;const tile=drawTile(decodeVectorTile(bytes),x,y,z);cache.set(key,tile);if(wanted.has(key)){group.append(tile.node);position(tile,latest.left,latest.top,latest.zoom);}}).catch(e=>{if(e.name!=='AbortError'){errorCount++;onError(e);}}).finally(()=>{if(pending.get(key)===controller)pending.delete(key);});}}
   for(const[key,controller]of pending)if(!wanted.has(key)){controller.abort();pending.delete(key);}
   for(const[key,tile]of cache){if(wanted.has(key)&&tile.node.parentNode!==group)group.append(tile.node);if(!wanted.has(key))tile.node.remove();}
   // Bounded in-memory geometry cache. No prefetch and no offline archive.
   if(cache.size>48)for(const[key,tile]of cache){if(!wanted.has(key)){tile.node.remove();cache.delete(key);if(cache.size<=40)break;}}
  }
  for(const[key,tile]of cache)if(wanted.has(key))position(tile,left,top,zoom);
 }
 return{update,getMetrics(){return{ready:cache.size>0,loadedTiles:cache.size,pendingTiles:pending.size,metadataLoaded:!!metadata,errorCount};},dispose(){disposed=true;pending.forEach(c=>c.abort());pending.clear();cache.clear();group.replaceChildren();}};
}
