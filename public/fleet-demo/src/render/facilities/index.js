import { createDepot } from './depot/index.js';
import { createPort } from './port/index.js';
import { createFactory } from './factory/index.js';
export { createDepot, DEPOT_DIMENSIONS } from './depot/index.js';
export { createWorkshop, WORKSHOP_DIMENSIONS, WORKSHOP_BAYS } from './workshop/index.js';
export { createPort, PORT_DIMENSIONS } from './port/index.js';
export { createFactory, FACTORY_DIMENSIONS } from './factory/index.js';

/** Read-only facility adapter. Local meters: X east, Y north, Z up. */
export function createFacilities({ THREE, geography = {} }) {
  if (!THREE?.Group) throw new TypeError('createFacilities requires a THREE namespace');
  const group = new THREE.Group(); group.name = 'fleet-facilities';
  const sites = [createDepot({ THREE }), createPort({ THREE, geography: geography.oict }), createFactory({ THREE })];
  group.add(...sites);
  let disposed = false;
  group.userData = {
    fictional: true, units: 'meters', axes: 'x-east/y-north/z-up',
    label: 'Fictional facility cutaways · illustrative operations only',
    sites: Object.freeze(['depot', 'oict', 'centerpoint']),
    update(snapshot) { if (!disposed) sites.forEach(site => site.userData.update(snapshot)); },
    dispose() {
      if (disposed) return;
      disposed = true; sites.forEach(site => site.userData.dispose());
    },
  };
  return group;
}
