# Bear Rush — Redesign status

## Implemented

- Replaced the riverbank/lane-runner loop with a free-roaming third-person mountain-forest hunt.
- Added continuous alpine terrain, sloped ridges, a salmon river, a carved trench, trees, shrubs, rocks, ground cover, atmospheric depth, and a changing clear/snowy weather cycle.
- Added the bear and six score targets: salmon (120), honey (180), fawn (150), deer (260), elk (420), and moose (650). Prey flee, salmon follow the water and pounce/hunt collects targets.
- Restricted life-loss sources to exactly three: poisonous forage, trench fall/slip, and bear traps.
- Added an increasing speed ceiling, sprint, slope momentum, hunt/pounce, recovery and safe-ground respawn.
- Added generated running/footstep, ambience, hunting, food and hazard sounds; accessible desktop, touch and gamepad controls; English HUD, settings and results.
- Kept settings and personal-best records in browser-local storage only. No login, account, backend, online leaderboard or analytics.
- Added procedural color/bump textures for terrain, bark, foliage, rocks and fur; kept assets local to the game code.
- Verified with `pnpm typecheck`, 41 unit tests, `pnpm build`, and the desktop/mobile `pnpm smoke` suite.

## Remaining to reach literal real-world fidelity

The game is a functioning procedural 3D redesign, but its animal and scenery meshes are not photogrammetry or production-grade wildlife models. A genuinely lifelike result still requires a complete, compatible, rigged and redistributable set for bear, deer/fawn, elk, moose and salmon, plus production environment materials. The available source checks and why no paid or license-unclear models were added are recorded in [`docs/asset-sourcing.md`](docs/asset-sourcing.md).
