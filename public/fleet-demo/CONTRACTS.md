# Fleet demo integration contract v1

The demo uses browser-native ES modules with no build or transpilation dependency. Node's test runner covers its domain, presentation and geometry contracts. The original console remains in `reno.html`; its generated `support.js` is unchanged.

## Scene

`createFleetScene({container,onSelect,onStatus})` from `src/render/core/index.js` returns `update(snapshot)`, `setView('iso'|'3d'|'2d')`, `setFocus(entityId)`, `setFollow(boolean)`, `resize()`, `dispose()` and `getMetrics()`. A null focus restores the geographic overview. Selection uses stable IDs.

Snapshot: `{timeSeconds,paused,selectedId,stage,vehicles:[{id,progress,routeId,status,model?,inspectable?}],facilities:[{id,label}],issueActive,authorityResolved}`. The visual clock supplies 20 Hz updates; the scene interpolates at browser RAF. Camera, culling, model choice and visual motion cannot mutate source readings or service history. Metrics report the actual browser/renderer and distinguish observed cadence from target-device performance.

Stable entities: migrated vehicle `TRK-104`, unmigrated vehicle `TRK-208`, and locations `oict`, `centerpoint`, `depot`. Background traffic can set `inspectable:false` when it has no source records in this fixture.

## Provenance UI

`createProvenancePanel({container,onAction})` from `src/ui/provenance/index.js` returns `{update(model),dispose()}`. The model supplies `{mode,selectedVehicleId,readings,policies,exclusions,decisions,serviceHistory,review,configurationVersion,authorityStatus,canonical,notifications,asOf}`. Optional `showVehicleSelector:false` lets the containing app provide vehicle tabs.

Actions are declarative: `select-vehicle`, `set-authority`, `add-exclusion`, `replay`, `reimport` and `review-imports`. Exclusion scopes are exactly `reading`, `field`, `vehicle`, or `integration`; unknown or contradictory scopes are rejected. The app converts these intents into version-checked domain commands.

Then describes the 2021–22 source controls. Today is an explicitly labeled advisory review with in-app notifications. It cannot silently edit records, service facts or settings. Providers A/B remain anonymous and are not attributed to named ecosystem products.

## Facilities

`createFacilities({THREE})` from `src/render/facilities/index.js` returns an untagged THREE.Group with direct children identified by `userData.siteId`. Each child is authored at its own local origin in meters: X east, Y north, Z up. The scene positions these groups once. A `userData.update(snapshot)` hook animates only presentation; `userData.dispose()` stops updates while the scene owns GPU resource disposal.

Interiors, robots, production activity and service movement are illustrative. Site placement and map provenance are documented beside the geographic data. The exact historical maintenance-trigger algorithm is unknown.

## Domain

`src/domain/readings/index.js` exports immutable fixture creation/import, per-vehicle effective-dated source policy, four exclusion scopes, deterministic evaluation/replay, and review-provider boundaries. See `src/domain/readings/README.md` for exact signatures. Missing or unusable readings from the chosen source remain unresolved; there is no newest-import, largest-value or alternate-source fallback. Duplicate imports and repeated replay are idempotent. Raw readings and completed service facts are preserved.
