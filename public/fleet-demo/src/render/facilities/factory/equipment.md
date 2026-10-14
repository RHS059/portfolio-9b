# Receiving and transfer props

These original monochrome models are illustrative equipment, not validated machinery or operating instructions. They contain no timers, routing, inventory model or autonomous handoff logic.

All constructors in `equipment.js` take `{ THREE }` and return a `THREE.Group` at local origin, X right / Y forward / Z up, in meters. The process/renderer adapter owns placement and payload identity. Materials and geometry are released by the renderer after the optional disposal hook.

## Forklift

`createForklift({ THREE })` includes an open overhead guard, seat/controls, four rounded wheels with visible hubs/spokes, twin mast channels, carriage, forks and counterweight.

- `userData.update({ liftHeight, travelMeters })` uses explicit supplied values; wheel rotation derives from travel, never wall-clock time
- `liftHeight` is the horizontal fork support plane in meters, clamped to 0.055–1.6
- `userData.payloadMount` is the sole cargo mounting point, carriage-local `(0,1.65,0)`
- `userData.dispose()` blocks later mechanical changes without disposing renderer-owned resources

## Roller AMR

`createRollerAMR({ THREE })` has a compact mobile base, bumper/sensor forms and a roller transfer deck. `userData.payloadMount` is at local `(0,0,0.975)`, matching the top of the rollers. `userData.transferHeight` is 0.975 m. It has no independent navigation or pickup animation.

## Pallet and carton

`createPallet({ THREE })` returns a slatted pallet with top support plane `userData.topZ = 0.19` m.

`createOpeningCarton({ THREE })` returns a box with four hinged flaps and visible illustrative parts. `userData.setOpen(progress)` deterministically maps 0–1 to flap opening. Disposal prevents further changes.

## Connected handoff requirement

The controller must keep one cargo object/ID and transfer it between mounting groups only at an explicit completed handoff. Aligning, reserving space, lift/lower/roller movement and source/destination occupancy belong to the shared process state. These models must not clone boxes to suggest a transfer or infer operational capacity.

Tests verify deterministic lift/wheel/flap controls, single-object reparenting, transfer-height alignment, disposal and finite opaque geometry. CPU geometry previews were inspected; integrated browser process continuity remains a separate acceptance step.
