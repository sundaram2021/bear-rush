# Bear Rush: Mountain Hunt

A third-person browser game about a grizzly ranging through a mountain forest to forage and hunt. The world is a continuous, explorable Three.js valley: a winding salmon river, rolling forest floor, rising alpine ridges, a carved trench, rock outcrops and ground cover. Weather shifts between clear and snowy; snow, sky, fog, foliage and snowfall respond together. This is a full 3D world, not a lane runner or a flat image background.

## Run locally

```bash
pnpm install
pnpm dev -- --host 0.0.0.0 --port 3000
pnpm typecheck
pnpm test
pnpm build
pnpm smoke
```

The scene and wildlife are built from smooth, detailed, procedurally textured 3D geometry in the browser. The animal silhouettes, terrain and lighting are naturalistic, but this revision does not contain photogrammetry or downloaded/generated GLB wildlife models. Web Audio generates a local wind-and-water ambience, bear sounds, steps, pounce, food and danger cues after the first user gesture.

## Controls

| Platform | Controls |
|---|---|
| Desktop | WASD / arrow keys move; mouse looks while pointer-locked; Shift sprints; Space / E pounces; Esc / P pauses. |
| Touch | Left virtual stick moves; drag to look; Hunt pounces; Run sprints. |
| Gamepad | Left stick moves; the shared action map supports sprint, hunt and pause. |

The bear is free to roam across the mountain terrain. Close in and pounce to collect prey or food. The maximum running speed grows from its initial pace with time in the wild and levels out at 16 m/s; sprint can push the bear faster. Steep slopes add momentum and reduce control, making a trench fall more likely.

## Food, scoring and dangers

| Food | Base points |
|---|---:|
| Salmon | 120 |
| Honey | 180 |
| Fawn | 150 |
| Deer | 260 |
| Elk | 420 |
| Moose | 650 |

A short collection combo multiplies successive food values. Deer, fawns, elk and moose flee when the bear closes in; salmon follow the river; honey is found on land. The HUD and results screen show each food count.

**Only three dangers can remove a life:** poisonous food, slipping from a mountain into the trench, and bear traps. The run starts with three lives and ends only when all are lost. Each collision removes one life and consumes the discrete hazard; fall, trap and poison feedback are distinct and also visible. Missed food, time and ordinary terrain never remove a life.

## Privacy and settings

No login, sign-up, backend, online leaderboard or analytics. Settings and personal-best statistics stay in `localStorage` on this browser and do not sync across devices. If browser storage is disabled, the game remains playable for the current page session. Graphics quality, ambience/effects volume, mute and reduced camera shake are available in Settings.

## Code map

| Path | Responsibility |
|---|---|
| `src/game/terrain.ts` | Shared terrain sampler, alpine heightfield, slopes, river and trench checks. |
| `src/game/world.ts` | Three.js mountain scene, forest, river, weather, snow and lighting. |
| `src/game/models.ts` | Bear, regional wildlife, salmon, honey, poison and trap geometry/materials. |
| `src/game/player.ts` | Camera-relative bear movement, speed ramp, pounce, slope sliding and recovery. |
| `src/game/food.ts` | Six food targets, prey flight, salmon movement and collection. |
| `src/game/hazards.ts` | One-shot poisonous food and bear-trap collisions. |
| `src/game/game.ts` | Hunt lifecycle, spawning, collisions, audio and HUD events. |
| `src/game/rules.ts` | Six score categories, combo, the three life-loss reasons and speed ceiling. |
| `src/engine/audio.ts` | Locally synthesized forest/water ambience and game sounds. |
| `src/engine/save.ts` | Browser-only settings and best-run schema/migration. |
| `src/engine/input.ts`, `src/ui/touch.ts` | Keyboard, mouse, gamepad, movement-stick, look and touch actions. |
| `src/ui/`, `src/styles/main.css`, `src/i18n/en.json` | English title, field HUD, settings, tutorial and results. |
| `tests/`, `scripts/smoke.mjs` | Rules, terrain, food, dangers and desktop/mobile browser smoke tests. |

## Verification

Run `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm smoke`. The browser smoke suite checks desktop movement/speed progression, pounce scoring, the three danger outcomes, local best persistence, pause/settings and mobile movement/actions.
