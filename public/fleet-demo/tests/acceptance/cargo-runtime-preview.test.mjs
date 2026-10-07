import test from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=process.env.FLEET_DEMO_ROOT||fileURLToPath(new URL('../../',import.meta.url));
const load=p=>import(pathToFileURL(resolve(root,p)));
let T;try{T=await import(process.env.FLEET_THREE_MODULE||'three');}catch(e){if(process.env.FLEET_THREE_MODULE||e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
const [{createFacilities},{placeFacilityGroups},{createCargoRenderer},{sampleCargoProcess},{OICT_GEOGRAPHY},{normalizeCargoProcess,interpolateCargoProcess}]=await Promise.all([
 load('src/render/facilities/index.js'),load('src/render/core/facilities-adapter.js'),load('src/render/core/cargo-renderer.js'),load('src/core/cargo-process.js'),load('src/render/map/oict-geography.js'),load('src/render/core/cargo-snapshot.js')]);
const check=(name,fn)=>test(name,{skip:T?false:'Actual Three runtime is required'},fn);
const near=(a,b,e=1e-5)=>assert.ok(Math.hypot(...a.map((v,i)=>v-b[i]))<e,`${a} != ${b}`);
const visible=o=>!o||o.visible&&visible(o.parent);
function setup(){const scene=new T.Scene(),facilities=createFacilities({THREE:T,geography:{oict:OICT_GEOGRAPHY}});placeFacilityGroups(facilities);scene.add(facilities);const factory=facilities.children.find(o=>o.userData.siteId==='centerpoint');factory.userData.setDetailLevel('detail');const runtime=createCargoRenderer({THREE:T,scene,facilities});return{scene,facilities,factory,runtime,update(process){runtime.update({cargoProcess:normalizeCargoProcess(process)});scene.updateMatrixWorld(true);},dispose(){runtime.dispose();facilities.userData.dispose?.();}};}
function materialNodes(scene){const map=new Map();scene.getObjectByName('connected-cargo').traverse(o=>{if(!o.userData.cargoId)return;const id=o.userData.cargoId;if(!map.has(id))map.set(id,[]);map.get(id).push(o);});return map;}
const vector=o=>o.getWorldPosition(new T.Vector3()).toArray();
function physicalState(scene){const material=[];for(const[id,nodes]of materialNodes(scene))for(const node of nodes){const p=new T.Vector3(),q=new T.Quaternion(),s=new T.Vector3();node.matrixWorld.decompose(p,q,s);material.push({id,owner:node.parent.userData.ownerId,visible:visible(node),p:p.toArray(),q:q.toArray(),s:s.toArray()});}return material.sort((a,b)=>a.id.localeCompare(b.id));}
function instancesAt(group,point,size){let n=0;group.traverse(o=>{if(!o.isInstancedMesh||!visible(o))return;for(let i=0;i<o.count;i++){const m=new T.Matrix4(),p=new T.Vector3(),q=new T.Quaternion(),s=new T.Vector3();o.getMatrixAt(i,m);m.premultiply(o.matrixWorld).decompose(p,q,s);if(p.distanceTo(new T.Vector3(...point))<1e-5&&s.distanceTo(new T.Vector3(...size))<1e-5)n++;}});return n;}

check('connected inbound renderer keeps one actual node per first-batch identity through custody changes, hold and rewind',()=>{
 const h=setup(),uuids=new Map();let observed=0;
 try{for(const offset of[0,102.5]){const times=new Set([0,214,512,1e8]);for(let t=0;t<=214;t+=1)times.add(t);for(let slot=0;slot<4;slot++)for(const boundary of[6,16,22,26,58,62,72,77,78,87,88,94,118])for(const epsilon of[-1e-7,0,1e-7])if(slot*32+boundary-offset+epsilon>=0)times.add(slot*32+boundary-offset+epsilon);
 let previous;for(const time of [...times].sort((a,b)=>a-b)){
  const process=sampleCargoProcess(time,{paused:true,outgoingEnabled:false,presentationOffsetSeconds:offset}),before=JSON.stringify(process);h.update(process);const nodes=materialNodes(h.scene);
  assert.equal(nodes.size,8);assert.equal(JSON.stringify(process),before);
  for(const item of[...process.cargo,...process.products]){const matches=nodes.get(item.id);assert.equal(matches?.length,1,item.id);const node=matches[0];let drawn=0;h.scene.traverse(o=>{if(o.userData.cargoId===item.id&&visible(o))drawn++;});assert.equal(drawn,item.visible!==false&&!['consumed','fleet'].includes(item.owner.kind)?1:0);assert.equal(node.parent.userData.ownerId,item.owner.id);assert.equal(visible(node),item.visible!==false&&!['consumed','fleet'].includes(item.owner.kind),item.id);assert.deepEqual(node.scale.toArray(),[1,1,1]);if(uuids.has(item.id))assert.equal(node.uuid,uuids.get(item.id));else uuids.set(item.id,node.uuid);}
  assert.ok(![...nodes.keys()].some(id=>!id.endsWith('-B0001')));assert.equal(h.scene.getObjectByName('OUTBOUND-501'),undefined);
  const physical=physicalState(h.scene);if(previous&&time-previous.time<1e-5){for(const after of physical){const before=previous.physical.find(p=>p.id===after.id);if(before.visible&&after.visible){near(before.p,after.p,1e-4);const q1=new T.Quaternion().fromArray(before.q),q2=new T.Quaternion().fromArray(after.q);assert.ok(q1.angleTo(q2)<1e-4,`${after.id} turns during custody transfer`);}}}previous={time,physical};
  const port=h.facilities.children.find(o=>o.userData.siteId==='oict');assert.ok(port.userData.getProcessInspection().cargo.every(c=>!c.visible));assert.deepEqual(h.factory.userData.getHandledCargoIds(),[]);assert.ok(h.factory.userData.getAssemblyState().every(c=>c.armAction!=='handoff-output'));observed++;
 }
 h.update(sampleCargoProcess(512,{outgoingEnabled:false,presentationOffsetSeconds:offset}));const hold=physicalState(h.scene).filter(s=>s.id.startsWith('DRONE-'));h.update(sampleCargoProcess(1e8,{outgoingEnabled:false,presentationOffsetSeconds:offset}));assert.deepEqual(physicalState(h.scene).filter(s=>s.id.startsWith('DRONE-')),hold);
 }assert.ok(observed>430);
 }finally{h.dispose();}
});

check('connected carton geometry and factory gripper touch the same actual flap edge at all four cells',()=>{
 const h=setup();let contacts=0;try{for(let slot=0;slot<4;slot++)for(let frame=0;frame<=128;frame++){
  h.update(sampleCargoProcess(slot*32+88+6*frame/128,{outgoingEnabled:false,paused:true}));const item=materialNodes(h.scene).get(`CARGO-0${slot+1}-B0001`)[0],carton=item.getObjectByName('parts-carton'),cell=h.factory.userData.getAssemblyState()[slot];if(!cell.contactEngaged)continue;
  const side=carton.userData.openingState.side,flap=carton.children.find(o=>o.userData.side===side);assert.ok(flap);const local=side==='right'?[-.39,0,0]:side==='left'?[.39,0,0]:side==='front'?[0,-.29,0]:[0,.29,0];
  const point=new T.Vector3(...local).applyMatrix4(flap.matrixWorld),tool=new T.Vector3(...cell.tool).applyMatrix4(h.factory.matrixWorld);near(point.toArray(),tool.toArray());contacts++;
 }assert.ok(contacts>250);}finally{h.dispose();}
});

check('connected assembly keeps each active part in exactly one source, gripper or installed location',()=>{
 const h=setup();try{for(let slot=0;slot<4;slot++)for(let op=0;op<10;op++)for(const phase of[.159,.161,.679,.681]){
  const p=(op+phase)/10;h.update(sampleCargoProcess(slot*32+94+24*p,{outgoingEnabled:false,paused:true}));const nodes=materialNodes(h.scene),cargo=nodes.get(`CARGO-0${slot+1}-B0001`)[0],carton=cargo.getObjectByName('parts-carton'),carrier=nodes.get(`DRONE-CARGO-0${slot+1}-B0001`)[0],product=carrier.getObjectByName('assembly-product'),part=product.userData.partMounts[op],state=h.factory.userData.getAssemblyState()[slot];assert.equal(state.partId,part.id);
  const source=carton.userData.pickupMount.children.filter(visible).length,tool=new T.Vector3(...state.tool).applyMatrix4(h.factory.matrixWorld).toArray(),destination=new T.Vector3(...part.point).applyMatrix4(product.matrixWorld).toArray();const held=instancesAt(h.factory.getObjectByName('factory-close-detail'),tool,part.size),installed=instancesAt(product,destination,part.size);
  assert.equal(source,phase<.16?1:0);assert.equal(held,phase>.16&&phase<.68?1:0);assert.equal(installed,phase>.68?1:0);assert.equal(source+held+installed,1,`${slot}/${part.id}/${phase}`);
 }}finally{h.dispose();}
});

check('normalization, interpolation and renderer reconstruction preserve inbound-only capabilities and exact physical state',()=>{
 const h=setup();try{for(const time of[0,15.5,23.5,102.5,214,512]){const process=sampleCargoProcess(time,{outgoingEnabled:false,paused:true,presentationOffsetSeconds:102.5});h.update(process);const initial=physicalState(h.scene);h.update(sampleCargoProcess(1e8,{outgoingEnabled:false}));h.update(process);assert.deepEqual(physicalState(h.scene),initial);const next=setup();try{next.update(process);assert.deepEqual(physicalState(next.scene),initial);}finally{next.dispose();}}
 for(let step=0;step<640;step++){const previous=normalizeCargoProcess(sampleCargoProcess(step/2,{outgoingEnabled:false,presentationOffsetSeconds:102.5})),current=normalizeCargoProcess(sampleCargoProcess(step/2+.05,{outgoingEnabled:false,presentationOffsetSeconds:102.5}));for(const alpha of[0,.25,.75,1]){const sample=interpolateCargoProcess(previous,current,alpha);assert.equal(sample.outgoingEnabled,false);assert.equal(sample.capabilities.onePassHold,true);assert.equal(sample.outboundVehicles.length,0);assert.ok(sample.cargo.every(c=>c.batch===1));}}
 }finally{h.dispose();}
});
