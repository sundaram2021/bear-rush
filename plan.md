# Bear Rush: Salmon Run — Revised Design and Implementation Plan

## Product direction

This is a **3D wildlife fishing game**, not an auto-running lane/car race. The bear stands and wades along a natural riverbank, watches fish travel down the stream, and actively swipes/pounces when a salmon leaps within reach. A successful catch requires a deliberate timed Catch input; fish missed while passing are harmless. The current and fish become faster as the run continues, to a fair cap.

The play space is a continuous, layered forest river. Water bends from side to side and rises/falls with the terrain. Small wood blocks and harmful algae are carried along the same changing water path; they follow its curves, flow speed and elevation rather than appearing on a straight road-like track.

Each run starts with **three lives** and has no time-based ending. Every **two separate small-block collisions** remove one life; the partial block count resets after the pair. One harmful algae contact removes one life immediately. Each physical hazard registers only once. Game over occurs only at zero lives. Fish, score, distance/survival and best run are stored only in the local browser; no account, login, sign-up, online leaderboard, analytics or server is used.

The supplied bear-at-a-cascade photograph guides the bear's stance, fish leap, water energy and forest mood; it is not used as a background image.

## Art direction and design system

- **Design movement:** cinematic natural-history illustration translated into a warm, readable stylized 3D game world. The current visual prototype uses faceted geometry; final production character/environment models remain pending.
- **Core principles:** read the river, not lanes; move wildlife and hazards using the same 3D river curve; make catching active and satisfying; explain risk without ambiguity.
- **Color philosophy:** deep evergreen and moss anchor the forest; blue-green water carries motion; warm brown frames the bear; salmon coral marks good catches; luminous algae green warns of danger; the cream HUD stays legible.
- **Layout:** broad three-quarter view with the bear on the near bank and a winding forest stream receding into the valley. The 3D view includes near/far banks, rocks, ferns, layered trees, distant ridges, fog and a cascade. Keep bear, leap zone and approaching hazards readable; use a quiet corner HUD.
- **Signature elements:** salmon leap arcs with a timed catch window; water/foam ribbons on the winding current; a three-heart life strip plus a separate wood `0/2` strike indicator; prominent Catch button that brightens when fish is in reach.
- **Interaction:** the bear hunts instead of sprinting. A/D or arrows/left touch stick adjust footing along the bank; Space/E or the touch Catch button performs a paw swipe. A late/early swipe misses harmlessly.
- **Animation:** procedural water waves and drifting foam, tree sway, salmon swim/leap/tail motion, river-aligned floating hazards, bear idle/breathing, paw swipe and hit pose. Camera motion and effects should remain restrained and honor reduced-motion preferences.
- **Typography:** bundled ManusCC0 display/body font and tabular HUD figures; no remote font loading.
- **Brand:** outdoorsy, alert and playful. Voice line: “Watch the water. Snatch the leap. Leave the algae.” Retain the paw-and-river favicon and use salmon coral `#ef8050` for catches/key actions.

## Scenes and player flow

1. **Forest river title:** animated view of the bear at the bank; Play, Settings, browser-local best, privacy note and concise controls.
2. **Fishing encounter:** one continuous valley scene; no race lanes, auto-forward bear or timer fail state. Fish swim downstream and leap into Catch range. The current/fish pace rises smoothly to a cap.
3. **Hazard response:** small wood drifts with current; each contact adds a strike and the second costs one life/resetting the meter. Harmful algae is distinct from fish and removes a life immediately. Missed fish are harmless; play continues until all three lives are gone.
4. **Pause/settings:** pause/resume, retry, return to title, water/effects volume, mute, graphics quality and reduced motion.
5. **Results:** fish eaten, score, survival time/distance, local personal best and Retry/Main Menu.

## Controls and accessibility

- **Desktop:** A/D or Left/Right walk along the shore; Space or E performs Catch; Escape/P pauses.
- **Touch:** left virtual stick walks the bank; large Catch button performs the timed swipe.
- Show catch readiness visually; display fish count, score, current pace, lives and block meter. Use color/symbol distinctions for algae vs. salmon. Sound supplements rather than gates gameplay.

## Audio plan

Use the existing local Web Audio mixer after player-gesture unlock. Keep the rushing stream/waterfall bed quiet. Successful catches combine a short splash and bear catch/eating vocalization; missed swipes, wood contact, algae contact and life loss have distinct synthesized cues. Preserve mute, water/effects volume settings and visual feedback.

## Implementation architecture

- **Client:** existing TypeScript/Three.js/Vite static app; no backend, accounts or remote saves.
- **World:** procedural layered valley meshes and a shared meandering river sample (`riverPoint`, `riverTangent`, water elevation) consumed by river surface, banks, foam, fish and hazards. Tree/rock/fern details reuse geometry/materials; water and foliage animate.
- **Player/fish:** bear moves within bank bounds and animates an explicit Catch pulse; salmon swim along the current and become collectible only during a visible leap window and successful Catch action.
- **Hazards/rules:** small wood and harmful algae replace large trunk blockers. One-time collision removal is independent per hazard. `rules.ts` handles three lives, two-block pairing, immediate algae damage, scoring and capped speed.
- **UI/persistence:** English-only browser-local settings and personal best; title/tutorial/HUD/results explain new controls and exact damage rules.
- **Verification:** rule/unit tests plus real-browser smoke tests cover explicit catches, bank movement, river-aligned hazards, life accounting, local saving and touch controls.

## Current implementation status

The bank-side active-catch loop and procedural forest river are implemented. Fish require a player-timed Catch action; current/fish speed rises and caps. River surface, banks, foam, trees, salmon and hazards share curved/undulating river sampling. Hazards are small drifting wood and algae; two distinct wood hits cost one life, algae costs one life, and runs end only at zero of three lives. The quiet local water bed, separate synthesized catch/bear/hazard cues, visible Catch feedback, touch control, browser-local records, and updated title/tutorial/HUD are in place.

**Verification passed:** TypeScript, 36 unit tests, production build (about 1.18 MB reported transfer-size bundle including bundled fonts), and desktop/mobile Playwright smoke tests for movement, catch, wood/algae damage and three-life end state.

## Asset-production boundary / remaining polish

The saved Blueprint selected Hybrid/catalog-first sourcing. Bear, fish, tree and river asset searches returned a **project-unbound** access error; that does not prove the catalog is empty. The gameplay/world rework did not authorize new generated models, so no model generation was attempted. Current faceted bear/fish/environment geometry remains prototype art; final catalog-sourced production models and additional art polish are still pending.
