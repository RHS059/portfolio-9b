import { evaluateReadings } from '../readings/evaluate.js';
import { immutable } from '../readings/shared.js';
export { buildReviewInput, createSimulatedReviewProvider, createRecordedReviewProvider, reviewImports } from './review-provider.js';

/** Rebuild projections from immutable inputs. Never reverses or rewrites services. */
export function replayReadings(state, { asOf = state.asOf } = {}) {
  return immutable({ ...evaluateReadings({ ...state, asOf }), configVersion: state.configVersion,
    provenance: 'derived replay; not historical service facts',
    rawReadingCount: state.readings.length,
    serviceFacts: state.serviceFacts,
    consequenceEvents: state.consequenceEvents,
  });
}
