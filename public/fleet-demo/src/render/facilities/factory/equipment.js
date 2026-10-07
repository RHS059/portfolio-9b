import {createFactoryGeometry} from './geometry.js';

/** Reusable transport props only. The caller owns travel and cargo handoff state. */
export function createForklift({THREE}){
 const T=THREE,b=createFactoryGeometry(T),root=new T.Group();root.name='factory-forklift';
 b.box(1.04,1.9,.27,0,-.02,.48,'dark');b.box(1.02,.8,.73,0,-.65,.85,'paper');for(const z of [.73,.82,.91])b.box(.58,.018,.035,0,-1.06,z,'dark');
 b.box(.90,.87,.22,0,.20,.72,'face');b.box(.46,.40,.12,0,-.12,.99,'dark');b.box(.46,.12,.46,0,-.34,1.20,'dark');
 // Open overhead guard and driver's controls.
 for(const x of[-.44,.44])for(const y of[-.5,.46])b.box(.045,.045,1.38,x,y,1.52,'ink');
 for(const x of[-.47,.47])b.box(.055,1.12,.055,x,-.02,2.23,'dark');for(const y of[-.57,.53])b.box(.97,.055,.055,0,y,2.23,'dark');
 for(const y of[-.34,-.02,.30])b.box(.93,.028,.028,0,y,2.22,'muted');
 b.link([0,.31,.86],[0,.49,1.36],.045,.045,'ink');b.cylinder(.15,.028,0,.50,1.39,'dark',[.65,0,0],16);
 // Nested mast channels, visible lift ram and chain/sheave forms.
 for(const x of[-.35,.35]){b.box(.10,.16,1.95,x,.96,1.10,'ink');b.box(.055,.10,1.73,x,1.0,1.14,'muted');}
 b.box(.82,.16,.11,0,.96,2.10,'dark');b.cylinder(.055,1.65,0,.91,1.18,'muted');
 for(const x of[-.22,.22])b.cylinder(.065,.05,x,.97,1.97,'dark',[Math.PI/2,0,0]);
 root.add(b.finish('forklift-body'));
 const wheelGroups=[];
 for(const[x,y,r]of[[-.53,.57,.27],[.53,.57,.27],[-.48,-.72,.215],[.48,-.72,.215]]){
   const wheel=createFactoryGeometry(T);wheel.cylinder(r,.16,0,0,0,'ink',[0,0,Math.PI/2],16);wheel.cylinder(r*.62,.17,0,0,0,'face',[0,0,Math.PI/2],12);wheel.cylinder(r*.22,.18,0,0,0,'muted',[0,0,Math.PI/2],12);
   // A spoke on each outward face makes distance-driven rotation legible.
   wheel.box(.18,r*1.1,.035,0,0,0,'dark');const group=wheel.finish('forklift-wheel');group.position.set(x,y,r);group.userData.radius=r;root.add(group);wheelGroups.push(group);
 }
 const carriage=new T.Group();carriage.name='forklift-carriage';const forks=createFactoryGeometry(T);
 forks.box(.82,.10,.65,0,1.10,.39,'dark');for(const x of[-.30,.30]){forks.box(.10,1.07,.055,x,1.64,-.028,'muted');forks.box(.10,.10,.54,x,1.15,.24,'muted');}
 carriage.add(forks.finish('forks-and-carriage'));const payloadMount=new T.Group();payloadMount.name='forklift-payload-mount';payloadMount.position.set(0,1.65,0);carriage.add(payloadMount);root.add(carriage);
 let disposed=false;
 root.userData={kind:'forklift',illustrative:true,axes:'x-right/y-forward/z-up',payloadMount,dimensions:{width:1.25,length:3.42,height:2.35},
   update({liftHeight=.08,travelMeters=0}={}){if(disposed)return;carriage.position.z=Math.max(.055,Math.min(1.6,Number.isFinite(liftHeight)?liftHeight:.08));for(const wheel of wheelGroups)wheel.rotation.x=Number.isFinite(travelMeters)&&travelMeters!==0?-travelMeters/wheel.userData.radius:0;},
   dispose(){disposed=true;}
 };root.userData.update();return root;
}

export function createRollerAMR({THREE}){
 const T=THREE,b=createFactoryGeometry(T),root=new T.Group();root.name='factory-roller-amr';
 const rounded=(width,depth,height,z,r,tone)=>{const x=width/2,y=depth/2,shape=new T.Shape();shape.moveTo(-x+r,-y);shape.lineTo(x-r,-y);shape.quadraticCurveTo(x,-y,x,-y+r);shape.lineTo(x,y-r);shape.quadraticCurveTo(x,y,x-r,y);shape.lineTo(-x+r,y);shape.quadraticCurveTo(-x,y,-x,y-r);shape.lineTo(-x,-y+r);shape.quadraticCurveTo(-x,-y,-x+r,-y);b.add(new T.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,curveSegments:3,steps:1}),[0,0,z],[0,0,0],[1,1,1],tone);};
 rounded(.66,.90,.055,.07,.10,'dark');rounded(.62,.84,.22,.125,.08,'paper');rounded(.60,.82,.035,.345,.07,'face');
 // Open lift columns and cross-braces make the mobile base distinct from its roller top module.
 for(const x of[-.23,.23])for(const y of[-.28,.28])b.box(.055,.055,.47,x,y,.60,'muted');
 for(const x of[-.23,.23]){b.link([x,-.28,.39],[x,.28,.81],.025,.025,'dark');b.link([x,.28,.39],[x,-.28,.81],.025,.025,'dark');}
 for(const x of[-.39,.39])b.box(.07,1.2,.14,x,0,.89,'dark');
 for(let y=-.52;y<=.53;y+=.13)b.cylinder(.055,.73,0,y,.92,'muted',[0,0,Math.PI/2],10);
 // Front scan window, corner sensing apertures, service panel and top emergency-stop form.
 b.ellipsoid(.095,.065,.055,0,.425,.225,'ink');
 for(const x of[-.22,.22])b.cylinder(.035,.022,x,.422,.23,'dark',[0,0,0]);
 b.box(.28,.012,.12,0,-.425,.23,'face');b.box(.20,.014,.022,0,-.434,.23,'muted');b.cylinder(.025,.024,.20,-.25,.387,'dark');
 const wheels=[];
 for(const x of[-.31,.31]){const g=createFactoryGeometry(T);g.cylinder(.11,.075,0,0,0,'ink',[0,0,Math.PI/2],16);g.cylinder(.065,.078,0,0,0,'face',[0,0,Math.PI/2],12);g.box(.081,.13,.018,0,0,0,'dark');const wheel=g.finish('amr-drive-wheel');wheel.position.set(x,0,.11);root.add(wheel);wheels.push(wheel);}
 for(const x of[-.22,.22])for(const y of[-.30,.30])b.cylinder(.05,.032,x,y,.055,'ink',[0,0,Math.PI/2],10);
 root.add(b.finish('amr-roller-platform'));const payloadMount=new T.Group();payloadMount.name='amr-payload-mount';payloadMount.position.set(0,0,.975);root.add(payloadMount);
 let disposed=false;
 root.userData={kind:'roller-amr',illustrative:true,payloadMount,transferHeight:.975,dimensions:{width:.86,length:1.2,height:.975},
  update({travelMeters=0}={}){if(disposed)return;for(const wheel of wheels)wheel.rotation.x=Number.isFinite(travelMeters)&&travelMeters!==0?-travelMeters/.11:0;},
  dispose(){disposed=true;}
 };root.userData.update();return root;
}

export function createPallet({THREE}){
 const b=createFactoryGeometry(THREE);
 for(const y of[-.4,0,.4])for(const x of[-.43,0,.43])b.box(.16,.16,.10,x,y,.09,'muted');
 for(const x of[-.43,0,.43])b.box(.15,1.0,.045,x,0,.0225,'face');
 for(const x of[-.49,-.245,0,.245,.49])b.box(.21,1.0,.05,x,0,.165,'paper');
 const group=b.finish('reusable-pallet');group.userData={kind:'pallet',illustrative:true,topZ:.19,dimensions:{width:1.2,depth:1,height:.19}};return group;
}

export function createOpeningCarton({THREE}){
 const T=THREE,b=createFactoryGeometry(T),root=new T.Group();root.name='parts-carton';
 b.box(.78,.58,.025,0,0,.0125,'face');b.box(.70,.50,.17,0,0,.11,'dark');for(const x of[-.39,.39])b.box(.025,.58,.45,x,0,.25,'paper');for(const y of[-.29,.29])b.box(.78,.025,.45,0,y,.25,'paper');
 // Visible separators and component placeholders do not claim inventory quantities.
 for(const x of[-.18,.18])b.box(.016,.50,.25,x,0,.15,'face');for(const x of[-.27,0,.27])for(const y of[-.12,.12])b.cylinder(.065,.13,x,y,.27,'muted');root.add(b.finish('carton-and-kit'));
 const flaps=[];
 for(const side of[-1,1]){const pivot=new T.Group(),g=createFactoryGeometry(T);pivot.position.set(side*.39,0,.475);g.box(.39,.58,.018,-side*.195,0,0,'paper');pivot.add(g.finish('carton-side-flap'));pivot.userData={axis:'y',sign:side};root.add(pivot);flaps.push(pivot);}
 for(const side of[-1,1]){const pivot=new T.Group(),g=createFactoryGeometry(T);pivot.position.set(0,side*.29,.478);g.box(.78,.29,.018,0,-side*.145,0,'paper');pivot.add(g.finish('carton-end-flap'));pivot.userData={axis:'x',sign:-side};root.add(pivot);flaps.push(pivot);}
 let disposed=false;root.userData={kind:'parts-carton',illustrative:true,
  setOpen(progress){if(disposed)return;const p=Number.isFinite(progress)?Math.max(0,Math.min(1,progress)):0;for(const flap of flaps)flap.rotation[flap.userData.axis]=flap.userData.sign*p*Math.PI*.8;root.userData.openProgress=p;},
  dispose(){disposed=true;}
 };root.userData.setOpen(0);return root;
}
