# World V2 Phase 1 — kernel implementation and QA

**Status:** Implementation in review (PR #4). The system is deliberately not connected to the current production Hearthmere opening.  
**Parent:** [World Architecture V2](WORLD_V2_ARCHITECTURE.md) and [Phase 0 closure](WORLD_V2_PHASE0_AUDIT.md).  
**Scope:** Canonical identity, atlas metadata, semantic story anchors, safe cell addressing, basic streaming/residency, and provisional traversable terrain. **Not** Phase 2 continent/coastline geography, cinematic re-staging or maritime gameplay.

## What now exists

| Module | Contract |
| --- | --- |
| `src/world-v2/WorldCoordinates.ts` | Global double-precision X/Y/Z with +Y up and -Z north; negative-safe cell index, world-cell corner, local render-origin rebasing. |
| `WorldIdentity.ts` | UTF-8 FNV-1a hashing, namespaced deterministic seeds, stable cell/entity IDs independent of stream order. |
| `WorldAtlas.ts` | Immutable/versioned atlas manifest, sorted landmass reservation envelopes, stable per-landmass sub-seeds, content hash and strict story-anchor lookup/validation. |
| `WorldTerrain.ts` | Provisional low-gradient heightfield in continuous world space; shared cell edge samples are identical. No fake roads or pre-imposed wander boundary. |
| `WorldCellStreamer.ts` | Active/warm cells and forward prefetch, fixed concurrency and per-update load budgets, resource unload and stale async result cancellation. |
| `world-v2-lab.html` | Separate in-browser isometric terrain-streaming test area with keyboard and simple touch movement. The default `index.html` and existing Hearthmere gameplay are untouched. |

### Essential distinction: canonical atlas *contract* vs published world

The atlas schema and seed partitioning can be implemented now, **without knowing exact continent shapes or Hearthmere's replacement coordinates**. The tests and lab use deliberately named sample regions and sample anchors such as `lab.arrival`. Those are **not** final geography; no new story landmark location is approved or published by this PR.

A real world atlas will have an immutable published world ID/seed/version, landmass reservations and story anchors. The Phase 2 generator/bake pipeline is responsible for real shapes, terrain altitude, biomes, rivers, coastline validation and authored/cinematic placement constraints. An island added later must not change the seeds or anchors of previously published regions. World V2 saves will have a fresh namespace (D165); no prototype save migration is planned.

### Map/streaming invariants

- Cell indexing uses `Math.floor` and works for positive and negative world-space locations.
- A cell's vertex samples derive from **global X/Z**, not `cellSeed + local random calls`. Grid edges are identical even when built and streamed in a different order.
- Global coordinates are authoritative. Render-local `THREE` coordinates are disposable and must not be serialized to save files.
- `WorldCellStreamer` owns *only* memory/residency and release callbacks; it does not decide where players may walk or where quests belong.
- Named narrative anchors are not waypoint indices. The registry errors on missing references and invalid positions.
- `contentHash` fingerprints the normalized full manifest. Per-landmass seed identity is stable even when other landmasses are introduced.
- The placeholder height field is deliberately not canon. Its `64`-unit lab cells, noise scales and sample heights are strictly QA tunables, not approved world-design measurements.

## How to verify

```bash
npm ci
npm run build
npm test
npm run audit:world
npm run test:browser
npm run dev
```

Visit **`http://localhost:5173/world-v2-lab.html`** and walk across several cell boundaries (WASD / arrows, Shift to move faster; on narrow screens, use the on-screen D-pad). Verify no cracks or pauses caused by cell transitions, then steer back to check cell resources are unloaded and regenerated consistently. The top-left overlay prints global X/Z, current cell and loaded count. `/index.html` still starts the current Hearthmere experience.

The lab's visuals are only a placeholder surface with debug markers. They intentionally do **not** represent actual continents, oceans, towns or a finalized camera.

## Tests and exit criteria

`tests/worldV2Kernel.test.ts` checks pinned hash identity; unambiguous namespace seeds; negative/seam coordinate mapping; render-origin round-trip; manifest sorting/order-independent hash; stable old island seeds after append; anchor validation; repeatable world-space heightfield generation; exact E/W and N/S seams; warmed/active residency; move/cancel/unload lifecycle; and traversal across multiple cells.

**Phase 1 entry gate:** world kernel and lab build and test; existing Hearthmere engine tests and three-role Chrome smoke remain green; dependency audit preserves pure-module boundaries. Browser QA of the actual lab and physical device profiling are needed before using the architecture as the default game world.

**Phase 1 final integration gate:** a development-mode live adapter can be exercised end-to-end; terrain height/collision and AI nav will be handled as those services become real. Do not claim full seamless 3D physics/cinematic compatibility from a heightfield demonstration.

## Next tickets

1. Freeze minimal adapter interfaces between GameEngine and World V2 streaming/navigation/anchors without importing the legacy route generator.
2. Build a deterministic offline world compiler for published atlas manifests and terrain cells, with reproducible artifact checksums and validation reports.
3. Implement actual continent and island masks, shoreline/water boundaries, terrain normals/collision, and narrative constraints (Phase 2).
4. Stage Hearthmere from semantic anchors in the new world, preserving assets/quest beats while freely changing layout and cinematics (Phase 3).
5. Implement new V2 save/resume and ships/ocean traversal only after the world identity and cell systems are established (Phase 4).

This specification is an implementation report, **not** a claim that the Phase 2–5 game is already playable.
