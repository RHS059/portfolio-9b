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
- `exclude-reading`: required `readingId`, `reason`. Scope is pinned to the original row's source, vehicle and field. If the command also supplies a vehicle, source or field, it must match that row; conflicting scope fails as `EXCLUSION_SCOPE_MISMATCH`.
- `exclude-source`: required `sourceId`, `reason`; optional `vehicleId` and `field`. Omitting both expressly means integration-wide. Empty scope strings are rejected to avoid accidental scope broadening.
- Optional `effectiveUntil` ends a configuration interval at an exclusive boundary. Policy and exclusion changes are append-only; original versions remain available for derived replay.

## Selection rules and boundaries

`asOf` is explicit: no wall clock is used. A row is visible only after its import timestamp. Freshness and within-source ordering use observation timestamps. Canonical kilometres use 1 mile = 1.609344 km and millimetre rounding; raw values and units remain unchanged.

Authority is selected by vehicle and field, effective time, then configuration version. Conflicting equal-version policies are unresolved. Newest observation is considered only inside the explicitly authoritative source. Missing, stale, excluded, invalid or conflicting newest observations stay unresolved. An unexplained within-source decrease stays unresolved. None of these conditions silently choose another source, an older reading or the maximum reading. This is an explicitly conservative demo policy, not a claim about the customer's original validation rules.

Ingestion rejects changed event data under a reused raw ID globally. Direct historical projection detects duplicate identity conflicts only among visible odometer rows: future receipts and other fields cannot poison an earlier odometer projection. They remain separately labeled in diagnostics.

The domain contains no historical maintenance scheduler. Illustrated consequences and immutable synthetic service examples are labeled separately. Reported incident details are confined to partial migration, frozen/current readings, repeated oil changes and tire rotations, and shop technicians discovering the problem. Real values, provider brands, financial amounts and exact historical triggers are not inferred.

## Advisory import review

`buildReviewInput(state)` exports frozen evidence, known migration facts, explicit unknowns, deterministic expected flags and invariant checks. `src/domain/replay/synthetic-review-input.json` is a saved input for the unresolved guided fixture.

`reviewImports(state, provider, {asOf})` accepts an object with `mode`, `label` and async `review(input)`. Modes are `simulated`, `recorded` or `live`; the mode must truthfully reflect the caller's implementation. The built-in default is `createSimulatedReviewProvider()`, visibly labeled “no model call.” `createRecordedReviewProvider({label, input, review})` serves saved results and is not a live API. `input` must be the exact original `buildReviewInput` snapshot sent to the reviewer; an unbound recording is rejected.

Every review carries SHA-256 provenance over canonical input JSON, its reviewed configuration version and replay cutoff. Recorded providers compare the complete canonical snapshot and reject any mismatch as `RECORDED_REVIEW_INPUT_MISMATCH`, preserving original/requested provenance on the error. They never restamp stale findings as current. New raw imports, changed authority/exclusions and changed replay cutoffs require a matching recording or a fresh review. Clear cached UI reviews when these inputs change. Hashing uses native Web Crypto (HTTPS or localhost) without dependencies.

Provider output is plain text: the UI must use text nodes or HTML escaping, never execute it or convert provider strings into controls. The boundary rejects more than 20 findings, labels over 160 characters, summaries over 1,200 characters, suggested actions over 600 characters, more than 32 evidence IDs per finding, IDs over 128 characters and more than 16,000 total summary/action characters. Null/malformed findings, blank text, hidden control characters and unknown evidence IDs fail with a domain error. Unknown command/action fields are discarded before copying recorded outputs. Mode and label are captured before async work, so a provider cannot change its apparent identity mid-review.

Providers get immutable data, no credentials or state-changing callbacks. Output is limited to advisory findings with source evidence IDs, confidence and an optional human-reviewed next step. Unknown action fields are discarded; unknown evidence IDs are rejected. Notifications are in-app only. Review never changes authority, exclusions, raw readings or service facts.

This module is an in-memory demonstrator, not production storage, authentication, a provider credential API or a service-record correction system.
