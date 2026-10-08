# Workshop-centered map region

The boundary is fixed to the fictional workshop's actual scene coordinate, longitude -122.31006620881038, latitude 37.81203847326626. It never follows the camera or a selected vehicle. The authored port, ships, full dock footprint, factory, workshop and route envelope determine a solid 2,200 m radius, with 120 m minimum content padding rounded to 50 m. A 350 m transition reaches zero at 2,550 m. The transition uses a 4×4 Bayer ordered threshold on 7 m world-anchored cells and a smoothstep coverage ramp.

## Actual culling versus visual clipping

- The vector source's supported rectangular `bounds` prevent requests for tiles outside the circle's enclosing rectangle.
- A public, instance-owned `addProtocol` loader tests circle versus tile rectangle before network fetch. A wholly outside tile produces an empty vector-tile buffer, so it contributes no features or geometry draw buckets. MapLibre may still create/bookkeep the empty tile object. It is not an undocumented `hasTile` override.
- Intersecting tiles remain complete to preserve roads and polygons at the boundary. A public custom layer clears rejected framebuffer pixels to transparent after basemap rendering. Its inverse ground homography keeps the ring geographic through zoom, pan, pitch and bearing, and rejects the sky/behind-horizon half-plane. The underlying pale eggshell is `#f3f3ed`. No opaque CSS cover, stencil hijack, renderer monkeypatch, texture capture or additional animation loop is involved.
- The intersecting tiles' out-of-circle geometry is still processed/rasterized before that alpha-clear pass. This is not exact per-fragment early culling, and GPU savings have not been measured. The source protocol avoids fetching and building geometry for wholly outside tiles. Browser counters report the observed fetch/cull/byte totals; they do not estimate avoided GPU milliseconds.
- The Three scene remains independent; all authored content is inside the solid disk. Route, actor and source-record state is unchanged. Attribution stays visible outside the clipped map.
- The SVG fallback applies the same tile-circle test before fetch, an outer SVG clipPath, and a world-anchored Bayer mask. Its 32 annular coverage steps approximate the continuous GPU ramp.

The protocol uses current CDN TileJSON templates, retains attribution and cache headers, forwards aborts, and unregisters on scene disposal/rebuild. Clip buffers/program/VAO are retired with the existing map-context lifecycle. The WebGL clip adds one fullscreen triangle on each existing map repaint, not every vehicle frame.

## Pinned API evidence

Implementation checked against MapLibre GL JS 4.7.1, not current v5/v6 signatures:

- Source option precedence and bounds: https://github.com/maplibre/maplibre-gl-js/blob/v4.7.1/src/source/load_tilejson.ts
- Vector source bounds: https://github.com/maplibre/maplibre-gl-js/blob/v4.7.1/src/source/vector_tile_source.ts
- Public resource protocol and its ArrayBuffer return: https://github.com/maplibre/maplibre-gl-js/blob/v4.7.1/src/source/protocol_crud.ts
- Public custom `render(gl, matrix)` lifecycle: https://github.com/maplibre/maplibre-gl-js/blob/v4.7.1/src/style/style_layer/custom_style_layer.ts
- Custom layer GL-state reset and pass ordering: https://github.com/maplibre/maplibre-gl-js/blob/v4.7.1/src/render/draw_custom.ts
- Alpha-capable map context: https://github.com/maplibre/maplibre-gl-js/blob/v4.7.1/src/ui/map.ts#L2823

## Verification

`node --test tests/render/map-region.test.js` covers content/active-route containment, intersecting tile retention, rectangle-corner exclusion, Bayer thresholds, source metadata and headers, no-fetch empty tiles, cancellation, geographic projection invariance, SVG masks, and clip resource cleanup. Browser visual/alpha checks must be run on a browser-capable runner; native math tests alone do not certify rendered pixels or performance.
