import { randomInt } from "node:crypto"
import { readFile, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

const file = fileURLToPath(new URL("../content/articles.json", import.meta.url))
const poolFile = fileURLToPath(new URL("../content/article-heroes.json", import.meta.url))
const data = JSON.parse(await readFile(file, "utf8"))
const checkOnly = process.argv.includes("--check")
const pool = JSON.parse(await readFile(poolFile, "utf8")).images.map((image) => image.id)
if (pool.length < 2 || new Set(pool).size !== pool.length) throw new Error("The hero pool needs at least two unique image IDs.")

const published = data.articles
  .map((article, index) => ({ article, index }))
  .filter(({ article }) => article.status === "published")
  .sort((a, b) => (a.article.publishedAt ?? "").localeCompare(b.article.publishedAt ?? "") || b.index - a.index)
  .map(({ article }) => article)
const ordered = [...published, ...data.articles.filter((article) => article.status === "draft")]
let changed = 0
for (let index = 0; index < ordered.length; index++) {
  const article = ordered[index]
  if (article.heroImage) {
    if (!pool.includes(article.heroImage)) throw new Error(`Unknown hero image on ${article.slug}.`)
    continue
  }
  if (checkOnly) throw new Error(`Missing saved hero image on ${article.slug}. Run npm run prepare:articles and commit content/articles.json before building.`)
  const excluded = new Set([ordered[index - 1]?.heroImage, ordered[index + 1]?.heroImage])
  const choices = pool.filter((id) => !excluded.has(id))
  if (!choices.length) throw new Error(`No hero image available for ${article.slug}.`)
  article.heroImage = choices[randomInt(choices.length)]
  changed++
}
for (let index = 1; index < published.length; index++) {
  if (published[index].heroImage === published[index - 1].heroImage) throw new Error(`Adjacent published articles ${published[index - 1].slug} and ${published[index].slug} have the same hero. Existing assignments were preserved; choose a different image ID for the newly published article.`)
}
if (changed) {
  await writeFile(file, JSON.stringify(data, null, 2) + "\n")
  console.log(`Saved ${changed} new article hero assignment(s). Commit content/articles.json to keep them fixed.`)
}
