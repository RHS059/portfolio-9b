import {buildTrailerTrack,articulatePose} from '../core/trailer-kinematics.js';
import {DETAIL_MODEL_METADATA,TRACTOR_TRAILER_ANCHORS} from '../vehicles/detail-model.js';
import {createPortProcessLayouts} from '../facilities/port/process-layout.js';
const TAU=Math.PI*2,wrap=a=>Math.atan2(Math.sin(a),Math.cos(a)),mod=a=>(a%TAU+TAU)%TAU;
const clamp=p=>Math.max(0,Math.min(1,Number.isFinite(p)?p:0));
const distance=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
/** Illustrative US right-hand lane centers, 3.8 m apart. The map source does
 * not survey curb/lane widths. Caltrans HDM 301.1 uses 12 ft lanes and requires
 * tight-turn offtracking analysis; we retain the road corridor and schedule
 * ordinary opposing traffic through its narrow bends rather than widening it.
 * https://dot.ca.gov/-/media/dot-media/programs/design/documents/chp0300-032020.pdf
 */
export const ROAD_LANE_OFFSET_METERS=1.9;
// Legacy geometric progress helpers remain identity maps. Ordinary traffic now
// uses its explicit single-clock timetable rather than the retired .006/12-slot loop.
export const trafficCircuitProgress=clamp;
export const trafficCircuitPhase=clamp;
function smoothPhaseAdjustment(progress,center,halfWidth,shift){const u=(progress-center)/halfWidth;return Math.abs(u)<1?progress+shift*(1-u*u)**4:progress;}
/** Smooth appointment-preserving priority-carrier timing at the two narrow
 * counterflow encounters. These do not change a process phase or ownership time. */
export function cargoRoadProgress(routeId,progress){const p=clamp(progress);return routeId==='cargo-outbound'?smoothPhaseAdjustment(p,.72,.28,.012):routeId==='cargo-dispatch-return'?smoothPhaseAdjustment(p,.28,.28,-.001):p;}
export const ORDINARY_TRAFFIC_CYCLE_SECONDS=128;
/** The inbound-only preview admits one ordinary story truck. Decorative slots
 * remain disabled until the larger mixed-traffic timetable has passed its sweep. */
export const ORDINARY_TRAFFIC_SLOTS=Object.freeze([
 Object.freeze({id:'TRK-208',carrierIndex:2,trafficRouteId:'ORDINARY-PREVIEW-208'}),
]);
export function sampleOrdinaryTraffic(timeSeconds=0,slotIndex=0,{presentationOffsetSeconds=102.5}={}){
 const slot=ORDINARY_TRAFFIC_SLOTS[slotIndex];if(!slot)throw new RangeError('Unknown ordinary traffic slot');
 const time=Number.isFinite(timeSeconds)?Math.max(0,Math.min(timeSeconds,Number.MAX_SAFE_INTEGER/1024)):0,offset=Number.isFinite(presentationOffsetSeconds)?Math.max(0,presentationOffsetSeconds):0,elapsed=time+offset-slot.carrierIndex*32-5,waiting=elapsed<0,cycle=waiting?0:Math.floor(elapsed/128),local=waiting?0:elapsed-cycle*128;
 return Object.freeze({id:slot.id,routeId:'delivery',trafficRouteId:slot.trafficRouteId,trafficPhase:'ordinary-circuit',trafficSlot:slotIndex,progress:local/128,travelCycle:cycle,status:(local>24&&local<64)||(local>72&&local<108)?'moving':'yielding',stopped:!((local>24&&local<64)||(local>72&&local<108))});
}
function ordinaryDistanceAtSeconds(t,dockMeters,totalMeters){
 const out=dockMeters/36,back=(totalMeters-dockMeters)/32,ramps=[[26,0,0,out],[62,dockMeters,out,0],[74,dockMeters,0,back],[106,totalMeters,back,0]];
 for(const [at,d,v0,v1]of ramps)if(t>at-2&&t<at+2){const u=(t-(at-2))/4,integral=u**6-3*u**5+2.5*u**4;return d-2*v0+4*(v0*u+(v1-v0)*integral);}
 return t<=26?0:t<62?(t-26)*out:t<=74?dockMeters:t<106?dockMeters+(t-74)*back:totalMeters;
}
const rearOffset=TRACTOR_TRAILER_ANCHORS.tractor.driveAxle[1];
const axlePose=p=>({...p,x:p.x+rearOffset*Math.sin(p.heading),y:p.y+rearOffset*Math.cos(p.heading)});
const rootPose=p=>({...p,x:p.x-rearOffset*Math.sin(p.heading),y:p.y-rearOffset*Math.cos(p.heading),z:p.z??.15,scale:1});
function advance(p,length,curvature=0){const h=p.heading+length*curvature;return{...p,x:p.x+(curvature?(Math.cos(p.heading)-Math.cos(h))/curvature:Math.sin(h)*length),y:p.y+(curvature?(Math.sin(h)-Math.sin(p.heading))/curvature:Math.cos(h)*length),heading:h};}
function makePath(segments){let total=0;const spans=segments.filter(s=>s.length>1e-8).map(s=>({...s,start:total,end:total+=s.length}));return{segments:spans,length:total,sample(meters){const d=Math.max(0,Math.min(total,meters));let lo=0,hi=spans.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(spans[mid].end<d)lo=mid+1;else hi=mid;}const s=spans[lo];return s?advance(s.pose,d-s.start,s.curvature):null;}};}
function join(...paths){return makePath(paths.flatMap(p=>p.segments));}
function line(a,b){const length=Math.hypot(b.x-a.x,b.y-a.y),heading=length?Math.atan2(b.x-a.x,b.y-a.y):a.heading;return makePath([{pose:{...a,heading},length,curvature:0}]);}
function simplify(points,tolerance=1.5){if(points.length<3)return points;const a=points[0],b=points.at(-1),dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy;let max=tolerance,index=-1;for(let i=1;i<points.length-1;i++){const p=points[i],t=den?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/den)):0,d=Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dy*t);if(d>max){max=d;index=i;}}return index<0?[a,b]:[...simplify(points.slice(0,index+1),tolerance).slice(0,-1),...simplify(points.slice(index),tolerance)];}
/** Circular corner fillets retain the mapped road corridor while removing yaw snaps. */
function roundedPolyline(input,radius=24){
 const points=input.filter((p,i)=>i===0||distance(p,input[i-1])>1e-6),segments=[];let current={x:points[0][0],y:points[0][1],z:points[0][2]??.15,heading:Math.atan2(points[1][0]-points[0][0],points[1][1]-points[0][1])};
 const addLine=target=>{const p=line(current,{x:target[0],y:target[1]});segments.push(...p.segments);if(p.length)current=p.sample(p.length);};
 for(let i=1;i<points.length-1;i++){
  const a=points[i-1],b=points[i],c=points[i+1],h0=Math.atan2(b[0]-a[0],b[1]-a[1]),h1=Math.atan2(c[0]-b[0],c[1]-b[1]),turn=wrap(h1-h0),tan=Math.tan(Math.abs(turn)/2);
  if(Math.abs(turn)<1e-6||!Number.isFinite(tan)){addLine(b);continue;}
  const trim=Math.min(radius*tan,distance(a,b)*.49,distance(b,c)*.49),r=trim/tan,entry=[b[0]-Math.sin(h0)*trim,b[1]-Math.cos(h0)*trim];addLine(entry);
  const segment={pose:{...current,heading:h0},length:r*Math.abs(turn),curvature:Math.sign(turn)/r};segments.push(segment);current=advance(segment.pose,segment.length,segment.curvature);
 }
 addLine(points.at(-1));return makePath(segments);
}
/** Parallel right-hand traffic lane of a C1 line/arc road. Offsetting the
 * entire analytic curve preserves tangent joins and exact curvature, unlike
 * moving independently sampled points or displacing the articulated body.
 */
function rightHandLane(path,offset=ROAD_LANE_OFFSET_METERS){return makePath(path.segments.map(segment=>{const factor=1-offset*segment.curvature;if(factor<=.05)throw new RangeError('Road radius cannot support the requested lane offset');const h=segment.pose.heading;return{pose:{...segment.pose,x:segment.pose.x+offset*Math.cos(h),y:segment.pose.y-offset*Math.sin(h)},length:segment.length*factor,curvature:segment.curvature/factor};}));}
function eastboundLaneChange(start,endY,radius=24){const shift=endY-start.y;if(Math.abs(shift)<1e-8)return makePath([]);const angle=Math.acos(1-Math.abs(shift)/(2*radius)),curvature=-Math.sign(shift)/radius,first={pose:{...start,heading:Math.PI/2},length:angle*radius,curvature},middle=advance(first.pose,first.length,curvature),second={pose:middle,length:first.length,curvature:-curvature};return makePath([first,second]);}
/** Forward-only bounded-curvature connector. Coordinates follow +Y-heading convention. */
function dubinsCandidates(start,end,radius=24){
 const dx=end.x-start.x,dy=end.y-start.y,d=Math.hypot(dx,dy)/radius,theta=Math.atan2(dy,dx),a=mod(Math.PI/2-start.heading-theta),b=mod(Math.PI/2-end.heading-theta),sa=Math.sin(a),sb=Math.sin(b),ca=Math.cos(a),cb=Math.cos(b),cab=Math.cos(a-b),candidates=[];
 const add=(mode,t,p,q)=>{if([t,p,q].every(Number.isFinite)){let pose={...start};const segments=mode.split('').map((type,i)=>{const length=[t,p,q][i]*radius,curvature=type==='S'?0:(type==='L'?-1:1)/radius,segment={pose,length,curvature};pose=advance(pose,length,curvature);return segment;});if(Math.hypot(pose.x-end.x,pose.y-end.y)<1e-5&&Math.abs(wrap(pose.heading-end.heading))<1e-5)candidates.push(makePath(segments));}};
 let p2=2+d*d-2*cab+2*d*(sa-sb);if(p2>=0){const t=Math.atan2(cb-ca,d+sa-sb);add('LSL',mod(-a+t),Math.sqrt(p2),mod(b-t));}
 p2=2+d*d-2*cab+2*d*(sb-sa);if(p2>=0){const t=Math.atan2(ca-cb,d-sa+sb);add('RSR',mod(a-t),Math.sqrt(p2),mod(-b+t));}
 p2=-2+d*d+2*cab+2*d*(sa+sb);if(p2>=0){const p=Math.sqrt(p2),t=Math.atan2(-ca-cb,d+sa+sb)-Math.atan2(-2,p);add('LSR',mod(-a+t),p,mod(-b+t));}
 p2=d*d-2+2*cab-2*d*(sa+sb);if(p2>=0){const p=Math.sqrt(p2),t=Math.atan2(ca+cb,d-sa-sb)-Math.atan2(2,p);add('RSL',mod(a-t),p,mod(b-t));}
 let v=(6-d*d+2*cab+2*d*(sa-sb))/8;if(Math.abs(v)<=1){const p=mod(TAU-Math.acos(v)),t=mod(a-Math.atan2(ca-cb,d-sa+sb)+p/2);add('RLR',t,p,mod(a-b-t+p));}
 v=(6-d*d+2*cab+2*d*(-sa+sb))/8;if(Math.abs(v)<=1){const p=mod(TAU-Math.acos(v)),t=mod(-a-Math.atan2(ca-cb,d+sa-sb)+p/2);add('LRL',t,p,mod(b-a-t+p));}
 return candidates.sort((a,b)=>a.length-b.length);
}
function corners(pose,metadata){const {min,max}=metadata.bounds||metadata;return[[min[0],min[1]],[max[0],min[1]],[max[0],max[1]],[min[0],max[1]]].map(([x,y])=>[pose.x+x*Math.cos(pose.heading)+y*Math.sin(pose.heading),pose.y-x*Math.sin(pose.heading)+y*Math.cos(pose.heading)]);}
function polygonBounds(poly){return{min:[Math.min(...poly.map(p=>p[0])),Math.min(...poly.map(p=>p[1]))],max:[Math.max(...poly.map(p=>p[0])),Math.max(...poly.map(p=>p[1]))]};}
function polygonIntersects(a,b,padding=0){for(const poly of[a,b])for(let i=0;i<poly.length;i++){const q=poly[(i+1)%poly.length],x=q[1]-poly[i][1],y=poly[i][0]-q[0],margin=padding*Math.hypot(x,y),pa=a.map(p=>p[0]*x+p[1]*y),pb=b.map(p=>p[0]*x+p[1]*y);if(Math.max(...pa)<=Math.min(...pb)-margin||Math.max(...pb)<=Math.min(...pa)-margin)return false;}return true;}
function prepareObstacle(box){if(box.landward&&box.point)return box;const polygon=box.polygon||[[box.min[0],box.min[1]],[box.max[0],box.min[1]],[box.max[0],box.max[1]],[box.min[0],box.max[1]]];return{...box,...polygonBounds(polygon),polygon};}
function preparedFootprints(sample,trailerStyle='flatbed'){return Object.values(cargoFootprints(sample,trailerStyle)).map(polygon=>({polygon,...polygonBounds(polygon)}));}
function footprintsIntersect(parts,box){if(box.landward&&box.point)return parts.some(({polygon})=>polygon.some(p=>(p[0]-box.point[0])*box.landward[0]+(p[1]-box.point[1])*box.landward[1]<(box.clearanceMeters??.25)));
 const margin=box.clearanceMeters??0;return parts.some(part=>part.max[0]>=box.min[0]-margin&&part.min[0]<=box.max[0]+margin&&part.max[1]>=box.min[1]-margin&&part.min[1]<=box.max[1]+margin&&polygonIntersects(part.polygon,box.polygon,margin));}
export function cargoFootprints(sample,trailerStyle='flatbed'){return{tractor:corners(sample.tractor,DETAIL_MODEL_METADATA.tractor),trailer:corners(sample.trailer,trailerStyle==='box'?DETAIL_MODEL_METADATA.boxTrailer:DETAIL_MODEL_METADATA.flatbedTrailer)};}
export function cargoIntersectsBounds(sample,bounds,trailerStyle='flatbed'){return footprintsIntersect(preparedFootprints(sample,trailerStyle),prepareObstacle(bounds));}
/** Actual ground-level port solids, all transformed from the shared layout.
 * Overhead beams start at36m and do not intersect these vehicle envelopes.
 * Container rows deliberately use their full conservative authored envelopes.
 */
export function createPortRouteObstacles(layout,site,{clearanceMeters=.35}={}){
 const world=(crane,x,y)=>[site.x+crane.center[0]+layout.along[0]*x+layout.landward[0]*y,site.y+crane.center[1]+layout.along[1]*x+layout.landward[1]*y];
 const legs=layout.cranes.flatMap(crane=>[-10,10].flatMap(x=>[-13,13].map(y=>({id:`${crane.id}:leg:${x}:${y}`,kind:'gantry-column',polygon:[[-.6,-.6],[.6,-.6],[.6,.6],[-.6,.6]].map(([dx,dy])=>world(crane,x+dx,y+dy)),clearanceMeters}))));
 const rows=layout.rows.map(row=>({id:row.id,kind:'container-row',polygon:row.corners.map(p=>[site.x+p[0],site.y+p[1]]),clearanceMeters}));
 const hulls=createPortProcessLayouts(layout).map(berth=>({id:`${berth.id}:hull`,kind:'moored-hull',polygon:berth.ship.corners.map(p=>[site.x+p[0],site.y+p[1]]),clearanceMeters}));
 return Object.freeze([...legs,...rows,...hulls].map(obstacle=>Object.freeze({...obstacle,polygon:Object.freeze(obstacle.polygon.map(Object.freeze))})));
}
function connector(start,end,obstacles){for(const radius of [24,30,18])for(const path of dubinsCandidates(start,end,radius)){
 const trace=buildTrailerTrack(p=>rootPose(path.sample(p*path.length)),path.length,{stepMeters:.2,initialHeading:start.heading});let clear=true;
 for(let d=0;d<=path.length;d+=.2){const state=trace.sample(d/path.length,rootPose(path.sample(d))),parts=preparedFootprints(state);if(obstacles.some(box=>footprintsIntersect(parts,box))){clear=false;break;}}
 if(clear)return path;
 }throw new Error('No exterior cargo connector avoids the supplied buildings and port obstacles');}
/**
 * Build one closed, forward-moving drive-axle trajectory for the complete cargo run.
 * The public-road portion comes only from roadPoints. Final connectors are authored
 * exterior apron movements; east-facing south-apron bays permit a genuine pull-through
 * stop. One periodic trailer solution crosses every phase boundary and both port joins.
 * Dispatch aliases reuse the same closed geometry starting at the bay: outbound
 * follows cargo-return; return follows cargo-outbound plus arrival. portPose is then
 * the remote fleet-drop pose, not a ship. Both variants keep wheel travel continuous.
 * cycleIndex is the completed-circuit count; callers advance it during the final
 * stationary phase after a circuit closes, rather than resetting wheel phase.
 * All coordinates/bounds are world meters. No actors, clocks or mutable domain data.
 */
export function createCargoRoutes({portPose,bayPose,roadPoints,buildingBounds,obstacles=[],portBoundary,roadLaneOffsetMeters=ROAD_LANE_OFFSET_METERS}={}){
 if(!portPose||!bayPose||!Array.isArray(roadPoints)||roadPoints.length<2||!buildingBounds)throw new TypeError('Cargo routes require port/bay poses, road points and factory bounds');
 if(!Number.isFinite(roadLaneOffsetMeters)||roadLaneOffsetMeters<0||roadLaneOffsetMeters>ROAD_LANE_OFFSET_METERS)throw new RangeError('Lane offsets must remain within the authored 1.9 meter half-width');
 if(Math.abs(wrap(bayPose.heading-Math.PI/2))>1e-6)throw new RangeError('South-apron cargo bays must face east for the pull-through maneuver');
 const boxes=[buildingBounds,...obstacles.map(o=>o.bounds||o),...(portBoundary?[portBoundary]:[])].map(prepareObstacle),factoryX=(buildingBounds.min[0]+buildingBounds.max[0])/2,factoryY=(buildingBounds.min[1]+buildingBounds.max[1])/2;
 const port=axlePose(portPose),bay=axlePose(bayPose),approach={...bay,x:bay.x-10.5},centerRoad=roundedPolyline(simplify(roadPoints),24),road=rightHandLane(centerRoad,roadLaneOffsetMeters),roadStart=road.sample(0),roadEnd=road.sample(road.length);
 const west={x:factoryX-155,y:factoryY+30,z:.15,heading:Math.PI};
 const portExit=advance(port,30),portEntry=advance(port,-120);
 const portDeparture=join(line(port,portExit),connector(portExit,roadStart,boxes));
 const throughY=factoryY-68,dispatchApproach=bay.x>factoryX&&Math.abs(bay.y-throughY)>.01;
 let apronArrival;
 if(dispatchApproach){const probe=eastboundLaneChange({x:0,y:throughY,z:.15,heading:Math.PI/2},approach.y),shift=probe.sample(probe.length).x,mergeEnd={...bay,x:bay.x-52},mergeStart={x:mergeEnd.x-shift,y:throughY,z:.15,heading:Math.PI/2};apronArrival=join(roundedPolyline([[west.x,west.y],[west.x,throughY],[mergeStart.x,throughY]],24),eastboundLaneChange(mergeStart,approach.y),line(mergeEnd,approach));}
 else apronArrival=roundedPolyline([[west.x,west.y],[west.x,bay.y],[approach.x,approach.y]],24);
 const incoming=join(portDeparture,road,connector(roadEnd,west,boxes),apronArrival);
 const arrival=line(approach,bay);
 const east={x:factoryX+134,y:factoryY+100,z:.15,heading:0};
 const departureMerge=eastboundLaneChange(bay,Math.min(bay.y,throughY)),departureStart=departureMerge.length?departureMerge.sample(departureMerge.length):bay;
 const exit=join(departureMerge,roundedPolyline([[departureStart.x,departureStart.y],[east.x,departureStart.y],[east.x,east.y]],24)),reverseRoad=rightHandLane(roundedPolyline([...simplify(roadPoints)].reverse(),24),roadLaneOffsetMeters),reverseStart=reverseRoad.sample(0),reverseEnd=reverseRoad.sample(reverseRoad.length);
 const factoryDeparture=join(exit,connector(east,reverseStart,boxes));
 const returning=join(factoryDeparture,reverseRoad,connector(reverseEnd,portEntry,boxes),line(portEntry,port));
 const full=join(incoming,arrival,returning),sampleRoot=p=>rootPose(full.sample(p*full.length));
 // One warm-up circuit determines the unique stable periodic trailer yaw. The actual
 // circuit starts with this value; it is never independently reset for a phase.
 const initialTrailerHeading=buildTrailerTrack(sampleRoot,full.length,{initialHeading:portPose.heading,stepMeters:.2}).endHeading;
 const track=buildTrailerTrack(sampleRoot,full.length,{initialHeading:initialTrailerHeading,stepMeters:.2});
 const start=track.sample(0,sampleRoot(0)),end=track.sample(1,sampleRoot(1));
 const dockMeters=incoming.length+arrival.length,dockTrailerTravel=track.sample(dockMeters/full.length,sampleRoot(dockMeters/full.length)).trailerTravel;
 const roadSpans=Object.freeze({outbound:Object.freeze([portDeparture.length,portDeparture.length+road.length]),return:Object.freeze([dockMeters+factoryDeparture.length,dockMeters+factoryDeparture.length+reverseRoad.length])});
 const spans={'ordinary-circuit':[0,full.length],'cargo-road-outbound':roadSpans.outbound,'cargo-road-return':roadSpans.return,'cargo-circuit':[0,full.length],'cargo-port':[0,0],'cargo-outbound':[0,incoming.length],'cargo-arrival':[incoming.length,dockMeters],'cargo-bay':[dockMeters,dockMeters],'cargo-return':[dockMeters,full.length],
  'cargo-dispatch-bay':[dockMeters,dockMeters],'cargo-dispatch-outbound':[dockMeters,full.length],'cargo-dispatch-return':[full.length,full.length+dockMeters]};
 const cycleTravel={tractor:full.length,trailer:end.trailerTravel};
 function sample(routeId,progress=0,cycleIndex=0){const span=spans[routeId];if(!span)return null;const meters=routeId==='ordinary-circuit'?ordinaryDistanceAtSeconds(clamp(progress)*128,dockMeters,full.length):span[0]+(span[1]-span[0])*(routeId==='cargo-circuit'?trafficCircuitProgress(progress):cargoRoadProgress(routeId,progress)),lap=meters>full.length?1:0,p=(meters-lap*full.length)/full.length,result=track.sample(p,sampleRoot(p)),cycle=Math.max(0,Number.isFinite(cycleIndex)?Math.floor(cycleIndex):0),dispatch=routeId.startsWith('cargo-dispatch-');result.tractor.heading=wrap(result.tractor.heading);result.trailer.heading=wrap(result.trailer.heading);result.tractorTravel=meters-(dispatch?dockMeters:0)+cycle*cycleTravel.tractor;result.trailerTravel+=(lap+cycle)*cycleTravel.trailer-(dispatch?dockTrailerTravel:0);result.presentationDistanceMeters=result.tractorTravel;return result;}
 function points(routeId,stepMeters=4){const span=spans[routeId];if(!span)return null;const n=Math.max(1,Math.ceil((span[1]-span[0])/stepMeters));return Array.from({length:n+1},(_,i)=>{const p=sample(routeId,i/n).tractor;return[p.x,p.y,p.z];});}
 const baySample=sample('cargo-bay'),approachSample=sample('cargo-arrival',0);
 let early=24,late=64;for(let i=0;i<40;i++){const t=(early+late)/2;if(ordinaryDistanceAtSeconds(t,dockMeters,full.length)<dockMeters-10.5)early=t;else late=t;}const ordinaryTimetable=Object.freeze({cycleSeconds:128,leaderDelaySeconds:5,approachLocalSeconds:(early+late)/2,stopLocalSeconds:64});
 return Object.freeze({sample,points,ordinaryTimetable,roadLaneOffsetMeters,publicRoadSpans:Object.freeze(roadSpans),sampleCount:track.sampleCount,storageBytes:track.storageBytes,bayPose:Object.freeze(baySample.tractor),baySample:Object.freeze(baySample),approachPose:Object.freeze(approachSample.tractor),portSample:Object.freeze(sample('cargo-port')),cycleTravel:Object.freeze(cycleTravel),length:full.length,phaseDistances:Object.freeze(Object.fromEntries(Object.entries(spans).map(([id,[a,b]])=>[id,b-a]))),periodicYawError:Math.abs(wrap(end.trailer.heading-start.trailer.heading)),checkClearance({stepMeters=.25,trailerStyle='flatbed'}={}){const failures=[];for(let d=0;d<=full.length;d+=stepMeters){const p=d/full.length,state=track.sample(p,sampleRoot(p)),parts=preparedFootprints(state,trailerStyle);for(let i=0;i<boxes.length;i++)if(footprintsIntersect(parts,boxes[i]))failures.push({meters:d,obstacle:i,obstacleId:boxes[i].id,tractor:state.tractor,trailer:state.trailer});if(failures.length>=20)break;}return failures;}});
}
