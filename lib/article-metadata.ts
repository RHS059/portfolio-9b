import type { Metadata } from "next"
import { siteUrl, type Article } from "./articles"

export function articleMetadata(article: Article): Metadata {
  const title = `${article.title} | Reid Slaughter`
  const url = `${siteUrl}/writing/${article.slug}`
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
      ...(article.status === "published" && article.publishedAt ? { publishedTime: article.publishedAt, modifiedTime: article.updatedAt ?? article.publishedAt } : {}),
      images: [{ url: image, width: 1200, height: 630, alt: article.title }],
    },
    twitter: { card: "summary_large_image", creator: "@reidhslaughter", title, description: article.description, images: [image] },
  }
}
