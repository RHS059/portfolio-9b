import { createDiagramBuilder, FACILITY_THEME } from '../depot/geometry.js';
import { createPortLayout } from './layout.js';
import { createPortProcessLayouts } from './process-layout.js';
import { createPortProcessAssets } from './process-assets.js';
import { createPortProcessController } from './process-controller.js';

export const PORT_DIMENSIONS = Object.freeze({ width:1902.772, depth:1296.4, height:50 });
const identityBounds=()=>({min:[0,0,0],max:[0,0,0]});

function instanceBoxes(T,boxes,name) {
  const geometry=new T.BoxGeometry(1,1,1),material=new T.MeshLambertMaterial({color:0xffffff});
  const mesh=new T.InstancedMesh(geometry,material,Math.max(1,boxes.length));mesh.name=name;mesh.count=boxes.length;mesh.frustumCulled=false;
  const matrix=new T.Matrix4(),position=new T.Vector3(),scale=new T.Vector3(),quaternion=new T.Quaternion(),axis=new T.Vector3(0,0,1);
  const edges=new T.EdgesGeometry(geometry),unit=edges.getAttribute('position').array,lines=[];
  for(let i=0;i<boxes.length;i++){
    const b=boxes[i];position.set(b.x,b.y,b.z);scale.set(b.w,b.d,b.h);quaternion.setFromAxisAngle(axis,b.angle);
    matrix.compose(position,quaternion,scale);mesh.setMatrixAt(i,matrix);mesh.setColorAt(i,new T.Color(i%3?FACILITY_THEME.face:FACILITY_THEME.paper));
    for(let j=0;j<unit.length;j+=3){const p=new T.Vector3(unit[j],unit[j+1],unit[j+2]).applyMatrix4(matrix);lines.push(p.x,p.y,p.z);}
  }
  edges.dispose();mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
  const edgeGeometry=new T.BufferGeometry();edgeGeometry.setAttribute('position',new T.Float32BufferAttribute(lines,3));edgeGeometry.computeBoundingSphere();
  const outline=new T.LineSegments(edgeGeometry,new T.LineBasicMaterial({color:FACILITY_THEME.ink}));outline.name=name+'-outlines';
  const group=new T.Group();group.name=name+'-level';group.add(mesh,outline);return group;
}

/** Geography is injected; the renderer alone applies the reference-point translation. */
export function createPort({ THREE, geography, processAnchorBindings }) {
  const T=THREE,group=new T.Group();group.name='oict';
  group.userData={siteId:'oict',kind:'port',fictional:true,label:'OICT mapped extent · illustrative equipment',dimensions:PORT_DIMENSIONS,bounds:identityBounds(),status:'geography-unavailable'};
  let disposed=false;
  group.userData.update=()=>{};
  group.userData.dispose=()=>{disposed=true;};
  if(!geography)return group;
  const layout=createPortLayout(geography),processLayouts=createPortProcessLayouts(layout),b=createDiagramBuilder(T);
  const processAssets=processLayouts.map(layout=>createPortProcessAssets({THREE:T,layout}));
  processAssets.forEach(asset=>group.add(asset.group));
  const processController=createPortProcessController({THREE:T,group,assets:processAssets,layouts:processLayouts});
  if(processAnchorBindings)processController.bind(processAnchorBindings);
  group.userData.update=snapshot=>{if(!disposed){processController.update(snapshot);group.userData.processStatus=processController.getStatus();}};
  group.userData.dispose=()=>{disposed=true;processController.dispose();};
  b.line([...layout.footprint,layout.footprint[0]].map(([x,y])=>[x,y,.12]));
  b.line(layout.quay.map(([x,y])=>[x,y,.18]));
  // No solid pad, invented road/fence or water plane. The illustrative vessel is seaward.
  group.add(b.finish('mapped-terminal-outline'));
  const overview=[],detail=[];
  for(const row of layout.rows){
    overview.push({x:row.center[0],y:row.center[1],z:row.layers*2.9/2,w:row.width,d:row.depth,h:row.layers*2.9,angle:layout.rotationZ});
    for(let col=0;col<4;col++)for(let side=0;side<2;side++)for(let layer=0;layer<row.layers;layer++){
      const u=(col-1.5)*13.7,v=(side-.5)*4.2;
      detail.push({x:row.center[0]+layout.along[0]*u+layout.landward[0]*v,y:row.center[1]+layout.along[1]*u+layout.landward[1]*v,z:layer*2.9+1.45,w:12.2,d:2.44,h:2.9,angle:layout.rotationZ});
    }
  }
  const far=instanceBoxes(T,overview,'representative-container-rows'),near=instanceBoxes(T,detail,'representative-containers');near.visible=false;group.add(far,near);
  const craneTemplate=createDiagramBuilder(T);
  for(const x of [-10,10])for(const y of [-13,13])craneTemplate.box(1.2,1.2,36,x,y,18,'muted');
  for(const y of [-13,13])craneTemplate.box(24,1.5,1.5,0,y,36.75,'paper');
  craneTemplate.box(1.8,79,1.5,0,-24.5,40,'paper');
  craneTemplate.box(1.4,1.4,8,0,0,44,'muted');
  craneTemplate.line([[0,-58,40],[0,0,48],[0,13,40]]);

  const template=craneTemplate.finish('gantry-template');
  // Batch the small crane set by material, keeping transparent surfaces out.
  for(const child of template.children){
    const p=child.geometry.getAttribute('position'),positions=[],normals=[],normal=child.geometry.getAttribute('normal');
    for(const crane of layout.cranes)for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i);positions.push(crane.center[0]+layout.along[0]*x+layout.landward[0]*y,crane.center[1]+layout.along[1]*x+layout.landward[1]*y,p.getZ(i));
      if(normal){const nx=normal.getX(i),ny=normal.getY(i);normals.push(layout.along[0]*nx+layout.landward[0]*ny,layout.along[1]*nx+layout.landward[1]*ny,normal.getZ(i));}
    }
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));if(normal)geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.computeBoundingSphere();
    const object=child.isLineSegments?new T.LineSegments(geometry,child.material):new T.Mesh(geometry,child.material);object.name='quay-'+child.name;group.add(object);child.geometry.dispose();
  }
  const reach=layout.cranes.flatMap(c=>[-1,1].map(x=>[c.center[0]+layout.along[0]*x*.9-layout.landward[0]*64,c.center[1]+layout.along[1]*x*.9-layout.landward[1]*64]));
  const bounds={min:[Math.min(layout.bounds.min[0],...processLayouts.map(l=>l.bounds.min[0]),...reach.map(p=>p[0])),Math.min(layout.bounds.min[1],...processLayouts.map(l=>l.bounds.min[1]),...reach.map(p=>p[1])),Math.min(0,...processLayouts.map(l=>l.bounds.min[2]))],max:[Math.max(layout.bounds.max[0],...processLayouts.map(l=>l.bounds.max[0])),Math.max(layout.bounds.max[1],...processLayouts.map(l=>l.bounds.max[1])),50]};
  group.userData={...group.userData,status:'mapped',layout,bounds,mappedBounds:layout.bounds,detailLevel:'overview',representativeRowCount:layout.rows.length,representativeContainerCount:detail.length,schematicCraneCount:layout.cranes.length,
    approximation:layout.approximation,processAnchors:processLayouts,
    processStatus:processLayouts.length?'idle-awaiting-snapshot':'berth-unavailable',
    setProcessAnchorBindings:bindings=>processController.bind(bindings),
    getProcessInspection:()=>processController.inspect(),
    setCargoRenderer:mode=>processController.setCargoRenderer(mode),
    setDetailLevel(level){if(disposed)return;if(level!=='overview'&&level!=='detail')return;far.visible=level==='overview';near.visible=level==='detail';group.userData.detailLevel=level;},
  };
  return group;
}
