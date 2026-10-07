import { PORT_PROCESS_DIMENSIONS as D } from './process-layout.js';

const finitePoint = p => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite);
const smooth = p => p * p * (3 - 2 * p);
const mix = (a, b, p) => a + (b - a) * p;
/** Visual choreography only. All progress comes from the immutable process snapshot. */
export function samplePortTransfer(from, to, progress) {
  if (!finitePoint(from) || !finitePoint(to) || !Number.isFinite(progress)) return null;
  const p = Math.max(0, Math.min(1, progress));
  const lift = Math.max(D.transferHeight, from[2], to[2]);
  if (p < .25) return [from[0], from[1], mix(from[2], lift, smooth(p * 4))];
  if (p < .75) {const t=smooth((p-.25)*2);return [mix(from[0],to[0],t),mix(from[1],to[1],t),lift];}
  return [to[0], to[1], mix(lift,to[2],smooth((p-.75)*4))];
}

/** Reject malformed and conflicting attachment facts instead of choosing an owner. */
export function resolvePortCargo(cargo, anchors) {
  if (!cargo || typeof cargo.id !== 'string' || !cargo.id || !cargo.owner || !cargo.attachment) return null;
  if (!['ship', 'crane'].includes(cargo.owner.kind)) return null;
  if (cargo.attachment.parentId !== cargo.owner.id || cargo.attachment.anchorId !== cargo.owner.anchorId) return null;
  const anchor = anchors.get(cargo.owner.anchorId);
  if (!anchor || anchor.parentId !== cargo.owner.id || anchor.ownerKind !== cargo.owner.kind) return null;
  let position = anchor.position;
  if (cargo.owner.kind === 'crane' && cargo.motion) {
    const from = anchors.get(cargo.motion.fromAnchorId), to = anchors.get(cargo.motion.toAnchorId);
    if (!from || !to || from.berthIndex !== anchor.berthIndex || to.berthIndex !== anchor.berthIndex) return null;
    position = samplePortTransfer(from.position, to.position, cargo.motion.progress);
    if (!position) return null;
  }
  return { cargoId:cargo.id, transferId:cargo.transferId??null, owner: {...cargo.owner}, berthIndex:anchor.berthIndex, position:position.slice(), rotationZ:anchor.rotationZ, attachedToHoist:cargo.owner.kind==='crane' };
}

/** Bind symbolic domain anchors to renderer-owned local metre poses once. */
export function validatePortAnchorBindings(bindings, berthCount) {
  if (!Array.isArray(bindings) || bindings.length > 32) throw new TypeError('Bounded port anchor bindings are required');
  const map=new Map();
  for(const a of bindings) {
    if(!a || typeof a.id!=='string' || !a.id || map.has(a.id) || typeof a.parentId!=='string' || !a.parentId ||
       !['ship','crane','trailer'].includes(a.ownerKind) || !Number.isInteger(a.berthIndex) || a.berthIndex<0 || a.berthIndex>=berthCount || !finitePoint(a.position) || (a.rotationZ!==undefined&&!Number.isFinite(a.rotationZ)))throw new TypeError('Invalid or duplicate port anchor binding');
    map.set(a.id,Object.freeze({...a,position:Object.freeze(a.position.slice())}));
  }
  return map;
}
