# Bear Rush: Salmon Hunt

A fully 3D browser wildlife game set in a forest valley. The bear stands on a riverbank and actively hunts salmon: fish swim downstream and leap into a short catch window; press a button at the right moment to swipe. Fish missed on a pass do not cost a life. The stream bends and rises/falls through the forest while current and fish speed gradually increase to a cap.

The supplied bear-at-a-cascade photograph guides the mood and hunting scene, but is not a literal game background. The bear, fish, trees and environment still use prototype low-poly/procedural geometry. Final catalog-sourced 3D models are **not complete**: catalog access for the existing project returned a project-unbound error. No new generated models were created.

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

- **Desktop:** A/D or Left/Right adjust footing toward/away from the water; W/S or Up/Down walk along the bank. Space or E swipes to catch a leaping fish. Escape/P pauses.
- **Mobile:** use the left virtual stick to adjust the bear's footing and tap the large **Catch** button to swipe.
- **Catch:** a deliberate, well-timed swipe is required when a salmon leaps within reach. Successful catches add fish and score; missed fish or a mistimed swipe cost no lives.
- **Wood:** small floating blocks follow the winding river. Every distinct block contact adds one strike; the second strike removes one life and resets the 0/2 counter.
- **Harmful algae:** one contact/eating event immediately removes one life. Algae is visually distinct from salmon.
- **Lives:** start with three. There is no timer-based game over. The run ends only after the third life is lost.
- **Difficulty:** river/fish pace rises smoothly and caps. Distance, survival time and local best are shown in the HUD/results.

## Privacy and audio

No login, sign-up, server, online leaderboard, or analytics. Settings and personal best are stored only in this browser's local storage; they do not sync across devices. The game uses a quiet continuous rushing-water bed plus separate synthesized catch/bear, block-contact, algae and life-loss cues. Mute and water/effects volume controls are available. Visual cues are also provided so sound is never required to understand play.

## Code map

| Path | Responsibility |
|---|---|
| `src/game/game.ts` | Fishing-run lifecycle, timed catch action, hazard spawning/contact, audio and UI hooks. |
| `src/game/world.ts` | Layered forest, curved/undulating river path, banks, rocks, foam and foliage animation. |
| `src/game/player.ts` | Bank-side bear placement, movement and catch/hit animation. |
| `src/game/collectibles.ts` | Salmon downstream swimming, leap timing and explicit catch window. |
| `src/game/obstacles.ts` | River-following small wood and algae, one-shot collision reporting. |
| `src/game/rules.ts` | Fish score, current curve, three lives, two-block rule and immediate algae damage. |
| `src/game/config.ts`, `src/game/tuning.ts` | Gameplay defaults and the preserved development-only Tweak bridge. |
| `src/engine/audio.ts` | Quiet river ambience and synthesized catch, bear, block and algae sounds. |
| `src/engine/save.ts` | Browser-local settings and personal-best record. |
| `src/engine/input.ts`, `src/ui/touch.ts` | Keyboard/gamepad movement, Catch and touch controls. |
| `src/ui/`, `src/styles/main.css`, `src/i18n/en.json` | English title/tutorial, fish/score/lives/wood HUD, touch control, settings and results. |
| `tests/`, `scripts/smoke.mjs` | Rules, river-following hazards, tuning and real browser verification. |

## Current verification

- `pnpm typecheck`: passed.
- `pnpm test`: passed, 36 tests.
- `pnpm build`: passed, approx. 1.18 MB compressed JS/font/transfer-size report.
- `pnpm smoke`: passed, desktop/mobile check for bank movement, deliberate fish catch, two separate wood strikes, algae damage, three-life end state, local best and English-only UI.

## Credits

Bundled ManusCC0 fonts and their license notices are retained. Runtime libraries: Three.js (MIT) and Rapier (Apache-2.0; retained in the starter dependency set).
