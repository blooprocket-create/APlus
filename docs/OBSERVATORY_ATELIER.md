# The Remembering Observatory — visual pipeline investigation

2026-11-09. **Proposed art target, isolated for review. Not a production-quality sign-off.**

Open `/atelier.html`. The normal Hearthmere game remains `/index.html`. This is an art-focused, single-hero combat sandbox built on `GameEngine`, its existing internal `MoatSlice`, `CharacterRig`, `HeroMotion`, input, combat, damage, sentinel AI and `IsometricCameraController`. It does not implement another gameplay engine, publish geography, migrate saves, or complete World V2 Phase 3.

Controls: WASD/arrows to walk, Shift to evade, click for basic attacks, **Q / Astral bloom** for the revised gravity ability, **C / Camera** to cycle cinematic / hero / native isometric cameras, **P** to hide/restore the interface. The page uses an in-memory character and the existing slice's no-save behavior. Reload resets the encounter. It is a desktop review sandbox; it does not yet provide a complete mobile control layout.

## What the audit found

- `CharacterMeshBuilder`, the wardrobe modules and `ArtMesh` create most hero surfaces at runtime. `tools/blender/export-hero-meshes.ts` transfers those surfaces into Blender. `build_hero_rigs.py` supplies real authored, weighted animation, facial controls and timing markers, but the upstream geometry still largely comes from runtime lofts/panels. A Blender file alone did not establish a modeling production pipeline.
- Many surfaces share the illustrated vertex-color palette and fixed light ramp. This preserves the visual idiom but suppresses cloth/metal/skin separation and response to scene lighting. Baking pieces also discards UVs, making painted texture authoring difficult.
- Environment generation has strong deterministic engineering boundaries and useful painted shaders. Existing helper composition nevertheless favors repeated isolated forms. More instances do not fix proportion, organic junctions, negative space, material character or framing.
- Real browser review tooling exists, but its pixel diagnostics detect broken output, not high-end artistry. The screenshots need a critical human/agent review. Desktop headless results cannot certify mobile performance.

## The changed production approach

The new atelier sources are in `tools/atelier/`. They run **offline in Blender** and emit embedded glTF 2.0 assets into `public/art/observatory/`. These are original assets, not downloaded models. No source illustration is substituted for the live 3D scene.

1. **Author silhouettes before dressing.** Explicit growth splines define the tree's counter-curves, buttress roots, boughs and branchlets. Voxel union, relaxation and surface reduction fuse the growth volumes into one continuous sculpt. The resulting junctions differ materially from intersecting runtime tubes.
2. **Fit continuous surfaces to the animation contract.** Celestia's new bodice, draped plastron, mantle panels, fitted sleeves, fluted armor, flattened hair clumps, crescent instrument and filigree are subdivided offline. Named `attach__<joint>` nodes preserve the existing animation identities. The loader handles Three's sanitized joint names explicitly.
3. **Keep deformation where it belongs.** Existing body and finger clips, facial morphs, release timing and character state remain authoritative. The weighted underlayer is preserved. New mantle vertices are fitted to `Coat` / `Coat.Hem`; hair and cloth gain small presentation follow-through. This is not a cloth or hair physics solver.
4. **Make materials independently authorable.** Eight hero material families separate silk, porcelain, skin, hair, brushed metal and opal. Standard lighting/specular is combined with a restrained illustrated shadow band and a softer painted skin treatment. The face retains existing expression morphs.
5. **Use original painted albedo, not mathematical crosshatch.** `pigments.png` is an original generated four-material atlas: bark, limestone, moss and blue-green slate. Triplanar sampling avoids a runtime-UV requirement on fused sculptures. The stored atlas is a source artifact, not generated during builds. It is used only as material color on actual geometry; it is not a scene image. The initial sine-pattern surface experiment is visible in pass 03 and was removed after review.
6. **Compose a maintained sanctuary inside a ruin.** A fitted Voronoi stone court and interrupted brass sky chart lead to the broken moon gate. Continuous fluted piers and carved capitals replace stacked cylinders. The unified elder tree, hanging vines, curved leaf surfaces, iris stems, lantern shrines, terraces and shallow pool frame the court. Layered valley silhouettes supply distance. These positions and the name are proposed art staging, not canonical World V2 anchors.
7. **Stage one ability through the existing release event.** A palm charge leads into travelling calligraphic energy sheets, a legible ground seal, sparse sparks, local light and a restrained screen-space wave. The outer seal scales to the real gravity hazard radius. The existing hazard still owns pull, duration, ticks and damage. The new original Orrery Keeper art is attached to the existing sentinel root; AI, projectiles, telegraphs and health remain existing gameplay code.
8. **Antialias the composed frame.** Restrained thresholded bloom, localized distortion, output conversion and FXAA run on the actual scene. The native isometric camera is retained as a selectable view; hero/cinematic shots use its existing authored-shot interface.

## Rebuild and review

Requires Blender (verified here with 4.3.2), Node and Chromium. Prebuilt art is committed; ordinary game builds do not require Blender.

```sh
npm ci
npm run art:bake
npm run art:manifest
npm run art:verify
npm run build
npm test
npm run dev
# Separate terminal, with the server running:
npm run art:review
# Add a real-time WebGL canvas recording:
ART_REVIEW_RECORD=1 npm run art:review
```

`BLENDER_BIN` and `CHROME_BIN` can select installed executables. `art:manifest` deliberately updates source hashes after an inspected asset change; `art:verify` rejects drift, external buffer/image dependencies and missing fitting joints. Neither is an aesthetic test. The original atlas remains required; regenerating it with the prompt below will produce a different painting, so inspect it and update the manifest deliberately.

`review.mjs` captures cinematic, hero, native gameplay and ability frames, freezes using the existing game pause owner for stills, verifies walking through actual keyboard input, and optionally records the running canvas through `MediaRecorder`. It logs browser exceptions and real frame intervals. It does not substitute an offline Blender render, retime gameplay, or inject an animation pose for screenshots.

## Screenshot review history

See [the screenshot-backed review log](WORLD_V2_VISUAL_REVIEW_LOG.md) and `docs/screenshots/astral-slice/`.

| Pass | Finding | Underlying correction |
| --- | --- | --- |
| 00 baseline | Small segmented hero forms and material flattening; substantial existing animation work, limited upstream modeling. | Establish a distinct offline model/material handoff rather than adding dressing to the same surfaces. |
| 01 first import | Inward stone/terrain faces, near-white pigments, clipped crown, incomplete joint import. Unacceptable. | Recalculate oriented surfaces, fix linear pigment conversion, map sanitized joint names and reframe. |
| 02 surfaces | Torso replacement accidentally hid the shared weighted limbs; disconnected roots, repetitive pavers and broad fog remained. | Preserve weighted underlayer, fuse the sculpt, replace ring placement with fitted stones, reduce foreground fog. |
| 03 sculpt | Better continuity, but procedural crosshatch looked synthetic; empty hills and old staff weakened the result. | Original painted atlas, new crescent instrument, atmospheric layering and pool. |
| 04 painted | Better bark/stone, excessive ground contrast, shadow artifacts on valley silhouettes, harsh face lighting, aliasing. | Reduce atlas influence on ground, unlit distant silhouettes, softer skin, material-aware hero pass and FXAA. |
| 05 review | Old sandbox enemies could float beyond the new terrain; excess subdivision and an early VFX capture obscured review. | Replace staging with one original construct on sentinel AI, remove hidden companions, reduce surfaces without changing the art direction, and capture the developed ability phase. |

## What still falls short

This is a serious pipeline prototype and a visible change in model/material treatment, **not the requested high-end production bar**. Do not describe the screenshots as extraordinary or the art pipeline as solved.

- Celestia still inherits the existing underlying skeleton, weighted limb mesh and facial topology/expressions. Her anatomy, hands, eyes, mouth and animation need a dedicated character artist pass, deformation review and custom performance. The new couture/hair are not equivalent to a fully sculpted and retopologized production character.
- Tree and ruin silhouettes are more continuous, but the scene still shows procedural regularity, sparse midground storytelling and simple distant landforms. The foliage needs better crown structure, variation, painted normal treatment and detailed interaction work. The triplanar atlas is not a complete UV/normal/roughness baking pipeline.
- The new construct retains the sentinel's animation/emitter contract. Its shell is not a separately articulated enemy performance. Other attacks retain existing VFX. The featured ability is a richer timing/material experiment, not a full cinematic combat package or authored multi-character choreography.
- Pool reflection/caustics, rays, motion and depth are stylized approximations. There is no ray tracing, true volumetric integration, planar scene reflection or physical cloth/hair simulation.
- The displayed garden is an art stage over the existing moat fixture's movement footprint. Banks, ruins, pool and distant hills do not gain new authored collision, navigation or quest semantics. This is not a walkable replacement world and must not be cut over into Hearthmere.
- Assets are approximately 18 MB uncompressed after removing redundant subdivision and bevel geometry (new hero 88,516 triangles, construct 22,416, garden 472,748). Instancing, LODs, compression, device loading/memory and sustained frame rate need work. Browser evidence here uses CPU SwiftShader. The recorded frame intervals describe that environment, not reference-device performance. **No physical iPhone 14 Pro measurement.**

The next worthwhile production investment is a hand-edited character sculpt/retopology and a more strongly authored environment kit with UV, normal and material baking, evaluated at the native gameplay camera. Additional bloom, extra leaf instances or a more flattering screenshot cannot replace that work.

## Ownership, authority and rollback

The current user request explicitly prioritizes this isolated visual investigation over the older default instruction to defer polish. D153 (native gameplay camera), D154 (original illustrated identity), D164 (reversible spatial restaging) and D165 (no save migration) remain applicable. The proposed garden, new outfit and construct are not newly locked canon.

`ObservatoryAtelier` owns loaded art, material uniforms and postprocessing. `GameEngine` owns all simulation and release/damage events. It lazy-loads the atelier only for `startObservatoryAtelier`; default gameplay never downloads these art assets or activates these passes. Disposal restores scene lighting, fog, tone mapping and hidden original art. New assets are independent of World V2 generation; pure world modules do not import this presentation layer.

Rollback: remove the `atelier.html` Vite input/entry, `startObservatoryAtelier` presentation hooks, `ObservatoryAtelier`, atelier sources and `public/art/observatory`. No game saves, atlas identity, world artifacts or campaign data are changed. The PR must remain unmerged until owner approval.

## Painted atlas provenance

Original generated albedo atlas, 2026-11-09, native ImageGen. No downloaded model or third-party texture. The checked-in PNG and SHA-256 in `manifest.json` are the reproducible source for this build. Prompt intent: a square 2×2 atlas with independently tileable warm umber/violet flowing bark, quiet weathered ivory limestone with teal crevice moss, rich jade/viridian velvet moss and blue-green slate with restrained brass dust; original gouache/watercolor pigments, uniform diffuse lighting, no scene, object, border, labels or material-ball previews. It is sampled as a surface map in the real game, not shown as a prerendered scene.

## Verification record

181 tests pass; production build, asset integrity, documentation/dependency checks and forward/reverse world bakes pass. The existing browser smoke passed all three heroes, grounded navigation and all three opt-in first-arrival roles. One subsequent art movement rerun was invalidated by an external diagnostic viewport resize (which resets input); it is rerun without concurrent interaction. A concurrent World V2 visual-capture run hit a software-rendering frame timeout and is repeated serially. These are recorded as review-infrastructure failures, not ignored as art acceptance.
