import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getVisibleArticles, previewDrafts, siteUrl } from "@/lib/articles"
import styles from "./writing.module.css"

const title = "Writing | Reid Slaughter"
const description = "Short essays by Reid Slaughter on product design, AI agents, design engineering, and building tools people can use."

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/writing" },
  ...(previewDrafts ? { robots: { index: false, follow: false } } : {}),
  openGraph: { title, description, url: `${siteUrl}/writing`, type: "website", images: ["/og-hero.jpg"] },
  twitter: { card: "summary_large_image", title, description, images: ["/og-hero.jpg"] },
}

export default function WritingPage() {
  const latest = getVisibleArticles()[0]
  if (latest) redirect(`/writing/${latest.slug}`)
  return (
    <section className={styles.content} aria-labelledby="writing-title">
      <h1 id="writing-title" className={styles.heading}>Design, AI, and building software.</h1>
      <div className={styles.empty}>
        <p>My first essay is in progress. In the meantime, explore the projects behind my work.</p>
        <Link className={styles.read} href="/">View selected work <span aria-hidden="true">↗</span></Link>
      </div>
    </section>
  )
}
