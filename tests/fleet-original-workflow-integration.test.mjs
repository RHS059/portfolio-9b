import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [shell,standalone,app,modal]=await Promise.all([read('components/fleet-demo-shell.tsx'),read('public/fleet-demo/index.html'),read('public/fleet-demo/src/app/index.js'),read('public/fleet-demo/src/ui/original-workflow/index.js')]);
test('both routes place the miniature and expand action in the left solution panel',()=>{
 for(const markup of [shell,standalone]){const solution=markup.slice(markup.indexOf('data-story-sidebar="solution"'),markup.indexOf('data-story-sidebar="agents"'));
 for(const id of ['original-workflow-preview','open-original-workflow']){assert.ok(solution.includes(`id="${id}"`));assert.equal((markup.match(new RegExp(`id="${id}"`,'g'))||[]).length,1);}
 assert.match(solution,/WEX fuel record is linked to the right asset/);assert.match(solution,/aria-haspopup="dialog"/);assert.match(markup,/id="open-source-controls"/);assert.match(solution,/odometer sources and reading exclusions/);}
});
test('shared-clock preview and modal lifecycle preserve deliberate story pause',()=>{
 assert.match(app,/if\(stage===6\)originalPreview\?\.render\(story\.elapsedSeconds\*1\.5,\{paused:sim\?\.getState\(\)\.paused\?\?true,reducedMotion:reducedMotion\.matches\}\)/);
 assert.match(app,/onOpen\(\)\{setPaused\(true\);activeDialog=originalWorkflow\.element/);assert.match(app,/originalWorkflow\.close\(\{restoreFocus:restore\}\)/);assert.match(app,/onClose\(\)\{activeDialog=null;[^}]*if\(!disposed\)setPaused\(true\)/);
 assert.ok(app.includes('if(activeDialog){'));assert.match(app,/originalWorkflow\?\.dispose\(\);originalPreview\?\.dispose\(\)/);assert.match(app,/originalWorkflow\?\.open\(\{returnFocus:\$\('#open-original-workflow'\)\}\)/);
});
test('odometer actions, data and one-shot provider bridge remain separate from local WEX state',()=>{
 assert.match(app,/on\(\$\('#open-source-controls'\),'click',\(\)=>\{mode='then';openDialog\('#source-dialog'\);render\(\);\}\)/);assert.ok(app.includes("action.type==='set-authority'||action.type==='add-exclusion'"));assert.doesNotMatch(modal,/applyConfigurationCommand|importReadings|reviewImports|fetch\(/);assert.equal((app.match(/createSimulation\(\{/g)||[]).length,1);
});
