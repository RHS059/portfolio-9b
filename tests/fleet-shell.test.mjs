import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');
const [page,shell,css]=await Promise.all([read('app/fleet-demo/page.tsx'),read('components/fleet-demo-shell.tsx'),read('components/fleet-demo-shell.module.css')]);
const app=await read('public/fleet-demo/src/app/index.js'),standalone=await read('public/fleet-demo/index.html');
test('Fleet stays native in the actual shared PortfolioShell with one scene card',()=>{
 assert.match(page,/return <FleetDemoShell \/>/);assert.doesNotMatch(page,/iframe|index\.html/);
 assert.match(shell,/import PortfolioShell from "\.\/portfolio-shell"/);assert.match(shell,/import portfolio from "\.\/portfolio-home\.module\.css"/);
 assert.equal((shell.match(/portfolio\.card/g)||[]).length,1);assert.doesNotMatch(shell,/PortfolioLinks|Portfolio navigation|Inspect the evidence|<aside|className="topbar"|DM Sans|IBM Plex/);
});
test('the opening preserves the project fields and question with an editable working title',()=>{
 for(const text of ['The Same Truck.','The Same Service.','Again.','UX Designer','User research, systems design, workflow architecture, integration logic, prototyping, and cross-functional collaboration','Figma-style wireframing, whiteboarding, API and integration workflows','UX Designer, 2× App Developer, 1× Support Agent, 1× Customer Success Manager','2019 – 2022','Data issue resolution improved by 90%, from weeks to hours','Why were the same trucks getting serviced more than once in a week?'])assert.ok(shell.includes(text),text);
 assert.match(shell,/id="story-content"[^>]* hidden/);assert.match(shell,/data-intro="true"/);
});
test('exactly nine visual scenes retain the requested order and named-provider layout',()=>{
 const ids=['question','integration','repeat-service','provider-switch','mileage-loop','cost','solution','agents','learning'];
 assert.deepEqual([...shell.matchAll(/data-story-overlay="([^"]+)"/g)].map(match=>match[1]),ids);
 assert.ok(shell.indexOf('data-provider="verizon"')<shell.indexOf('data-provider="samsara"'));
 for(const phrase of ['The customer switched providers','but didn’t inform us, so we were importing from both, daily','FOR MONTHS','30,000','50,000'])assert.ok(shell.includes(phrase));
 assert.match(css,/\[data-scene="provider-switch"\] \.world \{ filter: blur\(7px\) brightness/);
});
test('persistent bottom controls include pause, navigation, scrubbing and cost context',()=>{
 assert.equal((shell.match(/story-dock/g)||[]).length,1);
 const dock=shell.slice(shell.indexOf('className={`story-dock'),shell.indexOf('id="source-dialog"'));
 for(const id of ['story-position','playback-status','scene-steps','story-progress','previous-chapter','pause','next-chapter','reset','about-toggle','selected-asset','asset-role','service-visits','service-summary','maintenance-cost','maintenance-cost-note']){assert.ok(dock.includes(`id="${id}"`),id);assert.equal((shell.match(new RegExp(`id="${id}"`,'g'))||[]).length,1);}
 assert.match(shell,/htmlFor="story-progress"/);assert.match(shell,/aria-keyshortcuts="ArrowLeft"/);assert.match(shell,/aria-keyshortcuts="ArrowRight"/);assert.match(shell,/aria-keyshortcuts="Space"/);
 assert.match(css,/\.impactStrip[^}]*grid-template-columns: repeat\(3,minmax\(0,1fr\)\)/);
});
test('source controls are an optional modal, with human approval and preserved history',()=>{
 assert.match(shell,/id="source-dialog"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*hidden/);
 for(const id of ['open-source-controls','run-story-review','source-close','source-inspector','canonical-reading','canonical-source','provenance','app-feedback'])assert.ok(shell.includes(`id="${id}"`));
 assert.match(app,/hidden=stage!==6/);assert.match(app,/hidden=stage!==7/);
 assert.ok(app.includes("action.type==='set-authority'||action.type==='add-exclusion'"));
 assert.ok(app.includes('Original readings and service records are preserved.'));
 assert.match(app,/event.key==='Tab'/);assert.match(app,/event.key==='Escape'/);
});
test('the UI distinguishes fuel data, telematics, illustrative costs and hypothetical AI',()=>{
 for(const text of ['Telematics: mileage and vehicle activity.','USD, illustrative','Actual costs weren’t provided.','exact maintenance-trigger rule is unknown','no historical dollar amount or savings is claimed','no live model','not maintenance savings'])assert.ok((shell+app).includes(text),text);
 assert.doesNotMatch(shell,/\$\d/);assert.match(shell,/id="maintenance-cost">Amount not provided/);
});
test('single-clock story has a reduced-motion pause, manual override and route cleanup',()=>{
 assert.equal((app.match(/createSimulation\(\{/g)||[]).length,1);
 assert.match(app,/sim\.setPaused\(reducedMotion\.matches\)/);assert.match(app,/on\(\$\('#story-progress'\),'input'/);
 assert.match(app,/on\(doc,'visibilitychange'/);assert.match(app,/on\(window,'pagehide'/);assert.match(app,/sim\?\.dispose\(\);scene\?\.dispose\(\);panel\?\.dispose\(\)/);
 assert.match(shell,/await instance\.ready/);assert.match(shell,/instance\?\.dispose\(\)/);assert.match(css,/@media \(prefers-reduced-motion: reduce\)/);
});
test('native and standalone markup expose the same controller hooks',()=>{
 const ids=[...shell.matchAll(/id="([^"]+)"/g)].map(match=>match[1]);
 for(const id of ids)assert.ok(standalone.includes(`id="${id}"`),id);
 assert.doesNotMatch(standalone,/className=|<PortfolioShell|\$\{styles/);
});
