/** Minimal original MVT 2.x reader for the WebGL-free map fallback.
 * Protocol: https://github.com/mapbox/vector-tile-spec/tree/master/2.1
 * No third-party decoder dependency; deliberately keeps only visible background geometry.
 */
const decoder=new TextDecoder();
class Reader{
 constructor(bytes){this.bytes=bytes;this.pos=0;}
 get done(){return this.pos>=this.bytes.length;}
 uint(){let value=0,multiplier=1;for(let i=0;i<10;i++){if(this.done)throw new Error('Truncated vector tile');const byte=this.bytes[this.pos++];value+=(byte&127)*multiplier;if(!(byte&128))return value;multiplier*=128;}throw new Error('Invalid vector tile integer');}
 data(){const length=this.uint(),end=this.pos+length;if(end>this.bytes.length)throw new Error('Truncated vector tile field');const value=this.bytes.subarray(this.pos,end);this.pos=end;return value;}
 string(){return decoder.decode(this.data());}
 skip(wire){if(wire===0)this.uint();else if(wire===1)this.pos+=8;else if(wire===2)this.data();else if(wire===5)this.pos+=4;else throw new Error('Unsupported vector tile field');if(this.pos>this.bytes.length)throw new Error('Truncated vector tile');}
}
const packed=bytes=>{const r=new Reader(bytes),out=[];while(!r.done)out.push(r.uint());return out;};
function feature(bytes){const r=new Reader(bytes),out={type:0,tags:[],commands:[]};while(!r.done){const tag=r.uint(),field=tag>>3;if(field===2)out.tags=packed(r.data());else if(field===3)out.type=r.uint();else if(field===4)out.commands=packed(r.data());else r.skip(tag&7);}return out;}
function value(bytes){const r=new Reader(bytes);while(!r.done){const tag=r.uint();if(tag===10)return r.string();r.skip(tag&7);}return null;}
export function geometryPaths(commands){let x=0,y=0,index=0,path=[],paths=[];const signed=n=>(n&1)?-(n+1)/2:n/2;while(index<commands.length){const header=commands[index++],id=header&7,count=Math.floor(header/8);if(count<1||count>1000000)throw new Error('Invalid vector geometry');if(id===7){if(path.length)path.push([...path[0]]);continue;}if(id!==1&&id!==2)throw new Error('Unknown vector command');for(let i=0;i<count;i++){if(index+1>=commands.length)throw new Error('Truncated vector geometry');x+=signed(commands[index++]);y+=signed(commands[index++]);if(id===1&&path.length){paths.push(path);path=[];}path.push([x,y]);}}if(path.length)paths.push(path);return paths;}
export function decodeVectorTile(buffer,wanted=new Set(['water','waterway','park','landuse','transportation','building'])){
 const r=new Reader(buffer instanceof Uint8Array?buffer:new Uint8Array(buffer)),layers=[];
 while(!r.done){const tag=r.uint();if(tag!==26){r.skip(tag&7);continue;}const raw=r.data(),l=new Reader(raw),out={name:'',extent:4096,version:1,features:[]},features=[],keys=[],values=[];
  while(!l.done){const t=l.uint(),field=t>>3;if(field===1)out.name=l.string();else if(field===2)features.push(l.data());else if(field===3)keys.push(l.string());else if(field===4)values.push(value(l.data()));else if(field===5)out.extent=l.uint();else if(field===15)out.version=l.uint();else l.skip(t&7);}
  if(!wanted.has(out.name)||out.version>2||out.extent<1)continue;
  for(const rawFeature of features){const f=feature(rawFeature);if(f.type<2)continue;const properties={};for(let i=0;i<f.tags.length;i+=2){const key=keys[f.tags[i]];if(key==='class'||key==='name')properties[key]=values[f.tags[i+1]];}out.features.push({type:f.type,properties,paths:geometryPaths(f.commands)});}
  layers.push(out);
 }return layers;
}
