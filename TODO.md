# Bear Rush — expanded wildlife and river hazards

## User-requested outcomes

- [x] Add rabbits and coyotes as visible, trackable, scoreable hunt targets alongside the existing deer and moose; retain the other current food species and local-only game behavior.
- [x] Research deer, moose, rabbit/hare, coyote, and salmon behavior; implement distinct awareness, escape movement, close-pursuit endurance, fatigue window, and final catch action for each. Set practical game chase timing from that research, clearly distinguishing game compression from real biological chase durations.
- [x] Allow the bear to enter and leave the river. Make salmon catches available in the river through a deliberate fishing action that differs from a land-animal pounce.
- [x] Add large visible wood pieces flowing downstream. A collision while the bear is in the river must reduce the percentage health; wood must not damage the bear on land. Ensure logs keep appearing during infinite-world travel and do not grow resources without bound.
- [x] Preserve existing percentage health and the land-only poison-food, bear-trap, and cliff/trench-fall damage. At 0%, the game ends. Preserve wind/noise stalking, the minimap, streaming world, browser-local saving, and desktop/mobile controls.
- [x] Keep assets bundled locally. Do not purchase assets or generate AI models for this pass.

## Evidence and verification

- [x] Save source-backed behavior notes for each target, include citations and note the rare/non-routine bear-coyote interaction if supported by evidence.
- [x] Add tests for new species and hunting differences, in-river fish strikes, bear wading, downstream driftwood, swept water collision and river-only log damage; retain tests for the three existing land hazards.
- [x] Pass typecheck, unit tests, production build, desktop/mobile browser smoke, and diff checks. Create and push a new PR from the merged `main` branch, without altering merged PR #3. [PR #4](https://github.com/sundaram2021/bear-rush/pull/4) is open on `feat/river-rabbit-coyote-hunts` against `main`.
