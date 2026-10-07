import {PRODUCT_CARRIER} from '../facilities/factory/carrier.js';
const clamp=t=>Math.max(0,Math.min(1,Number.isFinite(t)?t:0)),smooth=t=>{const p=clamp(t);return p*p*(3-2*p);};
/** Measured underside contacts, distinct from the lower fork-entry plane. */
export const FORK_CONTACT=Object.freeze({entryZ:.095,palletUndersideZ:.14,carrierUndersideZ:PRODUCT_CARRIER.forkPocket.supportZ,tineTopLocalZ:-.0005});
export function forkContactOffset(actor){const loaded=actor.flow==='outgoing'?FORK_CONTACT.carrierUndersideZ:FORK_CONTACT.palletUndersideZ,p=actor.motion?.progress||0;if(actor.carrying)return loaded;if(['approaching','dispatch-approaching'].includes(actor.stage))return FORK_CONTACT.entryZ+(loaded-FORK_CONTACT.entryZ)*smooth((p-.85)/.15);if(['returning','dispatch-returning'].includes(actor.stage))return loaded+(FORK_CONTACT.entryZ-loaded)*smooth(p/.25);return FORK_CONTACT.entryZ;}
