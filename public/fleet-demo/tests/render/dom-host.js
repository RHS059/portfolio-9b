/** Minimal standards-shaped DOM host for real fallback/scene module tests (no GPU, no network). */
export class Element extends EventTarget {
 constructor(tag){super();this.tagName=tag;this.children=[];this.style={};this.attributes={};this.parentNode=null;this.textContent='';this.hidden=false;this.offsetHeight=44;this.width=1000;this.height=700;}
 get parentElement(){return this.parentNode;}
 get firstChild(){return this.children[0];}
 get lastChild(){return this.children.at(-1);}
 setAttribute(k,v){this.attributes[k]=String(v);}
 getAttribute(k){return this.attributes[k]??null;}
 append(...nodes){for(const node of nodes){node.parentNode=this;this.children.push(node);}}
 insertBefore(node,before){node.parentNode=this;const i=this.children.indexOf(before);if(i<0)this.children.push(node);else this.children.splice(i,0,node);}
 replaceChildren(...nodes){for(const node of this.children)node.parentNode=null;this.children=[];this.append(...nodes);}
 remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(n=>n!==this);this.parentNode=null;}
 getBoundingClientRect(){return{width:this.width,height:this.height,top:0,bottom:this.height,left:0,right:this.width};}
 querySelector(selector){return this.walk().find(n=>selector.startsWith('.')?n.className===selector.slice(1):n.tagName===selector)||null;}
 walk(){return this.children.flatMap(n=>[n,...n.walk()]);}
 setPointerCapture(){}
 closest(selector){return selector==='[data-entity-id]'&&this.getAttribute('data-entity-id')?this:null;}
 get dataset(){return this._dataset ||= {};}
}
export function installDomHost(t){
 const keys=['document','window','fetch','requestAnimationFrame','cancelAnimationFrame','ResizeObserver','maplibregl','THREE'],old=new Map(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 const frames=new Map();let nextFrame=0;
 const document=Object.assign(new EventTarget(),{hidden:false,createElement:t=>new Element(t),createElementNS:(_,t)=>new Element(t)});
 Object.assign(globalThis,{document,window:new EventTarget(),maplibregl:undefined,THREE:undefined,ResizeObserver:class{observe(){}disconnect(){}},requestAnimationFrame:fn=>{frames.set(++nextFrame,fn);return nextFrame;},cancelAnimationFrame:id=>frames.delete(id),fetch:async url=>String(url).endsWith('/planet')?{ok:true,json:async()=>({tiles:['https://fixture.invalid/{z}/{x}/{y}.pbf'],maxzoom:14})}:{ok:true,arrayBuffer:async()=>new ArrayBuffer(0)}});
 t.after(()=>{for(const key of keys){const descriptor=old.get(key);if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
 return{Element,document,frames,flush(now=performance.now()){const pending=[...frames];frames.clear();for(const[,fn]of pending)fn(now);},settle:()=>new Promise(resolve=>setImmediate(resolve))};
}
