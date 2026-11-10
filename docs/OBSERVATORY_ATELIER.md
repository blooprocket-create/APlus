# The Remembering Observatory — visual pipeline investigation

2026-11-09–10. **Proposed art target, isolated for review. Not a production-quality sign-off.**

Open `/atelier.html`. The normal Hearthmere game remains `/index.html`. This is an art-focused, single-hero combat sandbox built on `GameEngine`, its existing internal `MoatSlice`, `CharacterRig`, `HeroMotion`, input, combat, damage, sentinel AI and `IsometricCameraController`. It does not implement another gameplay engine, publish geography, migrate saves, or complete World V2 Phase 3.

Controls: WASD/arrows to walk, Shift to evade, click for basic attacks, **Q / Astral bloom** for the revised gravity ability, **C / Camera** to cycle cinematic / hero / native isometric / portrait / guardian / wide cameras, **P** to hide/restore the interface. Health and ability cooldown read the existing engine state. The page uses an in-memory character and the existing slice's no-save behavior. Restart/reload resets the encounter. It is a desktop review sandbox; it does not yet provide a complete mobile control layout.

The default atelier selects the original reconstructed hero, guardian, porous
elder and carved gate. Comparison switches retain the earlier source path:
`?hero=couture&keeper=corolla&tree=growth&gate=legacy&vista=legacy`.
`?tree=sealed` compares the sealed reconstruction against the porous crown.
These switches affect this isolated entry only.

## What the audit found

- `CharacterMeshBuilder`, the wardrobe modules and `ArtMesh` create most hero surfaces at runtime. `tools/blender/export-hero-meshes.ts` transfers those surfaces into Blender. `build_hero_rigs.py` supplies real authored, weighted animation, facial controls and timing markers, but the upstream geometry still largely comes from runtime lofts/panels. A Blender file alone did not establish a modeling production pipeline.
- Many surfaces share the illustrated vertex-color palette and fixed light ramp. This preserves the visual idiom but suppresses cloth/metal/skin separation and response to scene lighting. Baking pieces also discards UVs, making painted texture authoring difficult.
- Environment generation has strong deterministic engineering boundaries and useful painted shaders. Existing helper composition nevertheless favors repeated isolated forms. More instances do not fix proportion, organic junctions, negative space, material character or framing.
- Real browser review tooling exists, but its pixel diagnostics detect broken output, not high-end artistry. The screenshots need a critical human/agent review. Desktop headless results cannot certify mobile performance.

## Current production change: original art → editable sculpture → live character

The earlier spline/detail passes below did not resolve the modeling bottleneck.
The newer path starts with an **original authored design**, uses a pretrained
image-to-3D tool to establish a new sculpture, then calibrates original paint onto
UVs, repairs the mesh, authors material masks and fits it to the game's existing
rig. Pretrained weights are production tools, as explicitly clarified by the user;
no premade third-party game model or texture is used. Weights and upstream code
stay outside the repository. See the pinned, licensed [tool workflow](../tools/atelier/reconstruction/README.md).

- **Celestia:** original adult anime design/A-pose, new proportions, face, silver
  hair and navy/teal/pearl tailoring. Front and rear original paint are baked onto
  the actual surface. A landmark fit and welded skin-field smoothing produce
  continuous shoulder deformation. The reviewed `CelestiaFitted.blend` is the
  editable authority; texture exports preserve its weights/morphs. The runtime
  rebinds this surface to the **same canonical bone objects**, retargeting foot
  paths through the shared two-link solver. The original articulated casting
  hand, instrument grip, emitters and animation player remain in use. Source
  face projection supplies gaze/blink paint; seven morphs retain the existing
  expression inputs. This is not yet a retopologized facial performance rig.
  A four-joint damped follower distributes only the existing Hair influence;
  torso weights and actor transforms remain intact. Coat/hem deformation still
  uses the canonical authored joints rather than a separate cloth simulator.
- **Orrery Keeper:** an original intricately carved lunar owl sculpture replaces
  the procedural corolla. Calibrated UV paint restores the brass, celadon and
  ivory design details that raw neural color lost. It remains attached to the
  existing sentinel actor; hit response reads its existing hit timer.
- **Environment:** the reconstructed elder establishes a much stronger curved
  trunk/root silhouette than the prior fused growth helper. A new offline stage
  removes the sealed green crown surfaces and fits porous painted blades to the
  same authored shape. An original carved moon gate replaces the regular wedge
  arch; its source includes weathering,
  botanical relief, layered rock and moss rather than detail scattered onto
  blocks. Archived gate materials keep the comparison reversible. The spring's
  new clipped planar reflection captures actual scene geometry through the same
  renderer, alongside the painted-sky material probe.
  A further original riven-cliff source replaces the empty vista with geological
  folds, hanging gardens and a lunar shrine. Artist-annotated image pixels are
  ray-fitted to the actual surface; a live material animates water along that
  3D path. The path is a rendering attachment, never gameplay navigation.
  The gateway's illustrated normal detail is derived from original UV paint,
  with broad source lighting and UV gutters rejected; it is not claimed as a
  physical high-poly sculpture bake.
- **Ability/presentation:** asymmetric painted energy sheets replace the earlier
  equal white spirals. The original 49-frame action, real release/damage marker,
  hand charge, local lighting, impact accent and readable hazard radius remain
  shared with combat. Health/cooldown UI reads existing engine state; restarting
  reloads the isolated in-memory encounter.

The [pass 19 portrait](screenshots/astral-slice/19-smooth-binding-portrait.png),
[pass 20 hero](screenshots/astral-slice/20-painted-elder-hero.png),
[guardian](screenshots/astral-slice/20-painted-elder-keeper.png), and
[live ability](screenshots/astral-slice/20-painted-elder-ability.png) are actual
browser renders. They demonstrate a substantial asset-design improvement over
the [early prototype portrait](screenshots/astral-slice/10-refinement-hero.png).
The [pass 20 environment](screenshots/astral-slice/20-painted-elder-garden.png)
still exposes broad simple terrain, soft foliage masses and weak ruin design.
These are visible production shortcomings, not permission blockers or a reason
to declare high-end acceptance.

### Retained live candidate — pass 24

[Scene](screenshots/astral-slice/24-golden-canopy-garden.png) ·
[portrait](screenshots/astral-slice/24-golden-canopy-portrait.png) ·
[guardian](screenshots/astral-slice/24-golden-canopy-keeper.png) ·
[native isometric](screenshots/astral-slice/24-golden-canopy-gameplay.png) ·
[ability](screenshots/astral-slice/24-golden-canopy-ability.png) ·
[raw real-time canvas recording](screenshots/astral-slice/gameplay.webm) ·
[short motion excerpt](screenshots/astral-slice/animation-study.mp4) ·
[browser evidence](screenshots/astral-slice/24-golden-canopy-evidence.json).

The actual portrait is substantially stronger than the earlier parameterized
head. The environment has a new carved gateway, porous elder canopy, broken
court and original cliff vista; water follows an annotated path on the sculpture.
The ability remains tied to real combat. Pass 24 corrects stone incorrectly
classified as metal and improves the sun/shadow hierarchy. These changes prove
a materially better asset-production route. They do not establish AAA anatomy,
retopology, facial performance or finished foliage/landscape artistry. A stronger
geometry backend is being evaluated without replacing this retained comparison.

Current engineering checks: production build, **187 tests / 27 files**, art
integrity, atlas/geography verification (including reverse order), dependency
audit and documentation contract pass. Pass 24 reports zero browser exceptions,
actual movement Z=11 → 11.576 and real sentinel damage. The raw recording is
172.59 seconds and is not retimed. CPU SwiftShader is very slow; capture intervals
include review pauses and are not a steady-state FPS benchmark. Physical-device
performance remains unverified. All optional art/comparison variants total about
115 MiB before production texture/mesh compression; the normal opening does not
load that payload.

The [CI run for retained commit 7133b519](https://github.com/blooprocket-create/APlus/actions/runs/42734494615)
also passed the default Hearthmere browser smoke and all 11 World V2 geography
captures. These protect the existing opening and architecture; they are not an
art-quality assessment.

The short motion excerpt is a continuous **2.4 seconds of observed simulation
time**, visibly labeled as such. Its capture session ended after frame 124, so it
does not show the complete planned recovery study. Saved frame timestamps were
recovered from the capture log; full per-frame diagnostic objects were not.
[Excerpt evidence](screenshots/astral-slice/animation-study-evidence.json) records
that limitation. The independent pass-24 browser capture above records the
keyboard, damage and exception checks. Neither movie measures hardware FPS.

## First investigation: offline spline/UV authoring (retained comparison)

The new atelier sources are in `tools/atelier/`. They run **offline in Blender** and emit embedded glTF 2.0 assets into `public/art/observatory/`. These are original assets, not downloaded models. No source illustration is substituted for the live 3D scene.

1. **Author silhouettes before dressing.** Explicit growth splines define the tree's counter-curves, buttress roots, boughs and branchlets. Voxel union, relaxation and surface reduction fuse the growth volumes into one continuous sculpt. The resulting junctions differ materially from intersecting runtime tubes.
2. **Work from an original design, then preserve the authored surfaces.** The original Celestia sheet in `art/atelier/references/` guides tailored open lapels, a teal waistcoat, thin crossed belts, a pearl shoulder mantle, curved embroidered coat tails, fitted sleeves/boots, layered pointed hair and a forged crescent instrument. `couture_surfaces.py` authors explicit UV profiles, folded patches and shaped hair cross-sections. UVs survive subdivision, per-material batching and glTF import. Named `attach__<joint>` nodes preserve existing animation identities, including feet. This replaces the earlier bulky symmetric armor/straight panels; it is not a completed production character sculpt.
3. **Author performance inside the existing animation contract.** The weighted underlayer and canonical joint names are retained; the optional art fit narrows the shoulder span and refits the neck/head. A new 49-frame Blender action has anticipation, a held gathering pose, release, and recovery, with finger gestures and offline planted-foot IK. `motionProfile: observatory` selects it only in the atelier through the existing `HeroMotion` player. Its frame-29 release marker drives actual damage and VFX together; duration is 1.6 seconds. Default mage clips and all other heroes retain their existing behavior. Facial paint follows a continuous head surface with exported expression shapes; separate fitted eyes/brows read the original performance weights. Coat deformation and the four-bone hair follower remain presentation only, not a new physics solver.
4. **Make materials independently authorable.** UV-aligned original cloth embroidery, hair grain and facial albedo replace flat palette-only treatment. Standard lighting/specular is combined with an illustrated shadow band. Eyes now use a physical cornea material, receiving the same scene lighting as skin, instead of remaining white in shadow. Metal, opal, leather and fabric keep separate response. The skin paint contains no painted eyeballs: the live eye geometry still blinks and changes gaze.
5. **Use original painted albedo, not mathematical crosshatch.** `pigments.png` is an original generated four-material atlas: bark, limestone, moss and blue-green slate. Triplanar sampling avoids a runtime-UV requirement on fused sculptures. The stored atlas is a source artifact, not generated during builds. It is used only as material color on actual geometry; it is not a scene image. The initial sine-pattern surface experiment is visible in pass 03 and was removed after review.
6. **Replace weak structural assets.** `bank_sculpt.py` replaces random deformed-sphere rock/moss assemblies with five continuous outcrops defined by editable outlines, erosion ledges and fracture cuts. Moss follows the actual surface slope. Crown leaves now attach along authored woody shoots, replacing unconnected ellipsoid distributions; original painted leaf UVs supply grain and cutout contours. `terrain_sculpt.py` replaces flat valley image planes with continuous eroded ravine surfaces. `bake_occlusion.py` samples a BVH of the actual sculpture and exports contact/crevice shading in glTF vertex colors. The fitted court, brass chart, moon gate, carved piers, telescope/chart and banner remain the sanctuary composition. Positions and names remain proposed staging, not V2 canon.
7. **Stage one ability through the existing release event.** A palm charge leads into travelling calligraphic energy sheets, a legible ground seal, sparse sparks, local light and a restrained screen-space wave. The outer seal scales to the real gravity hazard radius. The existing hazard still owns pull, duration, ticks and damage. The new original Orrery Keeper art is attached to the existing sentinel root; AI, projectiles, telegraphs and health remain existing gameplay code.
8. **Light and compose the actual scene.** An original painted sky supplies both the animated skydome and its linear PMREM reflection probe. Directional sunlight, a soft character fill, restrained bloom, local impact distortion and FXAA run on live geometry. Portrait depth blur reuses the primary scene depth texture rather than rendering every sculpture/shadow again. Native isometric follow is retained; scenic, hero and portrait shots use the existing camera's authored-shot interface.

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

`review.mjs` captures cinematic, hero, close portrait, native gameplay and ability frames, freezes using the existing game pause owner for stills, verifies walking through actual keyboard input, and optionally records the running canvas through `MediaRecorder`. It logs browser exceptions and real frame intervals. It does not substitute an offline Blender render, retime gameplay, or inject an animation pose for screenshots.

For a timing-readable animation study on CPU-only machines:

```sh
node tools/atelier/animation-study.mjs http://127.0.0.1:4191
```

This lets **one existing GameEngine rAF update** run, pauses with the same review
API, captures the actual browser frame, and encodes frames using observed
`simulationTime` differences. It never sets a pose, dt, actor position or damage.
The movie is visibly labeled **frame-stepped / simulation time / not real-time
FPS**, and its per-frame evidence is retained. The separate `gameplay.webm` is
the unretimed real-time canvas recording. Frame-stepped studies can assess the
authored motion/VFX timing; they cannot certify hardware rendering performance.

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

## Early spline candidate limitations (historical)

This is a serious pipeline prototype and a visible change in model/material treatment, **not the requested high-end production bar**. Do not describe the screenshots as extraordinary or the art pipeline as solved.

- Celestia still inherits the existing underlying skeleton, weighted limb mesh and facial-performance weights. The continuation adds a new landmark-based head surface and fitted expressive feature meshes, but these are not a production character sculpt/retopology. Her anatomy, hands, eyes, mouth and animation need a dedicated character artist pass, deformation review and custom performance. The new couture/hair are not equivalent to a fully sculpted and retopologized production character.
- Tree and ruin silhouettes are more continuous, but the scene still shows procedural regularity, sparse midground storytelling and simple distant landforms. The foliage needs better crown structure, variation, painted normal treatment and detailed interaction work. The triplanar atlas is not a complete UV/normal/roughness baking pipeline.
- The new construct retains the sentinel's animation/emitter contract. Its shell is not a separately articulated enemy performance. Other attacks retain existing VFX. The featured ability is a richer timing/material experiment, not a full cinematic combat package or authored multi-character choreography.
- Pool reflection/caustics, rays, motion and depth are stylized approximations. There is no ray tracing, true volumetric integration, planar scene reflection or physical cloth/hair simulation.
- The displayed garden is an art stage over the existing moat fixture's movement footprint. Banks, ruins, pool and distant hills do not gain new authored collision, navigation or quest semantics. This is not a walkable replacement world and must not be cut over into Hearthmere.
- The expanded art payload is approximately 35 MB uncompressed after the painted maps and sculpture work; current SHA-256, sizes, material and mesh counts are recorded in the asset manifest. The dense initial hero was reduced before refinement; the new surface and feature geometry are intentional additions rather than an automatic quality claim. Instancing, LODs, compression, device loading/memory and sustained frame rate need work. Browser evidence here uses CPU SwiftShader. The recorded frame intervals describe that environment, not reference-device performance. **No physical iPhone 14 Pro measurement.**

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
- An original analytic sky reflection probe initially improved metal/opal response. Screen-space contact occlusion was tested and rejected: it roughly doubled scene draws with little artistic gain and slowed software captures. A modest depth-of-field pass remains limited to the portrait camera and is disabled in native gameplay. These are presentation tools, not a substitute for asset quality or a mobile-performance certification.
- The palm charge now ends at the same authored release marker used by actual damage, instead of a guessed phase constant.

[Before hero](screenshots/astral-slice/continuation/07-before-hero.png), [rejected first portrait](screenshots/astral-slice/continuation/07-portrait.png), [corrected portrait](screenshots/astral-slice/continuation/08-portrait.png), [scene refinement](screenshots/astral-slice/continuation/08-scene.png). The `09-refinement` captures include the subsequently rejected contact-occlusion experiment. The earlier retained candidate uses the `10-refinement` prefix; subsequent work continues below.

The result remains visibly synthetic in hands, anatomical transitions, costume construction, foliage/landscape form and authored performance. Further shader/detail additions cannot honestly be claimed to meet the requested art bar. Original artist-level sculpting/retopology and performance authoring remain the quality bottleneck. The draft PR preserves the useful pipeline work and the failed experiments; it is not a successful high-end visual target.

### Earlier continuation assessment (superseded as a stopping decision)

**The high-end goal remained unfinished. There was no permission or technical blocker.** The original generated/parameterized assets still do not demonstrate production-grade anatomy, garment construction, deformation and authored performance. The additional facial surface/feature fitting, secondary hair rig, original observatory kit and material response are usable development work, but the screenshots remain a stylized prototype. It would be misleading to call the result extraordinary or to continue adding rendering effects as a substitute for the missing original production art. The PR stays draft and unmerged.

The continuation's production build and **183 tests pass**, including two new contracts for expression fitting and presentation-only secondary motion. World/quest/collision/default camera modules are unchanged; the previously captured 11/11 World V2 regression baseline remains recorded above. The current art capture JSON and recording describe the retained candidate separately from the rejected experiments.

Retained continuation evidence (2026-11-09 18:27 UTC): [scene](screenshots/astral-slice/10-refinement-garden.png), [portrait](screenshots/astral-slice/10-refinement-hero.png), [native gameplay](screenshots/astral-slice/10-refinement-gameplay.png), [ability](screenshots/astral-slice/10-refinement-ability.png). The current browser JSON reports no exceptions, actual movement from Z=11 to Z=11.576 and a damage-linked ability at age 0.5166 seconds. The replacement raw recording is **49.96 seconds**, 960×600, using the native gameplay camera (view 2). It remains slow on CPU SwiftShader and is not retimed.


## Reference-led production continuation — passes 11–15

The earlier decision to label the goal “blocked” was incorrect. Quality below the target is unfinished work, not a permission/technical blocker. The investigation continued with original design-led modeling, UV material authoring, continuous bank/ravine sculpting, geometric occlusion, foliage attached to woody shoots, painted sky lighting and a new Blender performance. The PR remains draft and unmerged; these changes do not constitute high-end art acceptance.

### Additional original painted source provenance

All images below were authored with native ImageGen on 2026-11-09–10. They are committed source assets, not runtime generation and not downloaded third-party art. The manifest and reconstruction provenance record exact hashes. Prompt descriptions summarize the production brief; they are not a claim that a regenerated image would be identical.

| Source | Brief and actual use |
| --- | --- |
| `art/atelier/references/celestia-design.png` | Original adult anime lunar cartographer: navy tailored jacket, teal waistcoat, asymmetric embroidered pearl mantle, pointed silver hair, leather gloves/boots and crescent instrument. Front/back/face reference guides the mesh; not used as scene output. |
| `couture.png` | Four flat diffuse swatches: navy botanical/constellation embroidery, pearl celestial embroidery, quiet teal weave, silver-blue vertical hair brushwork. Sampled by explicit garment/hair UV panels; quiet crops supply tailored cloth/leather. |
| `leaves.png` | Four frontal original painted lanceolate leaves, jade/sage/moss/celadon, fine branching veins, transparent background, base at bottom/tip at top. Used as albedo/cutout on curved 3D leaves attached to actual shoots. |
| `face.png` | Original frontal face albedo guided by Celestia's design, warm porcelain/rose tones, no hair/jewelry/painted eyeballs/brows. Eye centers at 30/70% x, 54% y, nose at 66%, lips at 79%, chin at 99%; mapped to the sculpt's explicit projection UV. Live eye and brow geometry remains separate. |
| `sky.png` | Original wide painted sky only: teal zenith, ivory/gold clouds, lavender undersides, calm atmospheric horizon, no landscape or objects. Sampled by the live sky sphere and baked into the scene's reflection probe. It does not replace any environment geometry. |
| `celestia-apose.png`, `celestia-back-paint.png` | Original front A-pose reconstruction source, then a rear painting guided by the actual reconstructed rear surface and original identity. Calibrated projection onto the 3D UV surface; not a billboard. |
| `lunar-warden.png` | Original carved lunar owl automaton, ivory/celadon feathers, bronze calendar motifs and teal gems. Reconstruction source for the existing sentinel's replacement art. |
| `elder-tree.png` | Original counter-curved old tree, umber/violet roots and layered jade/sage crown. Reconstruction supplies the connected bark/root silhouette; a further authoring pass replaces its sealed crown with porous leaves. |
| `moon-gate.png` | Original broken botanical/celestial limestone gate with bronze inlays, sculpted eroded rock base, stairs, moss and carved calendar relief. Source for the reconstructed gateway and its UV paint. |
| `riven-cliff.png` | Original stratified shale/limestone butte, natural arch, hanging gardens and tiny lunar shrine, with an empty carved watercourse. Reconstructed as an actual 42-unit sculpture; annotated source pixels attach animated surface flow to it. |
| `energy.png` | Original transparent cobalt/teal painted flow band. Animated on four asymmetric 3D energy strokes, rather than used as an illustration of the scene. |

### Earlier reference/UV review findings (passes 11–14)

- **11 couture:** explicit UV embroidery and layered hair worked, but excessive neck length, hidden shoulder mantle and dark broad tailoring outweighed the detail. Refit the head/neck, moved the mantle forward and narrowed shoulders/sleeve art.
- **12 sculpture:** geometric contact shading helped ground the court, but open ravine patches faced away from the camera. The portrait exposed an unlit-eye/skin mismatch and an oversized standing collar. Corrected source winding, added a soft scene fill, lowered/refitted the collar and moved eyes to shared physical lighting.
- **13 performance:** original 49-frame action and marker checks passed; the scene showed a pale wall and clipped canopy, with a mannequin-like face. Its ability screenshot exceeded the original 180-second software-rendering deadline; this is **not** recorded as a pass. Increased the review deadline for the longer real cast; did not speed up simulation or retime output.
- **14 canopy:** wider framing and painted leaves showed the full sanctuary more clearly, but scattered round banks, shelf-like foliage and flat facial coloring still read as a prototype. Replaced those structural sources rather than adding particles/bloom.

The new combined capture must be assessed from actual browser images. Original source paintings and design sheets are not evidence that the game meets the requested bar. Outstanding production issues include full character retopology/anatomy, a real mouth cavity and speech deformation, hero-specific motion refinement, less regular ruin construction, richer landscape composition and hardware performance. The existing moat fixture still owns movement: decorative banks/ruins/pool do not introduce replacement navigation or collision, and this stage is not a walkable V2 region.
