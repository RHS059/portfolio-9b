import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [shell,standalone,app,modal]=await Promise.all([read('components/fleet-demo-shell.tsx'),read('public/fleet-demo/index.html'),read('public/fleet-demo/src/app/index.js'),read('public/fleet-demo/src/ui/original-workflow/index.js')]);
test('both routes place the original application over the map and keep the process narrative separate',()=>{
 for(const markup of [shell,standalone]){
  const solution=markup.slice(markup.indexOf('data-story-sidebar="solution"'),markup.indexOf('data-story-sidebar="agents"'));
  const overlay=markup.slice(markup.indexOf('data-story-overlay="solution"'),markup.indexOf('data-story-overlay="learning"'));
  for(const id of ['original-workflow-preview','open-original-workflow']){assert.ok(overlay.includes(`id="${id}"`));assert.ok(!solution.includes(`id="${id}"`));assert.equal((markup.match(new RegExp(`id="${id}"`,'g'))||[]).length,1);}
  for(const fact of ['How I got to the design','support agents and account managers','interviewed our import vendors','mapped the import flow','integration field','flagged missing or bad data','WEX example shows the asset-linking step'])assert.ok(solution.includes(fact),fact);
  assert.match(overlay,/aria-haspopup="dialog"/);assert.match(markup,/id="open-source-controls"/);
 }
});
test('the solution beat alone places the portfolio narrative to the right on desktop',async()=>{
 const css=await read('components/fleet-demo-shell.module.css');
 assert.match(shell,/gridClassName=\{styles.fleetGrid\}/);assert.match(shell,/sidebarWrapClassName=\{styles.fleetSideWrap\}/);
 assert.match(css,/\.root\[data-scene="solution"\] \.fleetSideWrap \{ grid-column: 2/);
 assert.match(css,/\.root\[data-scene="solution"\] \.main \{ grid-column: 1/);
 assert.match(css,/@media \(min-width: 901px\)/);
});
test('shared-clock preview and modal lifecycle preserve deliberate story pause',()=>{
 assert.match(app,/if\(stage===6\)originalPreview\?\.render\(story\.elapsedSeconds\*1\.5,\{paused:sim\?\.getState\(\)\.paused\?\?true,reducedMotion:reducedMotion\.matches\}\)/);
 assert.match(app,/onOpen\(\)\{setPaused\(true\);activeDialog=originalWorkflow\.element/);assert.match(app,/originalWorkflow\.close\(\{restoreFocus:restore\}\)/);assert.match(app,/onClose\(\)\{activeDialog=null;[^}]*if\(!disposed\)setPaused\(true\)/);
 assert.ok(app.includes('if(activeDialog){'));assert.match(app,/originalWorkflow\?\.dispose\(\);originalPreview\?\.dispose\(\)/);assert.match(app,/originalWorkflow\?\.open\(\{returnFocus:\$\('#open-original-workflow'\)\}\)/);
});
test('odometer actions, data and one-shot provider bridge remain separate from local WEX state',()=>{
 assert.match(app,/on\(\$\('#open-source-controls'\),'click',\(\)=>\{mode='then';openDialog\('#source-dialog'\);render\(\);\}\)/);assert.ok(app.includes("action.type==='set-authority'||action.type==='add-exclusion'"));assert.doesNotMatch(modal,/applyConfigurationCommand|importReadings|reviewImports|fetch\(/);assert.equal((app.match(/createSimulation\(\{/g)||[]).length,1);
});
