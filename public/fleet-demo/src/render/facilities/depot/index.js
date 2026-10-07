import { createDiagramBuilder } from './geometry.js';
import { createWorkshop } from '../workshop/index.js';

export const DEPOT_DIMENSIONS = Object.freeze({ width: 85, depth: 60, height: 7.5 });

/** Fictional 85 x 60 m campus service yard. Geographic positioning belongs to the renderer. */
export function createDepot({ THREE }) {
  const b = createDiagramBuilder(THREE);
  b.box(85, 60, 0.22, 0, 0, -0.11, 'ground');
  b.rectangle(0, 0, 84, 59, 0.025);
  // An open south gate faces the route connector, without drawing a made-up road.
  for (const x of [-34, 34]) b.box(17, 0.4, 0.5, x, -29.5, 0.25, 'face');
  b.box(0.4, 59, 0.5, -42, 0, 0.25, 'face');
  b.box(0.4, 59, 0.5, 42, 0, 0.25, 'face');
  b.box(84, 0.4, 0.5, 0, 29.5, 0.25, 'face');
  // Parking on the east edge is schematic; no operational availability is inferred.
  for (const y of [-18, -7, 4, 15]) b.rectangle(35, y, 7, 9, 0.03);
  for (const x of [-36, -32]) {
    b.box(2.5, 6, 0.25, x, 21, 0.125, 'face');
    for (const y of [19.2, 22.7]) b.box(1.7, 2.6, 1.4, x, y, 0.95, 'paper');
  }
  // Wide directional arrows, strictly a layout cue.
  for (const x of [-12,12]) b.line([[x,-19,0.035],[x,-13,0.035],[x-1,-15,0.035],[x,-13,0.035],[x+1,-15,0.035]]);
  const group = b.finish('depot');
  const workshop = createWorkshop({ THREE });
  workshop.position.set(0, 6, 0); group.add(workshop);
  group.userData = {
    siteId: 'depot', kind: 'depot', fictional: true,
    label: 'Fictional depot / workshop · service reconstruction',
    dimensions: DEPOT_DIMENSIONS, bounds: { min: [-42.5,-30,-0.22], max: [42.5,30,7.5] },
    workshop, bayCenters: Object.freeze([Object.freeze([-12,6,0]),Object.freeze([12,6,0])]),
  };
  let disposed = false;
  group.userData.update = snapshot => {
    if (disposed) return;
    workshop.userData.update(snapshot);
    group.userData.presentation = workshop.userData.presentation;
  };
  group.userData.dispose = () => {
    if (disposed) return;
    disposed = true; workshop.userData.dispose();
  };
  group.userData.update({});
  return group;
}
