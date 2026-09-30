import { articles, type Article } from "@/content/articles"

export const siteUrl = "https://www.reidhslaughter.com"
export const authorId = `${siteUrl}/#reid-slaughter`
export const previewDrafts = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview"

export function getPublishedArticles() {
  return articles
    .filter((article): article is Extract<Article, { status: "published" }> => article.status === "published")
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
}

export function getVisibleArticles() {
  return previewDrafts ? [...getPublishedArticles(), ...articles.filter((article) => article.status === "draft")] : getPublishedArticles()
}

export function getArticle(slug: string) {
  return getVisibleArticles().find((article) => article.slug === slug)
}

export function formatArticleDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`))
}

export function readingMinutes(paragraphs: string[]) {
  return Math.max(1, Math.ceil(paragraphs.join(" ").trim().split(/\s+/).length / 200))
}
