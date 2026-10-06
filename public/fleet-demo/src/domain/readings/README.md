# Odometer authority domain

Dependency-free ES modules; run `node --test tests/domain/odometer.test.js` from the demo root.

## Entry point

Import from `src/domain/readings/index.js`:

- `createScenario()` creates an independent, deeply frozen synthetic fixture with explicit B authority for migrated `TRK-104` and A authority for unmigrated `TRK-208`.
- `createScenario({authorityApplied:false})` starts the guided repair demo: `TRK-104` is unresolved until a human sets authority; `TRK-208` remains resolved from A.
- `evaluateReadings({readings, policies, exclusions, asOf, vehicles})` returns immutable canonical vehicle projections, per-row decisions and deterministic review facts.
- `replayReadings(state, {asOf})` returns a labeled derived projection. Raw evidence and synthetic service facts are not rewritten.
- `importReadings(state, incoming)` returns `{state, importedCount, duplicateCount}`. IDs are stable raw-event IDs. Identical retries retain the original receipt; reusing an ID with changed event data fails atomically.
- `applyConfigurationCommand(state, command)` returns a new frozen state. Each command requires `id`, `expectedVersion`, `effectiveFrom` and `type`. A stale version fails; repeating the identical command is idempotent.

Command types:

- `set-authority`: required `vehicleId`, `sourceId`; optional `field` (default `odometer`) and `maxAgeHours` (illustrative default 48).
- `exclude-reading`: required `readingId`, `reason`. Scope is pinned to the original row's source, vehicle and field.
- `exclude-source`: required `sourceId`, `reason`; optional `vehicleId` and `field`. Omitting both expressly means integration-wide. Empty scope strings are rejected to avoid accidental scope broadening.
- Optional `effectiveUntil` ends a configuration interval at an exclusive boundary. Policy and exclusion changes are append-only; original versions remain available for derived replay.

## Selection rules and boundaries

`asOf` is explicit: no wall clock is used. A row is visible only after its import timestamp. Freshness and within-source ordering use observation timestamps. Canonical kilometres use 1 mile = 1.609344 km and millimetre rounding; raw values and units remain unchanged.

Authority is selected by vehicle and field, effective time, then configuration version. Conflicting equal-version policies are unresolved. Newest observation is considered only inside the explicitly authoritative source. Missing, stale, excluded, invalid or conflicting newest observations stay unresolved. An unexplained within-source decrease stays unresolved. None of these conditions silently choose another source, an older reading or the maximum reading. This is an explicitly conservative demo policy, not a claim about the customer's original validation rules.

The domain contains no historical maintenance scheduler. Illustrated consequences and immutable synthetic service examples are labeled separately. Reported incident details are confined to partial migration, frozen/current readings, repeated oil changes and tire rotations, and shop technicians discovering the problem. Real values, provider brands, financial amounts and exact historical triggers are not inferred.

## Advisory import review

`buildReviewInput(state)` exports frozen evidence, known migration facts, explicit unknowns, deterministic expected flags and invariant checks. `src/domain/replay/synthetic-review-input.json` is a saved input for the unresolved guided fixture.

`reviewImports(state, provider)` accepts an object with `mode`, `label` and async `review(input)`. Modes are `simulated`, `recorded` or `live`; the mode must truthfully reflect the caller's implementation. The built-in default is `createSimulatedReviewProvider()`, visibly labeled “no model call.” `createRecordedReviewProvider({label, review})` serves saved results and is not a live API.

Providers get immutable data, no credentials or state-changing callbacks. Output is limited to advisory findings with source evidence IDs, confidence and an optional human-reviewed next step. Unknown action fields are discarded; unknown evidence IDs are rejected. Notifications are in-app only. Review never changes authority, exclusions, raw readings or service facts.

This module is an in-memory demonstrator, not production storage, authentication, a provider credential API or a service-record correction system.
