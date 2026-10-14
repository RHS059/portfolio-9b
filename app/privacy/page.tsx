import type { Metadata } from "next"
import PortfolioShell from "@/components/portfolio-shell"
import CookieSettingsLink from "@/components/cookie-settings-link"
import styles from "@/app/writing/writing.module.css"

export const metadata: Metadata = {
  title: "Privacy Policy | Reid Slaughter",
  description: "How reidhslaughter.com uses cookies and analytics, and how to change your choice.",
  alternates: { canonical: "/privacy" },
}

export default function PrivacyPage() {
  return (
    <PortfolioShell reading alignTop>
      <article>
        <header className={styles.content}>
          <h1 className={styles.heading}>Privacy Policy</h1>
          <p className={styles.meta}>Last updated October 14, 2026</p>
        </header>
        <div className={styles.content}>
          <div className={styles.body}>
            <p>
              This is the personal portfolio of Reid Slaughter at reidhslaughter.com. This page explains what data the
              site collects, when, and how you can change your choice.
            </p>

            <h2 id="cookies">Cookies and analytics</h2>
            <p>
              No analytics, tracking cookies, or tracking scripts load until you click <strong>Accept</strong> on the
              cookie banner. If you click <strong>Decline</strong>, or make no choice, none of the services below run.
            </p>
            <p>If you accept, the site loads:</p>
            <ul>
              <li>
                <strong>Microsoft Clarity</strong>, which records how visitors use pages (clicks, scrolling, mouse
                movement, and page views) along with device and browser details, and sets cookies to recognize repeat
                visits. See the{" "}
                <a href="https://privacy.microsoft.com/privacystatement" target="_blank" rel="noopener noreferrer">
                  Microsoft Privacy Statement
                </a>
                .
              </li>
              <li>
                <strong>Vercel Analytics</strong>, which counts page views, referring sites, and general device and
                location information without using cookies. See{" "}
                <a href="https://vercel.com/docs/analytics/privacy-policy" target="_blank" rel="noopener noreferrer">
                  Vercel Analytics privacy
                </a>
                .
              </li>
              <li>
                <strong>Embedded X (Twitter) posts</strong> in some articles. X may set cookies and collect data when
                these load. See the{" "}
                <a href="https://x.com/en/privacy" target="_blank" rel="noopener noreferrer">
                  X Privacy Policy
                </a>
                . Until you accept, each post is shown as a plain link instead.
              </li>
            </ul>
            <p>
              This data is used only to understand how the portfolio is used and to improve it. It is not sold.
            </p>

            <h2>Changing or withdrawing consent</h2>
            <p>
              You can change your choice at any time with the <CookieSettingsLink /> link in the site footer or here.
              Choosing Decline after accepting stops these services, deletes this site&apos;s Clarity cookies, and
              reloads the page. Cookies set by third-party domains (such as clarity.ms or x.com) can be removed in your
              browser settings.
            </p>
            <p>Your choice is stored in your browser and is not sent to this site&apos;s server.</p>

            <h2>Contact</h2>
            <p>
              Questions or requests about your data:{" "}
              <a href="mailto:reids@reidhslaughter.com">reids@reidhslaughter.com</a>.
            </p>
          </div>
        </div>
      </article>
    </PortfolioShell>
  )
}
