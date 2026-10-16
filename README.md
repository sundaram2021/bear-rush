# Bear Rush: Endless Mountain Hunt

A third-person browser game about a grizzly ranging through mountain forest to forage and hunt. The previous fixed board is replaced by a **deterministically streamed landscape**: walk in any direction and new alpine terrain, forest, river, rocks and ground cover are generated around the bear while distant chunks are released. There is no coordinate boundary or world-reset loop.

## Run locally

```bash
pnpm install
pnpm dev -- --host 0.0.0.0 --port 3000
pnpm typecheck
pnpm test
pnpm build
pnpm smoke
```

The environment and wildlife use local procedural Three.js geometry, shared instanced scenery, locally created material textures, atmospheric lighting/fog, moving water and clear-to-snowing weather. It is a naturalistic procedural 3D prototype, **not a photogrammetry/AAA asset production**: rigged, production-quality wildlife models and a reviewed art set have not been added. Browser Web Audio creates forest ambience, bear sounds, gait-timed footsteps, pounce, forage and hazard effects after the first user gesture.

## Controls

| Platform | Controls |
|---|---|
| Desktop | WASD / arrow keys move; mouse looks while pointer-locked; Shift sprints; Space / E pounces; Esc / P pauses. |
| Touch | Left virtual stick moves; drag to look; Hunt pounces; Run sprints. |
| Gamepad | Left stick moves; the shared action map supports sprint, hunt and pause. |

The bear accelerates from a deliberate walk into a trot and gallop. The speed ceiling rises as the run continues; sprint briefly exceeds the current ceiling but drains a finite reserve, which recovers while released. Slope momentum reduces control. Footstep sounds are triggered from gait contacts and switch to a snowier step on snow-covered ground.

## Tracking and hunting

The north-oriented map shows the bear, heading, river/trench landmarks and recent wildlife/food tracks within a **168 m** local tracking radius. A marker is a last-known location, not a live omniscient target; it moves only when the bear gets another sighting and fades out after **24 seconds**. Map codes: S salmon, H honey, F fawn, D deer, E elk and M moose.

| Food | Base points |
|---|---:|
| Salmon | 120 |
| Honey | 180 |
| Fawn | 150 |
| Deer | 260 |
| Elk | 420 |
| Moose | 650 |

Wild animals are sparse, wary and species-specific. They notice the bear based on distance, wind-carried scent and movement noise, then flee with evasive turns. Keep up the chase to drain prey stamina; an animal can only be caught with a close, correctly timed pounce during its short exhaustion window. An early pounce misses, alerts the prey and gives it an escape opportunity. Sprinting continuously is not a reliable shortcut. Salmon follow the river; honey can be foraged on land. Successive food adds a short combo bonus.

## Dangers

**Only these three hazards can remove a life:** poisonous food, slipping from a mountain into the trench, and bear traps. The run starts with three lives and ends only when all are lost. Water, ordinary terrain, missed pounces and elapsed time do not remove lives.

## Privacy and settings

No login, sign-up, backend, online leaderboard or analytics. Settings and personal-best statistics stay in this browser's `localStorage` and do not sync across devices. If browser storage is disabled, the game remains playable for the current page session. Graphics quality, ambience/effects volume, mute and reduced camera shake are available in Settings.

## Code map

| Path | Responsibility |
|---|---|
| `src/game/terrain.ts` | Global heightfield, chunk mesh generation, river/trench sampling and safe footing. |
| `src/game/world.ts` | Seeded chunk streaming, local forest/rocks/ground cover, weather, snowfall and continuous river. |
| `src/game/player.ts` | Speed-responsive quadruped gait, sprint stamina, pounce, momentum and unbounded movement. |
| `src/game/food.ts` | Scarce wildlife, last-seen tracks, scent/noise alerting, pursuit fatigue and pounce eligibility. |
| `src/game/models.ts` | Bear, wildlife, salmon, honey, poisonous forage and trap geometry/materials. |
| `src/game/hazards.ts` | One-shot poisonous-food and bear-trap collisions. |
| `src/game/game.ts` | Hunt lifecycle, chunk-facing world updates, scoring, collisions and gait-aligned audio. |
| `src/ui/minimap.ts` | Local map rendering from shared world coordinates and aging tracks. |
| `src/engine/audio.ts` | Local forest/water ambience, running, hunting and hazard effects. |
| `src/engine/save.ts` | Browser-only settings and best-run schema/migration. |
| `tests/`, `scripts/smoke.mjs` | Rules, terrain seams, pursuit, gait/stamina, streaming and desktop/mobile browser checks. |

## Verification

The follow-up is covered by `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm smoke`. Unit and browser tests check global terrain/chunk continuity, distant streaming, limited/fading tracks, missed versus exhaustion-window pounces, gait/stamina behavior, the exact three dangers, local score persistence, settings and mobile controls.
