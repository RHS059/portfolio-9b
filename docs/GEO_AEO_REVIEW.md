# Portfolio GEO and AEO review

Reviewed September 29, 2026 against the live HTML and repository. This is a
technical and content review, not a measurement of search rankings or AI citations.

The foundation is sound: the important pages return HTTP 200, robots.txt allows
crawling, and the sitemap exposes the core pages. The case studies include readable
project facts, meaningful headings, canonical URLs, and structured data tied to
Reid's author identity. The About page connects that identity to GitHub, LinkedIn,
and X. Key text is present in the initial HTML without waiting for client JavaScript.

## Improvements included in this update

| Finding | Change | Why it helps |
| --- | --- | --- |
| The homepage had no canonical link. | Added the www homepage canonical. | Makes the preferred URL explicit alongside the existing redirect. |
| The homepage's role was clearer in metadata than in the opening visible text. | Added Product Designer & Design Engineer directly below Reid's name. | Gives visitors and extraction systems the same immediate answer. |
| Writing was a placeholder with a less obvious expertise link on the homepage. | Added explicit Work, About, and Writing navigation and reusable article pages. | Makes essays discoverable through ordinary links. |
| About and Writing inherited the homepage's social title and URL. | Added page-specific social metadata. | Shares now identify the actual destination page. This is primarily a sharing fix. |
| Essays had no publishing structure. | Added author links, visible publication dates, canonical URLs, Article JSON-LD, generated preview images, and sitemap entries for published articles. | Gives each essay a durable, attributable page. |
| The first essay still needs Reid's rewrite. | Kept it as an unpublished draft. | Drafts appear in local development and Vercel preview deployments, with noindex. They return 404 on the production site and stay out of its list and sitemap. |

## Highest value next steps

1. **Make outcome claims traceable.** The homepage leads with 90% faster ticket
   resolution, 80% faster customer upgrades, and a 4.4 rating with 5k+ downloads.
   Link each claim to the relevant case study and explain its scope, baseline,
   measurement period, and source where you can substantiate them. Distinguish
   estimates from measured results. Do not invent evidence. This would make the
   results easier to assess and quote accurately.
2. **Give Enfusion Field Kit a visible project summary.** Its public wrapper has
   metadata and schema, but the descriptive project text is visually hidden and
   the main experience is an iframe. Add a short visible explanation of the user,
   problem, Reid's contribution, and what the tool does, with a clear link into
   the demo. The raw `/enfusion-field-kit-beta/index.html` URL also lacks a title,
   description, and canonical; identify its preferred relationship to the project
   page so the demo does not become an unattributed search destination.
3. **Publish the short original essay on the portfolio first.** Keep the observation,
   proposed expert pairing workflow, and proposed evaluation distinct. A training
   idea is not an established result. Share the portfolio URL from LinkedIn and X
   with a short platform-specific introduction and consistent author identity.
4. **Clarify the questions the About page answers.** Lead with the role and the
   kinds of products Reid builds, then point to enterprise UX and game tool
   examples. Concise, specific answers are more useful than another list of AI
   keywords. There is no need to turn a portfolio into a large FAQ.
5. **Decide whether the teacher-parent project is still part of the portfolio.**
   Its URL is public but lacks a canonical and a dedicated description, inherits
   homepage sharing metadata, and is absent from the sitemap and homepage work
   list. If it is selected work, give it the same metadata and discovery treatment
   as the other case studies. If it is retired, make that an intentional content
   decision rather than promoting it accidentally.

## Measurement

Verify the domain and submit the sitemap in Google Search Console and Bing
Webmaster Tools if not already done. Inspect the homepage, About page, selected
case studies, and first published essay. Establish a baseline for branded and
role-related impressions, clicks, referral traffic, and inquiries before claiming
that an update improved discoverability. This review did not access those accounts,
verify indexing, run a Core Web Vitals field assessment, or establish citation frequency.

## What to avoid

Do not pad the short essay, repeat tool names to fill keyword lists, add unsupported
claims, or assume that llms.txt or extra schema guarantees AI visibility. Google
explicitly says its AI search features use the same SEO fundamentals and require
no special AI text files or schema. Keep structured data consistent with the page
readers actually see.

## Primary references

- [Google: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
- [Google: Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article)
- [Google: Canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
