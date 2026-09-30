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

Articles live in `content/articles.ts`. Each entry has a unique URL slug, title,
description, topics, and an array of paragraphs. No CMS or database is needed.

1. Add an entry with `status: "draft"` and edit the paragraphs.
2. Run `pnpm dev`, then open `/writing` to review it. Drafts only appear during
   local development and Vercel preview deployments, with noindex on draft
   article pages. Live production builds return 404 for draft article and image
   URLs and exclude drafts from the writing list and sitemap.
3. To publish, change the status to `"published"` and add `publishedAt` with the
   actual publication date in `YYYY-MM-DD` format. Add `updatedAt` when making
   a substantive revision.
4. Commit to `main` to deploy. The essay receives a canonical URL, author link,
   Article structured data, a social preview image, and a sitemap entry.

The first essay is a two paragraph draft for Reid to rewrite before publishing.
Publish on the portfolio first, then share its URL on LinkedIn and X.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.
