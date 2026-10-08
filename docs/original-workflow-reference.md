# Original WEX workflow reconstruction

## Evidence and scope

Reference video: https://cdn.prod.website-files.com/61a830e1cce16a2c21938ec0/65496d260c599829212a402c_cdata-export-transcode.mp4

The supplied 1280×720 recording was inspected as actual frames; its duration is 20.9 seconds. The separate supplied 2048×1402 screenshot was also inspected and establishes the full Firefox frame, navy application navigation, filter and record toolbars, Main tab, Details actions, dense transaction table, created fields and bottom action strip.

Approximate observed sequence:
- 0–4 seconds: the second imported WEX fuel transaction is selected in red with an unmatched Asset #. One other transaction is already green. The action reads “Set the Asset.”
- Around 5 seconds: “Select an Asset” opens, with an Asset selector, Set Asset and Cancel.
- Around 6–11 seconds: the selector opens “Select an Item,” a wider asset table. The user chooses the vehicle row.
- Around 12–14 seconds: the chosen vehicle appears in the selector, and the user clicks Set Asset.
- Around 15–20.9 seconds: the repaired transaction turns green, the action becomes “Go To Fuel Log,” and a temporary “All changes have been saved” notice appears.

The Missing Asset, Asset Linking and Auto Update annotation overlays are excluded. The final annotation claims future automatic matching, but no further import is shown. The implementation does not invent that import or a Fuel Log destination.

This footage demonstrates fuel-record asset linking, not selecting an odometer source or excluding readings. The right-hand solution narrative explains the original research, vendor discovery, import-flow mapping and validation design. The WEX application is shown over the 3D scene; its asset-linking step remains distinct from odometer authority.

## Local sample boundary

Transaction IDs, imported IDs, employee references, vehicle identity and financial values are synthetic. The repair adds a local association without replacing imported values. The WEX state never touches the odometer or service-history scenario. There are no submissions, persistent writes, imports or live AI calls. Unrelated application chrome and the unseen Fuel Log destination are decorative or disabled.

## Integration and behavior

The six modules under `public/fleet-demo/src/ui/original-workflow/` provide:
- `createOriginalWorkflow({container,onOpen,onClose,reducedMotion})` → `{element,isOpen,open({returnFocus}),close({restoreFocus}),dispose,getState}`.
- `createOriginalWorkflowPreview({container})` → `{render(timeSeconds,{paused,reducedMotion}),dispose}`.

Use a connected workspace root for the dialog, not an ancestor marked hidden. Its selector is `dialog.ow-dialog[data-original-workflow-dialog]`. The supplied integration sets activeDialog, pauses the story and hides floating playback while the modal is open. Closing keeps the story paused. Native top-layer presentation, Tab wrapping, inner/outer Escape handling, return focus and route cleanup are explicit. Programmatic scene navigation may close without restoring focus.

Manual actions pause the modal loop before editing. Reset clears the local repair, and reopening starts cleanly. The reduced-motion preference starts paused; a deliberate Play loop command may opt into the demonstration. Visibility loss pauses the modal clock.

The scene-overlay preview has no separate timer. It samples the solution scene's elapsed time at 1.5×, allowing the 21-second demonstration to complete and restart within the 18-second scene. The scene overlay scales the complete original composition, including its chrome, columns and records. The full modal keeps dense horizontally scrollable tables.

The visible sample-data caption and long disabled-button tooltip have been removed. The phase status is screen-reader-only; annotations are not overlaid on the recreation.

## Verification

The supplied screenshot was visually inspected during integration. The recreation retains its browser frame, toolbar hierarchy, navy navigation, dense red/green table and bottom actions, using synthetic records. Exact pixel equivalence has not been claimed.

Run:
`node --test public/fleet-demo/tests/components/original-workflow*.test.js public/fleet-demo/tests/core/mount.test.js tests/fleet-shell.test.mjs tests/fleet-original-workflow-integration.test.mjs`

Node tests cover state transitions, immutable evidence, local-only behavior, loop disposal, dialog focus/keyboard lifecycle, the real app mount/controller regression harness and markup parity. They do not replace browser visual testing. The native preview CI lane runs `checkOriginalWorkflow` to check the full modal against the screenshot, manual repair, repeated open/close, pause/reset, keyboard focus, mobile table scrolling, reduced motion and route cleanup.

The design-process copy is grounded in `app/projects/fleet-fuel-integration/page.tsx`: Research & Discovery, How I Knew What to Do, Planning & Collaboration, and Results. Only the solution scene moves its narrative to the right on desktop; narrower layouts stack it with the same readable portfolio treatment.
