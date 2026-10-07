import { pointInPolygon, footprintClearance, segmentsIntersect } from './layout.js';

/** All dimensions are illustrative metres; the berth is not surveyed or live inventory. */
export const PORT_PROCESS_DIMENSIONS = Object.freeze({
  shipLength: 168, shipBeam: 26, shipHeight: 29,
  shipOffsetFromCrane: -51, deckHeight: 8.5,
  containerLength: 12.2, containerWidth: 2.44, containerHeight: 2.9,
  cargoLength: 1.2, cargoWidth: 1, cargoHeight: .677, palletHeight: .19,
  pickupHeight: 8.5, transferHeight: 30, trailerDeckHeight: 1.33,
  craneTrolleyHeight: 40, spreaderHeight: .25, spreaderOffset: 1.4,
});
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const edges = ring => ring.map((p, i) => [p, ring[(i + 1) % ring.length]]);

/** Derive one clearly illustrative berth from existing admitted crane/quay geometry. */
export function createPortProcessLayouts(layout) {
  if (!layout?.cranes?.length) return Object.freeze([]);
  const d = PORT_PROCESS_DIMENSIONS;
  const point = (crane, x, y, z = 0) => [crane.center[0] + layout.along[0] * x + layout.landward[0] * y,
    crane.center[1] + layout.along[1] * x + layout.landward[1] * y, z];
  const quaySegments = layout.quay.slice(1).map((p, i) => [layout.quay[i], p]);
  const boundary = edges(layout.footprint);
  const candidates = layout.cranes.slice().sort((a, b) => {
    const along = c => (c.center[0] - layout.origin[0]) * layout.along[0] + (c.center[1] - layout.origin[1]) * layout.along[1];
    return Math.abs(along(a) - layout.quayLengthMeters / 2) - Math.abs(along(b) - layout.quayLengthMeters / 2);
  });
  const berths=[];
  for (const crane of candidates) {
    const shipCorners = [[-84, -13], [84, -13], [84, 13], [-84, 13]]
      .map(([x, y]) => point(crane, x, y + d.shipOffsetFromCrane).slice(0, 2));
    // Do not cover the mapped land, even when a supplied quay is curved/concave.
    if (shipCorners.some(p => pointInPolygon(p, layout.footprint)) ||
        layout.footprint.some(p => pointInPolygon(p, shipCorners)) ||
        edges(shipCorners).some(([a, b]) => boundary.some(([c, e]) => segmentsIntersect(a, b, c, e))) ||
        footprintClearance(shipCorners, quaySegments) < 8) continue;
    if(berths.some(b=>Math.hypot(b.origin[0]-crane.center[0],b.origin[1]-crane.center[1])<d.shipLength + 16))continue;
    const origin = [...crane.center, 0];
    berths.push(freeze({
      id: `illustrative-oict-berth-${berths.length+1}`, craneId: crane.id, origin,
      rotationZ: layout.rotationZ, dimensions: d,
      ship: { center: point(crane, 0, d.shipOffsetFromCrane), corners: shipCorners, surveyed: false },
      // The loading pose stays between the unchanged crane feet on admitted land.
      pickup: { position: point(crane, 0, d.shipOffsetFromCrane+11.2, d.pickupHeight), headingRadians: layout.rotationZ },
      pickupSlots: [0,2].map(x=>({position:point(crane,x,d.shipOffsetFromCrane+11.2,d.pickupHeight),headingRadians:layout.rotationZ})),
      cargoOrigin: 'pallet-bottom-center',
      trailer: { position: point(crane, 0, 0, d.trailerDeckHeight), headingRadians: layout.rotationZ, vehicleRotationZ: layout.rotationZ-Math.PI/2, forwardUnit:layout.along.slice(), cargoRotationZ:layout.rotationZ, vehicleDirection: 'along-quay' },
      bounds: {
        min: [Math.min(...shipCorners.map(p => p[0]), ...crane.corners.map(p => p[0])), Math.min(...shipCorners.map(p => p[1]), ...crane.corners.map(p => p[1])), -1.2],
        max: [Math.max(...shipCorners.map(p => p[0]), ...crane.corners.map(p => p[0])), Math.max(...shipCorners.map(p => p[1]), ...crane.corners.map(p => p[1])), 49],
      },
      approximation: 'One illustrative moored vessel and cargo handoff, derived from mapped quay orientation; not surveyed berth placement, ship identity, operating inventory or navigational guidance.',
    }));
    if(berths.length===2)break;
  }
  return freeze(berths);
}

export function createPortProcessLayout(layout) { return createPortProcessLayouts(layout)[0]??null; }

