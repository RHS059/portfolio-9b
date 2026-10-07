import { createDiagramBuilder, FACILITY_THEME } from '../depot/geometry.js';
import { workshopPresentation } from './state.js';

export const WORKSHOP_DIMENSIONS = Object.freeze({ width: 56, depth: 28, height: 7.5 });
export const WORKSHOP_BAYS = Object.freeze([
  Object.freeze({ id: 'bay-01', x: -12, y: 0, width: 8, depth: 20 }),
  Object.freeze({ id: 'bay-02', x: 12, y: 0, width: 8, depth: 20 }),
]);

/** Roofless, fictional service interior centered on (0,0), meters, Z up. */
export function createWorkshop({ THREE }) {
  const T = THREE, b = createDiagramBuilder(T);
  b.box(56, 28, 0.25, 0, 0, 0.125, 'paper');
  // Tall rear wall and low cutaway side walls leave both service bays readable.
  b.box(56, 0.35, 5.2, 0, 13.825, 2.85, 'face');
  b.box(0.35, 28, 1.2, -27.825, 0, 0.85, 'face');
  b.box(0.35, 28, 1.2, 27.825, 0, 0.85, 'face');
  for (const x of [-27, 0, 27]) {
    b.box(0.45, 0.45, 7, x, 13.5, 3.75, 'muted');
    b.box(0.45, 0.45, 5.5, x, -13.5, 3, 'muted');
    b.line([[x, -13.5, 5.75], [x, 13.5, 7.25]]);
  }
  b.line([[-27,-13.5,5.75],[27,-13.5,5.75]]);
  b.line([[-27,13.5,7.25],[27,13.5,7.25]]);
  // Small storage and workbench details remain schematic, not a surveyed fit-out.
  for (const x of [-22, -18, -5, 5, 18, 22]) {
    b.box(3, 1.8, 0.16, x, 11.9, 1.3, 'paper');
    b.box(2.6, 1.5, 1, x, 11.9, 0.75, 'face');
    b.box(1.4, 1.2, 0.55, x, 11.9, 1.7, 'muted');
  }
  for (const { x, width, depth } of WORKSHOP_BAYS) {
    b.rectangle(x, 0, width, depth, 0.3);
    // Inspection tracks, kept below vehicle geometry owned by the renderer.
    b.box(0.5, 17, 0.1, x-1.35, 0, 0.31, 'muted');
    b.box(0.5, 17, 0.1, x+1.35, 0, 0.31, 'muted');
    for (const dx of [-4.8, 4.8]) {
      b.box(0.55, 0.55, 3.8, x+dx, 1, 2.15, 'face');
      b.box(1, 1, 0.18, x+dx, 1, 0.34, 'dark');
    }
  }
  b.text('BAY 01', -12, -12.8, 0.3, 0.2);
  b.text('BAY 02', 12, -12.8, 0.3, 0.2);
  const group = b.finish('workshop-cutaway');
  group.userData = {
    kind: 'workshop', fictional: true, label: 'Fictional interior · service reconstruction',
    dimensions: WORKSHOP_DIMENSIONS, bounds: { min: [-28,-14,0], max: [28,14,7.5] },
    bays: WORKSHOP_BAYS, presentation: workshopPresentation(),
  };
  // These are bay-state plates, not vehicles or an independently animated visit loop.
  const plates = WORKSHOP_BAYS.map((bay, i) => {
    const plate = new T.Mesh(new T.BoxGeometry(6, 1, 0.08), new T.MeshBasicMaterial({ color: FACILITY_THEME.face }));
    plate.position.set(bay.x, -10.8, 0.34); plate.name = 'bay-occupancy-' + (i + 1);
    plate.userData = { visualOnly: true, bayId: bay.id, occupantId: null }; group.add(plate); return plate;
  });
  let disposed = false;
  group.userData.update = snapshot => {
    if (disposed) return;
    const presentation = workshopPresentation(snapshot);
    group.userData.presentation = presentation;
    plates.forEach((plate, i) => {
      const occupantId = presentation.occupants[i] || null;
      plate.userData.occupantId = occupantId;
      plate.material.color.setHex(occupantId ? FACILITY_THEME.dark : FACILITY_THEME.face);
    });
  };
  // Final renderer ownership: renderer releases geometry/materials after this hook.
  group.userData.dispose = () => { disposed = true; };
  return group;
}
