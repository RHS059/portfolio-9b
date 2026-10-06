# Read-only visual runtime

`createFleetScene` implements the frozen v1 adapter and never calls a domain API. MapLibre stays at 4.7.1, Three at r128. All code and primitive vehicle meshes are original.

- Snapshots are cloned, narrowed and frozen. Entity IDs survive instancing order/culling changes.
- RAF interpolates successive 20 Hz snapshots; replay reset, pause, route switch and a wrapped progress discontinuity do not interpolate stale paths.
- 3D uses instanced vehicle geometry, batched line-segment edges, opaque Lambert surfaces and a flat selection ring. No gloss, shadows or postprocessing.
- Only presentation state depends on camera and screen culling. `getMetrics` reports browser RAF samples, p95/p99 and frames over 50 ms; this is not a certified GPU benchmark.
- Context failure exposes a keyboard/clickable SVG vector overlay over real CARTO raster map tiles. A tile network failure may still leave vector routes/labels visible. Status identifies fallback rather than leaving a blank canvas.
- Disposal stops RAF, removes observers/listeners and releases all owned Three geometries/materials/textures. It does not force loss of the shared map context.
- Original Reno page remains owned by the integration shell; this module does not touch its simulation.

## Facility adapter

The optional `../facilities/index.js` module exports `createFacilities({THREE})`. A direct THREE.Group is preferred; `{group,update,dispose}` also works. A direct Group can provide `userData.update(snapshot)` and `userData.dispose()`.

Units are meters: X east, Y north, Z up. Artist-authored content should be local to an origin; geographic anchors are handled separately from interior layout. See `../map/world.js` for verified anchor/source notes. The factory activity and maintenance consequences are explicitly fictional/illustrative, not measured historical motion or an asserted historical maintenance scheduler.

## Visual reference

Reviewed Cathryn Lavery's diagram-design warehouse, axonometric plan and exploded examples and MIT license (2025):
https://github.com/cathrynlavery/diagram-design
https://github.com/cathrynlavery/diagram-design/blob/main/LICENSE

The applicable style principles are opaque pale surfaces, restrained charcoal edges, low cutaway walls, and selective labels. No source SVG, asset or code is copied.

## Checks

`node --test tests/render/runtime.test.js` covers the pure runtime boundary, deterministic poses, pause/reset/route changes, stable selection, projection, culling and metrics. Integration browser verification is required for WebGL/context restoration and measured hardware performance. A software-rendered browser cannot establish user GPU performance.
