/** Same map CDN as RHS059/grid_command lib/game/geography.ts (verified 2026-10-06).
 * Original editorial styling; no credentials or copied game assets.
 */
export const MAP_CDN='https://tiles.openfreemap.org/planet';
export const MAP_GLYPHS='https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';
export const MAP_ATTRIBUTION='<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> · <a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">© OpenMapTiles</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>';
export function editorialMapStyle(){
 const source='openmaptiles';
 return {version:8,glyphs:MAP_GLYPHS,sources:{[source]:{type:'vector',url:MAP_CDN,attribution:MAP_ATTRIBUTION}},layers:[
  {id:'background',type:'background',paint:{'background-color':'#f3f3ed'}},
  {id:'landuse',type:'fill',source,'source-layer':'landuse',paint:{'fill-color':'#e7e9e0','fill-opacity':.55}},
  {id:'park',type:'fill',source,'source-layer':'park',paint:{'fill-color':'#e2e6dc','fill-opacity':.6}},
  {id:'water',type:'fill',source,'source-layer':'water',paint:{'fill-color':'#d9e0da'}},
  {id:'water-edge',type:'line',source,'source-layer':'water',paint:{'line-color':'#87958b','line-width':.75}},
  {id:'waterway',type:'line',source,'source-layer':'waterway',paint:{'line-color':'#a7b5ac','line-width':1}},
  {id:'road-casing',type:'line',source,'source-layer':'transportation',filter:['!=',['get','class'],'rail'],paint:{'line-color':'#8b958c','line-width':['interpolate',['linear'],['zoom'],12,1,16,7,20,32],'line-opacity':.72}},
  {id:'road',type:'line',source,'source-layer':'transportation',filter:['!=',['get','class'],'rail'],paint:{'line-color':'#fafbf5','line-width':['interpolate',['linear'],['zoom'],12,.5,16,5.5,20,29]}},
  {id:'rail',type:'line',source,'source-layer':'transportation',filter:['==',['get','class'],'rail'],paint:{'line-color':'#b0b7ac','line-width':.7,'line-dasharray':[3,3]}},
  {id:'building-paper',type:'fill',source,'source-layer':'building',paint:{'fill-color':'#e8ebe3','fill-opacity':.85}},
  {id:'building-outline',type:'line',source,'source-layer':'building',paint:{'line-color':'#899486','line-width':.65,'line-opacity':.65}},
  {id:'road-labels',type:'symbol',source,'source-layer':'transportation_name',minzoom:13,layout:{'symbol-placement':'line','text-field':['get','name'],'text-font':['Noto Sans Regular'],'text-size':10,'symbol-spacing':300},paint:{'text-color':'#778173','text-halo-color':'#f3f3ed','text-halo-width':1.5}},
 ]};
}
