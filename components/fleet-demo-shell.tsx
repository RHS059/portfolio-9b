"use client"

import { useEffect, useRef } from "react"
import PortfolioShell from "./portfolio-shell"
import PortfolioLinks from "./portfolio-links"
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
      <h1 className={portfolio.name}>Fleet Management</h1>
      <section id="project-info" className={styles.projectInfo} aria-label="Project information">
        <dl>{projectFields.map(([label, value]) => <div key={label}>
          <dt className={portfolio.eyebrow}>{label}</dt>
          <dd className={portfolio.metric}>{value}</dd>
        </div>)}</dl>
      </section>
      <div className={`${portfolio.bio} ${styles.introCta}`}>
        <p>Why were the same trucks getting serviced more than once in a week?</p>
        <button id="start-story" className={portfolio.cta} type="button">Next <span aria-hidden="true">↗</span></button>
      </div>
    </div>
    <div id="story-content" className={styles.storyContent} hidden>
      <h1 className={portfolio.name}>Why the same trucks kept coming back to the shop.</h1>
      <p className={`${portfolio.metric} ${styles.storyIntro}`}>Shop technicians noticed the same trucks returning for oil changes and tire rotations within one week.</p>
      <div className={styles.modeSwitch} aria-label="Approach">
        <button type="button" className={portfolio.control} data-mode="then" aria-pressed="true">Then <small>2021–22</small></button>
        <button type="button" className={portfolio.control} data-mode="today" aria-pressed="false">Today <small>Agent review</small></button>
      </div>
      <p id="mode-description" className={styles.modeDescription} />
      <nav id="story-steps" className="story-steps" aria-label="Story chapters" />
      <section className={`${portfolio.bio} ${styles.chapter}`} aria-live="polite">
        <span id="chapter-number" className={portfolio.eyebrow} />
        <h2 id="chapter-title" />
        <p id="chapter-copy" />
        <button id="next-chapter" className={portfolio.cta} type="button">Continue <span aria-hidden="true">↗</span></button>
      </section>
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

  return <div ref={rootRef} className={`workspace ${styles.root}`} data-intro="true">
    <PortfolioShell sidebar={<FleetSidebar />} sidebarClassName={`story-panel ${styles.sidebar}`} sidebarLabel="Fleet case study" mainClassName={styles.main}>
      <nav className={`${portfolio.links} ${styles.siteNavigation}`} aria-label="Portfolio navigation">
        <PortfolioLinks workHref="/#work" />
      </nav>
      <div className={styles.workspaceBody}>
        <section className={`world-panel ${portfolio.card} ${styles.worldPanel}`} aria-label="Oakland operations scene">
          <div id="world" className={`world ${styles.world}`}><div id="scene-loading" className={styles.sceneLoading}>Preparing operations scene…</div></div>
          <div id="scene-notice" className={styles.sceneNotice} role="status" hidden />
          <div className={styles.worldToolbar}>
            <div className={styles.segmented} role="group" aria-label="Camera view">
              <button className={portfolio.control} data-view="2d" type="button" aria-pressed="false">2D</button>
              <button className={portfolio.control} data-view="3d" type="button" aria-pressed="false">3D</button>
              <button className={portfolio.control} data-view="iso" type="button" aria-pressed="true">ISO</button>
            </div>
            <button id="overview" type="button" className={portfolio.control}>Overview</button>
            <button id="follow" type="button" className={portfolio.control} aria-pressed="false">◎ Follow vehicle</button>
            <span className={styles.toolbarSpacer} />
            <button id="pause" type="button" className={portfolio.control}>Ⅱ Pause</button>
            <button id="reset" type="button" className={portfolio.control} aria-label="Reset demo">↺ Reset</button>
            <button id="about-toggle" className={portfolio.control} type="button" aria-label="About this demo" aria-expanded="false">Details</button>
          </div>
          <div className={styles.placeLabels}>
            <button className={portfolio.control} data-focus="oict" type="button">OICT</button>
            <button className={portfolio.control} data-focus="centerpoint" type="button">Drone factory</button>
            <button className={portfolio.control} data-focus="depot" type="button">Workshop</button>
          </div>
          <div className={`impact-strip ${styles.impactStrip}`}>
            <div><span className={portfolio.eyebrow}>Selected asset</span><strong id="selected-asset">TRK-104</strong><small id="asset-role">Migrated vehicle</small></div>
            <div><span className={portfolio.eyebrow}>Odometer used for maintenance</span><strong id="canonical-reading">Unresolved</strong><small id="canonical-source">Choose an odometer source</small></div>
          </div>
          <div id="about-panel" className={styles.aboutPanel} hidden>
            <button id="about-close" className={`${portfolio.control} ${styles.close}`} type="button" aria-label="Close demo details">×</button>
            <h2>About this demo</h2>
            <p>The incident is real. Vehicle IDs, readings, dates and shop visits in this synthetic demo are examples, not live telemetry. The Oakland map provides geographic context; the workshop, factory activity and routes are illustrative.</p>
            <p>The exact maintenance-trigger rule is unknown. The animation shows the reported repeat visits without claiming to reproduce that rule.</p>
            <p>Provider A and Provider B are anonymous. Networkfleet / Verizon, Samsara and Wright Express / WEX are examples from the integration ecosystem, not identified as either provider in this incident.</p>
            <details><summary>Data and performance</summary><p id="integrity-count" /><p>Original readings and service history are preserved. Settings are versioned and recalculated results are derived views.</p><p><span id="run-status">Scene running</span> · 20 Hz simulation with interpolated rendering.</p><p id="performance">Performance measurement pending</p><p>Browser frame cadence is not a physical-GPU benchmark.</p></details>
            <p><a href="/fleet-demo/reno.html">Original Reno console ↗</a></p>
            <AnimatedLink href="/projects/fleet-fuel-integration">Read the original case study ↗</AnimatedLink>
          </div>
        </section>
        <aside className={`inspector-panel ${portfolio.card} ${styles.inspectorPanel}`} aria-label="Source controls" hidden>
          <div id="source-inspector" hidden>
            <div className={styles.inspectorHeading}><span className={portfolio.eyebrow}>Odometer sources</span><h2>Inspect the evidence</h2><p>Choose which source supplies each vehicle’s odometer.</p></div>
            <div className={styles.vehicleTabs} role="group" aria-label="Inspect vehicle">
              <button className={portfolio.control} type="button" data-vehicle="TRK-104" aria-pressed="true">TRK-104 <small>Migrated</small></button>
              <button className={portfolio.control} type="button" data-vehicle="TRK-208" aria-pressed="false">TRK-208 <small>Still on A</small></button>
            </div>
            <div id="provenance" />
            <div id="app-feedback" className={styles.feedback} role="status" aria-live="polite" />
          </div>
        </aside>
      </div>
      <noscript><p>JavaScript is needed to run this interactive demo. <a href="/projects/fleet-fuel-integration">Read the original case study.</a></p></noscript>
    </PortfolioShell>
  </div>
}
