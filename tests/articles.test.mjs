import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import test from "node:test"
import { articlesFileSchema, getTweetReference, richTextPlainText, richTextSchema } from "../lib/article-schema.ts"

const url = "https://x.com/OpenAIDevs/status/2105708732323909827"
const tweet = { type: "tweet", attrs: { url } }
const paragraph = { type: "paragraph", content: [{ type: "text", text: "An idea." }] }

test("tweet URLs accept official HTTPS post links and strip tracking parameters", () => {
  for (const host of ["x.com", "www.x.com", "twitter.com", "www.twitter.com"]) {
    assert.deepEqual(getTweetReference(`https://${host}/OpenAIDevs/status/2105708732323909827/?s=20#media`), {
      id: "2105708732323909827", handle: "OpenAIDevs", url,
    })
  }
})

test("tweet URLs reject arbitrary sources, credentials, scripts, and malformed IDs", () => {
  for (const value of [
    "javascript:alert(1)", "//x.com/OpenAIDevs/status/123", "http://x.com/OpenAIDevs/status/123",
    "https://x.com.evil.test/OpenAIDevs/status/123", "https://evil.test/x.com/OpenAIDevs/status/123",
    "https://user:pass@x.com/OpenAIDevs/status/123", "https://x.com:444/OpenAIDevs/status/123",
    "https://x.com/OpenAIDevs", "https://x.com/OpenAIDevs/status/not-a-number",
    "https://x.com/OpenAIDevs/status/123/photo/1", "https://x.com/OpenAIDevs/status/0",
    "https://x.com/OpenAIDevs/status/123456789012345678901", "<script>alert(1)</script>",
  ]) assert.equal(getTweetReference(value), null, value)
})

test("tweet blocks work at the start and between paragraphs without adding invented post text", () => {
  const document = { type: "doc", content: [tweet, paragraph, tweet, paragraph] }
  assert.equal(richTextSchema.safeParse(document).success, true)
  assert.equal(richTextPlainText(document), "An idea.\n\nAn idea.")
})

test("tweet blocks must be valid leaf blocks and cannot appear inside inline text", () => {
  for (const node of [
    { type: "tweet" }, { type: "tweet", attrs: { url: "https://example.com" } },
    { ...tweet, content: [] }, { ...tweet, text: "fake post" }, { ...tweet, marks: [] },
    { type: "tweet", attrs: { url, level: 2 } }, { type: "tweet", attrs: { url, html: "<iframe>" } },
    { type: "paragraph", content: [tweet] }, { ...paragraph, attrs: { url } },
  ]) assert.equal(richTextSchema.safeParse(node).success, false, JSON.stringify(node))
})

test("published flight-booking article preserves the supplied title, tweet, and eight paragraphs", async () => {
  const file = articlesFileSchema.parse(JSON.parse(await readFile(new URL("../content/articles.json", import.meta.url), "utf8")))
  const article = file.articles.find((article) => article.slug === "look-past-the-flight-booking-demo")
  assert.ok(article)
  assert.equal(article.title, "Look Past the Flight Booking Demo")
  assert.equal(article.status, "published")
  assert.equal(article.publishedAt, "2026-10-02")
  assert.deepEqual(article.body.content[0], tweet)
  assert.equal(article.body.content.filter((node) => node.type === "paragraph").length, 8)
  assert.equal(createHash("sha256").update(richTextPlainText(article.body)).digest("hex"), "98728fde82b86aba7a7ed48dc52702115b1c9faead0bfc304cab34ba1e1ba015")
  assert.notEqual(article.heroImage, file.articles.find((entry) => entry.slug === "ai-agents-and-the-expertise-gap").heroImage)
})
