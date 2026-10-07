import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')
const [page, shell, css, shared, frame] = await Promise.all([
  read('app/fleet-demo/page.tsx'), read('components/fleet-demo-shell.tsx'),
  read('components/fleet-demo-shell.module.css'), read('components/portfolio-home.module.css'),
  read('components/portfolio-shell.tsx'),
])

test('Fleet route renders native portfolio components rather than an isolated document', () => {
  assert.match(page, /return <FleetDemoShell \/>/)
  assert.doesNotMatch(page, /iframe|index\.html/)
  assert.match(shell, /import PortfolioShell from "\.\/portfolio-shell"/)
  assert.match(shell, /import PortfolioLinks from "\.\/portfolio-links"/)
  assert.match(shell, /import portfolio from "\.\/portfolio-home\.module\.css"/)
  assert.equal((shell.match(/portfolio\.card/g) || []).length, 2)
  assert.doesNotMatch(shell, /src\/app\/style\.css|DM Sans|IBM Plex|className="topbar"/)
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
  assert.match(shell, /aria-label="Source controls" hidden/)
  assert.match(shell, /data-intro="true"/)
})

test('Shared outline controls reuse the original portfolio declarations', () => {
  assert.match(shared, /\.page \.links a:not\(\.cta\), \.page \.control \{/)
  assert.match(shell, /theme: \{ controlClassName: portfolio\.control, eyebrowClassName: portfolio\.eyebrow \}/)
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b|oklch\(|rgb\(|DM Sans|IBM Plex/)
})

test('PortfolioShell keeps its default sidebar and shared page chrome', () => {
  assert.match(frame, /sidebar \?\? <>/)
  assert.match(frame, /Reid Slaughter/)
  assert.match(frame, /\{sidebarContent\}/)
  assert.match(frame, /className=\{styles\.grid\}/)
  assert.match(frame, /<footer className=\{styles\.foot\}>/)
})

test('Native runtime waits for the bridge and cleans up every mounted instance', () => {
  assert.match(shell, /loadScript\("\/fleet-demo\/src\/app\/bridge\.js", "module"\)/)
  assert.match(shell, /window\.FleetDemoModule\.mountFleetDemo/)
  assert.match(shell, /await instance\.ready/)
  assert.match(shell, /return \(\) => \{ disposed = true; instance\?\.dispose\(\) \}/)
  assert.equal((shell.match(/if \(disposed\) return/g) || []).length, 3)
})

test('Details retain factual limits and use native-safe destinations', () => {
  const details = shell.slice(shell.indexOf('id="about-panel"'), shell.indexOf('aria-label="Source controls"'))
  for (const text of ['synthetic demo', 'exact maintenance-trigger rule is unknown', 'id="performance"', 'id="run-status"']) assert.ok(details.includes(text))
  assert.match(details, /href="\/fleet-demo\/reno\.html"/)
  assert.match(details, /<AnimatedLink href="\/projects\/fleet-fuel-integration"/)
  assert.doesNotMatch(shell, /world-heading|world-subtitle|Operations lab|Fictional drone assembly/)
})
