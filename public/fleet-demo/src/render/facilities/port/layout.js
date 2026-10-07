/** Pure schematic placement against mapped public geometry. All distances are meters. */
export const PORT_LAYOUT_LIMITS = Object.freeze({ maxRows: 80, maxCranes: 9, laneClearanceMeters: 12, boundaryClearanceMeters: 8, rowWidth: 56, rowDepth: 12 });
const EPS = 1e-7;
const cross = (a,b,c) => (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const between = (x,a,b) => x >= Math.min(a,b)-EPS && x <= Math.max(a,b)+EPS;
const onSegment = (p,a,b) => Math.abs(cross(a,b,p)) < EPS && between(p[0],a[0],b[0]) && between(p[1],a[1],b[1]);
export function segmentsIntersect(a,b,c,d) {
  const x=cross(a,b,c),y=cross(a,b,d),z=cross(c,d,a),w=cross(c,d,b);
  return ((x>EPS&&y<-EPS)||(x<-EPS&&y>EPS))&&((z>EPS&&w<-EPS)||(z<-EPS&&w>EPS)) || onSegment(c,a,b)||onSegment(d,a,b)||onSegment(a,c,d)||onSegment(b,c,d);
}
export function pointSegmentDistance(p,a,b) {
  const dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;
  const t=length?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length)):0;
  return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);
}
export function segmentDistance(a,b,c,d) {
  return segmentsIntersect(a,b,c,d)?0:Math.min(pointSegmentDistance(a,c,d),pointSegmentDistance(b,c,d),pointSegmentDistance(c,a,b),pointSegmentDistance(d,a,b));
}
export function pointInPolygon(p,ring) {
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[i],b=ring[j];if(onSegment(p,a,b))return true;
    if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
}
const edges = points => points.map((p,i)=>[p,points[(i+1)%points.length]]);
export function footprintClearance(corners,segments) {
  let distance=Infinity;
  for(const [a,b] of segments){
    if(pointInPolygon(a,corners)||pointInPolygon(b,corners))return 0;
    for(const [c,d]of edges(corners))distance=Math.min(distance,segmentDistance(a,b,c,d));
  }
  return distance;
}
function freeze(value) { if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value; }
const validPoint = p => Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1]);
function normalize(geography) {
  if(!geography||!Array.isArray(geography.footprintLocal)||geography.footprintLocal.length<4||!geography.footprintLocal.every(validPoint))throw new TypeError('Mapped port footprint is required');
  if(!Array.isArray(geography.quayLocal)||geography.quayLocal.length<2||!geography.quayLocal.every(validPoint))throw new TypeError('Mapped quay points are required');
  if(!Array.isArray(geography.yardLanes)||!geography.yardLanes.length||!geography.yardLanes.every(l=>Array.isArray(l.points)&&l.points.length>=2&&l.points.every(validPoint)))throw new TypeError('Mapped yard-lane polylines are required');
  const origin=geography.quayLocal[0].slice(0,2),end=geography.quayLocal.at(-1),length=Math.hypot(end[0]-origin[0],end[1]-origin[1]);
  if(length<1)throw new TypeError('Mapped quay must have positive length');
  const along=geography.quayAlongUnit?.slice(0,2)||[(end[0]-origin[0])/length,(end[1]-origin[1])/length];
  const landward=geography.quayLandwardUnit?.slice(0,2)||[-along[1],along[0]];
  if(!validPoint(along)||!validPoint(landward)||Math.abs(Math.hypot(...along)-1)>.001||Math.abs(Math.hypot(...landward)-1)>.001||Math.abs(along[0]*landward[0]+along[1]*landward[1])>.001)throw new TypeError('Quay basis must be orthonormal');
  const footprint=geography.footprintLocal.map(p=>p.slice(0,2));
  if(Math.hypot(footprint[0][0]-footprint.at(-1)[0],footprint[0][1]-footprint.at(-1)[1])<EPS)footprint.pop();
  const lanes=geography.yardLanes.map(l=>({id:String(l.id),points:l.points.map(p=>p.slice(0,2))}));
  return {origin,along,landward,length,footprint,quay:geography.quayLocal.map(p=>p.slice(0,2)),lanes};
}

export function createPortLayout(geography) {
  const {origin,along,landward,length,footprint,quay,lanes}=normalize(geography),limits=PORT_LAYOUT_LIMITS;
  const toXY=(u,v)=>[origin[0]+along[0]*u+landward[0]*v,origin[1]+along[1]*u+landward[1]*v];
  const toUV=p=>[(p[0]-origin[0])*along[0]+(p[1]-origin[1])*along[1],(p[0]-origin[0])*landward[0]+(p[1]-origin[1])*landward[1]];
  const boundary=edges(footprint),laneSegments=lanes.flatMap(l=>l.points.slice(1).map((p,i)=>[l.points[i],p]));
  const rectangle=(u,v,width,depth)=>[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>toXY(u+x*width/2,v+y*depth/2));
  const safe=corners=>corners.every(p=>pointInPolygon(p,footprint))&&footprintClearance(corners,boundary)>=limits.boundaryClearanceMeters&&footprintClearance(corners,laneSegments)>=limits.laneClearanceMeters;
  const uv=footprint.map(toUV),uMin=Math.min(...uv.map(p=>p[0])),uMax=Math.max(...uv.map(p=>p[0])),vMax=Math.max(...uv.map(p=>p[1]));
  const candidates=[];
  // This lattice places representative stacks only. It never draws invented roads.
  for(let v=115;v<vMax-20;v+=34)for(let u=uMin+45;u<uMax-40;u+=70){
    const corners=rectangle(u,v,limits.rowWidth,limits.rowDepth);
    if(safe(corners))candidates.push({center:toXY(u,v),corners,width:limits.rowWidth,depth:limits.rowDepth});
  }
  // Sample across the entire admitted yard, instead of filling one small corner.
  const count=Math.min(limits.maxRows,candidates.length);
  const rows=Array.from({length:count},(_,i)=>({id:`representative-row-${i+1}`, ...candidates[Math.floor(i*candidates.length/count)], layers:2+i%2}));
  const cranes=[];
  for(let i=0;i<limits.maxCranes;i++){
    const u=(i+.5)*length/limits.maxCranes,v=24,corners=rectangle(u,v,24,30);
    // Crane feet stay landward; only elevated booms may reach over water.
    if(safe(corners))cranes.push({id:`schematic-gantry-${i+1}`,center:toXY(u,v),corners,width:24,depth:30,height:42,boomSeawardMeters:64});
  }
  const bounds={min:[Math.min(...footprint.map(p=>p[0])),Math.min(...footprint.map(p=>p[1])),0],max:[Math.max(...footprint.map(p=>p[0])),Math.max(...footprint.map(p=>p[1])),50]};
  return freeze({limits,footprint,quay,yardLanes:lanes,origin,along,landward,quayLengthMeters:length,rotationZ:Math.atan2(along[1],along[0]),rows,cranes,bounds,
    approximation:'Mapped public footprint with representative stacks and cranes; not a survey, operating inventory or capacity estimate.'});
}
