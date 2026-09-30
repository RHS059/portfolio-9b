import PortfolioShell from "@/components/portfolio-shell"
import ArticleRuler from "@/components/article-ruler"
import { getPublishedArticles } from "@/lib/articles"

export default function WritingLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortfolioShell reading alignTop sidebarContent={<ArticleRuler articles={getPublishedArticles().map(({ slug, title, publishedAt }) => ({ slug, title, publishedAt }))} />}>{children}</PortfolioShell>
  )
}
