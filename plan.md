# Bear Rush — health and hunt reliability update

## Goal

Continue the already-open PR #3 by removing the extra-life system, reliably revealing all six food species, and making a well-executed pounce capable of finishing winded prey. Preserve the endless mountain world and the existing stalking, wind, scent, sound and local-save systems.

## Product constraints

- Keep the game local-only: no account, sign-up, login, server, analytics, networked leaderboard or remote save. Game assets remain bundled locally.
- Health is a single 0–100% pool. Poison, traps and trench falls are the only damage sources. Health reaching 0 ends the run immediately; there are no hearts, spare lives, health resets or extra-life sounds.
- Keep all six food targets—salmon, honey, fawn, deer, elk and moose—discoverable in every new run. Seed the first local area with leads for every species, then rotate all species through later spawns.
- Preserve the endless seeded terrain, streaming chunks, nearby fading tracks, wind display, desktop/touch/gamepad controls, settings and browser-local records.
- Do not buy assets or generate AI models in this pass. Existing CC0 terrain/snow materials remain; procedural wildlife meshes remain a known visual limitation.

## Visual direction and art limits

Retain the existing field-documentary presentation: grounded alpine lighting, natural season and weather changes, restrained field-map HUD, and readable prey body-language cues. The terrain uses bundled 2K CC0 rocky-ground and snow maps, but the bear and wildlife remain procedural meshes. This does **not** meet a literal photorealistic model bar. The documented free candidates have practical limitations such as unavailable downloads, static/unrigged or low-detail models, known rig issues, or non-commercial terms. Do not describe the current animal art as photorealistic or production-grade. Keep source and licensing notes in `docs/art-sourcing.md`.

## Predator and prey behavior

- Preserve quiet stalk movement, wind-relative scent awareness, noise detection, species-specific stamina and flee speeds, and a close, sustained pursuit requirement.
- Keep early pounces and misaligned pounces as misses. A successful hunt requires a visibly exhausted animal, a committed moving pounce, proximity and a forward-facing approach.
- Resolve the pounce against the bear's swept movement segment to avoid frame-step misses when it passes through a prey actor. Expand the useful close-range window, provide a clear tired-prey cue, and play a brief capture reaction only after a successful catch.
- Use source-backed brown-bear behavior as a plausibility guide, while clearly treating chase duration and timing as game tuning rather than biological simulation. See `docs/hunting-behavior.md`.

## Health and dangers

- Display a percentage health label and meter with accessible current value and warning/critical states.
- Apply percent damage from poisonous food, bear traps and trench falls. Fall impact scales with speed and remains capped. A surviving hit briefly staggers the bear; it never spends a life or restores health.
- At 0% health, set the run to lost and show results immediately.

## Project structure

- `src/game/rules.ts`: run state, health damage, scoring and zero-health termination.
- `src/game/config.ts`: health, hazard, movement, prey and spawn tuning.
- `src/game/player.ts`: bear movement, stamina, stalk/sprint, pounce and capture response.
- `src/game/food.ts`: all-six-species spawning, tracks, awareness, stamina, pounce checks and capture cues.
- `src/game/game.ts`: run lifecycle, streamed world, damage, scoring and HUD state.
- `src/ui/ui.ts`, `src/styles/main.css`, `src/i18n/en.json`: percentage health HUD and exhausted-prey prompt.
- `tests/`, `scripts/smoke.mjs`: deterministic rules/food tests and desktop/mobile browser checks.
- `docs/art-sourcing.md` and `docs/hunting-behavior.md`: licensing/visual limits and cited behavior notes.

## Delivery

Keep the work on `feat/photorealistic-wildlife-hunt` and update the existing open PR #3 only. Validate the typecheck, unit tests, build and browser smoke tests before pushing. Report the remaining procedural wildlife-art limitation honestly.
