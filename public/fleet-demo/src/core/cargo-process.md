# Illustrative cargo process contract

`sampleCargoProcess(timeSeconds, {paused})` is the primary API. Feed it the existing
simulation clock, then give the renderer `cargoProcess: process` and
`factoryAssembly: process.factoryAssembly`. It creates no timer and reads no
odometer, source-authority or maintenance data. Changing a source setting cannot
change this process. The scenario is illustrative, not production history.

Every returned object and array is frozen. Repeated calls, reverse seeks and reset
to zero are deterministic. Pausing is owned by the caller's clock; passing
`paused:true` alone does not stop a new absolute time from being sampled. The
optional `createCargoProcess()` adapter has `tick`, `pause`, `resume`, `setPaused`,
`reset`, `getSnapshot` and a non-mutating `snapshotAt` for isolated consumers.

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
`trailerAttached`, `trailer`, `loaded`, `loadProgress`, `rearDoorOpen`, `reversing`,
`stopped`, and `stopAnchorId`. Door/load/grip progress is normalized 0–1. Forklifts
expose `workerId`, `operatorPresent`, `forkHeight` in authored meters and `grip`.
Floor robots expose `carrying`, `payload`, and `lift`.

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
| 118–128 | complete | consumed; completed drone visible |

The semi backs in between 58 and 61. It then stops before its rear doors open
between 61 and 62. The forklift unloads the cargo; the semi stays parked as its
doors close between 72 and 74, then returns empty between 74 and 106. Its trailer
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
`armAction` is `open-box`, `assemble-drone`, or `park`.

The machinery can read the complete process snapshot for cargo attachments and
finished drone identity. The narrow existing assembly normalizer may forward only
`id` and `progress`; it needs extending if machinery reads the additional fields.

## Events and tests

`cargoEventsBetween(fromSeconds, toSeconds, {limit})` derives stage-entry events
in the half-open interval `(from, to]`, without stored history. `drone-completed`
includes the product ID. Finished products stop at the workcell output in a ready state; outgoing dispatch transport is not implemented. Reset/reverse intervals produce no stale events. At most
128 events are returned; a large seek returns recent events and `omittedCount`.
Do not replay omitted events into a second source of process state; sample the
absolute snapshot instead.

Run `node --test tests/core/cargo-process.test.js`. It verifies custody, handoffs,
loading, backing and doors, empty return, two-bay exclusion over eight cycles,
box-before-drone ordering, snapshot immutability, pause/reset/seek, invalid inputs,
bounded counts and nonduplicating transition events.
