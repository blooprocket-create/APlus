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

- Celestia still inherits the existing underlying skeleton, weighted limb mesh and facial-performance weights. The continuation adds a new landmark-based head surface and fitted expressive feature meshes, but these are not a production character sculpt/retopology. Her anatomy, hands, eyes, mouth and animation need a dedicated character artist pass, deformation review and custom performance. The new couture/hair are not equivalent to a fully sculpted and retopologized production character.
- Tree and ruin silhouettes are more continuous, but the scene still shows procedural regularity, sparse midground storytelling and simple distant landforms. The foliage needs better crown structure, variation, painted normal treatment and detailed interaction work. The triplanar atlas is not a complete UV/normal/roughness baking pipeline.
- The new construct retains the sentinel's animation/emitter contract. Its shell is not a separately articulated enemy performance. Other attacks retain existing VFX. The featured ability is a richer timing/material experiment, not a full cinematic combat package or authored multi-character choreography.
- Pool reflection/caustics, rays, motion and depth are stylized approximations. There is no ray tracing, true volumetric integration, planar scene reflection or physical cloth/hair simulation.
- The displayed garden is an art stage over the existing moat fixture's movement footprint. Banks, ruins, pool and distant hills do not gain new authored collision, navigation or quest semantics. This is not a walkable replacement world and must not be cut over into Hearthmere.
- Assets are approximately 20 MB uncompressed after the additional portrait/relic work; current SHA-256, sizes, material and mesh counts are recorded in the asset manifest. The dense initial hero was reduced before refinement; the new surface and feature geometry are intentional additions rather than an automatic quality claim. Instancing, LODs, compression, device loading/memory and sustained frame rate need work. Browser evidence here uses CPU SwiftShader. The recorded frame intervals describe that environment, not reference-device performance. **No physical iPhone 14 Pro measurement.**

The next worthwhile production investment is a hand-edited character sculpt/retopology and a more strongly authored environment kit with UV, normal and material baking, evaluated at the native gameplay camera. Additional bloom, extra leaf instances or a more flattering screenshot cannot replace that work.

## Ownership, authority and rollback

The current user request explicitly prioritizes this isolated visual investigation over the older default instruction to defer polish. D153 (native gameplay camera), D154 (original illustrated identity), D164 (reversible spatial restaging) and D165 (no save migration) remain applicable. The proposed garden, new outfit and construct are not newly locked canon.

`ObservatoryAtelier` owns loaded art, material uniforms and postprocessing. `GameEngine` owns all simulation and release/damage events. It lazy-loads the atelier only for `startObservatoryAtelier`; default gameplay never downloads these art assets or activates these passes. Disposal restores scene lighting, fog, tone mapping and hidden original art. New assets are independent of World V2 generation; pure world modules do not import this presentation layer.

Rollback: remove the `atelier.html` Vite input/entry, `startObservatoryAtelier` presentation hooks, `ObservatoryAtelier`, atelier sources and `public/art/observatory`. No game saves, atlas identity, world artifacts or campaign data are changed. The PR must remain unmerged until owner approval.

## Painted atlas provenance

Original generated albedo atlas, 2026-11-09, native ImageGen. No downloaded model or third-party texture. The checked-in PNG and SHA-256 in `manifest.json` are the reproducible source for this build. Prompt intent: a square 2×2 atlas with independently tileable warm umber/violet flowing bark, quiet weathered ivory limestone with teal crevice moss, rich jade/viridian velvet moss and blue-green slate with restrained brass dust; original gouache/watercolor pigments, uniform diffuse lighting, no scene, object, border, labels or material-ball previews. It is sampled as a surface map in the real game, not shown as a prerendered scene.

## Verification record

- `npm test`: 181 tests / 26 files pass, including all three existing opening paths. Source CI at `6e7a59d` also passed [GitHub Actions 42665023675](https://github.com/blooprocket-create/APlus/actions/runs/42665023675); the later evidence/recovery-panel commit is checked separately.
- `npm run build`, `art:verify`, `docs:check`, `audit:world`, `world:bake:verify`, `world:geo:verify` and reverse-order geography verification pass.
- `test:browser` passes all three heroes, grounded movement/navigation and all three opt-in first-arrival roles.
- `test:visual -- --base-url http://127.0.0.1:4191/`: **11/11 frames, zero issues** against the explicit final production-build server. This is regression evidence, not artistic approval.
- Baseline art run at commit `fcd8dea` (2026-11-09 17:40 UTC): keyboard travel from Z=11 to Z=11.576, developed ability at age 0.5333 seconds, recorded ability at age 0.7167 seconds, no browser exceptions. That baseline recording was 53.2 seconds at 960×600; stills are 1280×800. It is slow under CPU rendering and is not retimed.
- Hosted preview executed in Chromium and reported its original art fully loaded; [hosted capture](screenshots/astral-slice/06-hosted-preview.png).
- Review infrastructure failures were retained during investigation: a diagnostic viewport resize cleared held input in an art rerun; concurrent captures hit short deadlines; a later visual retry lost its internally started preview server (resident cells 0, 2,480 loading errors); port 4190 was then found to be blocked by browser/Node fetch. Final verification uses reachable port 4191 without concurrent browser interaction. None of those failures was silently treated as a pass.

The art evidence JSON contains actual measured frame intervals, including warm-up/capture pauses on CPU SwiftShader. They are not a sustained hardware benchmark. The desktop recording is a raw browser artifact and can be very slow under software rendering; no physical-device performance claim is made.

## Continued investigation — portrait, material response and scene authorship

The high-end objective remains **unmet**, not approved or production-complete. The continuation makes further concrete changes rather than treating the first draft as sufficient.

- `portrait_sculpt.py` authors sockets, cheek planes, a nasal bridge/tip, philtrum, lips and chin on a continuous facial surface. It emits `portrait.json`; the runtime eyes/eyelids fit these samples instead of guessing another surface. The first interpolation produced visible terraces and was rejected. A continuous cubic profile corrects that failure.
- `AtelierPortrait.ts` adds layered iris fibers, limbal rings, catchlights, fitted upper/lower lids, lashes, brows and lips. Existing blink/focus/gaze/speech weights remain the sole performance driver. The more mature eye shape and smaller head replace the earlier toy-like proportions.
- The hair builder's cross-section bug was fixed: it generated ten vertices per ring but flattened them in groups of eight. `AtelierSecondaryMotion.ts` fits a four-bone damped follower to the actual hair mesh, reading actor motion/yaw while preserving the canonical Hair joint and every authoritative transform.
- The mantle is darker, flared and more open around the legs, with restrained woven borders. Gems use explicit cut planes. The existing casting glove receives material treatment without losing finger weights. These changes do not solve inherited limb topology or production deformation.
- `observatory_relics.py` adds botanical astronomical tracery, carved frame crests, a curved chart, a telescope with a trunnion cradle, and an embroidered banner. The banner is a two-sided cloth surface; an initial back-facing import was corrected.
- An original analytic sky reflection probe improves metal/opal response. Contact occlusion was tested and rejected: it roughly doubled scene draws with little artistic gain and slowed software captures. A modest depth-of-field pass remains limited to the portrait camera and is disabled in native gameplay. These are presentation tools, not a substitute for asset quality or a mobile-performance certification.
- The palm charge now ends at the same authored release marker used by actual damage, instead of a guessed phase constant.

[Before hero](screenshots/astral-slice/continuation/07-before-hero.png), [rejected first portrait](screenshots/astral-slice/continuation/07-portrait.png), [corrected portrait](screenshots/astral-slice/continuation/08-portrait.png), [scene refinement](screenshots/astral-slice/continuation/08-scene.png). The `09-refinement` captures include the subsequently rejected contact-occlusion experiment. The final retained candidate uses the `10-refinement` prefix.

The result remains visibly synthetic in hands, anatomical transitions, costume construction, foliage/landscape form and authored performance. Further shader/detail additions cannot honestly be claimed to meet the requested art bar. Original artist-level sculpting/retopology and performance authoring remain the quality bottleneck. The draft PR preserves the useful pipeline work and the failed experiments; it is not a successful high-end visual target.

### Continuation outcome

**High-end goal blocked on art quality, not marked complete.** The original generated/parameterized assets still do not demonstrate production-grade anatomy, garment construction, deformation and authored performance. The additional facial surface/feature fitting, secondary hair rig, original observatory kit and material response are usable development work, but the screenshots remain a stylized prototype. It would be misleading to call the result extraordinary or to continue adding rendering effects as a substitute for the missing original production art. The PR stays draft and unmerged.

The continuation's production build and **183 tests pass**, including two new contracts for expression fitting and presentation-only secondary motion. World/quest/collision/default camera modules are unchanged; the previously captured 11/11 World V2 regression baseline remains recorded above. The current art capture JSON and recording describe the retained candidate separately from the rejected experiments.

Retained continuation evidence (2026-11-09 18:27 UTC): [scene](screenshots/astral-slice/10-refinement-garden.png), [portrait](screenshots/astral-slice/10-refinement-hero.png), [native gameplay](screenshots/astral-slice/10-refinement-gameplay.png), [ability](screenshots/astral-slice/10-refinement-ability.png). The current browser JSON reports no exceptions, actual movement from Z=11 to Z=11.576 and a damage-linked ability at age 0.5166 seconds. The replacement raw recording is **49.96 seconds**, 960×600, using the native gameplay camera (view 2). It remains slow on CPU SwiftShader and is not retimed.
