export const TRANSFER_STATIONS = Object.freeze([
  Object.freeze({id:'QA-01',kind:'qa',input:Object.freeze([37,26,1.225]),rollerInput:Object.freeze([37.855,26,1.225]),test:Object.freeze([42,26,1.225]),rollerOutput:Object.freeze([46.145,26,1.225]),output:Object.freeze([47,26,1.225])}),
  ...[50,62].map((x,i)=>Object.freeze({id:'DISPATCH-0'+(i+1),kind:'dispatch',input:Object.freeze([x,-12,1.225]),rollerInput:Object.freeze([x,-12.855,1.225]),pickup:Object.freeze([x,-16,1.225])})),
]);

// Builder-local Z excludes the .25 m factory floor; all exported mounts include it.
export function addTransferStationGeometry(b) {
  const top=.975,radius=.055,rollerZ=top-radius;
  // Fixed machinery stops .8 m short of AMR dock centers; the carrier bridges the transfer gap.
  b.box(8.4,3.25,.12,42,26,.79,'face');
  for(const y of[24.4,27.6])b.box(8.4,.10,.18,42,y,.855,'dark');
  for(let i=0;i<=34;i++)b.cylinder(radius,3.08,37.855+i*(46.145-37.855)/34,26,rollerZ,'muted',[0,0,0],10);
  for(const x of[40,44])for(const y of[24.5,27.5])b.box(.11,.11,.79,x,y,.395,'muted');
  // Dispatch loading is from south; the north edge leaves space for each inlet AMR.
  for(const x of[50,62]){
    b.box(3.2,3.525,.12,x,-14.5625,.79,'face');
    for(const dx of[-1.58,1.58])b.box(.10,3.525,.18,x+dx,-14.5625,.855,'dark');
    const rows=[];for(let y=-16.25;y<=-13;y+=.25)rows.push(y);rows.push(-12.855);
    for(const y of rows)b.cylinder(radius,3.06,x,y,rollerZ,'muted',[0,0,Math.PI/2],10);
    for(const dx of[-1.46,1.46])for(const y of[-16,-14,-13])b.box(.11,.11,.79,x+dx,y,.395,'muted');
  }
}

export function transferMountEntries() {
  return TRANSFER_STATIONS.flatMap(station=>Object.entries(station)
    .filter(([,value])=>Array.isArray(value))
    .map(([kind,position])=>Object.freeze({id:station.kind+':'+station.id+':'+kind.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()),stationId:station.id,kind,position})));
}
