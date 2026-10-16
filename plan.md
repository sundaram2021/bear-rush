# Bear Rush — photoreal wildlife and pursuit update

## Goal

Build on the merged endless-world hunt and replace its procedural stand-in characters and scenery with genuinely high-detail, photorealistic wildlife and environment art. Make the predator loop require a quiet approach, sustained pursuit and a brief, well-timed pounce rather than an easy speed advantage. Deliver this as a new pull request from the merged main branch.

## Product constraints

- Preserve the local-only game: no sign-up, login, server, analytics, networked leaderboard or remote save. Runtime game assets must ship with the game rather than depend on third-party URLs.
- Keep the six food targets—salmon, honey, fawn, deer, elk and moose—and exactly three life-loss causes: poisonous food, slipping into the trench, and bear traps.
- Preserve the endless seeded terrain, nearby minimap/tracks, desktop/touch/gamepad controls, settings and browser-local records.
- Follow the user's latest direction for this pass: **do not generate AI models and do not purchase assets.** Use freely redistributable CC0/CC BY assets, with required attribution. CC BY is not a blocker; technically imperfect candidates should be tested for static/distant use or repair instead of being categorically rejected. Keep CC BY-NC assets out unless the project is explicitly non-commercial; report paid/unclear-rights roles.
- Do not use procedural geometry as the visible bear, prey, salmon or major environment art. Procedural code may remain for terrain topology, placement, seasonal blending and small incidental effects.

## Visual direction

**Design movement:** field-documentary wildlife simulation with natural camera optics and grounded alpine lighting. The interface should feel like restrained field equipment, not a fantasy combat HUD.

- **Core principles:** believable anatomy and scale; physically based surface response; cohesive daylight/weather; readable wildlife cues without gamey omniscience.
- **Color philosophy:** snow-cool sky and shadow, forest greens and bark neutrals, with subdued warm sun; reserve saturated colors for poison/trap warnings and essential UI.
- **Layout paradigm:** let the landscape and third-person camera dominate; keep map, compass, stamina and species clues as compact peripheral instruments.
- **Signature elements:** detailed coat/skin/scale response; soft atmospheric depth and grounded contact shadows; subtle field-map markers that age instead of tracking animals live.
- **Interaction and animation:** low-noise stalking creates a deliberate approach; short sprint bursts have weight and recovery; prey expresses alertness, exertion and exhaustion through animation and audio rather than a large floating health bar. Pounces must have anticipation, airborne travel, contact and recovery phases.
- **Typography and identity:** retain the existing condensed field-label hierarchy and warm paper/cream accents against dark forest glass. Brand essence: a patient alpine predator hunt; observant, physical, untamed. Keep the existing Bear Rush wordmark and signature amber field accent.

## Art and runtime architecture

- Source individual GLB/glTF assets for the grizzly, fawn, deer, elk, moose and salmon, plus the environment roles needed for close camera views. Check redistribution rights, maps, scale/origin, animation and file size. An unrigged or older-rig CC BY asset is still eligible for static/distant use or repair; do not confuse that technical limitation with a licensing prohibition. Record author, source, license and attribution for every imported asset.
- Load local models through the existing Three.js application with an asynchronous asset registry, explicit preload progress, compatible color-space/material handling and a visible load failure rather than an online fetch or a claimed-success procedural substitute. Keep textures with their model and paths stable under `assets/`.
- Replace the procedural `AnimalRig` consumers with GLTF scene/animation bindings. Use `AnimationMixer` and in-place locomotion clips for idle, walk, trot/run, alert, tired/exhausted, pounce/attack and recovery where the source rig provides them. Keep world movement and collision ownership in gameplay code; imported clips must not accumulate root motion.
- Use reviewed scanned/PBR environment assets for camera-close trunks, ground cover, rock, snow and river banks; preserve the streamed 5×5 chunk window, stable global coordinates and disposal of distant GPU resources. Share materials and instances, use justified texture sizes and keep lower graphics presets viable.
- Preserve the existing ACES tone mapping and local scene renderer while improving physically based materials, environment lighting, shadow contact, terrain texture scale and weather transitions. Avoid a static photo backdrop: the landscape must remain navigable and coherent as chunks stream.

## Predator and prey tuning

- Let the player deliberately stalk: slow analog input and a dedicated desktop stalk action reduce noise and walking pace; sprinting raises alert/noise and drains a limited reserve with a longer recovery. Approach relative to wind instead of running straight to the marker.
- Give fawn, deer, elk and moose distinct detection thresholds, burst speed, endurance, turning response and recovery. A healthy animal should not be caught by contact or one early pounce. Exhaustion must require a sustained chase that remains close enough to count; losing the trail should let the animal recover and leave.
- Use a short species-sensitive vulnerable window, close-range facing/momentum test and meaningful pounce cooldown/recovery. A miss alerts the prey and prevents immediate repeated attempts; a successful hunt consumes it once. Convey state through imported body language, breath and sound cues.
- Keep fish/honey foraging distinct from pursuit scoring; retain score values and the three permitted life-loss rules.

## Health and danger progression

- Show a player-health percentage beside the existing three-heart reserve. Poison removes 36 points, traps 44, and trench falls remove 42 plus two points per m/s, capped at 68.
- At 0% health, spend one heart; if a heart remains, resume at 60% health. Do not regenerate health passively. Fall impact grows with speed, and injury briefly staggers the bear.
- Keep only poison, bear traps and the terrain trench as damage sources. Spawn visible poison/traps ahead at a fair distance, increase their frequency gradually as the run continues, and leave room to dodge.

## Project structure

- `assets/models/` and `assets/textures/`: locally bundled models, maps and sidecars with provenance/attribution files.
- `src/game/assets.ts`: typed asset manifest, local GLTF preload, animation-name mapping, loading progress and failure reporting.
- `src/game/models.ts`: remaining non-character props/material adapters; no prominent procedural animal stand-ins.
- `src/game/player.ts`: bear movement, stamina, stalk/sprint and imported bear animation state.
- `src/game/food.ts`: wildlife actors, track publication, species behavior and imported prey mixers.
- `src/game/world.ts` / `terrain.ts`: streamed landscape, PBR environment dressing and continuous global sampling.
- `src/engine/input.ts`, `src/ui/`, `src/i18n/en.json`: stalk control, tuning feedback, local map and English guidance.
- `tests/`, `scripts/smoke.mjs`: deterministic gameplay/source-load coverage and browser acceptance.

## Delivery

Keep implementation on `feat/photorealistic-wildlife-hunt`, based on merged `main`. Commit these changes to the already-open PR #3 only; do not create another pull request. Describe which assets were actually integrated and the remaining fidelity limits; do not call the wildlife photorealistic unless imported assets visibly meet that bar in the running scene.
