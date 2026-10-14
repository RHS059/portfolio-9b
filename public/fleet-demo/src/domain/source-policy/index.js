import { DomainError, assertTime, immutable, nonempty, stableJSON, timestamp } from '../readings/shared.js';

export const DEFAULT_MAX_AGE_HOURS = 48;
export function activeExclusions(exclusions, reading, asOf) {
  const time = timestamp(asOf);
  return exclusions.filter(rule => timestamp(rule.effectiveFrom) <= time &&
    (!rule.effectiveUntil || time < timestamp(rule.effectiveUntil)) &&
    (!rule.readingId || rule.readingId === reading.id) &&
    (!rule.sourceId || rule.sourceId === reading.sourceId) &&
    (!rule.vehicleId || rule.vehicleId === reading.vehicleId) &&
    (!rule.field || rule.field === reading.field));
}
export function authorityAt(policies, vehicleId, field, asOf) {
  const eligible = policies.filter(p => p.vehicleId === vehicleId && p.field === field &&
    timestamp(p.effectiveFrom) <= timestamp(asOf) && (!p.effectiveUntil || timestamp(asOf) < timestamp(p.effectiveUntil)));
  if (!eligible.length) return { status: 'unresolved', reason: 'missing-authority', policies: [] };
  const latestTime = Math.max(...eligible.map(p => timestamp(p.effectiveFrom)));
  const latest = eligible.filter(p => timestamp(p.effectiveFrom) === latestTime);
  const latestVersion = Math.max(...latest.map(p => p.version ?? 0));
  const winners = latest.filter(p => (p.version ?? 0) === latestVersion);
  if (new Set(winners.map(p => `${p.sourceId}:${p.maxAgeHours}`)).size !== 1 || !winners[0].sourceId) {
    return { status: 'unresolved', reason: 'ambiguous-authority', policies: winners };
  }
  const policy = winners[0];
  if (!Number.isFinite(policy.maxAgeHours) || policy.maxAgeHours <= 0) return { status: 'unresolved', reason: 'invalid-authority-policy', policies: winners };
  return { status: 'resolved', reason: 'explicit-authority', policy, policies: winners };
}

/** Append-only, optimistic configuration commands. Repeating the same command is a no-op. */
export function applyConfigurationCommand(state, command) {
  nonempty(command.id, 'Command id');
  const fingerprint = stableJSON(command);
  const prior = (state.appliedCommands || []).find(c => c.id === command.id);
  if (prior) {
    if (prior.fingerprint !== fingerprint) throw new DomainError('COMMAND_ID_CONFLICT', 'This command id already describes a different change.');
    return state;
  }
  if (!Number.isInteger(command.expectedVersion) || command.expectedVersion !== state.configVersion) {
    throw new DomainError('STALE_CONFIG_VERSION', `Expected configuration ${command.expectedVersion}; current version is ${state.configVersion}.`);
  }
  assertTime(command.effectiveFrom, 'effectiveFrom');
  if (command.effectiveUntil !== undefined) {
    assertTime(command.effectiveUntil, 'effectiveUntil');
    if (timestamp(command.effectiveUntil) <= timestamp(command.effectiveFrom)) throw new DomainError('INVALID_INTERVAL', 'Exclusion end must follow its start.');
  }
  if (command.vehicleId !== undefined) nonempty(command.vehicleId, 'Vehicle scope');
  if (command.field !== undefined) nonempty(command.field, 'Field scope');
  if (command.vehicleId && !state.vehicles.some(v => v.id === command.vehicleId)) throw new DomainError('UNKNOWN_VEHICLE', 'Unknown vehicle.');
  const version = state.configVersion + 1;
  const policies = [...state.policies];
  const exclusions = [...state.exclusions];
  const base = { id: command.id, version, effectiveFrom: command.effectiveFrom };
  if (command.effectiveUntil) base.effectiveUntil = command.effectiveUntil;
  if (command.type === 'set-authority') {
    nonempty(command.vehicleId, 'Vehicle'); nonempty(command.sourceId, 'Authoritative source');
    const maxAgeHours = command.maxAgeHours ?? DEFAULT_MAX_AGE_HOURS;
    if (!Number.isFinite(maxAgeHours) || maxAgeHours <= 0) throw new DomainError('INVALID_POLICY', 'Freshness must be positive hours.');
    policies.push({ ...base, vehicleId: command.vehicleId, sourceId: command.sourceId, field: command.field ?? 'odometer', maxAgeHours });
  } else if (command.type === 'exclude-reading' || command.type === 'exclude-source') {
    nonempty(command.reason, 'Exclusion reason');
    const rule = { ...base, reason: command.reason };
    if (command.type === 'exclude-reading') {
      nonempty(command.readingId, 'Reading id');
      const reading = state.readings.find(r => r.id === command.readingId);
      if (!reading) throw new DomainError('UNKNOWN_READING', 'Cannot exclude an unknown raw reading.');
      for (const key of ['vehicleId', 'sourceId', 'field']) {
        if (command[key] !== undefined && command[key] !== reading[key]) throw new DomainError('EXCLUSION_SCOPE_MISMATCH', `The supplied ${key} does not match the selected raw reading.`);
      }
      // A row exclusion is always pinned to its exact original source, vehicle and field.
      Object.assign(rule, { readingId: reading.id, sourceId: reading.sourceId, vehicleId: reading.vehicleId, field: reading.field });
    } else {
      nonempty(command.sourceId, 'Excluded source');
      rule.sourceId = command.sourceId;
      if (command.vehicleId) rule.vehicleId = command.vehicleId;
      if (command.field) rule.field = command.field;
    }
    exclusions.push(rule);
  } else throw new DomainError('UNKNOWN_COMMAND', `Unsupported configuration command: ${command.type}`);
  return immutable({ ...state, policies, exclusions, configVersion: version,
    appliedCommands: [...(state.appliedCommands || []), { id: command.id, fingerprint, resultVersion: version }] });
}
