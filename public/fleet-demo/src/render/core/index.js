import {editorialMapStyle,MAP_ATTRIBUTION} from '../map/style.js';
import {ORIGIN,SITES,toLngLat,routeGeoJSON,overviewLngLats} from '../map/world.js';
import {SnapshotBuffer,FrameMetrics} from './snapshot.js';
import {EntityRegistry,InspectionSelection,pickNearest,cullProjected} from '../picking/selection.js';
import {createCameraController,VIEW_PRESETS,motionDuration,captureMapView,occupiedTopClearance} from '../camera/controller.js';
import {createVehicleLayer} from './vehicle-layer.js';
import {createFallback} from './fallback.js';
import {MapStartupDiagnostics} from './map-startup.js';
const css=`.fleet-scene-root{position:absolute;inset:0;overflow:hidden;background:#eef0e9}.fleet-map-host{position:absolute;inset:0}.fleet-scene-labels{position:absolute;inset:0;pointer-events:none;overflow:hidden}.fleet-scene-label{position:absolute;transform:translate(-50%,-100%);padding:5px 8px;border:1px solid #8c978d;background:rgba(250,251,246,.96);color:#273b2d;font:10px ui-monospace,monospace;max-width:190px;white-space:nowrap;pointer-events:auto;cursor:pointer;box-shadow:none}.fleet-scene-label small{display:block;font-size:9px;color:#626e64;margin-top:2px;white-space:normal;max-width:174px;line-height:1.25}.fleet-scene-label small[hidden]{display:none}.fleet-scene-label[data-selected=true]{border:2px solid #376c56;font-weight:700;font-size:12px}.fleet-scene-status{position:absolute;left:12px;bottom:28px;max-width:calc(100% - 24px);padding:6px 9px;background:#f7f8f1eF;border:1px solid #bdc4b9;font:10px ui-monospace,monospace;color:#475548;pointer-events:none}.fleet-scene-credit{position:absolute;right:3px;bottom:3px;background:#ffffffe8;padding:2px 4px;font:9px sans-serif}.fleet-scene-credit a{color:#455448}`;
const featureCollection=vehicles=>({type:'FeatureCollection',features:vehicles.map(v=>({type:'Feature',id:v.id,properties:{id:v.id},geometry:{type:'Point',coordinates:toLngLat([v.x,v.y])}}))});
/** Read-only snapshot consumer. All movement, selection and performance are presentation state. */
export function createFleetScene({container,onSelect=()=>{},onStatus=()=>{}}){
  if(!container)throw new Error('Fleet scene requires a container');
  const root=document.createElement('div');root.className='fleet-scene-root';const style=document.createElement('style');style.textContent=css;
  const host=document.createElement('div');host.className='fleet-map-host';const overlay=document.createElement('div');overlay.className='fleet-scene-labels';
  const status=document.createElement('div');status.className='fleet-scene-status';status.setAttribute('role','status');
  const credit=document.createElement('div');credit.className='fleet-scene-credit';credit.innerHTML=MAP_ATTRIBUTION;
  let overlayGeneration=0;const makeCanvas=()=>{const element=document.createElement('canvas');element.setAttribute('data-fleet-generation',String(++overlayGeneration));element.className='fleet-three-overlay';Object.assign(element.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none'});return element;};root.append(style,host);let canvas=makeCanvas();root.append(canvas);container.append(root);
  const buffer=new SnapshotBuffer(),registry=new EntityRegistry(),inspection=new InspectionSelection(SITES.map(s=>s.id)),metrics=new FrameMetrics();let map=null,layer=null,disposed=false,raf=0,mode='iso',fallbackActive=true,follow=false,selected=null,frameVehicles=[],visibleVehicles=[],width=1,height=1,sourceUpdated=0,headerClearance=12,contextLost=false,mapRenderCount=0,sceneLoaded=false,initializing=true,rebuildTimer=null,loadTimer=null,mapRebuilds=0,overlayRebuilds=0,rebuildTimes=[],overlayRecoveryTimer=null,restoreFrame=0;const contextEvents={mapLost:0,overlayLost:0,restored:0,restoreCompleted:0,staleRestored:0};const contextEventHistory=[];
  const labels=new Map();let labelBoxes=[];const fallback=createFallback({container:root,onSelect});root.append(overlay,status,credit);
  const camera=createCameraController(()=>map),mapStartup=new MapStartupDiagnostics();
  const report=(kind,message)=>{status.hidden=kind==='ready';status.textContent=message;onStatus({kind,message});};
  function showFallback(message){if(disposed)return;fallbackActive=true;fallback.setVisible(true);host.style.visibility='hidden';canvas.style.visibility='hidden';report('fallback',message);}
  function showMap(){if(disposed)return;clearTimeout(loadTimer);initializing=false;contextLost=false;fallbackActive=false;fallback.setVisible(false);host.style.visibility='visible';canvas.style.visibility='visible';report('ready','');}
  function project(v){if(fallbackActive)return fallback.project(v);try{return map.project(toLngLat([v.x,v.y]));}catch{return null;}}
  function label(id,title,caption,point,isSelected=false,anchored=false){let node=labels.get(id);if(!node){node=document.createElement('button');node.type='button';node.className='fleet-scene-label';node.addEventListener('click',()=>onSelect(id));node.append(document.createElement('span'),document.createElement('small'));labels.set(id,node);overlay.append(node);}if(node.firstChild.textContent!==title)node.firstChild.textContent=title;if(node.lastChild.textContent!==caption)node.lastChild.textContent=caption;node.lastChild.hidden=!caption;node.dataset.selected=String(isSelected);const p=anchored?{x:112,y:height-58}:project(point);const show=p&&p.x>-100&&p.x<width+100&&p.y>0&&p.y<height+100;node.hidden=!show;if(show){const labelHeight=node.offsetHeight||44;let x=Math.max(100,Math.min(width-100,p.x)),y=anchored?p.y:Math.max(headerClearance+labelHeight,p.y-(SITES.some(s=>s.id===id)?24:58));for(let attempt=0;attempt<7&&labelBoxes.some(b=>Math.abs(b.x-x)<170&&Math.abs(b.y-y)<42);attempt++)y+=44;if(y>height-45)y=Math.max(45,p.y-65);labelBoxes.push({x,y});node.style.left=`${x}px`;node.style.top=`${y}px`;}}
  function drawLabels(){labelBoxes=[];const currentIds=new Set(),focusedSite=SITES.some(s=>s.id===camera.get().focus)?camera.get().focus:null;for(const s of SITES){if(width<600&&focusedSite&&s.id!==focusedSite)continue;currentIds.add(s.id);const count=s.id==='depot'?frameVehicles.filter(v=>/^(workshop|in-service|maintenance|in-bay)$/i.test(v.status)).length:0;label(s.id,s.label,s.id==='depot'?`${count} / 2 bays occupied`:s.caption,{...s,x:s.labelX??s.x,y:s.labelY??s.y},selected===s.id,focusedSite===s.id);}for(const v of frameVehicles){if(v.id!==selected&&!['TRK-104','TRK-208'].includes(v.id))continue;currentIds.add(v.id);label(v.id,v.id,v.status,v,v.id===selected);}for(const[id,node]of labels)if(!currentIds.has(id)){node.remove();labels.delete(id);}}
  function fitOverview(){if(!map)return;const M=globalThis.maplibregl,coordinates=overviewLngLats();const bounds=coordinates.reduce((b,p)=>b.extend(p),new M.LngLatBounds(coordinates[0],coordinates[0]));map.fitBounds(bounds,{padding:{top:80,bottom:80,left:65,right:65},maxZoom:15.2,duration:motionDuration(400)});}
  function onVisibility(){metrics.suspend();}
  document.addEventListener('visibilitychange',onVisibility);canvas.addEventListener('webglcontextlost',onLost);canvas.addEventListener('webglcontextrestored',onRestored);
  function resize(){if(disposed)return;const rect=container.getBoundingClientRect(),nextWidth=Math.max(1,rect.width),nextHeight=Math.max(1,rect.height),changed=nextWidth!==width||nextHeight!==height;width=nextWidth;height=nextHeight;const heading=container.parentElement?.querySelector('.world-heading');headerClearance=occupiedTopClearance(rect,heading?.getBoundingClientRect());fallback.resize(width,height);map?.resize();layer?.resize();if(changed)camera.resize();drawLabels();}
  function tick(now){if(disposed)return;if(!document.hidden)metrics.frame(now);else metrics.suspend();frameVehicles=buffer.sample(now).map(v=>({...v,selected:v.id===selected}));registry.sync(frameVehicles);registry.select(selected);visibleVehicles=cullProjected(frameVehicles,project,width,height);camera.update(frameVehicles,now);if(fallbackActive){if(follow&&selected)fallback.setFocus(selected);fallback.update(visibleVehicles);}else if(sceneLoaded){
      if(mode==='2d'&&now-sourceUpdated>100){map.getSource('fleet-vehicles')?.setData(featureCollection(frameVehicles));sourceUpdated=now;}
      layer?.setFacilitySnapshot(buffer.current);layer?.draw();
    }drawLabels();raf=requestAnimationFrame(tick);}
  function startMap(savedView=null){initializing=true;const M=globalThis.maplibregl,T=globalThis.THREE;if(!M||!T){initializing=false;showFallback('2D Oakland map · WebGL libraries unavailable · source controls remain live');return;}
    try{mapStartup.begin(performance.now());
      map=new M.Map({container:host,center:toLngLat([-200,280]),zoom:15.5,...VIEW_PRESETS[mode],...(savedView||{}),antialias:false,attributionControl:false,style:editorialMapStyle()});
      const instance=map;mapStartup.record('created',performance.now(),map);clearTimeout(loadTimer);loadTimer=setTimeout(()=>{if(!disposed&&map===instance&&!sceneLoaded){mapStartup.record('startup-timeout',performance.now(),map);destroyMap();initializing=false;showFallback('2D Oakland map · graphics startup unavailable · source controls remain live');}},15000);
      for(const eventName of ['style.load','sourcedata'])map.on(eventName,e=>{if(!disposed&&map===instance)mapStartup.record(eventName,performance.now(),map,e);});
      map.on('load',()=>{if(disposed||map!==instance)return;mapStartup.record('load',performance.now(),map);const coordinates=overviewLngLats();const bounds=coordinates.reduce((b,p)=>b.extend(p),new M.LngLatBounds(coordinates[0],coordinates[0]));if(!savedView&&!camera.get().focus)map.fitBounds(bounds,{padding:{top:80,bottom:80,left:65,right:65},maxZoom:15.2,duration:0});map.addSource('fleet-routes',{type:'geojson',data:routeGeoJSON()});map.addLayer({id:'fleet-routes',type:'line',source:'fleet-routes',paint:{'line-color':'#657d69','line-width':2,'line-opacity':.65,'line-dasharray':[3,2]}});
        map.addSource('fleet-vehicles',{type:'geojson',data:featureCollection(frameVehicles)});map.addLayer({id:'fleet-vehicles-flat',type:'circle',source:'fleet-vehicles',paint:{'circle-radius':6,'circle-color':'#f6f8f2','circle-stroke-width':2,'circle-stroke-color':'#376c56'},layout:{visibility:mode==='2d'?'visible':'none'}});
        layer=createVehicleLayer({canvas,THREE:T,maplibregl:M,getVehicles:()=>visibleVehicles,getSelected:()=>selected,getView:()=>mode,onFailure:onStatus});map.addLayer(layer);sceneLoaded=true;if(!savedView)camera.setView(mode,{focusId:camera.get().focus,animate:false});showMap();
      });
      map.on('render',()=>{if(map===instance){mapRenderCount++;mapStartup.record('render',performance.now(),map);}});map.on('movestart',e=>{if(e.originalEvent)camera.markManual();});map.on('click',e=>{const id=pickNearest(e.point,frameVehicles,project,28);if(id)onSelect(id);});
      map.on('error',e=>{if(disposed||map!==instance)return;mapStartup.record('error',performance.now(),map,e);onStatus({kind:'map-warning',message:'Some map tiles could not load. Controls remain available.'});});
      map.getCanvas().addEventListener('webglcontextlost',onLost);map.getCanvas().addEventListener('webglcontextrestored',onRestored);
    }catch(error){mapStartup.record('constructor-error',performance.now(),map,{error});destroyMap();initializing=false;showFallback('2D Oakland map · 3D initialization unavailable · source controls remain live');}
  }
  function destroyMap(){
    clearTimeout(loadTimer);clearTimeout(overlayRecoveryTimer);cancelAnimationFrame(restoreFrame);canvas.removeEventListener('webglcontextlost',onLost);canvas.removeEventListener('webglcontextrestored',onRestored);
    // MapLibre 4.7.1 map.remove() does not invoke custom-layer onRemove.
    layer?.onRemove?.();
    if(map){const old=map;old.getCanvas().removeEventListener('webglcontextlost',onLost);old.getCanvas().removeEventListener('webglcontextrestored',onRestored);map=null;old.remove();}
    layer=null;sceneLoaded=false;
  }
  function rebuildMap(savedView){
    if(disposed)return;destroyMap();const previous=canvas;canvas=makeCanvas();canvas.style.visibility='hidden';canvas.style.display=mode==='2d'?'none':'';root.insertBefore(canvas,overlay);previous.remove();canvas.addEventListener('webglcontextlost',onLost);canvas.addEventListener('webglcontextrestored',onRestored);mapRebuilds++;metrics.suspend();startMap(savedView);
  }
  function rebuildOverlay(reuseRestoredCanvas=false){
    if(disposed||!map||!layer||!contextLost)return;
    const now=performance.now();if(!reuseRestoredCanvas){rebuildTimes=rebuildTimes.filter(time=>now-time<10000);if(rebuildTimes.length>=3){report('fallback','2D Oakland map · repeated graphics reset · source controls remain live');return;}rebuildTimes.push(now);}
    const previousLayer=layer,projection=previousLayer.camera.projectionMatrix.clone(),hadProjection=previousLayer.projectionReady,previous=canvas;
    previous.removeEventListener('webglcontextlost',onLost);previous.removeEventListener('webglcontextrestored',onRestored);layer=null;
    if(map.getLayer('fleet-editorial-3d'))map.removeLayer('fleet-editorial-3d');
    if(!reuseRestoredCanvas){canvas=makeCanvas();canvas.style.visibility='hidden';canvas.style.display=mode==='2d'?'none':'';root.insertBefore(canvas,overlay);previous.remove();}canvas.addEventListener('webglcontextlost',onLost);canvas.addEventListener('webglcontextrestored',onRestored);
    try{layer=createVehicleLayer({canvas,THREE:globalThis.THREE,maplibregl:globalThis.maplibregl,getVehicles:()=>visibleVehicles,getSelected:()=>selected,getView:()=>mode,onFailure:onStatus});map.addLayer(layer);layer.camera.projectionMatrix.copy(projection);layer.projectionReady=hadProjection;layer.setFacilitySnapshot(buffer.current);layer.draw();overlayRebuilds++;map.triggerRepaint();if(!layer.renderer.getContext().isContextLost())showMap();}
    catch(error){showFallback('2D Oakland map · scene recovery unavailable · source controls remain live');}
  }
  function recordContextEvent(type,target){contextEventHistory.push({type,at:performance.now(),target:target?.className||'unknown',targetGeneration:target?.getAttribute?.('data-fleet-generation')||null,currentGeneration:overlayGeneration,isCurrentOverlay:target===canvas});if(contextEventHistory.length>20)contextEventHistory.shift();}
  function onLost(e){
    if(disposed)return;e.preventDefault();recordContextEvent('lost',e.target);clearTimeout(overlayRecoveryTimer);cancelAnimationFrame(restoreFrame);contextLost=true;showFallback('2D Oakland map · graphics context lost · simulation preserved');
    if(map&&e.target===map.getCanvas())contextEvents.mapLost++;else contextEvents.overlayLost++;
    if(map&&e.target===map.getCanvas()){
      const savedView=captureMapView(map),now=performance.now();initializing=true;
      // Retire the lost MapLibre canvas before its restore listener can reuse stale GPU buckets.
      rebuildTimes=rebuildTimes.filter(time=>now-time<10000);if(rebuildTimes.length>=3){destroyMap();initializing=false;report('fallback','2D Oakland map · repeated graphics reset · source controls remain live');return;}
      rebuildTimes.push(now);destroyMap();clearTimeout(rebuildTimer);rebuildTimer=setTimeout(()=>rebuildMap(savedView),0);
    }else{
      // r128 retains geometry dispose listeners across native restore. Retire them while GL is lost.
      layer?.onRemove?.();overlayRecoveryTimer=setTimeout(()=>{if(contextLost)rebuildOverlay();},2500);
    }
  }
  function onRestored(e){
    if(disposed)return;const target=e?.target||canvas,restoredCanvas=canvas,generation=overlayGeneration;recordContextEvent('restored',target);contextEvents.restored++;clearTimeout(overlayRecoveryTimer);cancelAnimationFrame(restoreFrame);
    // Recreate retired resources after native restoration; reject stale canvas generations.
    restoreFrame=requestAnimationFrame(()=>{if(disposed||!layer)return;if(canvas!==restoredCanvas||generation!==overlayGeneration||target!==canvas){contextEvents.staleRestored++;return;}if(layer.renderer.getContext().isContextLost()){overlayRecoveryTimer=setTimeout(rebuildOverlay,1000);return;}if(layer.disposed){rebuildOverlay(true);contextEvents.restoreCompleted++;metrics.reset();return;}layer.resize();layer.invalidate();metrics.reset();contextEvents.restoreCompleted++;if(sceneLoaded)showMap();});
  }

  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;observer?.observe(container);const headingElement=container.parentElement?.querySelector('.world-heading');if(headingElement)observer?.observe(headingElement);window.addEventListener('resize',resize);
  resize();report('loading','Loading Oakland map…');startMap();raf=requestAnimationFrame(tick);
  return {
    update(snapshot){if(disposed)return;buffer.update(snapshot,performance.now());selected=inspection.update(buffer.current.selectedId);},
    setView(next,options={}){if(!VIEW_PRESETS[next]||disposed)return;mode=next;canvas.style.display=next==='2d'?'none':'';if(typeof options.focusId==='string'){selected=inspection.focus(options.focusId);registry.select(selected);if(fallbackActive)fallback.setFocus(selected,true);}camera.setView(next,options);if(map?.getLayer('fleet-vehicles-flat'))map.setLayoutProperty('fleet-vehicles-flat','visibility',next==='2d'?'visible':'none');},
    setFocus(id){if(disposed)return;selected=inspection.focus(id);registry.select(id);camera.setFocus(id);if(!id)fitOverview();if(fallbackActive)fallback.setFocus(id,true);},
    setFollow(value){follow=!!value;if(follow&&SITES.some(s=>s.id===selected))selected=inspection.focus(buffer.current.selectedId);camera.setFocus(selected);camera.setFollow(value);},resize,
    getMetrics(){const port=layer?.facilities?.children?.find(child=>child.userData?.siteId==='oict')?.userData;return{...metrics.get(),mapStartup:mapStartup.get(map),initializing,mapRebuilds,overlayRebuilds,overlayGeneration,contextEvents:{...contextEvents},contextEventHistory:contextEventHistory.map(event=>({...event})),overlayContextLost:layer?.renderer?.getContext?.()?.isContextLost?.()??null,cameraMoving:!!map?.isMoving?.(),viewState:captureMapView(map),camera:camera.get(),ready:!disposed&&!initializing&&(fallbackActive?fallback.getMetrics().ready:sceneLoaded&&!!layer?.projectionReady),facilitiesLoaded:!!layer?.facilities,drawCalls:layer?.renderer?.info.render.calls??0,triangles:layer?.renderer?.info.render.triangles??0,lines:layer?.renderer?.info.render.lines??0,drawFrames:layer?.drawFrames??0,mapRenderCount,antialias:false,renderStrategy:'separate transparent scene canvas; static vector map is not repainted for vehicle movement',portStatus:port?.status||'unavailable',portRowCount:port?.representativeRowCount||0,portContainerCount:port?.representativeContainerCount||0,portCraneCount:port?.schematicCraneCount||0,portDetailLevel:layer?.portLOD||null,facilityState:layer?.facilityState||'not-started',mapTilesLoaded:fallbackActive?fallback.getMetrics().loadedTiles:(map?.getSource('openmaptiles')?map.isSourceLoaded('openmaptiles'):false),renderer:fallbackActive?'SVG / OpenFreeMap vector fallback':'MapLibre 4.7.1 + Three r128',width,height,entities:frameVehicles.length,visibleEntities:visibleVehicles.length,mode,contextLost,disposed,hardware:layer?.gpuDescription||'GPU not available / not measured',browser:globalThis.navigator?.userAgent||'unavailable'};},
    dispose(){if(disposed)return;disposed=true;clearTimeout(overlayRecoveryTimer);cancelAnimationFrame(restoreFrame);clearTimeout(rebuildTimer);clearTimeout(loadTimer);cancelAnimationFrame(raf);observer?.disconnect();window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',onVisibility);canvas.removeEventListener('webglcontextlost',onLost);canvas.removeEventListener('webglcontextrestored',onRestored);destroyMap();fallback.dispose();registry.clear();labels.clear();root.remove();}
  };
}
