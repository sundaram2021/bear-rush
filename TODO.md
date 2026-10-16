# Bear Rush — photoreal art and predator-tuning update

## Completed gameplay changes

- [x] Added a quieter stalk pace: hold Ctrl on keyboard or use a light analog/touch-stick input. Sprinting and stalking cannot overlap.
- [x] Connected hunting advantage to wind. The map shows wind flow, the legend explains scent direction, stalking lowers detection, and wildlife alerts depend on noise/scent.
- [x] Made prey stamina drain only during an actively moving, close, correctly headed chase; stationary proximity or running past cannot exhaust an animal.
- [x] Tightened species-specific chase endurance and exhaustion windows. Healthy wildlife cannot be contact-caught; a successful hunt needs exhaustion, close range, a front-on approach and pounce momentum.
- [x] Made early/misaligned pounces miss, alert the animal, restore prey stamina and impose a 2.8-second recovery before another miss response.
- [x] Reduced sprint to a short reserve with slower recovery; added unit coverage for stalk input, facing/momentum, chase direction, pursuit, and recovery.
- [x] Preserved the merged endless world, finite/fading tracking, six foods, exactly three hazards, local-only saves, and desktop/touch/gamepad support.
- [x] Added locally bundled CC0 2K rocky-ground and snow diffuse/normal maps to the streamed terrain shader; runtime uses no third-party asset URLs.
- [x] Passed `pnpm typecheck`, `pnpm test` (55 tests), `pnpm build`, `pnpm smoke` (desktop/mobile), and `git diff --check`.
- [x] Recorded source/license and rejection notes in [`docs/art-sourcing.md`](docs/art-sourcing.md).

## Still required for the requested visual bar

- [ ] Replace the procedural bear, fawn, deer, elk, moose and salmon with genuinely photorealistic locally shipped models; each mammal needs usable quadruped locomotion animation.
- [ ] Replace the procedural close forest/rock dressing with optimized scanned 3D assets while retaining infinite chunk streaming. The verified free CC0 fir packages are 322–957 MB and 2–8 million triangles and are not suitable to ship raw.
- [ ] Implement local GLB loading, preloading/progress, animation state mapping, model scaling/orientation, resource disposal and explicit load-failure feedback.
- [ ] Recheck art and movement in the running game, update documentation and raise a **new PR** from merged `main`.

## Source/capability status

PR #2 is merged; this work is on `feat/photorealistic-wildlife-hunt`. Verified source checks found no free animal set satisfying both the requested visual quality and usable in-game animation. The latest user direction is **no AI model generation and no purchases for this pass**; use verified free/open sources only and report remaining role gaps. Do not call procedural stand-ins photorealistic or claim production-ready art until suitable assets are integrated and previewed.
