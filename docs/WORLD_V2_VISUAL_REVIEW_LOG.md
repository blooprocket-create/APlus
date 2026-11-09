# World V2 — Screenshot-based visual iteration log

**Scope:** Phase 2 staged geography only. Screenshots depict actual browser/Three.js rendering from reproducible camera coordinates, not the finalized Astral Chronicles art direction or canonical world layout. This log records the actual image evidence and resulting code changes, rather than declaring a world visually complete because tests pass.

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
