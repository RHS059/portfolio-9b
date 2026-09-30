# portfolio-9b

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_pCJY7rQxsfQajl2PzOlrHFo3A8nj)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Writing articles

Articles live in `content/articles.json`. Each entry has a unique URL slug, title,
description, topics, publication date, hero image ID, and a rich text document.
No CMS or database is needed. `/writing` opens the newest published article.
The sidebar archive only shows published dates; hover or focus its tick rail to
reveal the date list, or click its list button to pin it open.

1. Add an entry with `"status": "draft"`, `"publishedAt": null`, and a rich text body.
2. Run `npm run prepare:articles` to randomly assign any missing `heroImage` IDs.
   Commit these assignments with the article: existing IDs never change on
   refresh, rebuild, or repeat runs. Consecutive published articles must use
   different images. If publishing or backdating a previously assigned draft
   creates a conflict, the build stops and asks you to choose a different ID for
   that newly published article. Eight images and their crop focal points are
   defined in `content/article-heroes.json`; prompts are in
   `docs/article-hero-prompts.md`.
3. Run `npm run dev` and open `/writing` to review the draft. Drafts appear only
   locally and on Vercel preview deployments, with noindex. Production returns
   404 for draft article and social-image URLs and excludes draft content from
   the archive and sitemap. Date labels appear only after publication.
4. To publish, use `"status": "published"` and the actual publication date in
   `YYYY-MM-DD` format. Add `updatedAt` for a substantive revision. Run
   `npm run prepare:articles` again before committing.
5. Commit to `main` to deploy. The essay receives a canonical URL, author link,
   Article structured data, social preview image, and sitemap entry.

Development assigns missing images automatically. Production builds validate saved
assignments and stop if an ID is missing; deployment never rerolls an image.
The first essay remains a two-paragraph draft for Reid to rewrite.

### Rich text format

Bodies use a Tiptap/ProseMirror-style JSON document. Supported blocks are
`paragraph`, `heading` (levels 2–4), `bulletList`, `orderedList` (optional `start`),
`listItem`, `blockquote`, `codeBlock`, and `horizontalRule`. Paragraphs and headings
contain `text` and `hardBreak` nodes. Text supports `bold`, `italic`, `underline`,
`strike`, `code`, and `link` marks. Links use `attrs.href` and optional `attrs.title`.
HTML strings are not interpreted. The schema validates dates, unique slugs,
rich text structure, and safe links during the build.

```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "An idea worth testing. ", "marks": [{ "type": "bold" }] },
        { "type": "text", "text": "See my work.", "marks": [{ "type": "link", "attrs": { "href": "/" } }] }
      ]
    }
  ]
}
```

Publish on the portfolio first, then share its URL on LinkedIn and X.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.
