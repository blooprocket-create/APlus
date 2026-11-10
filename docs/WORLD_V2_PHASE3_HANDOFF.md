# Astral Chronicles — Phase 3 agent handoff: Hearthmere on World V2

**2026-11-09 parallel art scope:** the owner requested an isolated [visual pipeline investigation](OBSERVATORY_ATELIER.md). It uses the existing internal combat fixture, not the V2 story page; no additional opening beat is migrated. Phase 3 gates below are unchanged.

The continued art branch adds original reconstruction/paint sources, reversible
rig fitting, a marker-linked performance and configurable bounds on that same
fixture. It does not add a world/physics/save owner or approve any new atlas
geography. The current test suite has 189 passing tests; art acceptance remains
a separate screenshot/gameplay review.


**Status:** **IN PROGRESS** via the first opt-in arrival integration [PR #11](https://github.com/blooprocket-create/APlus/pull/11), documented in [Phase 3.0 progress](WORLD_V2_PHASE3_PROGRESS.md). Full campaign restaging, companion AI and V2 saving are **NOT implemented**. Baseline before work was merged [PR #9](https://github.com/blooprocket-create/APlus/pull/9). The World V2 terrain/navigation foundation exists; the **real game still launches its older Hearthmere scene**. Read [AGENTS.md](../AGENTS.md), [current status](WORLD_V2_STATUS.md), [user decisions](WORLD_V2_DECISIONS.md), [World V2 architecture](WORLD_V2_ARCHITECTURE.md) and the [Phase 0 legacy audit](WORLD_V2_PHASE0_AUDIT.md) before editing.

> **Priority change, 2026-11-08:** A new [Phase 2.5 — Gameplay & visual foundation convergence](WORLD_V2_PHASE2_5_GAMEPLAY_INTEGRATION.md) must pass before continuing 3.1–3.4. Phase 3.0's merged arrival demonstration remains intact. This Phase 3 document still defines the subsequent STORY/TOWN/CINEMATIC/SAVE work, but **not the prerequisite combat/animation/VFX migration**, which now has its own acceptance gate. The original Hearthmere art pipeline is a functional baseline, not the finished art-quality target (D166).\n\n## Goal

Make the **existing Hearthmere opening truly playable inside World V2**, from arrival through refuge, for any of the three hero choices, while keeping the user's freedom to rebuild the town into a more cinematic landscape. Reuse working assets, characters, quests, cutscene behaviors, dialogue, combat and companion AI; **replace positional/path-specific coupling rather than preserving old X/Z coordinates**.

This phase is **integration**, not a wholesale new game, not an optional static town showcase, not ship development, and not a late-stage graphics-polish sprint. Keep the existing `/index.html` working until the new session meets its full acceptance suite.

## Current code to inspect (not a claim that each module is already V2-compatible)

| Existing live owner | Current responsibility | Phase 3 treatment |
| --- | --- | --- |
| `src/game/HearthmereOpening.ts` + `HearthmereStory.ts` | 13-step current opening and progression flags | Preserve narrative identity and event ordering. Map triggers/camera/interaction points through named V2 anchors and scenario descriptors. |
| `src/game/GameEngine.ts` | Live player movement, combat, companions, opening state, old world branches; optional V2 port | Integrate a **V2 session path** behind an opt-in boundary. Do not duplicate combat calculations or replace the entire engine. |
| `src/rendering/HearthmereScenery.ts`, `HearthmereRefuge.ts` and `EnvironmentBuilder.ts` | Existing assets, collision assumptions, renderer, scenery/places | Reuse art and scene logic; author a new town layout relative to V2 terrain. Remove old flat/road assumptions only on the new path. |
| `src/rendering/CharacterMeshBuilder.ts`, `IsometricCamera.ts`, `PaintedWorldStyle.ts` | Real hero visuals and camera/art language | Retain close original isometric perspective and hero/companion visuals. Cinematic camera movements should use authored, anchored shots. |
| `src/persistence/HearthmereSave.ts` | Existing v1 save/resume | Keep v1 functioning for old entrypoint; create a **separate, versioned World V2 save** with fresh progress and checkpoint semantics. Never migrate/overwrite v1. |
| `src/world-v2/WorldAtlas.ts`, `WorldGeographyStage.ts` | Anchor schema and **noncanonical** location examples | Author a proposed narrative location plan; reserve footprints and connect objectives without converting current temporary coordinates into final canon. |
| `src/world-v2/WorldSurface.ts`, `WorldNavigation.ts` | Triangle-based ground/walkability, resident-cell A* | Provide terrain ground service to heroes/NPCs/companions; extend spatial collision for props/bridges/overhangs instead of bypassing with Y=0. |
| `src/world-v2/WorldCellStreamer.ts`, `WorldV2GameplayBridge.ts` | Streaming lifetime, checked atlas/cells and optional game port | Bind actor activation/scene resources to proper cell residency, with story-critical actor/objective/cinematic **pins**. |

## Implementation slices, in the order agents should attempt them

### 3.0 — baseline and the new entry point

**Started in PR #11:** `/world-v2-story.html` is a separate entrypoint with genuine role selection, a first terrain-grounded `arrival → market` interaction and shared script extraction. No later quest has been ported, no V2 progress is saved, and the companions have **visual formation follow only**. The existing game/Phase 2 geography lab remain independent. See [progress and evidence](WORLD_V2_PHASE3_PROGRESS.md).
- Re-run the existing **three-hero Hearthmere** browser smoke, build, tests and world dependency audit. Capture baseline saved flags, 13 opening step IDs, camera positions, NPC ownership and input/cutscene handoffs.
- Add a **clearly opt-in World V2 story entry/session**, not an immediate replacement for `/index.html`. Users must be able to return to the old opening while the migration is incomplete.
- Identify all hardcoded `Y=0`/waypoint/road/circle restrictions in the live opening, plus the exact owner and replacement seam; don't globally remove them for the legacy path.

**Gate:** Both entrypoints boot; zero shared mutable player/world state; no regressions in original opening or three-hero starts.

### 3.1 — semantic narrative map and location constraints
- Define **data-driven, stable names** for arrival, Mara meeting, Rowan/cart, shipment, crisis/giant, rescue, escape, refuge and any authored camera/timing locations. Names such as `hearthmere.giant_approach` in the existing architecture are **examples**, not approved final catalog entries.
- For each anchor, record a role, clearance radius, access/grade constraints, travel dependencies, streaming pins, scene/actor placements and cinematic viewing volume.
- Treat town layout, cliffs, valley, gates, roads, bridges and refuge position as **fresh proposals** for the new geography. Preserve quest functionality and story causality; do not freeze the lab's current `hearthmere.*` test coordinates or force narrative scenes onto flat generic pads.
- Validate safe access between every required beat, for all classes and companions, over **actual** V2 elevation/water/collision. Fail generation/scene validation when access is impossible.

**Gate:** Proposed stage graph and site constraints are inspectable and internally consistent; user/creative approval is still required before final atlas publication.

### 3.2 — one real playable vertical slice
- Spawn the selected **existing real character** on loaded World V2 ground, with original WASD/touch controls, camera, combat and companion roles.
- Use World V2 terrain height/normal/step/water queries as the authoritative bare-ground service on this session. Add the missing **world-object collider and bridge/overhang layer** where required; never fake traversability by turning off all collision.
- Port one representative interactive objective and NPC path, with exact event ownership and save-state boundaries. Avoid creating a second quest engine or new hero movement formulas.

**Gate:** All three roles can spawn, move over actual 3D terrain, collide correctly with water/obstacles, interact with a retained story beat and exit/re-enter the streamed scene without losing progress.

### 3.3 — scenario, companions, cinematics and world lifecycle
- Move remaining existing arrival → refuge scenes onto the site graph incrementally, keeping existing dialogue/cast/hero-specific behavior and not creating new story branches by default.
- Integrate existing NPC and two-companion navigation with the World V2 service. A* only searches **resident** terrain today; add a bounded path-request/prefetch plan when a quest crosses unloaded cells. Avoid false route failures or companions teleporting across sea/gaps.
- Keep story-critical actors/quest items/ongoing giant and escort scenes **pinned** against cell eviction; restore exact state after interruption and cinematic skip. Do not double-spawn actors from repeated cell activation.
- Retain player agency through live combat/rescue phases, correct giant escape rather than defeat, readable close isometric camera, and consistent camera handback after a cutscene.

**Gate:** All 13 original machine step IDs are identified and mapped; three heroes can complete opening; no lost/disappearing NPCs/companions during cell transitions; interruption/skip/defeat tests pass.

### 3.4 — new World V2 save/resume and guarded cutover
- Create a **new versioned World V2 save namespace**, with canonical world/anchor IDs, actor state and story progress; world-origin render offsets and generated meshes must not be serialized.
- Test fresh character start, save and resume mid-objective, cinematic skip, defeat retry, reload near a cell boundary, and exactly-once story/quest effects. **No migration** from `astral_hearthmere_v1_*` keys is required.
- Keep the old entrypoint and old data untouched while the V2 path is tested; switch default gameplay only after the complete below gate passes and a rollback strategy is documented.

**Gate:** The live opening runs on World V2 for all three roles without legacy path topology or v1 save dependency; no story continuity regressions; independent V2 save/reload robust enough for actual play.

## Canonical 13-step test inventory (from Phase 0 audit)

`arrival` → `market` → `mara` → `rowan` → `cart_test` → `shipment` → `square` → `yard_gate` → `load_cart` → `far_hold` → `escort` → `refuge` → `complete`.

These are **existing machine/story identifiers to preserve or explicitly map**, not a mandate to maintain their original street geometry. The later return/liberation/defense arc must remain possible; the opening giant survives and the town is occupied.

## Validation gates for each slice

```sh
npm ci
npm run build
npm test
npm run world:geo:verify
npm run world:geo:verify -- --reverse
npm run audit:world
npm run test:browser
npm run test:visual
npm run docs:check
```

Also perform the relevant **interactive** V2 scenario acceptance checks on desktop browser, then physical iPhone 14 Pro when available. Chrome screenshot checks alone do not establish that a quest can be completed. Include actual before/after anchor maps or screenshots for narrative staging only where needed, without diverting the team into production graphics before gameplay works.

### Explicit Phase 3 done condition

A player can select **any** of the three heroes and **play**, not just observe, the entire relocated Hearthmere opening: arrive, meet Mara/Rowan, investigate shipment, survive giant encounter, rescue/escort and reach refuge, with appropriate AI companions, collisions, skip/retry, saved story state and reliable V2 reload. On return, the town is correctly occupied and the giant still alive for the later rematch. The new route must be open-world terrain rather than a disguised old corridor or chain of loading portals.

### Things *not* to silently expand into Phase 3

Ship implementation, port recovery, vessel physics (Phase 4); final high-quality forest/city assets and mobile sustained FPS optimization (Phase 5); inventing final world seeds, landmass names/number, equipment economies or new story branches; old-save migration; deleting original game modules before all live imports and regression tests are accounted for. If an integration blocker requires one of these, make it an explicit dependency with a testable minimum slice and update the roadmap.

**PR evidence contract:** state which story beats were moved and which still use legacy locations, which new anchors are only staging, which hero/regression tests passed, which saves were exercised, current output entrypoints, and the next smallest integration slice. Update [WORLD_V2_STATUS.md](WORLD_V2_STATUS.md) and [PRODUCTION_ROADMAP.md](PRODUCTION_ROADMAP.md) in every integration PR.
