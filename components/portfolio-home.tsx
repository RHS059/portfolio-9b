"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import PortfolioShell from "./portfolio-shell"
import styles from "./portfolio-home.module.css"

const CFG = { shot: 2600, fade: 1300, lead: 420, drift: true }
const ROUTE_FADE_MS = 220

type Project = {
  slug: string
  title: string
  date: string
  href?: string
  hero: string | null
  rest: { src: string; alt: string }[]
}

const projects: Project[] = [
  {
    slug: "fleet-fuel",
    title: "Streamlining Fuel Management for Large Fleets",
    date: "Apr 2024",
    href: "/projects/fleet-fuel-integration",
    hero: "/fleet-management-overview.webp",
    rest: [
      { src: "/fleet-management-vehicles.webp", alt: "Collective Fleet vehicle management interface showing fleet asset records" },
      { src: "/fleet-management-live-map.webp", alt: "Collective Fleet live map interface showing fleet vehicles and asset locations" },
    ],
  },
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
      { src: "/arma-drag-drop.png", alt: "Arma Reforger Texture Wizard bulk drag-and-drop texture upload workflow" },
      { src: "/arma-auto-sort.png", alt: "Texture Wizard automatically grouping uploaded files into matching texture sets" },
      { src: "/arma-manual-override.png", alt: "Texture Wizard manual override for assigning files that do not match naming conventions" },
      { src: "/arma-alias-settings.png", alt: "Texture Wizard configurable filename alias settings for texture type detection" },
      { src: "/arma-resize.png", alt: "Texture Wizard export resolution controls for resizing game textures" },
      { src: "/arma-batch-export.png", alt: "Texture Wizard batch export interface for downloading converted texture sets" },
    ],
  },
]

function Card({ p, onNavigate }: { p: Project; onNavigate: (href: string) => void }) {
  const cardRef = useRef<HTMLElement>(null)
  const leadRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const shots = [{ src: p.hero as string, alt: `${p.title} project overview` }, ...p.rest]

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
            <img className={styles.mat} src={s.src || "/placeholder.svg"} alt="" aria-hidden="true" loading={p.slug === "enfusion-field-kit" && i === 0 ? "eager" : "lazy"} decoding="async" />
            <img className={styles.shot} src={s.src || "/placeholder.svg"} alt={s.alt} loading={p.slug === "enfusion-field-kit" && i === 0 ? "eager" : "lazy"} decoding="async" />
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
    <PortfolioShell leaving={leaving}>
      {visible.map((p) => <Card key={p.slug} p={p} onNavigate={navigate} />)}
    </PortfolioShell>
  )
}
