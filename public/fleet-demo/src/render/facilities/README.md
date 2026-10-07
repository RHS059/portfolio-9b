# Facility visuals

Original procedural facility illustrations. The mapped port extent is based on public geography; equipment, container rows, factory interiors and service activity are schematic. These assets do not represent a surveyed legal boundary, live inventory, throughput, permissions or a historical maintenance algorithm.

## API

`createFacilities({ THREE, geography: { oict } })` returns an untagged `THREE.Group`. Its direct children have `userData.siteId` values `depot`, `oict`, and `centerpoint`, each at local origin. Geographic translation is the renderer’s responsibility and must be applied exactly once. The port requires the `OICT_GEOGRAPHY` object exported by `src/render/map/oict-geography.js`; the facility code does not import or modify the map provider.

Units are meters, X east / Y north / Z up. The port origin is the SMDG USOAK/B58 reference point at longitude −122.3141666667, latitude 37.7963888889. Mapped coordinates remain relative to this point; the origin is not moved to the yard centroid.

Separate exports: `createDepot`, `createWorkshop`, `createFactory`, `createPort`. The depot is 85 × 60 m; the workshop is 56 × 28 m and positioned at depot-local `(0,6,0)`. Workshop bay centers are depot-local `(-12,6,0)` and `(12,6,0)`. These are anchors, not support elevations. Existing depot/workshop geometry is unchanged. The fictional factory is 150 × 90 m.

`createPort({ THREE, geography })` consumes:
- `footprintLocal`: closed mapped XY ring
- `quayLocal`: mapped XY quay polyline
- `yardLanes`: records containing `id` and XY `points`
- `quayAlongUnit`, `quayLandwardUnit`: orthonormal XY basis vectors

Missing geography returns an empty tagged port group with `userData.status === 'geography-unavailable'`, without a substitute terminal rectangle. Invalid supplied geometry fails explicitly. A valid port has status `mapped`.

## Mapped port layout

The approximate mapped footprint spans 1,902.772 × 1,296.4 m. Its XY bounds are `[-980.295,-296.578]` to `[922.477,999.822]`. Z=0..50 m is an illustrative height envelope, not surveyed height. The mapped quay is approximately 1,827 m long, azimuth 108.016°. The supplied yard-lane geometry includes 68 roadway polylines. Access classifications are not changed or inferred.

Representative container-row rectangles must have every edge inside the concave footprint, at least 8 m from its boundary and at least 12 m from each supplied lane centerline. These are artistic clearance buffers, not measurements of actual lane widths or safe operational clearances. The layout creates no replacement road grid and no opaque terminal pad, vessel or ground overlay over the water. The underlying map’s road/yard pattern remains visible.

Crane bases use the same clipped clearances and remain inland. Only narrow elevated booms extend seaward, aligned to the mapped quay basis. Equipment positions and counts are representative artistic choices, never operational inventory.

`port.userData.layout` is deeply frozen and exposes `footprint`, `quay`, `yardLanes`, `origin`, `along`, `landward`, `rotationZ`, `quayLengthMeters`, `rows`, `cranes`, and `limits`. Each row/crane has a `center` and four XY `corners`. Row corners are complete stack footprints; crane corners describe ground bases. `boomSeawardMeters` describes elevated reach from the crane center in the negative-landward direction. `mappedBounds` describe the supplied footprint; `bounds` also include elevated boom reach.

Container faces are instanced and outlines batched. The default `overview` uses one solid representative block per admitted row. `port.userData.setDetailLevel('detail')` shows individual schematic containers; `'overview'` restores the lower-detail representation. The renderer may switch this explicitly at an appropriate camera scale. No camera or timing heuristic is hidden inside the asset. Layout is capped at 80 representative row groups and 9 gantries. Technical counts in metadata are rendering counts, not terminal capacity.

## Updates and disposal

`group.userData.update(snapshot)` is read-only. Workshop plates use explicit vehicle service statuses; issue/authority flags never schedule a visit. Factory sorting symbols use supplied `timeSeconds` only. Port equipment remains static. No source readings, policies or service records are mutated.

`group.userData.dispose()` stops subsequent visual updates. GPU geometry/materials remain attached for renderer-owned disposal. The asset creates no timers, listeners, texture downloads or live service connections.

## Public sources and limits

- OpenStreetMap public map extract: https://api.openstreetmap.org/api/0.6/map?bbox=-122.329,37.790,-122.296,37.808
- Mapped parcel ways: https://www.openstreetmap.org/way/27234567 and https://www.openstreetmap.org/way/27234584
- Port of Oakland public seaport map: https://www.oaklandseaport.com/wp-content/uploads/2026/01/Seaport-map-Port-Oakland_102025.pdf

© OpenStreetMap contributors, ODbL. The mapped ways carry legacy parcel names; those names are not presented as current terminal operators. The combined outline is an approximation, not a legal survey. No private source material is required by this module.

## Tests

Run `node --test src/render/facilities/**/*.test.js` from the demo root. Actual geometry checks use an installed `three` package or `FLEET_THREE_MODULE` pointing to its ES module. The real-footprint test reads the public map module, or an explicitly supplied `FLEET_PORT_GEOGRAPHY_JSON` file for local verification. Missing optional test dependencies are reported as skips, not passes.

Coverage includes concave-boundary crossings, whole-edge lane clearance, immutability, deterministic placement, budgets, missing-geography behavior, origin/transform ownership, instanced detail switching and resource-disposal ownership. Integrated map appearance, context restoration and hardware frame rate require separate renderer/browser verification.
