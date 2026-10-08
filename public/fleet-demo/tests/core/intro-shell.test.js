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
test('legacy console remains available without a Details navigation entry',async()=>{
 const legacy=await readFile(new URL('../../reno.html',import.meta.url),'utf8');assert.match(legacy,/Live/);assert.doesNotMatch(html,/Original Reno console|id="about-panel"|id="about-toggle"/);
});
test('opening preserves project name, unchanged project information and question in the left panel',()=>{
 const intro=html.slice(html.indexOf('<aside '),html.indexOf('<div id="story-content"'));
 const fields=['UX Designer','User research, systems design, workflow architecture, integration logic, prototyping, and cross-functional collaboration','Figma-style wireframing, whiteboarding, API and integration workflows','UX Designer, 2× App Developer, 1× Support Agent, 1× Customer Success Manager','2019 – 2022','Data issue resolution improved by 90%, from weeks to hours'];
 for(const field of fields)assert.ok(intro.includes(field));
 assert.ok(intro.indexOf('The Same Truck.')<intro.indexOf('id="project-info"'));
 assert.ok(intro.indexOf('</dl>')<intro.indexOf('Why were the same trucks getting serviced more than once in a week?'));
 assert.ok(html.indexOf('Why were the same trucks')<html.indexOf('id="story-transport"'));
 assert.doesNotMatch(intro,/Project details|COLLECTIVE DATA|data-mode=|story-steps/);
 assert.match(html,/<div id="story-content"[^>]*hidden>/);assert.match(html,/class="workspace root" data-intro="true"/);
});
test('one standard transport remains without fact or chapter strips',()=>{
 const region=html.slice(html.indexOf('id="story-transport"'));
 for(const id of ['story-progress','story-elapsed','story-duration','previous-chapter','pause','next-chapter'])assert.ok(region.includes(`id="${id}"`));
 assert.doesNotMatch(html,/impact-strip|id="scene-steps"|id="story-position"|id="playback-status"|id="selected-asset"|id="service-visits"|id="maintenance-cost"/);
 assert.doesNotMatch(html,/id="start-story"|id="start-story-manual"|id="story-advance-controls"|id="mobile-pause"|id="about-panel"|id="about-toggle"|id="reset"|id="explore-scene"/);
});
