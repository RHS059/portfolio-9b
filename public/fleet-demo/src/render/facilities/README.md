# H2 fictional facility cutaways

Original procedural, monochrome cutaway geometry for the Fleet world and odometer-source story. Interiors and operations are fictional illustrations, not surveyed building fit-outs, live telemetry or historical maintenance algorithms. The module makes no domain calls, reads no odometers, runs no timers, and creates no road vehicles. Renderer-owned fleet vehicles remain the only fleet vehicles. Three small robot sorting symbols are visual props, not registered/domain entities.

## Integration

`createFacilities({ THREE })` returns an untagged `THREE.Group`. Its three direct children have `userData.siteId` values `depot`, `oict`, and `centerpoint`, each positioned at `(0, 0, 0)`. A3's existing optional facility import and site-placement traversal can consume it unchanged. Never apply geographic transforms twice. The groups intentionally overlap until A3 positions them; there is no arbitrary global layout baked into the assets.

All units are meters; X points east, Y north, and Z up. The renderer owns geographic and Mercator positioning, camera, selection and map materials. There are no geographic coordinates or world offsets in these modules.

- Depot footprint: 85 × 60 m, centered on local XY origin. Bounds `[-42.5, -30, -0.22]` to `[42.5, 30, 7.5]`
- Workshop footprint: 56 × 28 m, height at most 7.5 m. Its independent `createWorkshop({ THREE })` export is centered on its own origin
- Composition: workshop sits at depot-local `(0, 6, 0)`
- Depot-local bay centers: `(-12, 6, 0)` and `(12, 6, 0)`. The first matches A3's existing `depot-bay` route endpoint
- Separate `createDepot` and `createWorkshop` exports permit independent positioning. Workshop does not claim another stable site ID
- Symbolic port footprint: 220 × 120 m, height at most 24 m. Bounds `[-110,-60,-0.25]` to `[110,60,24]`. Separate `createPort` export; stable site ID `oict`
- Fictional factory footprint: 150 × 90 m, height at most 12 m. Bounds `[-75,-45,-0.25]` to `[75,45,12]`. Separate `createFactory` export; stable site ID `centerpoint`
- Port incoming/outgoing rows, quay, carrier and gantries are symbolic. Factory sorting, assembly/QA islands, schematic drone symbols and dispatch staging are illustrative. No real throughput, equipment specification or building-use claim is made

The palette matches A3's current paper/face/ink/muted values. Solid faces are opaque and outlined; factory/workshop buildings are roofless with low side walls. Pavement stroke labels explicitly say `FICTIONAL INTERIOR`, `SERVICE RECONSTRUCTION` or `ILLUSTRATIVE OPERATIONS`, without external fonts/textures.

## Snapshot and lifetime

Call `group.userData.update(snapshot)`. The workshop reads only `vehicles[].id`, `vehicles[].status`, `selectedId`, `issueActive`, and `authorityResolved`. Explicit statuses `workshop`, `in-service`, `maintenance`, and `in-bay` indicate illustrative occupancy. Moving/en-route vehicles do not. Issue and authority flags never put vehicles in the shop.

`depot.userData.presentation` contains a frozen view: sorted/deduplicated `occupants` (maximum two), `occupied`, `overflow`, `selectedId`, `issueActive`, `authorityResolved`, and a fictional-interior label. Two bay-state plates change shade; the module never moves or duplicates renderer-owned vehicles. This occupancy list is presentation metadata, not an allocator or dispatch instruction. Vehicle poses remain A3-owned.

Port/factory sorting props read only finite `snapshot.timeSeconds`. `illustrativePosition` is a pure visual path function, with deterministic loops, no delta accumulation and no internal clock. A paused snapshot keeps the same pose; scrubbing/resetting the supplied clock deterministically repositions props. Source/authority flags never affect the sorting paths, and the motion writes no scenario facts. Periods are artistic animation choices, not measured operating rates.

Per A3's final adapter (Discord message 1557174181706076265), `group.userData.dispose()` is idempotent and stops future updates. The module owns no timers/listeners. Geometry/materials remain attached and are disposed by the renderer's existing scene traversal exactly once. This hook intentionally does not dispose GPU resources or detach the subtree. Independent consumers must likewise release its geometry/materials after invoking the hook.

## Checks

Run the dependency-free presentation checks with:

    node --test src/render/facilities/workshop/state.test.js src/render/facilities/illustration/motion.test.js

The ten actual-Three geometry tests use either a locally installed `three` package or `FLEET_THREE_MODULE` pointing to its ES module. This avoids adding a production or build dependency to the static demo:

    FLEET_THREE_MODULE=/absolute/path/to/three/build/three.module.js node --test src/render/facilities/**/*.test.js

If Three is unavailable, the geometry checks explicitly skip with a reason; do not report those skips as passes. All suites were run with actual Three 0.128.0: 23 passed, 0 failed, 0 skipped.

Measured combined geometry: 40 renderable objects, 2,136 triangles, 4,028 line segments. Depot/workshop alone: 13 / 648 / 1,054. Port alone: 11 / 684 / 1,378. Factory alone: 16 / 804 / 1,596. This is asset complexity, not a measured browser frame rate. No GPU target claim is made.

Native Chromium preview on the authoring host was blocked by its socket sandbox; cloud-browser localhost access was also blocked. A CPU-rendered preview of exported geometry was visually inspected for composition, labels and local bounds. It is not a WebGL screenshot. Final integrated WebGL, map-scale legibility, vehicle/floor clearance and hardware performance remain H3/A1 checks.
