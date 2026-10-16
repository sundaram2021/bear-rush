# Bear Rush: Mountain Hunt — Design and Implementation Plan

## Product direction

Redesign the existing browser game into a **third-person, free-roaming 3D wildlife hunt**. The player controls a bear moving through a believable mountain forest in every direction. The valley has changing terrain, ridges, a river with salmon, forest clearings, and weather that cycles between clear and snow. This should read as a cohesive real-world game environment, not a lane runner, flat backdrop, or collection of visibly primitive stand-ins.

The bear earns points by finding and hunting **salmon, honey, deer, fawns, moose, and elk**. Deer-family prey flee and can be chased; salmon are found in/near the river; honey is a forage target. The only threats are **poisonous food, slipping off a mountain into a trench, and bear traps**. Runs begin with three lives and end only when they are gone. The bear's attainable running speed increases over time, making steering on steep ground harder and increasing the risk of a slip or mistake.

No accounts, logins, sign-ups, backend, online saves, or analytics. Settings and personal bests remain in browser `localStorage` only.

## Visual and interaction direction

- **Visual goal:** grounded, naturalistic wildlife-game realism, using full 3D terrain, coherent scale, physically plausible materials, forest depth, atmospheric perspective, and weather-integrated lighting. Use detailed, rounded animal anatomy and species-specific silhouettes rather than simple geometric placeholders; avoid flat photographic backgrounds.
- **World:** a continuous mountain-forest valley with forest floor, slopes, ridgelines, rock faces, stream and riverbank, a clearly readable trench, ground cover, and distant mountain layers. Snow accumulates naturally on higher ground and during snow periods; clear weather returns without changing the gameplay rules.
- **Readability:** player, edible targets, the three hazards, and safe routes must remain visible and distinct at gameplay distance. Use natural palettes; reserve unmistakable warning contrast and small HUD accents for danger and score.
- **Camera:** low, over-the-shoulder third-person camera following the bear; mouse/touch orbit/look is optional, with smoothing that preserves orientation and framing.
- **Bear movement:** camera-relative walk/run/sprint, jump/pounce, slope-aware footing and momentum. Leg stride, body weight, head motion and impact recovery respond to speed and state.
- **Interface:** restrained field-gear HUD over the world: three lives, score, foods collected, distance/time, speed and current weather. Title, pause/settings, and end-of-run summary remain fully playable on desktop and mobile. Reduce-motion, mute and volume controls remain available.
- **Audio:** start after a player gesture. Provide running/footsteps that respond to speed and surface, bear movement/hunt/eating reactions, salmon/forage cues, wind/forest/running-water ambience, snow/wind changes, and separate poison/trap/fall cues. Sound supplements visible feedback and never gates play.
- **Data/privacy:** keep settings and best-run score in `localStorage`. No authentication or network-backed gameplay data.

## Gameplay and scoring

| Target | Type | Behaviour | Score |
|---|---|---|---|
| Salmon | Food | Swims in river reaches; bear can pursue and pounce/catch near the water | 120 |
| Honey | Food | Visible forage/hive target in forest clearings | 180 |
| Fawn | Prey | Flees as the bear approaches | 150 |
| Deer | Prey | Flees and can be chased | 260 |
| Elk | Prey | Flees; tougher/larger silhouette | 420 |
| Moose | Prey | Flees; largest/highest-value target | 650 |

These are the only scoring target categories. Food collection, score feedback, and prey movement are driven by the same world terrain coordinates. Hazards never award points.

**Only the following three hazards exist:**
1. Poisonous food/forage: contact causes one life loss.
2. Mountain slip/fall: running too fast across a steep/unsafe edge can slide into the trench and cost one life, then recover at safe ground while lives remain.
3. Bear trap: contact causes one life loss and triggers a short trap/recovery reaction.

No other obstacle, timer, missed-food penalty, collision type or hazard can remove a life. There is no time-based game-over.

## Implementation architecture

- **Client:** existing TypeScript, Three.js and Vite static app. Preserve the current build, input, save, settings, test, and smoke-test infrastructure; no backend.
- **World/terrain:** replace the river-lane world with a seeded mountain valley generated from a continuous height/slope field. The same terrain sampler supplies player footing, prey, salmon reaches, forests, hazards, snow masks and trench/fall checks. Use procedural color/bump textures, layered terrain materials and atmospheric depth rather than background art.
- **Weather:** smoothly blend clear and snowy states across sky, fog, light, ground snow coverage, tree materials and snowfall. Weather is visual/ambient and does not introduce extra danger types.
- **Player:** replace the bank controller with a camera-relative free-roam bear controller. Ramp the speed ceiling over run time up to a defined fair cap. Add slope/momentum sliding, pounce/hunt actions, recovery, grounded movement and speed-responsive animation/audio.
- **Food/prey:** implement distinct food records, species, point values, spawn constraints and flee/chase behaviour. Salmon use water locations; honey uses forest clearings; deer/fawns/elk/moose roam valid terrain and flee. The six listed food categories are the complete score set.
- **Hazards:** poisonous forage and bear traps spawn on valid land; the trench is part of the terrain field. Centralize one-life damage, invulnerability/recovery and reset-to-safe-ground so a single contact cannot repeatedly drain lives.
- **Rules/save:** pure rule functions cover points, speed ramp, three lives, each allowed loss reason, run-end rules and best-run storage. Keep all save reads/writes local to this browser.
- **Audio:** expand the existing browser-safe Web Audio engine with low continuous forest/wind/river ambience and distinct, speed-scaled footstep and hunt/hazard cues. Preserve mute/volume settings and gesture-based unlock.
- **UI/localization:** update game text, title, tutorial, HUD, settings and results to match mountain hunting; expose weather/speed/score/foods/lives and controls; keep English content and accessible labels in sync.
- **Project structure:** `src/game/terrain.ts` samples/generates mountain geometry; `src/game/world.ts` composes terrain, forest, river, trench and weather; `src/game/player.ts` controls/animates the bear; `src/game/food.ts` owns the six score targets; `src/game/hazards.ts` owns poison/traps; `src/game/game.ts` owns lifecycle, spawning/collision orchestration; `src/game/rules.ts` owns score/speed/life rules; `src/engine/audio.ts` owns sound; `src/engine/save.ts` owns local persistence; `src/ui/`, `src/styles/`, and `src/i18n/en.json` own controls/presentation; `tests/` and `scripts/smoke.mjs` verify rules and play flow.

## Scope boundary

Build toward the user's requested realistic 3D presentation through scene scale, terrain depth, lighting, materials, naturalistic anatomy, animation, weather and sound. Keep the world self-contained in the browser and preserve an acceptable interactive framerate on ordinary desktop/mobile hardware. This branch's wildlife and scenery remain procedurally modeled; they are not photogrammetry or production-grade downloaded/generated GLB assets. See [`docs/asset-sourcing.md`](docs/asset-sourcing.md). Do not add online features, unrelated hazards, or services.

## Progress

The former riverbank fishing loop has been replaced by the free-roaming mountain hunt, six score targets, exactly three damage sources, a rising speed cap, browser-local records, responsive touch/keyboard/gamepad input, changing snow, and generated browser audio. The implementation and affected checks have been validated with TypeScript, 41 unit tests, production bundling, and desktop/mobile Playwright smoke runs.

**Visual-fidelity limitation:** procedural 3D textures and smooth animal geometry are implemented, but literal real-world animal likeness still needs a complete compatible, licensed, rigged wildlife asset set; the asset review records why no paid or unclear models were included.
