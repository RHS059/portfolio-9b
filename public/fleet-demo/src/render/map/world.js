import {ROAD_ROUTE_LNGLAT} from './route-data.js';
/** Oakland backdrop. Facility positions/routes are an illustrative reconstruction, not dispatch records. */
export const ORIGIN = Object.freeze([-122.3080, 37.8050]);
const METERS_LAT = 111320;
const METERS_LNG = METERS_LAT * Math.cos(ORIGIN[1] * Math.PI / 180);
export const toLngLat = ([x, y]) => [ORIGIN[0] + x / METERS_LNG, ORIGIN[1] + y / METERS_LAT];
export const toLocal = ([lng, lat]) => [(lng - ORIGIN[0]) * METERS_LNG, (lat - ORIGIN[1]) * METERS_LAT];
// OICT reference point: SMDG USOAK/B58 v20260609, not a gate or exact terminal outline.
// https://smdg.org/wp-content/uploads/Codelists/Terminals/SMDG-Terminal-Code-List-v20260609.xlsx
// CenterPoint warehouse: OSM way 1019902402, 1300 Maritime Street. Interior use is fictional.
const port=toLocal([-122.3141666667,37.7963888889]);
const factory=toLocal([-122.3089861,37.8129817]);
// Fictional workshop within the warehouse parcel, not an asserted real-world business.
const depot=[factory[0]-95,factory[1]-105];
export const SITES = Object.freeze([
  Object.freeze({ id:'oict',label:'OICT · Oakland port',caption:'Terminal reference point · SMDG',x:port[0],y:port[1],width:220,depth:120 }),
  Object.freeze({ id:'centerpoint',label:'Drone factory',caption:'Fictional use · 1300 Maritime St',x:factory[0],y:factory[1],width:150,depth:90 }),
  Object.freeze({ id:'depot',label:'Depot / workshop',caption:'Fictional campus service bays',x:depot[0],y:depot[1],width:85,depth:60 })
]);
// Roads follow an OSM/OSRM general-driving reconstruction. Final yard connectors are illustrative.
const road=ROAD_ROUTE_LNGLAT.map(toLocal);
const delivery=[port,...road,factory];
const service=[factory,[factory[0]-40,factory[1]],[factory[0]-40,depot[1]-40],[depot[0],depot[1]-40],depot];
const reverse = p => [...p].reverse();
export const ROUTES = Object.freeze({
  'port-to-factory': delivery,
  'factory-to-port': reverse(delivery),
  'factory-to-depot': service,
  'depot-to-factory': reverse(service),
  delivery: [...delivery, ...reverse(delivery).slice(1)],
  depot: [...service, ...reverse(service).slice(1)],
  'depot-bay': [[depot[0]-12,depot[1]+6],[depot[0]-12,depot[1]+6]]
});
const prepared = new Map(Object.entries(ROUTES).map(([id, points]) => {
  let total = 0;
  const lengths = points.slice(1).map((p, i) => { const length = Math.hypot(p[0]-points[i][0], p[1]-points[i][1]); total += length; return length; });
  return [id, { points, lengths, total }];
}));
export function routePosition(routeId = 'delivery', progress = 0) {
  const r = prepared.get(routeId) || prepared.get('delivery');
  let distance = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0)) * r.total;
  for (let i = 0; i < r.lengths.length; i++) {
    const length = r.lengths[i];
    if (distance <= length || i === r.lengths.length - 1) {
      const a = r.points[i], b = r.points[i+1], t = length ? distance / length : 0;
      return { x:a[0]+(b[0]-a[0])*t, y:a[1]+(b[1]-a[1])*t, heading:Math.atan2(b[0]-a[0],b[1]-a[1]) };
    }
    distance -= length;
  }
  return { x:r.points[0][0], y:r.points[0][1], heading:0 };
}
export function routeGeoJSON() {
  return { type:'FeatureCollection', features:['port-to-factory','factory-to-depot'].map(id=>({type:'Feature',properties:{id},geometry:{type:'LineString',coordinates:ROUTES[id].map(toLngLat)}})) };
}
export function vehiclePosition(vehicle) {
  if (Number.isFinite(vehicle.x) && Number.isFinite(vehicle.y)) return {x:vehicle.x,y:vehicle.y,heading:vehicle.heading||0};
  return routePosition(vehicle.routeId, vehicle.progress);
}
