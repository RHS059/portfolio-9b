import {MAP_REGION} from './region.js';
/** Inverse ground homography in workshop-relative meters, avoiding float32 Mercator cancellation. */
export function groundInverse(matrix,region=MAP_REGION){
 const m=matrix,[x,y]=region.centerMercator,s=region.meterScale;
 const a=m[0]*s,b=-m[4]*s,c=m[0]*x+m[4]*y+m[12],d=m[1]*s,e=-m[5]*s,f=m[1]*x+m[5]*y+m[13],g=m[3]*s,h=-m[7]*s,i=m[3]*x+m[7]*y+m[15];
 const A=e*i-f*h,B=c*h-b*i,C=b*f-c*e,D=f*g-d*i,E=a*i-c*g,F=c*d-a*f,G=d*h-e*g,H=b*g-a*h,I=a*e-b*d,det=a*A+b*D+c*G;
 if(!Number.isFinite(det)||Math.abs(det)<1e-30)return null;
 return new Float32Array([A,D,G,B,E,H,C,F,I].map(v=>v/det));
}
const vertex=`attribute vec2 a_position;varying vec2 v_clip;void main(){v_clip=a_position;gl_Position=vec4(a_position,0.0,1.0);}`;
const fragment=`precision highp float;
uniform mat3 u_ground;uniform vec3 u_region;varying vec2 v_clip;
float bayer2(vec2 p){return 2.0*p.x+3.0*p.y-4.0*p.x*p.y;}
void main(){vec3 h=u_ground*vec3(v_clip,1.0);if(h.z>0.0){vec2 p=h.xy/h.z;float d=length(p);float keep=1.0-smoothstep(u_region.x,u_region.y,d);vec2 cell=mod(floor(p/u_region.z),4.0);float rank=4.0*bayer2(mod(cell,2.0))+bayer2(floor(cell/2.0));if(keep>(rank+0.5)/16.0)discard;}gl_FragColor=vec4(0.0);}`;
/** Last basemap pass clears rejected pixels to transparent; not an opaque CSS cover.
 * Edge-intersecting tiles still rasterize before this pass. Entire outside tiles are empty at source.
 * MapLibre 4.7.1 public custom-layer signature is render(gl,matrix).
 */
export function createRegionClip({region=MAP_REGION}={}){
 let program=null,buffer=null,context=null,position,ground,radii,vao=null;let frames=0;
 const release=()=>{if(!context)return;if(program)context.deleteProgram(program);if(buffer)context.deleteBuffer(buffer);if(vao)context.deleteVertexArray(vao);program=buffer=vao=null;context=null;};
 return{id:'fleet-map-region-clip',type:'custom',renderingMode:'2d',
 onAdd(map,gl){context=gl;const shaders=[];try{for(const[type,source]of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){const shader=gl.createShader(type);shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));}program=gl.createProgram();for(const shader of shaders)gl.attachShader(program,shader);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));position=gl.getAttribLocation(program,'a_position');ground=gl.getUniformLocation(program,'u_ground');radii=gl.getUniformLocation(program,'u_region');buffer=gl.createBuffer();if(gl.createVertexArray)vao=gl.createVertexArray();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);}catch(error){release();throw error;}finally{for(const shader of shaders)gl.deleteShader(shader);}},
 render(gl,matrix){if(!program||gl.isContextLost())return;const inverse=groundInverse(matrix,region);if(!inverse)return;
  if(gl.bindVertexArray)gl.bindVertexArray(vao);gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);gl.uniformMatrix3fv(ground,false,inverse);gl.uniform3f(radii,region.innerRadius,region.outerRadius,region.ditherCellMeters);
  gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);gl.disable(gl.STENCIL_TEST);gl.disable(gl.CULL_FACE);gl.disable(gl.SCISSOR_TEST);gl.colorMask(true,true,true,true);gl.depthMask(false);gl.drawArrays(gl.TRIANGLES,0,3);if(gl.bindVertexArray)gl.bindVertexArray(null);frames++;
 },onRemove:release,getMetrics:()=>({frames,ready:!!program,innerRadius:region.innerRadius,outerRadius:region.outerRadius,center:[...region.lngLat],dither:'4×4 world-anchored Bayer',edgeClip:'framebuffer alpha clear; intersecting edge tiles rasterize before clipping'})};
}
