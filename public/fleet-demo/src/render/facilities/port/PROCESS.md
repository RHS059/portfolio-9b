# Illustrative port cargo assets

These assets add two moored vessels, crane trolleys/hoists, and four bounded palletized-kit slots to the existing mapped port. They consume immutable process snapshots; they do not own cargo inventory, schedule cycles, advance a clock, or modify maintenance records.

## Coordinates and dimensions

- The facility remains at local origin, in metres east/north/up relative to the existing OICT reference. The renderer owns its geographic translation, exactly once.
- `group.userData.processAnchors` is a recursively frozen array of up to two berth layouts. Each includes `origin`, `rotationZ`, `craneId`, two `pickupSlots`, `trailer`, full ship footprint corners, bounds, and an explicit approximation notice.
- Each vessel is 168 × 26 m, with hull bottom Z−1.2 and maximum illustrative superstructure height below 29 m. Its footprint is wholly outside the mapped land polygon, at least 8 m from the mapped quay. The existing admitted crane feet, mapped lanes, and representative yard rows do not move. This is illustrative berth placement, not surveyed ship placement or operational inventory.
- Cargo origin is **pallet-bottom-center**, not the cargo centre. The pallet envelope is 1.20 × 1.00 × .19 m (actual slat width 1.19 m); the closed carton is .805 × .605 × .487 m, seated at pallet Z+.19. Total support-to-top is .677 m. Long pallet axis is local +X. This matches the factory equipment convention.
- `trailer.headingRadians` describes the +X mathematical direction along quay. For the vehicle model's +Y-forward convention, use `trailer.vehicleRotationZ = headingRadians - π/2`, or its explicit `forwardUnit`. Cargo defaults to long +X along the quay (`cargoRotationZ`); preserve that world orientation through the trailer mount, or supply consistent `rotationZ` values in the bindings. Do not introduce a 90° jump at handoff.
- Pickup slots sit in the clear landward deck aisle at support Z8.5. Trailer anchors give the support plane at Z1.33. Do not add/subtract half cargo height. The crane's lifting cradle sits 1.4 m above that support origin.
- The 147 decorative shipping containers on each vessel are untracked scenery, explicitly not process inventory. Tracked kits are palletized cartons, never shipping containers.

## Adapter API

`setProcessAnchorBindings(bindings)` accepts an array of at most 32 entries:

`{ id, parentId, ownerKind: 'ship' | 'crane' | 'trailer', berthIndex, position: [x,y,z], rotationZ? }`

These are canonical domain anchor IDs mapped to renderer-owned **facility-local support-origin poses**. Use the published berth positions, rather than passing geographic/world coordinates. Invalid/duplicate bindings throw. No domain IDs are guessed by the asset.

`update(snapshot)` consumes `snapshot.process.cargo[]`, bounded to four entries:

- `id`, optional `transferId`
- `owner: {kind,id,anchorId}`
- `attachment: {parentId,anchorId}` matching the owner exactly
- For crane ownership: `motion: {fromAnchorId,toAnchorId,progress}`

Ship ownership places the kit at its supplied slot. Crane ownership resolves its supplied anchors, then uses explicit progress for lift / traverse / lower choreography. Progress 0 and 1 land exactly on the source and destination. There is no wall-time advancement or synthesized cargo stage. Trailer/factory ownership immediately hides the port copy. Missing or malformed inputs clear stale cargo. Duplicate IDs, over-capacity input, and multiple loads claiming one hoist fail closed.

The pure `samplePortTransfer(from,to,progress)` export resolves the same transport pose for a shared renderer-owned cargo object. The first and last quarter of progress lift/lower; the middle half traverses at at least Z30. It must receive the same endpoints/progress in both the hoist and shared-cargo renderer.

`getProcessInspection()` returns recursively frozen status and four slot records containing cargo ID, owner/anchor, transfer ID, visibility, local position, world position and world quaternion. It changes no state or inventory. World transforms reflect the facility placement once.

### Preferred shared cargo renderer

`createPalletCargo(THREE)` from `process-assets.js` creates the same closed transport mesh with pallet-bottom origin. A3 may retain/reparent a single mesh per domain cargo ID across ship → crane → flatbed → forklift.

Call `port.userData.setCargoRenderer('external')` when the renderer owns those meshes. The port then still poses the cranes and exposes resolved poses, but hides every local cargo copy. `setCargoRenderer('local')` supports isolated asset QA and ownership-specific rendering. Never activate both visible representations.

## Determinism and resource ownership

- Without cargo input, kits stay hidden and cranes are parked. They do not loop.
- Repeating a snapshot or changing wall time while progress stays fixed does not move anything. Seeking/replay resamples explicit progress; there are no accumulated deltas.
- Empty-hoist approach/retraction currently needs an explicit shared process extension; the unowned crane is statically parked. The asset does not fabricate an approach/retract schedule.
- `dispose()` stops updates/configuration. GPU geometries/materials remain attached for the scene renderer's existing cleanup traversal.

## Bounds and budget

With current mapped OICT geography: two vessels, two hoists, four pooled kit objects, nine admitted cranes, and unchanged yard-row budget. The whole port has 57 renderable draw objects allocated; the default overview with no cargo has 35 visible draw objects and 5,724 triangles before camera frustum culling. Showing four kits adds up to 20 draws; overview/detail yard representations remain mutually exclusive. This is a geometry budget, not a measured hardware-FPS claim.

Port tests run with `node --test src/render/facilities/port/*.test.js` and the existing `FLEET_THREE_MODULE` runtime injection. Actual Three r128 tests cover full seaward footprints, exact pallet bounds, single cargo identity, matching attachments, bounded occupancy, external-renderer exclusion, pause/replay, and renderer-owned disposal. Canonical anchor integration and browser-rendered end-to-end handoff screenshots remain the shared renderer's integration gate.
