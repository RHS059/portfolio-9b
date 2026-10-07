# Factory close-detail visuals

Original monochrome procedural geometry for an illustrative drone-assembly interior. It depicts recognizable equipment and staged products, not a validated production line, vendor machine model, manufacturing specification or throughput claim.

## Asset and view API

`createFactory({ THREE })` retains the existing `centerpoint` site ID, local meter frame and 150 × 90 × 12 m envelope. The shared renderer owns geographic transforms and camera decisions. The mapped port and depot/workshop assets are not changed.

- `factory.userData.setDetailLevel('overview' | 'detail')` selects mutually exclusive factory contents. Default is `overview`
- `factory.userData.update(snapshot)` consumes read-only visual state
- `factory.userData.workcells` lists stable station IDs, local XY origins and illustrative stage labels
- `factory.userData.getAssemblyState()` exposes frozen mechanical state for diagnostics
- `factory.userData.dispose()` prevents further visual updates; the renderer disposes attached geometry/materials

The detailed cells have black extrusion frames, robot pedestals, shoulder/elbow/wrist joints, gripper fingers, workpiece clamps, part magazines, control consoles, roller conveyor hardware and an overhead QA camera carriage. Drone stages include a sandwich frame, diagonal arms, four motor pods, propeller blades, a faceted canopy, battery/controller forms, camera gimbal and landing skids. Finished examples rest in open shipping cradles.

## Mechanical-state adapter

The narrow rendering input is `snapshot.factoryAssembly.cells`, containing `{ id, progress }` for the four exported workcell IDs. Progress is a clamped value from 0 through 1; completion does not wrap to the next cycle. This controls pick, lift, transfer, place and retract poses. Shoulder/forearm lengths remain fixed. With no explicit progress, new assembly arms remain idle rather than beginning independent process loops.

This interface controls mechanical poses only. It does not create or transfer inventory, assign material ownership, dispatch vehicles or alter source/service records. The displayed drone stages are static staged examples. A connected material-flow controller must provide actual product/carrier IDs, handoff ownership and stage visibility before this can be described as an end-to-end receiving-to-dispatch simulation. Existing overview sorting motion is retained separately for compatibility.

The internal workcell constructor also supports explicitly enabled offline preview cycling, which is not enabled by the factory runtime. No timer, RAF callback, clock read or random sampling is created by the asset. Replaying the same supplied progress reproduces the same pose; changing detail level applies the most recent snapshot immediately, including while paused.

## Cost and validation

Palette-batched static solids and two instanced primitive families keep detailed mechanical parts bounded. Factory-only measured complexity:

- Overview: 21 renderable objects / 804 triangles
- Detail: 26 renderable objects / 15,948 triangles

These are geometry counts, not frame-rate measurements. The renderer should enable detail only for a close factory view. The distant factory remains inexpensive and does not evaluate new articulated poses while hidden.

Run `node --test src/render/facilities/factory/detail.test.js` from the demo root. Actual geometry tests use a local Three installation or `FLEET_THREE_MODULE`. Tests cover LOD exclusivity, fixed link lengths, explicit-progress behavior, immutable snapshots, pause/replay/reset, finite instance transforms, budgets and disposal ownership. Facility bounds tests account for instance matrices because Three r128's generic `Box3.setFromObject` does not.

Close-up CPU previews of exported geometry were inspected for recognizable equipment and drone components. Integrated WebGL appearance, close-up selection, shared-process handoffs and hardware frame rate require separate integration checks.
