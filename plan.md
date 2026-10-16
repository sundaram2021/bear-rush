# Bear Rush — river fishing and expanded wildlife hunts

## Goal

Extend the merged endless mountain hunt with rabbits and coyotes, more distinct deer/moose encounters, an enterable river fishing loop for salmon, and moving driftwood that damages the bear only on river contact. Research the five animal/fish behaviors first and use that evidence to set clear, playable chase and capture timings.

## Product constraints

Keep the existing third-person Three.js/Vite game, infinite seeded terrain streaming, wind/noise stalking, minimap, local-only saves and percentage health. No login, signup, server, analytics or remote save. Do not buy assets or generate AI models in this pass; use local procedural animal models consistent with current rendering. Keep poisonous food, bear traps and cliff/trench falls as land-only damage sources. Add large flowing wood as a separate river-only collision source. Health remains one 0–100% pool; 0% ends the run.

## Wildlife and hunting design

Add rabbits and coyotes to the score/tally/HUD/localized species set while retaining salmon, honey, fawn, deer, elk and moose. Each type has separate awareness, pursuit radius, chase endurance, fatigue window, escape pace and pounce tolerance. A hare pauses briefly on detection, then flies relatively straight at range and becomes more evasive when close. Deer and elk have sustained flights; fawns exhaust sooner. Moose are the longest, less agile challenge, but research favors vulnerable calves and the model is not age-specific. A coyote appears once among each eight starting leads and recurs in the later species rotation. Bear-versus-coyote capture is explicitly a game abstraction: the ecology evidence shows a competitor relationship, not a routine diet item. Retain an exhausted-prey gate and a committed, aligned land-animal pounce. Exact game chase timers and fatigue windows are recorded in `docs/hunting-behavior.md`; they are not presented as field measurements.

The river has a separate fishing action. Let the player wade into and out of the water with reduced speed and no sprint pounce. Salmon follow the modeled current/migration direction and flee when approached; a slow, close, deliberate strike in the river catches them. River logs drift downstream, remain visible and collide with the bear along the movement sweep. A log hit reduces percentage health, shows clear feedback and has no collision/damage effect on dry land. Use a finite recycled actor pool that follows the player's global river coordinates so the river hazards continue indefinitely without growing scene resources. Keep all other hazards and their existing damage outside the river.

## Technical approach

Extend `FoodKind`, scoring, localization and HUD tally from six to eight types. Expand procedural rigs for hare/coyote silhouettes and share geometry/material resources. Use per-species data rather than multiple duplicated pursuit implementations. Split driftwood simulation/collision into a small river-hazard field with deterministic recycled logs; derive log positions from `Terrain.riverX` and `waterY`. Extend player movement with water drag and an exposed wading state. Let the game loop distinguish a river fish strike from a land pounce and map log contact into the existing percentage-health rules.

## Research and validation

Use current peer-reviewed or wildlife-agency sources for deer, moose, rabbit/hare, coyote, and salmon behavior. Separate cited field facts from deliberately compressed gameplay timings; do not state a precise biological chase duration unless a source establishes one. Save citations with the species behavior notes. Add deterministic tests for all eight foods, each distinct pursuit/fishing requirement, river entry/drag, downstream log motion, swept collision and river-only log damage, plus retain coverage for land poison/trap/trench hazards. Run typecheck, the complete unit suite, production build and desktop/mobile browser smoke tests before creating the new PR from merged `main`.

## Project structure

- `src/game/config.ts`, `food.ts`, `models.ts`: new target data, procedural silhouettes, species-specific movement and hunt windows.
- `src/game/player.ts`, `terrain.ts`: river detection, wading speed and land safety.
- `src/game/river.ts`: continuously recycled visual driftwood and collision geometry.
- `src/game/game.ts`, `rules.ts`, `audio.ts`: fish strike, river hazard damage/feedback and health integration.
- `src/ui/ui.ts`, `minimap.ts`, `styles/main.css`, `src/i18n/en.json`: eight species, clear river/log warning and matching HUD.
- `tests/`, `scripts/smoke.mjs`: regression and new behavior coverage.
- `docs/research/` and `docs/hunting-behavior.md`: citations, ecological caveats and transparent gameplay timing choices.

## Delivery

Create a new feature branch from the already merged PR #3 commit on `main`. Commit the implementation and research to that branch and raise a new PR. Do not alter the merged PR.
