import { createDiagramBuilder, FACILITY_THEME } from '../depot/geometry.js';
import { PORT_PROCESS_DIMENSIONS as D } from './process-layout.js';

function hull(THREE) {
  const T = THREE;
  const ring = [[-84,-8],[-78,-13],[61,-13],[76,-8],[84,0],[76,8],[61,13],[-78,13],[-84,8]];
  const vertices = [], top = 7.8, bottom = -1.2;
  const triangle = (a,b,c) => vertices.push(...a,...b,...c);
  for (let i=0;i<ring.length;i++) {
    const [x,y]=ring[i],[nx,ny]=ring[(i+1)%ring.length];
    const a=[x,y,bottom],b=[nx,ny,bottom],c=[nx,ny,top],d=[x,y,top];
    triangle(a,b,c);triangle(a,c,d);triangle([0,0,top],d,c);triangle([0,0,bottom],b,a);
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();geometry.computeBoundingSphere();
  const group=new T.Group();group.name='illustrative-vessel-hull';
  group.add(new T.Mesh(geometry,new T.MeshLambertMaterial({color:FACILITY_THEME.dark})),new T.LineSegments(new T.EdgesGeometry(geometry,25),new T.LineBasicMaterial({color:FACILITY_THEME.ink})));
  return group;
}

function makeVessel(THREE) {
  const T=THREE,group=new T.Group();group.name='illustrative-moored-container-vessel';
  group.userData={kind:'illustrative-vessel',surveyed:false,inventory:false};
  group.position.y=D.shipOffsetFromCrane;
  group.add(hull(T));
  const b=createDiagramBuilder(T);
  b.box(141,24,.7,-4,0,8.15,'muted');
  // Stepped accommodation, bridge glazing, wings, funnel and mast identify the stern.
  b.box(16,19,7,-65,0,11.7,'paper');
  b.box(14,17,5,-65,0,17.7,'paper');
  b.box(17,21,3,-65,0,21.7,'paper');
  b.box(18,22,.6,-65,0,23.5,'paper');
  for(const y of [-10.55,10.55])b.box(14,.12,1.1,-65,y,22,'dark',false);
  b.box(.12,17,1.1,-56.45,0,22,'dark',false);
  b.box(4,4,4,-73,0,25.8,'muted');b.box(4.4,4.4,.5,-73,0,28.05,'dark');
  b.box(.3,.3,5,-61,0,26.3,'muted');
  b.line([[-63,0,28],[-59,0,28]]);
  // Thin deck rails, forward hatch and mooring fairleads, with no water plane.
  for(const y of [-12,12]) {
    b.line([[-80,y,9.3],[59,y,9.3],[75,y*.58,9.3],[81,0,9.3]]);
    for(let x=-78;x<=59;x+=8)b.line([[x,y,8.5],[x,y,9.3]]);
  }
  b.box(9,12,1.3,64,0,9.1,'paper');
  for(const y of [-6,6]) {b.box(1.5,1.2,.8,72,y,8.9,'dark');b.box(1.5,1.2,.8,-79,y,8.9,'dark');}
  // Representative deck stacks are decorative massing, never process inventory.
  // Tracked palletized kits sit on the clear landward deck aisle, outside these stacks.
  for(let col=-3;col<=3;col++)for(let row=-3;row<=3;row++)for(let layer=0;layer<3;layer++) {
    b.box(D.containerLength,D.containerWidth,D.containerHeight,col*13.2,row*2.8,D.deckHeight+(layer+.5)*D.containerHeight,
      (col+row+layer)%3===0?'muted':'paper');
  }
  group.add(b.finish('vessel-deck-and-representative-stacks'));
  return group;
}

/** Cargo is one stable object; its visibility follows external ownership snapshots. */
export function createPortCargo(THREE) {
  // Same 1.2 × 1.0 × .19 m pallet and .78 × .58 m closed carton as factory equipment.
  // Origin is pallet-bottom center, so ship deck, flatbed and fork support planes agree.
  const b=createDiagramBuilder(THREE);
  for(const y of[-.4,0,.4])for(const x of[-.43,0,.43])b.box(.16,.16,.10,x,y,.09,'muted');
  for(const x of[-.43,0,.43])b.box(.15,1,.045,x,0,.0225,'muted');
  for(const x of[-.49,-.245,0,.245,.49])b.box(.21,1,.05,x,0,.165,'paper');
  b.box(.805,.605,.47,0,0,.19+.25,'paper');
  b.box(.78,.58,.018,0,0,.19+.478,'paper');
  // Strapping and a roof label make the same little load readable at close inspection.
  for(const x of[-.24,.24]){
    for(const y of[-.304,.304])b.box(.026,.009,.47,x,y,.44,'dark',false);
    b.box(.026,.61,.009,x,0,.672,'dark',false);
  }
  b.line([[-.39,0,.677],[.39,0,.677]]);b.text('01',0,-.11,.677,.045);
  const group=b.finish('tracked-port-palletized-kit');group.visible=false;
  group.userData={kind:'process-cargo',origin:'pallet-bottom-center',dimensions:Object.freeze({width:1.2,depth:1,height:.677})};return group;
}

export function createPortProcessAssets({THREE,layout}) {
  const T=THREE,group=new T.Group();group.name='illustrative-port-handoff';
  group.userData={berthId:layout.id,craneId:layout.craneId,illustrative:true};
  group.position.fromArray(layout.origin);group.rotation.z=layout.rotationZ;
  const vessel=makeVessel(T);group.add(vessel);
  const trolleyBuilder=createDiagramBuilder(T);
  trolleyBuilder.box(4,4,1.2,0,0,40,'dark');
  const trolley=trolleyBuilder.finish('active-crane-trolley');group.add(trolley);
  const spreaderBuilder=createDiagramBuilder(T);
  for(const y of [-.5,.5])spreaderBuilder.box(1.35,.09,.1,0,y,0,'paper');
  for(const x of [-.63,.63])spreaderBuilder.box(.09,1.1,.12,x,0,0,'paper');
  spreaderBuilder.box(.35,.35,.25,0,0,.15,'dark');
  for(const x of [-1,1])for(const y of [-1,1])spreaderBuilder.line([[x*.4,y*.35,-.05],[x*.57,y*.46,-1.21]]);
  const spreader=spreaderBuilder.finish('active-crane-spreader');spreader.position.z=34;group.add(spreader);
  const wireGeometry=new T.BufferGeometry();wireGeometry.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(24),3));
  const wires=new T.LineSegments(wireGeometry,new T.LineBasicMaterial({color:FACILITY_THEME.ink}));wires.name='active-crane-hoist-cables';wires.frustumCulled=false;group.add(wires);
  function poseHoist(y,z,xOffset=0) {
    trolley.position.set(xOffset,y,0);spreader.position.set(xOffset,y,z);
    const a=wireGeometry.getAttribute('position');let i=0;
    for(const x of [-.4,.4])for(const dy of [-.35,.35]) {a.setXYZ(i++,x+xOffset,y+dy,39.4);a.setXYZ(i++,x+xOffset,y+dy,z+.4);}
    a.needsUpdate=true;
  }
  poseHoist(0,34);
  return {group,vessel,trolley,spreader,wires,poseHoist};
}

// Shared closed transport representation for the renderer-owned global cargo pool.
export const createPalletCargo = createPortCargo;
