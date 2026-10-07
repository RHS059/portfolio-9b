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
