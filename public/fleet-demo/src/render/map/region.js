import {SITES,ROUTES,toLngLat} from './world.js';
import {CARGO_LAYOUT} from './cargo-layout-data.js';
/** Fixed geographic region, in the same local-meter frame as the authored scene. */
export const MAP_PAPER='#f3f3ed';
export const BAYER_4=Object.freeze([0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5]);
const workshop=SITES.find(site=>site.id==='depot'),port=SITES.find(site=>site.id==='oict');
export function regionContentPoints(){
 const points=[...Object.values(ROUTES).flat(),...SITES.flatMap(s=>s.footprintWorld||[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>[s.x+x*s.width/2,s.y+y*s.depth/2]))];
 for(const ship of CARGO_LAYOUT.ships)for(const x of [-ship.length/2,ship.length/2])for(const y of [-ship.beam/2,ship.beam/2])points.push([port.x+ship.center[0]+x*Math.cos(ship.rotationZ)-y*Math.sin(ship.rotationZ),port.y+ship.center[1]+x*Math.sin(ship.rotationZ)+y*Math.cos(ship.rotationZ)]);
 return points;
}
const innerRadius=Math.ceil((Math.max(...regionContentPoints().map(p=>Math.hypot(p[0]-workshop.x,p[1]-workshop.y)))+120)/50)*50;
const lngLat=toLngLat([workshop.x,workshop.y]);
export const mercatorPoint=([lng,lat])=>[(lng+180)/360,(1-Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))/Math.PI)/2];
export const mercatorLngLat=([x,y])=>[x*360-180,Math.atan(Math.sinh(Math.PI*(1-2*y)))*180/Math.PI];
const centerMercator=mercatorPoint(lngLat),meterScale=1/(40075016.68557849*Math.cos(lngLat[1]*Math.PI/180));
const outerRadius=innerRadius+350,r=outerRadius*meterScale;
const sw=mercatorLngLat([centerMercator[0]-r,centerMercator[1]+r]),ne=mercatorLngLat([centerMercator[0]+r,centerMercator[1]-r]);
export const MAP_REGION=Object.freeze({centerId:'depot',center:Object.freeze([workshop.x,workshop.y]),lngLat:Object.freeze(lngLat),centerMercator:Object.freeze(centerMercator),meterScale,innerRadius,outerRadius,ditherCellMeters:7,bounds:Object.freeze([...sw,...ne])});
/** A conservative tile-circle test: intersecting edge tiles stay; entirely outside tiles never fetch. */
export function tileIntersectsRegion(z,x,y,region=MAP_REGION){
 if(!Number.isInteger(z)||z<0||z>24||!Number.isInteger(x)||!Number.isInteger(y))return false;
 const n=2**z;if(x<0||y<0||x>=n||y>=n)return false;
 const [cx,cy]=region.centerMercator,r=region.outerRadius*region.meterScale;
 const dx=Math.max(x/n-cx,0,cx-(x+1)/n),dy=Math.max(y/n-cy,0,cy-(y+1)/n);
 return dx*dx+dy*dy<=r*r;
}
export function regionCoverage(distance,region=MAP_REGION){const t=Math.max(0,Math.min(1,(distance-region.innerRadius)/(region.outerRadius-region.innerRadius)));return 1-t*t*(3-2*t);}
export function bayerKeep(x,y,region=MAP_REGION){const dx=x-region.center[0],dy=y-region.center[1],cell=region.ditherCellMeters,ix=((Math.floor(dx/cell)%4)+4)%4,iy=((Math.floor(dy/cell)%4)+4)%4;return regionCoverage(Math.hypot(dx,dy),region)>(BAYER_4[iy*4+ix]+.5)/16;}
