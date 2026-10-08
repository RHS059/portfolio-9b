import { createPortCargo } from './process-assets.js';
import { PORT_PROCESS_DIMENSIONS as D } from './process-layout.js';
import { resolvePortCargo, validatePortAnchorBindings } from './process-motion.js';

const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
/** Four reusable meshes, two hoists, no timer/clock, inventory counter or process state machine. */
export function createPortProcessController({THREE,group,assets,layouts}) {
  const T=THREE,pool=Array.from({length:4},(_,i)=>{
    const object=createPortCargo(T);object.name=`tracked-port-cargo-slot-${i+1}`;group.add(object);return {object,cargoId:null,resolved:null};
  });
  let anchors=new Map(),disposed=false,externalCargo=false,status='idle-awaiting-snapshot';
  function park(){assets.forEach(a=>{a.spreader.rotation.z=0;a.poseHoist(0,34);});}
  function hide(){pool.forEach(s=>{s.object.visible=false;s.cargoId=null;s.resolved=null;s.object.userData={kind:'process-cargo',cargoId:null,owner:null};});}
  function bind(bindings){if(disposed)return false;anchors=validatePortAnchorBindings(bindings,layouts.length);hide();park();status='idle-awaiting-snapshot';return true;}
  function update(snapshot){
    if(disposed)return;
    const previous=new Map(pool.filter(s=>s.cargoId).map(s=>[s.cargoId,s]));
    hide();park();
    const cargos=snapshot?.process?.cargo;
    if(!Array.isArray(cargos)){status='idle-awaiting-snapshot';return;}
    if(cargos.length>pool.length){status='invalid-cargo-capacity';return;}
    if(!anchors.size){status='awaiting-anchor-bindings';return;}
    const ids=cargos.map(c=>c?.id);
    if(new Set(ids).size!==ids.length){status='invalid-duplicate-cargo';return;}
    const resolved=cargos.map(c=>resolvePortCargo(c,anchors)).filter(Boolean);
    const busy=new Set();
    // Overlapping hoist claims fail closed instead of showing two loads on one hook.
    for(const r of resolved.filter(r=>r.attachedToHoist)){
      if(busy.has(r.berthIndex)){status='invalid-hoist-occupancy';return;}busy.add(r.berthIndex);
    }
    const reserved=new Set(resolved.map(r=>previous.get(r.cargoId)).filter(Boolean));
    const free=pool.filter(s=>!reserved.has(s));
    for(const r of resolved){
      const slot=previous.get(r.cargoId)||free.shift(),asset=assets[r.berthIndex],layout=layouts[r.berthIndex];
      slot.cargoId=r.cargoId;slot.resolved=r;slot.object.visible=!externalCargo;
      slot.object.position.fromArray(r.position);slot.object.rotation.z=r.rotationZ??layout.rotationZ;
      slot.object.userData=freeze({kind:'process-cargo',cargoId:r.cargoId,transferId:r.transferId,owner:{...r.owner},anchorId:r.owner.anchorId});
      if(r.attachedToHoist){
        // Convert the resolved facility-local cargo pose back into the berth frame.
        const dx=r.position[0]-layout.origin[0],dy=r.position[1]-layout.origin[1];
        const x=dx*Math.cos(layout.rotationZ)+dy*Math.sin(layout.rotationZ);
        const y=-dx*Math.sin(layout.rotationZ)+dy*Math.cos(layout.rotationZ);
        asset.spreader.rotation.z=(r.rotationZ??layout.rotationZ)-layout.rotationZ;
        asset.poseHoist(y,r.position[2]+D.spreaderOffset,x);
      }
    }
    status='snapshot-applied';
  }
  function inspect(){
    group.updateWorldMatrix(true,true);
    return freeze({status,cargoRenderer:externalCargo?'external':'local',anchorCount:anchors.size,capacity:pool.length,cargo:pool.map((s,i)=>({
      slot:i,cargoId:s.cargoId,visible:s.object.visible,owner:s.resolved?{...s.resolved.owner}:null,
      anchorId:s.resolved?.owner.anchorId??null,transferId:s.resolved?.transferId??null,
      position:s.object.position.toArray(),worldPosition:s.object.getWorldPosition(new T.Vector3()).toArray(),
      worldQuaternion:s.object.getWorldQuaternion(new T.Quaternion()).toArray(),
    }))});
  }
  function setCargoRenderer(mode){if(disposed)return false;if(!['local','external'].includes(mode))throw new TypeError('Cargo renderer must be local or external');externalCargo=mode==='external';pool.forEach(s=>s.object.visible=!!s.resolved&&!externalCargo);return true;}
  function dispose(){disposed=true;status='disposed';}
  return {bind,update,inspect,dispose,setCargoRenderer,getStatus:()=>status};
}
