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
The terrain now also bundles local **CC0 2K PBR diffuse and normal maps** for rocky ground and snow from Poly Haven; runtime rendering does not fetch them from a third party. This improves the landscape surface only—the bear and wildlife remain procedural and do not yet meet a photoreal wildlife-art bar. See [`docs/art-sourcing.md`](docs/art-sourcing.md) for evaluated sources and the remaining model gap.

## Controls

| Platform | Controls |
|---|---|
| Desktop | WASD / arrow keys move; mouse looks while pointer-locked; Shift sprints; Space / E pounces; Esc / P pauses. |
| Touch | Left virtual stick moves; drag to look; Hunt pounces; Run sprints. |
| Gamepad | Left stick moves; the shared action map supports sprint, hunt and pause. |

The bear accelerates from a deliberate walk into a trot and gallop. The speed ceiling rises as the run continues. Hold **Ctrl** to stalk at a slower, quieter pace; on touch, use a light movement-stick input. Wind and movement noise affect how soon prey notices. Sprint is a short burst, its reserve takes meaningful time to recover, and slope momentum reduces control. Footstep sounds follow gait contacts and change on snow.

## Tracking and hunting

The north-oriented map shows the bear, heading, river/trench landmarks, fresh or fading wildlife tracks, and bars for downstream driftwood within a **168 m** local tracking radius. A wildlife marker is a last-known location, not a live omniscient target; it updates on another sighting and fades after **24 seconds**. Map codes: S salmon, H honey, R rabbit, C coyote, F fawn, D deer, E elk and M moose. Amber bars mark river logs.

| Food | Base points |
|---|---:|
| Salmon | 120 |
| Honey | 180 |
| Rabbit | 170 |
| Coyote | 240 |
| Fawn | 150 |
| Deer | 260 |
| Elk | 420 |
| Moose | 650 |

Each hunt seeds all eight target types as visible local leads; later spawns rotate through the set. Hares pause briefly at detection and then burst in a relatively straight line, turning sharply only when the bear closes; ungulates have longer species-specific endurance, and coyotes have a separate wary escape profile. Effective continuous-pursuit times to exhaustion are **3.36 s** (rabbit), **4.16 s** (fawn), **6.72 s** (deer), **8.16 s** (elk), **9.76 s** (moose), and **10.56 s** (coyote), if the bear stays close and faces the chase. These are compressed gameplay timers, not observed field chase averages; the [research note](docs/hunting-behavior.md) records the short pounce windows and evidence limits. Alertness responds to range, wind-carried scent and movement noise. The map's wind arrow shows scent flow; approach from the opposite, upwind direction. A healthy animal cannot be contact-caught: close in on winded prey and use an aligned moving pounce. Contact is checked along the bear's movement to reduce near-misses. A miss restores some prey stamina and creates a brief chance to re-engage.

Salmon travel upstream until a nearby bear spooks them downstream. The bear can wade into the river, where movement is slower and sprint-pouncing is disabled; stalking into close range and pressing Hunt makes a separate fish strike. Large visible logs flow with the modeled downstream current, are marked on the tracking map, and can hurt the bear **only while it is in the river**. Bear–coyote predation is not a routine real-world grizzly behavior, so coyotes are included as the requested exceptional competitor-challenge target; that chase is a game abstraction, not prey guidance.

## Dangers

The three original **land** hazards remain poisonous forage (36 health points), bear traps (44), and trench falls (42 base plus running-speed damage, capped at 68). While in the river only, a collision with floating driftwood removes 22 points. Logs do not hurt the bear on land. Health is one percentage pool; 0% ends the run, without hearts, extra lives, resets or passive regeneration. Poison and traps appear in a visible forward arc roughly 20–44 m ahead on dry land; falls remain speed-sensitive. Wading itself, regular terrain, missed pounces and elapsed time cause no damage.

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
| `src/game/river.ts` | Bounded, downstream-moving driftwood pool and sweep-tested water collisions. |
| `src/game/game.ts` | Hunt lifecycle, chunk-facing world updates, scoring, collisions and gait-aligned audio. |
| `src/ui/minimap.ts` | Local map rendering from shared world coordinates and aging tracks. |
| `src/engine/audio.ts` | Local forest/water ambience, running, hunting and hazard effects. |
| `src/engine/save.ts` | Browser-only settings and best-run schema/migration. |
| `tests/`, `scripts/smoke.mjs` | Rules, terrain seams, pursuit, gait/stamina, streaming and desktop/mobile browser checks. |

## Verification

The follow-up is covered by `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm smoke`. Tests check terrain streaming, all eight initial food leads, species-differentiated pursuit, tired prey pounces, river wading, deliberate salmon strikes, drifting/swept logs and river-only log damage, the three existing land hazards, zero-health game over, local saves, and desktop/mobile controls.
