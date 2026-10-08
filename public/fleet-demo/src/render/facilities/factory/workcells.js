import {createFactoryGeometry,createArticulatedInstances} from './geometry.js';
import {WORKCELLS,assemblyPose} from './cycle.js';
import {factoryCellView,factoryProcess} from './process-view.js';
import {addTransferStationGeometry} from './transfer-stations.js';
import {outputHandoffPose,OUTPUT_HANDOFF} from './output-handoff.js';
import {cartonOpeningPose} from './carton-motion.js';
import {assemblyStep,CELL_INPUT_OFFSET,CELL_OUTPUT_OFFSET,FACTORY_FLOOR_Z} from './assembly-plan.js';

/** Staged assembly equipment. Process ownership and material handoffs remain external. */
export function createFactoryWorkcells({THREE}){
  const T=THREE,b=createFactoryGeometry(T),root=new T.Group();root.name='factory-close-detail';const definitions=[];
  for(const cell of WORKCELLS){const{x,y}=cell;
    // Open-front machine frame: extrusion posts, cross rails and a dark equipment plinth.
    b.box(9.8,6.8,.08,x-.8,y+.1,.08,'dark');
    for(const dx of [-5.3,3.7])for(const dy of [-2.9,3.1]){b.box(.11,.11,4.0,x+dx,y+dy,2.0,'ink');b.box(.24,.24,.08,x+dx,y+dy,4.0,'muted');}
    for(const dy of [-2.9,3.1])b.box(9.1,.11,.11,x-.8,y+dy,4.0,'ink');
    for(const dx of [-5.3,3.7])b.box(.11,6.1,.11,x+dx,y+.1,4.0,'ink');
    b.box(2.7,.1,.1,x-3.95,y+3.1,1.05,'ink');b.box(4.9,.1,.1,x+1.25,y+3.1,1.05,'ink');
    // Jig bed, legs, leveling feet, cross-braces and clamps around a drone frame.
    b.box(4.0,3.6,.18,x,y,1.05,'face');b.box(3.8,3.2,.08,x,y,1.18,'paper');
    for(const dx of [-1.7,1.7])for(const dy of [-1.45,1.45]){b.box(.14,.14,.95,x+dx,y+dy,.495,'muted');b.cylinder(.16,.08,x+dx,y+dy,.06,'dark');}
    for(const dx of [-1.7,1.7])b.link([x+dx,y-1.45,.25],[x+dx,y+1.45,.96],.07,.07,'muted');
    b.box(1.3,1.5,.035,x,y,1.2375,'dark');b.box(1.1,1.3,.025,x,y,1.2675,'face');
    for(const dx of [-1.78,1.78])for(const dy of [-1.48,1.48])b.box(.08,.08,.10,x+dx,y+dy,1.31,'muted');

    // Parts tray, magazine/bin compartments and a vertical tool/cable spine.
    b.box(1.5,1.25,.10,x-1.9,y+2.4,.885,'face');for(const dx of[-2.5,-1.3])b.box(.09,1.05,.835,x+dx,y+2.4,.4175,'muted');
    for(let yy=-.5;yy<=.51;yy+=.20)b.cylinder(.04,1.4,x-1.9,y+2.4+yy,.935,'muted',[0,0,Math.PI/2],10);
    b.box(.2,.2,3.8,x-4.5,y+2.6,1.9,'muted');b.box(.2,2.8,.2,x-4.5,y+1.2,3.8,'dark');
    // Robot pedestal and a circular slew bearing; articulated links are instanced below.
    b.box(1.7,1.7,.2,x-3,y,.1,'dark');b.cylinder(.62,.55,x-3,y,.47,'face');b.cylinder(.66,.12,x-3,y,.81,'dark');b.box(.7,.7,.65,x-3,y,1.18,'paper');
    // Side safety screens remain open on the viewing side of this cutaway.
    for(const dx of [-5.6,5.6]){b.box(.08,.08,2.2,x+dx,y+4.3,1.1,'muted');b.box(.08,7.5,.08,x+dx,y+.6,2.2,'muted');}
    b.box(11.2,.08,.08,x,y+4.3,2.2,'muted');
    // Operator console with angled dark screen and raised buttons.
    b.box(.35,.35,1.1,x+4.6,y-2.9,.55,'muted');b.box(1.15,.7,.12,x+4.6,y-2.9,1.15,'face');b.box(.65,.08,.48,x+4.6,y-2.68,1.48,'dark');
    for(const dx of [-.32,0,.32])b.cylinder(.04,.04,x+4.6+dx,y-3.0,1.25,'ink');
    for(const [id,shape,tone]of [['shoulder','cylinder','muted'],['upper','box','paper'],['elbow','cylinder','dark'],['forearm','box','paper'],['wrist','cylinder','muted'],['tool','box','face'],['tool-stem','box','muted'],['left-jaw','box','dark'],['right-jaw','box','dark'],['component','box','muted'],['component-motor','cylinder','muted'],['component-shell','ellipsoid','paper']])definitions.push({id:cell.id+'-'+id,shape,tone});

  }
  // Roller conveyor between the workcell banks, with rails, drive unit and carrier pallets.
  for(const x of [-4.4,-2.6])b.box(.12,35,.26,x,16,.92,'dark');
  for(let y=0;y<34;y+=1.15)b.cylinder(.14,1.65,-3.5,y,1.04,'muted',[0,0,Math.PI/2],10);
  for(const y of [0,8,16,24,32])for(const x of [-4.3,-2.7])b.box(.1,.1,.85,x,y,.42,'muted');
  b.box(.8,1.1,.5,-4.8,1,.74,'face');b.cylinder(.22,.4,-5.35,1,.74,'muted',[0,0,Math.PI/2]);
  for(let i=0;i<3;i++){definitions.push({id:'conveyor-pallet-'+i,shape:'box',tone:'face'});definitions.push({id:'conveyor-kit-'+i,shape:'box',tone:'dark'});}
  // Recognizable test fixture: portal, leads/camera carriage and clamped completed aircraft.
  addTransferStationGeometry(b);for(const y of[24.1,27.9])b.box(.2,.2,3.8,42,y,1.9,'muted');
  b.box(.4,4.0,.3,42,26,3.9,'paper');b.box(.12,3.8,.12,41.72,26,3.8,'dark');
  definitions.push({id:'qa-scanner',shape:'box',tone:'paper'},{id:'qa-camera',shape:'cylinder',tone:'dark'});
  root.add(b.finish('assembly-station-solids'));const rig=createArticulatedInstances(T,definitions);root.add(rig.group);
  let disposed=false;const lastStates=[];
  function apply(snapshot,allowDemoCycle=false){
    if(disposed)return;lastStates.length=0;
    for(const cell of WORKCELLS){
      const view=factoryCellView(snapshot,cell.id),connected=view.connected,step=assemblyStep(view.assemblyProgress);
      const partStage=step.step.shape,target=[step.step.point[0],step.step.point[1],CELL_OUTPUT_OFFSET[2]+step.step.point[2]];
      let pose,opening=null,handoff=null;
      if(connected&&view.active&&view.armAction==='open-box'){
        opening=cartonOpeningPose(view.boxOpen);const t=opening.tool;
        pose=assemblyPose({progress:view.progress,tool:[CELL_INPUT_OFFSET[0]+t[0],CELL_INPUT_OFFSET[1]+t[1],CELL_INPUT_OFFSET[2]+.19+t[2]]});
      }else if(connected&&view.outputProductId&&view.armAction==='handoff-output'){
        handoff=outputHandoffPose(view.outputTransferProgress);pose=assemblyPose({progress:view.outputTransferProgress,wristLift:handoff.wristLift,tool:handoff.tool.map((v,i)=>v-(i===2?FACTORY_FLOOR_Z:0))});
      }else if(connected&&view.active&&view.armAction==='assemble-drone')pose=assemblyPose({progress:step.phase,pickup:[CELL_INPUT_OFFSET[0]+step.sourcePoint[0],CELL_INPUT_OFFSET[1]+step.sourcePoint[1],CELL_INPUT_OFFSET[2]+.19+step.sourcePoint[2]]},0,target);
      else if(view.legacyPose)pose=assemblyPose({progress:view.progress},0,target);
      else pose=assemblyPose({progress:0},0,target);
      const translated=a=>[a[0]+cell.x,a[1]+cell.y,a[2]],prefix=cell.id+'-';
      rig.axis(prefix+'shoulder',translated(pose.shoulder),[.62,.62,.65],pose.jointAxis);rig.between(prefix+'upper',translated(pose.shoulder),translated(pose.elbow),.42,.48);
      rig.axis(prefix+'elbow',translated(pose.elbow),[.56,.56,.62],pose.jointAxis);rig.between(prefix+'forearm',translated(pose.elbow),translated(pose.wrist),.28,.34);
      rig.axis(prefix+'wrist',translated(pose.wrist),[.34,.34,.36],pose.jointAxis);rig.set(prefix+'tool',translated([pose.tool[0],pose.tool[1],pose.tool[2]+.3]),[.4,.3,.18]);
      rig.hide(prefix+'tool-stem');if(handoff)rig.between(prefix+'tool-stem',translated([pose.tool[0],pose.tool[1],pose.tool[2]+.39]),translated(pose.wrist),.10,.10);
      for(const [id,sign]of[['left-jaw',-1],['right-jaw',1]])rig.set(prefix+id,translated([pose.tool[0]+sign*(handoff?handoff.gripHalfWidth:opening?(opening.engaged?.045:.15):pose.grip),pose.tool[1],pose.tool[2]+.1]),[.07,.24,.32]);
      const componentPosition=pose.componentAt,componentScale=step.step.size;
      rig.hide(prefix+'component');rig.hide(prefix+'component-motor');rig.hide(prefix+'component-shell');
      const partHeld=(view.hasMaterial&&view.armAction==='assemble-drone'&&step.carrying)||(view.legacyPose&&pose.carrying);
      if(partHeld)rig.set(prefix+(partStage==='cylinder'?'component-motor':partStage==='ellipsoid'?'component-shell':'component'),translated(componentPosition),componentScale);
      lastStates.push(Object.freeze({id:cell.id,stage:handoff?'handoff-output':pose.stage,progress:pose.phase,carrying:partHeld,installed:view.legacyPose?pose.installed:step.installed,tool:Object.freeze([cell.x+pose.tool[0],cell.y+pose.tool[1],FACTORY_FLOOR_Z+pose.tool[2]]),coordinateSpace:'site-root',active:view.active,cargoId:view.cargoId,processStage:view.stage,boxOpen:view.boxOpen,assemblyProgress:view.assemblyProgress,armAction:view.armAction,contactEngaged:opening?.engaged||handoff?.contactEngaged||false,outputProductId:view.outputProductId,outputTransferProgress:view.outputTransferProgress,productSupport:handoff?Object.freeze([cell.x+handoff.carrierPosition[0],cell.y+handoff.carrierPosition[1],handoff.carrierPosition[2]]):null,handoffPending:false,handoffPhase:handoff?.phase||null,contactAccepted:!!handoff,carryingProduct:!!handoff?.contactEngaged,partId:view.armAction==='assemble-drone'?step.step.id:null}));
    }
    const clock=allowDemoCycle?(snapshot?.timeSeconds||0):0,common=assemblyPose({timeSeconds:clock});
    for(let i=0;i<3;i++){if(factoryProcess(snapshot)){rig.hide('conveyor-pallet-'+i);rig.hide('conveyor-kit-'+i);continue;}const y=((common.conveyor+i/3)%1)*31+1;rig.set('conveyor-pallet-'+i,[-3.5,y,1.28],[1.5,2.1,.2]);rig.set('conveyor-kit-'+i,[-3.5,y,1.48],[.65,.8,.18]);}
    rig.set('qa-scanner',[41.7,26+common.scan,3.55],[.6,.6,.65]);rig.set('qa-camera',[41.7,26+common.scan,3.15],[.22,.22,.22]);rig.commit();
    root.userData.assemblyState=Object.freeze(lastStates.slice());

  }
  root.userData={workcells:WORKCELLS,illustrative:true,update:apply,dispose(){disposed=true;},assemblyState:Object.freeze([]),mounts:Object.freeze(WORKCELLS.map(c=>Object.freeze({id:c.id,input:Object.freeze([c.x+CELL_INPUT_OFFSET[0],c.y+CELL_INPUT_OFFSET[1],FACTORY_FLOOR_Z+CELL_INPUT_OFFSET[2]]),output:Object.freeze([c.x,c.y,FACTORY_FLOOR_Z+CELL_OUTPUT_OFFSET[2]]),carrier:Object.freeze([c.x,c.y,1.53]),pickup:Object.freeze([c.x+OUTPUT_HANDOFF.pickup[0],c.y+OUTPUT_HANDOFF.pickup[1],OUTPUT_HANDOFF.pickup[2]])})))};apply({});return root;
}
