/** Frozen integration contracts. Plain ES modules, no runtime dependencies. */
export const CONTRACT_VERSION = 'fleet-demo/v1';
export const VEHICLE_IDS = Object.freeze({ migrated: 'TRK-104', unmigrated: 'TRK-208' });
export const SCENE_IDS = Object.freeze({ port: 'oict', factory: 'centerpoint', depot: 'depot' });
export const VIEW_MODES = Object.freeze(['iso', '3d', '2d']);
/**
 * Renderer API:
 * createFleetScene({container, onSelect, onStatus}) -> {update(snapshot),setView(mode),
 * setFocus(entityId),setFollow(boolean),resize(),dispose(),getMetrics()}
 * snapshot: {timeSeconds,paused,selectedId,stage,vehicles:[{id,progress,routeId,status}],
 *   facilities:[{id,label}], issueActive, authorityResolved}
 * Entity IDs above are stable. Renderer owns RAF/interpolation, NEVER domain mutations.
 * Optional facility module: createFacilities({THREE}) -> THREE.Group (A3 adapter allowed).
 *
 * Domain API is owned by A2 and documented in CONTRACTS.md once confirmed.
 * Provenance UI API: createProvenancePanel({container,onAction}) -> {update(model),dispose()}
 * model: {mode,selectedVehicleId,readings,policies,exclusions,decisions,serviceHistory,
 *   review,configurationVersion,authorityStatus,notifications}
 * onAction: ({type, ...payload}) for select-vehicle, set-authority, add-exclusion,
 * replay, review-imports. UI dispatches intent; app calls deterministic domain functions.
 */
