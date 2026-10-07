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
test('annotated content is in the sidebar and only requested map overlays remain',()=>{
 const sidebar=shell.slice(shell.indexOf('function FleetSidebar'),shell.indexOf('export default function'));
 const world=shell.slice(shell.indexOf('id="story-overlays"'),shell.indexOf('className={`story-dock'));
 assert.deepEqual([...sidebar.matchAll(/data-story-sidebar="([^"]+)"/g)].map(match=>match[1]),['integration','mileage-loop','solution','agents']);
 assert.deepEqual([...world.matchAll(/data-story-overlay="([^"]+)"/g)].map(match=>match[1]),['provider-switch','cost','learning']);
 assert.doesNotMatch(world,/data-story-sidebar|Why did it keep|ONE TRUCK/i);assert.doesNotMatch(css,/\[data-scene="mileage-loop"\] \.world \{ filter:/);
 assert.ok(shell.indexOf('data-provider="verizon"')<shell.indexOf('data-provider="samsara"'));assert.match(css,/\[data-scene="provider-switch"\] \.world \{ filter: blur\(7px\) brightness/);
 assert.ok(app.includes("$('#chapter-number').hidden=beatIndex===6"));
});
test('persistent bottom controls include pause, navigation, scrubbing and cost context',()=>{
 assert.equal((shell.match(/story-dock/g)||[]).length,1);
 const dock=shell.slice(shell.indexOf('className={`story-dock'),shell.indexOf('id="source-dialog"'));
 for(const id of ['story-position','playback-status','scene-steps','story-progress','previous-chapter','pause','next-chapter','selected-asset','asset-role','service-visits','service-summary','maintenance-cost','maintenance-cost-note']){assert.ok(dock.includes(`id="${id}"`),id);assert.equal((shell.match(new RegExp(`id="${id}"`,'g'))||[]).length,1);}
 assert.match(shell,/htmlFor="story-progress"/);assert.match(shell,/aria-keyshortcuts="ArrowLeft"/);assert.match(shell,/aria-keyshortcuts="ArrowRight"/);assert.match(shell,/aria-keyshortcuts="Space"/);
 assert.match(css,/\.impactStrip[^}]*grid-template-columns: repeat\(3,minmax\(0,1fr\)\)/);
});
test('source controls are an optional modal, with human approval and preserved history',()=>{
 assert.match(shell,/id="source-dialog"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*hidden/);
 for(const id of ['open-source-controls','run-story-review','source-close','source-inspector','canonical-reading','canonical-source','provenance','app-feedback'])assert.ok(shell.includes(`id="${id}"`));
 assert.match(app,/hidden=beatIndex!==6/);assert.match(app,/hidden=beatIndex!==7/);
 assert.ok(app.includes("action.type==='set-authority'||action.type==='add-exclusion'"));
 assert.ok(app.includes('Original readings and service records are preserved.'));
 assert.match(app,/event.key==='Tab'/);assert.match(app,/event.key==='Escape'/);
});
test('story copy removes redundant captions and uses one compact fixed-cost label',()=>{
 assert.doesNotMatch(shell,/illustrative|reported provider overlap|Try a service cost|Oil change #2|service-unit-cost|cost-days/i);
 assert.equal((app.match(/'Example cost'/g)||[]).length,1);assert.match(shell,/id="cost-total">\$350/);assert.match(shell,/id="cost-duplicate">\$0/);
 const solution=shell.slice(shell.indexOf('data-story-sidebar="solution"'),shell.indexOf('data-story-sidebar="agents"'));
 const agents=shell.slice(shell.indexOf('data-story-sidebar="agents"'),shell.indexOf('id="chapter-takeaway"'));
 assert.match(solution,/<h2[^>]*>The change I designed<\/h2>/);assert.match(agents,/<h2[^>]*>How I’d approach it today<\/h2>/);
 assert.ok(app.includes("$('#chapter-title').hidden=[1,6,7].includes(beatIndex)"));
});
test('single-clock story has a reduced-motion pause, manual override and route cleanup',()=>{
 assert.equal((app.match(/createSimulation\(\{/g)||[]).length,1);
 assert.match(app,/sim\.setPaused\(true\)/);assert.match(app,/on\(\$\('#story-progress'\),'input'/);
 assert.match(app,/on\(doc,'visibilitychange'/);assert.match(app,/on\(window,'pagehide'/);assert.match(app,/sim\?\.dispose\(\);scene\?\.dispose\(\);panel\?\.dispose\(\)/);
 assert.match(shell,/await instance\.ready/);assert.match(shell,/instance\?\.dispose\(\)/);assert.match(css,/@media \(prefers-reduced-motion: reduce\)/);
});
test('native and standalone markup expose the same controller hooks',()=>{
 const ids=[...shell.matchAll(/id="([^"]+)"/g)].map(match=>match[1]);
 for(const id of ids)assert.ok(standalone.includes(`id="${id}"`),id);
 assert.doesNotMatch(standalone,/className=|<PortfolioShell|\$\{styles/);
});


test('story camera sets follow before the atomic focus/view so orientation cannot be cleared afterward',()=>{
 const body=app.slice(app.indexOf('function applySceneCamera()'),app.indexOf('function renderStory()'));
 assert.equal((body.match(/scene\?\.setFollow/g)||[]).length,1);
 assert.ok(body.indexOf('scene?.setFollow(follow)')<body.indexOf('scene?.setView'));
 assert.match(body,/setView\(view,\{focusId:stage<=1\?'TRK-104':'depot'\}\)/);
 assert.match(body,/if\(stage===8\)\{scene\?\.setView\(view\);scene\?\.setFocus\(null\);\}/);
});


test('intro offers explicit Auto and Manual choices without Explore or Replay buttons',()=>{
 assert.match(shell,/id="start-story" className=\{portfolio.cta\} type="button" disabled>Next Slide: Auto/);assert.match(shell,/id="start-story-manual" className=\{portfolio.control\} type="button" disabled>Next Slide: Manual/);
 assert.doesNotMatch(shell,/id="(?:explore-scene|reset|story-replay)"|Explore scene|Replay/);assert.ok(app.includes("$('#next-chapter').disabled=!ready||stage===8"));
 assert.ok(app.includes("on($('#start-story'),'click',()=>{if(!ready||stage>=STORY_SCENES.length-1)return;setChapter(stage+1);setPaused(false);})"));assert.ok(app.includes("on($('#start-story-manual'),'click',()=>{if(ready&&stage<STORY_SCENES.length-1)setChapter(stage+1);})"));
});

test('receipt uses aligned paper service lines without fabricated shop, tax or payment facts',()=>{
 const receipt=shell.slice(shell.indexOf('data-story-overlay="cost"'),shell.indexOf('data-story-overlay="learning"'));
 assert.match(receipt,/Service receipt/);assert.equal((receipt.match(/Oil change/g)||[]).length,2);assert.match(receipt,/\$350\.00/);assert.doesNotMatch(receipt,/address|invoice number|tax|payment|card ending/i);
 assert.match(css,/\.receipt \{[^}]*background: var\(--page\)/);assert.match(css,/\.receipt \{[^}]*font-family: ui-monospace/);assert.match(css,/border-top: 1px dashed/);
});


test('persistent left mode controls are outside the fading content and fleet facts precede timeline',()=>{
 const body=shell.slice(shell.indexOf('id="sidebar-story-body"'),shell.indexOf('id="story-advance-controls"'));assert.doesNotMatch(body,/id="start-story"|id="start-story-manual"/);
 assert.ok(app.includes("element:$('#sidebar-story-body')"));assert.match(css,/\.sidebarStoryBody \{[^}]*overflow-y: auto/);
 assert.ok(shell.indexOf('className={`impact-strip')<shell.indexOf('id="story-position"'));assert.doesNotMatch(shell,/id="about-toggle"|id="about-panel"|id="about-close"/);
});
