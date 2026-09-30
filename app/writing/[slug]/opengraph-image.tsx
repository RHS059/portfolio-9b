import { ImageResponse } from "next/og"
import { notFound } from "next/navigation"
import { getArticle } from "@/lib/articles"

export const alt = "Writing by Reid Slaughter"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function ArticleImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = getArticle(slug)
  if (!article) notFound()

  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", background: "#f5f2ea", color: "#181425", padding: 64 }}>
      <div style={{ display: "flex", fontSize: 24, color: "#685c84", letterSpacing: 3 }}>WRITING / REID SLAUGHTER</div>
      <div style={{ display: "flex", fontSize: 64, lineHeight: 1.12, letterSpacing: -2 }}>{article.title}</div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 23, color: "#685c84" }}>
        <span>Product design · AI · Design engineering</span><span>reidhslaughter.com</span>
      </div>
    </div>,
    size,
  )
}
