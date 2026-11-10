# World V2 — Screenshot-based visual iteration log

**Scope:** Phase 2 staged geography and the separately identified opt-in art investigation below. Screenshots depict actual browser/Three.js rendering, not approved canonical geography or final production art. This log records image evidence and resulting code changes; tests do not establish visual acceptance.

## Original asset-production investigation — 2026-11-09–10

The atelier runs on the existing game/animation/combat/camera systems. It is not
a World V2 campaign cutover. The initial spline/detail passes remained a basic
prototype; the later passes changed the actual upstream asset source.

| Pass | Actual evidence and critical finding | Underlying correction |
| --- | --- | --- |
| 11–14 | [UV couture](screenshots/astral-slice/11-couture-hero.png), [rejected ravine winding](screenshots/astral-slice/12-sculpt-garden.png), [canopy](screenshots/astral-slice/14-canopy-garden.png). Better material alignment still left mannequin anatomy, regular landscape forms and weak plant structure. Pass 13's ability capture timed out; it is not counted as a completed review. | Original design-led fitting, oriented continuous ravine patches, authored vegetation shoots, painted material/sky sources and a canonical-rig Blender action. |
| 15–17 | [Guardian and painted flow](screenshots/astral-slice/17-painted-flow-keeper.png), [ability](screenshots/astral-slice/17-painted-flow-ability.png). Original reconstruction improves the carved design; raw neural paint lost much of its character. | Calibrated original paint projection onto actual UV geometry, editable material masks, cliff extent correction, asymmetric painted energy strokes. |
| 18–19 | [Rejected shoulder spikes](screenshots/astral-slice/18-fitted-hero-portrait.png) → [smoothed binding](screenshots/astral-slice/19-smooth-binding-portrait.png). Stronger face/costume identity, but hard semantic weights damaged shoulders. | Spatial hair selection plus welded adjacency smoothing. Keep the reviewed weighted Blender source authoritative; painting no longer regenerates the skin. |
| 20 | [Reconstructed elder](screenshots/astral-slice/20-painted-elder-garden.png). Connected trunk/root silhouette improves; sealed crown lobes remain visibly soft. | Preserve the sculpture and replace the sealed green outer surface with porous painted blades conditioned on its shape. |
| 21–22 | [Carved ruin and reflected water](screenshots/astral-slice/21-carved-sanctuary-garden.png) → [porous crown](screenshots/astral-slice/22-porous-crown-garden.png). Better negative space and ruin identity; a perfect paving platform and empty vista still dominate. | Replace the wedge arch with an original carved sculpture; actual planar reflection; porous crown; tighter contact shadows and closer cinematic framing. |
| 23 | [Riven vista / broken court](screenshots/astral-slice/23-sculpted-vista-garden.png), [live ability](screenshots/astral-slice/23-sculpted-vista-ability.png). The gate now frames an authored landmark. Broad illumination still flattens forms. | Original cliff reconstruction and surface-fitted animated water; authored collapse scars in paving; damped followers extend only the existing Hair influence; existing fixture gains bounded sparring space. |
| 24 | [Scene](screenshots/astral-slice/24-golden-canopy-garden.png), [portrait](screenshots/astral-slice/24-golden-canopy-portrait.png), [guardian](screenshots/astral-slice/24-golden-canopy-keeper.png), [native view](screenshots/astral-slice/24-golden-canopy-gameplay.png), [ability](screenshots/astral-slice/24-golden-canopy-ability.png). Stronger shadow structure and stone/brass separation. Reconstructed geometry still softens fine forms; production facial topology and deformation remain unfinished. | Move the sun to stage canopy shadows, reduce global fill, preserve character readability with local fill; fix a material mask that treated warm ivory as metal. Further geometry-backend investigation remains separate from this retained candidate. |

[Pass 24 browser evidence](screenshots/astral-slice/24-golden-canopy-evidence.json)
records zero exceptions, actual keyboard movement Z=11 → 11.576, and real ability
damage to the existing sentinel. The unretimed canvas recording is 172.59 seconds
on CPU SwiftShader; it is not a hardware performance demonstration. A separate
frame-stepped animation-study tool preserves canonical engine updates and labels
simulation time explicitly. Asset integrity, 187 tests and screenshots are
different forms of evidence; none alone certifies the requested high-end bar.

## Earlier World V2 geography review

| Pass | Evidence | Observed result | Action |
| --- | --- | --- | --- |
| Baseline (before visual audit) | [Earlier Chrome screenshot archive](https://github.com/blooprocket-create/APlus/actions/runs/42537843437) | **Critical:** dark navy square and diagonal water gaps appear as sea tiles unload. **Major:** relatively bare rolling terrain, debug tile grid and HUD obscure the landscape. | Replace per-tile ocean with continuous ocean shader; add first-pass biome-aware original vegetation/rocks; capture unoccluded fixed views. |
| Visual pass 1 | [11 real screenshots, gallery and diagnostics](https://github.com/blooprocket-create/APlus/actions/runs/42539344764) | **Ocean gaps resolved** in captured open-sea/island-coast views. 11/11 cameras captured; no browser JS or terrain load failures. **Major remaining:** sharp, noisy jagged terrain resembles folded paper; uniform spread of conifers/rocks; deeply incised river canyon; broad grey staging pads lack contextual design. | Correct river headwater altitude clamp, smooth/extend road and stage-pad slope blending, tone down high-frequency terrain relief, cluster vegetation, and enforce anchor clearances. |
| Visual pass 2 | [11 screenshots, second-pass gallery](https://github.com/blooprocket-create/APlus/actions/runs/42540145099) | **River gorge and severe story-pad cliffs substantially reduced** at the identical camera positions; forest clusters are less uniformly distributed (e.g. arrival: 537 → 227 nearby scenery instances). **New major defect exposed:** river displayed as a thick turquoise 3D tube now hovering/overlapping the terrain instead of occupying its carved bed. Ocean remains continuous. | Replace river-tube geometry with a world-space surface ribbon at the authoritative river water height. Confirm in the next screenshot set. |
| Visual pass 3 | [Chrome screenshots with water-surface ribbon](https://github.com/blooprocket-create/APlus/actions/runs/42540403635) | Canyon remained improved, but the hard-edged flat cyan river surface was still very broad and visually read like a suspended roadway. Automated checks reported no issue, while the image made the defect unmistakable. | Narrow river width, taper source end, add per-vertex transparency that blends at banks. |
| Visual pass 4 | [Fourth 11-view screenshots and diagnostics](https://github.com/blooprocket-create/APlus/actions/runs/42540733092) | **Verified:** The former massive ravine is gone; the river now reads as a thinner feathered surface with a tapered headwater. Ocean remains continuous, no dark tile polygons in the saved sea view, and all 11 shots have valid pixels and zero browser/load errors. **Still provisional:** stylized water needs proper banks/foam, more natural flow/tributaries and terrain art polish. | Mark the technical river-visual defect improved; leave final hydrology and environment direction open as subsequent Phase 2 art/nav work. |

## Explicit review findings

1. **Critical / fixed in first visual pass — ocean voids:** The older geography smoke screenshot showed very dark polygons and hard edges against lighter water. Root cause: the initial ocean was one translucent plane **per streamed cell**, revealing lower seabed or background outside loaded tiles. The first pass replaced these planes with one camera-centered ocean surface using world-space procedural shading; image evidence confirms continuity within the captured view. This is a rendering prototype, not ship buoyancy or waves.
2. **Major / addressed in second pass — deep river trenches:** The river builder used `Math.max(4.2, Math.min(land.elevationScale * 2, rawHeight * 0.55))`; for the staged continent `elevationScale < 2`, this effectively pinned most river headwaters to `4.2` regardless of surrounding elevation. The screenshot showed narrow turquoise channels at the base of steep green chasms. The fix starts water near the actual origin terrain height and modifies the gentle bank blending. New screenshot evidence still required before approving.
3. **Major / addressed in second pass — unconvincing staging valleys:** Earlier images showed angular erosion-like walls from the 20-unit narrative-pad influence radius and 7.5-unit road shoulders. The fix broadens the falloff to a more traversable-looking slope. These are staging coordinates, not approved town placements.
4. **Major / addressed in second pass — repeated vegetation:** First-pass images displayed dozens of equally spaced conifers and boulders with the same silhouette. Scene instances now use deterministic broad patches and protected clearing zones around named story anchors. These original low-poly instances are a **temporary visual language**, not production trees or the final prop catalogue.
5. **Still open — actual world composition:** The staged map has limited scale/landform variety; coastlines, regions and Hearthmere placement must be reviewed before the world becomes canon. Screenshots alone do not certify accessibility, quest behavior, collision/nav, river crossings, full atlas scale or physical iPhone 14 Pro performance.

## How to close a visual-review item

For each critical/major finding, cite a specific screenshot name (e.g. `river-basin.png`), describe the actual visible problem, identify the source module and intended visual goal, make one bounded change, rerun `npm run test:visual`, inspect the same camera **before and after**, and mark the item resolved only after visually confirming the new image. Maintain tests for deterministic geography, story anchors and old Hearthmere's three-role start.

The visual gallery is a **review aid**; its technical image metrics must never be presented as an automatic aesthetic sign-off.

## Fourth-pass disposition

I retrieved the fourth run's actual `river-basin.png` and visually inspected it against the earlier wide blue ribbon and ravine. The new stream is significantly narrower, feathered and tapers naturally at the headwater; the previous pipe-like rectangle is no longer visible. **Accept this as an engineering-staging correction, not a finished river art asset.** River-bank/ground texture integration, tributary networks and terrain silhouette refinement remain open. The test also verifies the initial three-hero Hearthmere experience remains functionally unchanged.

The user has **not** approved the staged five-landmass atlas, final story coordinates or ship/coastline-landing gameplay. These are independent approvals and test gates; a screenshot CI pass is not a substitute for them.

## Second-pass image review (2026-11-09)

The pairwise comparison was made from **actual screenshots** with the same shot IDs rather than from edited art or rotated camera angles. The corrected river altitude and broader stage-pad blend removed the enormous visible troughs in `river-basin.png` and `hearthmere-arrival.png`. The screenshot immediately revealed that the old debug water overlay was still a round tube drawn at the river centerline; with the canyon gone, it appeared to float *above* the rolling landscape. The third-pass fix builds a flat water surface mesh along the river's monotonic level, with the terrain handling occlusion at the banks. This requires another screenshot pass to verify.

There is still no approval of the five-landmass atlas as **final world canon**, and the instanced preview trees are not a final art-asset replacement.

## Art-style continuity correction — real browser comparison (November 8–9, 2026)

**Trigger:** The user identified that World V2 was using a noticeably different art style than the existing Astral Chronicles environment. This is a real architectural/rendering defect, not a reason to redesign the game's art identity.

**References:** [PR #8](https://github.com/blooprocket-create/APlus/pull/8); [visual screenshot and original-game reference artifact](https://github.com/blooprocket-create/APlus/actions/runs/42560483804); [shared art contract](WORLD_V2_ART_PARITY.md).

**Before:** The exact `hearthmere-arrival.png` screenshot from the previous V2 staging lab shows very bright lime-green faceted terrain, mechanical cone/sphere trees and stark shadow shapes. It differs substantially from the existing game screenshot, which uses olive wash, painterly grass, sculpted lumpy canopies, a warmer sky and nuanced cel-shaded objects.

**After:** The identical `hearthmere-arrival.png` and `mainland-coast.png` views now show fine painted ground texture, subdued Hearthmere greens and clay paths, irregular rounded lofted trees, meadow details and watercolor-inspired water strokes. This is a materially closer style match. The CI archive includes `reference/hearthmere-warrior.png` captured from the original playable game in the same workflow run, plus the 11 current shots and previous-iteration versions for direct visual comparison. The latest run at this revision passed 165 tests, original Hearthmere boot for all three heroes, all 11 V2 captures, with no visual-run technical failures.

**Limitations visible in actual screenshots:**
- The region composition is still largely grass and evenly spaced small trees with very few intentional authored landmarks. The existing Hearthmere screenshot contains buildings, props, bespoke groves, walkable town details, NPCs and staged architecture. The geography lab is a terrain-art integration proof, **not** an equivalent level-design build.
- Ocean is visually continuous and now uses the original water pigment/stroke language, but shoreline foam, beach props and local water interaction still require art/physics work.
- The mobile portrait image confirms the painter style renders in a narrow viewport, **not** that the actual game's mobile camera or iPhone GPU meets its target.
- These are still staged landmass positions and temporary biome populations, not user-approved final map or gameplay geography.

**Disposition:** The off-style prototype-renderer defect is corrected in code and improved in verified screenshots. **Do not mark the entire Phase 2 geography or final art polish complete.** Keep the shared renderer as the standard for future region authoring and run the screenshot gallery alongside the playable original after every major environment change.


## 2026-11-09 — isolated Observatory atelier investigation

Owner-requested art work; **not World V2 geography/campaign acceptance**. [Full audit, pipeline, verification and candid limitations](OBSERVATORY_ATELIER.md). All images below are browser captures of the real Three.js game. The atlas is used only as a material map.

- [Baseline hero](screenshots/astral-slice/00-baseline-lobby.png) and [baseline opening](screenshots/astral-slice/00-baseline-game.png): useful animation foundation, small segmented forms and weak material separation.
- [Pass 01](screenshots/astral-slice/01-garden.png): rejected for inward faces, pale pigments and incomplete fitting.
- [Pass 02 environment](screenshots/astral-slice/02-materials.png) / [hero](screenshots/astral-slice/02-hero.png): rejected for repeated paving, disconnected roots, hidden weighted limbs and excessive foreground haze.
- [Pass 03](screenshots/astral-slice/03-sculpt.png): continuous fused tree and fitted court improve form; synthetic surface patterns, empty hills and weak framing remain.
- [Pass 04 environment](screenshots/astral-slice/04-painted.png) / [hero](screenshots/astral-slice/04-hero.png): original painted atlas improves material character; ground noise, distant shadow artifacts and harsh skin lighting require correction.
- [Current cinematic](screenshots/astral-slice/05-final-garden.png), [hero](screenshots/astral-slice/05-final-hero.png), [native gameplay camera](screenshots/astral-slice/05-final-gameplay.png), [ability](screenshots/astral-slice/05-final-ability.png): inspect these as the candidate result, not an automatic visual pass. [Browser diagnostics](screenshots/astral-slice/browser-evidence.json) and [actual canvas recording](screenshots/astral-slice/gameplay.webm) accompany the captures.

The candidate demonstrates a distinct offline model/material pipeline, original fitted art and release-linked VFX. It still falls short of a high-end anime RPG, especially facial/anatomical sophistication, authored performance, environment density/composition and production finish. Physical mobile performance and visual approval remain unverified.

Verification follow-up: existing browser regression passes 3/3 heroes and 3/3 arrival roles; existing World V2 visual audit passes **11/11 frames / zero issues** against the final production-build server on port 4191. Earlier capture infrastructure failures and their diagnosis are recorded in the atelier document. This does not raise the art candidate to production acceptance.


### Continued pass — not an artistic sign-off

The [rejected portrait](screenshots/astral-slice/continuation/07-portrait.png) exposes profile-interpolation terraces and a startled expression. The [corrected portrait](screenshots/astral-slice/continuation/08-portrait.png) removes those bands and matures the eyes; the [scene pass](screenshots/astral-slice/continuation/08-scene.png) adds an authored observatory kit. The current [hero](screenshots/astral-slice/09-refinement-hero.png) and [environment](screenshots/astral-slice/09-refinement-garden.png) show the improved material/feature treatment. They still look like a stylized prototype rather than the requested high-end anime RPG. Inherited hands/limbs, garment construction, environmental forms and performance need original production art work. The goal is not accepted as complete.

Contact-occlusion experiment rejected: pass 09 roughly doubled draws for a weak visible gain and slowed the capture harness. The retained pass 10 removes that pass, keeps portrait-only depth of field, fixes the banner's two-sided surface, adds an instrument cradle and a woven crescent, and corrects mirrored gaze direction. None of these changes meets or signs off the requested high-end art target.

Retained final capture: [scene](screenshots/astral-slice/10-refinement-garden.png), [portrait](screenshots/astral-slice/10-refinement-hero.png), [native camera](screenshots/astral-slice/10-refinement-gameplay.png), [actual ability](screenshots/astral-slice/10-refinement-ability.png). Browser review verifies movement and release/damage with no exceptions. These are engineering/visual-review artifacts, **not high-end visual acceptance**.

### Original reconstruction and paint pipeline — passes 11–24

The [detailed source and failed-pass review](OBSERVATORY_ATELIER.md) continues
beyond the earlier spline candidate. Original paintings became editable UV
sculptures rather than stock meshes or scene image planes. The
[pass-24 portrait](screenshots/astral-slice/24-golden-canopy-portrait.png) has a
substantially more coherent original design than pass 10. The
[scene](screenshots/astral-slice/24-golden-canopy-garden.png) adds the original
carved gate, reconstructed elder, porous crown and cliff vista; the
[ability](screenshots/astral-slice/24-golden-canopy-ability.png) uses an original
Blender performance and painted energy strokes tied to actual damage.

Visible limits remain: the face is soft and faceted, some neural carvings are
muddy, broad ground surfaces are weak, and the landscape lacks a finished
production composition. These are reasons to improve the sources, not to call
weights prohibited or the art accepted. [Pass-24 evidence](screenshots/astral-slice/24-golden-canopy-evidence.json)
records real movement/damage and zero browser exceptions.

### Passes 25–26 — closer staging and carved-light comparison

[Pass 25 opening](screenshots/astral-slice/25-motion-composition-garden.png)
gives the hero a stronger foreground silhouette and makes the architecture more
substantial, but its caption overlaps the character. The
[windup](screenshots/astral-slice/25-motion-composition-windup.png) and
[impact follow-through](screenshots/astral-slice/25-motion-composition-ability.png)
are the same real cast. A restrained, short instrument exposure follows the
canonical Weapon joint rather than an invented animation path. It is a subtle
motion addition; it is not the principal artistic improvement.
[Live evidence](screenshots/astral-slice/25-motion-composition-evidence.json)
reports zero errors, keyboard movement Z=11 → 11.671616, and keeper health
1600 → 1420 from an actual critical hit.

[Pass 26 opening](screenshots/astral-slice/26-carved-light-garden.png)
moves the caption clear of the hero and uses a more frontal, less orange key
with reduced local character fill. Gate relief and the elder's form read more
clearly. The [portrait](screenshots/astral-slice/26-carved-light-portrait.png)
still exposes a lumpy face and coarse face shadows; lighting cannot supply the
missing sculpt detail. The next source experiment therefore allocates a
separate portrait-scale reconstruction to the head, keeping reviewed body
weights and the canonical animator intact.
[Pass-26 evidence](screenshots/astral-slice/26-carved-light-evidence.json)
is explicitly a paused static comparison, with no repeated gameplay claim.
The native isometric camera remains available and unchanged.

### Passes 27–28 — reject weak additions, retain the verified scene

[Pass 27 portrait](screenshots/astral-slice/27-character-shadow-portrait.png)
tested a tighter character shadow projection with unchanged illumination.
It compiled and rendered without errors, but the visible improvement was too
small for the extra shadow pass. The implementation was removed. Low-resolution
face geometry remains the primary visible problem.

[Pass 28 scene](screenshots/astral-slice/28-retained-stage-garden.png),
[portrait](screenshots/astral-slice/28-retained-stage-portrait.png) and
[native camera](screenshots/astral-slice/28-retained-stage-gameplay.png) capture
the retained default without the extra shadow. Its
[windup](screenshots/astral-slice/28-retained-stage-windup.png),
[contact](screenshots/astral-slice/28-retained-stage-contact.png) and
[follow-through](screenshots/astral-slice/28-retained-stage-ability.png) document
one actual cast, including keeper health 1600 → 1414. The
[browser evidence](screenshots/astral-slice/28-retained-stage-evidence.json)
records zero errors and keyboard movement Z=11 → 11.575424.

The separate integer-weight portrait source failed clay geometry review before
it reached the game; both its coarse and refined fields were malformed. A close
first-prediction numerical match did not predict usable art. The unchanged
reference-computation follow-up remains separate until its geometry and actual
game views can be reviewed. Neither a larger model nor successful inference is
being treated as visual acceptance.
