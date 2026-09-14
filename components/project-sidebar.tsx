"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

interface Section {
  id: string
  title: string
}

interface ProjectSidebarProps {
  sections: Section[]
}

export default function ProjectSidebar({ sections }: ProjectSidebarProps) {
  const [activeSection, setActiveSection] = useState<string>("")

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((entry) => entry.isIntersecting)
        if (visibleEntries.length > 0) {
          const mostVisible = visibleEntries.reduce((prev, current) => {
            if (Math.abs(current.boundingClientRect.top) < Math.abs(prev.boundingClientRect.top)) {
              return current
            }
            return prev
          })
          setActiveSection(mostVisible.target.id)
        }
      },
      {
        rootMargin: "-80px 0px -60% 0px",
        threshold: [0.1, 0.3, 0.5, 0.7],
      },
    )

    sections.forEach(({ id }) => {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [sections])

  const handleSectionClick = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
      const heading = element.querySelector("h2")
      if (heading) heading.focus()
    }
  }

  return (
    <aside className="cs-side">
      <div>
        <Link href="/" className="cs-back">
          <span aria-hidden="true">←</span> Back to work
        </Link>

        <nav className="cs-nav" aria-label="Sections">
          {sections.map(({ id, title }) => (
            <button
              key={id}
              onClick={() => handleSectionClick(id)}
              className={`cs-nav-link${activeSection === id ? " is-active" : ""}`}
              aria-current={activeSection === id ? "true" : undefined}
            >
              {title}
            </button>
          ))}
        </nav>
      </div>

      <div className="cs-cta-wrap">
        <a className="cs-cta" href="mailto:reids@reidhslaughter.com">
          Reach Out
        </a>
      </div>

      <style jsx global>{`
        .cs-side {
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 40px;
          padding: 28px 30px 26px;
          box-sizing: border-box;
        }

        .cs-back {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 13px;
          font-weight: 500;
          color: var(--cs-muted-2);
          text-decoration: none;
          transition: color 140ms ease;
        }
        .cs-back:hover {
          color: var(--cs-accent);
        }

        .cs-nav {
          margin-top: 24px;
          display: flex;
          flex-direction: column;
          border-top: 1px solid var(--cs-sidebar-rule);
          padding-top: 12px;
        }
        .cs-nav-link {
          appearance: none;
          background: none;
          border: none;
          cursor: pointer;
          font: inherit;
          text-align: left;
          padding: 6px 0 6px 12px;
          border-left: 2px solid transparent;
          font-size: 13.5px;
          line-height: 1.35;
          color: var(--cs-body);
          transition: color 140ms ease, border-color 140ms ease;
        }
        .cs-nav-link:hover {
          color: var(--cs-ink);
        }
        .cs-nav-link.is-active {
          font-weight: 600;
          color: var(--cs-ink);
          border-left-color: var(--cs-accent);
        }

        .cs-cta-wrap {
          display: flex;
          flex-direction: column;
        }
        .cs-cta {
          display: block;
          box-sizing: border-box;
          width: 100%;
          padding: 14px 16px;
          border-radius: 4px;
          border: 1px solid var(--cs-ink);
          background: var(--cs-ink);
          color: #fff !important;
          font-size: 13.5px;
          font-weight: 500;
          text-align: center;
          text-decoration: none;
          transition: background 160ms ease, border-color 160ms ease;
        }
        .cs-cta:hover {
          background: var(--cs-accent);
          border-color: var(--cs-accent);
        }

        @media (max-width: 900px) {
          .cs-side {
            position: static;
            height: auto;
            overflow: visible;
            gap: 24px;
          }
        }
      `}</style>
    </aside>
  )
}
