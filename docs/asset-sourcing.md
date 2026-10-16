# Wildlife 3D asset sourcing notes

**This review did not import or redistribute any third-party assets.** The current implementation uses code-authored Three.js geometry and procedural textures generated in-browser. This keeps the game self-contained and avoids unverified redistribution terms, but it is not photogrammetry or a substitute for production-grade rigged wildlife models.

## Sources checked

- [OpenGameArt — CC0 3D Animals / Creatures](https://opengameart.org/content/cc0-3d-animals-creatures): the collection lists deer, animated fish and a low-poly white bear among many unrelated assets. It does not provide the complete realistic bear/salmon/honey/deer/fawn/elk/moose set requested for this game.
- [Sketchfab — Grizzly Bear by freddy1231](https://sketchfab.com/3d-models/grizzly-bear-95baabcbc8634f6dace4376767a6024e): the page labels the downloadable model **Creative Commons Attribution 4.0 International (CC BY 4.0)**. This is one bear model only; the page did not establish a matching set of compatible, rigged prey and food models.
- [Sketchfab — Realistic Animals FULL PACK by WildMesh 3D](https://sketchfab.com/3d-models/realistic-animals-full-pack-c80459f995414cf3b7f17221b85d0684): the page describes the free model as a teaser for the creator's paid Ultimate 3D Animal Pack and does not state redistribution terms for the full pack. It was not used.

## Outcome

No paid or license-unclear model was added. The current branch keeps all generated scenery and wildlife local to the game code. If the target is literal real-world animal appearance, the next visual-art milestone is a complete, consistently licensed, rigged GLB set (bear, deer/fawn, elk, moose and salmon) plus production environment materials, with credits recorded before import.
