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
  setPhase('connected-cargo');
  evidence.cargoHandoffs=[];
  const pairs=[
    {time:47.5,id:'CARGO-01-B0002',list:'cargo',from:'crane',to:'trailer',parent:'TRAILER-401'},
    {time:87.5,id:'CARGO-01-B0002',list:'cargo',from:'trailer',to:'forklift',parent:'FORKLIFT-01'},
    {time:112.5,id:'CARGO-01-B0002',list:'cargo',from:'floor-robot',to:'workcell',parent:'frame-jig'},
    {time:53.5,id:'DRONE-CARGO-01-B0001',list:'products',from:'forklift',to:'trailer',parent:'TRAILER-501'},
  ];
  for(const pair of pairs){
    const before=(await seek(pair.time-.01))[pair.list].find(x=>x.id===pair.id);
    const after=(await seek(pair.time))[pair.list].find(x=>x.id===pair.id);
    assert.ok(before?.visible&&after?.visible,pair.id);
    assert.equal(before.owner.kind,pair.from);assert.equal(after.owner.kind,pair.to);assert.equal(after.parentId,pair.parent);
    const distance=Math.hypot(...after.position.map((v,i)=>v-before.position[i]));
    assert.ok(distance<.05,`${pair.id} moved ${distance}m during its final 10ms handoff`);
    evidence.cargoHandoffs.push({id:pair.id,timeSeconds:pair.time,before,after,distanceMeters:distance});
  }
  const outbound=await seek(55.5),carrier=outbound.trucks.find(t=>t.id==='OUTBOUND-501');
  assert.ok(carrier?.loaded);assert.equal(carrier.secureProgress,1);assert.equal(carrier.stopped,false);
  const warm=await seek(0);
  const materialState=m=>({cargo:m.cargo,products:m.products,trucks:m.trucks,actors:m.actors});
  await page.waitForTimeout(250);
  assert.deepEqual(materialState(await metrics()),materialState(warm),'Pause holds all cargo, carrier and actor poses');
  await page.locator('[data-focus="centerpoint"]').click();
  await page.waitForFunction(()=>!window.__fleetDemo.getMetrics().cameraMoving);
  await page.screenshot({path:path.join(out,'cargo-factory-assembly.png'),fullPage:true});
  await seek(116.5);
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
