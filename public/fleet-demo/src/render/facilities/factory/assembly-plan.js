const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export const FACTORY_FLOOR_Z=.25;
export const CELL_INPUT_OFFSET=freeze([-1.9,2.4,.975]);
export const CELL_OUTPUT_OFFSET=freeze([0,0,1.45]);
export const DRONE_FRAME_Z=.36;
const tips=[[-.84,-.84],[.84,-.84],[-.84,.84],[.84,.84]];
export const ASSEMBLY_STEPS=freeze([
 {id:'electronics',shape:'box',size:[.28,.28,.035],point:[0,-.24,.52]},
 ...tips.map(([x,y],i)=>({id:'motor-'+i,shape:'cylinder',size:[.28,.28,.19],point:[x,y,.545]})),
 {id:'shell',shape:'ellipsoid',size:[.68,.98,.36],point:[0,0,.63]},
 ...tips.map(([x,y],i)=>({id:'prop-'+i,shape:'box',size:[1.08,.085,.028],point:[x,y,.72]})),
]);
export function assemblyStep(progress=0){const p=Number.isFinite(progress)?Math.max(0,Math.min(1,progress)):0,index=Math.min(ASSEMBLY_STEPS.length-1,Math.floor(p*ASSEMBLY_STEPS.length)),phase=p===1?1:p*ASSEMBLY_STEPS.length-index;const step=ASSEMBLY_STEPS[index],sourcePoint=[0,0,.195+step.size[2]/2];return freeze({progress:p,index,phase,step,sourcePoint,sourceVisible:phase<=.16+1e-9&&p<1,carrying:phase>.16+1e-9&&phase<.68-1e-9,installed:index+(phase>=.68-1e-9?1:0)});}
