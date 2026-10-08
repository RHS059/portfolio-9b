import {createForklift} from '../facilities/factory/equipment.js';
import {createFactoryGeometry} from '../facilities/factory/geometry.js';
import {PALLET_FORK_REACH} from '../map/fork-transfer.js';
/** Keep the mast clear of the flatbed while retaining full pallet support. */
export function createPalletForklift({THREE}){const group=createForklift({THREE}),b=createFactoryGeometry(THREE),extension=PALLET_FORK_REACH-1.65;for(const x of[-.3,.3])b.box(.10,extension,.055,x,2.175+extension/2,-.028,'muted');group.getObjectByName('forklift-carriage').add(b.finish('pallet-fork-tip-extensions'));group.userData.payloadMount.position.y=PALLET_FORK_REACH;group.userData.dimensions={...group.userData.dimensions,length:3.42+extension};return group;}
