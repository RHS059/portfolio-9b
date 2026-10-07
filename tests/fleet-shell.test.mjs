import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')
const [page, shell, css, shared, frame] = await Promise.all([
  read('app/fleet-demo/page.tsx'), read('components/fleet-demo-shell.tsx'),
  read('components/fleet-demo-shell.module.css'), read('components/portfolio-home.module.css'),
  read('components/portfolio-shell.tsx'),
])

test('Fleet route uses the actual portfolio shell and a single scene card', () => {
  assert.match(page, /return <FleetDemoShell \/>/)
  assert.doesNotMatch(page, /iframe|index\.html/)
  assert.match(shell, /import PortfolioShell from "\.\/portfolio-shell"/)
  assert.match(shell, /import portfolio from "\.\/portfolio-home\.module\.css"/)
  assert.equal((shell.match(/portfolio\.card/g) || []).length, 1)
  assert.doesNotMatch(shell, /src\/app\/style\.css|DM Sans|IBM Plex|className="topbar"/)
})

test('The route removes Work/About/Writing navigation and the evidence sidebar', () => {
  assert.doesNotMatch(shell, /PortfolioLinks|Portfolio navigation|siteNavigation|Inspect the evidence|<aside/)
  assert.doesNotMatch(css, /siteNavigation|inspectorPanel|\[data-intro="false"\].*grid-template-columns/)
  const story = shell.slice(shell.indexOf('id="story-content"'), shell.indexOf('export default'))
  assert.match(story, /<section className=\{`inspector-panel/)
  assert.match(story, /id="story-evidence"/)
  assert.match(story, /id="source-inspector" hidden/)
  assert.doesNotMatch(story, /id="story-steps"|data-stage=/)
})

test('The opening retains all six exact fields before the teaser and Next', () => {
  for (const text of [
    'UX Designer',
    'User research, systems design, workflow architecture, integration logic, prototyping, and cross-functional collaboration',
    'Figma-style wireframing, whiteboarding, API and integration workflows',
    'UX Designer, 2× App Developer, 1× Support Agent, 1× Customer Success Manager',
    '2019 – 2022',
    'Data issue resolution improved by 90%, from weeks to hours',
  ]) assert.ok(shell.includes(text), text)
  const intro = shell.slice(shell.indexOf('id="intro-panel"'), shell.indexOf('id="story-content"'))
  assert.ok(intro.indexOf('Fleet Management') < intro.indexOf('id="project-info"'))
  assert.ok(intro.indexOf('</dl>') < intro.indexOf('Why were the same trucks'))
  assert.ok(intro.indexOf('Why were the same trucks') < intro.indexOf('id="start-story"'))
  assert.match(intro, /className=\{portfolio\.name\}/)
  assert.match(intro, /className=\{portfolio\.cta\}/)
  assert.match(shell, /id="story-content"[^>]* hidden/)
  assert.match(shell, /data-intro="true"/)
})

test('One bottom dock holds the same controls and vehicle context through every beat', () => {
  assert.equal((shell.match(/story-dock/g) || []).length, 1)
  const dock = shell.slice(shell.indexOf('className={`story-dock'), shell.indexOf('id="about-panel"'))
  for (const id of ['overview', 'follow', 'pause', 'reset', 'about-toggle', 'selected-asset', 'asset-role', 'service-visits', 'service-summary', 'maintenance-cost', 'maintenance-cost-note']) {
    assert.ok(dock.includes(`id="${id}"`), `${id} stays in the bottom dock`)
    assert.equal((shell.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1)
  }
  for (const view of ['2d', '3d', 'iso']) assert.ok(dock.includes(`data-view="${view}"`))
  for (const place of ['oict', 'centerpoint', 'depot']) assert.ok(dock.includes(`data-focus="${place}"`))
  assert.doesNotMatch(dock, / hidden|data-stage|data-intro/)
  assert.doesNotMatch(css, /\[data-intro=/)
  assert.match(css, /\.impactStrip[^}]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/)
  assert.match(css, /\.impactStrip > div[^}]*grid-template-rows:/)
})

test('The story has accessible Next/Back controls and a final-beat comparison slot', () => {
  for (const id of ['chapter-number', 'chapter-title', 'chapter-copy', 'previous-chapter', 'next-chapter', 'review-controls', 'mode-description', 'reading-context', 'canonical-reading', 'canonical-source', 'provenance', 'app-feedback']) assert.ok(shell.includes(`id="${id}"`), id)
  assert.match(shell, /aria-live="polite" aria-atomic="true"/)
  assert.match(shell, /id="chapter-title"[^>]*tabIndex=\{-1\}/)
  assert.match(shell, /id="review-controls"[^>]* hidden/)
  assert.match(css, /\.chapterNavigation \{ margin-top: auto/)
  assert.match(css, /@media \(max-width: 900px\)/)
  assert.match(css, /@media \(max-width: 480px\)/)
})

test('Truck counts and unknown costs are honest about the illustration', () => {
  assert.match(shell, /Vehicle IDs and the two-visit example are illustrative/)
  assert.match(shell, /id="maintenance-cost">Amount not provided/)
  assert.doesNotMatch(shell, /\$\d|90%.*maintenance|maintenance.*90%|Not recorded/)
})

test('Shared outline controls reuse the original portfolio declarations', () => {
  assert.match(shared, /\.page \.links a:not\(\.cta\), \.page \.control \{/)
  assert.match(shell, /theme: \{ controlClassName: portfolio\.control, eyebrowClassName: portfolio\.eyebrow \}/)
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b|oklch\(|rgb\(|DM Sans|IBM Plex/)
})

test('PortfolioShell keeps its default sidebar and shared page chrome for other routes', () => {
  assert.match(frame, /sidebar \?\? <>/)
  assert.match(frame, /Reid Slaughter/)
  assert.match(frame, /\{sidebarContent\}/)
  assert.match(frame, /className=\{styles\.grid\}/)
  assert.match(frame, /<footer className=\{styles\.foot\}>/)
  assert.match(frame, /<PortfolioLinks workHref=/)
})

test('Native runtime waits for the bridge and cleans up every mounted instance', () => {
  assert.match(shell, /loadScript\("\/fleet-demo\/src\/app\/bridge\.js", "module"\)/)
  assert.match(shell, /window\.FleetDemoModule\.mountFleetDemo/)
  assert.match(shell, /await instance\.ready/)
  assert.match(shell, /return \(\) => \{ disposed = true; instance\?\.dispose\(\) \}/)
  assert.equal((shell.match(/if \(disposed\) return/g) || []).length, 3)
})

test('Details retain factual limits and use native-safe destinations', () => {
  const details = shell.slice(shell.indexOf('id="about-panel"'))
  for (const text of ['synthetic demo', 'exact maintenance-trigger rule is unknown', 'id="performance"', 'id="run-status"']) assert.ok(details.includes(text))
  assert.match(details, /href="\/fleet-demo\/reno\.html"/)
  assert.match(details, /<AnimatedLink href="\/projects\/fleet-fuel-integration"/)
  assert.doesNotMatch(shell, /world-heading|world-subtitle|Operations lab|Fictional drone assembly/)
})
