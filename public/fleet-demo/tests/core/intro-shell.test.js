import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('../../index.html',import.meta.url),'utf8');
const bootstrap=await readFile(new URL('../../src/app/bootstrap.js',import.meta.url),'utf8');
test('standalone bootstrap selector resolves the declared story root',()=>{
 const selector=bootstrap.match(/document\.querySelector\('([^']+)'\)/)?.[1];
 assert.ok(selector?.startsWith('.'),'Bootstrap selects a named root class');
 const classes=[...html.matchAll(/class="([^"]+)"/g)].map(match=>match[1].split(/\s+/));
 assert.ok(classes.some(tokens=>tokens.includes(selector.slice(1))),`Missing bootstrap root ${selector}`);
});
test('standalone Reno link resolves beside the demo when served at any base path',async()=>{
 const href=html.match(/href="([^"]+)"[^>]*>Original Reno console/)?.[1];
 assert.ok(href&&!href.startsWith('/'),'Standalone legacy navigation uses the current demo directory');
 const legacy=await readFile(new URL(href,new URL('../../index.html',import.meta.url)),'utf8');
 assert.match(legacy,/Live/);
});
test('opening places project name, unchanged project information, teaser and Next in the left panel',()=>{
 const intro=html.slice(html.indexOf('<aside '),html.indexOf('<div id="story-content"'));
 const fields=['UX Designer','User research, systems design, workflow architecture, integration logic, prototyping, and cross-functional collaboration','Figma-style wireframing, whiteboarding, API and integration workflows','UX Designer, 2× App Developer, 1× Support Agent, 1× Customer Success Manager','2019 – 2022','Data issue resolution improved by 90%, from weeks to hours'];
 for(const field of fields)assert.ok(intro.includes(field));
 assert.ok(intro.indexOf('The Same Truck.')<intro.indexOf('id="project-info"'));
 assert.ok(intro.indexOf('</dl>')<intro.indexOf('Why were the same trucks getting serviced more than once in a week?'));
 assert.ok(intro.indexOf('Why were the same trucks')<intro.indexOf('id="start-story"'));
 assert.doesNotMatch(intro,/Project details|COLLECTIVE DATA|data-mode=|story-steps/);
 assert.match(html,/<div id="story-content"[^>]*hidden>/);assert.match(html,/class="workspace root" data-intro="true"/);
});
test('technical diagnostics and data limitations are inside the initially collapsed About panel',()=>{
 const start=html.indexOf('<div id="about-panel"');const about=html.slice(start,html.indexOf('</section>',start));
 assert.match(about,/hidden/);assert.match(about,/sample records/);const limits=about.slice(about.indexOf('<details>'),about.indexOf('</details>'));assert.match(limits,/No live telemetry is connected/);assert.match(limits,/exact maintenance-trigger rule is unknown/);assert.doesNotMatch(limits,/<details[^>]*\bopen\b/);assert.match(about,/Original readings and service history are preserved/);assert.match(about,/id="performance"/);assert.match(about,/id="run-status"/);
 assert.doesNotMatch(html,/story-footnote|Operations lab|Fictional drone assembly/);
 assert.equal((html.match(/Original Reno console/g)||[]).length,1);
});
