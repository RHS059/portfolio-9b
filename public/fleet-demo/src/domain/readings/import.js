import { DomainError, immutable, nonempty, stableJSON } from './shared.js';

function eventIdentity(reading) {
  // A repeated delivery can have a new import time; retain the first original receipt.
  const { importedAt, ...event } = reading;
  return stableJSON(event);
}
/** Raw rows are retained exactly, including invalid values for explicit review. */
export function importReadings(state, incoming) {
  if (!Array.isArray(incoming)) throw new DomainError('INVALID_INPUT', 'Imports must be an array.');
  const byId = new Map(state.readings.map(r => [r.id, r]));
  let importedCount = 0, duplicateCount = 0;
  for (const reading of incoming) {
    nonempty(reading.id, 'Stable raw reading id'); nonempty(reading.sourceId, 'Source id'); nonempty(reading.vehicleId, 'Vehicle id'); nonempty(reading.field, 'Field');
    if (byId.has(reading.id)) {
      if (eventIdentity(byId.get(reading.id)) !== eventIdentity(reading)) throw new DomainError('READING_ID_CONFLICT', `Raw reading ${reading.id} cannot be overwritten.`);
      duplicateCount++;
    } else { byId.set(reading.id, reading); importedCount++; }
  }
  return { state: importedCount ? immutable({ ...state, readings: [...byId.values()] }) : state, importedCount, duplicateCount };
}
