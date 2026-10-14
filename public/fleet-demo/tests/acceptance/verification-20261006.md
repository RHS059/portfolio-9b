# Initial verification record — 2026-10-06

This is historical baseline evidence, not acceptance of later revisions. Current commit-specific results are published by the Fleet demo invariants workflow.

## Native verification

An initial integrated source tree (`3274e79b33b534b6883973ac2f65aa96933a9f35`) passed 97 domain/app tests under Node v24.19.0, Linux x86_64. An independent acceptance/performance suite passed 43 test entries, including two grouping entries. Pure component rendering and frame-summary arithmetic are not browser or hardware performance evidence.

## Browser baseline

[GitHub Actions run 37546586229](https://github.com/RHS059/portfolio-9b/actions/runs/37546586229) completed successfully for commit `2e5bc645c4ba2cff78a45f824a9cde62694aadca`. Artifact `11450134153` contained 10 passing functional checks, zero captured page errors and four screenshots. Coverage included source choice, immutable records, replay/deduplication, camera/pause/reset, responsive overflow, context loss, browser Back and the original Reno console.

The initial full-page screenshot was 1600 × 1033. The whole-flow metric was 11.645 RAF/s, p95 266.7 ms, p99 450 ms, 118 samples and 41 long frames. Renderer: MapLibre 4.7.1 + Three r128; ANGLE Vulkan SwiftShader software rendering; HeadlessChrome 151.0.7922.34 on a GitHub Ubuntu runner. This baseline does not establish the 30 FPS target, named-device GPU performance or the appearance of later facility revisions.

## Reproduction and limits

The current workflow downloads pinned Three r128 for geometry tests and runs both the integrated smoke script and independent browser suite. Reports identify the tested commit, environment and any failures; screenshots require visual inspection. Local Chromium may be unavailable under restricted execution environments, so a skipped or blocked local browser launch must never be counted as a pass.

The Today review is simulated and makes no model call. Recorded-review unit fixtures test binding and labels without claiming a real agent produced the text. Service facts and illustrated shop occupancy remain separate from the unknown historical maintenance-trigger algorithm.
