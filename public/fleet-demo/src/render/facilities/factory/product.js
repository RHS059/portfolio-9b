import{createArticulatedInstances}from'./geometry.js';
import{assemblyStep,ASSEMBLY_STEPS}from'./assembly-plan.js';
const TIPS=[[-.84,-.84],[.84,-.84],[-.84,.84],[.84,.84]];
/** Renderer-owned product. Root is bottom support; setters never place or own cargo. */
export function createAssemblyProduct({THREE}){
 const T=THREE,definitions=[];const add=(id,shape='box',tone='paper')=>definitions.push({id,shape,tone});
 for(const[id,shape,tone]of[['frame','box','dark'],['plate','box','face'],['electronics','box','muted'],['battery','box','dark'],['canopy','ellipsoid','paper'],['camera','ellipsoid','dark'],['lens','cylinder','ink']])add(id,shape,tone);
 for(let i=0;i<4;i++)for(const[id,shape,tone]of[['arm','box','dark'],['mount','box','face'],['motor','cylinder','muted'],['cap','cylinder','dark'],['hub','cylinder','paper'],['prop','box','dark']])add(i+'-'+id,shape,tone);
 for(let i=0;i<4;i++)add('leg-'+i,'box','muted');for(let i=0;i<2;i++)add('skid-'+i,'box','dark');
 const rig=createArticulatedInstances(T,definitions),root=rig.group;root.name='assembly-product';let disposed=false;
 function setProgress(progress=0){if(disposed)return;const step=assemblyStep(progress),installed=new Set(ASSEMBLY_STEPS.slice(0,step.installed).map(x=>x.id));for(const d of definitions)rig.hide(d.id);
  rig.set('frame',[0,0,.36],[.72,1.08,.08]);rig.set('plate',[0,0,.48],[.62,.98,.045]);
  if(installed.has('electronics')){rig.set('electronics',[0,-.24,.52],[.28,.28,.035]);rig.set('battery',[0,.12,.605],[.32,.47,.19]);}
  if(installed.has('shell')){rig.set('canopy',[0,0,.63],[.68,.98,.36]);rig.set('camera',[0,-.63,.13],[.26,.24,.22]);rig.axis('lens',[0,-.74,.13],[.15,.15,.08],[0,1,0]);}
  TIPS.forEach(([x,y],i)=>{rig.between(i+'-arm',[Math.sign(x)*.22,Math.sign(y)*.25,.40],[x,y,.42],.12,.09);rig.set(i+'-mount',[x,y,.43],[.22,.22,.06]);if(installed.has('motor-'+i)){rig.set(i+'-motor',[x,y,.545],[.28,.28,.19]);rig.set(i+'-cap',[x,y,.665],[.32,.32,.055]);rig.set(i+'-hub',[x,y,.72],[.11,.11,.055]);}if(installed.has('prop-'+i)){const q=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),i%2?.45:-.4);rig.set(i+'-prop',[x,y,.72],[1.08,.085,.028],q);}});
  let n=0;for(const[i,x]of[-.34,.34].entries()){for(const y of[-.38,.38])rig.between('leg-'+n++,[x,y,.34],[x*1.45,y,.055],.035,.035);rig.between('skid-'+i,[x*1.45,-.62,.0275],[x*1.45,.62,.0275],.055,.055);}
  rig.commit();root.userData.progress=step.progress;root.userData.installedPartIds=Object.freeze([...installed]);
 }
 root.userData={kind:'assembly-product',illustrative:true,supportOrigin:'bottom-center',partMounts:ASSEMBLY_STEPS,progress:0,installedPartIds:Object.freeze([]),setProgress,setAssemblyProgress:setProgress,dispose(){disposed=true;}};setProgress(0);return root;
}
