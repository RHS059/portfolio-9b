import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import StructuredData from "@/components/structured-data"
import { authorId, formatArticleDate, getArticle, getVisibleArticles, readingMinutes, siteUrl } from "@/lib/articles"
import styles from "../writing.module.css"

type Props = { params: Promise<{ slug: string }> }

export const dynamicParams = false

export function generateStaticParams() {
  return getVisibleArticles().map((article) => ({ slug: article.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const article = getArticle(slug)
  if (!article) notFound()
  const title = `${article.title} | Reid Slaughter`
  const url = `${siteUrl}/writing/${slug}`
  const image = `${url}/opengraph-image`

  return {
    title,
    description: article.description,
    authors: [{ name: "Reid Slaughter", url: `${siteUrl}/about` }],
    alternates: { canonical: url },
    ...(article.status === "draft" ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      title, description: article.description, url, type: "article",
      authors: [`${siteUrl}/about`],
      ...(article.status === "published" ? { publishedTime: article.publishedAt, modifiedTime: article.updatedAt ?? article.publishedAt } : {}),
      images: [{ url: image, width: 1200, height: 630, alt: article.title }],
    },
    twitter: { card: "summary_large_image", creator: "@reidhslaughter", title, description: article.description, images: [image] },
  }
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params
  const article = getArticle(slug)
  if (!article) notFound()
  const url = `${siteUrl}/writing/${slug}`

  return (
    <main className={styles.content}>
      {article.status === "published" ? <StructuredData data={{
        "@context": "https://schema.org",
        "@type": "Article",
        "@id": `${url}#article`,
        headline: article.title,
        description: article.description,
        url,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        image: `${url}/opengraph-image`,
        author: { "@type": "Person", "@id": authorId, name: "Reid Slaughter", url: `${siteUrl}/about` },
        datePublished: article.publishedAt,
        dateModified: article.updatedAt ?? article.publishedAt,
        articleSection: article.topics,
        articleBody: article.paragraphs.join("\n\n"),
        inLanguage: "en-US",
      }} /> : <p className={styles.notice}>Draft preview. This essay is not published on the live portfolio.</p>}
      <article>
        <header>
          <Link className={styles.eyebrow} href="/writing">← All writing</Link>
          <h1 className={styles.heading}>{article.title}</h1>
          <div className={styles.meta}>
            <Link rel="author" href="/about">Reid Slaughter</Link>
            {article.status === "published" ? <time dateTime={article.publishedAt}>{formatArticleDate(article.publishedAt)}</time> : <span>Unpublished draft</span>}
            <span>{readingMinutes(article.paragraphs)} min read</span>
          </div>
          {article.status === "published" && article.updatedAt && article.updatedAt !== article.publishedAt ? <p className={styles.meta}>Updated <time dateTime={article.updatedAt}>{formatArticleDate(article.updatedAt)}</time></p> : null}
        </header>
        <div className={styles.body}>{article.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
        <aside className={styles.author} aria-label="About the author">
          <Link href="/about">About Reid Slaughter</Link>
          <p>Product designer and design engineer working across enterprise UX, AI tools, and front end implementation.</p>
          <p><Link href="/">Explore my projects</Link> or <a href="https://www.linkedin.com/in/reid59slaughter/">connect on LinkedIn</a>.</p>
        </aside>
      </article>
    </main>
  )
}
