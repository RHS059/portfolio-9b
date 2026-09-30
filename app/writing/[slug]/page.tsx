import type { Metadata } from "next"
import { notFound } from "next/navigation"
import ArticleView from "@/components/article-view"
import { getArticle, getVisibleArticles } from "@/lib/articles"
import { articleMetadata } from "@/lib/article-metadata"

type Props = { params: Promise<{ slug: string }> }
export const dynamicParams = false

export function generateStaticParams() {
  return getVisibleArticles().map((article) => ({ slug: article.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = getArticle((await params).slug)
  if (!article) notFound()
  return articleMetadata(article)
}

export default async function ArticlePage({ params }: Props) {
  const article = getArticle((await params).slug)
  if (!article) notFound()
  return <ArticleView article={article} />
}
