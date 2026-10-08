const clamp = value => Number.isFinite(value) ? Math.max(0,Math.min(1,value)) : 0;
const smooth = value => {const p=clamp(value);return p*p*(3-2*p);};
const SIDES=['right','left','front','back'];
function edge(side,p){const a=p*Math.PI*.8,c=Math.cos(a),s=Math.sin(a);if(side==='right')return[.39-.39*c,0,.475+.39*s];if(side==='left')return[-.39+.39*c,0,.475+.39*s];if(side==='front')return[0,.29-.29*c,.478+.29*s];return[0,-.29+.29*c,.478+.29*s];}
const mix=(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*t);
/** The flap setter and arm setter use the same deterministic contact trajectory. */
export function cartonOpeningPose(progress=0){
 const p=clamp(progress),step=p===1?3:Math.floor(p*4),local=p===1?1:p*4-step,open=smooth((local-.15)/.6),side=SIDES[step],hover=[0,0,.97];
 const flaps=Object.fromEntries(SIDES.map((name,i)=>[name,i<step?1:i===step?open:0]));
 const contact=edge(side,open);let tool;
 if(local<.15)tool=mix(hover,edge(side,0),smooth(local/.15));else if(local<=.75)tool=contact;else tool=mix(edge(side,1),hover,smooth((local-.75)/.25));
 return Object.freeze({progress:p,side,flaps:Object.freeze(flaps),engaged:local>=.15&&local<=.75,contact:Object.freeze(contact),tool:Object.freeze(tool)});
}
