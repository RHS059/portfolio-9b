import {sampleCargoProcess,CARGO_PROCESS_VERSION} from '../../core/cargo-process.js';
/** Bounded immutable transport boundary. Only finite JSON data reaches the scene. */
const limits={cargo:4,ships:2,trucks:4,outboundVehicles:2,cranes:4,forklifts:4,floorRobots:4,products:4,qaStations:1,dispatchStaging:2,cells:4};
function copy(value,depth=0){if(depth>8)return null;if(value===null||typeof value==='boolean'||typeof value==='string')return value;if(typeof value==='number')return Number.isFinite(value)?value:0;if(Array.isArray(value))return Object.freeze(value.slice(0,32).map(v=>copy(v,depth+1)));if(value&&typeof value==='object')return Object.freeze(Object.fromEntries(Object.entries(value).filter(([key])=>!['__proto__','constructor','prototype'].includes(key)).slice(0,64).map(([key,v])=>[key,copy(v,depth+1)])));return null;}
export function normalizeCargoProcess(input){if(!input||typeof input!=='object'||!Array.isArray(input.cargo))return null;const result={};for(const key of ['version','illustrative','label','timeSeconds','processTimeSeconds','paused','cycleSeconds','presentationOffsetSeconds','outgoingEnabled','capabilities'])result[key]=copy(input[key]);for(const [key,limit]of Object.entries(limits)){if(key==='cells')continue;const ids=new Set();result[key]=Object.freeze((Array.isArray(input[key])?input[key]:[]).filter(item=>item&&typeof item.id==='string'&&!ids.has(item.id)&&ids.add(item.id)).slice(0,limit).map(item=>copy(item)));}result.factoryAssembly=copy(input.factoryAssembly||{cells:[]});return Object.freeze(result);}
export function normalizeAssembly(input){if(!Array.isArray(input?.cells))return null;const ids=new Set();return copy({cells:input.cells.filter(c=>c&&typeof c.id==='string'&&Number.isFinite(c.progress)&&!ids.has(c.id)&&ids.add(c.id)).slice(0,4).map(c=>({...c,progress:Math.max(0,Math.min(1,c.progress))}))});}
/** The production process is pure: sample one presentation time for all custody,
 * mechanisms and carriers. Per-field interpolation would mix discrete handoffs. */
export function interpolateCargoProcess(previous,current,alpha){
 if(!current)return null;if(!previous||current.paused||current.timeSeconds<previous.timeSeconds)return current;
 const t=Math.max(0,Math.min(1,alpha));
 if(current.version===CARGO_PROCESS_VERSION){const time=previous.timeSeconds+(current.timeSeconds-previous.timeSeconds)*t;return sampleCargoProcess(time,{paused:current.paused,presentationOffsetSeconds:current.presentationOffsetSeconds||0,outgoingEnabled:current.outgoingEnabled!==false});}
 return current;
}
