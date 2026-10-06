import { evaluateReadings } from '../readings/evaluate.js';
import { DomainError, assertTime, immutable, stableJSON } from '../readings/shared.js';

/** Demo output budget: plain text only; limits are rejected, never silently truncated. */
export const REVIEW_OUTPUT_LIMITS = Object.freeze({ findings: 20, labelChars: 160, summaryChars: 1200, suggestedActionChars: 600, evidenceIdsPerFinding: 32, evidenceIdChars: 128, totalTextChars: 16000 });
const unsafeTextControls = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/;

function reviewText(value, field, limit, errorCode = 'INVALID_REVIEW_OUTPUT') {
  if (typeof value !== 'string' || !value.trim() || value.length > limit || unsafeTextControls.test(value)) {
    throw new DomainError(errorCode, `${field} must be nonempty plain text within ${limit} characters, without hidden control characters.`);
  }
  return value;
}

function validateFindings(response, knownIds) {
  if (!response || typeof response !== 'object' || Array.isArray(response) || !Array.isArray(response.findings) || response.findings.length > REVIEW_OUTPUT_LIMITS.findings) {
    throw new DomainError('INVALID_REVIEW_OUTPUT', `Review must return at most ${REVIEW_OUTPUT_LIMITS.findings} findings.`);
  }
  let textChars = 0;
  return Array.from(response.findings).map((finding, index) => {
    if (!finding || typeof finding !== 'object' || Array.isArray(finding)) throw new DomainError('INVALID_REVIEW_OUTPUT', 'Every finding must be an object.');
    const summary = reviewText(finding.summary, 'Finding summary', REVIEW_OUTPUT_LIMITS.summaryChars);
    if (!Array.isArray(finding.evidenceReadingIds) || finding.evidenceReadingIds.length > REVIEW_OUTPUT_LIMITS.evidenceIdsPerFinding ||
      Array.from(finding.evidenceReadingIds).some(id => typeof id !== 'string' || !id || id.length > REVIEW_OUTPUT_LIMITS.evidenceIdChars || unsafeTextControls.test(id) || !knownIds.has(id))) {
      throw new DomainError('INVALID_REVIEW_OUTPUT', 'Evidence ids must be bounded strings identifying original raw readings.');
    }
    const suggestedAction = finding.suggestedAction == null ? null : reviewText(finding.suggestedAction, 'Suggested action', REVIEW_OUTPUT_LIMITS.suggestedActionChars);
    textChars += summary.length + (suggestedAction?.length ?? 0);
    if (textChars > REVIEW_OUTPUT_LIMITS.totalTextChars) throw new DomainError('INVALID_REVIEW_OUTPUT', 'Review text exceeds the total display budget.');
    return { id: `review-${index + 1}`, severity: ['info', 'review', 'attention'].includes(finding.severity) ? finding.severity : 'review', summary,
      confidence: ['low', 'medium', 'high'].includes(finding.confidence) ? finding.confidence : 'unknown',
      evidenceReadingIds: [...new Set(finding.evidenceReadingIds)], suggestedAction };
  });
}

/** Portable, credential-free input for a real reviewer. All example data is synthetic. */
export function buildReviewInput(state, { asOf = state.asOf } = {}) {
  const evaluation = evaluateReadings({ ...state, asOf });
  return immutable({
    schemaVersion: 1, synthetic: state.fixture?.synthetic === true, asOf,
    task: 'Review import evidence, flag suspicious records and explain evidence for a responsible fleet operator. Return advisory findings only. Do not execute changes.',
    providerNames: { A: 'unnamed provider A', B: 'unnamed provider B' },
    assumptions: state.fixture?.assumptions ?? [],
    vehicleMigrationFacts: state.vehicles, rawReadings: state.readings, policies: state.policies, exclusions: state.exclusions,
    configVersion: state.configVersion, results: evaluation.vehicles, facts: evaluation.reviewFacts,
    expectedFlags: [
      ...evaluation.reviewFacts.filter(f => f.severity !== 'info').map(f => ({ vehicleId: f.vehicleId, kind: f.kind, evidenceReadingIds: f.evidenceReadingIds, explanation: f.summary })),
      ...evaluation.vehicles.filter(v => v.vehicleId === 'TRK-208' && v.status === 'resolved' && v.sourceId === 'A').map(v => ({ vehicleId: v.vehicleId, kind: 'partial-migration-isolation', evidenceReadingIds: [v.readingId], explanation: 'A is still the explicit valid authority for the unmigrated vehicle.' })),
    ],
    explicitUnknowns: [
      'The real provider names, raw historical timestamps/values and device removal dates are unknown.',
      'The precise historical maintenance-trigger algorithm and service ledger are unknown.',
      'The financial impact and exact number of repeated shop visits are unknown.',
      'A difference between sources alone does not establish which source should be authoritative.',
      'Model confidence is advisory and cannot authorize a source change or service-history rewrite.',
    ],
    expectedInvariantChecks: [
      'TRK-104 is unresolved until a human explicitly sets its authoritative source; B resolves the migrated truck in this fixture. TRK-208 continues using A.',
      'Changing one vehicle authority does not disable either integration or change another vehicle.',
      'Import order does not choose authority; observation time and import time remain separate.',
      'Exclusions can target an individual raw row, integration, vehicle and field.',
      'Missing, stale, excluded or conflicting authority is visibly unresolved without latest/max fallback.',
      'Raw readings, original source values and service facts are never mutated by evaluation, replay or review.',
      'Configuration changes require explicit version-checked commands and effective dates.',
      'Duplicate import and repeated replay do not duplicate canonical readings or service facts.',
      'Consequence examples are labeled and no exact historical scheduler or financial loss is inferred.',
      'Review suggestions cannot execute configuration commands, alter service records or send external notifications.',
    ],
    allowedOutput: { findings: [{ severity: 'info|review|attention', summary: 'evidence-based explanation', confidence: 'low|medium|high|unknown', evidenceReadingIds: ['existing raw id'], suggestedAction: 'optional human-reviewed next step' }] },
  });
}

export function createSimulatedReviewProvider() {
  return Object.freeze({
    mode: 'simulated', label: 'Deterministic simulated import review (no model call)',
    async review(input) {
      return { findings: input.facts.filter(f => f.severity !== 'info').map(f => ({ severity: f.severity, summary: f.summary, confidence: 'high', evidenceReadingIds: f.evidenceReadingIds,
        suggestedAction: f.kind === 'cross-source-disagreement' ? 'Have the responsible fleet operator verify vehicle-specific authority before changing configuration.' : 'Review the cited records; retain raw evidence and observation timestamps.' })) };
    },
  });
}

/** SHA-256 over canonical JSON. Full canonical equality, not only the hash, binds recordings. */
async function inputProvenance(input) {
  if (!globalThis.crypto?.subtle) throw new DomainError('REVIEW_DIGEST_UNAVAILABLE', 'Review provenance requires Web Crypto in a secure browser context.');
  const bytes = new TextEncoder().encode(stableJSON(input));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  const inputHash = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return immutable({ inputHash, hashAlgorithm: 'SHA-256', canonicalization: 'sorted-object-keys-v1', configVersion: input.configVersion, asOf: input.asOf });
}

function provenanceMismatch(recordedProvenance, requestedProvenance) {
  const error = new DomainError('RECORDED_REVIEW_INPUT_MISMATCH', 'This recorded review belongs to a different input snapshot. Its findings cannot be shown as a current review.');
  error.recordedProvenance = recordedProvenance && typeof recordedProvenance === 'object' ? immutable({
    inputHash: typeof recordedProvenance.inputHash === 'string' && recordedProvenance.inputHash.length <= 128 ? recordedProvenance.inputHash : null,
    hashAlgorithm: recordedProvenance.hashAlgorithm === 'SHA-256' ? 'SHA-256' : null,
    canonicalization: recordedProvenance.canonicalization === 'sorted-object-keys-v1' ? 'sorted-object-keys-v1' : null,
    configVersion: Number.isSafeInteger(recordedProvenance.configVersion) ? recordedProvenance.configVersion : null,
    asOf: typeof recordedProvenance.asOf === 'string' && recordedProvenance.asOf.length <= 64 ? recordedProvenance.asOf : null,
  }) : null;
  error.requestedProvenance = requestedProvenance;
  return error;
}

export function createRecordedReviewProvider({ label = 'Recorded review (not a live model call)', input, review }) {
  if (!input || !Number.isInteger(input.configVersion) || !Array.isArray(input.rawReadings) || !Array.isArray(input.policies) || !Array.isArray(input.exclusions)) {
    throw new DomainError('UNBOUND_RECORDED_REVIEW', 'A recording requires the exact original buildReviewInput snapshot.');
  }
  assertTime(input.asOf, 'Recorded review asOf');
  const originalInput = immutable(input);
  const originalCanonicalJSON = stableJSON(originalInput);
  const recorded = immutable({ findings: validateFindings(review, new Set(originalInput.rawReadings.map(row => row.id))) });
  let provenancePromise;
  const validatedLabel = reviewText(label, 'Provider label', REVIEW_OUTPUT_LIMITS.labelChars, 'INVALID_REVIEW_PROVIDER');
  return Object.freeze({ mode: 'recorded', label: validatedLabel,
    recording: immutable({ input: originalInput, configVersion: originalInput.configVersion, asOf: originalInput.asOf }),
    async review(requestedInput) {
      provenancePromise ??= inputProvenance(originalInput);
      const recordedProvenance = await provenancePromise;
      if (stableJSON(requestedInput) !== originalCanonicalJSON) {
        throw provenanceMismatch(recordedProvenance, await inputProvenance(requestedInput));
      }
      return immutable({ ...recorded, provenance: recordedProvenance });
    },
  });
}

/** Provider receives a frozen data snapshot only, never state setters or credentials. */
export async function reviewImports(state, provider = createSimulatedReviewProvider(), { asOf = state.asOf } = {}) {
  // Snapshot provider identity once, before any await: an adapter cannot relabel a response.
  const mode = provider?.mode;
  const reviewMethod = provider?.review;
  if (typeof reviewMethod !== 'function' || !['simulated', 'recorded', 'live'].includes(mode)) throw new DomainError('INVALID_REVIEW_PROVIDER', 'Review provider must declare its mode and review method.');
  const label = reviewText(provider.label ?? `${mode} review`, 'Provider label', REVIEW_OUTPUT_LIMITS.labelChars, 'INVALID_REVIEW_PROVIDER');
  const input = buildReviewInput(state, { asOf });
  const requestedProvenance = await inputProvenance(input);
  const response = await reviewMethod.call(provider, input);
  if (!response || !Array.isArray(response.findings)) throw new DomainError('INVALID_REVIEW_OUTPUT', 'Review must return findings.');
  if (mode === 'recorded' && (!response.provenance || Object.keys(requestedProvenance).some(key => response.provenance[key] !== requestedProvenance[key]))) {
    throw provenanceMismatch(response.provenance ?? null, requestedProvenance);
  }
  // Exact validated metadata only; never forward extra provider-controlled provenance fields.
  const provenance = requestedProvenance;
  const knownIds = new Set(input.rawReadings.map(r => r.id));
  const findings = validateFindings(response, knownIds);
  // Only an advisory envelope is returned. Unknown model fields, including commands, are discarded.
  return immutable({ mode, label, advisoryOnly: true, textFormat: 'plain-text',
    notificationChannel: 'in-app', requiresHumanDecision: true, configVersion: provenance.configVersion, asOf: provenance.asOf, provenance, findings });
}
