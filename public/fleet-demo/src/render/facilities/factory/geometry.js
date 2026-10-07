import { FACILITY_THEME } from '../depot/geometry.js';

/** Palette-batched original solids and crease outlines, authored in meters. */
export function createFactoryGeometry(THREE) {
  const T=THREE,buckets=new Map(),edges=[];
  function add(source,position=[0,0,0],rotation=[0,0,0],scale=[1,1,1],tone='paper',outline=true){
    const matrix=new T.Matrix4().compose(new T.Vector3(...position),new T.Quaternion().setFromEuler(new T.Euler(...rotation)),new T.Vector3(...scale));source.applyMatrix4(matrix);
    if(outline){const e=new T.EdgesGeometry(source,30);edges.push(...e.getAttribute('position').array);e.dispose();}
    const geometry=source.index?source.toNonIndexed():source,b=buckets.get(tone)||{p:[],n:[]};b.p.push(...geometry.getAttribute('position').array);b.n.push(...geometry.getAttribute('normal').array);buckets.set(tone,b);
    if(geometry!==source)geometry.dispose();source.dispose();
  }
  const box=(w,d,h,x,y,z,tone='paper',rz=0)=>add(new T.BoxGeometry(w,d,h),[x,y,z],[0,0,rz],[1,1,1],tone);
  const cylinder=(r,h,x,y,z,tone='muted',rotation=[Math.PI/2,0,0],segments=12)=>add(new T.CylinderGeometry(r,r,h,segments),[x,y,z],rotation,[1,1,1],tone);
  const ellipsoid=(rx,ry,rz,x,y,z,tone='paper')=>add(new T.SphereGeometry(1,12,6),[x,y,z],[0,0,0],[rx,ry,rz],tone);
  function link(a,b,width,depth,tone='muted'){
    const from=new T.Vector3(...a),to=new T.Vector3(...b),delta=to.clone().sub(from),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),delta.clone().normalize());
    const g=new T.BoxGeometry(width,depth,delta.length());g.applyMatrix4(new T.Matrix4().makeRotationFromQuaternion(q));add(g,from.add(to).multiplyScalar(.5).toArray(),[0,0,0],[1,1,1],tone);
  }
  function finish(name){
    const group=new T.Group();group.name=name;
    for(const[tone,b]of buckets){const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(b.p,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(b.n,3));geometry.computeBoundingSphere();const mesh=new T.Mesh(geometry,new T.MeshLambertMaterial({color:FACILITY_THEME[tone],side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1}));mesh.name=name+'-'+tone;group.add(mesh);}
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(edges,3));geometry.computeBoundingSphere();const line=new T.LineSegments(geometry,new T.LineBasicMaterial({color:FACILITY_THEME.ink}));line.name=name+'-outlines';group.add(line);return group;
  }
  return {add,box,cylinder,ellipsoid,link,finish};
}

/** Shared primitive instances plus a single outline per primitive type. */
export function createArticulatedInstances(THREE,definitions){
  const T=THREE,group=new T.Group();group.name='assembly-articulation';const buckets=new Map(),index=new Map();
  for(const d of definitions){const list=buckets.get(d.shape||'box')||[];list.push(d);buckets.set(d.shape||'box',list);}
  for(const[shape,list]of buckets){
    const geometry=shape==='cylinder'?new T.CylinderGeometry(.5,.5,1,12):new T.BoxGeometry(1,1,1);if(shape==='cylinder')geometry.rotateX(Math.PI/2);
    const material=new T.MeshLambertMaterial({color:0xffffff,side:T.DoubleSide});const mesh=new T.InstancedMesh(geometry,material,list.length);mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;mesh.name='articulated-'+shape;
    const edge=new T.EdgesGeometry(geometry,30),unit=Float32Array.from(edge.getAttribute('position').array);edge.dispose();const lineGeometry=new T.BufferGeometry();lineGeometry.setAttribute('position',new T.BufferAttribute(new Float32Array(unit.length*list.length),3).setUsage(T.DynamicDrawUsage));const lines=new T.LineSegments(lineGeometry,new T.LineBasicMaterial({color:FACILITY_THEME.ink}));lines.frustumCulled=false;lines.name=mesh.name+'-outlines';group.add(mesh,lines);
    list.forEach((d,i)=>{mesh.setColorAt(i,new T.Color(FACILITY_THEME[d.tone||'paper']));index.set(d.id,{mesh,lines,unit,index:i});});
  }
  const p=new T.Vector3(),s=new T.Vector3(),q=new T.Quaternion(),m=new T.Matrix4(),v=new T.Vector3(),z=new T.Vector3(0,0,1);
  function set(id,position,scale,quaternion=null){
    const b=index.get(id);if(!b)return;p.fromArray(position);s.fromArray(scale);quaternion?q.copy(quaternion):q.identity();m.compose(p,q,s);b.mesh.setMatrixAt(b.index,m);const out=b.lines.geometry.getAttribute('position').array,offset=b.index*b.unit.length;
    for(let i=0;i<b.unit.length;i+=3){v.fromArray(b.unit,i).applyMatrix4(m);out[offset+i]=v.x;out[offset+i+1]=v.y;out[offset+i+2]=v.z;}
  }
  function between(id,a,b,width,depth){const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start);set(id,start.add(end).multiplyScalar(.5).toArray(),[width,depth,delta.length()],new T.Quaternion().setFromUnitVectors(z,delta.normalize()));}
  function axis(id,position,scale,direction){set(id,position,scale,new T.Quaternion().setFromUnitVectors(z,new T.Vector3(...direction).normalize()));}
  function commit(){for(const child of group.children){if(child.isInstancedMesh){child.instanceMatrix.needsUpdate=true;if(child.instanceColor)child.instanceColor.needsUpdate=true;}else child.geometry.getAttribute('position').needsUpdate=true;}}
  group.userData.partIds=Object.freeze(definitions.map(d=>d.id));return{group,set,between,axis,commit};
}
