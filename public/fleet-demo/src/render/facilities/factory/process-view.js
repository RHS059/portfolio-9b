const clamp = value => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
const STAGES = new Set(['idle','box-opening','drone-assembly','complete']);
const ACTIONS = new Set(['open-box','assemble-drone','handoff-output','park']);
export const factoryProcess = snapshot => snapshot?.process || snapshot?.cargoProcess || (Array.isArray(snapshot?.cargo)&&snapshot?.factoryAssembly?snapshot:null);
/** Read-only projection of the agreed process snapshot; never advances its state. */
export function factoryCellView(snapshot, id) {
  const process = factoryProcess(snapshot);
  const cells = process?.factoryAssembly?.cells || snapshot?.factoryAssembly?.cells || [];
  const cell = Array.isArray(cells) ? cells.find(c=>c?.id===id) : null;
  const connected = !!process;
  const active = cell?.active === true;
  const cargoId = typeof cell?.cargoId === 'string' && cell.cargoId ? cell.cargoId : null;
  const stage = STAGES.has(cell?.stage) ? cell.stage : 'idle';
  const armAction = ACTIONS.has(cell?.armAction) ? cell.armAction : 'park';
  // Older explicit mechanical previews are poses only, never claimed as live cargo.
  const legacyPose = !connected && cell && cell.active === undefined && Number.isFinite(cell.progress);
  return Object.freeze({id,connected,active,cargoId,stage,armAction,
    outputProductId:typeof cell?.outputProductId==='string'?cell.outputProductId:null,
    outputTransferProgress:clamp(cell?.outputTransferProgress),
    progress:clamp(cell?.progress),boxOpen:clamp(cell?.boxOpen),assemblyProgress:clamp(cell?.assemblyProgress),
    hasMaterial:active&&!!cargoId&&stage!=='idle'&&(!Array.isArray(process?.cargo)||process.cargo.some(c=>c?.id===cargoId)),legacyPose:!!legacyPose});
}
export function factoryHandledCargoIds(snapshot, ids) {
  const values=ids.map(id=>factoryCellView(snapshot,id)).filter(c=>c.hasMaterial).map(c=>c.cargoId);
  // A duplicated active ID is a contract problem, not permission to render two copies.
  return Object.freeze(values.filter((id,i)=>values.indexOf(id)===i&&values.lastIndexOf(id)===i));
}
