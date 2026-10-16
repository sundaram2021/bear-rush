# Bear Rush — photoreal art and predator-tuning update

## Completed gameplay changes

- [x] Added a quieter stalk pace: hold Ctrl on keyboard or use a light analog/touch-stick input. Sprinting and stalking cannot overlap.
- [x] Connected hunting advantage to wind. The map shows wind flow, the legend explains scent direction, stalking lowers detection, and wildlife alerts depend on noise/scent.
- [x] Made prey stamina drain only during an actively moving, close, correctly headed chase; stationary proximity or running past cannot exhaust an animal.
- [x] Tightened species-specific chase endurance and exhaustion windows. Healthy wildlife cannot be contact-caught; a successful hunt needs exhaustion, close range, a front-on approach and pounce momentum.
- [x] Made early/misaligned pounces miss, alert the animal, restore prey stamina and impose a 2.8-second recovery before another miss response.
- [x] Reduced sprint to a short reserve with slower recovery; added unit coverage for stalk input, facing/momentum, chase direction, pursuit, and recovery.
- [x] Added a 100% health meter. Poison removes 36 points, traps 44, and falls remove 42 plus speed-based damage up to 68; a life is lost only when health reaches zero. Surviving a lost heart returns at 60%, without passive regeneration.
- [x] Made the same two ground hazards spawn ahead within 20–44 m every 5.2–8.6 seconds, increasing density by up to 18% over three minutes. Trench falls remain terrain-based; no fourth hazard was added.
- [x] Preserved the merged endless world, finite/fading tracking, six foods, exactly three hazards, local-only saves, and desktop/touch/gamepad support.
- [x] Added locally bundled CC0 2K rocky-ground and snow diffuse/normal maps to the streamed terrain shader; runtime uses no third-party asset URLs.
- [x] Passed `pnpm typecheck`, `pnpm test` (56 tests), `pnpm build`, `pnpm smoke` (desktop/mobile, actual poison collision and cumulative life thresholds), and `git diff --check`.
- [x] Recorded source/license and rejection notes in [`docs/art-sourcing.md`](docs/art-sourcing.md).
- [x] Applied this follow-up to the user's recently opened PR #3 only; no second PR will be created.

## Still required for the requested visual bar

- [ ] Replace the procedural bear, fawn, deer, elk, moose and salmon with genuinely photorealistic locally shipped models; each mammal needs usable quadruped locomotion animation.
- [ ] Replace the procedural close forest/rock dressing with optimized scanned 3D assets while retaining infinite chunk streaming. The verified free CC0 fir packages are 322–957 MB and 2–8 million triangles and are not suitable to ship raw.
- [ ] Implement local GLB loading, preloading/progress, animation state mapping, model scaling/orientation, resource disposal and explicit load-failure feedback.
- [ ] Revisit wildlife-model candidates and rigging, preview any imported model in the running game, and clearly report which art gaps remain. Do not overstate photorealism.

## Source/capability status

PR #2 is merged; PR #3 is open on `feat/photorealistic-wildlife-hunt`. The latest user direction is **no AI model generation and no new PR**; continue on PR #3 only. Several CC BY/CC0 candidates are legally reusable with attribution; the current research documents technical fit, not a blanket ban. The official WildMesh free-download action currently prompts for Sketchfab sign-in, so its file has not been downloaded. Use viable free/open models when legitimately obtained and when their animation/runtime fit is verified. Do not call procedural stand-ins photorealistic or claim production-ready wildlife art until suitable models are integrated and previewed.
