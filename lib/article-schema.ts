import { z } from "zod"

export type RichTextMark = {
  type: "bold" | "italic" | "underline" | "strike" | "code" | "link"
  attrs?: { href: string; title?: string }
}

export type RichTextNode = {
  type: "doc" | "paragraph" | "heading" | "text" | "hardBreak" | "bulletList" | "orderedList" | "listItem" | "blockquote" | "codeBlock" | "horizontalRule" | "tweet"
  text?: string
  marks?: RichTextMark[]
  attrs?: { level?: number; start?: number; language?: string; url?: string }
  content?: RichTextNode[]
}

export function isSafeArticleLink(href: string) {
  return /^https?:\/\//i.test(href) || /^mailto:/i.test(href) || /^\/(?!\/)/.test(href) || /^#[\w-]+$/.test(href)
}

export type TweetReference = { id: string; url: string; handle: string }

// Accept post URLs only, never arbitrary embed HTML, scripts, or iframe URLs.
export function getTweetReference(value: string): TweetReference | null {
  try {
    const url = new URL(value)
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null
    if (!["x.com", "www.x.com", "twitter.com", "www.twitter.com"].includes(url.hostname)) return null
    const match = url.pathname.match(/^\/([A-Za-z0-9_]{1,15})\/status\/([1-9][0-9]{0,19})\/?$/)
    if (!match) return null
    const [, handle, id] = match
    return { id, handle, url: `https://x.com/${handle}/status/${id}` }
  } catch {
    return null
  }
}

const markSchema: z.ZodType<RichTextMark> = z.object({
  type: z.enum(["bold", "italic", "underline", "strike", "code", "link"]),
  attrs: z.object({ href: z.string().refine(isSafeArticleLink, "Use an https, http, mailto, relative, or anchor link."), title: z.string().optional() }).strict().optional(),
}).strict().superRefine((mark, ctx) => {
  if (mark.type === "link" && !mark.attrs) ctx.addIssue({ code: "custom", message: "Link marks need attrs.href." })
  if (mark.type !== "link" && mark.attrs) ctx.addIssue({ code: "custom", message: "Only link marks accept attrs." })
})

const blockTypes = new Set(["paragraph", "heading", "bulletList", "orderedList", "blockquote", "codeBlock", "horizontalRule", "tweet"])

export const richTextSchema: z.ZodType<RichTextNode> = z.lazy(() => z.object({
  type: z.enum(["doc", "paragraph", "heading", "text", "hardBreak", "bulletList", "orderedList", "listItem", "blockquote", "codeBlock", "horizontalRule", "tweet"]),
  text: z.string().optional(),
  marks: z.array(markSchema).optional(),
  attrs: z.object({ level: z.number().int().min(2).max(4).optional(), start: z.number().int().positive().optional(), language: z.string().optional(), url: z.string().optional() }).strict().optional(),
  content: z.array(richTextSchema).optional(),
}).strict().superRefine((node, ctx) => {
  const invalid = (message: string) => ctx.addIssue({ code: "custom", message })
  if (node.type === "text") {
    if (node.text === undefined) invalid("Text nodes need text.")
    if (node.content || node.attrs) invalid("Text nodes cannot contain child nodes or attrs.")
    return
  }
  if (node.text !== undefined || node.marks) invalid("Only text nodes accept text and marks.")
  if (node.type === "tweet") {
    if (!node.attrs?.url || !getTweetReference(node.attrs.url)) invalid("Tweets need attrs.url with an HTTPS X or Twitter post URL.")
    if (node.content || Object.keys(node.attrs ?? {}).some((key) => key !== "url")) invalid("Tweets accept only attrs.url and no child content.")
    return
  }
  if (node.attrs?.url !== undefined) invalid("Only tweets accept url.")
  if (node.type === "hardBreak" || node.type === "horizontalRule") {
    if (node.content || node.attrs) invalid("Breaks and rules do not accept content or attrs.")
    return
  }
  if (!node.content) invalid(`${node.type} needs a content array.`)
  if (node.type === "heading" && !node.attrs?.level) invalid("Headings need attrs.level (2, 3, or 4).")
  if (node.attrs?.level !== undefined && node.type !== "heading") invalid("Only headings accept level.")
  if (node.attrs?.start !== undefined && node.type !== "orderedList") invalid("Only ordered lists accept start.")
  if (node.attrs?.language !== undefined && node.type !== "codeBlock") invalid("Only code blocks accept language.")
  const children = node.content ?? []
  if (["doc", "blockquote", "listItem"].includes(node.type) && children.some((child) => !blockTypes.has(child.type))) invalid("This container needs block content.")
  if (["paragraph", "heading"].includes(node.type) && children.some((child) => child.type !== "text" && child.type !== "hardBreak")) invalid("Paragraphs and headings need inline content.")
  if (["bulletList", "orderedList"].includes(node.type) && children.some((child) => child.type !== "listItem")) invalid("Lists need listItem nodes.")
  if (node.type === "codeBlock" && children.some((child) => child.type !== "text")) invalid("Code blocks need text nodes.")
}))

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.").refine((value) => {
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}, "Use a valid calendar date.")

const articleSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  status: z.enum(["draft", "published"]),
  publishedAt: dateSchema.nullable(),
  updatedAt: dateSchema.optional(),
  topics: z.array(z.string()),
  heroImage: z.string().min(1),
  body: richTextSchema.refine((node) => node.type === "doc", "Article bodies must start with a doc node."),
}).strict().superRefine((article, ctx) => {
  if (article.status === "published" && !article.publishedAt) ctx.addIssue({ code: "custom", path: ["publishedAt"], message: "Published articles need their publication date." })
  if (article.status === "draft" && article.publishedAt) ctx.addIssue({ code: "custom", path: ["publishedAt"], message: "Drafts must use publishedAt: null." })
  if (article.updatedAt && article.publishedAt && article.updatedAt < article.publishedAt) ctx.addIssue({ code: "custom", path: ["updatedAt"], message: "An update cannot predate publication." })
})

export const articlesFileSchema = z.object({ schemaVersion: z.literal(1), articles: z.array(articleSchema) }).strict().superRefine((file, ctx) => {
  const slugs = new Set<string>()
  file.articles.forEach((article, index) => {
    if (slugs.has(article.slug)) ctx.addIssue({ code: "custom", path: ["articles", index, "slug"], message: "Article slugs must be unique." })
    slugs.add(article.slug)
  })
})

export type Article = z.infer<typeof articleSchema>
export type PublishedArticle = Article & { status: "published"; publishedAt: string }

export function richTextPlainText(node: RichTextNode): string {
  if (node.type === "text") return node.text ?? ""
  if (node.type === "hardBreak") return "\n"
  if (node.type === "tweet") return ""
  const separator = ["paragraph", "heading", "codeBlock"].includes(node.type) ? "" : "\n\n"
  return (node.content ?? []).filter((child) => child.type !== "tweet").map(richTextPlainText).join(separator)
}
