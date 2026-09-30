# Article hero prompts

Eight original engraved landscape illustrations, generated with the built-in image generation tool using the supplied coastal illustration as a style reference. The final palette uses violet-purple ink to match the portfolio, warm ivory paper, restrained terracotta, and muted olive accents.

## Reusable prompt

```text
Use case: stylized-concept
Asset type: editorial landscape hero for a product designer’s portfolio articles.
Input image: style reference only; ignore its blue ink palette and use the site's violet-purple palette instead; create a new landscape, do not copy its location, subjects, boats, church, or buildings.
Primary request: {SCENE}
Style/medium: meticulous intaglio engraving and vintage banknote illustration. Extremely fine violet-purple (#6426AC) linework, cross-hatching, stippling, and graceful guilloche wave meshes in the sky. Warm ivory paper, predominantly violet-purple ink with lighter lavender and deeper plum tones, restrained terracotta highlights only where natural; subtle muted green allowed for vegetation. No blue or cyan ink. Strongly match the reference’s elaborate hand-engraved texture and airy paper highlights. Clearly illustrated, not a photograph or 3D render.
Composition/framing: wide horizontal 16:9 full-bleed landscape, distant horizon and the defining scene in the central horizontal band. It must still look beautiful when cropped into a shallow 3:1 article banner. Rich detail across the entire width, quiet and contemplative.
Constraints: one complete scene; no collage, text, letters, signage, logos, watermark, border, frame, currency markings, or decorative corner ornaments.
```

## Scene substitutions

- **beach-dunes:** An empty sandy beach with low wind-shaped dunes and beach grass in the foreground, gentle ocean waves, and distant soft cloud bands.
- **beach-boardwalk:** A weathered wooden boardwalk curving beside a sandy beach, simple wooden railings and dune grass, with the calm ocean and rolling clouds beyond.
- **lakefront-city:** A city skyline bordering a wide lake, a sandy urban beach and tree-lined waterfront promenade in the foreground, gentle water reflections and soft clouds.
- **prairie-clouds:** A broad open prairie of gently rolling grassland beneath layered cumulus clouds, a distant line of trees, and subtle wind moving through the grass.
- **backyard-sunset:** A quiet everyday backyard at sunset, a lawn, wooden fence, modest garden beds, mature trees and a patio chair, with the low warm sun and long soft shadows. Sky dominated by engraved purple patterns with restrained warm terracotta glow.
- **coastal-town:** A relaxed small coastal town of low seaside houses and terracotta roofs above a sheltered bay, a winding shoreline path, distant headlands, calm water and drifting clouds. No church or landmark.
- **lakeside-marina:** A lakeside marina with a few elegant sailboats moored beside wooden docks, a low tree-lined shore across the lake, and large peaceful clouds reflected in rippling water.
- **beach-after-rain:** A wide sandy beach just after rain, shallow reflective tidal pools and a few smooth rocks, soft foamy surf, and layered storm clouds opening to sunlight near the horizon.

## Palette correction for an existing illustration

Change only the ink palette. Replace blue linework, shading, and guilloche sky meshes with violet-purple ink around #6426AC, lighter lavender fine lines, and deeper plum cross-hatching. Preserve the ivory paper, restrained terracotta and muted olive accents, scene, layout, line detail, horizon, aspect ratio, and brightness. No blue or cyan ink, new text, logos, borders, or objects.

## Website assets

Final WebP files: `public/article-heroes/<scene-id>.webp`. The originals retain their full composition; banner cropping happens in CSS using the focal point in `content/article-heroes.json`.

Each article's random choice is written to `content/articles.json` by `npm run prepare:articles` and committed with the article. Existing choices are preserved. Production builds validate these saved choices rather than choosing again. Adjacent published articles cannot share a hero.

