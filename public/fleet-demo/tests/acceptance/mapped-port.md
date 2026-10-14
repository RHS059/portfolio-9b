# Mapped terminal acceptance

The tests consume `OICT_GEOGRAPHY` from `src/render/map/oict-geography.js` and the public `createPort` / `createFacilities` component API. They do not alter map data, source rules or renderer state.

Run from the demo root with an existing Three r128 module:

```sh
REQUIRE_MAPPED_PORT=1 \
FLEET_THREE_MODULE=/absolute/path/to/three.module.js \
node --test tests/acceptance/geometry-assertions.test.mjs tests/acceptance/mapped-port.test.mjs
```

For isolated module development, `FLEET_PORT_ROOT` identifies the demo root containing the component, and `FLEET_PORT_GEOGRAPHY_JSON` supplies the same public geography schema as a JSON file. Omit both when testing the integrated application. Set `REQUIRE_MAPPED_PORT=1` in a required integration gate so unavailable prerequisites cannot be mistaken for successful validation. Without that switch, absent geometry/runtime is reported as skipped tests.

Checks:

- Complete mapped footprint and all supplied yard-lane polylines, rather than the former symbolic rectangular pad
- Full footprint-edge containment, including concave shoreline notches
- Every row and crane base respects declared 8 m boundary and 12 m lane-clearance buffers
- Quay-aligned crane bases remain landward; elevated booms extend seaward
- Actual overview/detail instance transforms remain inside checked row envelopes
- Exactly one container level of detail is active; the source geography remains unchanged
- No opaque ground pad or low water-covering mesh is introduced
- Site children remain at local origin for the renderer's geographic placement
- Missing geography is explicitly unavailable rather than replaced with invented terminal geometry

The buffers are artistic layout clearances, not measured road widths or operational safety distances. Container and crane counts are bounded illustrative detail, not terminal inventory, throughput or capacity. A 1 mm tolerance is used only when comparing Float32 instance transforms to their double-precision row envelopes. These CPU geometry tests do not certify browser rendering, performance, geographic survey accuracy or current access permissions.

Public geographic sources and attribution belong to the supplied geography module. Browser integration must separately confirm that the renderer injects that module, labels the mapped extent honestly, applies geographic translation only once, preserves visible lanes/water, and keeps repeated vehicle maintenance as the central story.
