import {TRACTOR_TRAILER_ANCHORS} from '../vehicles/detail-model.js';
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const clamp=p=>Math.max(0,Math.min(1,Number.isFinite(p)?p:0));
export const TRAILER_KINEMATICS=Object.freeze({tractorHitch:TRACTOR_TRAILER_ANCHORS.tractor.fifthWheel,trailerKingpin:TRACTOR_TRAILER_ANCHORS.trailer.kingpin,axleDistance:TRACTOR_TRAILER_ANCHORS.trailer.wheelbase});
/** Ground-plane fifth-wheel constraint. Both attachment points coincide exactly. */
export function articulatePose(tractor,trailerHeading=tractor.heading){
 const {tractorHitch:h,trailerKingpin:k}=TRAILER_KINEMATICS,scale=tractor.scale??1,c=Math.cos(tractor.heading),s=Math.sin(tractor.heading),tc=Math.cos(trailerHeading),ts=Math.sin(trailerHeading);
 const hitch=[tractor.x+(h[0]*c+h[1]*s)*scale,tractor.y+(-h[0]*s+h[1]*c)*scale,(tractor.z||0)+h[2]*scale];
 const trailer={x:hitch[0]-(k[0]*tc+k[1]*ts)*scale,y:hitch[1]+(k[0]*ts-k[1]*tc)*scale,z:hitch[2]-k[2]*scale,heading:trailerHeading,scale};
 return{tractor:{...tractor},trailer,hitch,relativeAngle:wrap(tractor.heading-trailerHeading)};
}
/** Integrate the nonholonomic trailer axle, not a delayed copy of the tractor.
 * d(yaw)=(dx_hitch*cos(yaw)-dy_hitch*sin(yaw))/wheelbase. RK4 also
 * handles signed reversing motion without flipping the trailer by pi.
 * Integration is precomputed once from a pure spatial sampler. Optional tractor
 * interpolation/inspection reconstructs source geometry on demand. Frame rate,
 * sampling order and wall time never enter the retained trace.
 */
export function buildTrailerTrack(sample,totalMeters,{stepMeters=.25,initialHeading,axleDistance=TRAILER_KINEMATICS.axleDistance}={}){
 if(!(stepMeters>0)||!(axleDistance>0)||!Number.isFinite(totalMeters))throw new TypeError('Finite travel, positive step and wheelbase required');
 const count=Math.max(1,Math.ceil(Math.max(0,totalMeters)/stepMeters));
 // Only the three integrated scalar channels are retained. Tractor geometry is
 // already defined by the pure source sampler; hitch coordinates are a constraint,
 // not independent state. Float64 preserves every accepted integration bit.
 const headings=new Float64Array(count+1),trailerMeters=new Float64Array(count+1),tractorMeters=new Float64Array(count+1);
 const hitch=TRAILER_KINEMATICS.tractorHitch,drive=TRACTOR_TRAILER_ANCHORS.tractor.driveAxle;
 let previousHitchX=0,previousHitchY=0,previousAxleX=0,previousAxleY=0,previousHeading=0,heading=initialHeading,trailerTravel=0,tractorTravel=0;
 for(let i=0;i<=count;i++){
  const tractor=sample(i/count),scale=tractor.scale??1,c=Math.cos(tractor.heading),s=Math.sin(tractor.heading);
  if(!Number.isFinite(heading))heading=tractor.heading;
  const hx=tractor.x+(hitch[0]*c+hitch[1]*s)*scale,hy=tractor.y+(-hitch[0]*s+hitch[1]*c)*scale;
  const ax=tractor.x+drive[1]*Math.sin(tractor.heading)*scale,ay=tractor.y+drive[1]*Math.cos(tractor.heading)*scale;
  if(i){
   const dx=hx-previousHitchX,dy=hy-previousHitchY,L=axleDistance*scale,f=a=>(dx*Math.cos(a)-dy*Math.sin(a))/L;
   const oldHeading=heading,k1=f(heading),k2=f(heading+k1/2),k3=f(heading+k2/2),k4=f(heading+k3);heading+=(k1+2*k2+2*k3+k4)/6;
   const mid=oldHeading+wrap(heading-oldHeading)/2;trailerTravel+=dx*Math.sin(mid)+dy*Math.cos(mid);
   const m=previousHeading+wrap(tractor.heading-previousHeading)/2;
   tractorTravel+=(ax-previousAxleX)*Math.sin(m)+(ay-previousAxleY)*Math.cos(m);
  }
  headings[i]=heading;trailerMeters[i]=trailerTravel;tractorMeters[i]=tractorTravel;
  previousHitchX=hx;previousHitchY=hy;previousAxleX=ax;previousAxleY=ay;previousHeading=tractor.heading;
 }
 // The former inspection API remains available, but is materialized only on an
 // explicit records read. Runtime routes use endHeading and never allocate it.
 let inspectionRecords;
 return Object.freeze({sampleCount:count+1,storageBytes:headings.byteLength+trailerMeters.byteLength+tractorMeters.byteLength,endHeading:heading,
  get records(){return inspectionRecords??=Object.freeze(Array.from({length:count+1},(_,i)=>{const tractor=sample(i/count),h=articulatePose(tractor,headings[i]).hitch;return Object.freeze({progress:i/count,heading:headings[i],trailerTravel:trailerMeters[i],tractorTravel:tractorMeters[i],tractor:Object.freeze({...tractor}),hitch:Object.freeze(h)});}));},
  sample(progress,tractor){const u=clamp(progress)*count,i=Math.min(count-1,Math.floor(u)),t=u-i,yaw=headings[i]+wrap(headings[i+1]-headings[i])*t;
   let pose=tractor;
   if(!pose){const a=sample(i/count),b=sample((i+1)/count);pose={...a,x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:(a.z??0)+((b.z??0)-(a.z??0))*t,heading:a.heading+wrap(b.heading-a.heading)*t};}
   return{...articulatePose(pose,yaw),tractorTravel:tractorMeters[i]+(tractorMeters[i+1]-tractorMeters[i])*t,trailerTravel:trailerMeters[i]+(trailerMeters[i+1]-trailerMeters[i])*t};
  },
 });
}
