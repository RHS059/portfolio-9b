"use client"

import { useEffect, useId, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, List } from "lucide-react"
import styles from "./article-ruler.module.css"

type Entry = { slug: string; title: string; publishedAt: string }

function displayDate(date: string) {
  const [year, month, day] = date.split("-")
  return `${month}/${day}/${year}`
}

export default function ArticleRuler({ articles }: { articles: Entry[] }) {
  const pathname = usePathname()
  const archive = useRef<HTMLElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)
  const viewport = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const current = articles.find((article) => pathname === `/writing/${article.slug}`) ?? articles[0]

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    if (!open) return
    const container = viewport.current
    const selected = container?.querySelector<HTMLElement>('[aria-current="page"]')
    if (container && selected) container.scrollTo({ top: Math.max(0, selected.offsetTop - container.clientHeight / 2 + selected.offsetHeight / 2), behavior: "auto" })
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !archive.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener("pointerdown", dismiss)
    return () => document.removeEventListener("pointerdown", dismiss)
  }, [open])

  return (
    <nav ref={archive} className={styles.archive} aria-label="Published articles" onKeyDown={(event) => {
      if (event.key === "Escape" && open) {
        event.preventDefault()
        setOpen(false)
        toggle.current?.focus()
      }
    }}>
      <div className={styles.surface}>
        <button ref={toggle} className={styles.toggle} type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)}>
          <List size={16} aria-hidden="true" />
          <span>Articles</span>
          <span className={styles.count}>{articles.length}</span>
          <ChevronDown size={14} className={open ? styles.expanded : undefined} aria-hidden="true" />
        </button>
        {current ? <p className={styles.current}>Current article <time dateTime={current.publishedAt}>{displayDate(current.publishedAt)}</time></p> : null}
        <div id={panelId} ref={viewport} className={styles.viewport} hidden={!open}>
          {articles.length > 0 ? (
            <ol className={styles.ruler}>
              {articles.map((article) => {
                const active = article.slug === current?.slug
                return (
                  <li key={article.slug}>
                    <Link className={`${styles.date} ${active ? styles.active : ""}`} href={`/writing/${article.slug}`} aria-current={active ? "page" : undefined} aria-label={`${displayDate(article.publishedAt)}: ${article.title}${active ? " (current article)" : ""}`} prefetch={false} onClick={() => setOpen(false)}>
                      <span className={styles.dateRow}><time dateTime={article.publishedAt}>{displayDate(article.publishedAt)}</time>{active ? <span className={styles.selected}>Current</span> : null}</span>
                      <span className={styles.title}>{article.title}</span>
                    </Link>
                  </li>
                )
              })}
            </ol>
          ) : <p className={styles.empty}>No published articles yet.</p>}
        </div>
      </div>
    </nav>
  )
}
