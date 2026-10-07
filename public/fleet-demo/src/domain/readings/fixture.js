import { immutable } from './shared.js';

/** Values/times are synthetic; the reported partial-migration incident is real. */
export function createScenario({ authorityApplied = true } = {}) {
  const readings = [];
  for (let i = 0; i < 3; i++) {
    const day = `2026-01-${10 + i}`;
    readings.push(
      { id: `v1-b-${i + 1}`, vehicleId: 'TRK-104', sourceId: 'B', field: 'odometer', value: 80000 + 150 * i, unit: 'mi', observedAt: `${day}T00:30:00Z`, importedAt: `${day}T01:00:00Z` },
      { id: `v1-a-${i + 1}`, vehicleId: 'TRK-104', sourceId: 'A', field: 'odometer', value: 120000, unit: 'km', observedAt: '2026-01-05T12:00:00Z', importedAt: `${day}T02:00:00Z` },
      { id: `v2-a-${i + 1}`, vehicleId: 'TRK-208', sourceId: 'A', field: 'odometer', value: 210000 + 200 * i, unit: 'km', observedAt: `${day}T00:45:00Z`, importedAt: `${day}T02:15:00Z` },
    );
  }
  return immutable({
    schemaVersion: 1, configVersion: 1, appliedCommands: [], asOf: '2026-01-12T03:00:00Z',
    fixture: {
      synthetic: true, authorityApplied, label: 'Synthetic replay of a reported partial-provider-migration incident',
      incident: 'Provider A remained active for unmigrated vehicles. Migrated vehicles retained frozen A readings while B reported current readings. Alternating readings led to repeated oil changes and tire rotations, discovered by shop technicians.',
      assumptions: [
        'A and B are unnamed providers. Vehicle IDs, timestamps, values and service examples are synthetic.',
        'Freshness is an illustrative 48-hour observation-age limit, measured from observedAt, never importedAt.',
        'Within the explicitly authoritative source, the newest observed row is selected; equal-time disagreement is unresolved.',
        'Excluding the newest authoritative observation leaves it unresolved; older observations are not silently resurrected.',
        'Unexplained decreases within an authoritative source stay unresolved; legitimate resets need separate evidence outside this demo.',
        'An observation cannot be later than its import receipt; impossible or missing timestamps remain invalid raw evidence.',
        'Canonical unit is km; one mile is 1.609344 km; derived values are rounded to 0.000001 km.',
        'Illustrated consequence events are not a reconstruction of the historical maintenance scheduler.',
        'Review suggestions are advisory and require a human configuration command; they cannot mutate raw readings or service facts.',
      ],
    },
    vehicles: [{ id: 'TRK-104', label: 'Migrated truck', migration: 'B' }, { id: 'TRK-208', label: 'Unmigrated truck', migration: 'A' }],
    readings,
    policies: [
      ...(authorityApplied ? [{ id: 'initial-v1-authority', version: 1, vehicleId: 'TRK-104', field: 'odometer', sourceId: 'B', effectiveFrom: '2026-01-10T00:00:00Z', maxAgeHours: 48 }] : []),
      { id: 'initial-v2-authority', version: 1, vehicleId: 'TRK-208', field: 'odometer', sourceId: 'A', effectiveFrom: '2026-01-01T00:00:00Z', maxAgeHours: 48 },
    ],
    exclusions: [],
    serviceFacts: [
      { id: 'service-example-1', vehicleId: 'TRK-104', recordedAt: '2026-01-10T12:00:00Z', work: 'Oil change and tire rotation', provenance: 'synthetic service example; immutable' },
      { id: 'service-example-2', vehicleId: 'TRK-104', recordedAt: '2026-01-11T12:00:00Z', work: 'Repeated oil change and tire rotation', provenance: 'synthetic service example; immutable' },
    ],
    consequenceEvents: [
      { id: 'consequence-1', vehicleId: 'TRK-104', at: '2026-01-10T02:00:00Z', kind: 'illustrated-oscillation', evidenceReadingIds: ['v1-b-1', 'v1-a-1'], summary: 'A frozen A reading arrives after a current B reading.', provenance: 'illustrated consequence; not an inferred historical maintenance trigger' },
      { id: 'consequence-2', vehicleId: 'TRK-104', at: '2026-01-12T02:00:00Z', kind: 'reported-repeated-maintenance', evidenceReadingIds: ['v1-b-3', 'v1-a-3'], summary: 'The reported incident caused repeated oil changes and tire rotations in one week; shop technicians discovered it.', provenance: 'user-reported consequence; exact timing and linked rows are synthetic illustration' },
    ],
  });
}
