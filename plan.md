# Bear Rush: Salmon Run — Design and Implementation Plan

## Product and visual direction

A fully 3D browser endless river runner inspired by the supplied bear-at-a-cascade photograph. The bear advances through a forest river channel, hunts salmon for score, and dodges fallen trunks and branches. Each run begins with **three lives**: each tree collision costs exactly one, play continues while lives remain, and only the third lost life ends the run. Fish/current speed rises smoothly with run time to a cap. There is no timer-based game over.

- **Theme:** lively salmon migration through a wild river gorge; determined but friendly bear.
- **Color system:** deep evergreen and river-stone neutrals, cool teal water, warm bear-brown, salmon orange collection cues, cream interface text.
- **Visual direction:** simplified stylized naturalism. Keep the river corridor, collectible fish, and collidable logs distinguishable at runner speed; scenery trees/rocks are non-collidable decoration.
- **Camera/layout:** elevated third-person chase view down a clear river corridor; bear occupies the lower play area, with enough sightline ahead for fish and tree hazards. HUD remains in the corners with the three-paw life row always clear.
- **Signature details:** salmon-orange catch feedback, a paw-and-river icon, water/foam streaks, three lives, concise hit flash and brief recovery.
- **Motion:** bear running gait and lane lean, animated fish, scrolling river details, smooth camera follow, brief hit response, reduced-shake accessibility option.
- **Interface voice:** short, warm, energetic (“Eat fish. Dodge trunks. Keep the run alive.”). English is the only shipped language; no browser-language switching.
- **Privacy:** no account, login, sign-up, server, analytics, or online leaderboard. Settings and personal best are kept in browser-local storage.

The photograph is a visual guide to the animals and river setting, not a game background or a substitute for gameplay assets.

## Core workflow and rules

1. **Title/tutorial:** show the river, Play and Settings, controls, local-best score, and the three-life rule.
2. **Start:** initialize fish/score/distance and display three full lives; unlock Web Audio from the user's start gesture.
3. **Run:** the bear automatically advances; keyboard or touch steers left/right. Fish travel through the river channel and are collected on contact.
4. **Score:** a catch increments fish eaten and score, shows visual feedback, and plays splash/eating plus a pleased bear sound. Missing fish costs nothing.
5. **Escalate:** river/current speed and fish pace increase smoothly with elapsed time, following a bounded curve; obstacle cadence also tightens while safe routes remain.
6. **Tree hit:** each fallen-tree collision removes one life and plays a concise wooden/water impact, bear hit vocalization, and life-loss cue. Add hit animation, UI feedback, and brief invulnerability so one contact cannot subtract multiple lives.
7. **Continue or finish:** continue after hits one and two. At zero lives only, stop the run and show fish eaten, score, distance/survival time, local best, and Retry/Main Menu.
8. **Save locally:** keep settings and the best run in this browser only; survive unavailable/corrupt storage by using safe defaults.

## Controls and accessibility

- **Desktop:** A/D or left/right arrows steer; Escape pauses/resumes. A visible HUD pause control is available.
- **Mobile:** drag a virtual stick to steer left/right.
- Provide mute/volume controls; never rely on sound alone for lives, catches, or collisions. Honor reduced-motion preference for camera shake. Provide readable UI across desktop and phone layouts.

## Audio plan

Use short Web Audio-generated cues in the current prototype: loopable rushing-water ambience; bear movement grunts/snorts, pleased catch cue, hurt vocalization, and final reaction; fish splash/eat feedback; wood/log impact and distinct life-loss cue. Keep ambience under the important events and expose mute/volume settings.

## Technical implementation

- **Client:** TypeScript, Three.js, Vite; static browser app, no backend.
- **Simulation:** fixed-step loop. Pure rules in `src/game/rules.ts`; lane steering and bear motion in `player.ts`; river/forest scene in `world.ts`; fish and obstacles in their own modules; `game.ts` orchestrates spawns, collision, audio, scoring, and screens.
- **Persistence:** versioned `localStorage` settings and personal-best record; browser-local only.
- **Quality:** capped difficulty, safe-lane spawning, local effects, keyboard/touch inputs, responsive interface.
- **Development controls:** preserve the starter's game-owned Tweak manager and development-only bridge; only expose parameters with live gameplay consumers.

## 3D asset production status

The saved game-production choice is **Hybrid**: catalog-first sourcing, then the approved text-to-3D recipe for genuine gaps. Catalog requests currently report that the game project is not bound to the catalog service, and the refreshed project receipt did not provide a usable asset-runtime location. Because this is an access/binding problem—not proof that the catalog is empty—no final bear, salmon, or log model was generated or claimed. The playable Preview therefore uses **temporary low-poly procedural stand-ins** for those roles. Resume the approved asset workflow when project-to-catalog binding and the supported asset runtime are available; keep the stand-ins labeled as prototype-only.

## Project structure

| Path | Responsibility |
|---|---|
| `src/game/game.ts` | Run loop, spawn pacing, fish rewards, collision/life transitions, audio/UI events. |
| `src/game/world.ts` | River, bank scenery, lighting, foam motion. |
| `src/game/player.ts` | Bear prototype controller and movement/recovery animation. |
| `src/game/collectibles.ts` | Salmon motion, catch range, reset. |
| `src/game/obstacles.ts` | Fallen-log patterns and collision checks. |
| `src/game/rules.ts` | Pure score, speed curve, distance, recovery, and three-life rules. |
| `src/game/config.ts`, `src/game/tuning.ts` | Gameplay defaults and development Tweak manager. |
| `src/engine/audio.ts`, `save.ts`, `input.ts` | Sound, local-only records/settings, input abstraction. |
| `src/ui/`, `src/styles/main.css`, `src/i18n/en.json` | English-only screens, HUD, touch, settings and results. |
| `tests/`, `scripts/smoke.mjs` | Unit and browser checks for the actual runner flow. |

## Current implementation and verification

- Implemented the 3D river runner loop, fish scoring, rising/capped pace, tree hits, three lives, recovery window, audio events, browser-local personal best/settings, English-only UI, desktop/mobile controls, pause/settings/results, and Retry.
- **Verified:** TypeScript build; **34 unit tests**; production Vite build; Playwright desktop/mobile smoke covering steering, fish scoring, pause/settings, all three lives, local-best save, and English-only behavior. The browser returned HTTP 200 for the live Preview and its favicon.
- **Not final art:** character/collectible/hazard models remain simple procedural prototype forms pending the approved Hybrid sourcing workflow.

## Future workflow

1. Restore project-to-catalog binding and the current asset runtime.
2. Search the catalog for bear, salmon, and fallen-log models; adapt any suitable published assets.
3. Only for confirmed gaps, use the saved Hybrid text-to-3D settings; preload and validate scale, pivot, orientation, textures and animations, then register assets.
4. Recheck the same game flow, mobile performance, audio mix, collision fairness and local save behavior.
5. Prepare share metadata/artwork and a managed checkpoint only when the authorized asset/checkpoint workflow is available. Publication is separate and is not requested here.
