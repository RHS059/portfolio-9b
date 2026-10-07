# Illustrative cargo process contract

`sampleCargoProcess(timeSeconds, {paused, presentationOffsetSeconds})` is the primary API. Feed it the existing
simulation clock, then give the renderer `cargoProcess: process` and
`factoryAssembly: process.factoryAssembly`. It creates no timer and reads no
odometer, source-authority or maintenance data. Changing a source setting cannot
change this process. The scenario is illustrative, not production history.

Every returned object and array is frozen. Repeated calls, reverse seeks and reset
to zero are deterministic. Pausing is owned by the caller's clock; passing
`paused:true` alone does not stop a new absolute time from being sampled. The
optional `createCargoProcess()` adapter has `tick`, `pause`, `resume`, `setPaused`,
`reset`, `getSnapshot` and a non-mutating `snapshotAt` for isolated consumers.

## Populated initial presentation

Raw sampling keeps its original behavior: omitted `presentationOffsetSeconds`
means zero, so `sampleCargoProcess(0)` shows the initial cargo on the ships. For the
interactive demo, explicitly pass the exported
`CARGO_PRESENTATION_OFFSET_SECONDS` (102.5). That places the first frame within a
populated illustrative pipeline: ship unloading, one loaded road shipment,
forklift receiving and drone assembly are all active across the four slots.

`timeSeconds` always remains the app clock. `processTimeSeconds` is app time plus
the validated presentation offset and owns the material phases. Resetting the app
clock to zero therefore reproduces the exact populated frame and cargo IDs; no
second timer, historical records or dispatch history are created. Changing the
option is a seek, so a renderer should discard interpolation across the change.
The optional adapter also accepts
`createCargoProcess({presentationOffsetSeconds})`; a `snapshotAt` call can override
that offset explicitly without mutating its clock.

## Identities and limits

- Four slots, `CARGO-01` through `CARGO-04`; four active kits at most
- Kit IDs include the batch, for example `CARGO-01-B0001`
- `cycleIndex` and `transferId` let rendering discard interpolation at a batch wrap
- Two berthed ships, `SHIP-01` and `SHIP-02`
- Four dedicated `CARGO-401` through `CARGO-404` trucks, each with its own
  `TRAILER-401` through `TRAILER-404`
- Two exterior receiving bays, `factory-receiving-01` and `factory-receiving-02`,
  assigned to slots 0/2 and 1/3. Their occupied intervals never overlap.
- Four cranes, forklifts with worker IDs, floor robots and finished-product slots
- One QA station, two dispatch staging positions, and two capacity-one outbound
  carriers `OUTBOUND-501`/`OUTBOUND-502` at separate exterior dispatch bays
- Factory cells retain `frame-jig`, `motor-install`, `propeller-install`,
  `final-assembly`

Story vehicles `TRK-104` and `TRK-208` are not process entities. Cargo trucks have
`inspectable:false` because they have no source-reading fixture.

## Material ownership and attachments

Each kit has exactly one `owner: {kind, id, anchorId}`. `carrierId` aliases owner ID;
`attachment: {parentId, anchorId}` names its one visual parent. An actor's `cargoId`
claim matches that custody. Do not render copies from both the cargo and actor lists.
A loaded kit belongs to its trailer, not its tractor. Storage and workcell custody
are explicit. Completed parts kits have `visible:false`, owner kind `consumed` and
a finished `products` entity linked by `sourceCargoId`.

`motion: {fromAnchorId, toAnchorId, progress}` gives semantic movement. All anchors
are exported in `CARGO_SLOTS[].anchors`. Renderers own geographic/physical locations
and routes. At handoff, ship load, crane pickup, trailer payload, fork payload,
storage and robot deck anchors must coincide before reparenting. The process must
not decide world coordinates or send the semis inside the factory footprint.

Truck snapshots include `routeId`, `progress`, `bayId`, `trailerId`,
`trailerAttached`, `trailer`, `loaded`, `loadProgress`, `loadAccessProgress`,
`secureProgress`, `loadSecured`, `travelCycle`, `reversing`, `stopped`, and
`stopAnchorId`. Load/access/grip progress is normalized 0–1. Both directions use
open flatbeds; obsolete `rearDoorOpen` metadata has been removed. Forklifts
expose `workerId`, `operatorPresent`, `forkHeight` in authored meters and `grip`.
Floor robots expose `carrying`, `payload`, and `lift`. Incoming `forkHeight` is
explicitly a cargo-bottom support above the floor (`forkHeightReference:'cargo-bottom'`),
not the top of the fork mesh. Its 1.23 m pickup value plus the 0.25 m receiving
floor places the pallet bottom at 1.48 m. The actual fork contact is the measured
pallet pocket 0.095 m higher (`forkPocketOffset`); the renderer adds that offset
when setting the asset's lift height.

For unloading, hold 1.23 m through the first 15% while extracting the pallet;
only then lower to 0.55 m over 15–30%, travel at 0.55 m through 85%, and raise to
0.975 m over 85–100%. The final pallet support is 1.225 m above world ground.
`loadPhase` names extract/lower/carry/place. Empty return lowers smoothly to
0.18 m. These measured values describe presentation supports only.

## Timeline

Each slot repeats every 128 seconds, starting at offsets 0, 32, 64 and 96. Before a
slot's first start its kit is waiting aboard its ship. Its relative phases are:

| Seconds | Stage | Material owner |
| --- | --- | --- |
| 0–6 | ship | ship |
| 6–16 | ship-unloading | crane |
| 16–22 | truck-loading | crane |
| 22–26 | truck-loaded | trailer |
| 26–58 | road-transit | trailer |
| 58–62 | bay-arrival | trailer |
| 62–72 | forklift-unloading | forklift |
| 72–78 | storage | storage |
| 78–88 | robot-transport | floor robot |
| 88–94 | box-opening | workcell |
| 94–118 | drone-assembly | workcell |
| 118–128 | complete | consumed; finished product continues in its output lifecycle |

The semi pulls forward through the exterior receiving lane between 58 and 61,
with `reversing:false`. It then stops and releases the secured load between 61 and
62 for side forklift access. After unloading, it stays parked while the loading
area clears between 72 and 74, then returns empty between 74 and 106. Its trailer
stays attached during the cargo route. The workshop tractor-only presentation is
separate and belongs to the renderer's story-vehicle presentation.

Semantic route IDs are `cargo-port`, `cargo-outbound`, `cargo-arrival`, `cargo-bay`,
and `cargo-return` (agreed with the renderer adapter). The route adapter uses the slot and bay to select physical
geometry. Outbound ends at `bayApproach`; arrival connects that point to `bayTruck`;
the parked route holds the exterior `bayTruck` anchor. Road trailers must follow
physical tractor path history rather than rotate rigidly with the tractor.

## Assembly adapter

`factoryAssembly.cells` includes `{id, progress}` for the existing machine adapter,
plus `cargoId`, `active`, `stage`, `boxOpen`, `assemblyProgress`, and `armAction`.
`progress` advances continuously across box opening and assembly. `boxOpen`
advances first, then stays at 1 while `assemblyProgress` advances. Idle cells get
explicit progress zero, never an independent free-running animation clock.
`armAction` is `open-box`, `assemble-drone`, `handoff-output`, or `park`.
`outputProductId` is present only while that cell owns its visible product;
`outputTransferProgress` controls the completed-product transfer to the AMR pickup.

The machinery can read the complete process snapshot for cargo attachments and
finished drone identity. The narrow existing assembly normalizer may forward only
`id` and `progress`; it needs extending if machinery reads the additional fields.

## Finished-product QA, sorting and outgoing fleet flow

The incoming 128-second stages, IDs, warm-start options and `cargoEventsBetween`
remain unchanged. A separate bounded product lifecycle retains each finished
`DRONE-CARGO-<slot>-B<batch>` and `sourceCargoId` across the next incoming kit's
rollover. The product slot is replaced only when its next assembly begins, never
at the 128-second kit reset. No production or service records are created.

`PRODUCT_STAGES` uses the same relative clock as its source kit:

| Seconds | Product stage | Single owner |
| --- | --- | --- |
| 94–118 | assembling | workcell |
| 118–122 | ready / output handoff | workcell |
| 122–130 | qa-transport | floor robot |
| 130–138 | qa-testing | QA station |
| 138–146 | dispatch-transport | floor robot |
| 146–152 | dispatch-staged | dispatch staging |
| 152–156 | outbound-loading | forklift |
| 156–158 | outbound-loaded / secure load | outgoing trailer |
| 158–178 | outbound-transit | outgoing trailer |
| 178–222 | fleet-received | illustrative outgoing fleet |

Before the first assembly a product is `pending` and hidden. `progress` and
`assemblyProgress` preserve their assembly meaning; `stageProgress` and
`motion.progress` describe the outgoing phase. `completed` becomes true at 118,
`qaPassed` only after the full test interval at 138. Outgoing loading therefore
cannot happen before completion and QA. Each product has exactly one owner,
attachment and active actor claim. Receipt is terminal and hidden; it is a visual
process state, not an assertion about real-world delivery history.

The same AMR approaches the workcell output during 118–122, carries the product to
QA's input, then takes a separate empty bypass around the solid test station while
the product is tested. It receives the product at the QA output at 138 and delivers
it to dispatch input at 146. It holds there while the product rolls off during
146–148, then explicitly returns empty from dispatch input to its original park
during 148–158. The same worker-operated forklift approaches staging during 146–152,
loads the outgoing vehicle during 152–156, then returns empty during 156–166.
Neither reuse overlaps the actor's next incoming assignment.

Snapshot additions:

- `qaStations`: one `QA-01` station, capacity 1, with `productIds`
- `dispatchStaging`: `DISPATCH-01`/`DISPATCH-02`, capacity 1 each, sorted by destination
- `outboundVehicles`: `OUTBOUND-501`/`OUTBOUND-502`, capacity 1 each, with `productIds`,
  `loaded`, `secureProgress`, `loadSecured`, `qaPassed`, semantic route and bay fields
- Actor `productId` identifies an outgoing payload; its `cargoId` is then null
- Outgoing forklift `forkHeightMode:'anchors'` and `forkSupportMotion` replace
  numeric `forkHeight`, so the renderer derives exact height from measured mounts

Slots 0/2 use the first outgoing vehicle and dispatch bay; slots 1/3 use the
second. They are open-flatbed carriers (`model:'truck'`, `bodyStyle:'open-flatbed'`)
with attached `TRAILER-501`/`TRAILER-502`. Loaded products attach to those trailers,
not the tractors. There are no outgoing door fields or door-opening claims.
Assignments are 64 seconds apart. The vehicle stays parked while loading,
secures its load while stopped, travels outward during 158–178 and returns empty
during 178–200, before its next load. The three semantic route IDs are
`cargo-dispatch-bay`, `cargo-dispatch-outbound`, and `cargo-dispatch-return`.
QA and staging never exceed their capacities. No extra queues or unbounded
inventories are accumulated.

All new physical mounts are semantic `CARGO_SLOTS[].anchors`: `cellDispatchPickup`,
`qaInput`, `qaTest`, `qaOutput`, `qaBypassIn`, `qaBypassOut`, `dispatchInput`,
`dispatchStaging`, `dispatchVehicle`, `outboundLoad`, `fleetHandoff`, and
`forkliftStowed`. Incoming storage also has a separate `storageRobotPickup` mount. The ready phase explicitly transfers the product from the cell
output to the AMR-height pickup; it must not jump vertically when ownership
changes. QA/staging supports and the outgoing carrier load mount must likewise
match the renderer's actual assets. Carrier model/bed support and geographic
outgoing routes must be verified in rendering before activating the visual flow.
The process never guesses their world coordinates.

## Paired roller mounts and wheel continuity

Tables and carrier platforms have separate adjacent mounts. The process expresses
transfers explicitly rather than making an AMR occupy a solid table:

- Storage: AMR approaches `storageRobotPickup` during 72–77, then holds. Cargo
  stays at `storage` until 77 and rolls to `storageRobotPickup` during 77–78,
  retaining storage ownership until the AMR transport begins at 78.
- QA: product rolls `qaInput`→`qaTest` during 130–132, is tested at that mount
  during 132–136, then rolls `qaTest`→`qaOutput` during 136–138. The empty AMR
  travels `qaInput`→`qaBypassIn` during 130–132, across to `qaBypassOut` during
  132–136, then to `qaOutput` during 136–138. Custody switches at the common output.
- Dispatch: product rolls `dispatchInput`→`dispatchStaging` during 146–148 under
  staging ownership. The AMR holds at the input until the roll-off is complete,
  then returns during 148–158. The product stays staged until forklift pickup at152.

Roller progress uses smoothstep `3p²−2p³` for zero endpoint speed. Stage boundaries,
resource capacities and ownership IDs are unchanged. The renderer owns exact
mount coordinates and must honor these motion endpoints and measured supports.

`travelCycle` counts completed physical circuits for wheel-distance continuity,
independently of a shipment ID changing. Incoming trucks advance it at relative
106 seconds, retain it through the waiting interval, and do not increment again
at their 128-second kit rollover. Outgoing carriers alternate shipment slots;
OUTBOUND-501 advances at 200, 264, 328… and OUTBOUND-502 at 232, 296, 360… . These
counters remain correct while the carrier is waiting, with no active product.
Use completed circuits plus distance on the active route; never reset wheel
travel at a cargo batch boundary. Pause and reset still use the single app clock.

## Events and tests

`cargoEventsBetween(fromSeconds, toSeconds, {limit, presentationOffsetSeconds})` derives stage-entry events
in the half-open interval `(from, to]`, without stored history. With an offset,
input times and each event's `timeSeconds` remain in the app clock; the event's
`processTimeSeconds` exposes its phase time. Earlier warm-up events are not emitted.
Pass the same offset used for snapshots; each event's cargo identity, stage and
owner then match the snapshot at that event's app time. `drone-completed`
includes the product ID. Reset/reverse intervals produce no stale events. At most
128 events are returned; a large seek returns recent events and `omittedCount`.
Do not replay omitted events into a second source of process state; sample the
absolute snapshot instead.

`productEventsBetween(fromSeconds, toSeconds, options)` is the separate outgoing
event API, with the same offset, interval and capacity semantics. It includes
`product-qa-passed` and `product-fleet-received`. It does not add output events to
the original inbound event stream.

Run `node --test tests/core/cargo-process.test.js`. It verifies custody, handoffs,
loading, forward pull-through and secure access, empty return, two-bay exclusion over eight cycles,
box-before-drone ordering, snapshot immutability, pause/reset/seek, invalid inputs,
bounded counts, nonduplicating transition events, populated-start snapshot/event agreement, and measured fork support heights, product conservation across rollover, QA-before-dispatch, output capacity, explicit machine returns, outgoing event/snapshot agreement, wheel-cycle endpoint continuity, measured pocket extraction, paired roller transfers, and no semantic jumps at their boundaries.
