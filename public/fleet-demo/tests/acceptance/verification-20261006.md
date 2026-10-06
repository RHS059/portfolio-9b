# H3 verification record — 2026-10-06

## Verified source input

- Repository: RHS059/portfolio-9b, PR #4, base commit `2e5bc645c4ba2cff78a45f824a9cde62694aadca`
- Aella supplied `fleet-current-demo-20261006-2337.patch.txt` through Discord message `1557175155870933094`
- Downloaded patch: 134556 bytes; SHA-256 `b90241a3ded50e8bbb0544ddd2da30cc6b91f3de3a706e69b04e98f27d0d152e`
- `git apply --check` passed; applied only in an isolated local test checkout
- Resulting Git tree: `3274e79b33b534b6883973ac2f65aa96933a9f35`, exactly matching the supplied tree
- Fleet source-reference repository and all remotes remain unchanged

## Executed

- `node --test public/fleet-demo/tests/**/*.test.js`: **97 passed, 0 failed** on the verified upstream tree
- Independent H3 native acceptance/performance suite with local H1/H2 outputs: **43 Node test entries passed, 0 failed, 0 skipped** (includes two grouping entries)
- Runtime: Node v24.19.0, Linux x86_64 cloud execution container
- H1 frozen demo-relative patch SHA-256: `f036b9d5b9f8242ecafd33ec1b2fe4e5f25d414d34ab5a3b86a6920c42aa369f`; H2 v1 demo-relative patch SHA-256: `8f13142116d3b4d753eeda791b317d1c0c4c0de4826948c219463b32c673f3d6`
- Earlier independent runs passed 25 domain/app checks before the hardening update, then 42 including presentation/arithmetic. The hardening update required asserting explicit conflicting-scope rejection and the new plain recipient label. No domain code was edited to make tests pass

## Browser execution blockers

- Installed Chromium exists, and Playwright resolves in the execution environment
- Normal launch failed before page load: `socket() failed: Operation not permitted` in Chromium process singleton initialization
- One reviewed/escalated launch attempt failed with the same socket restriction
- Cloud Chrome rejected the local static URL with `net::ERR_BLOCKED_BY_CLIENT`
- Opening the specified deployed preview redirected to vercel.com; automatic review denied that origin as outside the preview-only inspection scope. Stopped without login, credentials, sharing links or protection changes

Consequently: **no successful real-browser workflow run, screenshot, visual acceptance, WebGL test, measured RAF timing or hardware FPS result from H3**. Portable browser tests and the timing collector are delivered for the already authorized integrator environment/CI. They still need execution against the final integrated source.

## Existing remote baseline evidence inspected independently

[GitHub Actions run 37546586229](https://github.com/RHS059/portfolio-9b/actions/runs/37546586229) completed successfully for exact remote commit `2e5bc645c4ba2cff78a45f824a9cde62694aadca`. Both `test` and `browser` jobs succeeded. H3 downloaded artifact `11450134153` (`fleet-browser-evidence`), verified ZIP SHA-256 `87040bcde7ba00488c670a82e4327212e027a8dbee808ab19e8c5444630f7313`, read its result.json, and inspected its desktop screenshot.

The artifact reports 10 functional workflow checks passed and zero captured page errors, including source repair, immutable records, replay/dedup, camera/pause/reset, responsive overflow, context-loss preservation, browser Back and original Reno. It contains four screenshots. The initial full-page screenshot is 1600×1033; this is not a 1920×1080 performance run.

Its recorded metric is **11.645 RAF/s**, p95 **266.7 ms**, p99 **450 ms**, from **118 samples**, with **41 long frames**. Renderer: MapLibre 4.7.1 + Three r128; hardware description: ANGLE Vulkan SwiftShader (software rendering); browser: HeadlessChrome 151.0.7922.34; GitHub `ubuntu-latest` runner `1000002967`. This is limited baseline functional evidence. It does **not** establish the 30 FPS target, certify named-device GPU performance, validate the newer local tree, or validate Halcyon's integrated components. No CI job was rerun or dispatched.

## Scope of claims

Pure H1 HTML generation and H2 presentation-state assertions are not browser rendering tests. Frame-summary unit tests use synthetic timestamps only. Default Today review is simulated/no model call; a synthetic recorded-review fixture tests binding and labeling without claiming that an actual agent produced it. Service facts and illustrated shop occupancy remain separate from any historical maintenance algorithm.

No source/domain/shared entrypoint edits, remote push, CI dispatch, deployment, paid resources or third-party outreach were performed by H3.
