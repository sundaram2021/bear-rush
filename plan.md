# Bear Rush: Mountain Hunt — Design and Implementation Plan

## Product direction

This is a **free-roaming 3D wildlife hunting game**, not a lane runner or riverbank fishing loop. The
player controls a grizzly in a mountain valley and moves it in **all directions**: up and down
forested ridges, across a meandering salmon river, and around a deep crevasse. The mountain drifts
between clear and snowy conditions.

The bear hunts six foods — salmon, honey, fawns, deer, elk and moose. Roaming prey flee when the bear
closes in, so the player must chase, sprint or pounce. Exactly **three dangers** threaten the bear:
poisonous forage, steel bear traps, and slipping into the crevasse. Each removes one of **three lives**;
there is no time-based ending.

The bear's speed ceiling rises the longer it keeps hunting, up to a fair cap. Faster running reduces
steering authority on steep slopes, so the crevasse and traps become more dangerous as the run goes on.

## Art direction and design system

- **Design movement:** stylised natural-history illustration translated into a warm, readable 3D
  landscape. Geometry is procedural/faceted prototype art; final sourced models are still pending.
- **Core principles:** read the land, not lanes; place bear, prey and dangers with the same shared
  height/slope field; reward momentum while making it risky; keep the three threats visually distinct.
- **Layout:** broad third-person camera behind the bear, with near forest floor, a winding blue river,
  a rock-and-snow crevasse and fogged mountain rims receding into the distance.
- **Colour philosophy:** evergreen and moss anchor the valley; blue-green river carries motion; warm
  brown frames the bear; gold marks honey and score; luminous magenta warns of poison; rusted steel and
  a dark gash mark traps and the crevasse; the cream HUD stays legible.
- **Signature elements:** a grizzly that runs in any direction with a growing stride; separating
  wildlife; snow that settles on the high ground and tints sky, fog, light and trees; a three-heart life
  strip with score, caught count, distance, speed and weather.
- **Interaction:** W/A/S/D or the left stick to roam; Shift/SPRINT to accelerate; Space/E/POUNCE to lunge;
  drag to look. Mouse capture is optional and the camera eases behind the bear regardless.
- **Animation:** procedural leg stride scaled by speed, breathing, head bob, pounce reach, eat and hurt
  reactions, a periodic roar, drifting snowfall and animated river waves.
- **Typography:** bundled ManusCC0 display/body font and tabular HUD figures; no remote font loading.
- **Brand:** outdoorsy, alert and playful. Voice line: “Run the ridge. Hunt the herd. Fear the crevasse.”

## Scenes and player flow

1. **Mountain title:** animated valley with the bear; Play, Settings, browser-local best, privacy note
   and concise controls.
2. **Hunt encounter:** one continuous, bounded valley. Food and dangers spawn around the bear; the bear
   roams freely in every direction; speed builds while hunting.
3. **Danger response:** poisonous forage, bear traps and the crevasse each remove one life; the bear is
   dropped back on the last safe ground after a fall. Runs end only at zero of three lives.
4. **Weather:** a smooth clear/snow cycle repaints sky, fog, sun, foliage, terrain snow caps and a live
   particle snowfall.
5. **Pause/settings:** pause/resume, retry, return to title, wind/effects volume, mute, graphics quality
   and reduced motion.
6. **Results:** animals caught, score, distance, survival time, local personal best and Retry/Main Menu.

## Controls and accessibility

- **Desktop:** W/A/S/D or arrows roam; Shift sprints; Space/E pounces; Escape/P pauses; optional mouse swap.
- **Touch:** left stick roams; a held Sprint button and a Pounce button; drag to look.
- Show score, caught count, distance, speed, weather and lives. Use colour and silhouette to separate
  foods from the three dangers. Sound supplements rather than gates gameplay.

## Audio plan

Use the local Web Audio mixer after the player-gesture unlock. A quiet synthesised mountain-wind bed
plays under distinct footsteps, a bear roar, per-food eating cues (salmon/honey/meat) and separate
poison, trap, fall and life-loss cues. Mute and wind/effects volume settings plus visual feedback remain.

## Implementation architecture

- **Client:** TypeScript / Three.js / Vite static app; no backend, accounts or remote saves.
- **World:** a deterministic `Terrain` heightfield combining rolling fBm ground, ridged mountain rims, a
  carved river channel and a crevasse segment. The terrain mesh, water strip, instanced forest, rocks,
  weather tinting and snow particles are composed in `World`; gameplay samples the same `Terrain`.
- **Player:** `Player` accelerates in camera-relative directions, ramps speed via `rules.speedCap`,
  wades the river, slides on steep slopes and pounces. No lane constraint.
- **Food/hazards:** `FoodField` spawns and culls six food kinds that wander/flee; `HazardField` spawns
  poison and traps; the crevasse is detected from terrain depth and resolves as a fall.
- **Rules/persistence:** `rules.ts` handles score/combo, the speed cap, three lives and lose reasons.
  Settings and personal best stay English-only and browser-local.
- **Verification:** rules/terrain/tuning units plus a real-browser smoke test for roaming, proximity
  eating, the three dangers, end state, local best, English-only UI and touch controls.

## Current implementation status

The full redesign is implemented: a free-roaming 3D bear on a procedurally generated mountain valley
with river, forest, rocks, crevasse and a clear/snow weather cycle; six huntable foods with fleeing
behaviour; poisonous forage, bear traps and crevasse falls as the only three dangers; a rising speed
ceiling; third-person look/orbit camera; synthesised mountain wind, footsteps, roar and per-food /
per-danger cues; browser-local records; and new title/HUD/results/touch UI.

**Verification:** TypeScript passes, 37 unit tests pass, the production build passes the size budget,
and the desktop/mobile Playwright smoke passes.

## Asset-production boundary / remaining polish

World, bear, prey and danger geometry is procedural/stylised. Final catalog-sourced production models
(replacing the faceted grizzly, animals and props with richer art) are still pending; model generation
was not authorised for this pass.
