# Bear Rush — Follow-up status

## Implemented and verified

- [x] Removed the fixed world slab and player edge clamp. Global terrain, river/trench sampling, safe footing and seeded terrain/forest chunks work at distant positive and negative coordinates.
- [x] Streamed the 5×5 nearby chunk window as the bear travels and disposed distant terrain/water buffers; scenery instances and shared materials keep draw calls and assets bounded.
- [x] Added a north-oriented minimap with bear heading, river/trench landmarks, nearby species markers, a finite 168 m range and 24-second track fade.
- [x] Made prey cautious and difficult to catch: movement noise/wind-carried scent affect detection, species flee differently, stamina depletes only while pursued and a close pounce must land during a short exhaustion window. Early pounces miss and give prey a recovery/escape window.
- [x] Added short sprint stamina/recovery, a speed-responsive walk/trot/gallop gait, paired footfall timing, body/head response and sound events aligned to contacts.
- [x] Preserved six food types and scoring, exactly three life-loss hazards, desktop/touch/gamepad controls, and browser-local-only settings/best runs.
- [x] Added tests for far-world chunking/seams, distant safe terrain, track fading, early versus exhaustion-window pounces, gait/stamina and mobile/desktop browser flow.
- [x] Passed `pnpm typecheck`, `pnpm test` (48 tests), `pnpm build`, `pnpm smoke`, and `git diff --check` before commit.
- [x] Updated README and the same open pull request branch `feat/realistic-mountain-forest-hunt` / PR #2.

## Remaining visual limitation

This update improves world continuity, map usability, gameplay difficulty, and the bear's animation logic. It remains a procedural 3D build, not photogrammetry or a production wildlife-asset set. A literal photorealistic/AAA presentation still needs reviewed rigged bear, prey and environment art assets; no paid, unreviewed or license-unclear models were added.

## Product boundaries

- No logins, accounts, backend persistence, online features or analytics.
- The player can keep travelling; only the nearby scenery chunk window remains resident.
