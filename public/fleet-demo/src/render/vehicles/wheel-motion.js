/** Wheel travel is presentation state only. It never reads or changes an odometer.
 * Feed actual interpolated render poses, even for vehicles outside close-detail LOD.
 * timeSeconds is the simulation/replay clock, not wall time. Every discontinuity
 * is rebased: route switches, rewinds, wrapped progress and teleports do not spin.
 */
export class WheelTravelTracker {
  constructor({maxStepMeters=120}={}) {this.states=new Map();this.maxStepMeters=maxStepMeters;}
  sample(vehicle,{timeSeconds=0,paused=false,scale=1}={}) {
    if(!vehicle?.id||!Number.isFinite(vehicle.x)||!Number.isFinite(vehicle.y))return 0;
    const previous=this.states.get(vehicle.id),rootScale=Number.isFinite(scale)&&scale>0?scale:1;
    const next={x:vehicle.x,y:vehicle.y,heading:Number.isFinite(vehicle.heading)?vehicle.heading:0,
      routeId:vehicle.routeId,progress:vehicle.progress,timeSeconds,distance:previous?.distance??0};
    const step=previous?Math.hypot(next.x-previous.x,next.y-previous.y):0;
    const replay=previous&&timeSeconds<previous.timeSeconds;
    const switched=previous&&next.routeId!==previous.routeId;
    const wrapped=previous&&Number.isFinite(next.progress)&&Number.isFinite(previous.progress)&&Math.abs(next.progress-previous.progress)>.25;
    const jumped=step>this.maxStepMeters;
    if(!previous||replay||switched||wrapped||jumped)next.distance=0;
    else if(!paused&&step>0) {
      const dx=next.x-previous.x,dy=next.y-previous.y;
      // Heading zero is north/+Y. Negative longitudinal motion is reverse travel.
      const forward=dx*Math.sin(previous.heading)+dy*Math.cos(previous.heading);
      next.distance+=step*(forward< -1e-8?-1:1)/rootScale;
    }
    this.states.set(vehicle.id,next);return next.distance;
  }
  retain(ids) {const alive=new Set(ids);for(const id of this.states.keys())if(!alive.has(id))this.states.delete(id);}
  reset() {this.states.clear();}
}
