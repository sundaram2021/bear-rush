# Photoreal art sourcing notes

**Decision:** use only clearly redistributable, commercially usable art. The requested hybrid route allows free/open models first and AI-generated models for remaining gaps. Animal models need a convincing photoreal appearance and a usable locomotion path; for a moving hunting game, static assets alone are not a production-quality replacement. None of the near-misses below is included in the game.

## Wildlife: no qualifying replacement found

- **Bear:** [WildMesh's Realistic Animated Bear](https://sketchfab.com/3d-models/realistic-animated-bear-3d-model-bffc3c87d2d148ff8533e1cc8a11c9f1) is CC BY and the creator allows commercial use and modification, but the creator calls it outdated with known rigging problems; the page reports 7.5k triangles. [3Dima's Grizzly Bear](https://sketchfab.com/3d-models/realistic-grizzly-bear-game-ready-asset-4657008bf6004ede9ff8e1f66e0df91f) is a CC BY, texture-embedded GLB of about 11.7k triangles, but it is explicitly a static mesh with no locomotion rig.
- **Fawn:** [RenderHub's scanned spotted fawn](https://www.renderhub.com/polygonal-miniatures/fawn) has 4K diffuse/normal maps and import formats, but the creator page marks it unrigged and unanimated. Free rigged alternatives did not establish both realistic spotted appearance and redistributable web-game delivery.
- **Deer:** [Sketchfab's Realistic Whitetailed Deer](https://sketchfab.com/3d-models/realistic-whitetailed-deer-free-commercial-use-d8192bb6909042a0b8ba08774358a8f1) is CC BY and GLB, but the creator describes a low-poly model and says rigging is only planned. The available CC0 [Deer Rigger 2](https://blendswap.com/blend/27151) is also explicitly low-poly and distributed as a Blender file.
- **Elk:** [WildMesh's Realistic Animated Elk](https://sketchfab.com/3d-models/realistic-animated-elk-3d-model-787834f9caa2474d9f1814b807c072d7) is CC BY, but the creator reports an older version with known rigging problems and only 7.9k triangles; the page does not establish a suitable locomotion package or high-resolution PBR maps.
- **Moose:** [WildMesh's animated moose demo](https://sketchfab.com/3d-models/moose-realistic-3d-model-demo-free-0ee3d3f1e02746c89d6a5754dfd2ee67) is CC BY-NC, which excludes commercial use. The technically stronger alternatives found were paid or had unclear licensing, so none is included.
- **Salmon:** the closest photoreal, rigged swimming model found is a paid [CGTrader asset](https://www.cgtrader.com/3d-models/animal/fish/animated-and-rigged-swimming-salmon-fish). Publicly downloadable CC BY salmon options did not establish the required realistic PBR appearance and swim animation.

## Alpine environment: verified CC0 components

- [Rocky Terrain 02](https://polyhaven.com/a/rocky_terrain_02) provides diffuse, normal, roughness, displacement and other PBR maps. Its 2K texture set can be used on the existing streamed terrain mesh.
- [Snow 02](https://polyhaven.com/a/snow_02) provides diffuse, normal, roughness, displacement and translucency maps suitable for seasonal blending over the same terrain.
- [Fir Tree 01](https://polyhaven.com/a/fir_tree_01) has detailed bark and needle foliage and is CC0, but its official page reports 8 million triangles and a 956.57 MB 4K download. [Fir Sapling Medium](https://polyhaven.com/a/fir_sapling_medium) is also CC0 but reports 2 million triangles and a 322.85 MB 4K download. Neither tree package should be shipped raw to the browser; it needs LOD/geometry reduction before adoption.

The game bundles 2K diffuse and OpenGL-normal maps for Rocky Terrain 02 and Snow 02 under `public/assets/textures/`; only these four texture files were adopted. Poly Haven states that its models and textures are CC0, may be used commercially, modified and redistributed, and require no attribution. The game does not fetch any material from third-party URLs at runtime.

## Generation status

No AI-generated wildlife model has been integrated yet. The animal role gaps remain open until a generation path can be validated for this Three.js project and the resulting models can be checked for usable animation, scale, orientation, material quality and runtime size. Do not describe the procedural animals as photorealistic.
