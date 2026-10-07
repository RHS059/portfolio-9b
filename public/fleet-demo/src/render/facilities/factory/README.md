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

Cells read `active`, `cargoId`, `stage`, `progress`, `boxOpen`, `assemblyProgress`, and `armAction`. Accepted stages are `idle`, `box-opening`, `drone-assembly`, and `complete`; arm actions are `park`, `open-box`, `assemble-drone`, and `handoff-output`. The supported wrappers are `snapshot.process`, `snapshot.cargoProcess`, or a direct process object containing cargo and factoryAssembly. Older explicit mechanical-preview inputs remain supported without claiming cargo ownership.

Inactive cells park. Connected mode disables the earlier independent sorting loop and decorative cargo copies. No local conveyor or assembly timer advances independently of the process snapshot.

## One cargo object and one product object

The renderer creates and positions its existing pallet/opening-carton object exactly once. Factory machinery does not create another crate. For each sampled state the renderer calls the crate's `setOpen(boxOpen)` and `setAssemblyProgress(assemblyProgress)` together with the factory cell setter.

`cartonOpeningPose` supplies both the carton flap transforms and the arm's contact path. Flaps open sequentially with an approach/grasp/open/retract sequence. The gripper meets the actual flap edge during engagement. The carton exports `getToolContact()`, `getFlapContact()`, `pickupMount`, and `getPickupContact()` in carton-local coordinates. The pallet adds 0.19 m below the carton.

`createAssemblyProduct({ THREE })` from `product.js` returns a renderer-owned product at a bottom-support origin. The renderer supplies its position, visibility and identity from `process.products`. `setProgress()` / `setAssemblyProgress()` reveals installed electronics, motor pods, shell and propellers. `partMounts` and `installedPartIds` are read-only diagnostics. The staged base frame represents the product's starting fixture state; it is not an audited bill of materials.

`assemblyStep` coordinates source, gripper and product appearance. A source part remains in the carton until the pickup contact; it is visible on the gripper during transfer; the product part appears only at the placement contact. These are visual setters for the same explicit progress, not new inventory events. The renderer must apply all corresponding setters from the same snapshot.

## Operators and equipment

`createForklift` exposes `payloadMount`, named `seatMount`, `setLiftHeight()` and `update({liftHeight,travelMeters})`. Its operator seat is [0,-0.12,1.05] and foot support is Z=0.58 in forklift-local coordinates. Attach `createFactoryWorker()` at that mount and call `update({seated:true})`; the human keeps scale 1 with bent knees, platform-supported feet and hands at the controls. `operatorPresent` remains the process controller's visibility decision.

The roller AMR's support is local Z=0.975. With actor root Z=0.25 its cargo support is Z=1.225. The renderer supplies the fork-pocket offset and measured pickup lift for its trailer geometry. No terrain height is inferred by these constructors.

## Verification

Run `node --test src/render/facilities/factory/*.test.js` from the demo root; supply `FLEET_THREE_MODULE` for actual Three r128 tests. Contact tests verify real transformed floor/pad support, mount coordinates, the external carton's flap/part contacts, product placement, seated operator scale/fit, pause/reset and no asset-owned cargo copies.

The renderer still owns route clearance, cargo/actor positioning, handoff continuity, LOD activation, context recovery and browser performance. A passing mechanism test is not an end-to-end process acceptance.
## Outgoing carrier transfer

The outgoing contact contract applies to the original `createProductCarrier({ THREE })` geometry from `carrier.js`. It is not valid for a substituted frame. The sampler and carrier identify themselves as `original-drone-carrier-v1`; both must be used together by the shared renderer. Actual mesh tests cover side-jaw contact, full-size drone/arm clearance, carrier/jig clearance and fixed link lengths. Shared scene docking, routes and custody remain renderer acceptance responsibilities.

`armAction: 'handoff-output'` consumes `outputTransferProgress` (0..1) and `outputProductId`. No wall clock or kit-cycle duration is inferred. `sampleOutputTransfer(progress)` from `output-handoff.js` provides the agreed carrier trajectory for integration. The sampler returns immutable `carrierPosition`, `gripPoint`, `tool`, `wristLift`, `gripHalfWidth`, `contactEngaged`, `phase`, and `supportOrigin: 'carrier-bottom'`. The sampler explicitly tags `coordinateSpace: 'cell-relative-xy/site-root-z'` and `floorOffsetIncluded: true`: add the cell center to XY only, never add the 0.25 m floor to Z again. `factory.userData.getOutputHandoff(cellId, progress)` converts them to site-root coordinates. `productSupport`/`contact` are equivalent diagnostic aliases.

The existing `cell:<id>:output` remains the drone skid base at Z=1.7. The new `cell:<id>:carrier-output` is the cradle bottom at Z=1.53; `cell:<id>:dispatch-pickup` is cell-relative XY(-3,-4), Z=1.225. The renderer keeps the drone at carrier-local Z=0.17 through assembly and transport. The jig is lowered to meet the cradle without a ready-stage jump. The trajectory approaches above the aircraft, descends onto the side handle, lifts the carrier to site-root Z=2.0, clears the jig through XY(-3,-3.5), lowers, releases and returns the tool to its original parked pose. A visible telescopic tool stem supplies the sampled wrist clearance while both robot arm link lengths remain fixed. Product identity, visibility, custody and return routes stay outside these mechanical assets.

## QA and dispatch supports

QA now has one continuous roller bed through the scanner at Z=1.225. Site-root mounts are `qa:QA-01:input` [37,26,1.225], `qa:QA-01:test` [42,26,1.225], and `qa:QA-01:output` [47,26,1.225]. The slot-qualified form `qa:QA-01:<slot>:input|test|output` resolves to the same physical mount; it does not allocate a new station.

Dispatch mount pairs are `dispatch:DISPATCH-01:input` [50,-12,1.225] / `dispatch:DISPATCH-01:pickup` [50,-16,1.225] and corresponding `DISPATCH-02` mounts at X=62. Both stations have physical rollers and supporting frames. `getTransferMounts()` returns these read-only coordinates. All exported Z values already include the internal floor offset.

The renderer must provide physically clear AMR approaches, carrier transfers and forklift pickup routes around these fixed support beds. Matching a support height alone does not establish actor clearance or end-to-end acceptance.

## Original shared carrier

`createProductCarrier({ THREE })` owns one open frame and one `createAssemblyProduct` child. Its root is carrier-bottom; `bodyMount` stays at Z=0.17. `setProgress()` / `setAssemblyProgress()` forwards appearance progress without moving the root, assigning identity or deciding visibility. Do not render a second independent drone on top of it.

`PRODUCT_CARRIER` exports the frame envelope 2.8×2.4×0.17 m, the full ready envelope 2.8×2.4×0.98 m, the side grip [-1.25,0,0.17], actual jaw contact points, jaw half-spacing 0.095 m and fork-pocket top contact 0.10 m. The pocket opening runs from local Z=0.04 to 0.10; these are asset coordinates, not an operational load rating. `gripMount` is a real tagged Object3D. The left frame has a notch so the jaws touch only the handle, and the landing-skid supports keep the aircraft at its original scale throughout assembly.

The carrier geometry is original illustrative work. Its dimensions, strength and shipment clearance are not engineering specifications. Renderer tests must include the complete combined envelope at trucks, AMRs, docks and station transfers. `dispose()` stops setters; the renderer retains geometry/material disposal ownership.

## Dock clearance and paired roller contacts

QA dock IDs remain at X=37/47, Y=26, Z=1.225. Those points are supported by the docked AMRs, not fixed station geometry. The fixed QA bed spans X=37.8..46.2 and its support legs are at X=40/44. Exact top-of-roller contacts are `qa:QA-01:roller-input` [37.855,26,1.225] and `qa:QA-01:roller-output` [46.145,26,1.225]. The carrier bridges the gap during the shared transfer.

Dispatch inlet IDs remain at Y=-12. The north edge of fixed machinery stops at Y=-12.8; `dispatch:DISPATCH-01:roller-input` is [50,-12.855,1.225], with DISPATCH-02 at X=62. The staging/forklift pickup points remain Y=-16. The renderer approaches those pickups from the south. Do not place fixed supports beneath the AMR bodies or interpret a dock anchor as a fixed-bed raycast target.
