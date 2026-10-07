"use client"

import { useEffect, useRef } from "react"
import PortfolioShell from "./portfolio-shell"
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
    <div id="sidebar-story-body" className={styles.sidebarStoryBody}>
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
      <div id="sidebar-scenes" className={styles.sidebarScenes} hidden>
              <div data-story-sidebar="integration" className={`${styles.integrationCard} ${styles.sidebarScene}`} hidden>
                <span className={portfolio.eyebrow}>What is an integration?</span>
                <h2 className={portfolio.name}>A connection that keeps work moving.</h2>
                <div className={styles.dataRoute}><span>Fuel &amp; telematics providers</span><b aria-hidden="true">↓</b><span>API · automated data exchange</span><b aria-hidden="true">↓</b><span>Fleet operations software</span></div>
                <p>Fuel: purchases and consumption.<br />Telematics: mileage and vehicle activity.</p>
                <small>Teams use this data to budget, schedule service and keep trucks on the road.</small>
              </div>
              <div data-story-sidebar="mileage-loop" className={`${styles.mileageOverlay} ${styles.sidebarScene}`} hidden>
                <span className={portfolio.eyebrow}>Day <span id="mileage-day">1</span></span>
                <div className={styles.mileageValues}><span><small>OLD SOURCE</small>30,000</span><b aria-hidden="true">→</b><span><small>CURRENT SOURCE</small><span id="mileage-current">50,000</span></span></div>
                <div className={styles.odometer}><span id="mileage-value">30,000</span><small>miles in the system</small></div>
                <div id="mileage-alert" className={styles.mileageAlert}>Stale reading imported again</div>
                <p>The reading resets. The next jump looks like more driving.</p>
              </div>
              <div data-story-sidebar="solution" className={`${styles.solutionCard} ${styles.sidebarScene}`} hidden>
                <h2 className={portfolio.name}>The change I designed</h2>
                <p className={styles.dialogueCopy}>I traced the import workflow with support and developers, then designed per-vehicle odometer sources and reading exclusions.</p>
                <div className={styles.decisionRow}><span>TRK-104</span><strong>Choose its odometer source</strong></div>
                <div className={styles.decisionRow}><span>OLD READINGS</span><strong>Exclude them from decisions</strong></div>
                <div className={styles.decisionRow}><span>ORIGINAL HISTORY</span><strong>Keep it intact</strong></div>
                <p>Each vehicle keeps its own source.</p>
              </div>
              <div data-story-sidebar="agents" className={`${styles.agentCard} ${styles.sidebarScene}`} hidden>
                <h2 className={portfolio.name}>How I’d approach it today</h2>
                <p className={styles.dialogueCopy}>Agents would flag conflicting readings and notify the fleet manager. A person would approve the source change.</p>
                <ol className={styles.agentSteps}><li data-agent-step="0"><span>01</span><div><strong>Check incoming data</strong><small>Agent compares sources and reading patterns</small></div></li><li data-agent-step="1"><span>02</span><div><strong>Flag &amp; notify</strong><small>Show the conflict and supporting evidence</small></div></li><li data-agent-step="2"><span>03</span><div><strong>A person decides</strong><small>Approve the source; preserve the history</small></div></li></ol>
              </div>
      </div>
      <div id="chapter-takeaway" className={`${portfolio.bio} ${styles.chapterTakeaway}`} />
      <div className={`${portfolio.bio} ${styles.chapterNavigation}`}>
        <p>Pause, scrub or step through at any time.</p>
        <button id="open-source-controls" className={portfolio.control} type="button" hidden>Try the source controls ↗</button>
        <button id="run-story-review" className={portfolio.control} type="button" hidden>Run an example review ↗</button>
      </div>
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
      <div className={styles.workspaceBody}>
        <section className={`world-panel ${portfolio.card} ${styles.worldPanel}`} aria-label="Interactive fleet story">
          <div className={styles.stageViewport}>
            <div id="world" className={`world ${styles.world}`}><div id="scene-loading" className={styles.sceneLoading}>Preparing operations scene…</div></div>
            <div id="scene-notice" className={styles.sceneNotice} role="status" hidden />
            <div id="story-overlays" className={styles.storyOverlays}>



              <div data-story-overlay="provider-switch" className={styles.providerOverlay} hidden>
                <div className={styles.devicePair}>
                  <div className={styles.device} data-provider="verizon"><span className={styles.deviceLight} /><div className={styles.deviceBrand}><strong>Verizon</strong><span>Networkfleet</span></div><small>DAILY IMPORT · ACTIVE</small></div>
                  <span className={styles.providerPlus} aria-hidden="true">+</span>
                  <div className={styles.device} data-provider="samsara"><span className={styles.deviceLight} /><div className={styles.deviceBrand}><strong>Samsara</strong></div><small>DAILY IMPORT · ACTIVE</small></div>
                </div>
                <h2>The customer switched providers</h2>
                <p>but didn’t inform us, so we were importing from both, daily</p>
                <strong className={styles.months}>FOR MONTHS</strong>
              </div>

              <article data-story-overlay="cost" className={styles.receipt} hidden aria-label="Service receipt">
                <header className={styles.receiptHeader}><h2>Service receipt</h2><p>TRK-104</p></header>
                <div className={styles.receiptColumns}><span>SERVICE</span><span>AMOUNT</span></div>
                <div className={styles.receiptLines}>
                  <div data-cost-visit="1"><div><strong>Oil change</strong><span>Visit 1</span></div><strong>$350.00</strong></div>
                  <div data-cost-visit="2"><div><strong>Oil change</strong><span>Visit 2 · same week</span></div><strong>$350.00</strong></div>
                </div>
                <p id="cost-caption" className={styles.receiptCount}>1 service</p>
                <div className={styles.receiptTotal}><span>TOTAL</span><strong id="cost-total">$350.00</strong></div>
                <div className={styles.receiptDuplicate}><span>DUPLICATE SERVICE</span><strong id="cost-duplicate">$0.00</strong></div>
              </article>

              <div data-story-overlay="learning" className={styles.learningCard} hidden>
                <span className={portfolio.eyebrow}>What I learned</span><h2>Good data needs<br />a clear owner.</h2><p>Make the source visible.<br />Make the decision deliberate.<br />Keep the history.</p>
              </div>
            </div>
            <div id="camera-controls" className={styles.sceneViewControls} role="group" aria-label="Camera view">
              <button className={portfolio.control} data-view="2d" type="button" aria-label="2D" title="2D map" aria-pressed="false" disabled><svg className={styles.materialSymbol} width="24" height="24" viewBox="0 -960 960 960" aria-hidden="true" focusable="false" data-material-symbol="map"><path d="m600-120-240-84-186 72q-20 8-37-4.5T120-170v-560q0-13 7.5-23t20.5-15l212-72 240 84 186-72q20-8 37 4.5t17 33.5v560q0 13-7.5 23T812-192l-212 72Zm-40-98v-468l-160-56v468l160 56Zm80 0 120-40v-474l-120 46v468Zm-440-10 120-46v-468l-120 40v474Zm440-458v468-468Zm-320-56v468-468Z" /></svg></button>
              <button className={portfolio.control} data-view="3d" type="button" aria-label="3D" title="3D perspective" aria-pressed="false" disabled><svg className={styles.materialSymbol} width="24" height="24" viewBox="0 -960 960 960" aria-hidden="true" focusable="false" data-material-symbol="view_in_ar"><path d="M440-181 240-296q-19-11-29.5-29T200-365v-230q0-22 10.5-40t29.5-29l200-115q19-11 40-11t40 11l200 115q19 11 29.5 29t10.5 40v230q0 22-10.5 40T720-296L520-181q-19 11-40 11t-40-11Zm0-92v-184l-160-93v185l160 92Zm80 0 160-92v-185l-160 93v184ZM80-680v-120q0-33 23.5-56.5T160-880h120v80H160v120H80ZM280-80H160q-33 0-56.5-23.5T80-160v-120h80v120h120v80Zm400 0v-80h120v-120h80v120q0 33-23.5 56.5T800-80H680Zm120-600v-120H680v-80h120q33 0 56.5 23.5T880-800v120h-80ZM480-526l158-93-158-91-158 91 158 93Zm0 45Zm0-45Zm40 69Zm-80 0Z" /></svg></button>
              <button className={portfolio.control} data-view="iso" type="button" aria-label="ISO" title="Isometric 3D" aria-pressed="true" disabled><svg className={styles.materialSymbol} width="24" height="24" viewBox="0 -960 960 960" aria-hidden="true" focusable="false" data-material-symbol="deployed_code"><path d="M440-183v-274L200-596v274l240 139Zm80 0 240-139v-274L520-457v274Zm-40-343 237-137-237-137-237 137 237 137ZM160-252q-19-11-29.5-29T120-321v-318q0-22 10.5-40t29.5-29l280-161q19-11 40-11t40 11l280 161q19 11 29.5 29t10.5 40v318q0 22-10.5 40T800-252L520-91q-19 11-40 11t-40-11L160-252Zm320-228Z" /></svg></button>
            </div>
          </div>
          <div className={`story-dock ${styles.storyDock}`} aria-label="Story playback and vehicle context">
            <div className={`impact-strip ${styles.impactStrip}`}>
              <div><span className={portfolio.eyebrow}>Following one truck</span><strong id="selected-asset">TRK-104</strong><small id="asset-role"></small></div>
              <div><span className={portfolio.eyebrow}>Service visits</span><strong id="service-visits">—</strong><small id="service-summary"></small></div>
              <div><span className={portfolio.eyebrow}>Repeat service cost</span><strong id="maintenance-cost">—</strong><small id="maintenance-cost-note">Labor, parts and downtime</small></div>
            </div>
            <div className={styles.timelineHeader}><span id="story-position" className={portfolio.eyebrow}>01 / 09 · The question</span><span id="playback-status">Preparing story</span></div>
            <div id="scene-steps" className={styles.sceneSteps} aria-label="Choose a scene" />
            <div id="story-transport" className={styles.storyTransport} role="group" aria-label="Story playback">
              <label className={styles.srOnly} htmlFor="story-progress">Scrub through the story</label>
              <input id="story-progress" disabled className={styles.storyProgress} type="range" min="0" max="124" step="0.1" defaultValue="0" aria-valuetext="Scene 1 of 9" />
              <div className={styles.transportRow}>
                <div className={styles.playbackControls}>
                  <button id="previous-chapter" className={portfolio.control} type="button" aria-label="Previous scene" aria-keyshortcuts="ArrowLeft" title="Previous scene" disabled hidden><svg className={styles.materialSymbol} width="24" height="24" viewBox="0 -960 960 960" aria-hidden="true" focusable="false" data-material-symbol="skip_previous"><path d="M220-240v-480h80v480h-80Zm520 0L380-480l360-240v480Zm-80-240Zm0 90v-180l-136 90 136 90Z" /></svg></button>
                  <button id="pause" className={portfolio.cta} type="button" aria-label="Play story" aria-keyshortcuts="Space" title="Play story" disabled><span data-playback-icon="play"><svg className={styles.materialSymbol} width="24" height="24" viewBox="0 -960 960 960" aria-hidden="true" focusable="false" data-material-symbol="play_arrow"><path d="M320-200v-560l440 280-440 280Zm80-280Zm0 134 210-134-210-134v268Z" /></svg></span><span data-playback-icon="pause" hidden><svg className={styles.materialSymbol} width="24" height="24" viewBox="0 -960 960 960" aria-hidden="true" focusable="false" data-material-symbol="pause"><path d="M520-200v-560h240v560H520Zm-320 0v-560h240v560H200Zm400-80h80v-400h-80v400Zm-320 0h80v-400h-80v400Zm0-400v400-400Zm320 0v400-400Z" /></svg></span></button>
                  <button id="next-chapter" className={portfolio.control} type="button" aria-label="Next scene" aria-keyshortcuts="ArrowRight" title="Next scene" disabled><svg className={styles.materialSymbol} width="24" height="24" viewBox="0 -960 960 960" aria-hidden="true" focusable="false" data-material-symbol="skip_next"><path d="M660-240v-480h80v480h-80Zm-440 0v-480l360 240-360 240Zm80-240Zm0 90 136-90-136-90v180Z" /></svg></button>
                </div>
                <span className={styles.playbackTime} aria-label="Playback time"><span id="story-elapsed">0:00</span><span aria-hidden="true"> / </span><span id="story-duration">2:04</span></span>
              </div>
            </div>

          </div>
          <div id="source-dialog" className={styles.sourceDialog} role="dialog" aria-modal="true" aria-labelledby="source-dialog-title" hidden>
            <button id="source-close" className={`${portfolio.control} ${styles.close}`} type="button" aria-label="Close source controls">×</button>
            <h2 id="source-dialog-title">Choose the source. Keep the history.</h2>
            <p>Choose which provider supplies this vehicle’s odometer.</p>
            <div id="reading-context" className={styles.readingContext}><span className={portfolio.eyebrow}>Odometer used for maintenance</span><strong id="canonical-reading">Unresolved</strong><small id="canonical-source">Choose an odometer source</small></div>
            <div id="source-inspector"><div id="provenance" /><div id="app-feedback" className={styles.feedback} role="status" aria-live="polite" /></div>
            <p id="mode-description" className={styles.modeDescription} />
          </div>

        </section>
      </div>
      <noscript><p>JavaScript is needed to run this interactive story. <a href="/projects/fleet-fuel-integration">Read the original case study.</a></p></noscript>
    </PortfolioShell>
  </div>
}
