# World V2 — Art-direction continuity contract\n> **2026-11-08 direction refinement (D166):** This document describes the **implemented 2026-11-08 technical art-parity baseline**, not the final visual target. The user wants a significant quality upgrade: painterly, lush Ghibli-leaning environments with sharply rendered, dynamic Solo Leveling-feeling anime heroes and combat effects. Implement an original coherent hybrid, not copied IP assets or shots. Preserve and reuse functional shaders where useful, but modernize or replace visual techniques that fail the new target. See [Phase 2.5 look-development and gameplay convergence](WORLD_V2_PHASE2_5_GAMEPLAY_INTEGRATION.md). Current screenshots are **not** proof of beautiful final art.\n

**Status:** Implementation in [PR #8](https://github.com/blooprocket-create/APlus/pull/8). Applies to all geography, biome, shoreline and eventual Hearthmere restaging work. The staged atlas is still provisional geography and is **not** approved as final canon.

## Functional baseline: the existing game, not the debugging lab (not the new quality target)

The original game's painted anime/cel-shaded visual language is already implemented in these existing modules:

- `src/rendering/AnimeMaterials.ts`: stepped anime lighting, illustrated highlight/shadow decisions and silhouette ink on characters.
- `src/rendering/HearthmereScenery.ts`: watercolor/wash-inflected terrain, illustrated sky and world cutaway; the existing ground palette and staged hand-constructed environment.
- `src/rendering/HearthmereRefuge.ts` + `ArtMesh.ts`: **sculpted loft/smoothLoft trees, detailed branching crowns and painted palettes**, not cone stacks or other standalone primitive art.
- `src/rendering/PaintedMeadow.ts` + `SceneryMotion.ts`: brushed grass and flowers with wind/actor interaction shaders.
- `src/rendering/EnvironmentBuilder.ts`: established ambient, key sun, shadow settings and cinematic rendering characteristics.
- `src/rendering/CharacterMeshBuilder.ts`: the real hero rigs, attire and animation visual language.

**Phase 2 baseline:** New V2 content reused those functional art systems to restore visual continuity. **New D166 direction:** reuse/extract them where helpful, but do not preserve old shader or mesh quality at the expense of the upgraded original anime art target. A temporary standalone demo shader, grey primitive tree or default Lambert placeholder is *not* an acceptable production substitute.

## How the current integration restores continuity

1. `src/rendering/PaintedWorldStyle.ts` now owns the **exact original** Hearthmere ground paper wash, painterly sky and focus cutaway, extracted from `HearthmereScenery.ts`. Both the existing world and V2 import the same code; global-origin uniforms preserve material details while streaming far from the origin. The existing opening retains the same default sky radius, focus behavior and colors.
2. Original `EnvironmentBuilder.initBaseLighting` delegates to the same world-lighting helper that V2 uses, preserving ambient, color temperature and soft-shadow constants. The lab uses the original painted sky and a slightly longer fog range appropriate to broader atlas views.
3. The V2 terrain reads biome/road data from the offline compiler but maps those classifications to the *existing* Hearthmere foliage, grass, plaster, clay, stone and road colors, with world-space color wash and the shared painter material.
4. The V2 scenery renderer now uses the original **`ArtMesh.loft`, `smoothLoft`, `beam`, `piece`, and `bakePieces`** tools and the Hearthmere refuge's asymmetrical tree-crown grammar. It batches whole sculpted tree/rock/shrub shapes into `InstancedMesh` groups per cell. The older generic cone/sphere templates are no longer used for this scene.
5. The actual `PaintedMeadow.addPaintedMeadow` is reused with sampled ground heights rather than replacing grass with flat quads or particles. The existing Hearthmere call path is unchanged because the height argument is optional and defaults to its previous value.
6. The V2 sea uses the exact original `PAINTED_WATER_PALETTE` with the painted-flow/stroke shader vocabulary from Hearthmere's river. It remains continuous and origin-safe; physical water simulation remains a later feature.
7. The exploration lab represents the player with a real `CharacterRig('warrior')`, not the old orange geometry test cone. Review screenshots deliberately hide the player and UI to assess world composition alone.

## Visual-review gate: always compare against actual Hearthmere

The `npm run test:browser` workflow captures the actual `hearthmere-warrior.png` image from the unchanged playable entrypoint. The subsequent `npm run test:visual` workflow embeds this image in the new World V2 offline review gallery as the **art reference**, alongside all eleven predetermined world shots. Cameras and content are not identical, so this is a **visual-language comparison**, not a pixel-diff claim.

CI checks that the screenshot-rendered World V2 lab declares `artPipeline: 'hearthmere-painted-v1'`; its presence alone cannot establish attractive art. The reviewer must still inspect the real PNGs, reject generic/placeholder-looking shapes and document remaining shortcomings.

## Engineering boundaries

- No change to quest ownership, Hearthmere narrative sequence, world coordinates or migration of old player saves.
- The shared visual module is under `src/rendering/`, **not** in pure world generation. Neither `WorldGeography.ts` nor the atlas compiler imports Three.js or presentation classes.
- A cell owns its instantiated meshes, geometries and materials. It must release them on streaming unload; the scene-wide shared brush-origin uniform stays alive while the lab lives.
- The sculpted environment is a *closer match* to the original but is still a **staging-art baseline**. Artists and level designers still need final region vegetation, vistas, architectural landmarks, local wildlife, shore detail and cinematic dressing.
- Real iPhone 14 Pro FPS and memory must be measured; adding painter shading, instancing and shadows does not itself demonstrate performance.

**Next creative gate:** Review the eleven World V2 shots alongside actual Hearthmere in the saved gallery and iterate on canopy silhouette variety, terrain material transitions, riverbanks, world-scale environmental landmarks and lighting. The procedural atlas remains an infrastructure system; art direction is owned by this shared rendering contract.
