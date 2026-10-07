import {sceneTime} from '../public/fleet-demo/src/app/story-timeline.js';
/** Use the story's visible controls; no hidden reset or exploration actions. */
export const storyState=page=>page.evaluate(()=>window.__fleetDemo.getState());
export const waitForStoryText=page=>page.waitForFunction(()=>{const t=window.__fleetDemo?.getState?.().textTransition;return !!t&&t.phase==='idle';});
export async function pauseScene(page,paused=true){if((await storyState(page)).simulation.paused!==paused)await page.locator('#pause').click();}
export async function closeStoryDialogs(page){for(const [dialog,close]of [['#source-dialog','#source-close']])if(await page.locator(dialog).isVisible())await page.locator(close).click();}
export async function navigateStory(page,index=0){await closeStoryDialogs(page);await page.locator('#story-progress').evaluate((input,time)=>{input.value=String(time);input.dispatchEvent(new Event('input',{bubbles:true}));},sceneTime(index));await waitForStoryText(page);}
export async function enterCameraView(page,selector='[data-view="iso"]'){
  await closeStoryDialogs(page);await pauseScene(page);await page.locator(selector).click();
  await page.waitForFunction(()=>window.__fleetDemo.getState().exploring);
  await page.waitForFunction(()=>!window.__fleetDemo.getMetrics().cameraMoving);
}
export async function reloadStory(page){await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__fleetDemo?.getState?.());await waitForStoryText(page);}
const siteNames={oict:'OICT · Oakland port',centerpoint:'Drone factory',depot:'Depot / workshop'};
/** A site is selected through its actual map label, zooming out with the wheel if needed. */
export async function focusSceneSite(page,id){
  if(!siteNames[id])throw new Error(`Unknown scene site ${id}`);
  await closeStoryDialogs(page);await pauseScene(page);
  const label=page.locator('.fleet-scene-label').filter({hasText:siteNames[id]});
  for(let step=0;step<12&&!await label.isVisible();step++){
    const previous=await page.evaluate(()=>window.__fleetDemo.getMetrics().viewState.zoom),box=await page.locator('#world').boundingBox();await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await page.mouse.wheel(0,650);
    await page.waitForFunction(previous=>{const m=window.__fleetDemo.getMetrics();return m.viewState.zoom<previous-.05&&!m.cameraMoving&&m.mapTilesLoaded;},previous);
  }
  await label.click();await page.waitForFunction(id=>window.__fleetDemo.getMetrics().camera.focus===id&&!window.__fleetDemo.getMetrics().cameraMoving,id);
}
/** Stop following by the supported manual pan gesture, without changing scene time. */
export async function stopCameraFollow(page){
  const box=await page.locator('#world').boundingBox(),x=box.x+box.width*.25,y=box.y+box.height*.35;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+12,y,{steps:4});await page.mouse.up();
  await page.waitForFunction(()=>!window.__fleetDemo.getState().follow&&!window.__fleetDemo.getMetrics().cameraMoving);
}
