import { createDiagramBuilder } from '../depot/geometry.js';
import { addContainer, createSorter } from '../illustration/models.js';
import { bindIllustrativeMotion } from '../illustration/motion.js';

export const PORT_DIMENSIONS = Object.freeze({ width: 220, depth: 120, height: 24 });

/** Symbolic terminal layout, not the surveyed OICT footprint or live port activity. */
export function createPort({ THREE }) {
  const b = createDiagramBuilder(THREE);
  b.box(220,120,0.25,0,0,-0.125,'ground');b.rectangle(0,0,218,118,0.03);
  // Incoming / outgoing sorting rows with intact access aisles.
  for (const x of [-84,-65,-46,34,53,72,91]) for (const y of [9,23,37]) {
    addContainer(b,x,y,0.05,13,5.5);
    if (y===37) addContainer(b,x,y,3.05,13,5.5);
  }
  b.text('INCOMING',-65,47,0.04,0.75);b.text('OUTGOING',63,47,0.04,0.75);
  b.rectangle(-12,18,18,42,0.04);b.text('SORT',-12,10,0.04,0.7);
  // Schematic quay edge and a single container carrier, entirely within local bounds.
  b.box(216,1.4,0.8,0,-33,0.15,'face');
  b.box(102,17,3,14,-46,1.5,'face');
  b.box(14,14,6,-25,-46,5.7,'paper');
  for(const x of [1,18,35,52])addContainer(b,x,-46,2.8,13,5.5);
  // Two outline gantries, simple structural symbols without operational mechanics.
  for(const x of [-63,45]){
    for(const dx of [-10,10])for(const y of [-27,-3])b.box(0.9,0.9,22,x+dx,y,11,'muted');
    b.box(24,1.2,1.2,x,-27,22.6,'paper');
    b.box(24,1.2,1.2,x,-3,22.6,'paper');
    b.box(1.2,44,1.2,x,-24,22.6,'paper');
    b.line([[x,-41,22],[x,-41,8]]);b.box(9,3,0.4,x,-41,7.8,'muted');
  }
  b.text('PORT / SORTING',0,-24,0.04,0.65);
  b.text('ILLUSTRATIVE OPERATIONS',0,-57,0.04,0.35);
  const group=b.finish('oict');
  group.userData={siteId:'oict',kind:'port',fictional:true,label:'Symbolic port sorting · illustrative operations',dimensions:PORT_DIMENSIONS,bounds:{min:[-110,-60,-0.25],max:[110,60,24]}};
  const sorter=createSorter({THREE,name:'port-sorter'});group.add(sorter);
  bindIllustrativeMotion(group,[{object:sorter,points:[[-28,-2],[-28,28],[-12,28],[-12,-2],[-28,-2]],period:48,offset:0}]);
  return group;
}
