import assert from 'node:assert/strict';
import path from 'node:path';

/** Browser checks for the connected scene, called only after its adapter is enabled. */
export async function exerciseCargoFlow({page,evidence,out,setPhase=()=>{}}){
  const state=()=>page.evaluate(()=>window.__fleetDemo.getState());
  const metrics=()=>page.evaluate(()=>window.__fleetDemo.getMetrics().cargoProcessRender);
  const facts=s=>({readings:s.scenario.readings,services:s.scenario.serviceFacts,policies:s.scenario.policies,exclusions:s.scenario.exclusions});
  const initial=await state(),preserved=facts(initial);
  if(!initial.simulation.paused)await page.locator('#pause').click();
  const seek=async time=>{
    await page.evaluate(t=>window.__fleetDemo.seekScene(t),time);
    await page.waitForFunction(t=>{
      const s=window.__fleetDemo.getState(),m=window.__fleetDemo.getMetrics().cargoProcessRender;
      return s.simulation.paused&&s.simulation.timeSeconds===t&&m?.active&&m.errors.length===0;
    },time);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const m=await metrics();
    assert.deepEqual(m.errors,[]);
    assert.equal(m.port.cargoRenderer,'external');
    assert.ok(m.port.cargo.every(item=>!item.visible),'Port assets must not draw duplicate tracked cargo');
    for(const item of [...m.cargo,...m.products]){
      if(!item.visible)continue;
      assert.equal(item.bindingStatus,'bound',item.id);
      assert.equal(item.visibleInstanceCount,1,item.id);
      assert.equal(item.parentId,item.owner.id,item.id);
      assert.ok(item.position.length===3&&item.position.every(Number.isFinite),item.id);
    }
    assert.deepEqual(facts(await state()),preserved,'Visual seeking must preserve readings, services and source settings');
    return m;
  };
  const frameMaterial=async(id,list,site)=>{
    await page.locator(`[data-focus="${site}"]`).click();
    await page.waitForFunction(()=>!window.__fleetDemo.getMetrics().cameraMoving);
    for(let step=0;step<7;step++){
      const point=await page.evaluate(({id,list})=>{const item=window.__fleetDemo.getMetrics().cargoProcessRender[list].find(x=>x.id===id);return window.__fleetDemo.projectScenePoint(item.position);},{id,list});
      const box=await page.locator('#world').boundingBox();
      assert.ok(point&&Number.isFinite(point.x)&&Number.isFinite(point.y),'Material must project to a visible scene point');
      assert.ok(point.x>=0&&point.x<=box.width&&point.y>=0&&point.y<=box.height,`${id} is outside the focused site`);
      await page.mouse.move(box.x+point.x,box.y+point.y);await page.mouse.down();
      await page.mouse.move(box.x+box.width/2,box.y+box.height/2,{steps:8});await page.mouse.up();
      await page.waitForFunction(()=>!window.__fleetDemo.getMetrics().cameraMoving);
      if(await page.evaluate(()=>window.__fleetDemo.getMetrics().viewState.zoom>=21))break;
      const previousZoom=await page.evaluate(()=>window.__fleetDemo.getMetrics().viewState.zoom);
      await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.wheel(0,-850);
      await page.waitForFunction(previous=>{const m=window.__fleetDemo.getMetrics();return m.viewState.zoom>previous+.05&&!m.cameraMoving&&m.mapTilesLoaded;},previousZoom);
    }
    assert.ok(await page.evaluate(()=>window.__fleetDemo.getMetrics().viewState.zoom>=21),'Contact captures need inspection-scale framing');
  };
  const capture=async(name)=>{await page.screenshot({path:path.join(out,name),fullPage:true});return name;};
  setPhase('connected-cargo');
  evidence.cargoHandoffs=[];
  const pairs=[
    {time:47.5,id:'CARGO-01-B0002',list:'cargo',from:'crane',to:'trailer',parent:'TRAILER-401',site:'oict',name:'ship-to-flatbed'},
    {time:87.5,id:'CARGO-01-B0002',list:'cargo',from:'trailer',to:'forklift',parent:'FORKLIFT-01',site:'centerpoint',name:'forklift-pickup'},
    {time:112.5,id:'CARGO-01-B0002',list:'cargo',from:'floor-robot',to:'workcell',parent:'frame-jig',site:'centerpoint',name:'amr-intake'},
    {time:53.5,id:'DRONE-CARGO-01-B0001',list:'products',from:'forklift',to:'trailer',parent:'TRAILER-501',site:'centerpoint',name:'outbound-load'},
    {time:19.5,id:'DRONE-CARGO-01-B0001',list:'products',from:'workcell',to:'floor-robot',parent:'AMR-01',site:'centerpoint',name:'output-carrier'},
    {time:27.5,id:'DRONE-CARGO-01-B0001',list:'products',from:'floor-robot',to:'qa-station',parent:'QA-01',site:'centerpoint',name:'qa-intake'},
    {time:35.5,id:'DRONE-CARGO-01-B0001',list:'products',from:'qa-station',to:'floor-robot',parent:'AMR-01',site:'centerpoint',name:'qa-release'},
    {time:43.5,id:'DRONE-CARGO-01-B0001',list:'products',from:'floor-robot',to:'dispatch-staging',parent:'DISPATCH-01',site:'centerpoint',name:'dispatch-staging'},
  ];
  for(const pair of pairs){
    const before=(await seek(pair.time-.01))[pair.list].find(x=>x.id===pair.id);
    await frameMaterial(pair.id,pair.list,pair.site);
    const beforeCapture=await capture(`cargo-${pair.name}-before.png`);
    const after=(await seek(pair.time))[pair.list].find(x=>x.id===pair.id);
    const afterCapture=await capture(`cargo-${pair.name}-after.png`);
    assert.ok(before?.visible&&after?.visible,pair.id);
    assert.equal(before.owner.kind,pair.from);assert.equal(after.owner.kind,pair.to);assert.equal(after.parentId,pair.parent);
    const distance=Math.hypot(...after.position.map((v,i)=>v-before.position[i]));
    assert.ok(distance<.05,`${pair.id} moved ${distance}m during its final 10ms handoff`);
    evidence.cargoHandoffs.push({id:pair.id,timeSeconds:pair.time,before,after,distanceMeters:distance,captures:[beforeCapture,afterCapture]});
  }
  const outbound=await seek(55.5),carrier=outbound.trucks.find(t=>t.id==='OUTBOUND-501');
  assert.ok(carrier?.loaded);assert.equal(carrier.secureProgress,1);assert.equal(carrier.stopped,false);
  const warm=await seek(0);
  const materialState=m=>({cargo:m.cargo,products:m.products,trucks:m.trucks,actors:m.actors});
  await page.waitForTimeout(250);
  assert.deepEqual(materialState(await metrics()),materialState(warm),'Pause holds all cargo, carrier and actor poses');
  await page.locator('[data-focus="centerpoint"]').click();
  await page.waitForFunction(()=>!window.__fleetDemo.getMetrics().cameraMoving);
  await frameMaterial('CARGO-01-B0001','cargo','centerpoint');
  await page.screenshot({path:path.join(out,'cargo-factory-assembly.png'),fullPage:true});
  await seek(114);await frameMaterial('CARGO-01-B0002','cargo','centerpoint');
  const openingContact=await page.evaluate(()=>window.__fleetDemo.getMetrics().factoryAssemblyState.find(cell=>cell.id==='frame-jig'));
  assert.equal(openingContact.contactEngaged,true);assert.equal(openingContact.armAction,'open-box');
  await capture('cargo-box-gripper-contact.png');
  await seek(17.5);await frameMaterial('DRONE-CARGO-01-B0001','products','centerpoint');
  const outputContact=await page.evaluate(()=>window.__fleetDemo.getMetrics().factoryAssemblyState.find(cell=>cell.id==='frame-jig'));
  assert.equal(outputContact.contactEngaged,true);assert.equal(outputContact.contactAccepted,true);assert.equal(outputContact.carryingProduct,true);
  await capture('cargo-output-carrier-contact.png');
  evidence.cargoMechanismContact={opening:openingContact,output:outputContact};
  await seek(116.5);await frameMaterial('CARGO-01-B0002','cargo','centerpoint');
  await page.screenshot({path:path.join(out,'cargo-box-opening.png'),fullPage:true});
  await seek(33.5);await page.locator('[data-focus="oict"]').click();
  await page.waitForFunction(()=>!window.__fleetDemo.getMetrics().cameraMoving);
  await page.screenshot({path:path.join(out,'cargo-ship-unloading.png'),fullPage:true});
  await page.locator('#reset').click();
  if(!(await state()).simulation.paused)await page.locator('#pause').click();
  const reset=await seek(0);
  assert.deepEqual(materialState(reset),materialState(warm),'Reset reproduces the populated startup, identities and poses');
  evidence.checks.push('Connected cargo has one visible owner through crane, trailer, forklift, workcell and outbound transfers; pause/reset preserve poses and service facts');
  if(!initial.simulation.paused)await page.locator('#pause').click();
}
