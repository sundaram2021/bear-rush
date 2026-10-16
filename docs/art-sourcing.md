# Art sourcing and use notes

## What is and is not blocked

The earlier assessment was too absolute: **CC BY and CC0 assets are not prohibited.** CC BY assets can be redistributed and used commercially when the required attribution is included. “Not rigged,” “old rig,” “high polygon count,” or “not photoreal enough” are technical/quality limitations, not license bans. Some candidates below are usable as-is for static art or could be adapted; they are simply not proven drop-in animated wildlife.

## Wildlife candidates

- **Bear — [WildMesh's Realistic Animated Bear](https://sketchfab.com/3d-models/realistic-animated-bear-3d-model-bffc3c87d2d148ff8533e1cc8a11c9f1):** CC BY; the creator page allows commercial use and modification and reports about 7.5k triangles. The author also flags an older model with known rigging problems. This is **not a legal blocker**. The official free-download button currently opens a Sketchfab sign-in prompt; no account was created and the asset was not downloaded. Once legitimately obtained, it should be tested before deciding whether its rig/animation can be repaired or retargeted. Triangle count alone does not make it unusable.
- **Bear — [3Dima's Grizzly Bear](https://sketchfab.com/3d-models/realistic-grizzly-bear-game-ready-asset-4657008bf6004ede9ff8e1f66e0df91f):** CC BY, texture-embedded GLB, about 11.7k triangles, but the creator describes it as static with no locomotion rig. It can legally be used as a static model or an animation/rigging base. It is not a drop-in replacement for the animated player bear.
- **Fawn — [RenderHub's scanned spotted fawn](https://www.renderhub.com/polygonal-miniatures/fawn):** the listing describes a scanned model with 4K diffuse/normal maps, but it is unrigged and unanimated. Redistribution terms and a free downloadable package were not confirmed in the earlier check; do not copy it into the repository until those rights are verified.
- **Deer — [Realistic White-tailed Deer](https://sketchfab.com/3d-models/realistic-whitetailed-deer-free-commercial-use-d8192bb6909042a0b8ba08774358a8f1):** CC BY and GLB. The creator calls it low-poly and says rigging is planned, not included. It may still be used for a distant/static representation or as a rigging base with attribution; it does not meet the close-up animated realism goal out of the box. The CC0 [Deer Rigger 2](https://blendswap.com/blend/27151) is also low-poly and supplied as a Blender project.
- **Elk — [WildMesh's Realistic Animated Elk](https://sketchfab.com/3d-models/realistic-animated-elk-3d-model-787834f9caa2474d9f1814b807c072d7):** CC BY; the creator reports an older rig with known issues and about 7.9k triangles. The license is not a blocker. Its animation, materials and rig should be inspected in the game before deciding whether repair is worthwhile.
- **Moose — [WildMesh's animated moose demo](https://sketchfab.com/3d-models/moose-realistic-3d-model-demo-free-0ee3d3f1e02746c89d6a5754dfd2ee67):** CC BY-NC. It is not universally unusable: attribution and non-commercial-use limits apply, and it cannot be used in a commercial release without broader permission. Keep it out unless the project is explicitly restricted to non-commercial distribution or the creator grants broader rights.
- **Salmon — [CGTrader's animated swimming salmon](https://www.cgtrader.com/3d-models/animal/fish/animated-and-rigged-swimming-salmon-fish):** the model cited in the prior research is paid. We will not acquire or redistribute it without a valid license. A paid listing is a real blocker under the current no-purchase workflow, unlike the CC BY candidates above.

## Alpine environment

- [Rocky Terrain 02](https://polyhaven.com/a/rocky_terrain_02) and [Snow 02](https://polyhaven.com/a/snow_02) are CC0. Their 2K diffuse and OpenGL-normal maps are already bundled under `public/assets/textures/`; they require no attribution and load locally, not from third-party URLs.
- [Fir Tree 01](https://polyhaven.com/a/fir_tree_01) and [Fir Sapling Medium](https://polyhaven.com/a/fir_sapling_medium) are also CC0. Their cited 4K packages are about 956.57 MB / 8 million triangles and 322.85 MB / 2 million triangles, respectively. Those raw packages are poor browser payloads, but that is an optimization problem, not a licensing prohibition. Decimation, LODs and texture compression could make a suitable version.

## Current integration state

Only the four CC0 terrain/snow texture files above are presently integrated. The wildlife meshes remain procedural. The previous pass treated “not production-ready out of the box” as “cannot use”; that was an overly strict choice and should not be repeated. Any adopted model still needs a complete local license/attribution entry plus validation of its scale, orientation, materials, animation and download/runtime size.

No AI model generation or purchase is part of the current pass. The non-commercial and unclear-rights cases stay excluded unless their terms are resolved; freely redistributable CC BY/CC0 candidates remain eligible for use or adaptation.
