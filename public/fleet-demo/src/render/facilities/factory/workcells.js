import {createFactoryGeometry,createArticulatedInstances} from './geometry.js';
import {addDetailedDrone} from './drone.js';
import {WORKCELLS,assemblyPose} from './cycle.js';

/** Staged assembly equipment. Process ownership and material handoffs remain external. */
export function createFactoryWorkcells({THREE}){
  const T=THREE,b=createFactoryGeometry(T),root=new T.Group();root.name='factory-close-detail';const definitions=[];
  for(const cell of WORKCELLS){const{x,y}=cell;
    // Open-front machine frame: extrusion posts, cross rails and a dark equipment plinth.
    b.box(9.8,6.8,.08,x-.8,y+.1,.08,'dark');
    for(const dx of [-5.3,3.7])for(const dy of [-2.9,3.1]){b.box(.11,.11,4.0,x+dx,y+dy,2.0,'ink');b.box(.24,.24,.08,x+dx,y+dy,4.0,'muted');}
    for(const dy of [-2.9,3.1])b.box(9.1,.11,.11,x-.8,y+dy,4.0,'ink');
    for(const dx of [-5.3,3.7])b.box(.11,6.1,.11,x+dx,y+.1,4.0,'ink');
    b.box(9,.1,.1,x-.8,y+3.1,1.05,'ink');
    // Jig bed, legs, leveling feet, cross-braces and clamps around a drone frame.
    b.box(4.0,3.6,.18,x,y,1.22,'face');b.box(3.8,3.2,.08,x,y,1.35,'paper');
    for(const dx of [-1.7,1.7])for(const dy of [-1.45,1.45]){b.box(.14,.14,1.12,x+dx,y+dy,.58,'muted');b.cylinder(.16,.08,x+dx,y+dy,.06,'dark');}
    for(const dx of [-1.7,1.7])b.link([x+dx,y-1.45,.25],[x+dx,y+1.45,1.13],.07,.07,'muted');
    b.box(1.3,1.5,.12,x,y,1.45,'dark');b.box(1.1,1.3,.06,x,y,1.55,'face');
    for(const dx of [-.65,.65])for(const dy of [-.58,.58]){b.box(.12,.12,.34,x+dx,y+dy,1.72,'muted');b.box(.3,.13,.07,x+dx-Math.sign(dx)*.1,y+dy,1.88,'dark');}
    addDetailedDrone(b,x,y,1.93,cell.droneStage);
    // Parts tray, magazine/bin compartments and a vertical tool/cable spine.
    b.box(2.5,1.3,.14,x-1.4,y+2.5,1.35,'face');for(const dx of [-2.4,-.4])b.box(.1,.8,1.27,x+dx,y+2.5,.65,'muted');
    for(let i=0;i<4;i++){b.box(.48,.8,.16,x-2.2+i*.55,y+2.5,1.5,'paper');b.cylinder(.12,.16,x-2.2+i*.55,y+2.5,1.66,'muted');}
    b.box(.2,.2,3.8,x-4.5,y+2.6,1.9,'muted');b.box(.2,2.8,.2,x-4.5,y+1.2,3.8,'dark');
    // Robot pedestal and a circular slew bearing; articulated links are instanced below.
    b.box(1.7,1.7,.2,x-3,y,.1,'dark');b.cylinder(.62,.55,x-3,y,.47,'face');b.cylinder(.66,.12,x-3,y,.81,'dark');b.box(.7,.7,.65,x-3,y,1.18,'paper');
    // Side safety screens remain open on the viewing side of this cutaway.
    for(const dx of [-5.6,5.6]){b.box(.08,.08,2.2,x+dx,y+4.3,1.1,'muted');b.box(.08,7.5,.08,x+dx,y+.6,2.2,'muted');}
    b.box(11.2,.08,.08,x,y+4.3,2.2,'muted');
    // Operator console with angled dark screen and raised buttons.
    b.box(.35,.35,1.1,x+4.6,y-2.9,.55,'muted');b.box(1.15,.7,.12,x+4.6,y-2.9,1.15,'face');b.box(.65,.08,.48,x+4.6,y-2.68,1.48,'dark');
    for(const dx of [-.32,0,.32])b.cylinder(.04,.04,x+4.6+dx,y-3.0,1.25,'ink');
    for(const [id,shape,tone]of [['shoulder','cylinder','muted'],['upper','box','paper'],['elbow','cylinder','dark'],['forearm','box','paper'],['wrist','cylinder','muted'],['tool','box','face'],['left-jaw','box','dark'],['right-jaw','box','dark'],['component',cell.droneStage===1?'cylinder':'box','muted']])definitions.push({id:cell.id+'-'+id,shape,tone});
  }
  // Roller conveyor between the workcell banks, with rails, drive unit and carrier pallets.
  for(const x of [-4.4,-2.6])b.box(.12,35,.26,x,16,.92,'dark');
  for(let y=0;y<34;y+=1.15)b.cylinder(.14,1.65,-3.5,y,1.04,'muted',[0,0,Math.PI/2],10);
  for(const y of [0,8,16,24,32])for(const x of [-4.3,-2.7])b.box(.1,.1,.85,x,y,.42,'muted');
  b.box(.8,1.1,.5,-4.8,1,.74,'face');b.cylinder(.22,.4,-5.35,1,.74,'muted',[0,0,Math.PI/2]);
  for(let i=0;i<3;i++){definitions.push({id:'conveyor-pallet-'+i,shape:'box',tone:'face'});definitions.push({id:'conveyor-kit-'+i,shape:'box',tone:'dark'});}
  // Recognizable test fixture: portal, leads/camera carriage and clamped completed aircraft.
  b.box(6,4,.24,42,26,1.2,'face');for(const x of [39.3,44.7]){b.box(.2,.2,3.8,x,27,1.9,'muted');b.box(.2,.2,1.1,x,24.3,.55,'muted');}
  b.box(5.6,.4,.3,42,27,3.9,'paper');b.box(5.3,.12,.12,42,26.72,3.8,'dark');
  addDetailedDrone(b,42,26,1.68,3);definitions.push({id:'qa-scanner',shape:'box',tone:'paper'},{id:'qa-camera',shape:'cylinder',tone:'dark'});
  // Finished aircraft sit in open shipping cradles rather than undifferentiated squares.
  for(const y of [-1,-14]){b.box(4,3.6,.24,59,y,.18,'face');for(const dx of[-1.65,1.65])b.box(.2,3.6,.9,59+dx,y,.58,'paper');b.box(3.6,.2,.9,59,y+1.7,.58,'paper');addDetailedDrone(b,59,y,.66,3);}
  root.add(b.finish('assembly-station-solids'));const rig=createArticulatedInstances(T,definitions);root.add(rig.group);
  let disposed=false;const lastStates=[];
  function apply(snapshot,allowDemoCycle=false){
    if(disposed)return;lastStates.length=0;
    for(const cell of WORKCELLS){
      // A connected process adapter can supply an explicit 0..1 cycle position per cell.
      const supplied=snapshot?.factoryAssembly?.cells?.find(v=>v.id===cell.id);
      const progress=Number.isFinite(supplied?.progress)?Math.max(0,Math.min(1,supplied.progress)):null;
      const target=cell.droneStage===1?[.84,.84,2.115]:cell.droneStage===2?[.84,.84,2.29]:cell.droneStage===0?[0,-.24,2.10]:[0,-.63,1.70];
      const pose=progress!==null?assemblyPose({progress},0,target):assemblyPose({timeSeconds:allowDemoCycle?snapshot?.timeSeconds:0},allowDemoCycle?cell.offset:0,target);
      const translated=a=>[a[0]+cell.x,a[1]+cell.y,a[2]],prefix=cell.id+'-';
      rig.axis(prefix+'shoulder',translated(pose.shoulder),[.62,.62,.65],pose.jointAxis);rig.between(prefix+'upper',translated(pose.shoulder),translated(pose.elbow),.42,.48);
      rig.axis(prefix+'elbow',translated(pose.elbow),[.56,.56,.62],pose.jointAxis);rig.between(prefix+'forearm',translated(pose.elbow),translated(pose.wrist),.28,.34);
      rig.axis(prefix+'wrist',translated(pose.wrist),[.34,.34,.36],pose.jointAxis);rig.set(prefix+'tool',translated([pose.tool[0],pose.tool[1],pose.tool[2]+.3]),[.4,.3,.18]);
      for(const [id,sign]of[['left-jaw',-1],['right-jaw',1]])rig.set(prefix+id,translated([pose.tool[0]+sign*pose.grip,pose.tool[1],pose.tool[2]+.1]),[.07,.24,.32]);
      const componentPosition=pose.carrying||pose.installed?pose.componentAt:[-1.9,2.4,1.7],componentScale=cell.droneStage===1?[.24,.24,.2]:cell.droneStage===2?[1,.085,.03]:[.3,.38,.13];
      rig.set(prefix+'component',translated(componentPosition),componentScale);lastStates.push(Object.freeze({id:cell.id,stage:pose.stage,progress:pose.phase,carrying:pose.carrying,installed:pose.installed,tool:Object.freeze(translated(pose.tool))}));
    }
    const clock=allowDemoCycle?(snapshot?.timeSeconds||0):0,common=assemblyPose({timeSeconds:clock});
    for(let i=0;i<3;i++){const y=((common.conveyor+i/3)%1)*31+1;rig.set('conveyor-pallet-'+i,[-3.5,y,1.28],[1.5,2.1,.2]);rig.set('conveyor-kit-'+i,[-3.5,y,1.48],[.65,.8,.18]);}
    rig.set('qa-scanner',[42+common.scan,26.7,3.55],[.6,.6,.65]);rig.set('qa-camera',[42+common.scan,26.7,3.15],[.22,.22,.22]);rig.commit();
    root.userData.assemblyState=Object.freeze(lastStates.slice());
  }
  root.userData={workcells:WORKCELLS,illustrative:true,update:apply,dispose(){disposed=true;},assemblyState:Object.freeze([])};apply({});return root;
}
