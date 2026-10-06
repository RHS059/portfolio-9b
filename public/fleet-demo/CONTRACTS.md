# Fleet demo integration contract v1

Frozen 2026-10-06. All source modules are browser-native ES modules, no build/transpile dependency. Node's built-in test runner runs tests. Generated `support.js` is untouched. The original application lives in `reno.html` with its original relative dependencies.

Ownership: A1 index/bootstrap `src/app`, `src/contracts`, `src/core`, build/CI integration; A2 `src/domain`; A3 `src/render/core`; Hal H1 `src/ui/provenance`; H2 `src/render/facilities`; H3 `tests/acceptance`. Integrator adapts at the boundary; no owner edits another owner's prefix without consent.

## Renderer

Export `createFleetScene({container,onSelect,onStatus})` from `src/render/core/index.js`. Return `update(snapshot)`, `setView('iso'|'3d'|'2d')`, `setFocus(entityId)`, `setFollow(boolean)`, `resize()`, `dispose()`, `getMetrics()`. `onSelect(entityId)` reports clicks. `onStatus({kind,message})` reports context loss/fallback.

Snapshot: `{timeSeconds,paused,selectedId,stage,vehicles:[{id,progress,routeId,status}],facilities:[{id,label}],issueActive,authorityResolved}`. Stable IDs: migrated vehicle `TRK-104`, unmigrated vehicle `TRK-208`; facilities `oict`, `centerpoint`, `depot`. Road route IDs may be renderer-defined and reported to integrator. Snapshot update occurs at 20Hz; renderer interpolates at browser RAF. Domain data and actual records never depend on rendered geometry or animation time. Renderer may add getMetrics fields but cannot claim target hardware performance from software rendering.

## Provenance UI

Export `createProvenancePanel({container,onAction})` from `src/ui/provenance/index.js`. Return `{update(model),dispose()}`. Model: `{mode,selectedVehicleId,readings,policies,exclusions,decisions,serviceHistory,review,configurationVersion,authorityStatus,notifications}`. Actions: `{type:'select-vehicle',vehicleId}`, `{type:'set-authority',vehicleId,sourceId}`, `{type:'add-exclusion',scope,sourceId,vehicleId,field,readingId}`, `{type:'replay'}`, `{type:'review-imports'}`. Individual exact domain field mapping will be adapter-owned, not assumed.

Then mode describes source controls and validation built in 2021–22. Today adds explicitly labeled review recommendations and in-app notifications; never silently edits raw readings, service history, or policy. Providers A/B are anonymous and are not attributed to named ecosystem products.

## Facilities

H2 exports from `src/render/facilities/index.js`. Preferred `createFacilities({THREE})` returns a THREE.Group in local Oakland scene coordinates; negotiate geometry origin/units with A3. Optional scene update function animates AMRs/incoming/outgoing sorting as purely visual state. No private assets.

## Domain

A2 supplies the final frozen function signatures in `src/domain/index.js`; A1 adapts their model into UI/render snapshots. Deterministic authority, effective-dated versioned config, four scopes of exclusions, immutable raw records/service history, duplicate import/replay idempotence, unresolved missing authoritative source and multi-vehicle isolation are required. Never latest/max fallback. Service consequences are explicitly illustrative; exact historical PM trigger is unknown.
