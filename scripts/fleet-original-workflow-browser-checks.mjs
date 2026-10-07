import assert from 'node:assert/strict';
import {navigateStory} from './fleet-browser-controls.mjs';
import {sceneTime} from '../public/fleet-demo/src/app/story-timeline.js';

/** Exercise the observed local WEX repair independently of the odometer scenario. */
export async function checkOriginalWorkflow(page,{capture=async()=>{}}={}){
 const state=()=>page.evaluate(()=>window.__fleetDemo.getState());
 await navigateStory(page,6);
 const truth=JSON.stringify((await state()).scenario),preview=page.locator('#original-workflow-preview');
 assert.equal(await preview.locator('.ow-preview').getAttribute('role'),'img');
 assert.equal(await preview.locator('.ow-app').getAttribute('inert'),'');
 for(const [seconds,phase] of [[0,'unmatched'],[5,'asset-dialog'],[7,'asset-picker'],[12,'asset-chosen'],[16,'linked'],[21,'unmatched']]){
  await page.locator('#story-progress').evaluate((input,time)=>{input.value=String(time);input.dispatchEvent(new Event('input',{bubbles:true}));},sceneTime(6)+seconds/1.5);
  assert.equal(await preview.locator('[data-workflow-phase]').getAttribute('data-workflow-phase'),phase);
 }
 await capture('original-workflow-sidebar.png');
 await page.locator('#open-original-workflow').click();
 const dialog=page.locator('[data-original-workflow-dialog]');
 assert.equal(await dialog.isVisible(),true);assert.equal((await state()).simulation.paused,true);
 assert.equal(await page.locator('#story-transport').isVisible(),false);
 await dialog.locator('[data-original-play]').click();
 assert.equal(await dialog.locator('[data-original-play]').innerText(),'Play loop');
 await dialog.locator('[data-original-reset]').click();
 await capture('original-workflow-modal-unmatched.png');
 const openAsset=async()=>dialog.locator('[data-action="open-asset"]').click();
 await openAsset();await dialog.locator('[data-action="open-picker"]').click();
 assert.equal(await dialog.getByRole('heading',{name:'Select an Item'}).isVisible(),true);
 await capture('original-workflow-modal-picker.png');
 await page.keyboard.press('Escape');assert.equal(await dialog.isVisible(),true);
 assert.equal(await dialog.getByRole('heading',{name:'Select an Asset'}).isVisible(),true);
 await page.keyboard.press('Escape');assert.equal(await dialog.isVisible(),true);
 assert.equal(await dialog.locator('.ow-link-dialog').count(),0);
 await openAsset();await dialog.locator('[data-action="open-picker"]').click();
 await dialog.getByRole('button',{name:'Select TRK-104: 2019 Ford F-150',exact:true}).click();
 await dialog.locator('[data-action="set-asset"]').click();
 assert.equal(await dialog.locator('tr[data-record="DEMO-002"]').getAttribute('data-linked'),'true');
 assert.equal(await dialog.getByRole('button',{name:'Go To Fuel Log'}).isDisabled(),true);
 assert.match(await dialog.locator('.ow-toast').innerText(),/All changes have been saved/);
 assert.equal(JSON.stringify((await state()).scenario),truth);
 await capture('original-workflow-modal-linked.png');
 await dialog.locator('[data-original-close]').focus();await page.keyboard.press('Shift+Tab');
 assert.equal(await dialog.locator('[data-original-reset]').evaluate(el=>el===document.activeElement),true);
 await page.keyboard.press('Tab');assert.equal(await dialog.locator('[data-original-close]').evaluate(el=>el===document.activeElement),true);
 await page.keyboard.press('Escape');assert.equal(await dialog.isVisible(),false);
 assert.equal(await page.locator('#open-original-workflow').evaluate(el=>el===document.activeElement),true);
 assert.equal(await page.locator('#story-transport').isVisible(),true);assert.equal((await state()).simulation.paused,true);
 for(let i=0;i<2;i++){
  await page.locator('#open-original-workflow').click();
  assert.equal(await dialog.locator('tr[data-record="DEMO-002"]').getAttribute('data-linked'),'false');
  await dialog.locator('[data-original-close]').click();assert.equal(await dialog.isVisible(),false);
 }
 const viewport=page.viewportSize();await page.setViewportSize({width:390,height:844});
 await page.locator('#open-original-workflow').click();await dialog.locator('[data-original-play]').click();await dialog.locator('[data-original-reset]').click();
 const box=await dialog.boundingBox();assert.ok(box&&box.x>=0&&box.x+box.width<=390,'Modal fits the narrow viewport');
 const table=dialog.locator('.ow-table-scroll').first();assert.equal(await table.evaluate(el=>el.scrollWidth>el.clientWidth),true);
 await table.evaluate(el=>{el.scrollLeft=el.scrollWidth;});assert.ok(await table.evaluate(el=>el.scrollLeft)>0,'Dense records scroll inside the dialog');
 await capture('original-workflow-modal-mobile.png');await page.keyboard.press('Escape');await page.setViewportSize(viewport);
 await page.emulateMedia({reducedMotion:'reduce'});await navigateStory(page,6);await page.locator('#open-original-workflow').click();
 assert.equal(await dialog.locator('[data-original-play]').innerText(),'Play loop');
 assert.equal(await dialog.locator('.ow-cursor').isVisible(),false);
 await page.keyboard.press('Escape');await page.emulateMedia({reducedMotion:'no-preference'});
 assert.equal(JSON.stringify((await state()).scenario),truth);
}
