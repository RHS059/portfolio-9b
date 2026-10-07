export const WORKCELLS=Object.freeze([
 Object.freeze({id:'frame-jig',x:-16,y:5,stage:'Frame and electronics',droneStage:0,offset:0}),
 Object.freeze({id:'motor-install',x:9,y:5,stage:'Motor installation',droneStage:1,offset:.25}),
 Object.freeze({id:'propeller-install',x:-16,y:27,stage:'Propeller installation',droneStage:2,offset:.5}),
 Object.freeze({id:'final-assembly',x:9,y:27,stage:'Final assembly',droneStage:3,offset:.75}),
]);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
export function assemblyPose(snapshot={},offset=0,target=[.55,.5,1.9]){
 const seconds=Number.isFinite(snapshot?.timeSeconds)?Math.max(0,snapshot.timeSeconds):0,phase=Number.isFinite(snapshot?.progress)?clamp(snapshot.progress,0,1):((seconds/16+offset)%1+1)%1;
 const pickup=Array.isArray(snapshot?.pickup)&&snapshot.pickup.length===3&&snapshot.pickup.every(Number.isFinite)?snapshot.pickup.slice():[-1.9,2.4,1.7],highPickup=[pickup[0],pickup[1],Math.max(2.8,pickup[2]+.6)],highPlace=[target[0],target[1],2.5],place=target.slice();let tool,stage;
 if(phase<.16){tool=mix(highPickup,pickup,smooth(phase/.16));stage='pick';}
 else if(phase<.32){tool=mix(pickup,highPickup,smooth((phase-.16)/.16));stage='lift';}
 else if(phase<.5){tool=mix(highPickup,highPlace,smooth((phase-.32)/.18));stage='transfer';}
 else if(phase<.68){tool=mix(highPlace,place,smooth((phase-.5)/.18));stage='place';}
 else if(phase<.82){tool=mix(place,highPlace,smooth((phase-.68)/.14));stage='retract';}
 else{tool=mix(highPlace,highPickup,smooth((phase-.82)/.18));stage='return';}
 if(Array.isArray(snapshot?.tool)&&snapshot.tool.length===3&&snapshot.tool.every(Number.isFinite)){tool=snapshot.tool.slice();stage='open-box';}
 const shoulder=[-3,0,1.6],wrist=[tool[0],tool[1],tool[2]+(Number.isFinite(snapshot?.wristLift)?clamp(snapshot.wristLift,.55,1.15):.55)],dx=wrist[0]-shoulder[0],dy=wrist[1]-shoulder[1],dz=wrist[2]-shoulder[2],r=Math.hypot(dx,dy),d=Math.hypot(r,dz),upper=2.25,lower=2.0;
 const pitch=Math.atan2(dz,r)+Math.acos(clamp((upper*upper+d*d-lower*lower)/(2*upper*d),-1,1));
 const elbow=[shoulder[0]+upper*Math.cos(pitch)*dx/r,shoulder[1]+upper*Math.cos(pitch)*dy/r,shoulder[2]+upper*Math.sin(pitch)];
 return Object.freeze({seconds,phase,stage,shoulder:Object.freeze(shoulder),elbow:Object.freeze(elbow),wrist:Object.freeze(wrist),tool:Object.freeze(tool),jointAxis:Object.freeze([-dy/r,dx/r,0]),grip:phase>.14&&phase<.68?.10:.28,carrying:phase>.16&&phase<.68,installed:phase>=.68,componentAt:Object.freeze(phase>=.68?place:tool),conveyor:((seconds/24)%1+1)%1,scan:Math.sin(seconds*.7)*1.3});
}
