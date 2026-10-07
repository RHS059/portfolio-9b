"use client"

import { useEffect, useRef } from "react"
import PortfolioShell from "./portfolio-shell"
import AnimatedLink from "./animated-link"
import portfolio from "./portfolio-home.module.css"
import styles from "./fleet-demo-shell.module.css"

type FleetInstance = { ready: Promise<unknown>; dispose: () => void }
type FleetModule = {
  mountFleetDemo: (options: {
    root: HTMLElement
    theme?: { controlClassName: string; eyebrowClassName: string }
  }) => FleetInstance
}

declare global {
  interface Window { FleetDemoModule?: FleetModule }
}

const scripts = new Map<string, Promise<void>>()
function loadScript(src: string, type?: "module") {
  const existing = scripts.get(src)
  if (existing) return existing
  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script")
    script.src = src
    if (type) script.type = type
    const fail = () => { clearTimeout(timeout); script.remove(); scripts.delete(src); reject(new Error(`Could not load ${src}`)) }
    const timeout = window.setTimeout(fail, 15000)
    script.onload = () => { clearTimeout(timeout); resolve() }
    script.onerror = fail
    document.head.appendChild(script)
  })
  scripts.set(src, promise)
  return promise
}

function ensureMapStyles() {
  if (document.querySelector("link[data-fleet-map-styles]")) return
  const link = document.createElement("link")
  link.rel = "stylesheet"
  link.href = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css"
  link.dataset.fleetMapStyles = "true"
  document.head.appendChild(link)
}

const projectFields = [
  ["Role", "UX Designer"],
  ["Responsibilities", "User research, systems design, workflow architecture, integration logic, prototyping, and cross-functional collaboration"],
  ["Tools", "Figma-style wireframing, whiteboarding, API and integration workflows"],
  ["Team", "UX Designer, 2× App Developer, 1× Support Agent, 1× Customer Success Manager"],
  ["Timeline", "2019 – 2022"],
  ["Outcome", "Data issue resolution improved by 90%, from weeks to hours"],
] as const

function FleetSidebar() {
  return <>
    <div id="intro-panel" className={styles.introPanel}>
      <p className={portfolio.eyebrow}>Fleet integrations · A case study</p>
      <h1 className={portfolio.name}>The Same Truck.<br />The Same Service.<br />Again.</h1>
      <section id="project-info" className={styles.projectInfo} aria-label="Project information">
        <dl>{projectFields.map(([label, value]) => <div key={label}>
          <dt className={portfolio.eyebrow}>{label}</dt>
          <dd className={portfolio.metric}>{value}</dd>
        </div>)}</dl>
      </section>
      <div className={`${portfolio.bio} ${styles.introCta}`}>
        <p>Why were the same trucks getting serviced more than once in a week?</p>
        <button id="start-story" className={portfolio.cta} type="button">Follow one truck <span aria-hidden="true">↗</span></button>
      </div>
    </div>
    <div id="story-content" className={styles.storyContent} hidden>
      <div className={styles.chapterIntro}>
        <p className={portfolio.eyebrow}>Fleet integrations</p>
        <div aria-live="polite" aria-atomic="true">
          <span id="chapter-number" className={portfolio.eyebrow} />
          <h1 id="chapter-title" className={portfolio.name} tabIndex={-1} />
          <p id="chapter-copy" className={`${portfolio.metric} ${styles.chapterCopy}`} />
        </div>
      </div>
      <div id="chapter-takeaway" className={`${portfolio.bio} ${styles.chapterTakeaway}`} />
      <div className={`${portfolio.bio} ${styles.chapterNavigation}`}>
        <p className={styles.exampleNote}>A real integration problem, retold with illustrative vehicles, mileage and service visits.</p>
        <p>Pause, scrub or step through at any time.</p>
        <button id="open-source-controls" className={portfolio.control} type="button" hidden>Try the source controls ↗</button>
        <button id="run-story-review" className={portfolio.control} type="button" hidden>Run an example review ↗</button>
        <button id="story-replay" className={portfolio.cta} type="button" hidden>Replay the story ↺</button>
      </div>
    </div>
  </>
}
export default function FleetDemoShell() {
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    let disposed = false
    let instance: FleetInstance | undefined
    ensureMapStyles()
    async function start() {
      // A failed graphics CDN retains the renderer's useful 2D fallback.
      await Promise.allSettled([
        loadScript("https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"),
        loadScript("https://unpkg.com/three@0.128.0/build/three.min.js"),
      ])
      if (disposed) return
      await loadScript("/fleet-demo/src/app/bridge.js", "module")
      if (disposed) return
      if (!window.FleetDemoModule) throw new Error("The interactive demo could not start. Please reload this page.")
      instance = window.FleetDemoModule.mountFleetDemo({ root: root!, theme: { controlClassName: portfolio.control, eyebrowClassName: portfolio.eyebrow } })
      await instance.ready
    }
    void start().catch((error: unknown) => {
      if (disposed) return
      const loading = root.querySelector<HTMLElement>("#scene-loading")
      if (loading) loading.textContent = error instanceof Error ? error.message : "The interactive demo could not start. Please reload this page."
    })
    return () => { disposed = true; instance?.dispose() }
  }, [])

  return <div ref={rootRef} className={`workspace ${styles.root}`} data-intro="true" data-scene="question" data-playing="false">
    <PortfolioShell sidebar={<FleetSidebar />} sidebarClassName={`story-panel ${styles.sidebar}`} sidebarLabel="Fleet case study" mainClassName={styles.main}>
      <button id="mobile-pause" className={`${portfolio.cta} ${styles.mobilePlayback}`} type="button" aria-label="Play story" aria-pressed="false" disabled>▶ Play story</button>
      <div className={styles.workspaceBody}>
        <section className={`world-panel ${portfolio.card} ${styles.worldPanel}`} aria-label="Interactive fleet story">
          <div className={styles.stageViewport}>
            <div id="world" className={`world ${styles.world}`}><div id="scene-loading" className={styles.sceneLoading}>Preparing operations scene…</div></div>
            <div id="scene-notice" className={styles.sceneNotice} role="status" hidden />
            <div id="story-overlays" className={styles.storyOverlays}>
              <div data-story-overlay="question" className={styles.openingCaption}>
                <span className={portfolio.eyebrow}>One truck. Two oil changes. One week.</span>
                <p>Why did it keep<br />coming back?</p>
              </div>
              <div data-story-overlay="integration" className={styles.integrationCard} hidden>
                <span className={portfolio.eyebrow}>What is an integration?</span>
                <h2>A connection that keeps work moving.</h2>
                <div className={styles.dataRoute}><span>Fuel &amp; telematics providers</span><b aria-hidden="true">↓</b><span>API · automated data exchange</span><b aria-hidden="true">↓</b><span>Fleet operations software</span></div>
                <p>Fuel: purchases and consumption.<br />Telematics: mileage and vehicle activity.</p>
                <small>Teams use this data to budget, schedule service and keep trucks on the road.</small>
              </div>
              <div data-story-overlay="repeat-service" className={styles.serviceCard} hidden>
                <span className={portfolio.eyebrow}>Back in the workshop</span>
                <strong>Oil change #2</strong><span>Same truck. Same week.</span>
                <small>The technicians knew something was wrong.</small>
              </div>
              <div data-story-overlay="provider-switch" className={styles.providerOverlay} hidden>
                <div className={styles.devicePair}>
                  <div className={styles.device} data-provider="verizon"><span className={styles.deviceLight} /><div className={styles.deviceBrand}><strong>Verizon</strong><span>Networkfleet</span></div><small>DAILY IMPORT · ACTIVE</small></div>
                  <span className={styles.providerPlus} aria-hidden="true">+</span>
                  <div className={styles.device} data-provider="samsara"><span className={styles.deviceLight} /><div className={styles.deviceBrand}><strong>Samsara</strong></div><small>DAILY IMPORT · ACTIVE</small></div>
                </div>
                <h2>The customer switched providers</h2>
                <p>but didn’t inform us, so we were importing from both, daily</p>
                <strong className={styles.months}>FOR MONTHS</strong>
                <small className={styles.providerNote}>Illustrative devices · reported provider overlap</small>
              </div>
              <div data-story-overlay="mileage-loop" className={styles.mileageOverlay} hidden>
                <span className={portfolio.eyebrow}>Illustrative reading loop · Day <span id="mileage-day">1</span></span>
                <div className={styles.mileageValues}><span><small>OLD SOURCE</small>30,000</span><b aria-hidden="true">→</b><span><small>CURRENT SOURCE</small><span id="mileage-current">50,000</span></span></div>
                <div className={styles.odometer}><span id="mileage-value">30,000</span><small>miles in the system</small></div>
                <div id="mileage-alert" className={styles.mileageAlert}>Stale reading imported again</div>
                <p>The reading resets. The next jump looks like more driving.</p>
                <small>This illustrates the consequence, not the original maintenance algorithm.</small>
              </div>
              <div data-story-overlay="cost" className={styles.costCard} hidden>
                <span className={portfolio.eyebrow}>An illustrative two weeks</span>
                <h2>A repeat visit is a real expense.</h2>
                <div id="cost-days" className={styles.costDays} aria-label="Four illustrative visits across fourteen days" />
                <p id="cost-caption">Day 1 · The first service</p>
                <label htmlFor="service-unit-cost">Try a service cost <span>(USD, illustrative)</span></label>
                <input id="service-unit-cost" type="number" inputMode="decimal" min="0" max="100000" step="1" placeholder="Enter an amount" />
                <small>Actual costs weren’t provided. Your amount changes only this illustration.</small>
              </div>
              <div data-story-overlay="solution" className={styles.solutionCard} hidden>
                <span className={portfolio.eyebrow}>The change I designed</span>
                <div className={styles.decisionRow}><span>TRK-104</span><strong>Choose its odometer source</strong></div>
                <div className={styles.decisionRow}><span>OLD READINGS</span><strong>Exclude them from decisions</strong></div>
                <div className={styles.decisionRow}><span>ORIGINAL HISTORY</span><strong>Keep it intact</strong></div>
                <p>One vehicle’s migration shouldn’t break the rest of the fleet.</p>
              </div>
              <div data-story-overlay="agents" className={styles.agentCard} hidden>
                <span className={portfolio.eyebrow}>How I’d approach it today · Concept</span>
                <h2>Catch it before the next shop visit.</h2>
                <ol className={styles.agentSteps}><li data-agent-step="0"><span>01</span><div><strong>Check incoming data</strong><small>Agent compares sources and reading patterns</small></div></li><li data-agent-step="1"><span>02</span><div><strong>Flag &amp; notify</strong><small>Show the conflict and supporting evidence</small></div></li><li data-agent-step="2"><span>03</span><div><strong>A person decides</strong><small>Approve the source; preserve the history</small></div></li></ol>
                <small>A proposed workflow. No live AI is making decisions here.</small>
              </div>
              <div data-story-overlay="learning" className={styles.learningCard} hidden>
                <span className={portfolio.eyebrow}>What I learned</span><h2>Good data needs<br />a clear owner.</h2><p>Make the source visible.<br />Make the decision deliberate.<br />Keep the history.</p>
              </div>
            </div>
          </div>
          <div className={`story-dock ${styles.storyDock}`} aria-label="Story playback and vehicle context">
            <div className={styles.timelineHeader}><span id="story-position" className={portfolio.eyebrow}>01 / 09 · The question</span><span id="playback-status">Preparing story</span></div>
            <div id="scene-steps" className={styles.sceneSteps} aria-label="Choose a scene" />
            <label className={styles.srOnly} htmlFor="story-progress">Scrub through the story</label>
            <input id="story-progress" className={styles.storyProgress} type="range" min="0" max="124" step="0.1" defaultValue="0" aria-valuetext="Scene 1 of 9" />
            <div className={styles.playbackControls}>
              <button id="previous-chapter" className={portfolio.control} type="button" aria-label="Previous scene" aria-keyshortcuts="ArrowLeft">← Back</button>
              <button id="pause" className={portfolio.cta} type="button" aria-label="Play story" aria-keyshortcuts="Space">▶ Play</button>
              <button id="next-chapter" className={portfolio.control} type="button" aria-label="Next scene" aria-keyshortcuts="ArrowRight">Next →</button>
              <button id="reset" className={portfolio.control} type="button" aria-label="Replay story from the beginning">↺ Replay</button>
              <button id="explore-scene" className={portfolio.control} type="button" aria-pressed="false">Explore scene</button>
              <button id="about-toggle" className={portfolio.control} type="button" aria-label="About this demo" aria-expanded="false">Details</button>
            </div>
            <div id="explore-controls" hidden className={styles.worldToolbar} role="group" aria-label="Explore the scene"><button className={portfolio.control} data-view="2d" type="button" aria-pressed="false">2D</button><button className={portfolio.control} data-view="3d" type="button" aria-pressed="false">3D</button><button className={portfolio.control} data-view="iso" type="button" aria-pressed="true">ISO</button><button id="overview" type="button" className={portfolio.control}>Overview</button><button id="follow" type="button" className={portfolio.control} aria-pressed="true">Follow truck</button><button className={portfolio.control} data-focus="depot" type="button">Workshop</button><button className={portfolio.control} data-focus="oict" type="button">OICT</button><button className={portfolio.control} data-focus="centerpoint" type="button">Factory</button></div>
            <div className={`impact-strip ${styles.impactStrip}`}>
              <div><span className={portfolio.eyebrow}>Following one truck</span><strong id="selected-asset">TRK-104</strong><small id="asset-role">Illustrative vehicle</small></div>
              <div><span className={portfolio.eyebrow}>Service visits</span><strong id="service-visits">—</strong><small id="service-summary">Illustrative service history</small></div>
              <div><span className={portfolio.eyebrow}>Repeat service cost</span><strong id="maintenance-cost">Amount not provided</strong><small id="maintenance-cost-note">Labor, parts and downtime</small></div>
            </div>
          </div>
          <div id="source-dialog" className={styles.sourceDialog} role="dialog" aria-modal="true" aria-labelledby="source-dialog-title" hidden>
            <button id="source-close" className={`${portfolio.control} ${styles.close}`} type="button" aria-label="Close source controls">×</button>
            <h2 id="source-dialog-title">Choose the source. Keep the history.</h2>
            <p>Try the controls with synthetic Provider A/B data. These sample values are separate from the story’s mileage animation.</p>
            <div id="reading-context" className={styles.readingContext}><span className={portfolio.eyebrow}>Odometer used for maintenance</span><strong id="canonical-reading">Unresolved</strong><small id="canonical-source">Choose an odometer source</small></div>
            <div id="source-inspector"><div id="provenance" /><div id="app-feedback" className={styles.feedback} role="status" aria-live="polite" /></div>
            <p id="mode-description" className={styles.modeDescription} />
          </div>
          <div id="about-panel" className={styles.aboutPanel} role="dialog" aria-modal="true" aria-labelledby="about-heading" hidden>
            <button id="about-close" className={`${portfolio.control} ${styles.close}`} type="button" aria-label="Close demo details">×</button>
            <h2 id="about-heading">About this story</h2>
            <p>The incident and provider overlap were reported by the designer. Vehicle IDs, readings, dates and shop visits in this synthetic demo are examples, not live telemetry. The Oakland map provides geographic context; the workshop, factory activity and routes are illustrative.</p>
            <p>The exact maintenance-trigger rule is unknown. The mileage loop explains the reported consequence without reconstructing that rule. The four-visit, two-week cost animation is illustrative; no historical dollar amount or savings is claimed.</p>
            <p>Fuel integrations provide fuel-related operational data; the odometer conflict concerns telematics data. Named providers illustrate the reported change without assigning a migration direction. The optional source controls use anonymous synthetic Provider A/B records.</p>
            <p>The 90% improvement, from weeks to hours, refers to data issue resolution. The AI workflow is a proposed approach for today, not part of the original work or a live model.</p>
            <p id="cargo-capability-note">This preview runs incoming kits through assembly. The activity in the background is an illustration of fleet operations.</p>

            <details><summary>Data and performance</summary><p id="integrity-count" /><p>Original readings and service history are preserved. Settings are versioned and recalculated results are derived views.</p><p><span id="run-status">Scene paused</span> · One 20 Hz simulation clock with interpolated rendering.</p><p id="performance">Performance measurement pending</p><p>Browser frame cadence is not a physical-GPU benchmark.</p></details>
            <p><a href="/fleet-demo/reno.html">Original Reno console ↗</a></p><AnimatedLink href="/projects/fleet-fuel-integration">Read the original case study ↗</AnimatedLink>
          </div>
        </section>
      </div>
      <noscript><p>JavaScript is needed to run this interactive story. <a href="/projects/fleet-fuel-integration">Read the original case study.</a></p></noscript>
    </PortfolioShell>
  </div>
}
