# Independent Fleet acceptance checks

Scope: the anonymous A/B partial-provider-migration odometer incident. These tests do not implement domain rules, a historical maintenance scheduler, or live AI. The suites live under `tests/{acceptance,browser,performance}/` relative to the demo root.

## Native checks

From the demo root:

```sh
node --test tests/acceptance/*.test.mjs tests/performance/*.test.mjs
```

No package installation or transpilation is required. `load-domain.mjs` imports the existing `src/domain/readings/index.js` and app review adapter. To test an unchanged separate checkout, set `FLEET_DEMO_ROOT` to its absolute demo root. For isolated component testing, `FLEET_UI_ROOT` and `FLEET_FACILITIES_ROOT` can identify separate demo roots. Missing UI/facility modules are explicit skips, never presentation passes; acceptance requires both integrated.

Coverage:

- Independent synthetic TRK-104/B and TRK-208/A fixture, including a non-odometer field to detect exclusion leakage
- Raw observation/import provenance; source authority; vehicle/field/integration/individual-reading scopes
- Immutability, append-only versioned configuration, effective dates, exclusive expiration, stale command rejection
- Duplicate imports, atomic conflicting-ID rejection, deterministic input-order-independent replay, cutoff visibility
- Missing/stale/invalid/ambiguous/excluded authoritative input without fallback
- Simulated review honesty, exact recorded-review SHA-256 input/configuration/cutoff binding, discarded executable fields, in-app notifications
- UI rendering escapes raw strings and withholds stale or unsupported reviews; this is not DOM/layout testing
- Facility presentation only follows declared service status; odometer changes or elapsed animation time cannot invent service visits
- Frame-summary arithmetic and absent-data behavior; synthetic arithmetic samples are not performance evidence

## Browser checks

Use an already authorized local static server and installed Playwright. No deployment, login, security override, credentials, or CI dispatch is performed by this suite.

```sh
FLEET_BROWSER_URL=http://127.0.0.1:8000/ \
FLEET_SOURCE_REVISION='EXACT_COMMIT_OR_TREE_WITH_OVERLAY_DESCRIPTION' \
FLEET_TEST_ENV='NAMED_DEVICE_OR_CI_RUNNER' \
node --test tests/browser/fleet-workflow.test.mjs
```

Optional variables: `FLEET_CHROMIUM_PATH` selects an existing Chromium executable; `PLAYWRIGHT_PACKAGE` identifies the installed Playwright package-resolution root; `FLEET_EVIDENCE_DIR` changes the report/screenshots directory. Without a URL, the two browser suites explicitly skip. With a URL, browser launch/access failures are failures/blockers and must not be reported as passed workflows.

The suite uses user-visible controls. `window.__fleetDemo.getState/getMetrics` are read-only assertion seams, not a way to apply changes. It writes a named-environment JSON report, screenshots, console/page-error/network records and, only after successful launch, measured RAF timestamps. Target-device rendered FPS remains unverified even when browser cadence is measurable. A 2D fallback or software-rendered result cannot certify hardware performance.

## Integration assumptions

- Exact row-exclusion scope mismatches reject with `EXCLUSION_SCOPE_MISMATCH`
- `src/domain/readings/index.js` remains the real module entrypoint
- The app owns command adaptation, version stamps and review invalidation; tests exercise that boundary without replacing it
- The opening left panel uses `#project-info` followed by `#start-story`; `#source-inspector` and story controls appear after Next. The component mounts inside `#provenance`
- UI buttons expose stable `data-action`, `data-source`, `data-reading` and `data-exclusion-scope` selectors, including `reimport`
- Browser fixture IDs remain v1-b-3 / TRK-104 / TRK-208; native acceptance fixtures use their own IDs to avoid simply replaying implementation-owned expected values
- Missing/stale scenarios use the declared demo freshness policy, never an inferred customer threshold
- The default Today provider is simulated. Recorded-review tests use an explicitly synthetic test recording, not a claimed real agent session

See `tests/browser/SCENARIOS.md` and `tests/acceptance/verification-20261006.md` for coverage and actual execution limits.
