# Camera-projected landscape heroes

About and article heroes retain the original full-resolution WebP in the HTML
for accessibility and reduced motion. Three.js is the primary renderer. It
loads when a hero enters the viewport, pauses offscreen/in hidden tabs, and
renders at roughly 30 fps with device pixel ratio capped at 2. Touch scrolling
is never captured. Reduced-motion preference stops animation immediately.

## Source-camera projection and real generated frames

`lib/landscape-composition.ts` defines source-coordinate depth contours and
water/foliage masks. Three transparent depth textures are cut from the original
full-resolution pixels. Hidden cut edges are extended underneath the next layer.
`landscape-projection.ts` builds a distant backdrop and subdivided receding
ground/water and foreground surfaces by intersecting source-camera rays with
simple scene geometry. The shader projects artwork from that fixed original
camera onto the meshes; a separate viewing camera supplies real perspective
parallax. Forty-eight source pixels of edge padding are added outside the original frame;
the picture itself is never enlarged to hide movement.

The two currently published heroes (About's beach boardwalk and Writing's
prairie) use the original plus five individually generated full-resolution
keyframes each, defined by `parallax.frames` in `content/article-heroes.json`.
Full-resolution generated source files are retained separately. Runtime
frames crop away the unanimated sky (no resizing); `frameRegion` maps those
crops back to source-camera coordinates. The five runtime frame files total
2,223,948 bytes for About and 2,224,150 bytes for Writing, approximately half
the uncropped download. The initial still appears first and parallax starts
without waiting for the animation-frame downloads.
The shader smoothly interpolates these actual frame pixels inside water and
foliage masks. It does not fake environmental movement by deforming a static
texture. Static sky, buildings, boardwalk, rails, furniture and rocks retain the
original source pixels outside the masks. A complete loop lasts 7.2 seconds.

Frames are generated individually from the original reference. Packing multiple
frames into one generated sheet reduced each frame's resolution too far: the
previous six-tile atlases provided only 682×384 pixels per tile. Even a requested
3840×2160 four-frame replacement was returned as 1672×941 total, so it was rejected.
The old atlases remain in the repository for reference and are not loaded.
The other six unused scenes retain source-preserving depth parallax until their
own full-resolution frame sequences are assigned.

The viewing camera crops the source frustum using the same object-fit: cover /
object-position calculation as the static image. Source projection and geometry
stay fixed on resize. The viewing camera translates without turning toward the
origin. Foreground geometry moves up to about 9 CSS pixels and the far backdrop
about 2.5, producing visible perspective separation. Travel is bounded more
tightly on narrow displays. There is no 6% overscan or image rotation.

## Failure handling

If WebGL initialization, shader compilation or context retention fails, the
same separated source layers and real generated frame loop use a Canvas 2D
backend with an approximate layered parallax effect.
Only reduced motion or failure of both rendering paths leaves a static image.
The container records `data-renderer`, `data-frame-count` and `data-scene-reason`
for diagnosis; asset/module failures log a descriptive warning rather than
silently swallowing the reason. Failed image loads keep the original visible.

Existing article IDs, original artwork, article content, About copy and page
spacing are unchanged. The user is checking this revision directly; no browser
QA or build/test run was performed after their instruction to stop testing.
