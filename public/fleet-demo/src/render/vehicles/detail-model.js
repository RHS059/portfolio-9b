/** Original close-range editorial vehicles. Meters; +Y forward, +Z up.
 * Only presentation geometry: no odometer, service record or domain mutation.
 * Body details are merged by material and all wheels share three instanced batches.
 */
export const DETAIL_PALETTE = Object.freeze({
  paper: 0xf7f7f2, panel: 0xd4d8d3, metal: 0xaeb8b2,
  ink: 0x303735, glass: 0x485853, rubber: 0x252b28,
});
export const TRUCK_WHEEL_RADIUS = .5;
export const DETAIL_GROUND_CONTACT = .05;
export const DETAIL_DRAW_BUDGET = 9;

const TAU = Math.PI * 2;
export function wheelAngleForDistance(distance, radius = TRUCK_WHEEL_RADIUS) {
  if (!Number.isFinite(distance) || !Number.isFinite(radius) || radius <= 0) return 0;
  // +Y travel rotates about -X. Modulo keeps large route distances numerically small.
  return -(distance / radius % TAU);
}

function mergeParts(T, parts) {
  const positions = [], normals = [];
  for (const geometry of parts) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    const p = g.getAttribute('position'), n = g.getAttribute('normal');
    for (let i = 0; i < p.count; i++) {
      positions.push(p.getX(i), p.getY(i), p.getZ(i));
      normals.push(n.getX(i), n.getY(i), n.getZ(i));
    }
    if (g !== geometry) g.dispose();
    geometry.dispose();
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new T.Float32BufferAttribute(normals, 3));
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}

function author(T) {
  const buckets = new Map(), features = [];
  const add = (key, geometry, name) => {
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(geometry);
    if (name) features.push(name);
  };
  const box = (key, w, l, h, x, y, z, name) => add(key, new T.BoxGeometry(w, l, h).translate(x, y, z), name);
  const cylinder = (key, radius, length, x, y, z, axis = 'x', name, segments = 16) => {
    const geometry = new T.CylinderGeometry(radius, radius, length, segments);
    if (axis === 'x') geometry.rotateZ(-Math.PI / 2);
    if (axis === 'z') geometry.rotateX(Math.PI / 2);
    add(key, geometry.translate(x, y, z), name);
  };
  const face = (key, vertices, name) => {
    const geometry = new T.BufferGeometry();
    const flat = [];
    for (let i = 1; i < vertices.length - 1; i++) flat.push(...vertices[0], ...vertices[i], ...vertices[i + 1]);
    geometry.setAttribute('position', new T.Float32BufferAttribute(flat, 3));
    geometry.computeVertexNormals(); add(key, geometry, name);
  };
  const prism = (key, width, yz, name) => {
    const shape = new T.Shape(); yz.forEach(([y,z], i) => i ? shape.lineTo(y,z) : shape.moveTo(y,z));
    shape.closePath();
    const geometry = new T.ExtrudeGeometry(shape, {depth:width, bevelEnabled:false, steps:1});
    // Extrusion originally runs along Z. Map its XYZ to the vehicle's YZX.
    const matrix = new T.Matrix4().set(0,0,1,-width/2, 1,0,0,0, 0,1,0,0, 0,0,0,1);
    geometry.applyMatrix4(matrix); add(key, geometry, name);
  };
  const bar = (key, a, b, thickness, name) => {
    const start = new T.Vector3(...a), end = new T.Vector3(...b), direction = end.clone().sub(start);
    const geometry = new T.CylinderGeometry(thickness, thickness, direction.length(), 6);
    geometry.applyMatrix4(new T.Matrix4().makeRotationFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0), direction.normalize())));
    geometry.translate(...start.add(end).multiplyScalar(.5).toArray()); add(key, geometry, name);
  };
  return {buckets, features, add, box, cylinder, face, prism, bar};
}

function wheelArch(T, a, x, y, z, width, radius, name) {
  const inner = radius - .095, segments = 16, vertices = [];
  const point = (side, r, t) => [x + side * width / 2, y + Math.cos(t) * r, z + Math.sin(t) * r];
  for (let i = 0; i < segments; i++) {
    const t0 = i / segments * Math.PI, t1 = (i + 1) / segments * Math.PI;
    for (const side of [-1, 1]) vertices.push(
      ...point(side, inner, t0), ...point(side, radius, t0), ...point(side, radius, t1),
      ...point(side, inner, t0), ...point(side, radius, t1), ...point(side, inner, t1));
    vertices.push(...point(-1, radius,t0), ...point(1,radius,t0), ...point(1,radius,t1),
      ...point(-1,radius,t0), ...point(1,radius,t1), ...point(-1,radius,t1));
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(vertices,3)); geometry.computeVertexNormals();
  a.add('paper', geometry, name);
}

function truckBody(T, a, trailerAttached=true) {
  // Tractor underframe, fifth-wheel silhouette, and short gap in front of the trailer.
  a.box('ink', 1.8, 7.6, .22, 0, 3.05, .84, 'tractor-chassis');
  a.box('metal', 1.55, 1.05, .12, 0, 1.3, 1.04, 'fifth-wheel-coupling');
  a.cylinder('ink', .39, .11, 0, 1.28, 1.14, 'z', 'coupling-disc');
  for (const y of (trailerAttached?[5.78, 1.18, -.12, -7.0, -8.3]:[5.78,1.18,-.12])) a.cylinder('ink', .105, 2.5, 0,y,.55,'x','axle');
  // Recognizable long-nose sleeper cab with a sloping windshield and roof fairing.
  a.prism('paper', 2.28, [[2.25,1.1],[2.25,3.55],[2.58,3.82],[4.15,3.82],[5.15,3.28],[5.42,2.25],[5.27,1.1]], 'sleeper-cab');
  a.prism('paper', 1.94, [[5.22,1.05],[5.22,2.12],[6.84,1.86],[7.2,1.49],[7.2,1.02]], 'tapered-hood');
  a.box('panel', 2.33,.07,2.28,0,2.26,2.31,'cab-back-panel');
  a.face('glass', [[-1.065,5.17,3.245],[1.065,5.17,3.245],[1.065,5.438,2.31],[-1.065,5.438,2.31]], 'sloped-windshield');
  a.bar('paper',[0,5.176,3.245],[0,5.444,2.31],.027,'windshield-divider');
  for (const side of [-1,1]) {
    const x = side * 1.153;
    a.face('glass', [[x,3.91,3.42],[x,4.91,3.15],[x,5.12,2.42],[x,3.91,2.42]], 'side-window');
    a.box('panel', .04,1.27,1.1,x,4.44,1.8,'door-panel');
    a.box('ink', .055,.25,.06,x*1.015,4.05,2.17,'door-handle');
    a.box('ink', .028,.035,1.21,x,3.8,1.82,'door-seam');
    a.box('ink', .04,.04,.76,x,3.74,2.84,'window-pillar');
    a.box('panel', .045,.52,.45,x,2.86,2.93,'sleeper-window-frame');
    a.box('glass', .052,.39,.31,x*1.006,2.86,2.93,'sleeper-window');
    a.bar('ink',[side*1.13,4.99,2.94],[side*1.63,5.12,2.94],.034,'mirror-arm');
    a.bar('ink',[side*1.14,4.93,2.26],[side*1.63,5.12,2.5],.029,'mirror-brace');
    a.box('ink',.16,.24,.59,side*1.65,5.12,2.72,'mirror-housing');
    a.box('metal',.115,.035,.5,side*1.65,5.257,2.72,'mirror-face');
    for (const [y,z,width] of [[4.36,.8,.54],[4.43,1.02,.39]]) {
      a.box('metal',width,1.15,.11,side*(1.02+width/2),y,z,'cab-step');
      for (let i=0;i<5;i++) a.box('ink',width*.8,.035,.014,side*(1.02+width/2),y-.43+i*.21,z+.06,'step-tread');
    }
    a.cylinder('metal',.29,1.35,side*.96,2.81,.72,'y','fuel-tank');
    a.box('ink',.65,.07,.48,side*.98,2.28,.76,'tank-strap');
    wheelArch(T,a,side*1.16,5.78,.55,.48,.685,'front-fender');
    a.box('ink',.45,.10,.34,side*1.19,5.12,.52,'front-mudflap');
    a.box('panel',.67,2.12,.08,side*1.12,.53,1.16,'rear-fender');
    a.box('ink',.64,.08,.46,side*1.13,-.77,.41,'tractor-mudflap');
    // Headlights remain monochrome but read as paired lenses inside dark recesses.
    a.box('ink',.47,.055,.24,side*.97,7.208,1.2,'headlight-recess');
    a.box('paper',.34,.065,.15,side*.97,7.239,1.21,'headlight-lens');
    a.bar('ink',[side*.86,5.41,2.37],[side*.16,5.29,2.76],.018,'windshield-wiper');
  }
  a.box('ink',1.34,.06,.66,0,7.207,1.43,'grille-recess');
  for (let i=0;i<8;i++) a.box('metal',1.25,.073,.036,0,7.239,1.16+i*.075,'grille-slat');
  a.box('metal',2.64,.24,.24,0,7.31,.8,'front-bumper');
  a.box('ink',.48,.025,.16,0,7.443,.82,'front-plate');
  a.bar('panel',[0,5.30,2.122],[0,6.82,1.878],.012,'hood-center-seam');
  for (const x of [-.8,-.4,0,.4,.8]) a.box('metal',.11,.13,.07,x,4.35,3.76,'roof-marker');
  if(!trailerAttached)return;
  boxTrailerBody(T,a,true);
}

function boxTrailerBody(T,a,includeServiceLines=false) {
  // Simple air/electrical lines indicate the tractor/trailer join without a mechanism model.
  if(includeServiceLines)for (const x of [-.25,0,.25]) a.bar('ink',[x,2.22,1.9],[x+.12,1.89,1.4],.025,'trailer-service-line');
  // Box trailer: opaque shell, frame, panel seams, rear doors/hinges and retracted supports.
  a.box('paper',2.58,12.15,2.84,0,-4.175,2.73,'box-trailer');
  a.box('panel',2.66,12.21,.10,0,-4.175,4.18,'trailer-roof-rail');
  a.box('metal',2.64,12.2,.12,0,-4.175,1.27,'trailer-lower-rail');
  for (const side of [-1,1]) {
    for (const y of [1.86,-.55,-2.97,-5.39,-7.81,-10.19]) a.box('panel',.032,.028,2.73,side*1.304,y,2.76,'trailer-panel-seam');
    a.box('ink',.10,11.5,.19,side*.79,-4.25,1.07,'trailer-frame');
    for (const y of [1.8,-1.2,-4.2,-7.2,-10]) a.box('paper',.045,.37,.06,side*1.335,y,1.29,'trailer-reflector');
    a.box('metal',.12,.15,.65,side*.91,.18,.91,'landing-leg');
    a.box('ink',.36,.40,.08,side*.91,.18,.55,'landing-foot');
    a.box('ink',.64,.09,.46,side*1.1,-8.95,.41,'trailer-mudflap');
  }
  a.box('panel',2.49,.04,2.70,0,-10.274,2.76,'rear-doors');
  a.box('ink',.035,.06,2.70,0,-10.308,2.76,'rear-door-seam');
  for (const side of [-1,1]) {
    a.bar('metal',[side*.7,-10.34,1.49],[side*.7,-10.34,4.00],.025,'rear-lock-bar');
    for (const z of [1.67,2.76,3.85]) a.box('ink',.14,.065,.11,side*1.20,-10.326,z,'rear-hinge');
    a.box('ink',.37,.07,.12,side*.62,-10.354,2.05,'rear-door-handle');
    a.box('ink',.28,.065,.13,side*.9,-10.32,1.26,'rear-light');
  }
  a.box('metal',2.25,.16,.13,0,-10.1,.63,'rear-underride-bar');
  for (const x of [-.72,.72]) a.box('ink',.10,.1,.47,x,-10.1,.91,'underride-support');
}


/** Open deck for the shared pallet/crate visual; no baked load and no roof. */
function flatbedTrailerBody(T,a) {
  // Taper the forward neck so real independent trailer yaw clears the cab.
  const deckShape=new T.Shape();
  [[-1.29,-10.25],[1.29,-10.25],[1.29,-1.5],[.40,1.9],[-.40,1.9],[-1.29,-1.5]].forEach(([x,y],i)=>i?deckShape.lineTo(x,y):deckShape.moveTo(x,y));
  deckShape.closePath();a.add('panel',new T.ExtrudeGeometry(deckShape,{depth:.12,bevelEnabled:false,steps:1}).translate(0,0,1.21),'flatbed-deck');
  a.box('metal',2.64,8.75,.14,0,-5.875,1.20,'flatbed-edge-rail');
  for(const side of [-1,1])a.bar('metal',[side*1.29,-1.5,1.24],[side*.40,1.9,1.24],.035,'flatbed-neck-rail');
  a.box('metal',.84,.08,.14,0,1.9,1.20,'flatbed-front-rail');
  for(const y of [1.77,-.65,-3.07,-5.49,-7.91,-10.10]) {
    a.box('ink',y> -1.5?.75:2.30,.09,.18,0,y,1.06,'flatbed-crossmember');
    a.box('metal',y> -1.5?.75:2.56,.018,.014,0,y,1.337,'flatbed-deck-seam');
  }
  for(const side of [-1,1]) {
    a.box('ink',.12,8.75,.24,side*.79,-5.875,1.06,'flatbed-frame-rail');
    for(const y of [-1.7,-4.2,-7.2,-10.05]){
      a.box('paper',.025,.36,.05,side*1.328,y,1.21,'flatbed-reflector');
      a.box('ink',.08,.12,.09,side*1.28,y,1.275,'flatbed-tie-down');
    }
    a.box('metal',.12,.15,.65,side*.91,.18,.91,'landing-leg');
    a.box('ink',.36,.40,.08,side*.91,.18,.55,'landing-foot');
    a.box('ink',.64,.09,.46,side*1.1,-8.95,.41,'trailer-mudflap');
    a.box('ink',.28,.065,.13,side*.9,-10.30,1.20,'rear-light');
  }
  a.box('ink',.55,3.1,.18,0,.08,1.10,'flatbed-neck-spine');
  a.box('metal',2.25,.16,.13,0,-10.1,.63,'rear-underride-bar');
  for(const x of [-.72,.72])a.box('ink',.10,.1,.47,x,-10.1,.91,'underride-support');
}
function trailerRunningGear(T,a) {
  for(const y of [-7,-8.3])a.cylinder('ink',.105,2.5,0,y,.55,'x','trailer-axle');
  a.box('metal',1.0,.95,.035,0,1.28,1.2025,'kingpin-skid-plate');
  a.cylinder('ink',.06,.18,0,1.28,1.16,'z','trailer-kingpin',12);
}

function vanBody(T,a) {
  a.prism('paper',2.15,[[-2.64,.74],[-2.64,2.74],[-2.36,2.94],[1.29,2.94],[2.30,2.14],[2.61,1.14],[2.61,.74]],'delivery-van-body');
  a.box('ink',1.72,4.6,.16,0,0,.69,'van-chassis');
  a.face('glass',[[-.96,1.38,2.889],[.96,1.38,2.889],[.96,2.20,2.249],[-.96,2.20,2.249]],'sloped-windshield');
  for (const side of [-1,1]) {
    a.face('glass',[[side*1.084,.36,2.72],[side*1.084,1.3,2.72],[side*1.084,2.01,2.12],[side*1.084,.36,2.12]],'side-window');
    a.box('panel',.025,.035,1.61,side*1.09,.2,1.74,'van-door-seam');
    a.box('ink',.045,.25,.055,side*1.096,.49,1.9,'door-handle');
    a.box('panel',.025,.035,1.91,side*1.09,-2.14,1.69,'cargo-door-seam');
    a.box('panel',.025,2.28,.025,side*1.09,-.97,2.65,'cargo-panel-seam');
    a.box('ink',.07,4.98,.15,side*1.08,-.05,.93,'van-side-trim');
    a.bar('ink',[side*1.08,1.93,2.11],[side*1.38,1.97,2.11],.035,'mirror-arm');
    a.box('ink',.15,.24,.38,side*1.4,1.97,2.15,'mirror-housing');
    for(const y of [-1.68,1.64]) wheelArch(T,a,side*1.05,y,.42,.23,.49,'van-fender');
    a.box('ink',.46,.04,.24,side*.77,2.625,1.44,'headlight-recess');
    a.box('paper',.36,.05,.16,side*.77,2.65,1.44,'headlight-lens');
  }
  a.box('ink',1.05,.055,.34,0,2.63,1.19,'grille-recess');
  for(let i=0;i<4;i++) a.box('metal',.93,.07,.026,0,2.655,1.07+i*.075,'grille-slat');
  a.box('ink',2.22,.12,.18,0,2.61,.78,'van-bumper');
  a.box('ink',.03,.04,1.9,0,-2.674,1.78,'rear-door-seam');
  a.box('ink',2.21,.12,.18,0,-2.64,.76,'van-rear-bumper');
}

function wheelGeometry(T) {
  const a=author(T);
  // Rounded sidewalls leave the inset rim visible. All wheel geometry is X-axial.
  const profile=[[.28,-.145],[.425,-.145],[.48,-.106],[.5,-.055],[.5,.055],[.48,.106],[.425,.145],[.28,.145]];
  a.add('rubber',new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),20).rotateZ(-Math.PI/2),'rounded-tire');
  a.cylinder('metal',.306,.294,0,0,0,'x','inset-alloy-rim',20);
  for(const side of [-1,1]) {
    const ring=new T.TorusGeometry(.283,.022,3,20).rotateY(Math.PI/2).translate(side*.151,0,0);
    a.add('metal',ring,'rim-lip');
    a.cylinder('metal',.12,.075,side*.17,0,0,'x','wheel-hub',8);
    // Five strong dark radial openings and ten lugs make rotation visible in pixels.
    for(let i=0;i<5;i++) {
      const theta=i*TAU/5;
      const hole=new T.BoxGeometry(.012,.065,.15);
      hole.translate(0,0,.212).rotateX(theta).translate(side*.155,0,0);
      a.add('ink',hole,'rim-spoke-opening');
    }
    for(let i=0;i<10;i++) {
      const theta=i*TAU/10;
      a.box('ink',.018,.027,.027,side*.218,Math.sin(theta)*.081,Math.cos(theta)*.081,'wheel-lug');
    }
    // One offset valve makes an otherwise radial wheel unambiguously asymmetric.
    a.box('ink',.019,.026,.059,side*.18,.242,.072,'rim-valve');
  }
  for(const axial of [-.055,.055]) a.add('ink',new T.TorusGeometry(.493,.006,3,20).rotateY(Math.PI/2).translate(axial,0,0),'tire-groove');
  return a;
}

export function detailedWheelLayout(kind='truck',trailerAttached=true) {
  if(kind==='van') return [-1.68,1.64].flatMap(y=>[-1,1].map(side=>({x:side*1.045,y,z:.42,radius:.37})));
  return (trailerAttached?[5.78,1.18,-.12,-7.0,-8.3]:[5.78,1.18,-.12]).flatMap((y,i)=>[-1,1].flatMap(side=>
    (i===0?[1.2]:[.965,1.275]).map(x=>({x:side*x,y,z:.55,radius:TRUCK_WHEEL_RADIUS}))));
}

/** Nominal local-space envelope and support geometry. Bounds include mirrors,
 * bumpers, trailer handles and every wheel instance; allow 1e-5 m for Float32.
 * wheelCenters are axle centers (with radius). groundContacts are the nominal
 * bottom-of-tire support points, NOT axle centers or world-space positions.
 */
function modelMetadata(kind, min, max, trailerAttached=true,extra={}) {
  return supportMetadata(detailedWheelLayout(kind,trailerAttached),min,max,extra);
}
function supportMetadata(layout,min,max,extra={}) {
  const wheelCenters = Object.freeze(layout.map(wheel => Object.freeze(wheel)));
  const groundContacts = Object.freeze(wheelCenters.map((wheel, wheelIndex) => Object.freeze({
    wheelIndex, x: wheel.x, y: wheel.y, z: wheel.z - wheel.radius,
  })));
  return Object.freeze({
    bounds: Object.freeze({min: Object.freeze(min), max: Object.freeze(max)}),
    boundsToleranceMeters: 1e-5, groundContact: DETAIL_GROUND_CONTACT,
    wheelCenters, groundContacts, ...extra,
  });
}
const frozenPoint=(x,y,z)=>Object.freeze([x,y,z]);
export const TRACTOR_TRAILER_ANCHORS=Object.freeze({
  tractor:Object.freeze({fifthWheel:frozenPoint(0,1.28,1.195),steerAxle:frozenPoint(0,5.78,.55),driveAxle:frozenPoint(0,.53,.55),wheelbase:5.25}),
  trailer:Object.freeze({kingpin:frozenPoint(0,0,1.195),axle:frozenPoint(0,-8.93,.55),wheelbase:8.93}),
});
export const FLATBED_CARGO_METADATA=Object.freeze({
  supportOrigin:'pallet-bottom-center',palletLongAxis:'+X',
  palletDimensions:Object.freeze([1.2,1,.19]),cartonDimensions:Object.freeze([.805,.605,.487]),
  acceptedPalletYaw:Object.freeze([0,Math.PI/2,Math.PI,-Math.PI/2]),
  deck:Object.freeze({min:frozenPoint(-1.29,-11.53,1.33),max:frozenPoint(1.29,-2.78,1.33)}),
  deckOutline:Object.freeze([[-1.29,-11.53],[1.29,-11.53],[1.29,-2.78],[.40,.62],[-.40,.62],[-1.29,-2.78]].map(p=>Object.freeze(p))),
  // Rear pallet is directly accessible from the trailer rear. Extra slots are
  // placement candidates, not an inventory or autonomous load/unload sequence.
  slots:Object.freeze([-10.38,-8,-5.6,-3.5].map((y,i)=>Object.freeze({
    id:`deck-pallet-${i+1}`,support:frozenPoint(0,y,1.33),loadTop:frozenPoint(0,y,2.007),
    forkPocket:frozenPoint(0,y,1.425),pickBounds:Object.freeze({min:frozenPoint(-.6,y-.5,1.33),max:frozenPoint(.6,y+.5,2.007)}),
  }))),
});
export function detailedTrailerWheelLayout(){
  return detailedWheelLayout('truck',true).slice(10).map(w=>({...w,y:w.y-1.28}));
}
export const DETAIL_MODEL_METADATA = Object.freeze({
  truck: modelMetadata('truck', [-1.73, -10.389, .05], [1.73, 7.4555, 4.23]),
  tractor: modelMetadata('truck', [-1.73, -.81, .05], [1.73, 7.4555, 3.82], false,{anchors:TRACTOR_TRAILER_ANCHORS.tractor,pickAnchor:frozenPoint(0,4,1.8)}),
  van: modelMetadata('van', [-1.475, -2.7, .05], [1.475, 2.69, 2.94]),
  boxTrailer:supportMetadata(detailedTrailerWheelLayout(),[-1.502,-11.669,.05],[1.502,.705,4.23],{anchors:TRACTOR_TRAILER_ANCHORS.trailer,pickAnchor:frozenPoint(0,-5.455,2.73)}),
  flatbedTrailer:supportMetadata(detailedTrailerWheelLayout(),[-1.502,-11.6125,.05],[1.502,.66,1.344],{anchors:TRACTOR_TRAILER_ANCHORS.trailer,pickAnchor:frozenPoint(0,-5.455,1.33),cargo:FLATBED_CARGO_METADATA}),
});

/** Caller owns near/far selection and a bounded pool. Never create one per distant vehicle.
 * setDistance receives an absolute presentation travel distance in MODEL meters, not time.
 * Repeating it is pause-safe; calling it with an earlier value is deterministic replay.
 * Root vehiclePresentationPose may exaggerate road scale; divide world travel by that
 * same root scale before calling setDistance so tires do not slide against the ground.
 */
export function createDetailedVehicle({THREE:T,kind='truck',trailerAttached=true}={}) {
  if(!T?.InstancedMesh) throw new TypeError('Detailed vehicles require Three r128');
  kind=kind==='van'?'van':'truck';
  const modelKey=kind==='truck'&&!trailerAttached?'tractor':kind;
  const body=author(T); (kind==='truck'?truckBody:vanBody)(T,body,trailerAttached);
  return buildDetailedModel(T,{kind,modelKey,body,layout:detailedWheelLayout(kind,trailerAttached),metadata:DETAIL_MODEL_METADATA[modelKey],trailerAttached});
}

function buildDetailedModel(T,{kind,modelKey,body,layout,metadata,trailerAttached=false}) {
  const group=new T.Group();group.name=`detailed-${modelKey}`;
  const resources=[];
  for(const [key,parts] of body.buckets) {
    const geometry=mergeParts(T,parts),material=new T.MeshBasicMaterial({color:DETAIL_PALETTE[key],side:T.DoubleSide});
    const mesh=new T.Mesh(geometry,material);mesh.name=`${kind}-body-${key}`;
    group.add(mesh);resources.push(geometry,material);
  }
  const authoredWheels=wheelGeometry(T),batches=[];
  for(const [key,parts] of authoredWheels.buckets) {
    const geometry=mergeParts(T,parts),material=new T.MeshBasicMaterial({color:DETAIL_PALETTE[key],side:T.DoubleSide});
    const mesh=new T.InstancedMesh(geometry,material,layout.length); mesh.name=`${kind}-wheels-${key}`;
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;
    group.add(mesh);resources.push(geometry,material);batches.push(mesh);
  }
  const matrix=new T.Matrix4(),position=new T.Vector3(),quaternion=new T.Quaternion(),scale=new T.Vector3(),axis=new T.Vector3(1,0,0);
  let distance=null,disposed=false;
  function setDistance(meters=0) {
    const next=Number.isFinite(meters)?meters:0;
    if(disposed||next===distance)return;
    distance=next;
    for(let i=0;i<layout.length;i++) {
      const wheel=layout[i],ratio=wheel.radius/TRUCK_WHEEL_RADIUS;
      position.set(wheel.x,wheel.y,wheel.z);scale.setScalar(ratio);
      quaternion.setFromAxisAngle(axis,wheelAngleForDistance(next,wheel.radius));
      matrix.compose(position,quaternion,scale);
      for(const batch of batches)batch.setMatrixAt(i,matrix);
    }
    for(const batch of batches)batch.instanceMatrix.needsUpdate=true;
  }
  group.userData={kind,trailerAttached:kind==='truck'&&trailerAttached,detailLevel:'close',wheelCount:layout.length,wheelRadius:layout[0].radius,
    ...metadata,
    features:Object.freeze([...new Set([...body.features,...authoredWheels.features])]),drawCalls:group.children.length};
  setDistance(0);
  return {group,setDistance,wheelBatches:batches,wheelLayout:layout,
    metadata, getDistance:()=>distance,
    // Final scene cleanup can alternatively traverse the group, but must not do both.
    dispose(){if(disposed)return;disposed=true;resources.forEach(resource=>resource.dispose());group.parent?.remove(group);},
  };
}

/** Standalone tractor preserves the f76c601 maintenance/no-trailer contract. */
export function createDetailedTractor({THREE:T}={}){
  const model=createDetailedVehicle({THREE:T,kind:'truck',trailerAttached:false});
  model.group.userData.articulatedPart='tractor';return model;
}
/** Trailer root = kingpin XY ground projection, +Y forward, +Z up.
 * A3 supplies the rigid pose from its path/articulation solver every frame.
 * Place root so metadata.anchors.kingpin exactly meets the tractor fifthWheel.
 * No delayed following, steering, cargo spawning or ownership state lives here.
 */
export function createDetailedTrailer({THREE:T,style='flatbed'}={}){
  if(!T?.InstancedMesh)throw new TypeError('Detailed trailers require Three r128');
  if(style!=='flatbed'&&style!=='box')throw new TypeError('Unknown trailer style');
  const body=author(T);(style==='box'?boxTrailerBody:flatbedTrailerBody)(T,body);
  trailerRunningGear(T,body);
  for(const parts of body.buckets.values())for(const geometry of parts)geometry.translate(0,-1.28,0);
  const modelKey=style==='box'?'boxTrailer':'flatbedTrailer';
  const model=buildDetailedModel(T,{kind:'trailer',modelKey,body,layout:detailedTrailerWheelLayout(),metadata:DETAIL_MODEL_METADATA[modelKey]});
  model.group.userData.trailerStyle=style;model.group.userData.articulatedPart='trailer';
  return model;
}
