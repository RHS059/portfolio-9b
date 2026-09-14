# Portfolio — build spec (1:1)

A two-column portfolio page: a fixed eggshell sidebar (bio + metrics + CTA) and a scrolling stack of near-full-bleed project cards that cross-fade through their screenshots on hover.

Everything below is exact. Copy the values verbatim — the design depends on the specific numbers.

**Image paths are relative on purpose.** Nothing in this spec hardcodes a CDN. Drop your images anywhere under your site's static/public root and point the `projects` array at them. See [Project data contract](#project-data-contract).

---

## 1. Tokens

Colors are OKLCH. Every modern browser supports it; if your toolchain doesn't, the sRGB fallbacks are listed.

| Token | OKLCH | ≈ hex | Used for |
|---|---|---|---|
| `--page` | `oklch(0.985 0.003 300)` | `#fbfafc` | page background (behind card gutters) |
| `--sidebar` | `oklch(0.972 0.008 92)` | `#f8f5ef` | sidebar ground (warm eggshell) |
| `--footer` | `oklch(0.945 0.011 92)` | `#f0ece4` | footer ground |
| `--footer-rule` | `oklch(0.885 0.014 92)` | `#dfd8cc` | footer top hairline |
| `--sidebar-rule` | `oklch(0.89 0.008 300)` | `#e0dee3` | rule above "Who am I?" |
| `--ink` | `oklch(0.17 0.032 297)` | `#1c1727` | headings, CTA fill |
| `--ink-num` | `oklch(0.22 0.028 297)` | `#282335` | metric numbers at rest |
| `--body` | `oklch(0.31 0.022 297)` | `#3c3849` | metric sentence text |
| `--body-2` | `oklch(0.33 0.02 297)` | `#413d4d` | bio paragraphs |
| `--muted` | `oklch(0.47 0.02 297)` | `#635f70` | footer text |
| `--muted-2` | `oklch(0.55 0.02 297)` | `#767185` | "WHO AM I?" eyebrow |
| `--accent` | `oklch(0.44 0.20 293)` | `#6023d4` | link hover, CTA hover, metric shine |
| `--card-bg` | `oklch(0.935 0.006 300)` | `#eae8ec` | card placeholder ground |
| `--card-hatch` | `oklch(0.9 0.008 300)` | `#e0dde2` | card placeholder hatch line |

**Type:** Inter (400/500/600/700), fallback `Helvetica, Arial, sans-serif`.
Base: `font-size: 14px; line-height: 1.45; -webkit-font-smoothing: antialiased; text-wrap: pretty;`

**Global resets:**
```css
html, body { margin: 0; padding: 0; }
a { color: var(--ink); text-decoration: none; }
a:hover { color: var(--accent); }
img { display: block; max-width: none; }  /* important — cards size images by inset, not max-width */
```

---

## 2. Page skeleton

```
.grid  (max-width 2200px, margin auto, display grid,
        grid-template-columns: minmax(280px, 25vw) 1fr,
        align-items: start)
├── .side-wrap   grid-column 1, grid-row 1 / span 2, align-self stretch, bg --sidebar
│   └── aside.side   position sticky, top 0, height 100vh, overflow-y auto
├── main.stack   (implicit col 2 / row 1) flex column, gap 14px, padding 14px
└── footer.foot  grid-column 2, grid-row 2
```

Two structural rules that are load-bearing:

1. **The sidebar wrapper spans both rows** (`grid-row: 1 / span 2`) so the eggshell runs the full page height beside the footer. The sticky `<aside>` lives *inside* it.
2. **The footer is pinned to column 2 only** (`grid-column: 2; grid-row: 2`) so it never runs under the sidebar.

---

## 3. Sidebar

```
aside.side {
  position: sticky; top: 0; height: 100vh; overflow-y: auto;
  display: flex; flex-direction: column; justify-content: space-between; gap: 48px;
  padding: 28px 30px 26px; box-sizing: border-box;
}
```

`overflow-y: auto` is what makes the left column scroll independently of the project stack. Two children, pushed apart by `space-between`: the intro block (top) and the bio block (bottom).

### 3a. Intro block

- `h1` — "Reid Slaughter" — `margin: 0; font-size: clamp(28px, 2.1vw, 36px); font-weight: 600; line-height: 1.16; letter-spacing: -0.03em; max-width: 16ch;`
- `ul.metrics` — `margin: 18px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 11px; max-width: 30ch;`
- each `li.metric` — `font-size: 13.5px; font-weight: 400; line-height: 1.4; color: var(--body);`
- the number `span.num` inside — `font-size: 17px; font-weight: 700; letter-spacing: -0.02em;`

The three metrics (numbers wrapped in `.num`):

1. **90%** faster support ticket resolution for API integration tickets
2. **80%** faster customer upgrades
3. **4.4★** app store rating, **5k+** downloads

(Row 3 has two `.num` spans.)

### 3b. Metric shine-on-load

Numbers land in accent purple, hold, then settle to `--ink-num`. Staggered by row. One-shot only — it does not repeat on scroll or hover.

```css
@keyframes rs-shine {
  0%   { color: var(--accent); }
  45%  { color: var(--accent); }
  100% { color: var(--ink-num); }
}
.num { color: var(--ink-num); animation: rs-shine 2.4s cubic-bezier(0.4,0,0.2,1) both; }
.metric:nth-child(2) .num { animation-delay: 0.18s; }
.metric:nth-child(3) .num { animation-delay: 0.36s; }
@media (prefers-reduced-motion: reduce) { .num { animation: none; } }
```

### 3c. CTA

Single full-width button, wrapped in `div { margin-top: 22px; display: flex; flex-direction: column; gap: 8px; }` (the flex column is there so a second button can be added later without respacing).

```css
.cta {
  display: block; box-sizing: border-box; width: 100%;
  padding: 14px 16px; border-radius: 4px;
  border: 1px solid var(--ink); background: var(--ink); color: #fff;
  font-size: 13.5px; font-weight: 500; text-align: center;
  transition: background 160ms ease, border-color 160ms ease, color 160ms ease;
}
.cta:hover { background: var(--accent); border-color: var(--accent); color: #fff; }
```

Label: **Book a call** → `mailto:reids@reidhslaughter.com`

### 3d. Bio block

Container: `border-top: 1px solid var(--sidebar-rule); padding-top: 18px; display: flex; flex-direction: column; gap: 11px; max-width: 40ch;`

Eyebrow: `font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted-2);` → **Who am I?**

All paragraphs: `margin: 0; font-size: 12.75px; line-height: 1.6; color: var(--body-2);`

1. I design and build the front-end interfaces people use to do their jobs. Most of that work has been fleet and asset management for construction, utilities, and law enforcement. Later it was library systems spanning 540 million bibliographic records.
2. For example, at [Collective Data](https://www.collectivedata.com), fuel transaction imports failed quietly. Bad records sat undetected for months, customers paid for the cleanup, and engineers burned weeks on the same support tickets. I interviewed support agents, account managers, and the vendors we pulled data from, then designed a framework that catches bad records on arrival and emails the customer the same day. I rebuilt the integration and the API calls. Onboarding time also dropped because we could get integrations working for customers far faster. Resolving a data issue went from weeks to hours.
3. *(italic)* A client once called me a UX architect by trade and a creative technologist by heart.
4. Outside of work I build, texture, and animate in Blender.
5. *(font-weight: 500)* I'm looking for design engineering and product design roles.

Inline link style inside the bio (it must not look like the default link):
```css
.bio a { color: var(--body-2); text-decoration: underline;
         text-underline-offset: 2px; text-decoration-color: oklch(0.75 0.03 297); }
.bio a:hover { color: var(--accent); text-decoration-color: var(--accent); }
```

---

## 4. Project cards

`main.stack` — `display: flex; flex-direction: column; gap: 14px; padding: 14px;` and `id="work"`.

One `.card` per project:

```css
.card {
  position: relative;
  aspect-ratio: 16 / 9.6;
  border-radius: clamp(8px, 0.7vw, 12px);
  overflow: hidden;
  background-color: var(--card-bg);
  background-image: repeating-linear-gradient(135deg, var(--card-hatch) 0 1px, transparent 1px 10px);
}
```

The hatch shows only until images paint — keep it, it prevents a white flash.

### 4a. Layer stack (inside `.card`, in DOM order)

```
.drift              position absolute; inset 0; transition: transform 6s cubic-bezier(0.22,0.61,0.36,1)
└── .layer  ×N      position absolute; inset 0; transition: opacity 1300ms ease
    │                 first layer opacity 1, all others opacity 0
    ├── img.mat     the blurred bokeh backing
    └── img.shot    the real, contained screenshot
.scrim              absolute inset 0; pointer-events none;
                    linear-gradient(180deg, oklch(0.17 0.032 297 / 0.42) 0%, oklch(0.17 0.032 297 / 0) 34%)
.caption            absolute top/left/right 0; flex; align-items baseline;
                    justify-content space-between; gap 20px;
                    padding clamp(13px,1vw,18px) clamp(15px,1.1vw,21px); pointer-events none
```

**This is the part that's easy to get wrong.** Both images are absolutely positioned with explicit width/height derived from their inset — `max-width: none` on `img` (from the resets) plus the explicit sizing is what makes the insets govern the box:

```css
/* blurred mat — bleeds 32px past every edge so the blur has no visible seam */
.mat {
  position: absolute; inset: -32px;
  width: calc(100% + 64px); height: calc(100% + 64px);
  object-fit: cover; transform: scale(1.06);
  filter: blur(34px) brightness(0.84) saturate(1.05);
}
/* real screenshot — contained, 16px breathing room on all sides */
.shot {
  position: absolute; inset: 16px;
  width: calc(100% - 32px); height: calc(100% - 32px);
  object-fit: contain;
}
```

Both `img`s in a layer use the **same source**. The mat is that image blurred to fill the card; the shot is that image fit inside it. That's the whole trick.

### 4b. Caption

- Title — `font-size: clamp(15px, 1.15vw, 19px); font-weight: 600; line-height: 1.25; letter-spacing: -0.015em; color: #fff; text-shadow: 0 1px 14px rgba(12,8,24,0.5);`
- Date — `flex: none; font-size: 12.5px; font-weight: 500; letter-spacing: 0.02em; color: rgba(255,255,255,0.72); text-shadow: 0 1px 12px rgba(12,8,24,0.45);`

### 4c. Hover slideshow behavior

Tunables (defaults):

| Name | Default | Meaning |
|---|---|---|
| `shotDurationMs` | `2600` | how long each image holds |
| `dissolveMs` | `1300` | cross-fade duration (written onto each layer's `transitionDuration`) |
| `leadInMs` | `420` | pause after mouse-enter before the first advance |
| `driftOnHover` | `true` | scale `.drift` to `1.035` while hovered |

On **mouseenter** — if the card has fewer than 2 layers, do nothing (single-image projects stay static). Otherwise: set each layer's `transitionDuration` to `dissolveMs`; if drift is on, set `.drift` transform to `scale(1.035)`; after `leadInMs` show layer 1, then every `shotDurationMs` advance `(i + 1) % layers.length`. "Show n" = set opacity 1 on layer n, 0 on all others.

On **mouseleave** — clear both timers, reset `.drift` transform to `none`, restore layer 0 to opacity 1 and all others to 0.

Timers must be tracked per-card and cleared on unmount/navigation.

---

## 5. Footer

```css
.foot {
  grid-column: 2; grid-row: 2;
  background: var(--footer); border-top: 1px solid var(--footer-rule);
  display: grid; grid-template-columns: 1fr auto 1fr;
  align-items: center; gap: 20px;
  padding: 18px clamp(16px, 1.6vw, 30px);
  font-size: 12.5px; line-height: 1.5; color: var(--muted);
}
```

Three cells, all on one baseline, all `white-space: nowrap`:

1. left — "Client work shown remains the property of its owners."
2. center — `text-align: center` — "Copyright © Reid Slaughter"
3. right — `justify-self: end; display: flex; align-items: center; gap: 18px` — [LinkedIn](https://www.linkedin.com/in/reid59slaughter/) · [X](https://x.com/reidhslaughter) — both `color: var(--muted)`, hover `var(--accent)`

---

## 6. Responsive — single breakpoint at 900px

```css
@media (max-width: 900px) {
  .grid      { grid-template-columns: 1fr; }
  .side-wrap { grid-row: auto; }
  .side      { position: static; height: auto; max-height: none; overflow: visible; }
  .stack     { padding: 0; gap: 0; }        /* cards run flush edge-to-edge */
  .card      { border-radius: 0; }
  .foot      { grid-column: 1; grid-row: auto; grid-template-columns: 1fr; row-gap: 10px; }
  .foot > :nth-child(2) { text-align: left; }
  .foot > :nth-child(3) { justify-self: start; }
}
```

Note the footer cells keep `white-space: nowrap` in the original; if your copy is longer, drop nowrap inside this block.

---

## 7. Project data contract

Cards are driven by one array. **Use site-relative paths.** Put files under your public/static root and reference them from `/`:

```
public/
  work/
    texture-wizard/
      cover.png
      01-time-to-convert.png
      02-drag-and-drop.png
      ...
    fleet-productivity/
      cover.png
      01.jpg
      ...
```

```js
const projects = [
  {
    slug:  "texture-wizard",
    title: "Arma Reforger Texture Wizard",
    date:  "Sep 2025",
    hero:  "/work/texture-wizard/cover.png",
    rest: [
      "/work/texture-wizard/01-time-to-convert.png",
      "/work/texture-wizard/02-drag-and-drop.png",
      "/work/texture-wizard/03-multiple-texture-sets.png",
      "/work/texture-wizard/04-manual-override.png",
      "/work/texture-wizard/05-alias.png",
      "/work/texture-wizard/06-resize.png",
      "/work/texture-wizard/07-download-all.png"
    ]
  },
  {
    slug:  "fleet-productivity",
    title: "Improved Fleet Manager Productivity",
    date:  "Apr 2024",
    hero:  "/work/fleet-productivity/cover.png",
    rest: [
      "/work/fleet-productivity/01.jpg",
      "/work/fleet-productivity/02.png",
      "/work/fleet-productivity/03.png"
    ]
  },
  {
    slug:  "data-resolution",
    title: "90% Reduced Data Issue Resolution Time",
    date:  "Nov 2023",
    hero:  "/work/data-resolution/cover.webp",
    rest: [
      "/work/data-resolution/01.jpg",
      "/work/data-resolution/02-hierarchy.png",
      "/work/data-resolution/03-event-flow.png",
      "/work/data-resolution/04-old-method.png"
    ]
  }
];
```

Rules the renderer must honor:

- **Filter out any project without a `hero`.** A project with no public imagery gets no card at all (this is how the library non-profit app is handled — it stays out of the array or has `hero: null`).
- `rest: []` is valid — that project renders as a static single-image card with no cross-fade.
- Layer count per card = `1 + rest.length`. Layer 0 is `hero`.
- Filenames must not contain spaces. If yours do, URL-encode them (`%20`) or rename.
- Card order in the array is card order on the page (newest first).

Optional but recommended: `loading="lazy"` on every image except the first card's two, and `decoding="async"` on all of them.

---

## 8. Reference implementation (vanilla — drop-in)

Self-contained. No build step, no framework. Adapt to JSX/Astro/Svelte by keeping the class names and the layer structure identical.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Reid Slaughter</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles/portfolio.css">
</head>
<body>
<div class="grid">
  <div class="side-wrap">
    <aside class="side">
      <div>
        <h1>Reid Slaughter</h1>
        <ul class="metrics">
          <li class="metric"><span class="num">90%</span> faster support ticket resolution for API integration tickets</li>
          <li class="metric"><span class="num">80%</span> faster customer upgrades</li>
          <li class="metric"><span class="num">4.4★</span> app store rating, <span class="num">5k+</span> downloads</li>
        </ul>
        <div class="cta-wrap">
          <a class="cta" href="mailto:reids@reidhslaughter.com">Book a call</a>
        </div>
      </div>
      <div class="bio">
        <div class="eyebrow">Who am I?</div>
        <p>I design and build the front-end interfaces people use to do their jobs. Most of that work has been fleet and asset management for construction, utilities, and law enforcement. Later it was library systems spanning 540 million bibliographic records.</p>
        <p>For example, at <a href="https://www.collectivedata.com" target="_blank" rel="noopener">Collective Data</a>, fuel transaction imports failed quietly. Bad records sat undetected for months, customers paid for the cleanup, and engineers burned weeks on the same support tickets. I interviewed support agents, account managers, and the vendors we pulled data from, then designed a framework that catches bad records on arrival and emails the customer the same day. I rebuilt the integration and the API calls. Onboarding time also dropped because we could get integrations working for customers far faster. Resolving a data issue went from weeks to hours.</p>
        <p class="i">A client once called me a UX architect by trade and a creative technologist by heart.</p>
        <p>Outside of work I build, texture, and animate in Blender.</p>
        <p class="strong">I'm looking for design engineering and product design roles.</p>
      </div>
    </aside>
  </div>

  <main id="work" class="stack"><!-- cards injected --></main>

  <footer class="foot">
    <div>Client work shown remains the property of its owners.</div>
    <div class="foot-c">Copyright © Reid Slaughter</div>
    <div class="foot-r">
      <a href="https://www.linkedin.com/in/reid59slaughter/" target="_blank" rel="noopener">LinkedIn</a>
      <a href="https://x.com/reidhslaughter" target="_blank" rel="noopener">X</a>
    </div>
  </footer>
</div>
<script src="/scripts/portfolio.js" type="module"></script>
</body>
</html>
```

### `/styles/portfolio.css`

```css
:root {
  --page:#fbfafc; --sidebar:oklch(0.972 0.008 92);
  --footer:oklch(0.945 0.011 92); --footer-rule:oklch(0.885 0.014 92);
  --sidebar-rule:oklch(0.89 0.008 300);
  --ink:oklch(0.17 0.032 297); --ink-num:oklch(0.22 0.028 297);
  --body:oklch(0.31 0.022 297); --body-2:oklch(0.33 0.02 297);
  --muted:oklch(0.47 0.02 297); --muted-2:oklch(0.55 0.02 297);
  --accent:oklch(0.44 0.20 293);
  --card-bg:oklch(0.935 0.006 300); --card-hatch:oklch(0.9 0.008 300);
}
html, body { margin:0; padding:0; }
body {
  background: oklch(0.985 0.003 300); color: var(--ink);
  font-family: Inter, Helvetica, Arial, sans-serif;
  font-size:14px; line-height:1.45;
  -webkit-font-smoothing: antialiased; text-wrap: pretty;
}
a { color: var(--ink); text-decoration: none; }
a:hover { color: var(--accent); }
img { display:block; max-width:none; }

.grid { max-width:2200px; margin:0 auto; display:grid;
        grid-template-columns:minmax(280px,25vw) 1fr; align-items:start; }
.side-wrap { grid-column:1; grid-row:1 / span 2; align-self:stretch; background:var(--sidebar); }
.side { position:sticky; top:0; height:100vh; overflow-y:auto;
        display:flex; flex-direction:column; justify-content:space-between; gap:48px;
        padding:28px 30px 26px; box-sizing:border-box; }

.side h1 { margin:0; font-size:clamp(28px,2.1vw,36px); font-weight:600;
           line-height:1.16; letter-spacing:-0.03em; max-width:16ch; }
.metrics { margin:18px 0 0; padding:0; list-style:none;
           display:flex; flex-direction:column; gap:11px; max-width:30ch; }
.metric { font-size:13.5px; font-weight:400; line-height:1.4; color:var(--body); }
.num { font-size:17px; font-weight:700; letter-spacing:-0.02em; color:var(--ink-num);
       animation: rs-shine 2.4s cubic-bezier(0.4,0,0.2,1) both; }
.metric:nth-child(2) .num { animation-delay:0.18s; }
.metric:nth-child(3) .num { animation-delay:0.36s; }
@keyframes rs-shine {
  0% { color:var(--accent); } 45% { color:var(--accent); } 100% { color:var(--ink-num); }
}
@media (prefers-reduced-motion: reduce) { .num { animation:none; } }

.cta-wrap { margin-top:22px; display:flex; flex-direction:column; gap:8px; }
.cta { display:block; box-sizing:border-box; width:100%; padding:14px 16px;
       border-radius:4px; border:1px solid var(--ink); background:var(--ink); color:#fff;
       font-size:13.5px; font-weight:500; text-align:center;
       transition: background 160ms ease, border-color 160ms ease, color 160ms ease; }
.cta:hover { background:var(--accent); border-color:var(--accent); color:#fff; }

.bio { border-top:1px solid var(--sidebar-rule); padding-top:18px;
       display:flex; flex-direction:column; gap:11px; max-width:40ch; }
.eyebrow { font-size:12px; font-weight:600; letter-spacing:0.06em;
           text-transform:uppercase; color:var(--muted-2); }
.bio p { margin:0; font-size:12.75px; line-height:1.6; color:var(--body-2); }
.bio p.i { font-style:italic; }
.bio p.strong { font-weight:500; }
.bio a { color:var(--body-2); text-decoration:underline; text-underline-offset:2px;
         text-decoration-color:oklch(0.75 0.03 297); }
.bio a:hover { color:var(--accent); text-decoration-color:var(--accent); }

.stack { display:flex; flex-direction:column; gap:14px; padding:14px; }
.card { position:relative; aspect-ratio:16 / 9.6; border-radius:clamp(8px,0.7vw,12px);
        overflow:hidden; background-color:var(--card-bg);
        background-image:repeating-linear-gradient(135deg,var(--card-hatch) 0 1px,transparent 1px 10px); }
.drift { position:absolute; inset:0; transition:transform 6s cubic-bezier(0.22,0.61,0.36,1); }
.layer { position:absolute; inset:0; opacity:0; transition:opacity 1300ms ease; }
.layer:first-child { opacity:1; }
.mat { position:absolute; inset:-32px; width:calc(100% + 64px); height:calc(100% + 64px);
       object-fit:cover; transform:scale(1.06); filter:blur(34px) brightness(0.84) saturate(1.05); }
.shot { position:absolute; inset:16px; width:calc(100% - 32px); height:calc(100% - 32px);
        object-fit:contain; }
.scrim { position:absolute; inset:0; pointer-events:none;
         background:linear-gradient(180deg, oklch(0.17 0.032 297 / 0.42) 0%, oklch(0.17 0.032 297 / 0) 34%); }
.caption { position:absolute; top:0; left:0; right:0; display:flex; align-items:baseline;
           justify-content:space-between; gap:20px;
           padding:clamp(13px,1vw,18px) clamp(15px,1.1vw,21px); pointer-events:none; }
.caption .t { font-size:clamp(15px,1.15vw,19px); font-weight:600; line-height:1.25;
              letter-spacing:-0.015em; color:#fff; text-shadow:0 1px 14px rgba(12,8,24,0.5); }
.caption .d { flex:none; font-size:12.5px; font-weight:500; letter-spacing:0.02em;
              color:rgba(255,255,255,0.72); text-shadow:0 1px 12px rgba(12,8,24,0.45); }

.foot { grid-column:2; grid-row:2; background:var(--footer);
        border-top:1px solid var(--footer-rule);
        display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:20px;
        padding:18px clamp(16px,1.6vw,30px);
        font-size:12.5px; line-height:1.5; color:var(--muted); }
.foot > div { white-space:nowrap; align-self:center; }
.foot-c { text-align:center; }
.foot-r { justify-self:end; display:flex; align-items:center; gap:18px; }
.foot a { color:var(--muted); }
.foot a:hover { color:var(--accent); }

@media (max-width:900px) {
  .grid { grid-template-columns:1fr; }
  .side-wrap { grid-row:auto; }
  .side { position:static; height:auto; max-height:none; overflow:visible; }
  .stack { padding:0; gap:0; }
  .card { border-radius:0; }
  .foot { grid-column:1; grid-row:auto; grid-template-columns:1fr; row-gap:10px; }
  .foot-c { text-align:left; }
  .foot-r { justify-self:start; }
}
```

### `/scripts/portfolio.js`

```js
const CFG = { shot: 2600, fade: 1300, lead: 420, drift: true };

const projects = [ /* see §7 */ ];

const layerHTML = (src, alt = "", first = false) => `
  <div class="layer" ${first ? 'style="opacity:1"' : ""}>
    <img class="mat"  src="${src}" alt="" aria-hidden="true" loading="lazy" decoding="async">
    <img class="shot" src="${src}" alt="${alt}" loading="lazy" decoding="async">
  </div>`;

function cardHTML(p) {
  const shots = [p.hero, ...(p.rest || [])];
  return `
  <article class="card" data-slug="${p.slug}">
    <div class="drift">
      ${shots.map((s, i) => layerHTML(s, i === 0 ? p.title : "", i === 0)).join("")}
    </div>
    <div class="scrim"></div>
    <div class="caption">
      <span class="t">${p.title}</span>
      <span class="d">${p.date}</span>
    </div>
  </article>`;
}

const stack = document.querySelector("#work");
stack.innerHTML = projects.filter(p => !!p.hero).map(cardHTML).join("");

const timers = new Map();
const stop = (card) => {
  const rec = timers.get(card);
  if (!rec) return;
  clearTimeout(rec.lead); clearInterval(rec.tick); timers.delete(card);
};

stack.querySelectorAll(".card").forEach((card) => {
  const layers = [...card.querySelectorAll(".layer")];
  if (layers.length < 2) return;                    // single-image cards stay static
  const drift = card.querySelector(".drift");
  const show = (n) => layers.forEach((l, k) => { l.style.opacity = k === n ? "1" : "0"; });

  card.addEventListener("mouseenter", () => {
    layers.forEach(l => { l.style.transitionDuration = CFG.fade + "ms"; });
    if (CFG.drift && drift) drift.style.transform = "scale(1.035)";
    stop(card);
    const rec = {};
    rec.lead = setTimeout(() => {
      let i = 1; show(1);
      rec.tick = setInterval(() => { i = (i + 1) % layers.length; show(i); }, CFG.shot);
    }, CFG.lead);
    timers.set(card, rec);
  });

  card.addEventListener("mouseleave", () => {
    stop(card);
    if (drift) drift.style.transform = "none";
    layers.forEach((l, k) => { l.style.opacity = k === 0 ? "1" : "0"; });
  });
});
```

---

## 9. Acceptance checklist

- [ ] Sidebar is eggshell, full page height, and scrolls on its own — the project stack scrolls independently.
- [ ] Footer sits only in the right column; eggshell continues to the bottom beside it.
- [ ] Metric numbers are 17px/700, start purple, settle to near-black over 2.4s, staggered — once, on load.
- [ ] Cards are 16/9.6 with a 14px gutter; screenshots are *contained* with 16px of breathing room over a blurred version of themselves.
- [ ] Hovering a multi-image card waits ~0.4s, then cross-fades every 2.6s over 1.3s, with a slow 1.035 scale.
- [ ] Leaving a card returns it to its hero image and stops the timer.
- [ ] Below 900px: one column, cards flush edge-to-edge with no radius, footer stacked left-aligned.
- [ ] Every image path is site-relative; no CDN or absolute origin remains.
