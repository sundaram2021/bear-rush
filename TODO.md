# Bear Rush — health and hunt reliability update

## Requested gameplay outcomes

- [x] Remove the extra-life/heart model. Runs begin at 100% health; poisonous food, bear traps and trench falls reduce the single health pool; reaching 0% ends the hunt without resetting health or continuing with spare lives.
- [x] Ensure salmon, honey, fawn, deer, elk and moose are all seeded as local leads on a new run. Rotate the six species through later spawn opportunities.
- [x] Preserve stalk, wind/noise awareness, species-specific stamina and pursuit. Allow an exhausted animal to be caught by a committed close pounce, including a pounce that sweeps across it between frames; reject an early or misaligned pounce.
- [x] Show the hunt-ready cue for nearby exhausted prey and play a brief bear capture reaction only after a successful takedown.
- [x] Keep the endless world, minimap, local-only saves and exactly three damage sources.
- [x] Passed `pnpm typecheck`, `pnpm test` (58 tests), `pnpm build`, and `pnpm smoke` (desktop/mobile), reviewed the diff, and pushed the update to the existing PR #3.

## Visual quality still below the requested bar

- [ ] Replace the procedural bear, fawn, deer, elk, moose and salmon with suitable locally bundled photorealistic models and validated animations. Current wildlife meshes are procedural and are not photorealistic.
- [ ] Replace procedural close forest/rock dressing with optimized scanned assets while preserving streamed infinite-world performance. Existing CC0 fir-tree packages are too large to ship unoptimized.
- [ ] Add model loading, animation mapping, scale/orientation validation, GPU-resource disposal, and explicit load-failure handling when suitable assets are legitimately available.

## Source and delivery constraints

- PR #2 is merged. PR #3 remains open on `feat/photorealistic-wildlife-hunt`; commit only these changes to that PR.
- Do not purchase assets or generate AI models in this pass. Use only verified freely redistributable assets if any are integrated later, retaining author/source/license/attribution records.
- `docs/art-sourcing.md` documents candidate availability, licensing and technical fit. `docs/hunting-behavior.md` cites the behavioral sources and distinguishes compressed game timing from biological reality.
