# World V2 Phase 2 — Geographic generation and staged atlas

**Status (2026-11-08):** Phase 2 **geography-generator and offline staging slice** implemented in [PR #6](https://github.com/blooprocket-create/APlus/pull/6) and extended by the [functional navigation/runtime milestone](WORLD_V2_PHASE2_RUNTIME.md). This is an inspectable technology/layout proposal, **not the final user-approved canonical map**. The existing playable Hearthmere scene and quests are not relocated by this work.

## What is real and working

1. **Five separate geographic landmasses:** Two distinctly shaped continents and three islands in the **staged** world manifest, separated by continuous ocean. The exact count, placement, scale and coastline of these five samples are **provisional**. The product-level decision remains multiple continents and islands.
2. **Deterministic irregular coastlines:** Each landmass has independently seeded, continuous angular coast harmonics and adjustable long/short radii, orientation and roughness. Terrain uses positive inland/coastal distance and negative ocean depths that meet at sea level 0. Coastline samples are continuous across cell edges and aren't constrained to roads or port markers.
3. **Elevation:** Continental interior height combines seeded broad relief and finer mountainous ridges; marine depth grows away from coast. This is **procedural terrain**, not a hand-built terrain preset.
4. **Climate and biome classification:** Signed latitude/elevation/seeded moisture shape beaches, grassland, forest, highlands, snow, drylands and shallow/deep ocean. All classification happens **offline**; the browser reads numeric biome IDs from baked cells.
5. **Headwater-to-sea channels:** Six deterministic, monotonic downhill river paths, with carved riverbeds and per-vertex water surfaces. These channels connect inland to ocean as validated in the compiler. The initial channel routing is **radial constrained drainage**, not a full hydrologic erosion/flow-accumulation simulation. More sophisticated branching watersheds and waterside collision are future work.
6. **Fixed story sites and connecting roads:** Staged Hearthmere arrival, refuge and other landmark anchors retain named IDs. Validation rejects anchors in the sea/too close to shore; their construction footprints are flattened to their reserved Y. Straight provisional road corridors join specified anchors with stable grades, without limiting where players can explore. The compiler rejects any overland road that would run through a coastline.
7. **Streaming-safe cell data:** Each baked tile carries Float32 heights and water surface heights, Uint8 ocean/river class, biome class and road influence. Samples use global X/Z; the compiler rejects mismatched borders for all terrain arrays. Per-tile IDs and generation fingerprints remain independent of stream order.
8. **Whole-atlas inspection:** Offline compiler writes an SVG map showing both continents, all three islands, rivers and proposed story locations. The new separate [3D geography lab](../world-v2-geography.html) displays the image, draws actual tile geometry/ocean and river paths, and offers jumps between stage Hearthmere, mainland coast, island, second continent and open sea.
9. **Source compatibility:** The original `/world-v2-lab.html` Phase 1 heightfield and normal `/index.html` Hearthmere experience remain intact. The geography staging profile is stored separately at `/world-v2/geography/`; old save migration is not needed.

## Source ownership

| Owner | Source | Responsibilities |
|---|---|---|
| Geographic definitions | `src/world-v2/WorldGeographyStage.ts` | **Noncanonical** seed, 2 continents/3 islands, sample story anchors, region-specific coastline and climate tunables |
| Geographic sampling | `src/world-v2/WorldGeography.ts` | Independent coast/elevation/biome/river/road sampling from global coordinates; no Three.js and no quest progression |
| Terrain-cell generation | `src/world-v2/WorldTerrain.ts` | Geography vertex attributes, stable cell boundaries, surface sample helpers |
| Artifact serialization | `src/world-v2/WorldArtifacts.ts` | Versioned geographic catalog and tile schema validation, array-size/value checking |
| Offline world builder | `tools/world-v2-compile.mjs --geography` | Reproducible full staging extent (4,608 cells / 72 pages), ground-nav masks, adjacent seam checks, river/mouth and story-site checks, atlas SVG, validation report |
| Runtime source | `src/world-v2/WorldV2GameplayBridge.ts` | SHA-256 checked HTTP content, rejects incomplete geographic tiles, opt-in engine adapter |
| 3D inspection | `world-v2-geography.html`, `src/world-v2/geography-lab.ts` | Baked cell visualization, ocean plane, biome/road coloring, river debug geometry, jumps/stream diagnostics |
| Automated proof | `tests/worldV2Geography.test.ts`, Chrome workflow | Geographical invariants, seam tests for *all* fields, real browser island/ocean transitions |

## Reproducible build

```sh
npm ci
npm run build             # builds Phase 1 preview AND Phase 2 geography
npm run world:geo:bake   # rebuild staged continental + island cells only
npm run world:geo:verify
npm run world:geo:verify -- --reverse
npm test
npm run test:browser
npm run audit:world
```

`public/world-v2/geography/` is a **generated directory**, excluded from source control and regenerated during Vite's prebuild. The schema/profile is `geography-stage-v1`. The staging compiler creates **4,608 streamed terrain cells across 72 checksummed 8×8 pages**, a versioned atlas index, a deterministic `validation-report.json`, an `atlas-overview.svg`, and **154,224 border vertex comparisons**. Both normal and reversed generation orders are checked byte-for-byte. The report includes covered land/ocean/river/road samples, biome counts, validated anchors and rivers.

### Screenshot-driven visual QA and first rendering iterations

The companion [visual review system](WORLD_V2_SCREENSHOT_REVIEW.md) captures **11 deterministic, clean Chrome shots** on every PR/main push, including mainland/refuge/foothill/river/coast/island/open sea/second continent and a mobile-sized portrait view. It writes the actual image gallery, SVG contact sheet, pixel-level diagnostics, streaming status and human review checklist as the `world-v2-visual-review` Actions artifact. A PR can optionally compare with the latest successful main-branch screenshots. This is a **visual inspection aid**, not an automatic art-quality approval model.

See the [evidence-based iteration log](WORLD_V2_VISUAL_REVIEW_LOG.md) for specific screenshot findings and fixes: removed per-cell ocean voids, added original batched biome scenery, widened staging clearances and corrected the river headwater elevation. Further river surface/riverbank art and terrain silhouette passes are part of Phase 2. Continue reviewing screenshots at the same camera positions rather than concluding visual quality from test green status alone.

The browser does **not** run the expensive heightfield generator. It fetches compiled JSON tiles with per-cell SHA-256 and displays them only if atlas, ID, classification and dimensional validation pass. The river-line display is a lightweight debugging overlay from the same staged constraints, not a substitute for river surface meshes or buoyancy.

## Test and acceptance scope

**Verified initial run:** [GitHub Actions run 42537341691](https://github.com/blooprocket-create/APlus/actions/runs/42537341691) passed **157 tests / 21 files**, TypeScript/Vite production build, both geographic bake orders, all terrain seam and anchor/river constraints, legacy Hearthmere startup across all three classes, and real Chrome navigation from island to **deep ocean** (5 landmasses, 6 rivers, 302 compiled tiles, no observed cell-load failures). CI uploads screenshots and compiler reports. Later commits require their own green run.

**Terrain physics disclaimer:** A reusable bare-terrain collision and nav-mask/pathfinding service is now present and exercised in the staged geography lab ([details](WORLD_V2_PHASE2_RUNTIME.md)), but this is **not** a full production physics system for authored meshes, overhangs, bridges, boats, dynamic NPCs or all future coastline shapes. The 60 FPS iPhone 14 Pro target remains unmeasured.

### What Phase 2 still needs before it could be called production geography

- User review of **actual** continent/island shapes, scale and Hearthmere placement (staging parameters above are not canon).
- Freeze a versioned **published canonical** atlas/seed and geographic footprints, independent of sample lab settings. Never silently regenerate published landmasses.
- The full **staging** geographic extent is now baked in 72 pages; when the *canonical* world is approved, republish its versioned extent and add low-poly distant LOD silhouettes/map tiles. Avoid pretending the 4,608 current cells include unapproved future expansions.
- Bare-ground/river/shore collision and A* links now exist in the staging lab; integrate them with actual hero, NPC/companion movement, authored props/structures, bridges and obstacle collision during Phase 3. Use shoreline probes as a precursor to Phase 4 vessel landing.
- Enhance hydrology beyond constrained radial channels: watershed integrity, river joins, lake/tributary handling, crossings and natural runoff/erosion where desired.
- Terrain vegetation/material/prop population and quality-checked mobile budgets. Ocean gameplay, controllable ships and ownership belong to Phase 4, not Phase 2.
- After the geography is approved, **Phase 3** can migrate Hearthmere's **assets, quests and cinematics** onto new anchors. Previous player saves are expressly **not** migrated (D165).

**Recommendation for next iteration:** Review the staging world's FUNCTIONAL movement and accessibility in [the geography lab](../world-v2-geography.html), select or edit the intended landmass layout and Hearthmere's approach/coast, then publish the canonical authored anchor/region catalog and move into Phase 3 story integration. This keeps the world procedural-first and leaves story beats stable without canonizing today's test coordinates.
