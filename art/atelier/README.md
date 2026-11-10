# Observatory art sources

Proposed original visual investigation on `art/astral-visual-slice`; not accepted game canon.

- `references/celestia-design.png`: original ImageGen design sheet, authored from the existing Celestia identity and the previous running-game capture. It guides proportions, tailored navy/teal garments, asymmetric pearl mantle, silver hair and crescent instrument. It is **not** displayed instead of the game renderer.
- `CelestiaAstralBloom.blend`: editable original 49-frame performance on the canonical named Celestia skeleton. The Release marker is frame 29. The file contains the rig/action, not a final skinned production character. Rebuild with `blender -b --python tools/atelier/build_ability.py`.
- Mesh production sources live in `tools/atelier/`. Original painted maps are committed under `public/art/observatory/`; their provenance and limitations are documented in `docs/OBSERVATORY_ATELIER.md`.
- `sculpts/celestia/CelestiaFitted.blend`: reviewed original weighted character, UV paint and expression shapes. This is the editable authority after fitting; `export_authored_hero.py` refreshes textures without reclassifying the skin. Original A-pose and rear-paint sources are in `references/`.
- `sculpts/lunar-warden/`, `elder-tree/`, `moon-gate/`: original reconstructed sculptures, UVs, painted maps and per-source provenance. Their `.blend` files retain editable surfaces and packed paint. The raw arrays allow independent reconstruction of the export without inference weights.
- The [optional reconstruction workflow](../../tools/atelier/reconstruction/README.md) records pretrained tool/code revisions, licensing and limitations. Weights are tools outside the repository; no downloaded third-party game asset is used.

The asset handoff preserves UVs, named attachments, facial shape keys and geometric occlusion. The actual renderer, camera, animation player, combat release, damage and input remain the game's existing systems. No downloaded third-party geometry or texture is used.
