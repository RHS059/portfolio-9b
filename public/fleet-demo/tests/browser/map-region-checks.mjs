import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
/** Independent actual-MapLibre alpha readback. Uses only public map/protocol/custom-layer APIs.
 * Call from the existing browser runner: await checkMapRegion({browser,url,out}).
 */
export async function checkMapRegion({browser,url,out,assetBase}){
 const page=await browser.newPage({viewport:{width:1280,height:960},deviceScaleFactor:1}),errors=[],evidence={views:[],note:'Functional pixel/source-cull evidence on this runner; no GPU speedup inferred.'};
 page.on('pageerror',error=>errors.push(String(error)));
 try{
  await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.maplibregl);
  await page.evaluate(async base=>{
   const prefix=base||new URL('./',location.href).href;
   const [{MAP_REGION,mercatorLngLat},{editorialMapStyle,MAP_CDN},{createRegionProtocol},{createRegionClip,groundInverse}]=await Promise.all(['region.js','style.js','region-protocol.js','region-clip.js'].map(file=>import(new URL(`src/render/map/${file}`,prefix).href)));
   const host=document.createElement('div');host.style.cssText='position:fixed;inset:0;z-index:999999;background:#f3f3ed';document.body.append(host);
   const source=createRegionProtocol(window.maplibregl,MAP_CDN),clip=createRegionClip(),map=new maplibregl.Map({container:host,center:MAP_REGION.lngLat,zoom:13.1,pitch:0,bearing:0,antialias:false,attributionControl:true,renderWorldCopies:false,style:editorialMapStyle({sourceURL:source.url})});let projection;
   await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Boundary map load timeout')),30000);map.once('load',()=>{clearTimeout(timeout);resolve();});map.on('error',e=>reject(e.error||Error('Boundary map source error')));});
   map.addLayer(clip);map.addLayer({id:'region-test-projection',type:'custom',renderingMode:'2d',render(gl,matrix){projection=Array.from(matrix);}});
   window.__regionCheck={map,source,clip,host,region:MAP_REGION,mercatorLngLat,groundInverse,get projection(){return projection;}};
  },assetBase);
  for(const [mode,pitch,bearing]of [['2d',0,0],['iso',52,-28],['3d',65,32]]){
   await page.evaluate(({pitch,bearing})=>{window.__regionCheck.map.jumpTo({pitch,bearing,zoom:13.1,center:window.__regionCheck.region.lngLat});},{pitch,bearing});
   await page.waitForFunction(()=>window.__regionCheck.map.loaded()&&!window.__regionCheck.map.isMoving());
   const pixels=await readAlpha(page);assert.ok(pixels.inside>1000,`${mode}: solid region is sampled`);assert.ok(pixels.outside>1000,`${mode}: exterior is sampled`);assert.ok(pixels.bandKept>100&&pixels.bandCleared>100,`${mode}: Bayer annulus has retained and cleared pixels`);assert.equal(pixels.opaqueOutside,0,`${mode}: all exterior pixels are transparent, including sky`);assert.equal(pixels.clearInside,0,`${mode}: solid geographic region has no holes`);assert.equal(pixels.glError,0,`${mode}: WebGL reports no error`);
   await page.screenshot({path:path.join(out,`map-region-${mode}.png`)});evidence.views.push({mode,requestedPitch:pitch,actualPitch:await page.evaluate(()=>window.__regionCheck.map.getPitch()),bearing,...pixels});
  }
  const before=await page.evaluate(()=>window.__regionCheck.source.getMetrics());
  await page.evaluate(()=>{const c=window.__regionCheck,r=c.region,R=r.outerRadius*r.meterScale;c.map.jumpTo({pitch:0,bearing:0,zoom:17,center:c.mercatorLngLat([r.centerMercator[0]+R*.92,r.centerMercator[1]+R*.92])});});
  await page.waitForFunction(()=>window.__regionCheck.map.loaded()&&!window.__regionCheck.map.isMoving());
  const after=await page.evaluate(()=>window.__regionCheck.source.getMetrics()),outside=await readAlpha(page);assert.equal(outside.opaqueOutside,0);assert.equal(outside.inside,0,'Manual exterior view should be empty');evidence.source={before,after,note:'At coarse source zooms every bounding-box tile can intersect the disk, so circular rejection may legitimately remain zero; native protocol tests cover no-fetch rejection.'};evidence.exterior=outside;
  await page.evaluate(()=>{const c=window.__regionCheck,r=c.region,R=r.outerRadius*r.meterScale;c.map.jumpTo({pitch:0,bearing:0,zoom:17,center:c.mercatorLngLat([r.centerMercator[0]+R*3,r.centerMercator[1]+R*3])});});await page.waitForFunction(()=>window.__regionCheck.map.loaded()&&!window.__regionCheck.map.isMoving());const beyond=await page.evaluate(()=>window.__regionCheck.source.getMetrics());assert.equal(beyond.fetchedTiles,after.fetchedTiles,'Panning wholly beyond source bounds must not start tile network fetches');evidence.source.beyondBounds=beyond;
  await page.screenshot({path:path.join(out,'map-region-outside.png')});
  // A genuine user drag does not move the geographic boundary center.
  await page.mouse.move(640,480);await page.mouse.down();await page.mouse.move(800,530,{steps:8});await page.mouse.up();await page.waitForFunction(()=>!window.__regionCheck.map.isMoving());const dragged=await page.evaluate(()=>({clip:window.__regionCheck.clip.getMetrics(),camera:window.__regionCheck.map.getCenter().toArray()}));assert.deepEqual(dragged.clip.center,(await page.evaluate(()=>[...window.__regionCheck.region.lngLat])));evidence.manualDrag=dragged;
  assert.equal(errors.length,0,errors.join('\n'));evidence.errors=errors;await fs.writeFile(path.join(out,'map-region-evidence.json'),JSON.stringify(evidence,null,2));return evidence;
 }catch(error){evidence.failure=String(error);evidence.errors=errors;try{evidence.failureState=await page.evaluate(()=>{const c=window.__regionCheck;return c?{source:c.source.getMetrics(),clip:c.clip.getMetrics(),camera:{center:c.map.getCenter().toArray(),zoom:c.map.getZoom(),pitch:c.map.getPitch(),bearing:c.map.getBearing()}}:null;});await page.screenshot({path:path.join(out,'map-region-failure.png')});}catch(diagnosticError){evidence.diagnosticFailure=String(diagnosticError);}await fs.writeFile(path.join(out,'map-region-evidence.json'),JSON.stringify(evidence,null,2));throw error;
 }finally{await page.evaluate(()=>{const c=window.__regionCheck;if(c){c.clip.onRemove();c.map.remove();c.source.dispose();c.host.remove();delete window.__regionCheck;}}).catch(()=>{});await page.close();}
}
async function readAlpha(page){
 return page.evaluate(()=>new Promise(resolve=>{const c=window.__regionCheck;c.map.once('render',()=>{
  const canvas=c.map.getCanvas(),gl=canvas.getContext('webgl2')||canvas.getContext('webgl'),w=canvas.width,h=canvas.height,pixels=new Uint8Array(w*h*4),m=c.groundInverse(c.projection),r=c.region;gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  let inside=0,outside=0,opaqueOutside=0,clearInside=0,bandKept=0,bandCleared=0;
  for(let y=0;y<h;y+=2)for(let x=0;x<w;x+=2){const nx=(x+.5)/w*2-1,ny=(y+.5)/h*2-1,k=m[2]*nx+m[5]*ny+m[8],px=(m[0]*nx+m[3]*ny+m[6])/k,py=(m[1]*nx+m[4]*ny+m[7])/k,d=Math.hypot(px,py),alpha=pixels[(y*w+x)*4+3];if(k<=0||d>r.outerRadius+5){outside++;if(alpha!==0)opaqueOutside++;}else if(d<r.innerRadius-5){inside++;if(alpha!==255)clearInside++;}else if(d>r.innerRadius+20&&d<r.outerRadius-20){if(alpha===0)bandCleared++;else bandKept++;}}
  resolve({inside,outside,opaqueOutside,clearInside,bandKept,bandCleared,glError:gl.getError(),region:c.clip.getMetrics(),source:c.source.getMetrics(),width:w,height:h});});c.map.triggerRepaint();}));
}
