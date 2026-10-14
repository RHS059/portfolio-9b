/** Immutable, dependency-free helpers. All clock values are supplied by callers. */
export class DomainError extends Error {
  constructor(code, message) { super(message); this.name = 'DomainError'; this.code = code; }
}
export function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clone(v)]));
  return value;
}
export function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze); Object.freeze(value);
  }
  return value;
}
export function immutable(value) { return deepFreeze(clone(value)); }
export function timestamp(value) {
  if (typeof value !== 'string') return NaN;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) return NaN;
  const [, y, m, d, h, min, sec, zone] = match;
  const date = new Date(`${y}-${m}-${d}T00:00:00Z`);
  if (date.getUTCFullYear() !== +y || date.getUTCMonth() + 1 !== +m || date.getUTCDate() !== +d || +h > 23 || +min > 59 || +sec > 59) return NaN;
  if (zone !== 'Z' && (+zone.slice(1, 3) > 23 || +zone.slice(4, 6) > 59)) return NaN;
  return Date.parse(value);
}
export function assertTime(value, name) {
  if (!Number.isFinite(timestamp(value))) throw new DomainError('INVALID_TIME', `${name} must be an ISO timestamp with timezone.`);
}
export function stableJSON(value) {
  if (Array.isArray(value)) return `[${value.map(stableJSON).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().filter(k => value[k] !== undefined).map(k => `${JSON.stringify(k)}:${stableJSON(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
export function nonempty(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new DomainError('INVALID_INPUT', `${name} is required.`);
}
