import type { ReactNode } from "react"
import { Mail } from "lucide-react"
import PortfolioLinks from "./portfolio-links"
import styles from "./portfolio-home.module.css"

type Props = { children: ReactNode; leaving?: boolean; reading?: boolean }

export default function PortfolioShell({ children, leaving = false, reading = false }: Props) {
  const Name = reading ? "p" : "h1"
  return (
    <div className={`${styles.page} font-sans`}>
      <div className={styles.grid}>
        <div className={`${styles["side-wrap"]} ${styles["route-panel"]} ${leaving ? styles["route-panel-leaving"] : ""}`}>
          <aside className={styles.side}>
            <div>
              <Name className={styles.name}>Reid Slaughter</Name>
              <p className={styles.role}>Product Designer &amp; Design Engineer</p>
              <ul className={styles.metrics}>
                <li className={styles.metric}><span className={styles.num}>90%</span> faster support ticket resolution for API integration tickets</li>
                <li className={styles.metric}><span className={styles.num}>80%</span> faster customer upgrades</li>
                <li className={styles.metric}><span className={styles.num}>4.4★</span> app store rating, <span className={styles.num}>5k+</span> downloads</li>
              </ul>
              <nav className={styles.links} aria-label="Portfolio navigation">
                <PortfolioLinks workHref={reading ? "/#work" : "#work"} />
                <a className={styles.cta} href="mailto:reids@reidhslaughter.com"><Mail size={15} aria-hidden="true" />Reach Out</a>
              </nav>
            </div>
            <div className={styles.bio}>
              <div className={styles.eyebrow}>Who am I?</div>
              <p>
                I design and build the front-end interfaces people use to do their jobs. Most of that work has been fleet
                and asset management for construction, utilities, and law enforcement.
              </p>
              <p className={styles.i}>A client once called me a UX architect by trade and a creative technologist by heart.</p>
              <p>Outside of work I build, texture, and animate in Blender.</p>
              <nav aria-label="Areas of expertise">
                <p>
                  <strong>Areas:</strong>{" "}
                  <a href="/about">Product Design</a> ·{" "}
                  <a href="/projects/fleet-fuel-integration">UX Design</a> ·{" "}
                  <a href="/enfusion_field_kit_beta">Design Engineering</a> ·{" "}
                  <a href="/writing">AI-assisted Development</a> ·{" "}
                  <a href="/projects/arma-reforger-texture-wizard">Prototyping</a>
                </p>
              </nav>
              <p className={styles.strong}>I&apos;m looking for design engineering and product design roles.</p>
            </div>
          </aside>
        </div>
        <main id="work" className={`${reading ? styles.reading : styles.stack} ${styles["route-panel"]} ${leaving ? styles["route-panel-leaving"] : ""}`}>
          {children}
        </main>
        <footer className={styles.foot}>
          <div>Client work shown remains the property of its owners.</div>
          <div className={styles["foot-c"]}>Copyright © Reid Slaughter</div>
          <div className={styles["foot-r"]}>
            <a href="https://github.com/RHS059" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="https://www.linkedin.com/in/reid59slaughter/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
            <a href="https://x.com/reidhslaughter" target="_blank" rel="noopener noreferrer">X</a>
          </div>
        </footer>
      </div>
    </div>
  )
}
