import {ORIGIN,SITES} from '../map/world.js';
import {createModelGeometry,disposeObject,THEME} from './models.js';
/** MapLibre 4.7 custom layer contract: render(gl, matrix), not the v5 render-arguments object. */
export function createVehicleLayer({THREE:T,maplibregl:M,getVehicles,getSelected,getView,onFailure}){
  const layer={id:'fleet-editorial-3d',type:'custom',renderingMode:'3d',
    onAdd(map,gl){
      this.map=map;this.scene=new T.Scene();this.camera=new T.Camera();const debug=gl.getExtension('WEBGL_debug_renderer_info');this.gpuDescription=debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
      this.scene.add(new T.AmbientLight(0xffffff,.8));const sun=new T.DirectionalLight(0xffffff,.5);sun.position.set(-.4,-.7,1);this.scene.add(sun);
      this.ref=M.MercatorCoordinate.fromLngLat(ORIGIN,0);const s=this.ref.meterInMercatorCoordinateUnits();
      this.world=new T.Matrix4().makeTranslation(this.ref.x,this.ref.y,this.ref.z).scale(new T.Vector3(s,-s,s));
      this.renderer=new T.WebGLRenderer({canvas:map.getCanvas(),context:gl,antialias:true});this.renderer.autoClear=false;
      this.meshes=new Map();this.capacity=0;this.matrix=new T.Matrix4();this.position=new T.Vector3();this.quaternion=new T.Quaternion();this.scale=new T.Vector3(1,1,1);this.axis=new T.Vector3(0,0,1);
      this.ring=new T.Mesh(new T.RingGeometry(11,12,36),new T.MeshBasicMaterial({color:THEME.selected,side:T.DoubleSide}));this.scene.add(this.ring);
      this.disposed=false;
      // Facility module is optional while integrating; a failed module does not blank the road view.
      import('../facilities/index.js').then(mod=>{
        if(this.disposed)return;
        const facilities=mod.createFacilities?.({THREE:T});
        const group=facilities?.isObject3D?facilities:facilities?.group;
        if(group){const placed=new Set();group.traverse(child=>{const id=child.userData?.siteId||child.name;const site=SITES.find(s=>s.id===id);if(site&&!placed.has(id)){child.position.x+=site.x;child.position.y+=site.y;placed.add(id);}});if(!placed.size){const site=SITES.find(s=>s.id==='centerpoint');group.position.x+=site.x;group.position.y+=site.y;}this.facilities=group;this.facilityAPI=facilities;this.scene.add(group);map.triggerRepaint();}
      }).catch(error=>{onFailure?.({kind:'facility-unavailable',message:'Facility cutaway is unavailable; routes and source controls remain usable.'});console.warn('Facility module',error.message);});
    },
    setFacilitySnapshot(snapshot){this.facilitySnapshot=snapshot;},
    allocate(count){
      if(count<=this.capacity)return;this.capacity=Math.max(16,2**Math.ceil(Math.log2(count)));
      for(const obj of this.meshes.values()){this.scene.remove(obj.mesh);this.scene.remove(obj.lines);obj.mesh.geometry.dispose();obj.mesh.material.dispose();obj.lines.geometry.dispose();obj.lines.material.dispose();}
      this.meshes.clear();
      for(const kind of ['truck','van']){
        const geometry=createModelGeometry(T,kind),material=new T.MeshLambertMaterial({vertexColors:true});
        const mesh=new T.InstancedMesh(geometry,material,this.capacity);mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;mesh.count=0;this.scene.add(mesh);
        const edges=new T.EdgesGeometry(geometry,25),edgePositions=Float32Array.from(edges.getAttribute('position').array);edges.dispose();
        const outlines=new T.BufferGeometry();outlines.setAttribute('position',new T.BufferAttribute(new Float32Array(edgePositions.length*this.capacity),3).setUsage(T.DynamicDrawUsage));outlines.setDrawRange(0,0);
        const lines=new T.LineSegments(outlines,new T.LineBasicMaterial({color:THEME.ink}));lines.frustumCulled=false;this.scene.add(lines);
        this.meshes.set(kind,{mesh,lines,edgePositions});
      }
    },
    render(gl,matrix){
      if(this.disposed||getView()==='2d')return;
      this.camera.projectionMatrix.fromArray(matrix).multiply(this.world);
      const vehicles=getVehicles();this.allocate(vehicles.length||1);
      // Modest exaggeration remains purely visual. Culling never advances a vehicle.
      const k=Math.min(2,Math.max(1,Math.pow(2,16.3-this.map.getZoom())));
      for(const [kind,group] of this.meshes){
        let count=0;const output=group.lines.geometry.getAttribute('position').array;
        for(const v of vehicles){if((v.model||'truck')!==kind)continue;
          this.position.set(v.x,v.y,.15);this.quaternion.setFromAxisAngle(this.axis,-v.heading);this.scale.set(k,k,k);this.matrix.compose(this.position,this.quaternion,this.scale);group.mesh.setMatrixAt(count,this.matrix);
          group.mesh.setColorAt(count,new T.Color(v.id===getSelected()?0xd9e9dc:0xffffff));
          const e=group.edgePositions,c=Math.cos(v.heading),s=Math.sin(v.heading),offset=count*e.length;
          for(let i=0;i<e.length;i+=3){output[offset+i]=v.x+(e[i]*c+e[i+1]*s)*k;output[offset+i+1]=v.y+(-e[i]*s+e[i+1]*c)*k;output[offset+i+2]=e[i+2]*k+.17;}
          count++;
        }
        group.mesh.count=count;group.mesh.instanceMatrix.needsUpdate=true;if(group.mesh.instanceColor)group.mesh.instanceColor.needsUpdate=true;
        group.lines.geometry.setDrawRange(0,count*group.edgePositions.length/3);group.lines.geometry.getAttribute('position').needsUpdate=true;
      }
      const selected=vehicles.find(v=>v.id===getSelected());this.ring.visible=!!selected;if(selected){this.ring.position.set(selected.x,selected.y,.2);this.ring.scale.setScalar(k);}
      if(this.facilitySnapshot){this.facilities?.userData?.update?.(this.facilitySnapshot);if(this.facilityAPI!==this.facilities)this.facilityAPI?.update?.(this.facilitySnapshot);}
      this.renderer.resetState();this.renderer.render(this.scene,this.camera);this.renderer.resetState();
    },
    onRemove(){if(this.disposed)return;this.disposed=true;this.facilities?.userData?.dispose?.();if(this.facilityAPI!==this.facilities)this.facilityAPI?.dispose?.();disposeObject(this.scene);this.renderer?.dispose();this.meshes?.clear();}
  };return layer;
}
