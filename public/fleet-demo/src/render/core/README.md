# Read-only visual runtime

`createFleetScene` implements the frozen v1 adapter and never calls a domain API. MapLibre remains 4.7.1 and Three remains r128. All vehicle primitives and rendering code are original.

## Rendering and camera

- Snapshot inputs are cloned, narrowed and frozen. Stable entity IDs survive instancing order and screen culling. Replay resets, pause, route changes and wrapped progress do not sweep stale poses across the map.
- The static OpenFreeMap vector map and the moving Three scene use separate canvases. A MapLibre custom layer only captures the current camera projection; vehicle animation does not repaint all geographic tiles. Both contexts have MSAA disabled; the owned scene canvas caps pixel ratio at 1.5 and refreshes it on resize.
- Vehicle faces use opaque, uniform-color instanced batches with pale top/side tones and batched charcoal outlines. No per-instance or per-vertex color binding is required. Selected labels and a ring identify the inspected vehicle. Facility geometry remains independently replaceable.
- Camera modes, follow, culling and port LOD are presentation-only. Facility focus refits a narrowed viewport; genuine manual exploration is respected. Reduced-motion preferences disable camera easing.
- Paused, unchanged scenes skip GPU draws. Metrics expose actual scene draw calls, triangles, line count, map repaint count, projection readiness, initialization and saved view state.

## Failure handling and measurement

The no-WebGL fallback draws the same OpenFreeMap vector tiles in SVG, with selectable evidence vehicles, actual mapped port extent and source-control status. It has a bounded tile cache and aborts obsolete requests. It does not fetch a different raster provider.

Owned-overlay context restoration invalidates its drawing state. A lost MapLibre canvas is retired before cached GPU objects can be restored, then fresh graphics-owned resources are created with the saved camera. Snapshot data, selected entity, pause/follow and application source configuration remain outside that lifecycle. Repeated rapid graphics failures eventually leave the working SVG fallback rather than creating a reset loop.

Disposal stops RAF, removes observers/listeners, aborts fallback requests and releases owned geometries/materials/textures. Only the owned Three canvas is explicitly force-lost during cleanup; the map owns its own context.

`getMetrics` reports foreground RAF cadence, rolling p95/p99 and lifetime foreground intervals over 50 ms. Foreground long stalls remain counted; known document-hidden intervals are excluded. These are browser measurements, not a certified user-GPU benchmark. Functional CI/software rendering cannot prove the 30 FPS minimum / preferred 60 FPS on the user's hardware.

## Facility and geography boundary

`../facilities/index.js` exports synchronous `createFacilities({THREE, geography:{oict:OICT_GEOGRAPHY}})`. Its common Group remains untagged; separately authored direct children have `userData.siteId` equal to `oict`, `centerpoint` or `depot`, and local origins. The renderer applies each site's geographic translation exactly once. Units are meters, X east, Y north, Z up.

The optional root `userData.update(snapshot)` receives a read-only snapshot for illustrative activity. `userData.dispose()` stops asset-owned callbacks; the renderer owns final geometry/material disposal. The port may expose `userData.setDetailLevel('detail'|'overview')`, driven only by camera scale and proximity.

Workshop anchors have z=0 and are not support heights. Actual assembled geometry is ray-sampled under truck wheel contacts; the facility's authored rail top is 0.36 m. Trucks use scale 1 inside the depot, with the truck's 0.05 m local tire bottom placed on that support.

`../map/oict-geography.js` contains OSM mapped legacy terminal parcels, quay geometry and yard lanes, visually cross-checked with the official October 2025 Port map. This is an approximate visualization extent, not a surveyed legal boundary, public-road/access assertion or current cargo inventory. Factory use, service consequences, container counts, gantries and activity are illustrative. Drones are manufactured cargo.

## Provider and visual reference

Grid Command's provider was verified in:
https://github.com/RHS059/grid_command/blob/main/lib/game/geography.ts

The same source is used here: https://tiles.openfreemap.org/planet . Fonts use the same CDN, without a key/token. OpenFreeMap/OpenMapTiles/OpenStreetMap attribution remains visible.

Reviewed Cathryn Lavery's warehouse, axonometric-plan and exploded examples and MIT license:
https://github.com/cathrynlavery/diagram-design
https://github.com/cathrynlavery/diagram-design/blob/main/LICENSE

No source SVG, asset or code was copied. The visual principles are opaque pale faces, fine charcoal edges, low cutaway walls and selective labels.

## Checks

`node --test tests/render/*.test.js` covers the pure runtime, selection, geometry constraints, geography, camera, metrics and decoder. Set `FLEET_THREE_MODULE` to a pinned local Three r128 module for actual-geometry tests. Browser acceptance must additionally cover pan/zoom/pitch/bearing alignment, responsive framing, repeated context recovery with a WebGL-warning gate, and measured cadence. The original Reno page is maintained separately by the integration shell.
