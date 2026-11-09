# World V2 Phase 2 — Functional terrain, navigation and full staging atlas

**Status:** Engineering milestone in [PR #9](https://github.com/blooprocket-create/APlus/pull/9). The **complete finite staging atlas** is baked and streamable, the geography lab uses native gameplay camera framing and collision-safe walking, and pathfinding uses the same actual terrain. **This is still staging geography:** the user has not approved its final landmass shapes, coordinates, continental scale or new Hearthmere composition.

**Principle:** *Functional open world first; environmental polish later.* No new stock art, no quest relocation or legacy save migration. The currently playable Hearthmere opening remains the default route in `index.html`.

## Functional changes

| Feature | Source / invariants |
| --- | --- |
| **Native camera** | `IsometricCamera.GAMEPLAY_CAMERA_OFFSET` centralizes the live game offset (0, 14.5, 13.5) and Phase 2's lab uses the *same perspective controller/FOV* rather than an aerial orthographic camera 54 units above the terrain. Focus is at actual terrain Y; test screenshots and live walking must not keep the camera at Y=0 after entering a raised landmark. The 11-shot gallery is still for inspection. |
| **Ground collision** | `WorldSurface.sampleGroundTriangle` samples the exact two-triangle diagonal used by Three.js PlaneGeometry; unlike bilinear height interpolation, feet/ground normals agree with the rendered mesh. It returns canonical X/Y/Z, ground normal and slope, biome, road, water type and level. |
| **Free walking, not waypoint restriction** | `WorldSurface.traverseTerrain` sweeps real movement increments over terrain; prevents entry into unstreamed cells, sea/unsafe river water, steep slopes and overlarge rises, with axis sliding on blocked diagonals. It **never** resets Y to zero as a movement fallback. |
| **Baked navigation** | `WorldNavigation.bakeTerrainNavigation` generates a deterministic 16×16 walkable byte mask per 64-unit staging tile. Versioned cell artifacts carry validated navigation data alongside height, biomes, water and roads. |
| **AI pathfinding service** | `WorldNavigation.findTerrainPath` runs budgeted 8-way A* across tile boundaries, with no diagonal corner cutting; it probes actual swept terrain between node centers. Returns `complete`, `awaiting-cells`, `unreachable` or `budget-exhausted` rather than treating unloaded ocean as navigable. The service can later be invoked for NPCs and companions. Right-click in the geography lab to visualize an available-ground route. |
| **Future free shoreline landing** | `WorldNavigation.findShoreApproach` probes any accessible coast for a gentle transition from water to walkable land; no port/dock waypoints. This is a **shore accessibility service**, not a ship controller, actual embarkation or buoyancy implementation. |
| **Complete staging atlas coverage** | `tools/world-v2-compile.mjs --geography` derives finite geography bounds from **all** staging landmass reservation envelopes, adds an ocean margin, aligns them to complete 8×8 pages, bakes **4,608 tiles in 72 pages** with water, terrain and nav masks, and verifies byte identity for normal/reversed cell generation order. The former five disconnected 302-cell patches are no longer the streaming limit. |
| **Small, lazy page discovery** | The root `atlas-index.json` includes page IDs and SHA-256 digests. `WorldV2ArtifactSource` fetches a page manifest only when a nearby cell is wanted; concurrent tile requests reuse the same page fetch. Each actual cell JSON is separately SHA-256-checked, dimension/slope/geometry/nav validated and can be unloaded independently. Direct Phase 1 cell catalogs remain supported. |
| **Actual browser QA** | The standard Chrome smoke still launches all three existing Hearthmere heroes, checks Phase 1's legacy lab, and checks the Phase 2 lab's native perspective/distance, correct terrain Y, page network fetch, WASD walking on dry land, local pathfinding and island→ocean inspection jump. |

## Reproducible checks

```bash
npm ci
npm run build                    # complete staging geography bake + game build
npm run world:geo:verify        # match all 4,608 cell/page byte checksums
npm run world:geo:verify -- --reverse
npm test                        # World V2 surface/nav/page tests + current game
npm run test:browser            # actual Chrome entrypoint & ground/nav QA
npm run test:visual             # 11 camera screenshots, no model-generated art
npm run audit:world
```

Try `/world-v2-geography.html` for a **closer** camera, WASD/arrow movement (Shift faster), right-click route diagnostics, or the separate QA jump controls. A jump to open ocean is intentionally a **spectator inspection position**, not a demonstration that a hero can walk on the ocean. Walking into water or unloaded cells is blocked. Only the existing story game at `/index.html` executes quests.

## What Phase 2 can and cannot claim

**Engineering functions verified in the staging lab:** deterministic geography and seamless cell borders; complete finite atlas artifact generation; on-demand paged streaming; terrain surface/collision rules; grounded hero movement; accessible-dry-land pathfinding; shore access probes; headless regression and visual screenshot recording.

**Still open before a user-approved canonical world / Phase 3 migration:** choose/lock actual continent and island geography and future Hearthmere anchor layout; physical hero/NPC integration with animation, combat, quest triggers and authored obstacles (Phase 3); robust crossing/tributary/lake and overhang/bridge design; richer material/decoration and distant LOD proxies; quantitative performance profiling on the target iPhone 14 Pro. Phase 4 implements player-controlled persistent ships and free-landing gameplay using the now-available shoreline probe.

**No claim of a finalized world atlas is implied by passing 4,608 cells.** Changing the staged map before approval is safe; when a true canonical atlas is published, its world ID, version and protected region seeds must remain stable.

## Acceptance / known risks

- Heightfield collision handles bare terrain and water; it does **not** yet collision-test buildings, dynamic scenery, bridges, overhangs or other authored gameplay meshes. Those require an integrated physics query layer.
- A* pathfinding searches loaded nav tiles; it reports `awaiting-cells` when the route would require unloaded ground. Long-distance cross-continent routes need a higher-level hierarchical/path request and streaming plan—not a synchronous A* across 4,608 tiles.
- Warm cells currently load the same geometry as active cells; true lower-poly LOD/geographical silhouettes remain a performance milestone, not silently assumed shipped.
- Camera distance is locked to the existing perspective; terrain-aware occlusion and smoothing may need further integration and review in Phase 3, especially around steep cliffs.
- The complete staging atlas is finite with a two-cell ocean margin. It is not infinite terrain or an assertion that all future expansions already exist.

**Next handoff:** approve world geography/story anchor constraints, then Phase 3 begins actual Hearthmere re-staging on the now-functional terrain/streaming/collision systems. Production graphics can be improved after the main functional world is proven.
