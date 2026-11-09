# World V2 Phase 2 — Geographic generation and staged atlas

**Status (2026-11-08):** Phase 2 **geography-generator and offline staging slice** implemented in [PR #6](https://github.com/blooprocket-create/APlus/pull/6). This is an inspectable technology/layout proposal, **not the final user-approved canonical map**. The existing playable Hearthmere scene and quests are not relocated by this work.

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
| Offline world builder | `tools/world-v2-compile.mjs --geography` | Reproducible generation + 302 staging tiles, adjacent seam checks, river/mouth and story-site checks, atlas SVG, validation report |
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

`public/world-v2/geography/` is a **generated directory**, excluded from source control and regenerated during Vite's prebuild. The schema/profile is `geography-stage-v1`. The staging compiler creates **302 streamed terrain cells**, a versioned atlas index, a deterministic `validation-report.json`, an `atlas-overview.svg`, and **9,078 border vertex comparisons**. Both normal and reversed generation orders are checked byte-for-byte. The report includes covered land/ocean/river/road samples, biome counts, validated anchors and rivers.

The browser does **not** run the expensive heightfield generator. It fetches compiled JSON tiles with per-cell SHA-256 and displays them only if atlas, ID, classification and dimensional validation pass. The river-line display is a lightweight debugging overlay from the same staged constraints, not a substitute for river surface meshes or buoyancy.

## Test and acceptance scope

**Verified initial run:** [GitHub Actions run 42537341691](https://github.com/blooprocket-create/APlus/actions/runs/42537341691) passed **157 tests / 21 files**, TypeScript/Vite production build, both geographic bake orders, all terrain seam and anchor/river constraints, legacy Hearthmere startup across all three classes, and real Chrome navigation from island to **deep ocean** (5 landmasses, 6 rivers, 302 compiled tiles, no observed cell-load failures). CI uploads screenshots and compiler reports. Later commits require their own green run.

**Terrain physics disclaimer:** A visual/heightfield preview is **not** a full production collision mesh, walkability navmesh, boat-water interaction, or proof that every future coastline is safe to land on. Those are integration requirements rather than accomplished game mechanics. The 60 FPS iPhone 14 Pro target remains unmeasured.

### What Phase 2 still needs before it could be called production geography

- User review of **actual** continent/island shapes, scale and Hearthmere placement (staging parameters above are not canon).
- Freeze a versioned **published canonical** atlas/seed and geographic footprints, independent of sample lab settings. Never silently regenerate published landmasses.
- Bake the **full geographic extent in paged regional catalogs** rather than these deliberately selected 302 test cells. Include multiple terrain LOD meshes, distant silhouettes and map tiles. Today's finite catalog will not stream outside the test patches.
- Ground/river/shoreline collision and continuous actor/companion navmesh links; verify road and non-road routes through real terrain inclines and accessible beaches.
- Enhance hydrology beyond constrained radial channels: watershed integrity, river joins, lake/tributary handling, crossings and natural runoff/erosion where desired.
- Terrain vegetation/material/prop population and quality-checked mobile budgets. Ocean gameplay, controllable ships and ownership belong to Phase 4, not Phase 2.
- After the geography is approved, **Phase 3** can migrate Hearthmere's **assets, quests and cinematics** onto new anchors. Previous player saves are expressly **not** migrated (D165).

**Recommendation for next iteration:** Review the staging world visually in [the geography lab](../world-v2-geography.html), select or edit the intended landmass layout and Hearthmere's approach/coast, then build the canonical authored anchor/region catalog and physical navigation bake. This keeps the world procedural-first and leaves story beats stable without canonizing today's test coordinates.
