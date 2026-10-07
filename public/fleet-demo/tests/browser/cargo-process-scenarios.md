# Connected cargo process acceptance

This is an independent acceptance plan for the explicitly illustrative ship-to-drone process. It does not describe historical odometer imports, service scheduling, production inventory or live operations. The existing maintenance workflow remains a separate regression suite.

## Contract under review

The agreed interface is a pure, immutable `sampleCargoProcess(timeSeconds, { paused })`, sampled by the application's existing 20 Hz clock. The bounded presentation has four shipment slots, two ships and two receiving bays. Cargo records carry `id`, `cycleIndex`, `transferId`, one `owner { kind, id, anchorId }`, one `attachment { parentId, anchorId }` and transfer `motion { fromAnchorId, toAnchorId, progress }`. Loaded cargo belongs to a trailer, such as `TRAILER-401`.

Factory cells use the existing four IDs: `frame-jig`, `motor-install`, `propeller-install`, `final-assembly`. They retain `progress` and add `active`, `cargoId`, `stage` (`idle`, `box-opening`, `drone-assembly`, `complete`), `boxOpen`, `assemblyProgress` and `armAction` (`open-box`, `assemble-drone`, `park`). Exact stage timings, anchor IDs, actor footprints and recycling boundaries must come from the delivered contract, rather than this test plan.

## Native acceptance gates

1. Every sampled live cargo ID has one owner. No two live records share the same cargo ID. Each factory-cell cargo reference points to a live cargo record. Verify explicitly declared consumption/completion boundaries rather than requiring cargo to persist forever.
2. Over a full declared cycle and around every stage boundary, identity and transfer IDs remain stable as required by the contract. Slot recycling uses a new batch/cycle identity and cannot duplicate an earlier live batch.
3. Sampling does not mutate inputs, earlier snapshots or maintenance/domain state. The result and its nested records are immutable. Equal inputs produce equal snapshots regardless of call order, skipped frames or rewind.
4. Pause holds the controller's process time. Repeating the pure sampler at that time holds ownership, cargo, doors, wheels, forks, carton lids and robot-arm transforms. Do not require a pure sampler to remember a prior call at a different time.
5. Replay resets the process clock and reproduces initial and intermediate snapshots/transforms. Repeated reset and navigation do not create extra actors, retain old parents or leak animation clocks.
6. Every occupied bay, forklift, storage slot, AMR or cell respects its declared capacity. Multiple shipments cannot claim a single-capacity receiving location at the same sample.
7. The renderer resolves each owner/attachment anchor and renders one physical cargo instance for that identity. Handoffs reparent or transfer that instance once. The departing carrier is visibly empty afterward; donor and receiver cannot both retain full cargo copies.
8. Immediately before, at and after handoff, world-space attachment points meet within the agreed geometric tolerance. Validate full cargo support footprints and relevant actor clearances, not center points alone. Raised crane booms may extend over water; crane bases stay inland.
9. Factory delivery trucks stop at their assigned exterior bays. The full tractor/trailer footprint and swept path stay outside the factory's solid interior and avoid occupied receiving actors. Service visits use the separately specified tractor-only vehicle.
10. Road tractor/trailer articulation keeps the fifth wheel and kingpin connected. Wheel rotation derives from actual route travel and respects pause, reversal and replay. A delayed detached trailer animation fails.
11. Box-opening and drone-assembly actions match the explicit cell input. Closed boxes do not reveal a finished drone; assembly does not advance from wall-clock time alone. Missing process input leaves the assets idle.
12. LOD changes preserve cargo identity, world pose and process state. At most one visual representation per identity is visible. Actor counts remain bounded through several cycles and disposal/recovery.

## Required browser evidence

Use the actual native portfolio route. Record the exact commit, CI run, viewport and renderer environment. Collect stage-specific screenshots, not only a global overview:

- Ship cargo, suspended load and empty/loaded semi at the same transfer, with the cargo ID/owner available through a read-only assertion seam
- Exterior factory bay with stopped truck, worker/forklift and unloading motion
- Cargo on storage support, then on an identifiable floor robot, with both departure and arrival visible
- Box-opening and drone assembly close-ups at the four workcells
- Pause during transfer, replay/reset, LOD transition, mobile composition and repeated route mounting
- Independent Three overlay and map recovery after context loss, preserving a single coherent process state and no invalid-GL/page errors

A screenshot alone cannot establish motion continuity or conservation. Pair the captures with sampled identity/parent/world-transform evidence; use a short video when available for articulation and handoffs. Do not certify hardware FPS from software-rendered CI cadence.

## Stopping gates

Stop acceptance and report the exact revision when cargo is duplicated/lost without a declared lifecycle transition, owner anchors cannot resolve, handoff poses jump, trucks enter the factory, pause/replay advances hidden animation, process actions modify maintenance facts, or required exact-head checks fail. Missing source/anchor data is an integration dependency, not a passing check. Resume after the owning worker supplies a revised candidate.

Working-baseline acceptance requires passing native contracts, integration checks and actual connected-flow browser evidence on the same integrated revision. Broader visual redesign remains outside this increment.
