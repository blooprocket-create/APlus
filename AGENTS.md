# Astral Chronicles — instructions for coding agents

**Read this before editing code or generating a plan.** This repo is **Astral Chronicles** (`APlus`), not Wayfinder or Veyra. It is a TypeScript/Three.js/Vite mobile-browser action RPG. Work against the code and documents **in this repository**, not prior chats or stale prototype assumptions.

## Read in this order

1. [World V2 current state and verification](docs/WORLD_V2_STATUS.md) — what works **today**, what's staging-only, what's not implemented, and what to do next.
2. [Locked decisions vs open questions](docs/WORLD_V2_DECISIONS.md) — user-approved requirements are binding; illustrative positions/numbers are **not** canon.
3. [World V2 architecture](docs/WORLD_V2_ARCHITECTURE.md) — boundaries, identities, ownership, world/ship/save invariants and phase gates.
4. [Production roadmap](docs/PRODUCTION_ROADMAP.md) — cross-phase order and release criteria.
5. For the **new current next task**, read [Phase 2.5 gameplay/rendering integration handoff](docs/WORLD_V2_PHASE2_5_GAMEPLAY_INTEGRATION.md) first; only after its exit gate resume [Phase 3 integration handoff](docs/WORLD_V2_PHASE3_HANDOFF.md). For implementation details, refer to [Phase 2 functional handoff](docs/WORLD_V2_PHASE2_RUNTIME.md) and [Phase 0 legacy preservation audit](docs/WORLD_V2_PHASE0_AUDIT.md).
6. For creative/story changes, read [design decisions](docs/DESIGN_DIRECTION.md), [opening build contract](docs/HEARTHMERE_OPENING_BUILD.md) and specific story briefs. Historical proposals do not override the decision register.

**Conflicting docs:** Most recent explicit user-approved decision > `WORLD_V2_DECISIONS.md` > `WORLD_V2_ARCHITECTURE.md` > `WORLD_V2_STATUS.md` for implementation evidence > phase handoffs/roadmap > historical drafts. If an implementation detail and a document conflict, verify against source/tests and correct the document; don't silently redefine user intent.

## Current boundaries (not optional)

- **The fully playable opening remains at `/index.html`.** `/world-v2-geography.html` is a terrain-only lab. [Phase 3 PR #11](https://github.com/blooprocket-create/APlus/pull/11) adds an **opt-in first-lead-only** `/world-v2-story.html` test: role selection + one `arrival → market` interaction, not full NPC/companion AI, combat, cinematics, persistence or campaign cutover.
- World V2 Phase 0 audit, Phase 1 foundation, and **Phase 2 staging engineering core** are implemented. **This does not mean Phase 2's production gates are complete.** The sample **two continents/three islands, 4,608 cells/72 pages, 64-unit tiles, six river channels, sample story anchors and preview colors are not approved world canon.**
- **New priority:** Finish Phase 2.5 gameplay/rendering convergence BEFORE additional Phase 3 migration. Reuse original combat, movement, AI, animations, UI, sounds, shaders, VFX and input in a real V2 GameEngine session, not copied lab-only substitutes. [Phase 2.5 handoff](docs/WORLD_V2_PHASE2_5_GAMEPLAY_INTEGRATION.md) is binding for next implementation work. The older painted rendering is a technical baseline, NOT the final beauty target; updated direction D166 requests Ghibli-leaning painted environments and Solo Leveling-feeling character/combat intensity in an original coherent aesthetic.\n- The next program is **Phase 3 (in progress): carry the existing Hearthmere opening into World V2**, preserving hero/class identity, existing assets and progression, NPC interactions, giant survival/occupation, companion logic, rescue/escort, cutscenes, defeat and future continuity. **Town topology, actual terrain, streets, bridges, quest/camera positions may change drastically.** Never hardcode old road/waypoint coordinates as V2 geography.
- Keep **one shared canonical geographical seed/atlas** for future published worlds, with per-player story/world-state deltas. No per-hero reroll or procedural geography regenerated at load.
- Use named, versioned story anchors; the `hearthmere.*` values in staging are **examples**, not a locked catalog. Stable IDs must not depend on generation order or cell loading.
- World-space positions are authoritative; render-local coordinates/floating origin are **never** saved. Generated tiles are compiled offline and loaded by paged, verified streaming. Gameplay collision and navigation use the same terrain triangle samples.
- Ships, sea exploration, free landing, vessel persistence/recovery and optional fast travel are **locked future behavior**, not shipped features. Don't imply that a shoreline probe is a ship controller.
- Old prototype/Hearthmere saves **do not need migration** (D165). Do not delete old browser data as an accidental side effect. World V2 must gain its own reliable, versioned save/resume before cutover.
- Maintain the original game’s **anime/cel-shaded, painted** art direction ([shared visual contract](docs/WORLD_V2_ART_PARITY.md)); do not replace it with generic primitives as a new production direction. User currently prioritizes **functional world/gameplay integration over graphics polish**, except critical camera/playability issues.
- The **60 FPS iPhone 14 Pro** target is **not verified on hardware**. Desktop/CI Chrome is not a substitute for physical-device measurements.
- No broad deletion of old prototype code until live imports are isolated and regression tests pass. Use focused, reversible PRs; preserve production entrypoints.

## Code owners / architecture map

| Domain | Canonical place to start |
| --- | --- |
| World schema, seed/identity, semantic anchors | `src/world-v2/WorldAtlas.ts`, `WorldIdentity.ts`, `WorldCoordinates.ts` |
| Noncanonical geography fixtures | `src/world-v2/WorldGeographyStage.ts` |
| Pure geography and terrain sampling | `src/world-v2/WorldGeography.ts`, `WorldTerrain.ts`, `WorldSurface.ts` |
| Offline generation, tile/page checksums | `tools/world-v2-compile.mjs`, `src/world-v2/WorldArtifacts.ts` |
| Cell lifetime and HTTP/paged verification | `src/world-v2/WorldCellStreamer.ts`, `WorldV2GameplayBridge.ts` |
| Walkability, A*, shoreline probes | `src/world-v2/WorldNavigation.ts` |
| Staging QA (not gameplay owner) | `src/world-v2/geography-lab.ts`, `world-v2-geography.html`; opt-in first-story UI: `src/ui/WorldV2ArrivalSession.ts`, `world-v2-story.html` |
| Live game/characters, opening/quests | `src/game/GameEngine.ts`, `HearthmereOpening.ts`, `HearthmereStory.ts`, `HearthmereScript.ts`; first proposed V2 beat site map: `src/game/WorldV2OpeningPlan.ts` |
| Live art/camera, hero visual identity | `src/rendering/IsometricCamera.ts`, `PaintedWorldStyle.ts`, `CharacterMeshBuilder.ts` |
| Current saves (do **not** migrate automatically) | `src/persistence/HearthmereSave.ts` |

**Dependency rule:** world identity/data → compiled geographical artifacts → streaming/spatial/nav services → gameplay systems → UI/rendering. Pure generation code must not import Three.js, quests, browsers, saves, or UI; use data and interfaces. Single authoritative owner per mechanic; no second quest engine, terrain height formula, player physics owner or ad hoc per-character atlas.

## Implementation and review loop

Before a PR: identify governing decision IDs, current owner modules, whether new values are **locked / staging / proposed**, test cases, and rollback effect. Work on a branch. Do not rewrite the active opening while designing the replacement; add opt-in paths and migration-by-feature.

Run relevant checks:

```sh
npm ci
npm run build
npm test
npm run world:bake:verify
npm run world:geo:verify
npm run world:geo:verify -- --reverse
npm run audit:world
npm run test:browser
npm run test:visual
npm run docs:check
```

Browser/visual suites require Chrome/Chromium. Visual output is evidence to **inspect**, not an automatic art-quality pass. Don't claim physical device testing without hardware evidence.

**Keep docs current in the same PR** when changing architecture, phases, source ownership, verification, or decisions:
- `docs/WORLD_V2_STATUS.md`: verified work, pending gates, next phase and CI evidence.
- `docs/WORLD_V2_DECISIONS.md`: only newly confirmed user decisions; do not label agent inventions `LOCKED`.
- `docs/WORLD_V2_ARCHITECTURE.md`: actual interfaces/boundaries and design invariants.
- `docs/PRODUCTION_ROADMAP.md` and the affected phase handoff: dates, phase state, acceptance/results.
- `docs/WORLD_V2_VISUAL_REVIEW_LOG.md`: screenshot-backed visual findings only when visual work changes.

Never call a phase **production-complete** without its stated acceptance evidence. If requirements are not settled, mark them **open**, make a reversible engineering choice, and report the tradeoff rather than silently turning a prototype into canon.
