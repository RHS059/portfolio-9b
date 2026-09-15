"use client"

import { useEffect, useState, type ReactNode } from "react"
import ProjectSidebar from "./project-sidebar"

interface Section {
  id: string
  title: string
}

interface ProjectLayoutProps {
  sections: Section[]
  children: ReactNode
}

export default function ProjectLayout({ sections, children }: ProjectLayoutProps) {
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className={`cs-grid${entered ? " is-entered" : ""}`}>
      <div className="cs-side-wrap cs-route-panel">
        <ProjectSidebar sections={sections} />
      </div>

      <main className="cs-main cs-route-panel">{children}</main>

      <footer className="cs-foot">
        <div>Client work shown remains the property of its owners.</div>
        <div className="cs-foot-c">Copyright © Reid Slaughter</div>
        <div className="cs-foot-r">
          <a href="https://www.linkedin.com/in/reid59slaughter/" target="_blank" rel="noopener noreferrer">
            LinkedIn
          </a>
          <a href="https://x.com/reidhslaughter" target="_blank" rel="noopener noreferrer">
            X
          </a>
        </div>
      </footer>

      <style jsx global>{`
        :root {
          --cs-sidebar: oklch(0.972 0.008 92);
          --cs-main-bg: oklch(0.922 0.008 92);
          --cs-footer: oklch(0.945 0.011 92);
          --cs-footer-rule: oklch(0.885 0.014 92);
          --cs-sidebar-rule: oklch(0.89 0.008 300);
          --cs-ink: oklch(0.17 0.032 297);
          --cs-body: oklch(0.31 0.022 297);
          --cs-muted: oklch(0.47 0.02 297);
          --cs-muted-2: oklch(0.55 0.02 297);
          --cs-accent: oklch(0.44 0.2 293);
        }

        .cs-grid {
          max-width: 2200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(280px, 25vw) 1fr;
          align-items: start;
          background: var(--cs-main-bg);
          color: var(--cs-ink);
          font-family: var(--font-inter), Inter, Helvetica, Arial, sans-serif;
        }
        .cs-route-panel {
          opacity: 0;
          transition: opacity 280ms ease;
        }
        .cs-grid.is-entered .cs-route-panel {
          opacity: 1;
        }
        .cs-side-wrap {
          grid-column: 1;
          grid-row: 1 / span 2;
          align-self: stretch;
          background: var(--cs-sidebar);
        }
        .cs-main {
          grid-column: 2;
          grid-row: 1;
          padding: clamp(28px, 3vw, 56px) clamp(20px, 3vw, 60px);
          min-width: 0;
          background: var(--cs-main-bg);
        }

        .cs-foot {
          grid-column: 2;
          grid-row: 2;
          background: var(--cs-footer);
          border-top: 1px solid var(--cs-footer-rule);
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 20px;
          padding: 18px clamp(16px, 1.6vw, 30px);
          font-size: 12.5px;
          line-height: 1.5;
          color: var(--cs-muted);
        }
        .cs-foot > div {
          white-space: nowrap;
          align-self: center;
        }
        .cs-foot-c {
          text-align: center;
        }
        .cs-foot-r {
          justify-self: end;
          display: flex;
          align-items: center;
          gap: 18px;
        }
        .cs-foot a {
          color: var(--cs-muted);
          text-decoration: none;
        }
        .cs-foot a:hover {
          color: var(--cs-accent);
        }

        @media (prefers-reduced-motion: reduce) {
          .cs-route-panel {
            transition: none;
          }
        }

        @media (max-width: 900px) {
          .cs-grid {
            grid-template-columns: 1fr;
          }
          .cs-side-wrap {
            grid-row: auto;
          }
          .cs-main {
            grid-column: 1;
            grid-row: auto;
          }
          .cs-foot {
            grid-column: 1;
            grid-row: auto;
            grid-template-columns: 1fr;
            row-gap: 10px;
          }
          .cs-foot-c {
            text-align: left;
          }
          .cs-foot-r {
            justify-self: start;
          }
        }
      `}</style>
    </div>
  )
}
