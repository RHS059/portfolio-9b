import Link from "next/link"
import StructuredData from "./structured-data"
import ArticleRichText from "./article-rich-text"
import LandscapeHero from "./landscape-hero"
import { authorId, formatArticleDate, getArticleHero, readingMinutes, siteUrl, type Article } from "@/lib/articles"
import { richTextPlainText } from "@/lib/article-schema"
import styles from "@/app/writing/writing.module.css"

export default function ArticleView({ article }: { article: Article }) {
  const url = `${siteUrl}/writing/${article.slug}`
  const hero = getArticleHero(article)
  const date = article.status === "published" ? article.publishedAt : null
  const leadTweet = article.body.content?.[0]?.type === "tweet" ? article.body.content[0] : null
  const body = leadTweet ? { ...article.body, content: article.body.content?.slice(1) } : article.body
  return (
    <article>
      {date ? <StructuredData data={{
        "@context": "https://schema.org", "@type": "Article", "@id": `${url}#article`,
        headline: article.title, description: article.description, url,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        image: `${siteUrl}${hero.src}`,
        author: { "@type": "Person", "@id": authorId, name: "Reid Slaughter", url: `${siteUrl}/about` },
        datePublished: date, dateModified: article.updatedAt ?? date,
        articleSection: article.topics, articleBody: richTextPlainText(article.body), inLanguage: "en-US",
      }} /> : null}
      <header className={styles.content}>
        <h1 className={styles.heading}>{article.title}</h1>
        {leadTweet ? <ArticleRichText body={{ type: "doc", content: [leadTweet] }} /> : null}
        <div className={styles.meta}>
          <Link rel="author" href="/about">Reid Slaughter</Link>
          {date ? <time dateTime={date}>{formatArticleDate(date)}</time> : <span>Unpublished draft</span>}
          <span>{readingMinutes(article.body)} min read</span>
        </div>
        {date && article.updatedAt && article.updatedAt !== date ? <p className={styles.meta}>Updated <time dateTime={article.updatedAt}>{formatArticleDate(article.updatedAt)}</time></p> : null}
      </header>
      <LandscapeHero image={hero} />
      <div className={styles.content}>
        {!date ? <p className={styles.notice}>Draft preview. This essay is not published on the live portfolio.</p> : null}
        <div className={styles.body}><ArticleRichText body={body} /></div>
        <aside className={styles.author} aria-label="About the author">
          <Link href="/about">About Reid Slaughter</Link>
          <p>Product designer and design engineer working across enterprise UX, AI tools, and front end implementation.</p>
          <p><Link href="/">Explore my projects</Link> or <a href="https://www.linkedin.com/in/reid59slaughter/">connect on LinkedIn</a>.</p>
        </aside>
      </div>
    </article>
  )
}
