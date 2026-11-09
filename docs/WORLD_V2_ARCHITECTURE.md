# Astral Chronicles — World Architecture V2

**Status:** Product direction locked 2026-11-08. Phase 1 platform is complete; Phase 2's [geography](WORLD_V2_PHASE2_GEOGRAPHY.md) now has a [functional staging runtime](WORLD_V2_PHASE2_RUNTIME.md): full bounded atlas pages, actual bare-terrain collision, baked walkability/nav paths, and native close gameplay camera. **The five-landmass staging map and Hearthmere replacement coordinates are NOT approved final canon.** Production story integration, ships and iPhone performance profiling remain later phases.  
**Authority:** Latest explicit user-approved direction → [decision register](WORLD_V2_DECISIONS.md) and underlying [DESIGN_DIRECTION.md](DESIGN_DIRECTION.md) → this architecture → relevant story briefs. **Implementation evidence:** [current source/status matrix](WORLD_V2_STATUS.md); [Phase 3 next handoff](WORLD_V2_PHASE3_HANDOFF.md).  
**Execution:** [Phase 0 audit and preservation register](WORLD_V2_PHASE0_AUDIT.md) → [production roadmap](PRODUCTION_ROADMAP.md).

## 1. Product decisions — locked

These are user decisions, not inferred implementation details:

1. Replace the underlying path-/waypoint-driven world architecture with a **procedural-first open world**. Roads are navigational features; waypoints must not define the limits of terrain or exploration.
2. Produce **one canonical, deterministic geographical world shared by all playthroughs**. A player's choices alter their own world state, not the canonical landmass layout.
3. Generate **multiple continents and islands**, including fully explorable oceans. Retain fixed, stable locations for major story destinations within the approved canonical atlas.
4. Support **player-controlled ships**, freely navigable waters and **optional fast travel**.
5. Make sailing **responsive and action-RPG-like**, not a mandatory wind/sail-management simulation.
6. Keep the **isometric gameplay camera at sea**, smoothly widened to show more surroundings while sailing.
7. Allow disembarkation **anywhere physically accessible along the coastline**; do not limit landing to author-placed markers or docks.
8. Persist owned ships at their actual world locations, with **recovery services at ports and shipyards**. Fast travel does not implicitly relocate a ship.
9. **Hearthmere may be structurally and spatially rebuilt.** Existing asset and quest/story functionality must survive, but streets, bridges, terrain, placements, enemy arenas, path, and cinematic staging may be extensively redesigned. Prior local X/Z coordinates are not canonical anchors.
10. Keep the established story, cast, isometric gameplay identity, strong anime/cel-shaded art direction, and mobile-browser-first delivery. The **60 FPS iPhone 14 Pro** performance requirement remains a target to measure, not a demonstrated result.
11. **No migration of prior Hearthmere/prototype saves is required (D165).** World V2 may establish a clean save namespace for the rebuilt adventure. Do not destructively erase unrelated old browser storage; preserve new World V2 save/resume behavior once implemented.

The generated world is not required to preserve player-specific legacy world seeds. Those belong to the old prototype. Core geography should be consistent across saves; state can diverge through story decisions.

## 2. Boundaries: confirmed versus proposed

**Locked product behavior:** Section 1 and existing story/quest continuity.  
**Implemented engineering:** The atlas identity/anchor/coordinate interfaces, tile/page schemas, offline compiler, streamer, surface and navigation owners are **real staged code**—see [status and source pointers](WORLD_V2_STATUS.md). Their current numbers, algorithm choices and sample places are **not additional user-approved game mechanics**. New/future interfaces described in this document remain proposals unless source/tests verify them.  
**Not decided:** Atlas extent, exact number or shape of landmasses, sailing speeds, vessel roster, ship condition/repair economy, recovery fees, ocean combat, currents, underwater gameplay, biome catalog, water simulation details, ports, travel costs, and the final Hearthmere geography.

Procedural-first means the system determines most geography and environmental placement from canonical constraints; it does **not** mean randomizing story-critical settings, quest beats, or important characters each time a save loads.

## 3. Authority and ownership model

| Owner | Owns | Must not own |
| --- | --- | --- |
| World Atlas / World Definition | Canonical seed, landmass geometry, global coordinates, canonical story anchors, world-data version | Save-specific quest outcomes |
| Offline World Builder | Constraints, geography, hydrology, biomes, roads, cell baking, validation | Live browser quest progress |
| World Runtime / Streamer | Cell lifecycle, streaming priority, asset residency, world-origin rebasing | Re-rolling world geography |
| Terrain / Navigation | Ground sampling, slopes, waterline, collision, traversability, navigation overlays | Hardcoded quest progression |
| Spawn / Population | Stable spawn IDs, procedural distribution, simulation activation | Character equipment and narrative choices |
| Quest & Cinematic Runtime | Stable beats, actions, trigger semantics, camera staging, persistent story flags | Owning terrain mesh coordinates |
| Player / Ship Runtime | Character and vessel controls, movement, buoyancy approximation, boarding, disembarking | World generation |
| Save/World State | Quest state, discovered items, unique actors, ship IDs and locations, versioned V2 saves | Serialization of entire generated meshes |
| Map/Minimap | Presentation of authoritative world data and discovered markers | Its own invented route geometry |

**Dependency direction:** world definition → generated data → runtime spatial services → gameplay and presentation. Quests resolve location IDs through an anchor service. Navigation and physics consume terrain/collision services. No UI or quest module should import the procedural path generator to determine where the player can walk.

No giant `GameEngine` replacement in one commit. Introduce small interfaces and move ownership incrementally, preserving a runnable app at every phase gate.

## 4. Canonical atlas and stable identifiers (proposed)

Use a global coordinate frame spanning continents, islands and ocean; a local floating origin for rendering avoids GPU precision loss during long voyages. Do not serialize local/rebased graphics coordinates as global positions.

**Use actual exported runtime types, not an outdated pseudocode manifest.** The current implemented contracts are:

| Contract | Authoritative source | Notes |
| --- | --- | --- |
| `AtlasDefinition`, `WorldAtlasManifest` | [`src/world-v2/WorldAtlas.ts`](../src/world-v2/WorldAtlas.ts) | Versioned ID/seed/generator, `cellSize`, landmass envelopes, embedded named anchors and normalized `contentHash`. A landmass envelope is a reservation, **not** a final coastline. |
| `StoryAnchorDeclaration`, `StoryAnchorRegistry` | [`WorldAtlas.ts`](../src/world-v2/WorldAtlas.ts) | Semantic ID, landmass, world position, clearance and connectivity; current sample IDs are not approved. |
| `WorldPosition`, `WorldCellCoordinate` | [`WorldCoordinates.ts`](../src/world-v2/WorldCoordinates.ts) | JS-double global X/Y/Z, negative-safe indexing and render-local rebasing. |
| `CompiledAtlasIndex`, `CompiledPageReference`, `CompiledCell` | [`WorldArtifacts.ts`](../src/world-v2/WorldArtifacts.ts) | SHA-verified page and tile references; `geography-stage-v1` is an engineering profile, not a published canonical map. |
| World/entity ID generation | [`WorldIdentity.ts`](../src/world-v2/WorldIdentity.ts) | Deterministic namespaced identifiers; no load-order or mutable-array-index identity. |

The **future published canonical atlas** will require an explicit seed/version/expansion compatibility policy. Do not copy old proposed `anchorsRef` / `cellCatalogRef` fields into a second competing schema; the current code embeds `anchors` and uses compiled catalog references.

- Generate landmasses from independent, stable sub-seeds. Adding islands/continents must **not** reroll existing geometry or change established anchor IDs.
- Publish data/versioned cell assets from a development-side world build, then **stream precomputed content** to browsers. Client-side procedural detail is permitted only when it is deterministic and inexpensive.
- Each authored story anchor has an ID, acceptable terrain/grade envelope, access requirements, cinematic staging footprint, collision clearance, and relationship to other anchors. Its final coordinates may differ from those in the current Hearthmere prototype but are **fixed once the atlas version is published**.
- Determinism applies to source data, placement, IDs, and collision, not just visible art. Avoid random-number streams dependent on loading order.
- Published world manifest changes require validation and a deliberate **World V2 compatibility/version policy**; never regenerate an already-published continent in place with a silent seed change. This does not require importing old prototype saves.
- Keep a reproducible world-build command, seed fixture, artifact checksums, and a QA preview capable of jumping to any cell or anchor.

## 5. Procedural build pipeline (proposed order)

1. **Input constraints:** canonical seed, locked landmarks, narrative regions, coastline/port requirements, traversal needs, target biome variety, exclusion zones.
2. **Atlas geography:** continental masks, islands/archipelagos, ocean floor, coarse relief, mountain systems, continental shelves.
3. **Terrain shaping:** continuous elevation, valleys, slopes, cliff bands, erosion-inspired shaping, shoreline gradients.
4. **Hydrology and climate:** drainages and river/lake networks derived from terrain, rainfall/temperature fields, climate transitions. Feed validation failures back to terrain shaping.
5. **Anchor constraint solving:** reserve and reshape terrain around major settlements, opening scenes, dungeon entrances, boss arenas and cinematic viewpoints; verify suitable access from adjacent areas.
6. **Navigation network:** roads, trails, bridges and maritime approaches routed through the **geography**, not the other way around. Natural obstacles can require detours or deliberate authored traversal abilities.
7. **Ecology and world population:** biome vegetation, props, resource nodes, ruins, wildlife, optional sites and enemy distributions. Stable placement rules and bounds must reserve gameplay sightlines and landing clearance.
8. **Bake and validate:** seam-safe mesh and collision cells, multiresolution LODs, proxy silhouettes, navigation links, spatial indexes, atlas/minimap representations, hashes and debug reports.

The pipeline can iterate between stages as necessary; it must never silently accept an inaccessible required quest location or impassable sea route. Fail the build with actionable diagnostics.

## 6. World streaming, terrain and gameplay

**Streaming:** Start with active near cells, lower-detail neighboring cells, and unloaded/distant proxy geography. Use view direction and **ship speed** to prefetch ahead; avoid mass synchronous mesh/physics creation on a frame. Instrument load hitches, draw calls, GPU memory and CPU budget. Cell dimension candidates (e.g. 64–128 world units) are hypotheses for benchmarking, **not chosen values**.

**Terrain/movement:** Replace road/circle walkability as the default. Use actual elevation, ground height and normal sampling, slope limits, obstacle collision and water interfaces. Character position must no longer be reset to `y=0` by general movement code. Adjacent collision and navigation cells must share matching boundaries. Both players and AI companions require valid paths when cells are loaded or unloading.

**Ocean:** Water and seabed use the same global spatial model. Ship movement and buoyancy samples are separate from visual wave rendering; do not require expensive fluid simulation for controls. Ships handle collision with rocks, shallow water, structures and coastline. Validate disembarkation against vessel draft, shore grade and a safe traversable arrival point, not a preauthored landing marker.

**Ship world state:** Persistent, owner-scoped vessel ID, canonical coordinates/rotation, vehicle configuration and any supported condition fields. A distant ship becomes cheap logical state rather than a continuously simulated model. Port recovery transfers the **same identity** atomically to a valid berth, avoiding duplication or loss. Prices and restrictions are undecided.

**Maps:** The present mini-map renders a top-down view of the actual nearby 3D scene (PR #2, now merged). This is an interim display solution; evaluate atlas-derived map tiles/overlays to avoid frequent GPU readbacks on mobile and keep shorelines, roads and discoveries consistent with authoritative geography.

## 7. Hearthmere re-staging contract

**Preserve behavior, not positions.** Existing scene files, casts, rigs, animations, VFX, dialogue, opening milestones, rescue/escort, retreat/defeat and saving are reusable inputs. Town, bridge, roadway, relief, shelter, giant staging, sightlines and camera shots may all move.

**Narrative anchors** should be referenced by stable names such as `hearthmere.waystation`, `hearthmere.mara_meeting`, `hearthmere.rowan_cart`, `hearthmere.shipment_square`, `hearthmere.giant_approach`, `hearthmere.escape_crossing` and `hearthmere.refuge`. These IDs are examples until the anchor catalog is authored. Quest objectives resolve them at runtime. Use authored transforms and scenario constraints for cameras/actors rather than source-level magic numbers.

**Continuity gate:** arrival → Mara/Rowan interactions → shipment → crisis and giant encounter → civilian rescue/escort → refuge must remain functional for all three heroes. The giant survives; the town is occupied afterward. Relevant persistent decisions and subsequent liberation/defense setup must not be lost. Existing assets can be retargeted; visual/cinematic improvements are encouraged.

**Fresh World V2 saves (D165):** We are **not migrating legacy Hearthmere saves** or preserving their X/Z positions. Implement a new, versioned save namespace when World V2 enters production, with its own reliable checkpoint/backup behavior. Existing v1 snapshots may remain untouched in local storage but are not a compatibility requirement. Keep current save/resume working **until the replacement is ready**; never silently overwrite the old keys as a side effect of the rebuild.

## 8. Phase plan and hard gates

| Phase | Scope | Exit gate |
| --- | --- | --- |
| **0 — Legacy audit and isolation** | Inventory current/legacy systems, preservation register, save contracts, test matrix; extract shared functionality from retired modules without changing experience | Clear dependency and risk map, baseline tests/build automated, no known lost Hearthmere stories or assets |
| **1 — Canonical world kernel (engineering complete)** | Seed/versioned atlas, global coordinates, semantic anchors, cancellable cell streaming, repeatable offline preview bake and GameEngine opt-in port | Deterministic manifest and tile data, 2,448 validated seam vertices, byte-stable reverse-order bake, browser HTTP-baked-cell traversal, regression and engine-port tests; **real world geography is Phase 2** |
| **2 — Geography + ground-navigation runtime (staging engineering complete)** | Two-continent/three-island staging atlas, real land/sea heights, biomes/rivers/roads, **4,608 baked cells in 72 SHA-verified pages**, native gameplay perspective, triangle-exact ground probes, slope/river/sea walkability, cross-cell A* and shore access probes | Byte-repeatable complete staging extent, 154,224 seam vertices, real browser grounded movement and path tests; **canonical shape approval, advanced hydrology/bridges/scene collision, final LOD/performance and actual Hearthmere relocation remain open** |
| **3 — Hearthmere re-staging** | Rebuild town and surroundings on V2; rebind NPCs, objectives, combat and cinematics by anchor | All three opening roles reach refuge and later story continuity remains valid; travel is continuous |
| **4 — Persistence + maritime traversal** | New V2 save schema, world-state deltas, ownership, ships, free coastal landing, recovery, fast travel | Land → ship → island → land → ship → reload and recover without duplication or lost V2 state |
| **5 — Performance + authoring** | Mobile stress testing, LODs, instance batching, editor/debug tools and continent expansion workflow | Measured device gates, deterministic world-build checks and repeatable new-region creation |

**Phase 0 engineering audit is complete:** see [WORLD_V2_PHASE0_AUDIT.md](WORLD_V2_PHASE0_AUDIT.md) and the [source dependency inventory](WORLD_V2_DEPENDENCY_INVENTORY.md). Hardware performance and full visual re-staging checks belong to later phases. Do not use the old procedural path tests as the definition of the new world's expected topology. Retain them as compatibility tests until retired modules are safely isolated.

## 9. Engineering quality and verification gates

- TypeScript production build and full Vitest suite required for every PR; CI does not replace browser and physical-device testing.
- Deterministic source-world snapshots and stable-ID/hash checks, including build-order independence and adding a new landmass.
- Terrain/collision and pathfinding seam tests; safe character and companion movement over elevation, water boundaries, bridges and steep coasts.
- Fixed story-anchor and cinematic-clearance validation on the canonical world; no quest logic tied to waypoint array indices.
- A multi-role Hearthmere opening acceptance run, including cinematic skip, defeat, interruption, and **new World V2 save/resume**. No legacy-save migration test is required.
- Maritime tests for free-landing validity, ship state unload/reload, remote recovery atomicity and fast-travel nonrelocation.
- On-device iPhone 14 Pro profiling for sustained 60 FPS during urban traversal, combat, seam crossing and sailing. Record frame-time distribution, memory, jank, renderer and network metrics; do not claim this target has passed before real measurements.
- Document accepted changes, debug artifacts, fixtures, rollback path and any unresolved performance/creative questions in each PR.

## 10. Next handoff

**Immediate:** Start the [Phase 3 integration sequence](WORLD_V2_PHASE3_HANDOFF.md) with proposed semantic anchor plans and an opt-in V2 story entrypoint; review the intended world layout with the user before publishing a canonical atlas. Connect existing Hearthmere assets and quest milestones without relying on old positions. The paged/ground-navigation implementation is available for that integration. The old playable Hearthmere remains intact until migration. **Legacy save migration is out of scope**.  
**Next code task:** Author the confirmed world/anchor blueprint and integrate the live hero, companions and quest encounters against V2 terrain/anchors without hardcoded old route positions. Keep physics overhangs, authored obstacles, LOD/mobile profiling and ship controls as explicit follow-up gates rather than silently claiming them shipped.  
**No destructive cleanup** until the replacement entrypoint and scenario tests pass. Retirement of old modules requires removing live imports and preserving Hearthmere assets/quest behavior, **not** old-save migration.

References: [GameEngine](../src/game/GameEngine.ts), [HearthmereOpening](../src/game/HearthmereOpening.ts), [HearthmereScenery](../src/rendering/HearthmereScenery.ts), [HearthmereSave](../src/persistence/HearthmereSave.ts), [ProceduralPathGenerator](../src/game/ProceduralPathGenerator.ts), [ChronicleWorld](../src/game/ChronicleWorld.ts).
