import {editorialMapStyle,MAP_ATTRIBUTION} from '../map/style.js';
import {ORIGIN,SITES,toLngLat,routeGeoJSON} from '../map/world.js';
import {SnapshotBuffer,FrameMetrics} from './snapshot.js';
import {EntityRegistry,pickNearest,cullProjected} from '../picking/selection.js';
import {createCameraController,VIEW_PRESETS} from '../camera/controller.js';
import {createVehicleLayer} from './vehicle-layer.js';
import {createFallback} from './fallback.js';
const css=`.fleet-scene-root{position:absolute;inset:0;overflow:hidden;background:#eef0e9}.fleet-map-host{position:absolute;inset:0}.fleet-scene-labels{position:absolute;inset:0;pointer-events:none;overflow:hidden}.fleet-scene-label{position:absolute;transform:translate(-50%,-100%);padding:5px 8px;border:1px solid #8c978d;background:rgba(250,251,246,.96);color:#273b2d;font:10px ui-monospace,monospace;max-width:190px;white-space:nowrap;pointer-events:auto;cursor:pointer;box-shadow:none}.fleet-scene-label small{display:block;font-size:8px;color:#626e64;margin-top:2px}.fleet-scene-label[data-selected=true]{border:2px solid #376c56;font-weight:700}.fleet-scene-status{position:absolute;left:12px;bottom:28px;max-width:calc(100% - 24px);padding:6px 9px;background:#f7f8f1eF;border:1px solid #bdc4b9;font:10px ui-monospace,monospace;color:#475548;pointer-events:none}.fleet-scene-credit{position:absolute;right:3px;bottom:3px;background:#ffffffe8;padding:2px 4px;font:9px sans-serif}.fleet-scene-credit a{color:#455448}`;
const featureCollection=vehicles=>({type:'FeatureCollection',features:vehicles.map(v=>({type:'Feature',id:v.id,properties:{id:v.id},geometry:{type:'Point',coordinates:toLngLat([v.x,v.y])}}))});
/** Read-only snapshot consumer. All movement, selection and performance are presentation state. */
export function createFleetScene({container,onSelect=()=>{},onStatus=()=>{}}){
  if(!container)throw new Error('Fleet scene requires a container');
  const root=document.createElement('div');root.className='fleet-scene-root';const style=document.createElement('style');style.textContent=css;
  const host=document.createElement('div');host.className='fleet-map-host';const overlay=document.createElement('div');overlay.className='fleet-scene-labels';
  const status=document.createElement('div');status.className='fleet-scene-status';status.setAttribute('role','status');
  const credit=document.createElement('div');credit.className='fleet-scene-credit';credit.innerHTML=MAP_ATTRIBUTION;
  root.append(style,host);container.append(root);
  const buffer=new SnapshotBuffer(),registry=new EntityRegistry(),metrics=new FrameMetrics();let map=null,layer=null,disposed=false,raf=0,mode='iso',fallbackActive=true,follow=false,selected=null,frameVehicles=[],visibleVehicles=[],width=1,height=1,sourceUpdated=0,contextLost=false;
  const labels=new Map();const fallback=createFallback({container:root,onSelect});root.append(overlay,status,credit);
  const camera=createCameraController(()=>map);
  const report=(kind,message)=>{status.textContent=message;onStatus({kind,message});};
  function showFallback(message){if(disposed)return;fallbackActive=true;fallback.setVisible(true);host.style.visibility='hidden';report('fallback',message);}
  function showMap(){if(disposed)return;fallbackActive=false;fallback.setVisible(false);host.style.visibility='visible';report('ready','Oakland map · routes / service consequences are illustrative');}
  function project(v){if(fallbackActive)return fallback.project(v);try{return map.project(toLngLat([v.x,v.y]));}catch{return null;}}
  function label(id,title,caption,point,isSelected=false){let node=labels.get(id);if(!node){node=document.createElement('button');node.type='button';node.className='fleet-scene-label';node.addEventListener('click',()=>onSelect(id));node.append(document.createElement('span'),document.createElement('small'));labels.set(id,node);overlay.append(node);}node.firstChild.textContent=title;node.lastChild.textContent=caption;node.dataset.selected=String(isSelected);const p=project(point);const show=p&&p.x>-100&&p.x<width+100&&p.y>0&&p.y<height+100;node.hidden=!show;if(show){node.style.left=`${p.x}px`;node.style.top=`${p.y-18}px`;}}
  function drawLabels(){const currentIds=new Set(SITES.map(s=>s.id));for(const s of SITES){const count=s.id==='depot'?frameVehicles.filter(v=>/^(workshop|in-service|maintenance|in-bay)$/i.test(v.status)).length:0;label(s.id,s.label,s.id==='depot'?`${count} / 2 service bays occupied · reconstruction`:s.caption,s,selected===s.id);}for(const v of frameVehicles){if(v.id!==selected&&!['TRK-104','TRK-208'].includes(v.id))continue;currentIds.add(v.id);label(v.id,v.id,v.status,v,v.id===selected);}for(const[id,node]of labels)if(!currentIds.has(id)){node.remove();labels.delete(id);}}
  function resize(){if(disposed)return;const rect=container.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);fallback.resize(width,height);map?.resize();drawLabels();}
  function tick(now){if(disposed)return;metrics.frame(now);frameVehicles=buffer.sample(now).map(v=>({...v,selected:v.id===selected}));registry.sync(frameVehicles);registry.select(selected);visibleVehicles=cullProjected(frameVehicles,project,width,height);camera.update(frameVehicles,now);if(fallbackActive){if(follow&&selected)fallback.setFocus(selected);fallback.update(visibleVehicles);}else if(map?.isStyleLoaded()){
      if(now-sourceUpdated>80){map.getSource('fleet-vehicles')?.setData(featureCollection(frameVehicles));sourceUpdated=now;}
      layer?.setFacilitySnapshot(buffer.current);map.triggerRepaint();
    }drawLabels();raf=requestAnimationFrame(tick);}
  function startMap(){const M=globalThis.maplibregl,T=globalThis.THREE;if(!M||!T){showFallback('2D Oakland map · WebGL libraries unavailable · source controls remain live');return;}
    try{const test=document.createElement('canvas');const gl=test.getContext('webgl2')||test.getContext('webgl');if(!gl){showFallback('2D Oakland map · WebGL unavailable · source controls remain live');return;}gl.getExtension('WEBGL_lose_context')?.loseContext();
      map=new M.Map({container:host,center:toLngLat([-200,280]),zoom:15.5,...VIEW_PRESETS.iso,antialias:true,attributionControl:false,style:editorialMapStyle()});
      map.on('load',()=>{if(disposed)return;const coordinates=routeGeoJSON().features.flatMap(f=>f.geometry.coordinates);const bounds=coordinates.reduce((b,p)=>b.extend(p),new M.LngLatBounds(coordinates[0],coordinates[0]));map.fitBounds(bounds,{padding:{top:80,bottom:80,left:65,right:65},maxZoom:15.2,duration:0});map.addSource('fleet-routes',{type:'geojson',data:routeGeoJSON()});map.addLayer({id:'fleet-routes',type:'line',source:'fleet-routes',paint:{'line-color':'#657d69','line-width':2,'line-opacity':.65,'line-dasharray':[3,2]}});
        map.addSource('fleet-vehicles',{type:'geojson',data:featureCollection(frameVehicles)});map.addLayer({id:'fleet-vehicles-flat',type:'circle',source:'fleet-vehicles',paint:{'circle-radius':6,'circle-color':'#f6f8f2','circle-stroke-width':2,'circle-stroke-color':'#376c56'},layout:{visibility:mode==='2d'?'visible':'none'}});
        layer=createVehicleLayer({THREE:T,maplibregl:M,getVehicles:()=>visibleVehicles,getSelected:()=>selected,getView:()=>mode,onFailure:onStatus});map.addLayer(layer);camera.setView(mode);showMap();
      });
      map.on('click',e=>{const id=pickNearest(e.point,frameVehicles,project,28);if(id)onSelect(id);});
      map.on('error',e=>{if(disposed)return;if(!map.isStyleLoaded())showFallback('2D Oakland map · 3D map could not load · source controls remain live');else onStatus({kind:'map-warning',message:'Some map tiles could not load; reconstruction and controls remain live.'});});
      map.getCanvas().addEventListener('webglcontextlost',onLost);map.getCanvas().addEventListener('webglcontextrestored',onRestored);
    }catch(error){map?.remove();map=null;showFallback('2D Oakland map · 3D initialization unavailable · source controls remain live');}
  }
  function onLost(e){e.preventDefault();contextLost=true;showFallback('2D Oakland map · graphics context lost · simulation preserved');}
  function onRestored(){contextLost=false;metrics.reset();if(map?.isStyleLoaded())showMap();}
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;observer?.observe(container);window.addEventListener('resize',resize);
  resize();report('loading','Loading Oakland map · illustrative service reconstruction');startMap();raf=requestAnimationFrame(tick);
  return {
    update(snapshot){if(disposed)return;buffer.update(snapshot,performance.now());selected=buffer.current.selectedId;},
    setView(next){if(!VIEW_PRESETS[next]||disposed)return;mode=next;camera.setView(next);if(map?.getLayer('fleet-vehicles-flat'))map.setLayoutProperty('fleet-vehicles-flat','visibility',next==='2d'?'visible':'none');},
    setFocus(id){if(disposed)return;selected=id;registry.select(id);camera.setFocus(id);if(fallbackActive)fallback.setFocus(id,true);},
    setFollow(value){follow=!!value;camera.setFocus(selected);camera.setFollow(value);},resize,
    getMetrics(){return{...metrics.get(),renderer:fallbackActive?'SVG/raster fallback':'MapLibre 4.7.1 + Three r128',width,height,entities:frameVehicles.length,visibleEntities:visibleVehicles.length,mode,contextLost,disposed,hardware:layer?.gpuDescription||'GPU not available / not measured',browser:globalThis.navigator?.userAgent||'unavailable'};},
    dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);observer?.disconnect();window.removeEventListener('resize',resize);if(map){map.getCanvas().removeEventListener('webglcontextlost',onLost);map.getCanvas().removeEventListener('webglcontextrestored',onRestored);map.remove();map=null;}fallback.dispose();registry.clear();labels.clear();root.remove();}
  };
}
