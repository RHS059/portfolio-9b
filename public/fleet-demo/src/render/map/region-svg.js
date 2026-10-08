import {MAP_REGION,BAYER_4,MAP_PAPER,regionCoverage} from './region.js';
const NS='http://www.w3.org/2000/svg';let nextId=0;
const make=(tag,attrs={})=>{const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
/** SVG fallback uses the same geographic Bayer mask and a real native outer clip. */
export function createSvgRegion(svg,tiles,region=MAP_REGION){
 const id=`fleet-region-svg-${++nextId}`,defs=make('defs'),mask=make('mask',{id,maskUnits:'userSpaceOnUse','mask-type':'luminance'}),clip=make('clipPath',{id:`${id}-outer`,clipPathUnits:'userSpaceOnUse'}),outer=make('circle'),inner=make('circle',{fill:'white'}),paper=make('rect',{fill:MAP_PAPER});clip.append(outer);mask.append(inner);defs.append(clip,mask);svg.append(defs);tiles.setAttribute('mask',`url(#${id})`);tiles.setAttribute('clip-path',`url(#${id}-outer)`);tiles.append(paper);
 const rings=[];
 for(let i=0;i<32;i++){const pattern=make('pattern',{id:`${id}-${i}`,patternUnits:'userSpaceOnUse'}),cells=[],coverage=regionCoverage(region.innerRadius+(i+.5)*(region.outerRadius-region.innerRadius)/32,region);for(let y=0;y<4;y++)for(let x=0;x<4;x++)if(coverage>(BAYER_4[y*4+x]+.5)/16){const cell=make('rect',{fill:'white'});pattern.append(cell);cells.push({node:cell,x,y});}const ring=make('circle',{fill:'none',stroke:`url(#${id}-${i})`});mask.append(ring);defs.append(pattern);rings.push({pattern,cells,ring});}
 return{update({center,metersPerPixel,width,height}){const scale=1/metersPerPixel,cell=region.ditherCellMeters*scale,step=(region.outerRadius-region.innerRadius)/32*scale;
  for(const node of [mask,paper])for(const[k,v]of Object.entries({x:0,y:0,width,height}))node.setAttribute(k,v);
  for(const[node,r]of [[outer,region.outerRadius],[inner,region.innerRadius]])for(const[k,v]of Object.entries({cx:center.x,cy:center.y,r:r*scale}))node.setAttribute(k,v);
  rings.forEach(({pattern,cells,ring},i)=>{for(const[k,v]of Object.entries({x:center.x,y:center.y,width:4*cell,height:4*cell}))pattern.setAttribute(k,v);for(const c of cells)for(const[k,v]of Object.entries({x:c.x*cell,y:(3-c.y)*cell,width:cell,height:cell}))c.node.setAttribute(k,v);for(const[k,v]of Object.entries({cx:center.x,cy:center.y,r:region.innerRadius*scale+(i+.5)*step,'stroke-width':step+.2}))ring.setAttribute(k,v);});
 },dispose(){defs.remove();paper.remove();}};
}
