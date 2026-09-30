import Link from "next/link"
import PortfolioLinks from "@/components/portfolio-links"
import styles from "./writing.module.css"

export default function WritingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.page}>
      <nav className={styles.nav} aria-label="Main navigation">
        <Link href="/" className={styles.brand}>Reid Slaughter</Link>
        <div className={styles.navLinks}>
          <PortfolioLinks />
        </div>
      </nav>
      {children}
      <footer className={styles.footer}>
        <span>Writing by Reid Slaughter</span>
        <div className={styles.navLinks}>
          <a href="https://www.linkedin.com/in/reid59slaughter/">LinkedIn</a>
          <a href="https://x.com/reidhslaughter">X</a>
          <a href="mailto:reids@reidhslaughter.com">Reach out</a>
        </div>
      </footer>
    </div>
  )
}
