import type { Metadata } from "next"
import Link from "next/link"
import StructuredData from "@/components/structured-data"
import { formatArticleDate, getPublishedArticles, getVisibleArticles, previewDrafts, readingMinutes, siteUrl } from "@/lib/articles"
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
  const articles = getVisibleArticles()
  const published = getPublishedArticles()

  return (
    <section className={styles.content} aria-labelledby="writing-title">
      <StructuredData data={{
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: title,
        description,
        url: `${siteUrl}/writing`,
        mainEntity: {
          "@type": "ItemList",
          itemListElement: published.map((article, index) => ({
            "@type": "ListItem", position: index + 1, name: article.title, url: `${siteUrl}/writing/${article.slug}`,
          })),
        },
      }} />
      <header>
        <p className={styles.eyebrow}>Writing</p>
        <h1 id="writing-title" className={styles.heading}>Design, AI, and building software.</h1>
        <p className={styles.intro}>Short essays on product design, AI agents, and making powerful tools easier to use.</p>
      </header>
      {articles.length > 0 ? (
        <ul className={styles.list}>
          {articles.map((article) => (
            <li key={article.slug} className={styles.card}>
              <article>
                <div className={styles.meta}>
                  {article.status === "published" ? <time dateTime={article.publishedAt}>{formatArticleDate(article.publishedAt)}</time> : <span>Draft preview · Unpublished</span>}
                  <span>{readingMinutes(article.paragraphs)} min read</span>
                </div>
                <h2 className={styles.cardTitle}><Link href={`/writing/${article.slug}`}>{article.title}</Link></h2>
                <p className={styles.summary}>{article.description}</p>
                <p className={styles.tags}>{article.topics.join(" · ")}</p>
                <Link className={styles.read} href={`/writing/${article.slug}`}>Read essay <span aria-hidden="true">↗</span><span className="sr-only">: {article.title}</span></Link>
              </article>
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.empty}>
          <p>My first essay is in progress. In the meantime, explore the projects behind my work.</p>
          <Link className={styles.read} href="/">View selected work <span aria-hidden="true">↗</span></Link>
        </div>
      )}
    </section>
  )
}
