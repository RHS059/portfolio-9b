# Factory mechanisms and renderer-owned material

Original monochrome procedural equipment for an illustrative factory. The assets do not create process time, cargo identities, inventory, dispatch decisions or historical maintenance outcomes. Production geometry and motion are illustrative, not a validated manufacturing specification.

## Factory API and coordinates

`createFactory({ THREE })` returns the same untransformed `centerpoint` site group. Static/interior children are raised 0.25 m exactly once; the geographic root remains at Z=0. Exterior receiving pads join the floor at Z=0.25 and extend to Y=-47.6. The workshop is unchanged.

- `setDetailLevel('overview'|'detail')` selects bounded close-up machinery
- `update(snapshot)` accepts the renderer's frozen process snapshot
- `setCellPoses(cells)` directly accepts the agreed cell array
- `getAssemblyState()` exposes read-only mechanism diagnostics; tool positions are SITE-ROOT coordinates
- `getCellMounts()` returns site-root input/output support points
- `getMount('cell:<id>:input'|'cell:<id>:output')` returns the corresponding tagged mount object
- `getHandledCargoIds()` returns an empty list: the shared renderer owns every cargo object
- `dispose()` stops setters; the renderer releases attached geometry/materials

Cell IDs are `frame-jig`, `motor-install`, `propeller-install`, and `final-assembly`. Input support is Z=1.225, output support is Z=1.7 in site-root space. Cell-input XY offsets are (-1.9,+2.4) from each workcell center. The lower rear frame has a feeder opening matching that input path. Do not add the internal 0.25 m floor offset again when using the exported mounts.

## Explicit mechanism view

Cells read `active`, `cargoId`, `stage`, `progress`, `boxOpen`, `assemblyProgress`, and `armAction`. Accepted stages are `idle`, `box-opening`, `drone-assembly`, and `complete`; arm actions are `park`, `open-box`, and `assemble-drone`. The supported wrappers are `snapshot.process`, `snapshot.cargoProcess`, or a direct process object containing cargo and factoryAssembly. Older explicit mechanical-preview inputs remain supported without claiming cargo ownership.

Inactive cells park. Connected mode disables the earlier independent sorting loop and decorative cargo copies. No local conveyor or assembly timer advances independently of the process snapshot.

## One cargo object and one product object

The renderer creates and positions its existing pallet/opening-carton object exactly once. Factory machinery does not create another crate. For each sampled state the renderer calls the crate's `setOpen(boxOpen)` and `setAssemblyProgress(assemblyProgress)` together with the factory cell setter.

`cartonOpeningPose` supplies both the carton flap transforms and the arm's contact path. Flaps open sequentially with an approach/grasp/open/retract sequence. The gripper meets the actual flap edge during engagement. The carton exports `getToolContact()`, `getFlapContact()`, `pickupMount`, and `getPickupContact()` in carton-local coordinates. The pallet adds 0.19 m below the carton.

`createAssemblyProduct({ THREE })` from `product.js` returns a renderer-owned product at a bottom-support origin. The renderer supplies its position, visibility and identity from `process.products`. `setProgress()` / `setAssemblyProgress()` reveals installed electronics, motor pods, shell and propellers. `partMounts` and `installedPartIds` are read-only diagnostics. The staged base frame represents the product's starting fixture state; it is not an audited bill of materials.

`assemblyStep` coordinates source, gripper and product appearance. A source part remains in the carton until the pickup contact; it is visible on the gripper during transfer; the product part appears only at the placement contact. These are visual setters for the same explicit progress, not new inventory events. The renderer must apply all corresponding setters from the same snapshot.

## Operators and equipment

`createForklift` exposes `payloadMount`, named `seatMount`, `setLiftHeight()` and `update({liftHeight,travelMeters})`. Its operator seat is [0,-0.12,1.05] and foot support is Z=0.58 in forklift-local coordinates. Attach `createFactoryWorker()` at that mount and call `update({seated:true})`; the human keeps scale 1 with bent knees, platform-supported feet and hands at the controls. `operatorPresent` remains the process controller's visibility decision.

The roller AMR's support is local Z=0.975. With actor root Z=0.25 its cargo support is Z=1.225. Forklift pickup root Z=0.25 plus lift 1.23 matches the open flatbed support Z=1.48. No terrain height is inferred by these constructors.

## Verification

Run `node --test src/render/facilities/factory/*.test.js` from the demo root; supply `FLEET_THREE_MODULE` for actual Three r128 tests. Contact tests verify real transformed floor/pad support, mount coordinates, the external carton's flap/part contacts, product placement, seated operator scale/fit, pause/reset and no asset-owned cargo copies.

The renderer still owns route clearance, cargo/actor positioning, handoff continuity, LOD activation, context recovery and browser performance. A passing mechanism test is not an end-to-end process acceptance.
