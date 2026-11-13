"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import PortfolioShell from "./portfolio-shell"
import styles from "./portfolio-home.module.css"

const CFG = { shot: 2600, lead: 420, drift: true }
const ROUTE_FADE_MS = 220

type Project = {
  slug: string
  title: string
  date: string
  role: string
  business: string
  outcome: string
  href?: string
  hero: string | null
  rest: { src: string; alt: string }[]
}

const projects: Project[] = [
  {
    slug: "fleet-fuel",
    title: "Streamlining Fuel Management for Large Fleets",
    date: "2021",
    role: "Product Designer",
    business: "Collective Data: Enterprise fleet management",
    outcome: "90% faster resolution of fuel-integration data issues.",
    href: "/projects/fleet-fuel-integration",
    hero: "/fleet-management-overview.webp",
    rest: [
      { src: "/fleet-management-fuel-logs.webp", alt: "Fleet Management prototype fuel log with flagged transactions explained in line" },
      { src: "/fleet-management-vehicles.webp", alt: "Collective Fleet vehicle management interface showing fleet asset records" },
      { src: "/fleet-management-live-map.webp", alt: "Collective Fleet live map interface showing fleet vehicles and asset locations" },
    ],
  },
  {
    slug: "enfusion-field-kit",
    title: "Enfusion Field Kit",
    date: "Jan 2026",
    role: "Product Designer & Design Engineer",
    business: "Independent project: Game-development tools",
    outcome: "Cut a 14-set texture workflow from ~45 minutes to ~90 seconds, in one browser tool.",
    href: "/projects/enfusion-field-kit",
    hero: "/enfusion-field-kit.webp",
    rest: [
      { src: "/enfusion-field-kit-textures.webp", alt: "Enfusion Field Kit step for assigning five texture images to each part of a model" },
      { src: "/enfusion-field-kit-pack.webp", alt: "Enfusion Field Kit texture pack step showing the five source maps for a material" },
      { src: "/enfusion-field-kit-resize.webp", alt: "Enfusion Field Kit resize step with a target size per texture file" },
    ],
  },
]

function Card({ p, onNavigate }: { p: Project; onNavigate: (href: string) => void }) {
  const mediaRef = useRef<HTMLDivElement>(null)
  const leadRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [idx, setIdx] = useState(0)
  const [active, setActive] = useState(false)
  const shots = [{ src: p.hero as string, alt: `${p.title} project overview` }, ...p.rest]
  const count = shots.length

  const clear = () => {
    if (leadRef.current) clearTimeout(leadRef.current)
    if (tickRef.current) clearInterval(tickRef.current)
    leadRef.current = null
    tickRef.current = null
  }

  const start = () => {
    if (count < 2) return
    clear()
    setActive(true)
    leadRef.current = setTimeout(() => {
      setIdx(1)
      tickRef.current = setInterval(() => setIdx((i) => (i + 1) % count), CFG.shot)
    }, CFG.lead)
  }

  const stop = () => {
    clear()
    setActive(false)
    setIdx(0)
  }

  // Touch devices have no hover, so play the slideshow while the card is in view.
  useEffect(() => {
    const media = mediaRef.current
    if (!media || count < 2 || !window.matchMedia("(hover: none)").matches) return clear
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return clear
    const observer = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()), { threshold: 0.7 })
    observer.observe(media)
    return () => {
      observer.disconnect()
      clear()
    }
  }, [count])

  const hover = (fn: () => void) => () => {
    if (window.matchMedia("(hover: hover)").matches) fn()
  }

  const article = (
    <article className={styles.card} data-slug={p.slug} onMouseEnter={hover(start)} onMouseLeave={hover(stop)}>
      <div className={styles.media} ref={mediaRef}>
        <div className={`${styles.drift} ${active && CFG.drift ? styles["drift-on"] : ""}`}>
          {shots.map((s, i) => (
            <div className={`${styles.layer} ${i === idx ? styles["layer-on"] : ""}`} key={i}>
              <img className={styles.shot} src={s.src || "/placeholder.svg"} alt={s.alt} loading={i === 0 ? "eager" : "lazy"} decoding="async" />
            </div>
          ))}
        </div>
        {count > 1 && <span className={`${styles.count} ${active ? styles["count-on"] : ""}`} aria-hidden="true">{idx + 1} / {count}</span>}
      </div>
      <div className={styles.info}>
        <div>
          <h2 className={styles.t}>{p.title}{p.href && <span className={styles.arrow} aria-hidden="true">→</span>}</h2>
          <p className={styles.sub}>{p.business}<br />{p.role} · {p.date}</p>
        </div>
        <p className={styles.outcome}>{p.outcome}</p>
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
    <PortfolioShell leaving={leaving}>
      {visible.map((p) => <Card key={p.slug} p={p} onNavigate={navigate} />)}
    </PortfolioShell>
  )
}
