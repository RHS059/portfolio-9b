/** Original replaceable editorial vehicle assets, authored in meters, +Y forward / +Z up. */
export const THEME = Object.freeze({paper:0xf7f7f2,face:0xdedfd9,ink:0x303735,muted:0x929b95,selected:0x376c56});
export const MODEL_REGISTRY = Object.freeze({
  truck: Object.freeze([
    [2.6,12,3.1,0,-2.7,2.1,'paper'],[2.5,3,2.5,0,5.0,1.8,'face'],[2.2,.08,.8,0,6.52,2.25,'ink'],
    [2.6,15,.4,0,0,.6,'ink'],...[[-1.3,5],[1.3,5],[-1.3,-6],[1.3,-6],[-1.3,-4.8],[1.3,-4.8]].map(([x,y])=>[.4,.9,.9,x,y,.5,'ink'])
  ]),
  tractor: Object.freeze([[2.5,3,2.5,0,5,1.8,'face'],[2.2,.08,.8,0,6.52,2.25,'ink'],[2.6,7.6,.4,0,3.05,.6,'ink'],...[[-1.3,5],[1.3,5],[-1.3,0],[1.3,0],[-1.3,1.2],[1.3,1.2]].map(([x,y])=>[.4,.9,.9,x,y,.5,'ink'])]),
  trailer: Object.freeze([[2.58,8.75,.2,0,-7.155,1.23,'paper'],[.8,3.4,.18,0,-1.08,1.20,'face'],...[[-1.275,-8.28],[1.275,-8.28],[-1.275,-9.58],[1.275,-9.58]].map(([x,y])=>[.454,1,1,x,y,.55,'ink'])]),
  van: Object.freeze([[2.2,5,2.0,0,0,1.45,'paper'],[2,.1,.65,0,2.52,1.9,'ink'],...[[-1.1,1.6],[1.1,1.6],[-1.1,-1.6],[1.1,-1.6]].map(([x,y])=>[.3,.7,.7,x,y,.4,'ink'])])
});
export function createModelGeometry(T,kind){
  const positions=[],normals=[],colors=[];
  for(const [w,l,h,x,y,z,key] of MODEL_REGISTRY[kind]||MODEL_REGISTRY.truck){
    const indexed=new T.BoxGeometry(w,l,h);const g=indexed.toNonIndexed();indexed.dispose();g.translate(x,y,z);
    const p=g.getAttribute('position'),n=g.getAttribute('normal'),color=new T.Color(THEME[key]);
    for(let i=0;i<p.count;i++){positions.push(p.getX(i),p.getY(i),p.getZ(i));normals.push(n.getX(i),n.getY(i),n.getZ(i));const shade=n.getZ(i)>.5?1:n.getX(i)>.5?.88:n.getY(i)>.5?.93:.84;colors.push(color.r*shade,color.g*shade,color.b*shade);}g.dispose();
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.computeBoundingSphere();return geometry;
}
export function disposeObject(root){const geometries=new Set(),materials=new Set(),textures=new Set();root?.traverse?.(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}
/** Uniform-color instanced batches avoid vertex-color × instance-color bindings.
 * Keep original face tones, but every batch has one explicit material color.
 */
export function createModelBuckets(T,kind){
 const source=createModelGeometry(T,kind),p=source.getAttribute('position'),n=source.getAttribute('normal'),c=source.getAttribute('color'),buckets=new Map();
 for(let i=0;i<p.count;i+=3){const rgb=[c.getX(i),c.getY(i),c.getZ(i)],key=rgb.map(v=>Math.round(v*255)).join('/');let b=buckets.get(key);if(!b){b={positions:[],normals:[],color:new T.Color().setRGB(...rgb)};buckets.set(key,b);}for(let j=i;j<i+3;j++){b.positions.push(p.getX(j),p.getY(j),p.getZ(j));b.normals.push(n.getX(j),n.getY(j),n.getZ(j));}}
 source.dispose();return [...buckets.values()].map(b=>{const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(b.positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(b.normals,3));geometry.computeBoundingSphere();return{geometry,color:b.color};});
}
