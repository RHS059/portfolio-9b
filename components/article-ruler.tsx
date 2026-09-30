"use client"

import { useEffect, useId, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { List } from "lucide-react"
import styles from "./article-ruler.module.css"

type Entry = { slug: string; title: string; publishedAt: string }

export default function ArticleRuler({ articles }: { articles: Entry[] }) {
  const pathname = usePathname()
  const viewport = useRef<HTMLDivElement>(null)
  const [pinned, setPinned] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const panelId = useId()
  const open = pinned || hovered || focused

  useEffect(() => {
    const container = viewport.current
    const current = container?.querySelector<HTMLElement>('[aria-current="page"]')
    if (container && current) container.scrollTo({ top: Math.max(0, current.offsetTop - container.clientHeight / 2 + current.offsetHeight / 2), behavior: "auto" })
  }, [pathname])

  return (
    <nav className={styles.archive} data-open={open} aria-label="Published articles"
      onPointerEnter={(event) => { if (event.pointerType === "mouse") setHovered(true) }}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false) }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.currentTarget.querySelector("button")?.focus()
          setPinned(false); setHovered(false); setFocused(false)
        }
      }}>
      <button className={styles.toggle} type="button" aria-label={pinned ? "Unpin article dates" : "Pin article dates"} aria-pressed={pinned} aria-expanded={open} aria-controls={panelId} onClick={() => { setPinned((value) => !value); setFocused(false); setHovered(false) }} title="Browse articles">
        <List size={17} aria-hidden="true" />
      </button>
      <div id={panelId} ref={viewport} className={styles.viewport} aria-label="Scroll through article dates">
        {articles.length > 0 ? (
          <ol className={styles.ruler}>
            {articles.map((article) => {
              const active = pathname === `/writing/${article.slug}` || (pathname === "/writing" && article === articles[0])
              const [year, month, day] = article.publishedAt.split("-")
              return (
                <li className={styles.entry} key={article.slug}>
                  <Link className={`${styles.date} ${active ? styles.active : ""}`} href={`/writing/${article.slug}`} aria-current={active ? "page" : undefined} aria-label={`${month}/${day}/${year}: ${article.title}`} title={article.title} prefetch={false}>
                    <time dateTime={article.publishedAt}>{month}/{day}/{year}</time>
                    <span className={styles.tick} aria-hidden="true" />
                  </Link>
                  <span className={styles.minorTick} aria-hidden="true" />
                </li>
              )
            })}
          </ol>
        ) : (
          <div className={styles.empty}>
            <p>No published articles yet.</p>
            <div className={styles.emptyTicks} aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</div>
          </div>
        )}
      </div>
    </nav>
  )
}
