# Provenance panel

Native browser ES modules for the frozen v1 component contract. No dependencies,
network calls, domain imports, raw-data writes or service-history writes.

```js
import {createProvenancePanel} from './src/ui/provenance/index.js';
const panel = createProvenancePanel({container, onAction});
panel.update(model);
panel.dispose();
```

The implementation consumes the v1 model and the app adapter's optional
`canonical`, `vehicles`, `asOf`, and `reviewing` fields. Source controls dispatch
only `select-vehicle`, `set-authority`, `add-exclusion`, `replay`, `review-imports`
and the integration action `reimport`.
The app remains responsible for optimistic configuration version checks, effective
dates, source-policy writes, replay and review providers.

Scope values are `field`, `vehicle`, `integration`, and `reading`. An exact
reading exclusion includes the original row's source, vehicle, field and ID.
Scope selection resets to `field` when the inspected vehicle changes. Existing
active rules disable equivalent controls. Raw records remain inspectable.

Today displays simulated or recorded reviews only, with explicit no-live-call
labels. Review findings/notifications are withheld if the vehicle, configuration
version or replay cutoff does not match. The domain provider owns SHA-256 binding
to the exact reviewed input; the UI does not replace that validation. The current
app adapter clears reviews after new imports/configuration changes.

## Integration note

The integration contract includes
the existing `reimport` selector in addition to the original five v1 actions.
This component now emits `{type:'reimport'}` for that additive control; the app
continues to own duplicate-import handling. No other command shape changed.

## Verification

From the repository root:

```sh
node --test public/fleet-demo/tests/components/provenance.test.js
node --test public/fleet-demo/tests/domain/*.test.js public/fleet-demo/tests/components/*.test.js
```

Component tests include an explicitly minimal lifecycle/event host, not a browser
emulator. Real DOM, keyboard, layout and integration checks belong to browser QA.
Component styles are scoped under `.fp-panel` and require no global stylesheet
changes. Updating preserves expanded details, scroll position and keyed focus;
dispose removes only the component-owned subtree and handlers.

## Stable browser selectors

- `select[data-vehicle-select]`, accessible label `Inspect vehicle`
- `button[data-action="set-authority"][data-source="B"]`
- `select[data-exclusion-scope]`: `field`, `vehicle`, `integration`
- `button[data-action="add-exclusion"][data-scope="choose"][data-source="A"]`
- `button[data-action="add-exclusion"][data-scope="reading"][data-reading="v1-b-3"]`
- `button[data-action="replay"]`, `button[data-action="review-imports"]`, `button[data-action="reimport"]`
- `[data-reading-id]` for raw record rows
- `[data-review-state]`: `empty`, `current`, `stale`, `unsupported`
