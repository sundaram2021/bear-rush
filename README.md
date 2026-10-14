# Bear Rush: Salmon Run

A fully 3D browser prototype: steer a hungry bear through a rushing forest river, eat salmon, and dodge fallen trunks. The river and fish speed up as the run continues. Start with three lives; each tree collision removes one life, the run continues while any remain, and game over occurs only at zero. There is no timer fail state.

The supplied bear-at-a-cascade photograph guides the setting and species, but is not used as a game background. The current prototype uses simple low-poly geometry for the bear, salmon, and fallen-log hazards. Final 3D models are **not complete**: the approved catalog-first model workflow cannot currently bind to this game project. Keep these as temporary prototype stand-ins, not final art.

## Run locally

```bash
pnpm install
pnpm dev -- --host 0.0.0.0 --port 3000
pnpm build     # TypeScript + Vite build + size checks
pnpm test      # unit tests
pnpm smoke     # after build; desktop/mobile browser flow and screenshots in shots/
```

Audio starts after the player begins a run because browsers require a user gesture to enable Web Audio.

## Controls and rules

- **Desktop:** `A` / `D` or left/right arrow keys to steer. `Esc` pauses; `Esc` from Pause resumes. The HUD pause control is also available.
- **Mobile:** drag the on-screen stick left or right.
- **Goal:** eat salmon to grow the fish count and score; missing fish has no penalty. Steer around fallen-tree obstacles.
- **Lives:** three per run. Every tree collision costs one life. A short recovery window prevents one collision from subtracting several lives. The run ends only after life three is lost.
- **Difficulty:** forward/current speed rises smoothly and caps; fish and hazard cadence also become more demanding while leaving safe routes.
- **Results:** fish eaten, score, distance, survival time, and a browser-local personal best.

## Privacy and saving

No login, sign-up, server, online leaderboard, or analytics. Settings and the personal best are stored only in this browser using local storage. They do not sync between devices and may be cleared if the player removes this browser's site data. The game keeps safe defaults if storage is unavailable.

## Sound

The prototype synthesizes sound with Web Audio: continuous rushing water, bear movement/eating/hit/game-over vocalizations, salmon-catching splash/score feedback, and tree impact/life-loss cues. Music/effect volume and mute are configurable; critical gameplay feedback is also visual.

## Code map

| Path | Responsibility |
| --- | --- |
| `src/game/game.ts` | Run lifecycle, spawns, fish pickup, collision/life transitions, audio and UI events. |
| `src/game/world.ts` | River, forest banks, rocks, lighting, and moving foam. |
| `src/game/player.ts` | Bear stand-in, lateral steering, run/hit animation. |
| `src/game/collectibles.ts` | Salmon pickup movement and contact collection. |
| `src/game/obstacles.ts` | Fallen-log patterns, motion, and collision window. |
| `src/game/rules.ts` | Pure scoring, speed curve, elapsed distance, recovery, and three-life rules. |
| `src/game/config.ts`, `src/game/tuning.ts` | Runtime defaults and the preserved development-only Tweak bridge. |
| `src/engine/audio.ts` | River ambience and synthesized game sound cues. |
| `src/engine/save.ts` | Versioned local settings and best-run record. |
| `src/engine/input.ts`, `src/ui/touch.ts` | Keyboard and touch steering. |
| `src/ui/`, `src/styles/main.css` | English-only menu, tutorial, HUD, pause, settings, results and touch interface. |
| `tests/`, `scripts/smoke.mjs` | Rules/save/tuning/obstacle tests and end-to-end browser verification. |

## Preview Tweak

`src/game/tuning.ts` remains the single game-owned parameter manager. The development-only adapter at `scripts/manus-tuning/adapter.js` registers its real controls; live values are consumed by gameplay, while next-run values activate in `Game.start`. The UI does not save Tweak overrides. Preserve this manager and its dev-only bridge when continuing the game.

## Current verification

- `pnpm typecheck`: passed.
- `pnpm test`: **34 tests passed**.
- `pnpm build`: passed; compressed JS/font/transfer size report is approximately **1.17 MB** total.
- `pnpm smoke`: passed for steering, fish scoring, pause/settings, three-life game over, local best saving, English-only browser behavior, and mobile HUD. Screenshots are under `shots/`.

## Credits

Bundled ManusCC0 fonts, including their supplied license notices, are retained. Runtime libraries: Three.js (MIT) and Rapier (Apache-2.0; kept in the starter dependency set).
