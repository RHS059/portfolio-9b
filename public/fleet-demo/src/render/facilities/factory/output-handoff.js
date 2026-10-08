import {PRODUCT_CARRIER} from './carrier.js';
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
  raised: [0, 0, 2.0],
  clear: [-3, -3.5, 2.0],
  pickup: [-3, -4, 1.225],
  parkedTool: [-1.9,2.4,3.05],
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
  const contact=productSupport.map((v,i)=>v+PRODUCT_CARRIER.gripPoint[i]);
  let tool=contact.slice(),wristLift=1.15;
  if(p<.12){const high=[contact[0],contact[1],OUTPUT_HANDOFF.parkedTool[2]];tool=p<.055?mix(OUTPUT_HANDOFF.parkedTool,high,smooth(p/.055)):mix(high,contact,smooth((p-.055)/.065));wristLift=.55+.60*smooth(p/.12);}
  else if(p>.9){
    const released=OUTPUT_HANDOFF.pickup.map((v,i)=>v+PRODUCT_CARRIER.gripPoint[i]);
    const clear=[released[0],released[1]+.25,released[2]+.85];
    if(p<.94){const t=smooth((p-.9)/.04);tool=mix(released,clear,t);wristLift=1.15-.60*t;}
    else{tool=mix(clear,OUTPUT_HANDOFF.parkedTool,smooth((p-.94)/.06));wristLift=.55;}
  }
  return freeze({progress:p,phase,carrierPosition:productSupport,productSupport,
    gripPoint:contact,tool,contact,contactAccepted:true,transferReady:true,
    contactEngaged:p>=.12&&p<=.9,wristLift,gripHalfWidth:p<.12?.28+(.095-.28)*smooth((p-.095)/.025):p>.9?.095+(.28-.095)*smooth((p-.9)/.025):.095,
    carrierModel:PRODUCT_CARRIER.carrierModel,
    supportOrigin:'carrier-bottom',droneBaseOffset:.17,
    coordinateSpace:'cell-relative-xy/site-root-z',floorOffsetIncluded:true});
}

export const outputHandoffPose = sampleOutputTransfer;
