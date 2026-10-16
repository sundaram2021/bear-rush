# Bear Rush — Endless Mountain Hunt follow-up

## Goal

Extend the open mountain-hunt redesign PR into a more deliberate, believable third-person wildlife game. Fix the user-identified weaknesses: the bounded arena, abundant/easy prey and instant collection, an unconvincing bear run cycle, and no way to track distant wildlife. Keep this in the same browser game and open PR.

## Non-negotiable product constraints

- Entirely browser-local: no accounts, login, signup, backend saves, online leaderboard or telemetry. Retain localStorage-only preferences and best score.
- Food/targets remain salmon, honey, fawn, deer, elk and moose.
- The **only** life-loss hazards remain poisonous forage, a slip/fall into the trench, and bear traps.
- Do not add external or paid models/assets in this follow-up. Continue with the repository's local procedural source approach. Describe the result accurately as naturalistic procedural 3D—not photogrammetry or a completed AAA production asset set.
- Preserve the existing public PR branch and its tests/controls/settings.

## Requested redesign follow-up

### Unbounded streamed world

- Replace the single 250 m terrain slab and player-coordinate clamp with deterministic chunks generated from global world coordinates.
- Stream a bounded view radius around the player (terrain, river segment, forest/rocks/ground cover and local environmental effects); dispose distant chunks and their GPU resources.
- Make terrain, trench/safe-ground sampling, river, prey, hazard placement and map coordinates valid at any distance; no world edge or fixed reset loop.
- Use deterministic coordinate-derived seeds so neighboring chunk seams and repeated visits are stable. Do not recycle/teleport the player or make chunks visibly pop during normal movement.

### Wildlife tracking minimap

- Add a compact, north-oriented local map with player heading/position, landforms/river/trench and wildlife indicators.
- Make wildlife scarce and disclose sightings in a finite tracking radius. Show species and a last-known/track location rather than a perfect omniscient radar at all distances; age/fade trails as animals move or the scent signal expires. Use the minimap to guide the bear toward wildlife without making the hunt automatic.
- Track prey position in global coordinates so streaming or crossing chunk boundaries never breaks markers.

### Difficult pursuit-and-pounce hunting loop

- Prey begin wary/roaming rather than waiting for effortless contact; their detection/flight distance, alert cue and escape response vary by species.
- When aware, prey flee and use terrain/turns to gain distance. Track their stamina while pursued and allow recovery when the bear loses the chase.
- A pounce only succeeds inside a close, explicit vulnerable/exhausted window after a sustained chase; an early/missed pounce creates recovery time and gives prey another escape opportunity. Honey and salmon remain foraging/fishing interactions, not free contact points.
- Tune initial wildlife density and respawn pacing so the bear must read the map/tracks and travel to find prey, with no guaranteed animal standing beside the start. Keep scoring and the exact three hazard types unchanged.

### Bear locomotion and world feel

- Replace generic alternating leg swing with a speed-driven quadruped cycle (walk/trot/gallop), correctly paired fore/hind phases, shoulder/hip follow-through, footfall timing, torso bounce/roll, head counter-motion, acceleration/deceleration blend, pounce, turning and impact recovery.
- Align audible footfalls to gait contacts and select surface-aware steps. Sprint should cost stamina and have meaningful recovery rather than being held continuously without consequence.
- Improve biome diversity, continuous environmental dressing and atmospheric continuity while preserving performance in ordinary browsers.

## Validation / acceptance

1. Terrain/world are unbounded: safe and unsafe samples remain coherent at positive/negative coordinates across multiple chunk boundaries; player movement is not clamped; streamed chunks are deterministic and old chunk resources are released.
2. Minimap updates heading/player and fades stale animal tracks; wildlife outside detection remains undisclosed.
3. Healthy prey cannot be collected by a single close pass or immediate pounce; pursuit/exhaustion state and pounce success/failure are deterministic and species-sensitive.
4. Running phase transitions are bounded and gait/footfall frequency follows speed without limb phase aliasing.
5. Only poison, trap and trench fall can remove lives; six score targets, local-only storage and existing settings remain unchanged.
6. Typecheck, unit tests, production build and desktop/mobile smoke pass. Update README, TODO, tests and PR description to distinguish tested scope from art fidelity.
