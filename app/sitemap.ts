import type { MetadataRoute } from "next"
import { getPublishedArticles } from "@/lib/articles"

const base = "https://www.reidhslaughter.com"

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: base, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/writing`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/projects/fleet-fuel-integration`, changeFrequency: "yearly", priority: 0.9 },
    { url: `${base}/projects/arma-reforger-texture-wizard`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/projects/library-holding-app`, changeFrequency: "yearly", priority: 0.8 },
    { url: `${base}/enfusion_field_kit_beta`, changeFrequency: "monthly", priority: 0.8 },
    ...getPublishedArticles().map((article) => ({
      url: `${base}/writing/${article.slug}`,
      lastModified: article.updatedAt ?? article.publishedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ]
}
