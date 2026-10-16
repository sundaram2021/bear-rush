# Bear Rush: Mountain Hunt

A free-roaming, fully 3D browser wildlife game. You are a grizzly in a snowy-or-clear mountain
valley. Run — or sprint — in **any** direction across a heightfield of forested ridges, a winding
salmon river and a deep crevasse, hunting six kinds of food and surviving exactly three dangers.

The world, bear, prey and hazards are procedural 3D geometry, not photographic assets. They read as
stylised natural-history models rather than photoreal scans; final catalog-sourced production models
remain pending (catalog access returned a project-unbound error in the original project).

## Run locally

```bash
pnpm install
pnpm dev -- --host 0.0.0.0 --port 3000
pnpm typecheck
pnpm test
pnpm build     # TypeScript + Vite production build + size checks
pnpm smoke     # desktop/mobile Playwright checks; saves screenshots in shots/
```

Sound starts after the player's first gesture because browsers require an interaction to enable Web Audio.

## Controls and rules

- **Desktop:** W/A/S/D or arrows move the bear in every camera-relative direction. Shift sprints.
  Space/E pounces (a forward lunge that closes ground on fleeing prey). Drag the mouse (click the
  world to capture it) to look around; the camera also eases behind the bear as it runs. Escape/P pauses.
- **Mobile:** left virtual stick moves the bear, **SPRINT** is held and **POUNCE** is tapped; drag the
  right side of the screen to look.
- **Speed ramp:** the bear's speed ceiling rises the longer it keeps hunting, up to a cap. The faster
  it runs, the less it can steer on steep ground, so it is more likely to slip into the crevasse or
  blunder into a trap.
- **Food (points):** salmon (river), honey, fawn, deer, elk, moose — 120 to 650 points each, multiplied
  by a rising combo. Fawns, deer, elk and moose flee when the bear closes in, so chase them down.
- **Only three dangers, each costs one life:** poisonous forage, steel bear traps, and slipping into the
  crevasse. Runs start with three lives and end only when they are gone; there is no timer failure.
- **Weather:** the valley drifts between clear summer and heavy snowfall over time. Snow changes the
  sky, fog, light, snow caps, foliage and a live particle snowfall.

## Privacy and audio

No login, sign-up, server, online leaderboard or analytics. Settings and the local personal best are
stored only in this browser's local storage; they never sync across devices. Audio is a locally
synthesised mountain-wind bed plus separate footsteps, roar, per-food eating cues and distinct poison,
trap and fall cues. Mute and wind/effects volume controls are available. Colour, shape and on-screen
labels mean sound is never required to understand play.

## Code map

| Path | Responsibility |
|---|---|
| `src/game/game.ts` | Hunt lifecycle, spawning, camera, hazard resolution, audio and UI hooks. |
| `src/game/world.ts` | Mountain valley scene: terrain mesh, river, forest, rocks, weather, snowfall, lighting. |
| `src/game/terrain.ts` | Deterministic height/slope/river/trench sampling and terrain + water meshes. |
| `src/game/noise.ts` | Value noise, fBm, ridged noise and seeded RNG used to build the world. |
| `src/game/player.ts` | Free-roaming bear: camera-relative movement, slope slide, stamina, pounce, animation. |
| `src/game/food.ts` | Salmon, honey, fawn, deer, elk and moose — models, wandering and fleeing. |
| `src/game/hazards.ts` | Poisonous forage and steel bear traps (the crevasse is terrain-driven). |
| `src/game/rules.ts` | Score/combo, speed ramp, three lives and lose reasons. |
| `src/game/config.ts`, `src/game/tuning.ts` | Gameplay defaults and the preserved development-only Tweak bridge. |
| `src/engine/audio.ts` | Mountain-wind ambience and synthesised hunt/hazard sounds. |
| `src/engine/save.ts` | Browser-local settings and personal-best record. |
| `src/engine/input.ts`, `src/ui/touch.ts` | Keyboard/gamepad movement + pounce/sprint and touch controls. |
| `src/ui/`, `src/styles/main.css`, `src/i18n/en.json` | English title/tutorial, hunt HUD, touch controls, settings and results. |
| `tests/`, `scripts/smoke.mjs` | Rules, terrain and tuning units plus real-browser verification. |

## Credits

Bundled ManusCC0 fonts and their license notices are retained. Runtime libraries: Three.js (MIT) and
Rapier (Apache-2.0; retained in the starter dependency set).
