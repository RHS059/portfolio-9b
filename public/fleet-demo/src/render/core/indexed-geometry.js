/** Weld only bit-identical static attributes before a model's first GPU upload. */
export function indexStaticMeshGeometry(THREE,root){
 const seen=new Set(),stats={geometries:0,indexedGeometries:0,sourceVertices:0,storedVertices:0,sourceBytes:0,storedBytes:0};
 root?.traverse?.(object=>{
  const geometry=object.isMesh?object.geometry:null;if(!geometry||seen.has(geometry))return;seen.add(geometry);
  const attributes=Object.entries(geometry.attributes||{}),position=geometry.getAttribute('position');
  if(!position||geometry.index||Object.values(geometry.morphAttributes||{}).some(list=>list.length)||attributes.some(([,a])=>a.isInterleavedBufferAttribute||!(a.array instanceof Float32Array)||a.count!==position.count||a.usage!==THREE.StaticDrawUsage))return;
  const count=position.count,bytes=attributes.reduce((sum,[,a])=>sum+a.array.byteLength,0),streams=attributes.map(([name,a])=>({name,attribute:a,bits:new Uint32Array(a.array.buffer,a.array.byteOffset,a.array.length)})),tuples=new Map(),sources=[],indices=new Uint32Array(count);
  for(let i=0;i<count;i++){
   let key='';for(const {attribute,bits}of streams)for(let j=0;j<attribute.itemSize;j++)key+=bits[i*attribute.itemSize+j]+',';
   let index=tuples.get(key);if(index===undefined){index=sources.length;tuples.set(key,index);sources.push(i);}indices[i]=index;
  }
  const unique=sources.length,indexBytes=count*(unique<=65535?2:4),newBytes=unique*bytes/count+indexBytes;
  stats.geometries++;stats.sourceVertices+=count;stats.sourceBytes+=bytes;
  if(unique>=count||newBytes>=bytes){stats.storedVertices+=count;stats.storedBytes+=bytes;return;}
  for(const {name,attribute,bits}of streams){const data=new Float32Array(unique*attribute.itemSize),destination=new Uint32Array(data.buffer);sources.forEach((source,index)=>{for(let j=0;j<attribute.itemSize;j++)destination[index*attribute.itemSize+j]=bits[source*attribute.itemSize+j];});const replacement=new THREE.BufferAttribute(data,attribute.itemSize,attribute.normalized);replacement.setUsage(attribute.usage);geometry.setAttribute(name,replacement);}
  geometry.setIndex(new THREE.BufferAttribute(unique<=65535?new Uint16Array(indices):indices,1));
  stats.indexedGeometries++;stats.storedVertices+=unique;stats.storedBytes+=newBytes;
 });
 return Object.freeze(stats);
}
