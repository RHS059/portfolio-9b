// Independent planar checks for approximate mapped context, not surveying/navigation.
export const EPSILON = 1e-6;
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
export const edges=ring=>ring.map((p,i)=>[p,ring[(i+1)%ring.length]]).filter(([a,b])=>Math.hypot(a[0]-b[0],a[1]-b[1])>EPSILON);
export function pointSegmentDistance(p,a,b){
  const v=sub(b,a),w=sub(p,a),lengthSquared=dot(v,v);
  if(!lengthSquared)return Math.hypot(...w);
  const t=Math.max(0,Math.min(1,dot(w,v)/lengthSquared));
  return Math.hypot(p[0]-a[0]-t*v[0],p[1]-a[1]-t*v[1]);
}
export function intersects(a,b,c,d){
  const ab=sub(b,a),cd=sub(d,c);
  const o1=cross(ab,sub(c,a)),o2=cross(ab,sub(d,a)),o3=cross(cd,sub(a,c)),o4=cross(cd,sub(b,c));
  if(((o1>EPSILON&&o2<-EPSILON)||(o1<-EPSILON&&o2>EPSILON))&&((o3>EPSILON&&o4<-EPSILON)||(o3<-EPSILON&&o4>EPSILON)))return true;
  return pointSegmentDistance(a,c,d)<EPSILON||pointSegmentDistance(b,c,d)<EPSILON||pointSegmentDistance(c,a,b)<EPSILON||pointSegmentDistance(d,a,b)<EPSILON;
}
export function segmentDistance(a,b,c,d){
  return intersects(a,b,c,d)?0:Math.min(pointSegmentDistance(a,c,d),pointSegmentDistance(b,c,d),pointSegmentDistance(c,a,b),pointSegmentDistance(d,a,b));
}
export function pointInRing(point,ring){
  if(edges(ring).some(([a,b])=>pointSegmentDistance(point,a,b)<EPSILON))return true;
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[i],b=ring[j];
    if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
}
export function polygonBoundaryDistance(footprint,boundary){
  if(!footprint.every(p=>pointInRing(p,boundary)))return -1;
  let distance=Infinity;
  for(const[a,b]of edges(footprint))for(const[c,d]of edges(boundary))distance=Math.min(distance,segmentDistance(a,b,c,d));
  return distance;
}
export function laneFootprintDistance(points,footprint){
  if(points.some(p=>pointInRing(p,footprint)))return 0;
  let distance=Infinity;
  for(let i=1;i<points.length;i++)for(const[a,b]of edges(footprint))distance=Math.min(distance,segmentDistance(points[i-1],points[i],a,b));
  return distance;
}
export function polygonArea(ring){
  return Math.abs(edges(ring).reduce((sum,[a,b])=>sum+cross(a,b),0))/2;
}
