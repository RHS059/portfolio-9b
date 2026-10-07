import {createFactoryGeometry} from './geometry.js';
import {createAssemblyProduct} from './product.js';

const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const PRODUCT_CARRIER=freeze({
  dimensions:{width:2.8,depth:2.4,height:.17},
  bounds:{min:[-1.4,-1.2,0],max:[1.4,1.2,.17]},
  combinedBounds:{min:[-1.4,-1.2,0],max:[1.4,1.2,.98]},
  carrierModel:'original-drone-carrier-v1',supportOrigin:'carrier-bottom',droneBaseOffset:.17,
  gripPoint:[-1.25,0,.17],gripHalfWidth:.095,
  gripContacts:[[-1.31,0,.14],[-1.19,0,.14]],
  gripBlock:{center:[-1.25,0,.12],size:[.12,.12,.10]},
  forkPocket:{supportZ:.10,minZ:.04,maxZ:.10,forkCentersX:[-.30,.30]},
});

/** Original open transport frame. No cargo identity, placement, clock or custody. */
export function createProductCarrier({THREE}) {
  const b=createFactoryGeometry(THREE),root=new THREE.Group();root.name='drone-transport-carrier';
  // Crossed lower runners keep a continuous bottom-support plane for either roller direction.
  for(const x of[-1.25,-.493,.493,1.25])b.box(.10,2.20,.04,x,0,.02,'muted');
  for(const y of[-1.05,-.48,.48,1.05])b.box(2.60,.10,.04,0,y,.02,'muted');
  // Open upper frame and vertical spacers leave two fork pockets through the center.
  b.box(.08,2.4,.12,1.36,0,.11,'face');
  for(const y of[-.775,.775])b.box(.08,.85,.12,-1.36,y,.11,'face');
  for(const y of[-1.16,1.16])b.box(2.8,.08,.12,0,y,.11,'face');
  for(const y of[-.48,.48])b.box(2.72,.10,.07,0,y,.135,'face');
  for(const x of[-.493,.493])b.box(.12,1.35,.07,x,0,.135,'face');
  for(const x of[-1.25,-.493,.493,1.25])for(const y of[-1.05,1.05])b.box(.10,.10,.06,x,y,.07,'muted');
  // Accessible side grip, with a notch for the jaws and no aircraft above the tool housing.
  for(const y of[-.28,.28])b.box(.26,.08,.08,-1.25,y,.10,'face');
  b.box(.12,.12,.10,-1.25,0,.12,'dark');
  b.box(.07,.56,.07,-1.25,0,.075,'muted');
  const frame=b.finish('product-carrier-frame');root.add(frame);
  const bodyMount=new THREE.Group();bodyMount.name='carrier-drone-mount';bodyMount.position.z=.17;root.add(bodyMount);
  const body=createAssemblyProduct({THREE});bodyMount.add(body);
  const gripMount=new THREE.Group();gripMount.name='carrier-side-grip';gripMount.position.fromArray(PRODUCT_CARRIER.gripPoint);root.add(gripMount);
  let disposed=false;
  root.userData={kind:'product-carrier',illustrative:true,...PRODUCT_CARRIER,frameBounds:PRODUCT_CARRIER.bounds,frameDimensions:PRODUCT_CARRIER.dimensions,bounds:PRODUCT_CARRIER.combinedBounds,dimensions:{width:2.8,depth:2.4,height:.98},body,bodyMount,gripMount,
    setProgress(progress){if(!disposed)body.userData.setProgress(progress);},
    setAssemblyProgress(progress){if(!disposed)body.userData.setProgress(progress);},
    dispose(){if(disposed)return;disposed=true;body.userData.dispose();}
  };
  return root;
}
