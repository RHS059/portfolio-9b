import type { ReactNode } from "react"
import { Mail } from "lucide-react"
import PortfolioLinks from "./portfolio-links"
import AnimatedLink from "./animated-link"
import styles from "./portfolio-home.module.css"
import CookieSettingsLink from "./cookie-settings-link"
import MobileNav from "./mobile-nav"

type Props = { children: ReactNode; leaving?: boolean; reading?: boolean; alignTop?: boolean; sidebarContent?: ReactNode }

export default function PortfolioShell({ children, leaving = false, reading = false, alignTop = false, sidebarContent }: Props) {
  const Name = reading ? "p" : "h1"
  return (
    <div className={`${styles.page} font-sans`}>
      <MobileNav name={Name} workHref={reading ? "/#work" : "#work"} />
      <div className={styles.grid}>
        <div className={`${styles["side-wrap"]} ${styles["route-panel"]} ${leaving ? styles["route-panel-leaving"] : ""}`}>
          <aside className={styles.side}>
            <div>
              <Name className={styles.name}>Reid Slaughter</Name>
              <p className={styles.role}>Product Designer &amp; Design Engineer</p>
              <ul className={styles.metrics}>
                <li className={styles.metric}><span className={styles.num}>90%</span> faster support ticket resolution for API integration tickets</li>
                <li className={styles.metric}><span className={styles.num}>2 weeks</span> to upgrade a customer, down from 6+ months</li>
                <li className={styles.metric}><span className={styles.num}>4.4★</span> app store rating, <span className={styles.num}>5k+</span> downloads</li>
              </ul>
              <nav className={styles.links} aria-label="Portfolio navigation">
                <PortfolioLinks workHref={reading ? "/#work" : "#work"} />
                <AnimatedLink className={styles.cta} href="mailto:reids@reidhslaughter.com"><Mail size={15} aria-hidden="true" />Reach Out</AnimatedLink>
              </nav>
            </div>
            <div className={styles.bio}>
              <div className={styles.eyebrow}>Who am I?</div>
              <p>
                I design and build the interfaces people use to do their jobs, mostly fleet and asset management for
                construction, utilities, and law enforcement.
              </p>
              <p>Outside of work I build, texture, and animate in Blender.</p>
              <p className={styles.strong}>Open to product design and design engineering roles.</p>
            </div>
            {sidebarContent}
          </aside>
        </div>
        <main id="work" className={`${reading ? styles.reading : styles.stack} ${alignTop ? styles.readingTop : ""} ${styles["route-panel"]} ${leaving ? styles["route-panel-leaving"] : ""}`}>
          {children}
        </main>
        <footer className={styles.foot}>
          <div>Client work shown remains the property of its owners.</div>
          <div className={styles["foot-c"]}>Copyright © Reid Slaughter</div>
          <div className={styles["foot-r"]}>
            <a href="https://github.com/RHS059" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="https://www.linkedin.com/in/reid59slaughter/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
            <a href="https://x.com/reidhslaughter" target="_blank" rel="noopener noreferrer">X</a>
            <a href="/privacy">Privacy</a>
            <CookieSettingsLink />
          </div>
        </footer>
      </div>
    </div>
  )
}
