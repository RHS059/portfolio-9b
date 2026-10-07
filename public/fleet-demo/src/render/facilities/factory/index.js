import { createDiagramBuilder } from '../depot/geometry.js';
import { createSorter } from '../illustration/models.js';
import { bindIllustrativeMotion } from '../illustration/motion.js';
import { createFactoryWorkcells } from './workcells.js';
import { factoryProcess } from './process-view.js';
import {FACTORY_FLOOR_Z} from './assembly-plan.js';
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
  overviewBuilder.box(18,12,0.4,42,26,0.2,'paper');b.rectangle(42,26,20,14,0.44);b.text('QA',42,15,0.04,.7);
  for(const y of [-1,-14]){overviewBuilder.box(11,10,.3,59,y,.15,'face');}
  b.text('DISPATCH',53,-25,0.04,.45);for(const x of [-34,25])b.line([[x,-25,0.04],[x,35,0.04]]);
  for(const x of[-56,-40])b.box(8,2.6,.25,x,-46.3,-.125,'ground');
  const group=new THREE.Group();group.name='centerpoint';const structure=b.finish('factory-structure'),overview=overviewBuilder.finish('factory-overview'),detail=createFactoryWorkcells({THREE});for(const child of[structure,overview,detail])child.position.z=FACTORY_FLOOR_Z;detail.visible=false;group.add(structure,overview,detail);
  const mounts=new Map();for(const cell of detail.userData.mounts)for(const kind of['input','output']){const mount=new THREE.Group();mount.name='cell:'+cell.id+':'+kind;mount.position.fromArray(cell[kind]);mount.userData={anchorId:mount.name,coordinateSpace:'site-root',supportOrigin:'bottom-center'};group.add(mount);mounts.set(mount.name,mount);}
  const a=createSorter({THREE,name:'factory-sorter-01'}),c=createSorter({THREE,name:'factory-sorter-02'}),sorting=new THREE.Group();sorting.position.z=FACTORY_FLOOR_Z;sorting.add(a,c);group.add(sorting);
  bindIllustrativeMotion(sorting,[{object:a,points:[[-34,-20],[-34,36],[25,36],[25,-20],[-34,-20]],period:58,offset:0},{object:c,points:[[25,-20],[45,-20],[45,6],[25,6],[25,-20]],period:37,offset:.35}]);
  let disposed=false,lastSnapshot={};
  group.userData={siteId:'centerpoint',kind:'factory',fictional:true,label:'Fictional drone assembly / sorting / dispatch',dimensions:FACTORY_DIMENSIONS,bounds:{min:[-75,-47.6,-.25],max:[75,45,12]},floorZ:FACTORY_FLOOR_Z,detailLevel:'overview',workcells:detail.userData.workcells,
    setDetailLevel(level){if(disposed||!['overview','detail'].includes(level))return;overview.visible=level==='overview';detail.visible=level==='detail';group.userData.detailLevel=level;if(detail.visible)detail.userData.update(lastSnapshot);},
    update(snapshot){if(disposed||snapshot===lastSnapshot)return;lastSnapshot=snapshot||{};sorting.visible=!factoryProcess(lastSnapshot);if(sorting.visible)sorting.userData.update(lastSnapshot);if(detail.visible)detail.userData.update(lastSnapshot);},
    getAssemblyState(){return detail.userData.assemblyState;},
    getHandledCargoIds(){return Object.freeze([]);},
    getCellMounts(){return detail.userData.mounts;},
    getMount(id){return mounts.get(id)||null;},
    setCellPoses(cells){if(disposed)return;lastSnapshot={process:{factoryAssembly:{cells}}};sorting.visible=false;detail.userData.update(lastSnapshot);},
    dispose(){if(disposed)return;disposed=true;sorting.userData.dispose();detail.userData.dispose();}
  };
  return group;
}
