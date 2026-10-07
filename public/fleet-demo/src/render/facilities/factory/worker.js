import {createFactoryGeometry,createArticulatedInstances}from'./geometry.js';

/** Generic safety-clothed worker; explicit distance/reach poses, no behavior or timers. */
export function createFactoryWorker({THREE}){
 const T=THREE,b=createFactoryGeometry(T),root=new T.Group();root.name='factory-worker';
 b.box(.30,.19,.18,0,0,.93,'dark');b.box(.37,.22,.37,0,0,1.22,'paper');b.ellipsoid(.20,.13,.11,0,0,1.40,'face');
 b.cylinder(.05,.08,0,0,1.47,'muted');b.ellipsoid(.105,.09,.13,0,.01,1.60,'face');
 b.ellipsoid(.125,.115,.085,0,0,1.71,'paper');b.cylinder(.15,.022,0,.005,1.69,'paper');
 // Dark vest seams, belt and pale reflective strips, deliberately without company insignia.
 b.box(.025,.014,.31,0,.121,1.22,'dark');for(const x of[-.12,.12])b.box(.025,.018,.29,x,.12,1.23,'muted');b.box(.34,.016,.026,0,.123,1.15,'muted');b.box(.31,.21,.035,0,0,1.0,'ink');
 const defs=[];for(const side of['left','right'])for(const[id,shape,tone]of[['thigh','box','dark'],['shin','box','dark'],['boot','box','ink'],['upper-arm','box','face'],['forearm','box','face'],['glove','box','dark']])defs.push({id:side+'-'+id,shape,tone});
 root.add(b.finish('worker-body'));const rig=createArticulatedInstances(T,defs);root.add(rig.group);let disposed=false;
 root.userData={kind:'worker',illustrative:true,dimensions:{width:.70,depth:1.0,height:1.80},pose:Object.freeze({walkDistance:0,reachProgress:0}),
  update({walkDistance=0,reachProgress=0}={}){
   if(disposed)return;const distance=Number.isFinite(walkDistance)?walkDistance:0,reach=Number.isFinite(reachProgress)?Math.max(0,Math.min(1,reachProgress)):0,phase=distance*Math.PI*2/1.2;
   for(const[side,sign]of[['left',-1],['right',1]]){
    const swing=Math.sin(phase+(sign>0?Math.PI:0)),hip=[sign*.10,0,.90],knee=[sign*.105,swing*.12,.52],ankle=[sign*.105,swing*.23,.10+Math.max(0,swing)*.04];
    rig.between(side+'-thigh',hip,knee,.115,.12);rig.between(side+'-shin',knee,ankle,.09,.10);rig.set(side+'-boot',[ankle[0],ankle[1]+.045,ankle[2]-.06],[.12,.26,.08]);
    const shoulder=[sign*.22,0,1.39],elbow=[sign*(.24+reach*.03),reach*.22-(1-reach)*swing*.08,1.11+reach*.06],hand=[sign*.20,reach*.53-(1-reach)*swing*.15,.88+reach*.34];
    rig.between(side+'-upper-arm',shoulder,elbow,.085,.10);rig.between(side+'-forearm',elbow,hand,.07,.08);rig.set(side+'-glove',hand,[.085,.12,.10]);
   }
   rig.commit();root.userData.pose=Object.freeze({walkDistance:distance,reachProgress:reach});
  },dispose(){disposed=true;}
 };root.userData.update();return root;
}
