# Layered landscape heroes

The About page and every article use the same `LandscapeHero` component. The
original purple WebP remains in the HTML as the accessible image, search/social
asset and fallback. Three.js loads only when a hero enters the viewport and
reduced motion is off. It pauses when offscreen or the tab is hidden, caps pixel
ratio at 1.5 and renders at roughly 30 fps. Touch scrolling is never captured.
Changing the OS reduced-motion preference immediately tears down the scene.
Texture load failure or WebGL context loss restores the original image.

Each scene has an image-generated transparent atlas in
`public/article-heroes/parallax/<scene-id>.webp`: three columns (background,
middle distance, foreground) and two rows (frames A and B). Tiles share a full
16:9 coordinate system. They are placed on three planes at different depths,
with perspective-correct scaling and 6% overscan. The mouse eases a small camera
pan in both axes and returns to neutral on pointer exit.

The middle and foreground layers slowly interpolate the generated frames over
a 12-second cycle. Masks keep the skyline, boardwalk, garden furniture, rocks
and docks still while water, tree canopies and grass move. The blend is restrained
to avoid an obvious dissolve. Atlas filtering is clamped inside each tile.
Source illustrations and saved article IDs are unchanged.

## Generation prompt

Use the built-in image generation tool with the matching original purple hero
as a referenced image and `transparent_background: true`. One atlas per scene:

```text
Edit this purple engraved landscape into a precisely registered THREE-COLUMN,
TWO-ROW sprite atlas for a layered Three.js scene. Canvas 3840 by 1440 pixels
(8:3 aspect). Six edge-to-edge equal 1280x720 tiles. No gutters, labels, borders,
captions or checkerboard. Each tile is a full 16:9 scene coordinate system:
objects keep EXACTLY their original positions, sizes, horizon and perspective.
Preserve the violet/plum intaglio engraving, ivory highlights and
olive/terracotta accents of the reference.

LEFT COLUMN, both rows: an opaque clean background plate containing the sky,
clouds, horizon and distant hills only; reconstruct the scene behind the removed
land, water and nearby vegetation, continuing the background to all edges.

MIDDLE COLUMN: isolate the middle distance landscape, fields or beach and water,
plus mid-distance vegetation, with REAL transparent alpha everywhere the sky
and foreground were. Preserve ivory fill INSIDE solid objects. Exclude
foreground objects so the other layers can composite on top. Top row is
animation frame A. Bottom row is animation frame B: only water ripples and
foliage subtly advance in a gentle breeze, a tiny 2-4 pixel change. Shoreline,
buildings and all solid features stay exactly registered.

RIGHT COLUMN: isolate ONLY the near foreground: close grasses, shrubs, rocks
and, if present, the near boardwalk and railings. Everything else must be alpha
transparent. Keep each foreground object at its original full-scene coordinates,
not centered or rescaled. Top row frame A. Bottom row frame B: slightly move
grass tips/leaves in a gentle breeze, only 2-4 pixels. Wood, rocks, trunks remain
exactly fixed.

IMPORTANT: this is a technical compositing asset, not six different pictures.
The three tiles in either row must stack perfectly to reconstruct the reference.
All six tiles have identical camera framing. Transparent areas have alpha zero,
no printed transparency grid, no white rectangle behind isolated objects.

Keep generous OVERLAP between depth layers, extending occluded edges behind the
nearer objects so camera motion cannot reveal seams. The background sky plate
is completely opaque and fills the entire left tiles, including below the
horizon. No solid object changes its position between the two animation rows.
```

Generated PNGs were converted to 2046×768 WebP atlases with alpha preserved.
The coastal-town generator returned uneven columns; those tiles were repacked
to equal widths before use to prevent sampling a neighbouring layer.
`content/article-heroes.json` stores atlas paths, water boundaries and foreground
mask choices. To add a landscape, create its static fallback and atlas, register
both in that file, and visually check neutral/pointer extremes and both frames.
Do not reassign existing articles when changing scene rendering.
