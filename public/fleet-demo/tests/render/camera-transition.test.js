import test from 'node:test';
import assert from 'node:assert/strict';
import {createCameraController,cameraEase,CAMERA_TRANSITION_MS} from '../../src/render/camera/controller.js';
import {toLngLat,toLocal,SITES} from '../../src/render/map/world.js';
const pose=(x=100,y=50,id='TRK-104')=>Object.freeze({id,x,y});
const close=(a,b,e=1e-6)=>assert.ok(Math.abs(a-b)<e,`${a} should equal ${b}`);
function fakeMap(initial={}){
 const view={center:toLngLat([0,0]),zoom:15,pitch:0,bearing:0,...initial},jumps=[],eases=[],fits=[];let stops=0;
 return {view,jumps,eases,fits,get stops(){return stops;},getCenter:()=>({toArray:()=>[...view.center]}),getZoom:()=>view.zoom,getPitch:()=>view.pitch,getBearing:()=>view.bearing,getContainer:()=>({getBoundingClientRect:()=>({width:1200,height:800})}),jumpTo(target){jumps.push({...target,center:target.center&&[...target.center]});Object.assign(view,target);},easeTo(target){eases.push(target);},fitBounds(bounds,options){fits.push({bounds,options});},stop(){stops++;}};
}
function fixture(initial){const map=fakeMap(initial),camera=createCameraController(()=>map);camera.setFollow(true);return {map,camera};}
function start(camera,target=pose(),time=0){camera.setView('iso',{focusId:target.id});camera.update([target],time);}

test('paused scene entry eases all four camera properties in and out, then becomes idle',()=>{
 const {map,camera}=fixture(),target=pose();start(camera,target);
 assert.equal(camera.get().transitioning,true);
 assert.deepEqual(map.view.center,toLngLat([0,0]));assert.equal(map.view.zoom,15);assert.equal(map.view.pitch,0);
 const positions=[];
 for(const time of [175,350,525,700]){camera.update([target],time);positions.push(toLocal(map.view.center)[0]);}
 close(positions[0],15.625);close(positions[1],50);close(positions[2],84.375);close(positions[3],100);
 close(map.view.zoom,18.3);close(map.view.pitch,52);close(map.view.bearing,-28);
 assert.equal(camera.get().transitioning,false);
 assert.ok(positions[0]<positions[1]-positions[0]);assert.ok(positions[3]-positions[2]<positions[2]-positions[1]);
 const draws=map.jumps.length;for(const time of [716,800,2000])camera.update([target],time);assert.equal(map.jumps.length,draws);assert.equal(map.eases.length,0);
});

test('a moving focus blends into continuous damping without restarting native easeTo',()=>{
 const {map,camera}=fixture();start(camera,pose(100,0));
 for(let now=50;now<=700;now+=50)camera.update([pose(100+now*.02,0)],now);
 const x=toLocal(map.view.center)[0];close(x,114-2.4*(1-Math.exp(-700/120)));
 camera.update([pose(114.32,0)],716);const next=toLocal(map.view.center)[0];assert.ok(next>x&&next-x<.33);
 assert.equal(map.eases.length,0);assert.equal(map.view.zoom,18.3);assert.equal(map.view.pitch,52);
});

test('rapid scene changes retarget from the visible camera and discard superseded targets',()=>{
 const {map,camera}=fixture();start(camera);camera.update([pose()],250);const current=structuredClone(map.view);
 camera.setView('2d',{focusId:'old'});camera.setView('3d',{focusId:'new'});camera.update([pose(500,400,'new'),pose(-400,-400,'old')],266);
 assert.deepEqual(map.view,current,'New transition starts at the current visible view');
 camera.update([pose(500,400,'new')],966);assert.deepEqual(map.view.center,toLngLat([500,400]));assert.equal(map.view.pitch,65);assert.equal(map.view.bearing,-16);
 camera.update([pose(-400,-400,'old'),pose(500,400,'new')],1200);assert.deepEqual(map.view.center,toLngLat([500,400]));assert.equal(camera.get().focus,'new');
});

test('manual input cancels an active camera move and any pending delayed focus',()=>{
 const {map,camera}=fixture();start(camera);camera.update([pose()],250);const current=structuredClone(map.view),draws=map.jumps.length,stops=map.stops;
 camera.markManual();assert.ok(map.stops>stops);camera.update([pose()],900);assert.deepEqual(map.view,current);assert.equal(map.jumps.length,draws);
 camera.setView('iso',{focusId:'TRK-104'});camera.markManual();camera.update([pose()],1000);assert.equal(map.jumps.length,draws);
 camera.setView('iso',{focusId:'depot'});const native=map.eases.length;camera.markManual();camera.update([pose()],2000);assert.equal(map.eases.length,native);assert.equal(camera.get().manual,true);
});

test('disabling follow holds the visible view and discards any pending recenter',()=>{
 const {map,camera}=fixture();start(camera);camera.update([pose()],250);const current=structuredClone(map.view),draws=map.jumps.length;
 camera.setFollow(false);camera.update([pose(400,300)],1000);assert.deepEqual(map.view,current);assert.equal(map.jumps.length,draws);assert.equal(map.eases.length,0);
 camera.setFollow(true);camera.setFocus('TRK-104');camera.setFollow(false);camera.update([pose(500,400)],1100);assert.deepEqual(map.view,current);assert.equal(map.eases.length,0);
});

test('view-only transitions retain zoom while tracking and take the shortest bearing arc',()=>{
 const {map,camera}=fixture({bearing:170});camera.setFocus('TRK-104',false);camera.update([pose(0,0)],0);map.view.zoom=17;
 camera.setView('3d');camera.update([pose(0,0)],16);camera.update([pose(2,0)],241);
 close(map.view.zoom,17);close(map.view.bearing,257);assert.ok(toLocal(map.view.center)[0]>0);assert.equal(map.eases.length,0);
 camera.update([pose(4,0)],466);close(map.view.pitch,65);close(((map.view.bearing+180)%360+360)%360-180,-16);
});

test('reduced motion and explicit reset are immediate and leave no delayed camera work',()=>{
 const original=globalThis.matchMedia,preference={matches:false};globalThis.matchMedia=()=>preference;
 try{
  const {map,camera}=fixture();start(camera);camera.update([pose()],200);preference.matches=true;camera.update([pose()],216);assert.deepEqual(map.view.center,toLngLat([100,50]));assert.equal(map.view.pitch,52);const draws=map.jumps.length;camera.update([pose()],300);assert.equal(map.jumps.length,draws);
  camera.setView('2d',{focusId:'TRK-104'});camera.update([pose(300,100)],400);assert.deepEqual(map.view.center,toLngLat([300,100]));assert.equal(map.view.pitch,0);
  preference.matches=false;camera.setView('3d',{focusId:'TRK-104'});camera.update([pose(400,200)],500);camera.update([pose(400,200)],600);
  camera.setView('iso',{focusId:'TRK-104',animate:false});camera.update([pose(0,0)],616);assert.deepEqual(map.view.center,toLngLat([0,0]));assert.equal(map.view.pitch,52);const resetDraws=map.jumps.length;camera.update([pose(0,0)],2000);assert.equal(map.jumps.length,resetDraws);
 }finally{if(original)globalThis.matchMedia=original;else delete globalThis.matchMedia;}
});

test('an interrupted follow transition resumes from the recreated map saved view',()=>{
 let map=fakeMap();const camera=createCameraController(()=>map);camera.setFollow(true);start(camera);camera.update([pose()],300);const saved=structuredClone(map.view);
 map=null;camera.update([pose()],1000);map=fakeMap(saved);camera.update([pose()],2000);assert.deepEqual(map.view,saved);
 camera.update([pose()],2200);const midway=toLocal(map.view.center)[0];assert.ok(midway>toLocal(saved.center)[0]&&midway<100);
 camera.update([pose()],2400);assert.deepEqual(map.view.center,toLngLat([100,50]));assert.equal(map.view.pitch,52);
});

test('facilities issue one native ease using the same bounded in/out curve',()=>{
 const {map,camera}=fixture();camera.setFollow(false);camera.setView('3d',{focusId:'depot'});assert.equal(map.eases.length,1);
 const target=map.eases[0],site=SITES.find(s=>s.id==='depot');assert.deepEqual(target.center,toLngLat([site.x,site.y]));assert.equal(target.zoom,18.8);assert.equal(target.pitch,65);assert.equal(target.bearing,-16);assert.equal(target.duration,CAMERA_TRANSITION_MS);assert.equal(target.easing,cameraEase);
 camera.update([pose()],200);camera.update([pose()],1000);assert.equal(map.eases.length,1);
 camera.setView('iso',{focusId:'oict'});assert.equal(map.fits.length,1);assert.equal(map.fits[0].options.linear,true);assert.equal(map.fits[0].options.easing,cameraEase);
 close(cameraEase(0),0);close(cameraEase(.5),.5);close(cameraEase(1),1);assert.ok(cameraEase(.01)<.001);assert.ok(1-cameraEase(.99)<.001);
});
