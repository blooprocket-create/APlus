# World V2 Phase 1 — kernel implementation and QA

**Status:** **Phase 1 engineering foundation implemented** through [PR #4](https://github.com/blooprocket-create/APlus/pull/4) and [PR #5](https://github.com/blooprocket-create/APlus/pull/5). The new atlas build/streaming path is running in an isolated lab, and GameEngine has a deliberate opt-in port; today's Hearthmere entrypoint still uses its existing world.  
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
| `WorldPreviewAtlas.ts` | Shared **noncanonical** atlas fixture used by the offline compiler and browser lab; not a final Hearthmere/continent coordinate assignment. |
| `WorldArtifacts.ts` | Versioned atlas index and compiled cell types; reject invalid/duplicated/stale IDs, heights, anchors and paths. Cell generation fingerprints remain stable when another island is added. |
| `WorldV2GameplayBridge.ts` | Browser HTTP source loads only catalogued tiles, checks SHA-256 against the index, rejects stale data, and exposes a generic, non-Three.js gameplay port for anchor lookup and streaming. |
| `tools/world-v2-compile.mjs` | Reproducible development-side terrain bake using the **same TypeScript world kernel**, with normal/reversed order verification, seam validation and a deterministic build report. |
| `GameEngine.attachWorldV2Port()` | Optional update/lifetime seam; never activates for the current Hearthmere path unless explicitly attached by a future World V2 session. |

### Essential distinction: canonical atlas *contract* vs published world

The atlas schema and seed partitioning can be implemented now, **without knowing exact continent shapes or Hearthmere's replacement coordinates**. The tests and lab use deliberately named sample regions and sample anchors such as `lab.arrival`. Those are **not** final geography; no new story landmark location is approved or published by this PR.

A real world atlas will have an immutable published world ID/seed/version, landmass reservations and story anchors. The Phase 2 generator/bake pipeline is responsible for real shapes, terrain altitude, biomes, rivers, coastline validation and authored/cinematic placement constraints. An island added later must not change the seeds or anchors of previously published regions. World V2 saves will have a fresh namespace (D165); no prototype save migration is planned.

### Map/streaming invariants

- Cell indexing uses `Math.floor` and works for positive and negative world-space locations.
- A cell's vertex samples derive from **global X/Z**, not `cellSeed + local random calls`. Grid edges are identical even when built and streamed in a different order.
- Global coordinates are authoritative. Render-local `THREE` coordinates are disposable and must not be serialized to save files.
- `WorldCellStreamer` owns *only* memory/residency and release callbacks; it does not decide where players may walk or where quests belong.
- Named narrative anchors are not waypoint indices. The registry errors on missing references and invalid positions.
- `contentHash` fingerprints the normalized full manifest. Per-landmass seed identity is stable even when other landmasses are introduced. **Compiled cell payloads use a separate generation fingerprint** (world ID, seed, generator version, dimensions), so appending an island changes the atlas catalog but does not change existing tiles' bytes.
- The placeholder height field is deliberately not canon. Its `64`-unit lab cells, noise scales and sample heights are strictly QA tunables, not approved world-design measurements.

## How to verify

```bash
npm ci
npm run build                 # prebuild bakes 81 preview tiles
npm run world:bake:verify     # check byte-for-byte repeatability
npm run world:bake:verify -- --reverse  # order-independent output
npm test
npm run audit:world
npm run test:browser          # real Chrome tests 3 heroes + baked-tile lab
npm run dev
```

Visit **`http://localhost:5173/world-v2-lab.html`** and walk across several cell boundaries (WASD / arrows, Shift to move faster; on narrow screens, use the on-screen D-pad). Verify no cracks or pauses caused by cell transitions, then steer back to check cell resources are unloaded and regenerated consistently. The top-left overlay prints global X/Z, current cell and loaded count. `/index.html` still starts the current Hearthmere experience.

The browser now **fetches precompiled, checksummed JSON** from `/world-v2/preview/atlas-index.json` and `/world-v2/preview/cells/0/<x>/<z>.json` instead of generating tiles on the client. The 9×9 (81-cell) lab bake and its 64-unit cells are limited QA coverage, not the world extent or final terrain resolution. Attempts to stream outside the published preview catalog are ignored rather than endlessly generating missing tiles. The compiler also writes `validation-report.json` (including checked seam vertices) as a reproducible build artifact.

The lab's visuals are only a placeholder surface with debug markers. They intentionally do **not** represent actual continents, oceans, towns, ships or a finalized camera.

## Tests and exit criteria

`tests/worldV2Kernel.test.ts` checks pinned hash identity; unambiguous namespace seeds; negative/seam coordinate mapping; render-origin round-trip; manifest sorting/order-independent hash; stable old island seeds after append; anchor validation; repeatable world-space heightfield generation; exact E/W and N/S seams; warmed/active residency; move/cancel/unload lifecycle; and traversal across multiple cells.

**Verified entry gate:** [GitHub Actions run 42534133670](https://github.com/blooprocket-create/APlus/actions/runs/42534133670) passed TypeScript/Vite production build, **141/141 Vitest tests (18 files)**, full dependency audit (zero unresolved imports or protected-boundary violations), **three-role Hearthmere Chrome launch**, and a **real Chrome test that moved across the lab's negative-X cell boundary** (X ≈ −25, loaded cells 25, failures 0). The CI run uploads per-hero and lab screenshots. The PR's Vercel preview also reached READY status. This is evidence for the prototype kernel only, **not** final world geography or an iPhone FPS benchmark.

**Phase 1 integration gate (engineering):** The separate development-mode lab exercises the real offline bake → versioned catalog → SHA-256-validated cell fetch → `WorldV2GameplayBridge` → active/warm residency → Three.js meshes end-to-end. The engine consumes the same `WorldV2GameplayPort` through a non-default opt-in interface. CI includes a real Chrome network check proving compiled JSON tiles were fetched. **No full production-Hearthmere integration, terrain collider replacement, AI navigation, final geography, ships or iPhone FPS verification is claimed**; those are later phase gates.

## Next tickets

1. **Phase 2:** Replace the preview landmass reservation envelopes with canonical continental and island shapes; generate coastlines, real elevations, rivers, climate, biomes, and traversable approaches. Keep published region seeds and semantic anchor identities immutable once a real atlas is released.
2. **Phase 2:** Evolve the compiler from a 9×9 demonstration bake into geographically paged cell/LOD catalogs with terrain collision and navigation overlays; validate story-anchor clearances, river continuity, shoreline safety and cell seams.
3. **Phase 3:** Switch the production gameplay session to V2 through the opt-in GameEngine port; re-stage Hearthmere's story and assets against semantic anchors without preserving the old geometry.
4. **Phase 4:** Implement clean-namespace V2 save/resume plus persistent vessels, free shoreline landing, port recovery and optional fast travel (no legacy save migration).
5. **Phase 5:** Measure the renderer, cell-stream hitching and memory on real iPhone 14 Pro hardware and meet the agreed performance budget.

This specification is an implementation report, **not** a claim that the Phase 2–5 game is already playable.

## Phase 1 completion evidence

- **Offline compiler:** `npm run build` invokes the compiler before Vite. It generated 81 placeholder terrain cells, a versioned atlas index, per-cell SHA-256 checksums and a deterministic seam report. The normal and `--reverse` verification passes prove byte-for-byte build-order stability.
- **Seam validation:** The compiler checks every adjacent border vertex in the preview patch (2,448 shared-edge comparisons), with zero differences. The output cannot publish if a seam mismatch is detected.
- **Regression:** Phase 0's three Hearthmere hero browser startups remain supported. The existing game does not load, change or migrate legacy player saves through the V2 demo.
- **New tests:** `tests/worldV2BakedArtifacts.test.ts` verifies catalog integrity, byte-level tamper detection, safe coordinate conversion, step-free height interpolation, bridge loading and cleanup, and that adding an island does **not** alter already-generated cell bytes. `tests/worldV2EnginePort.test.ts` verifies port attachment/ownership is opt-in and disposed correctly.
- **Browser proof:** The smoke runner enters the lab, loads baked tiles from HTTP, moves into the negative-X neighbor and fails if compiled-cell network traffic is absent or a cell load fails.
- **Known non-goals:** The preview atlas is **not** the canonical published continent dataset. No physical iPhone benchmark, navigation mesh, production terrain collision, world-state saving, ocean/ship system, or reimagined Hearthmere is implemented by Phase 1.

With the final verified build/test/Chrome checks, **Phase 1 is complete as the deterministic world-platform and offline-streaming foundation. Phase 2 owns actual geography and landmass authoring.**
