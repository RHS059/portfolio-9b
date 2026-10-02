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
3. Run `npm run dev` and open `/writing/<your-draft-slug>` to review the draft. Drafts appear only
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
The first published essay is a two-paragraph proposal for expert review across disciplines.

About and article heroes use Three.js source-camera projection onto simple
scene geometry, with real generated water and foliage animation frames. See
`docs/landscape-animation.md` for composition, motion and fallback behavior.

### Rich text format

Bodies use a Tiptap/ProseMirror-style JSON document. Supported blocks are
`paragraph`, `heading` (levels 2–4), `bulletList`, `orderedList` (optional `start`),
`listItem`, `blockquote`, `codeBlock`, `horizontalRule`, and `tweet`. Paragraphs and headings
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

### Inline X / Twitter posts

Insert a `tweet` block between paragraphs with the post URL (not copied HTML):

```json
{ "type": "tweet", "attrs": { "url": "https://x.com/OpenAIDevs/status/2105708732323909827" } }
```

A tweet as the first body block appears directly below the article title. Other
tweet blocks stay in their position in the article. HTTPS `x.com` and
`twitter.com` post URLs are accepted; tracking parameters are removed from the
source link. Arbitrary HTML, iframe sources, and non-post URLs are rejected.

The official `https://platform.twitter.com/widgets.js` script loads once, only on
pages containing embeds, after hydration. Each client navigation creates a fresh
widget with personalization disabled (`dnt: true`). The original post link is
server-rendered and remains available if JavaScript, X, or an ad/content blocker
prevents the embed from loading, or the post becomes unavailable. Post content is
rendered by X, not copied or fabricated in the article JSON.

There is currently no site CSP to change. If a Content Security Policy is added,
allow the official widget script/frame origins under `script-src` and `frame-src`
and any widget subresources reported by the browser; do not add wildcard or
`unsafe-inline` exceptions just for embeds. A restrictive policy safely leaves
the source link available. Widgets are constrained to the article/mobile width.

Run the article and landscape regression tests with Node 22.18+ or Node 24:
`node --test tests/*.test.mjs`. Also run `npm run build` and `npx tsc --noEmit`.

Publish on the portfolio first, then share its URL on LinkedIn and X.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.
