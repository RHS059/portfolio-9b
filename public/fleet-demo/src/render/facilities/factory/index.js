import { createDiagramBuilder } from '../depot/geometry.js';
import { createSorter } from '../illustration/models.js';
import { bindIllustrativeMotion } from '../illustration/motion.js';
import { createFactoryWorkcells } from './workcells.js';
import { factoryProcess } from './process-view.js';
import {FACTORY_FLOOR_Z} from './assembly-plan.js';
import {outputHandoffPose} from './output-handoff.js';
import {transferMountEntries,TRANSFER_STATIONS} from './transfer-stations.js';
export {sampleOutputTransfer,outputHandoffPose,OUTPUT_HANDOFF} from './output-handoff.js';
export {createProductCarrier,PRODUCT_CARRIER} from './carrier.js';
export {createAssemblyProduct} from './product.js';

export const FACTORY_DIMENSIONS = Object.freeze({ width:150, depth:90, height:12 });

/** Fictional factory use/interior at a renderer-owned geographic anchor. */
export function createFactory({ THREE }) {
  const b=createDiagramBuilder(THREE),overviewBuilder=createDiagramBuilder(THREE);
  b.box(150,90,0.25,0,0,-0.125,'ground');b.rectangle(0,0,149,89,0.04);
  b.box(145,0.45,8,0,42,4,'face');
  b.box(0.45,81,1.4,-72,1.5,0.7,'face');b.box(0.45,81,1.4,72,1.5,0.7,'face');
  for(const x of [-70,-35,0,35,70]){b.box(.7,.7,11.5,x,41,5.75,'muted');b.line([[x,-36,8],[x,41,11.5]]);}
  b.line([[-70,-36,8],[70,-36,8]]);
  for(const x of [-60,-49])for(const y of [13,24,35]){b.box(7,6,0.3,x,y,0.15,'muted');b.box(5.8,4.8,3,x,y,1.8,'paper');}
  b.text('INCOMING',-52,-9,0.04,0.45);b.rectangle(-52,20,30,43,0.04);
  for(const x of [-16,9])for(const y of [5,27]){
    overviewBuilder.box(13,10,0.4,x,y,1.5,'paper');for(const dx of [-5,5])overviewBuilder.box(0.7,8,1.2,x+dx,y,0.7,'muted');
  }
  b.text('ASSEMBLY',-3,-9,0.04,0.5);b.rectangle(-3,16,54,42,0.04);
  overviewBuilder.box(8.4,3.3,.12,42,26,.915,'paper');b.rectangle(42,26,20,14,0.44);b.text('QA',42,15,0.04,.7);
  for(const x of[50,62])overviewBuilder.box(3.2,3.525,.12,x,-14.5625,.915,'face');
  b.text('DISPATCH',53,-25,0.04,.45);for(const x of [-34,25])b.line([[x,-25,0.04],[x,35,0.04]]);
  for(const x of[-65.3,-49.3,18.7,46.7])b.box(8,10.9,.25,x,-49.45,-.125,'ground');
  const group=new THREE.Group();group.name='centerpoint';const structure=b.finish('factory-structure'),overview=overviewBuilder.finish('factory-overview'),detail=createFactoryWorkcells({THREE});for(const child of[structure,overview,detail])child.position.z=FACTORY_FLOOR_Z;detail.visible=false;group.add(structure,overview,detail);
  const mounts=new Map();for(const cell of detail.userData.mounts)for(const [kind,key] of[['input','input'],['output','output'],['carrier-output','carrier'],['dispatch-pickup','pickup']]){const mount=new THREE.Group();mount.name='cell:'+cell.id+':'+kind;mount.position.fromArray(cell[key]);mount.userData={anchorId:mount.name,coordinateSpace:'site-root',supportOrigin:'bottom-center'};group.add(mount);mounts.set(mount.name,mount);}
  for(const entry of transferMountEntries()){const mount=new THREE.Group();mount.name=entry.id;mount.position.fromArray(entry.position);mount.userData={anchorId:entry.id,coordinateSpace:'site-root',supportOrigin:'carrier-bottom'};group.add(mount);mounts.set(entry.id,mount);}
  const a=createSorter({THREE,name:'factory-sorter-01'}),c=createSorter({THREE,name:'factory-sorter-02'}),sorting=new THREE.Group();sorting.position.z=FACTORY_FLOOR_Z;sorting.add(a,c);group.add(sorting);
  bindIllustrativeMotion(sorting,[{object:a,points:[[-34,-20],[-34,36],[25,36],[25,-20],[-34,-20]],period:58,offset:0},{object:c,points:[[25,-20],[45,-20],[45,6],[25,6],[25,-20]],period:37,offset:.35}]);
  let disposed=false,lastSnapshot={};
  group.userData={siteId:'centerpoint',kind:'factory',fictional:true,label:'Fictional drone assembly / sorting / dispatch',dimensions:FACTORY_DIMENSIONS,bounds:{min:[-75,-54.9,-.25],max:[75,45,12]},floorZ:FACTORY_FLOOR_Z,detailLevel:'overview',workcells:detail.userData.workcells,
    setDetailLevel(level){if(disposed||!['overview','detail'].includes(level))return;overview.visible=level==='overview';detail.visible=level==='detail';group.userData.detailLevel=level;if(detail.visible)detail.userData.update(lastSnapshot);},
    update(snapshot){if(disposed||snapshot===lastSnapshot)return;lastSnapshot=snapshot||{};sorting.visible=!factoryProcess(lastSnapshot);if(sorting.visible)sorting.userData.update(lastSnapshot);if(detail.visible)detail.userData.update(lastSnapshot);},
    getAssemblyState(){return detail.userData.assemblyState;},
    getHandledCargoIds(){return Object.freeze([]);},
    getCellMounts(){return detail.userData.mounts;},
    getMount(id){const direct=mounts.get(id);if(direct)return direct;const qa=/^qa:QA-01:[^:]+:(input|test|output)$/.exec(id);return qa?mounts.get('qa:QA-01:'+qa[1]):null;},
    getTransferMounts(){return TRANSFER_STATIONS;},
    getOutputHandoff(id,progress){const cell=detail.userData.workcells.find(c=>c.id===id);if(!cell)return null;const pose=outputHandoffPose(progress),point=p=>p?Object.freeze([cell.x+p[0],cell.y+p[1],p[2]]):null;return Object.freeze({...pose,carrierPosition:point(pose.carrierPosition),gripPoint:point(pose.gripPoint),productSupport:point(pose.productSupport),tool:point(pose.tool),contact:point(pose.contact),coordinateSpace:'site-root'});},
    setCellPoses(cells){if(disposed)return;lastSnapshot={process:{factoryAssembly:{cells}}};sorting.visible=false;detail.userData.update(lastSnapshot);},
    dispose(){if(disposed)return;disposed=true;sorting.userData.dispose();detail.userData.dispose();}
  };
  return group;
}
