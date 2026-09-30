# Layered landscape heroes

About and article heroes retain the original full-resolution WebP in the HTML
for accessibility, reduced motion and WebGL failure. Three.js loads only when a
hero enters the viewport, pauses offscreen/in hidden tabs, and renders at roughly
30 fps with device pixel ratio capped at 2. Touch scrolling is never captured.
Changing reduced-motion preference tears down the scene immediately.

## Source-preserving layers

`lib/landscape-composition.ts` defines normalized depth contours and separate
water/foliage masks for each original illustration. `landscape-layers.ts` cuts
three full-resolution transparent textures from those exact source pixels:
background, middle distance, and foreground. `landscape-pixels.ts` extends only
hidden cut edges into the next layer, so tiny camera movements do not expose
transparent seams or a duplicate silhouette. There is 16 source pixels of edge
padding, not a zoom. No new artwork or reduced-resolution atlas is substituted.

The old generated atlases remain in the repository for reference but are no
longer loaded. Their individual 682×384 tiles changed the original composition
and lost engraving detail. Crossfading mismatched generated frames compounded
the softness.

Each depth plane uses the source image's actual dimensions and exactly the same
object-fit: cover/object-position calculation as the static image. The camera
translates by at most 3 CSS pixels (less on small screens) without turning toward
the origin. Pointer exit eases back to neutral. No 6% overscan is applied.

The fragment shader adds bounded, slow, sub-pixel ripples and leaf/grass movement
inside the explicit motion masks. Boardwalks, rails, buildings and furniture are
excluded. The motion mask edges are feathered; the artwork is never blurred.
There are no generated-frame crossfades or whole-scene idle rotations.

Existing hero IDs, artwork files, article content, About copy and page spacing
are unchanged. To tune a scene, edit its contours/masks and check it at rest and
at pointer extremes. `node --test tests/landscape.test.mjs` checks framing and
pixel-perfect neutral reconstruction for all eight original images (Node 22.18+
with native TypeScript stripping).
