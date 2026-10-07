const freeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const clamp = value => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a.map((value, i) => value + (b[i] - value) * t);

// Cell-relative XY; Z is site-root, including the factory's internal floor offset.
export const OUTPUT_HANDOFF = freeze({
  output: [0, 0, 1.53],
  raised: [0, 0, 2.4],
  clear: [-3, -3.5, 2.4],
  pickup: [-3, -4, 1.225],
});

/** Mechanical pose only. The renderer owns the one product and its custody. */
export function sampleOutputTransfer(progress = 0) {
  const p = clamp(progress);
  let productSupport, phase;
  if (p < .12) {
    productSupport = OUTPUT_HANDOFF.output.slice();
    phase = 'approach';
  } else if (p < .3) {
    productSupport = mix(OUTPUT_HANDOFF.output, OUTPUT_HANDOFF.raised, smooth((p - .12) / .18));
    phase = 'lift';
  } else if (p < .65) {
    productSupport = mix(OUTPUT_HANDOFF.raised, OUTPUT_HANDOFF.clear, smooth((p - .3) / .35));
    phase = 'clear-fixture';
  } else if (p < .9) {
    productSupport = mix(OUTPUT_HANDOFF.clear, OUTPUT_HANDOFF.pickup, smooth((p - .65) / .25));
    phase = 'lower';
  } else {
    productSupport = OUTPUT_HANDOFF.pickup.slice();
    phase = 'release';
  }
  // Carrier geometry/grip access must be verified before a renderer animates custody.
  // The former central grip intersected the aircraft body and is deliberately absent.
  return freeze({progress:p,phase,carrierPosition:productSupport,productSupport,
    gripPoint:null,tool:null,contact:null,contactAccepted:false,transferReady:false,
    contactEngaged:false,supportOrigin:'carrier-bottom',droneBaseOffset:.17,
    coordinateSpace:'cell-relative-xy/site-root-z',floorOffsetIncluded:true});
}

export const outputHandoffPose = sampleOutputTransfer;
