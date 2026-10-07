import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('../../index.html',import.meta.url),'utf8');
test('opening places project name, unchanged project information, teaser and Next in the left panel',()=>{
 const intro=html.slice(html.indexOf('<aside class="story-panel"'),html.indexOf('<div id="story-content"'));
 const fields=['UX Designer','User research, systems design, workflow architecture, integration logic, prototyping, and cross-functional collaboration','Figma-style wireframing, whiteboarding, API and integration workflows','UX Designer, 2× App Developer, 1× Support Agent, 1× Customer Success Manager','2019 – 2022','Data issue resolution improved by 90%, from weeks to hours'];
 for(const field of fields)assert.ok(intro.includes(field));
 assert.ok(intro.indexOf('Fleet Management')<intro.indexOf('id="project-info"'));
 assert.ok(intro.indexOf('</dl>')<intro.indexOf('Why were the same trucks getting serviced more than once in a week?'));
 assert.ok(intro.indexOf('Why were the same trucks')<intro.indexOf('id="start-story"'));
 assert.doesNotMatch(intro,/Project details|COLLECTIVE DATA|data-mode=|story-steps/);
 assert.match(html,/<div id="story-content" hidden>/);assert.match(html,/<main class="workspace" data-intro="true">/);
});
test('technical diagnostics and data limitations are inside the initially collapsed About panel',()=>{
 const start=html.indexOf('<div id="about-panel"');const about=html.slice(start,html.indexOf('</section>',start));
 assert.match(about,/hidden/);assert.match(about,/synthetic demo/);assert.match(about,/exact maintenance-trigger rule is unknown/);assert.match(about,/id="performance"/);assert.match(about,/id="run-status"/);
 assert.doesNotMatch(html,/<footer|story-footnote|Operations lab|Fictional drone assembly/);
 assert.equal((html.match(/Original Reno console/g)||[]).length,1);
});
