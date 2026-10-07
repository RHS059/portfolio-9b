export const TRANSFER_STATIONS = Object.freeze([
  Object.freeze({id:'QA-01',kind:'qa',input:Object.freeze([37,26,1.225]),test:Object.freeze([42,26,1.225]),output:Object.freeze([47,26,1.225])}),
  ...[50,62].map((x,i)=>Object.freeze({id:'DISPATCH-0'+(i+1),kind:'dispatch',input:Object.freeze([x,-12,1.225]),pickup:Object.freeze([x,-16,1.225])})),
]);

// Builder-local Z excludes the .25 m factory floor; all exported mounts include it.
export function addTransferStationGeometry(b) {
  const top=.975,radius=.055,rollerZ=top-radius;
  // Continuous QA roller path through its scanner fixture, with clear underside supports.
  b.box(10.5,3.25,.12,42,26,.79,'face');
  for(const y of[24.4,27.6])b.box(10.6,.10,.18,42,y,.855,'dark');
  for(let x=36.75;x<=47.25;x+=.25)b.cylinder(radius,3.08,x,26,rollerZ,'muted',[0,0,0],10);
  for(const x of[37,40,44,47])for(const y of[24.5,27.5])b.box(.11,.11,.79,x,y,.395,'muted');
  // Two open dispatch frames. Loading face is the south end; AMRs approach from north.
  for(const x of[50,62]){
    b.box(3.2,4.55,.12,x,-14,.79,'face');
    for(const dx of[-1.58,1.58])b.box(.10,4.65,.18,x+dx,-14,.855,'dark');
    for(let y=-16.25;y<=-11.75;y+=.25)b.cylinder(radius,3.06,x,y,rollerZ,'muted',[0,0,Math.PI/2],10);
    for(const dx of[-1.46,1.46])for(const y of[-16,-14,-12])b.box(.11,.11,.79,x+dx,y,.395,'muted');
  }
}

export function transferMountEntries() {
  return TRANSFER_STATIONS.flatMap(station=>Object.entries(station)
    .filter(([,value])=>Array.isArray(value))
    .map(([kind,position])=>Object.freeze({id:station.kind+':'+station.id+':'+kind,stationId:station.id,kind,position})));
}
