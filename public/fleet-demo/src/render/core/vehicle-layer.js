import {vehiclePresentationPose} from './presentation-pose.js';
import {placeFacilityGroups,workshopSupportElevation,WORKSHOP_SURFACES} from './facilities-adapter.js';
import {ORIGIN,SITES} from '../map/world.js';
import {createModelGeometry,createModelBuckets,disposeObject,THEME} from './models.js';
/** MapLibre 4.7 custom layer contract: render(gl, matrix), not the v5 render-arguments object. */
export function createVehicleLayer({THREE:T,maplibregl:M,getVehicles,getSelected,getView,onFailure,canvas}){
  const layer={id:'fleet-editorial-3d',type:'custom',renderingMode:'3d',
    onAdd(map,gl){
      this.map=map;this.scene=new T.Scene();this.camera=new T.Camera();const debug=gl.getExtension('WEBGL_debug_renderer_info');this.gpuDescription=debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
      this.scene.add(new T.AmbientLight(0xffffff,.8));const sun=new T.DirectionalLight(0xffffff,.5);sun.position.set(-.4,-.7,1);this.scene.add(sun);
      this.ref=M.MercatorCoordinate.fromLngLat(ORIGIN,0);const s=this.ref.meterInMercatorCoordinateUnits();
      this.world=new T.Matrix4().makeTranslation(this.ref.x,this.ref.y,this.ref.z).scale(new T.Vector3(s,-s,s));
      this.renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:false});this.renderer.setClearColor(0x000000,0);this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.5));this.projectionReady=false;this.projectionRevision=0;this.lastDrawKey=null;this.drawFrames=0;this.resize();
      this.meshes=new Map();this.capacity=0;this.matrix=new T.Matrix4();this.position=new T.Vector3();this.quaternion=new T.Quaternion();this.scale=new T.Vector3(1,1,1);this.axis=new T.Vector3(0,0,1);
      this.ring=new T.Mesh(new T.RingGeometry(11,12,36),new T.MeshBasicMaterial({color:THEME.selected,side:T.DoubleSide}));this.scene.add(this.ring);
      this.disposed=false;this.facilityState='loading';this.baySupportElevation=WORKSHOP_SURFACES.railTop;
      // Facility module is optional while integrating; a failed module does not blank the road view.
      import('../facilities/index.js').then(mod=>{
        if(this.disposed)return;
        const facilities=mod.createFacilities?.({THREE:T});
        const group=facilities?.isObject3D?facilities:facilities?.group;
        if(group){const placed=placeFacilityGroups(group);if(!placed){const site=SITES.find(s=>s.id==='centerpoint');group.position.x+=site.x;group.position.y+=site.y;}this.facilities=group;this.facilityState='ready';this.facilityAPI=facilities;this.scene.add(group);this.baySupportElevation=workshopSupportElevation(T,group);this.invalidate();map.triggerRepaint();}
      }).catch(error=>{this.facilityState='unavailable';onFailure?.({kind:'facility-unavailable',message:'Facility cutaway is unavailable; routes and source controls remain usable.'});console.warn('Facility module',error.message);});
    },
    setFacilitySnapshot(snapshot){this.facilitySnapshot=snapshot;},
    allocate(count){
      if(count<=this.capacity)return;this.capacity=Math.max(16,2**Math.ceil(Math.log2(count)));
      for(const obj of this.meshes.values()){for(const mesh of obj.parts){this.scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();}this.scene.remove(obj.lines);obj.lines.geometry.dispose();obj.lines.material.dispose();}
      this.meshes.clear();
      for(const kind of ['truck','van']){
        const parts=createModelBuckets(T,kind).map(({geometry,color})=>{const mesh=new T.InstancedMesh(geometry,new T.MeshBasicMaterial({color,side:T.DoubleSide}),this.capacity);mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;mesh.count=0;this.scene.add(mesh);return mesh;});
        const geometry=createModelGeometry(T,kind),edges=new T.EdgesGeometry(geometry,25),edgePositions=Float32Array.from(edges.getAttribute('position').array);edges.dispose();geometry.dispose();
        const outlines=new T.BufferGeometry();outlines.setAttribute('position',new T.BufferAttribute(new Float32Array(edgePositions.length*this.capacity),3).setUsage(T.DynamicDrawUsage));outlines.setDrawRange(0,0);
        const lines=new T.LineSegments(outlines,new T.LineBasicMaterial({color:THEME.ink}));lines.frustumCulled=false;this.scene.add(lines);
        this.meshes.set(kind,{parts,lines,edgePositions});
      }
    },
    invalidate(){this.lastDrawKey=null;},
    resize(){this.invalidate();if(this.renderer){this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.5));const r=this.map.getContainer().getBoundingClientRect();this.renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);}},
    render(gl,matrix){if(!this.disposed){this.camera.projectionMatrix.fromArray(matrix).multiply(this.world);this.projectionReady=true;this.projectionRevision++;}},
    draw(){
      if(this.disposed||!this.projectionReady||getView()==='2d')return;
      const vehicles=getVehicles();const key=this.facilitySnapshot?.paused?`${this.projectionRevision}|${getSelected()}|${this.facilitySnapshot.stage}|${this.facilitySnapshot.issueActive}|${this.facilitySnapshot.authorityResolved}|${JSON.stringify(vehicles)}`:null;if(key&&key===this.lastDrawKey)return;this.lastDrawKey=key;this.allocate(vehicles.length||1);
      // Modest exaggeration remains purely visual. Culling never advances a vehicle.
      const k=Math.min(2,Math.max(1,Math.pow(2,16.3-this.map.getZoom())));
      for(const [kind,group] of this.meshes){
        let count=0;const output=group.lines.geometry.getAttribute('position').array;
        for(const v of vehicles){if((v.model||'truck')!==kind)continue;
          const pose=vehiclePresentationPose(v,k,this.baySupportElevation),scale=pose.scale;this.position.set(v.x,v.y,pose.z);this.quaternion.setFromAxisAngle(this.axis,-v.heading);this.scale.set(scale,scale,scale);this.matrix.compose(this.position,this.quaternion,this.scale);for(const mesh of group.parts)mesh.setMatrixAt(count,this.matrix);
          const e=group.edgePositions,c=Math.cos(v.heading),s=Math.sin(v.heading),offset=count*e.length;
          for(let i=0;i<e.length;i+=3){output[offset+i]=v.x+(e[i]*c+e[i+1]*s)*scale;output[offset+i+1]=v.y+(-e[i]*s+e[i+1]*c)*scale;output[offset+i+2]=e[i+2]*scale+pose.z+.02;}
          count++;
        }
        for(const mesh of group.parts){mesh.count=count;mesh.instanceMatrix.needsUpdate=true;}
        group.lines.geometry.setDrawRange(0,count*group.edgePositions.length/3);group.lines.geometry.getAttribute('position').needsUpdate=true;
      }
      const selected=vehicles.find(v=>v.id===getSelected());this.ring.visible=!!selected;if(selected){const pose=vehiclePresentationPose(selected,k,this.baySupportElevation);this.ring.position.set(selected.x,selected.y,selected.routeId==='depot-bay'?this.baySupportElevation+.015:.2);this.ring.scale.setScalar(pose.scale);}
      if(this.facilitySnapshot){this.facilities?.userData?.update?.(this.facilitySnapshot);if(this.facilityAPI!==this.facilities)this.facilityAPI?.update?.(this.facilitySnapshot);}
      this.renderer.render(this.scene,this.camera);this.drawFrames++;
    },
    onRemove(){if(this.disposed)return;this.disposed=true;this.facilities?.userData?.dispose?.();if(this.facilityAPI!==this.facilities)this.facilityAPI?.dispose?.();disposeObject(this.scene);this.renderer?.dispose();this.renderer?.forceContextLoss();this.meshes?.clear();}
  };return layer;
}
