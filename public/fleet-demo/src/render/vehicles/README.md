# Close-range vehicle assets

Original, non-branded Three r128 geometry, authored in meters with +Y forward / +Z up. `createDetailedVehicle({THREE,kind:'truck'|'van'})` returns `{group,setDistance(meters),getDistance(),dispose(),wheelBatches,wheelLayout}`. It does not select entities, inspect source readings or advance simulation time.

The semi has a tapered hood, sleeper cab, sloping split windshield/wipers, side windows, mirrors, headlights, grille, steps, front/rear fenders, fuel-tank silhouettes, tractor frame, fifth-wheel/coupling silhouette, box-trailer seams/doors, five axles and eighteen circular wheels. Visible five-slot inset rims, lugs and an asymmetric valve rotate with the tire. The van shares the detailed wheels and has its own four-wheel layout and shaped body.

## Explicit geometry metadata

`DETAIL_MODEL_METADATA.truck` and `.van` are deeply immutable and available without Three. Each entry exports `bounds:{min:[x,y,z],max:[x,y,z]}`, `boundsToleranceMeters`, `groundContact`, `wheelCenters` and `groundContacts`. The same fields are included in the instantiated `group.userData`.

- Truck nominal full envelope: min `[-1.73,-10.389,0.05]`, max `[1.73,7.4555,4.23]`
- Van nominal full envelope: min `[-1.475,-2.7,0.05]`, max `[1.475,2.69,2.94]`
- `wheelCenters` entries are `{x,y,z,radius}` axle centers; `groundContacts` entries are `{wheelIndex,x,y,z}` nominal bottom-of-tire support points at z=0.05. These are local/model coordinates, so the renderer must apply root pose/scale before ray-sampling a world surface
- All bounds include static details and transformed wheel instances. The 0.00001 m tolerance covers Float32 storage. Tests compare actual transformed vertices against the exports at four forward/reverse wheel phases, rather than rotating a loose wheel bounding box

## Integration boundary

- The renderer retains its existing low-cost instanced overview geometry. Allocate a fixed near-detail pool (recommended maximum six models), select candidates using camera scale/proximity and keep a stable ID-to-slot mapping. Reuse models; do not construct or dispose them at RAF cadence. A close-detail vehicle must be excluded from the simultaneous far batch.
- Root position, heading and scale still come from `vehiclePresentationPose`. Tire bottom is exactly 0.05 m in model coordinates, preserving the current workshop rail support contract. Truck extents are approximately X ±1.73, Y -10.39 to 7.46 and Z 0.05 to 4.23 m; verify final workshop placement with this longer box-trailer footprint.
- `setDistance` is absolute signed model-space travel, not an angular increment or a wall-clock timestamp. At root scale 1, one meter of forward movement means `setDistance(previous + 1)`. Divide world travel by the root presentation scale before supplying it. Each wheel turns by `-distance/radius` around its +X axle; the van uses its smaller radius.
- `WheelTravelTracker.sample(vehicle,{timeSeconds,paused,scale})` is an optional presentation-only accumulator for actual interpolated XY poses. It resets on replay-clock rewind, route switch, >0.25 progress discontinuity and a >120 m single-frame jump. The latter is a visual teleport guard, not a vehicle-speed assertion. Feed the tracker while a vehicle is in far LOD so switching to detail preserves wheel phase. Call `retain(allLiveIds)` or `reset()` to bound retained state. If the renderer already has deterministic cumulative path travel, prefer passing that directly.
- The module has no timer or animation callback. Repeating `setDistance` is a no-op, including instance-buffer versions. Rewinding the supplied travel reproduces the same matrices.
- Call `dispose()` once when retiring an owned model, or let the scene's existing deduplicated geometry/material disposal own those resources. Do not do both. In a pool, hiding/reassigning slots does not require disposal.

## Cost and verification

The complete near semi is 8 draw calls and 25,674 rendered triangles, including all eighteen wheels. Static body details are merged into five uniform material buffers; all wheels share three instanced buffers. No texture fetches, vertex/instance color bindings or per-frame geometry allocation. Geometry is two-sided to match the negative-Y map transform. Far geometry is unchanged by this module.

Run `FLEET_THREE_MODULE=/path/to/three-0.128.0/build/three.module.js node --test tests/render/vehicle-detail.test.js` from the demo directory. Nine focused checks cover actual geometry/materials/grounding, visible asymmetric rim rotation, signed radius motion, unchanged paused matrices, replay/route/teleport rebasing, van radius, bounded draws/triangles and idempotent disposal. These focused checks do not replace integrated browser/LOD/workshop/recovery checks or target-GPU measurements.

## Separable cargo carrier API (f76c601-compatible)

The existing `createDetailedVehicle({THREE,kind,trailerAttached=true})` and `detailedWheelLayout(kind,trailerAttached)` contracts remain intact, including the maintenance-only tractor. Refactoring preserves byte-identical default truck, tractor-only and van geometry, material choices and initial wheel matrices against f76c601. The following APIs add independent components:

- `createDetailedTractor({THREE})`: the existing 10-wheel tractor with no trailer; returns the same group/distance/disposal API
- `createDetailedTrailer({THREE,style:'flatbed'|'box'})`: standalone eight-wheel trailer; defaults to the open flatbed and returns the same API
- `TRACTOR_TRAILER_ANCHORS`: frozen geometry anchors; tractor fifth-wheel `[0,1.28,1.195]`, steer axle `[0,5.78,.55]`, drive-axle midpoint `[0,.53,.55]`; trailer kingpin `[0,0,1.195]`, axle midpoint `[0,-8.93,.55]`
- `detailedTrailerWheelLayout()`: trailer-local axle/tire centers, with tandem axles at Y−8.28 and −9.58
- `DETAIL_MODEL_METADATA.boxTrailer` and `.flatbedTrailer`: full bounds, contacts, anchors and a pick anchor. The constructor also exposes immutable metadata as `.metadata` and on `group.userData`

The standalone trailer origin is the kingpin's XY ground projection, +Y forward / +Z up. Its body is translated −1.28 m in Y from the legacy assembled truck coordinates. A3 owns the path and articulation solver: transform the tractor fifth-wheel into world space, then place the independently rotated trailer so its kingpin meets that exact world point. There is no following delay, motion timer, cargo ownership state or hidden hitch animation in this asset module. Supply separate absolute traveled distances to tractor and trailer for correct independent wheel motion.

Exact trailer-local empty envelopes (Float32 tolerance 0.00001 m):

- Box: min `[-1.502,-11.669,.05]`, max `[1.502,.705,4.23]`
- Flatbed: min `[-1.502,-11.6125,.05]`, max `[1.502,.66,1.344]`
- Tractor remains min `[-1.73,-.81,.05]`, max `[1.73,7.4555,3.82]`

The new flatbed's forward neck tapers for cab clearance. A convex-footprint regression checks it at 3° intervals through ±90° articulation, including an allowance for edge rails. This is scene-geometry verification, not a road-vehicle safety or engineering certification. The legacy full-width closed-box nose has much less cab clearance and must not be used as the cargo carrier or assumed valid on tight articulated turns. Cargo operations use the open flatbed only.

### Cargo support and pick metadata

`FLATBED_CARGO_METADATA` describes the shared port/factory payload: a 1.2 × 1.0 × .19 m pallet, long axis +X, carrying a .805 × .605 × .487 m carton. Payload origin is pallet-bottom-center. The full-width usable deck spans X±1.29, Y−11.53..−2.78 at Z1.33; `deckOutline` additionally records the tapered forward neck.

The canonical rear load mount is `slots[0].support = [0,-10.38,1.33]`. Each slot includes a support point, nominal load-top point, fork-pocket-height reference and cargo-aligned pick bounds. These are attachment/visual reference points, not automatic load spawning or instructions for physical lifting equipment. The four positions are candidate mounts, not asserted inventory.

Pallet yaw 0° or 90° (and their half-turn equivalents) fits every declared slot. At the canonical rear slot, rear clearance is .65 m at yaw 0° and .55 m at yaw 90°. Preserve the payload's world transform across ownership reparenting, then deliberately compose any required local yaw. Do not rotate the pallet merely because its owner changed. `pickBounds` are nominal unrotated cargo-local extents around the support point and must be transformed with cargo yaw when picking.

The trailer creates no cargo mesh. A3 can use the port asset's `createPalletCargo(THREE)` and retain/reparent the same mesh for the same cargo ID. Hide any old owner representation before exposing the new one. Actual ray tests show an unobstructed path from above to the support plane over every slot: crane cargo cannot pass through a hidden trailer roof.

With tractor roots `[-56,-56.5,.15]` and `[-40,-56.5,.15]`, both headings π, the canonical loaded support becomes `[bayX,-47.4,1.48]`. The flatbed rear remains at or south of Y−46.1675; the box rear reaches Y−46.111. Both remain outside the factory's south wall Y−45.

### Focused verification and cost

The separated tractor is 8 draws / 14,546 triangles; flatbed is 7 draws / 11,088 triangles, totaling 15 draws / 25,634 triangles before the separately owned cargo. Keep the existing bounded close-detail pool and cheap far LOD; do not instantiate every distant rig in detail. No new per-frame geometry is allocated.

`node --test tests/render/vehicle-*.test.js` with pinned `FLEET_THREE_MODULE` runs 19 focused tests, including preserved constructor behavior, transformed-vertex bounds at multiple wheel phases, independent distance/pause/replay, exact hitch alignment, cab-neck separation, actual open-deck ray support, pallet yaw/clearance, exact receiving world anchors, exterior bounds and idempotent disposal. Integrated route/articulation/ownership/browser checks remain the renderer/process owners' responsibility.
