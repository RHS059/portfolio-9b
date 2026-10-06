import { createDiagramBuilder } from '../depot/geometry.js';

export function addContainer(b, x, y, z, width = 12, depth = 5) {
  b.box(width, depth, 3, x, y, z + 1.5, 'face');
  for (let dx = -width / 2 + 1; dx < width / 2; dx += 1) {
    b.line([[x + dx, y - depth/2 - 0.01, z + 0.25], [x + dx, y - depth/2 - 0.01, z + 2.75]]);
  }
}

/** Deliberately schematic drone icon; it is not an engineering/manufacturing model. */
export function addDroneSymbol(b, x, y, z) {
  b.box(1.6, 2, 0.5, x, y, z + 0.4, 'face');
  b.box(5.2, 0.22, 0.18, x, y, z + 0.5, 'muted');
  b.box(0.22, 5.2, 0.18, x, y, z + 0.5, 'muted');
  for (const [dx, dy] of [[-2.6,0],[2.6,0],[0,-2.6],[0,2.6]]) {
    const ring = Array.from({length:13}, (_,i) => [x + dx + 1.2*Math.cos(i*Math.PI/6), y + dy + 1.2*Math.sin(i*Math.PI/6), z + 0.65]);
    b.line(ring);
  }
}

export function createSorter({ THREE, name = 'illustrative-sorter' }) {
  const b = createDiagramBuilder(THREE);
  b.box(3.2, 4.2, 0.65, 0, 0, 0.6, 'muted');
  b.box(2.6, 3.4, 0.2, 0, 0, 1.03, 'paper');
  b.box(2.1, 2.6, 1.4, 0, -0.1, 1.83, 'face');
  for (const x of [-1.45,1.45]) b.box(0.25, 2.8, 0.3, x, 0, 0.3, 'dark');
  const group = b.finish(name);
  group.userData = { visualOnly: true, fictional: true, label: 'Illustrative robot sorting loop' };
  return group;
}
