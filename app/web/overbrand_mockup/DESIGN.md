# overbrand.ai Design System

Landing page concept for a fictional AI brand-kit service. Read this before changing the page so new UI matches.

## Look and Feel

Warm, confident, print-shop energy. Cream paper, near-black ink, one hot orange. Hard-edged "stamped" buttons with offset shadows, soft rounded cards. A full-bleed photographic hero with a dark scrim.

## Color

| Token | Value | Use |
|---|---|---|
| `--orange` | `#ee6432` | Primary accent, CTA fill, hero headline accent, focus ring on dark |
| `--orange-ink` | `#b93e0c` | Orange text or icons on white/cream (AA contrast) |
| `--ink` | `#141210` | Body text, borders, button text, focus ring on light |
| `--cream` | `#f2ebe4` | Page background |
| `--card` | `#fbf7f3` | Card surface |
| `--line` | `#ddd2c8` | Card borders, dividers |
| `--muted` | `#5b524b` | Secondary text on cream |
| `--hero-text` | `#ece6e0` | Body text over hero imagery |
| `--footer` | `#1e140e` | Footer background |
| `--footer-text` / `--footer-muted` | `#f3ece6` / `#c2b3a7` | Footer text |
| Icon tile | `#fde4d8` | Background behind step icons |

Orange is the only accent. Never add a second accent hue.

## Typography

- **Display:** League Spartan 600/700 for the logo, H1–H3. Tight tracking (`-0.03em` on H1), line-height 1.
- **Body:** Inter, 16px, line-height 1.5.
- **Labels:** 12px, weight 600, uppercase, `0.08em` tracking (step labels, tab labels).
- All font sizes are multiples of 4px. H1 72px, H2 48px, H3 24px, lede 20px.
- Headings use `text-wrap: balance`; paragraphs use `text-wrap: pretty`.
- Title Case for headings, nav, and buttons. Second person ("your"), not first person.

## Icons

Google Material Symbols Outlined, weight 400, unfilled. Rendered with the `Sym` component, always `aria-hidden` and `translate="no"`. Social brand logos (LinkedIn, X, Instagram) use lucide-react because Material Symbols has no brand marks.

## Components

- **CTA button:** orange fill, 2px ink border, 8px radius, bold. Hover lifts `-2px, -2px` with a hard `4px 4px 0` ink shadow; active presses flat. Arrow icon nudges right on hover. Sizes: small 44px tall, large 56px.
- **Email form:** white pill-ish container (12px radius, 8px padding) holding the input and large CTA. Focus shows a 3px orange ring on the container, not the input.
- **Step card:** `--card` surface, 1px `--line` border, 16px radius, 32px padding. Hover lifts 4px, border turns ink, soft shadow; icon tile rotates `-8deg` and fills orange.
- **Hero tabs:** uppercase labels under the hero, active label full white, others 72% white. Pause/play button beside them. Slides cross-fade every 6s.

## Motion

- Easing: `cubic-bezier(0.22, 1, 0.36, 1)` everywhere.
- Animate `transform`, `opacity`, colors, and shadows only. List transition properties explicitly.
- Entry: content rises 16–24px and fades in. Hero image slowly scales from 1.08 to 1.
- `prefers-reduced-motion` disables all of the above and pauses the slideshow.

## Layout

- Max content width 1280px, 32px side padding (smaller on mobile).
- Sticky header gains a shadow once the page scrolls.
- Visible focus: 3px outline, ink on light surfaces, orange on dark.
