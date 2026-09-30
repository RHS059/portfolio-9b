import articleFile from "@/content/articles.json"
import heroFile from "@/content/article-heroes.json"
import { articlesFileSchema, richTextPlainText, type Article, type PublishedArticle, type RichTextNode } from "./article-schema"

const { articles } = articlesFileSchema.parse(articleFile)
for (const article of articles) {
  if (!heroFile.images.some((image) => image.id === article.heroImage)) throw new Error(`Unknown hero image for ${article.slug}.`)
}
export type { Article }

export const siteUrl = "https://www.reidhslaughter.com"
export const authorId = `${siteUrl}/#reid-slaughter`
export const previewDrafts = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview"

export function getPublishedArticles() {
  return articles
    .filter((article): article is PublishedArticle => article.status === "published" && article.publishedAt !== null)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
}

export function getVisibleArticles() {
  return previewDrafts ? [...getPublishedArticles(), ...articles.filter((article) => article.status === "draft")] : getPublishedArticles()
}

export function getArticle(slug: string) {
  return getVisibleArticles().find((article) => article.slug === slug)
}

export function getArticleHero(article: Article) {
  const image = heroFile.images.find((image) => image.id === article.heroImage)
  if (!image) throw new Error(`Unknown hero image for ${article.slug}.`)
  return image
}

export function formatArticleDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`))
}

export function readingMinutes(body: RichTextNode) {
  return Math.max(1, Math.ceil(richTextPlainText(body).trim().split(/\s+/).length / 200))
}
