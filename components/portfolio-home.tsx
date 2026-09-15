"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import styles from "./portfolio-home.module.css"

const CFG = { shot: 2600, fade: 1300, lead: 420, drift: true }
const ROUTE_FADE_MS = 220

type Project = {
  slug: string
  title: string
  date: string
  href?: string
  hero: string | null
  rest: string[]
}

const projects: Project[] = [
  {
    slug: "enfusion-field-kit",
    title: "Enfusion Field Kit",
    date: "Jan 2026",
    href: "/enfusion_field_kit_beta",
    hero: "/enfusion-field-kit.webp",
    rest: [],
  },
  {
    slug: "texture-wizard",
    title: "Arma Reforger Texture Wizard",
    date: "Sep 2025",
    href: "/projects/arma-reforger-texture-wizard",
    hero: "/arma-texture-wizard.png",
    rest: [
      "/arma-drag-drop.png",
      "/arma-auto-sort.png",
      "/arma-manual-override.png",
      "/arma-alias-settings.png",
      "/arma-resize.png",
      "/arma-batch-export.png",
    ],
  },
  {
    slug: "fleet-fuel",
    title: "Streamlining Fuel Management for Large Fleets",
    date: "Apr 2024",
    href: "/projects/fleet-fuel-integration",
    hero: "/fleet-dashboard.png",
    rest: [
      "/fleet-fuel-integration-interface-showing-transacti.png",
      "/fuel-integration-hierarchy.png",
      "/fuel-integration-event-flow.png",
    ],
  },
]

function Card({ p, onNavigate }: { p: Project; onNavigate: (href: string) => void }) {
  const cardRef = useRef<HTMLElement>(null)
  const leadRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const shots = [p.hero as string, ...p.rest]

  const clear = () => {
    if (leadRef.current) clearTimeout(leadRef.current)
    if (tickRef.current) clearInterval(tickRef.current)
    leadRef.current = null
    tickRef.current = null
  }

  useEffect(() => clear, [])

  const onEnter = () => {
    const card = cardRef.current
    if (!card) return
    const layers = Array.from(card.querySelectorAll<HTMLElement>(`.${styles.layer}`))
    if (layers.length < 2) return
    const drift = card.querySelector<HTMLElement>(`.${styles.drift}`)
    const show = (n: number) => layers.forEach((l, k) => (l.style.opacity = k === n ? "1" : "0"))
    layers.forEach((l) => (l.style.transitionDuration = CFG.fade + "ms"))
    if (CFG.drift && drift) drift.style.transform = "scale(1.035)"
    clear()
    leadRef.current = setTimeout(() => {
      let i = 1
      show(1)
      tickRef.current = setInterval(() => {
        i = (i + 1) % layers.length
        show(i)
      }, CFG.shot)
    }, CFG.lead)
  }

  const onLeave = () => {
    const card = cardRef.current
    if (!card) return
    clear()
    const drift = card.querySelector<HTMLElement>(`.${styles.drift}`)
    if (drift) drift.style.transform = "none"
    const layers = Array.from(card.querySelectorAll<HTMLElement>(`.${styles.layer}`))
    layers.forEach((l, k) => (l.style.opacity = k === 0 ? "1" : "0"))
  }

  const article = (
    <article ref={cardRef} className={styles.card} data-slug={p.slug} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <div className={styles.drift}>
        {shots.map((s, i) => (
          <div className={styles.layer} key={i} style={i === 0 ? { opacity: 1 } : undefined}>
            <img className={styles.mat} src={s || "/placeholder.svg"} alt="" aria-hidden="true" loading={p.slug === "enfusion-field-kit" && i === 0 ? "eager" : "lazy"} decoding="async" />
            <img className={styles.shot} src={s || "/placeholder.svg"} alt={i === 0 ? p.title : ""} loading={p.slug === "enfusion-field-kit" && i === 0 ? "eager" : "lazy"} decoding="async" />
          </div>
        ))}
      </div>
      <div className={styles.scrim} />
      <div className={styles.caption}>
        <span className={styles.t}>{p.title}</span>
        <span className={styles.d}>{p.date}</span>
      </div>
    </article>
  )

  if (!p.href) return article

  return (
    <a
      className={styles["card-link"]}
      href={p.href}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
        event.preventDefault()
        onNavigate(p.href as string)
      }}
    >
      {article}
    </a>
  )
}

export default function PortfolioHome() {
  const router = useRouter()
  const [leaving, setLeaving] = useState(false)
  const visible = projects.filter((p) => !!p.hero)

  useEffect(() => {
    visible.forEach((project) => {
      if (project.href) router.prefetch(project.href)
    })
  }, [router, visible])

  const navigate = (href: string) => {
    if (leaving) return
    setLeaving(true)
    window.setTimeout(() => router.push(href), ROUTE_FADE_MS)
  }

  return (
    <div className={`${styles.page} font-sans`}>
      <div className={styles.grid}>
        <div className={`${styles["side-wrap"]} ${styles["route-panel"]} ${leaving ? styles["route-panel-leaving"] : ""}`}>
          <aside className={styles.side}>
            <div>
              <h1>Reid Slaughter</h1>
              <ul className={styles.metrics}>
                <li className={styles.metric}><span className={styles.num}>90%</span> faster support ticket resolution for API integration tickets</li>
                <li className={styles.metric}><span className={styles.num}>80%</span> faster customer upgrades</li>
                <li className={styles.metric}><span className={styles.num}>4.4★</span> app store rating, <span className={styles.num}>5k+</span> downloads</li>
              </ul>
              <div className={styles["cta-wrap"]}>
                <a className={styles.cta} href="mailto:reids@reidhslaughter.com">Reach Out</a>
              </div>
            </div>
            <div className={styles.bio}>
              <div className={styles.eyebrow}>Who am I?</div>
              <p>
                I design and build the front-end interfaces people use to do their jobs. Most of that work has been fleet
                and asset management for construction, utilities, and law enforcement. Later it was library systems
                spanning 540 million bibliographic records.
              </p>
              <p>
                For example, at{" "}
                <a href="https://www.collectivedata.com" target="_blank" rel="noopener noreferrer">Collective Data</a>
                , fuel transaction imports failed quietly. Bad records sat undetected for months, customers paid for the
                cleanup, and engineers burned weeks on the same support tickets. I interviewed support agents, account
                managers, and the vendors we pulled data from, then designed a framework that catches bad records on
                arrival and emails the customer the same day. I rebuilt the integration and the API calls. Onboarding time
                also dropped because we could get integrations working for customers far faster. Resolving a data issue
                went from weeks to hours.
              </p>
              <p className={styles.i}>A client once called me a UX architect by trade and a creative technologist by heart.</p>
              <p>Outside of work I build, texture, and animate in Blender.</p>
              <p className={styles.strong}>I&apos;m looking for design engineering and product design roles.</p>
            </div>
          </aside>
        </div>
        <main id="work" className={`${styles.stack} ${styles["route-panel"]} ${leaving ? styles["route-panel-leaving"] : ""}`}>
          {visible.map((p) => <Card key={p.slug} p={p} onNavigate={navigate} />)}
        </main>
        <footer className={styles.foot}>
          <div>Client work shown remains the property of its owners.</div>
          <div className={styles["foot-c"]}>Copyright © Reid Slaughter</div>
          <div className={styles["foot-r"]}>
            <a href="https://www.linkedin.com/in/reid59slaughter/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
            <a href="https://x.com/reidhslaughter" target="_blank" rel="noopener noreferrer">X</a>
          </div>
        </footer>
      </div>
    </div>
  )
}
