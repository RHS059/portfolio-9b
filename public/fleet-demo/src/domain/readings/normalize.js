import { DomainError } from './shared.js';

/** Canonical kilometres, rounded to a millimetre. Raw values are never replaced. */
export function normalizeOdometer(value, unit) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new DomainError('INVALID_VALUE', 'Odometers must be finite non-negative numbers.');
  const factors = { km: 1, mi: 1.609344, m: 0.001 };
  if (!Object.hasOwn(factors, unit)) throw new DomainError('INVALID_UNIT', `Unsupported odometer unit: ${unit}`);
  const km = value * factors[unit];
  if (!Number.isSafeInteger(Math.round(km * 1e6))) throw new DomainError('INVALID_VALUE', 'Odometer exceeds safe canonical precision.');
  return Math.round(km * 1e6) / 1e6;
}
