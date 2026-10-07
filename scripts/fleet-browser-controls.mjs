/** Use the story's visible controls; no hidden reset or exploration actions. */
export const storyState=page=>page.evaluate(()=>window.__fleetDemo.getState());
export const waitForStoryText=page=>page.waitForFunction(()=>{const t=window.__fleetDemo?.getState?.().textTransition;return !!t&&t.phase==='idle';});
export async function pauseScene(page,paused=true){if((await storyState(page)).simulation.paused!==paused)await page.locator('#pause').click();}
export async function closeStoryDialogs(page){for(const [dialog,close]of [['#source-dialog','#source-close']])if(await page.locator(dialog).isVisible())await page.locator(close).click();}
export async function navigateStory(page,index=0){await closeStoryDialogs(page);await page.locator(`[data-scene-index="${index}"]`).click();await waitForStoryText(page);}
export async function enterCameraView(page,selector='[data-view="iso"]'){
  await closeStoryDialogs(page);await pauseScene(page);await page.locator(selector).click();
  await page.waitForFunction(()=>window.__fleetDemo.getState().exploring);
  await page.waitForFunction(()=>!window.__fleetDemo.getMetrics().cameraMoving);
}
export async function reloadStory(page){await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__fleetDemo?.getState?.());await waitForStoryText(page);}
