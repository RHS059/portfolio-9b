import {viewportZoom} from '../camera/controller.js';
import {createSvgMap} from '../map/svg-map.js';
import {SITES,ROUTES,toLngLat} from '../map/world.js';
const NS='http://www.w3.org/2000/svg';
const el=(name,attrs={})=>{const n=document.createElementNS(NS,name);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
const world=(lng,lat,z)=>{const size=256*2**z,s=Math.sin(lat*Math.PI/180);return{x:(lng+180)/360*size,y:(.5-Math.log((1+s)/(1-s))/(4*Math.PI))*size};};
/** Same OpenFreeMap vector CDN as Grid Command, drawn with SVG without WebGL. */
export function createFallback({container,onSelect}){
  const svg=el('svg',{role:'group','aria-label':'Oakland fleet map, 2D fallback'});Object.assign(svg.style,{position:'absolute',inset:'0',width:'100%',height:'100%',background:'#e9ebe6',touchAction:'none'});container.append(svg);
  const tiles=el('g');const tileMap=createSvgMap(tiles);const routes=el('g'),sites=el('g'),vehicles=el('g');svg.append(tiles,routes,sites,vehicles);
  const allPoints=Object.values(ROUTES).flat().map(toLngLat);const minLng=Math.min(...allPoints.map(p=>p[0])),maxLng=Math.max(...allPoints.map(p=>p[0])),minLat=Math.min(...allPoints.map(p=>p[1])),maxLat=Math.max(...allPoints.map(p=>p[1]));let width=1,height=1,zoom=14,center=[(minLng+maxLng)/2,(minLat+maxLat)/2],visible=true,disposed=false,tileKey='',last=[],fitted=false;
  let pan={x:0,y:0};let pointer=null;
  function reset(){center=[(minLng+maxLng)/2,(minLat+maxLat)/2];const a=world(minLng,minLat,0),b=world(maxLng,maxLat,0);zoom=Math.max(12,Math.min(16,Math.floor(Math.log2(Math.min(Math.max(1,width-100)/Math.abs(b.x-a.x),Math.max(1,height-150)/Math.abs(b.y-a.y))))));pan={x:0,y:0};redraw();}
  function projectPoint(lnglat){const p=world(...lnglat,zoom),c=world(...center,zoom);return{x:p.x-c.x+width/2+pan.x,y:p.y-c.y+height/2+pan.y};}
  function project(v){return projectPoint(toLngLat([v.x,v.y]));}
  function redraw(){if(disposed||!visible)return;
    const c=world(...center,zoom),left=c.x-width/2-pan.x,top=c.y-height/2-pan.y;
    tileMap.update({left,top,width,height,zoom});
    routes.replaceChildren();for(const id of ['port-to-factory','factory-to-depot']){const points=ROUTES[id].map(p=>{const q=project({x:p[0],y:p[1]});return`${q.x},${q.y}`;}).join(' ');routes.append(el('polyline',{points,fill:'none',stroke:'#e3e9df','stroke-width':8}),el('polyline',{points,fill:'none',stroke:'#697d6d','stroke-width':1.5,'stroke-dasharray':id.includes('depot')?'5 4':'none'}));}
    sites.replaceChildren();for(const site of SITES){const p=project(site),group=el('g',{'data-id':site.id});const meters=2**zoom*256/(40075016*Math.cos(center[1]*Math.PI/180));const w=site.width*meters,h=site.depth*meters;
      group.append(el('rect',{x:p.x-w/2,y:p.y-h/2,width:w,height:h,fill:'#f8f8f3',stroke:'#505c53','stroke-width':1.2}));
      // Abstract loading/service zones, intentionally distinct from an as-built footprint.
      for(let i=0;i<4;i++)group.append(el('rect',{x:p.x-w/2+5+i*(w-10)/4,y:p.y-h/2+5,width:Math.max(2,(w-20)/4),height:Math.max(2,h-10),fill:i%2?'#eef0e8':'#e2e5dd',stroke:'#a3aaa1','stroke-width':.6}));
      sites.append(group);
    }
    drawVehicles(last);
  }
  function drawVehicles(list){last=list;vehicles.replaceChildren();for(const v of list){const p=project(v),g=el('g',{transform:`translate(${p.x},${p.y}) rotate(${v.heading*180/Math.PI})`,'data-entity-id':v.id,role:v.inspectable===false?'img':'button',tabindex:v.inspectable===false?'-1':'0','aria-label':`${v.id}: ${v.status}`});g.style.cursor=v.inspectable===false?'default':'pointer';g.append(el('rect',{x:-7,y:-13,width:14,height:26,rx:1,fill:v.selected?'#d3e5d5':'#fbfbf6',stroke:v.selected?'#376c56':'#303735','stroke-width':v.selected?2.5:1.5}),el('path',{d:'M -5 -6 L 0 -11 L 5 -6',fill:'none',stroke:'#303735','stroke-width':1.3}));const select=()=>{if(v.inspectable!==false)onSelect(v.id);};g.addEventListener('click',select);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select();}});vehicles.append(g);}}
  const down=e=>{if(e.target.closest?.('[data-entity-id]'))return;pointer={x:e.clientX,y:e.clientY,px:pan.x,py:pan.y};svg.setPointerCapture(e.pointerId);};
  const move=e=>{if(!pointer)return;pan={x:pointer.px+e.clientX-pointer.x,y:pointer.py+e.clientY-pointer.y};redraw();};
  const up=()=>{pointer=null;};
  const wheel=e=>{e.preventDefault();zoom=Math.min(18,Math.max(12,zoom+(e.deltaY<0?1:-1)));pan={x:0,y:0};redraw();};
  svg.addEventListener('pointerdown',down);svg.addEventListener('pointermove',move);svg.addEventListener('pointerup',up);svg.addEventListener('wheel',wheel,{passive:false});
  return {project,update:drawVehicles,resize(w,h){width=w;height=h;if(!fitted&&w>50&&h>50){const a=world(minLng,minLat,0),b=world(maxLng,maxLat,0);zoom=Math.max(12,Math.min(16,Math.floor(Math.log2(Math.min((w-100)/Math.abs(b.x-a.x),(h-150)/Math.abs(b.y-a.y))))));fitted=true;}svg.setAttribute('viewBox',`0 0 ${w} ${h}`);redraw();},setVisible(value){visible=value;svg.style.display=value?'':'none';if(value)redraw();},setFocus(id,zoomTo=false){if(!id){reset();return;}const s=SITES.find(s=>s.id===id)||last.find(v=>v.id===id);if(s){if(zoomTo)zoom=viewportZoom(s.focusZoom||17,width,height);center=toLngLat([s.x,s.y]);pan={x:0,y:0};redraw();}},dispose(){disposed=true;tileMap.dispose();svg.remove();},getMetrics(){return{renderer:'SVG + OpenFreeMap vectors (no WebGL)',zoom,...tileMap.getMetrics()};}};
}
