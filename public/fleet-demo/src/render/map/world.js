/** Oakland backdrop. Facility positions/routes are an illustrative reconstruction, not dispatch records. */
export const ORIGIN = Object.freeze([-122.3080, 37.8050]);
const METERS_LAT = 111320;
const METERS_LNG = METERS_LAT * Math.cos(ORIGIN[1] * Math.PI / 180);
export const toLngLat = ([x, y]) => [ORIGIN[0] + x / METERS_LNG, ORIGIN[1] + y / METERS_LAT];
export const toLocal = ([lng, lat]) => [(lng - ORIGIN[0]) * METERS_LNG, (lat - ORIGIN[1]) * METERS_LAT];
export const SITES = Object.freeze([
  Object.freeze({ id: 'oict', label: 'Oakland port', caption: 'Incoming drone components', x: -700, y: -250, width: 220, depth: 120 }),
  Object.freeze({ id: 'centerpoint', label: 'Drone factory', caption: 'Fictional assembly & dispatch', x: 30, y: -180, width: 170, depth: 110 }),
  Object.freeze({ id: 'depot', label: 'Depot / workshop', caption: 'Illustrative service reconstruction', x: 60, y: 260, width: 180, depth: 120 })
]);
const delivery = [[-700,-250],[-570,-250],[-570,-105],[-150,-105],[30,-105],[30,-180]];
const service = [[30,-180],[30,-105],[100,-105],[100,155],[60,155],[60,260]];
const reverse = p => [...p].reverse();
export const ROUTES = Object.freeze({
  'port-to-factory': delivery,
  'factory-to-port': reverse(delivery),
  'factory-to-depot': service,
  'depot-to-factory': reverse(service),
  delivery: [...delivery, ...reverse(delivery).slice(1)],
  depot: [...service, ...reverse(service).slice(1)],
  'depot-bay': [[44,268],[44,268]]
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
