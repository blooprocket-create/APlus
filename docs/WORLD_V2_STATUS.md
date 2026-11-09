# Astral Chronicles — World V2 implementation status

**Baseline checked:** 2026-11-08 at `main` merge `c40f578cf2a70d2f23ca767a17865e1716991026` ([PR #9](https://github.com/blooprocket-create/APlus/pull/9)). **Post-merge GitHub Actions [42566887740](https://github.com/blooprocket-create/APlus/actions/runs/42566887740): SUCCESS.** This is a snapshot; future work must update its status and evidence. Start with [agent instructions](../AGENTS.md) and [decision register](WORLD_V2_DECISIONS.md).

**Phase 3 work has begun and [PR #11](https://github.com/blooprocket-create/APlus/pull/11) is merged** (commit `800eeead491179c6a162c5bb0c384c0e0b9fd1a9`). The separate first-arrival role-selected story page is verified by [181 passing tests and real-browser evidence](https://github.com/blooprocket-create/APlus/actions/runs/42570055439). This is **one first-beat prototype**, not a full playable World V2 campaign. See [Phase 3 progress](WORLD_V2_PHASE3_PROGRESS.md).

## In one paragraph

**Phase 2's functional staging engineering core is implemented and merged, but Phase 2 is NOT signed off as a production-ready canonical open world.** The offline-generated finite staging atlas, terrain streaming, close isometric perspective, ground-aware movement and local nav are demonstrated in an **isolated QA lab**. The existing playable Hearthmere remains at `/index.html`, on the prior gameplay/world route; it has **not** been restaged onto World V2. Graphics polish is deliberately lower priority than finishing functional gameplay, though the game's visual identity and close camera remain hard requirements.

## Phase status matrix

| Phase | State | Evidence of completion | Still needed |
| --- | --- | --- | --- |
| **0 — Audit & isolation preflight** | **Complete (engineering preflight)** | [Phase 0 audit](WORLD_V2_PHASE0_AUDIT.md), [dependency inventory](WORLD_V2_DEPENDENCY_INVENTORY.md), baseline/three-hero CI. | Old bundled systems remain; later safe removal only after V2 cutover. Not a clean legacy teardown. |
| **1 — World platform** | **Complete (engineering foundation)** | [PR #4](https://github.com/blooprocket-create/APlus/pull/4) / [PR #5](https://github.com/blooprocket-create/APlus/pull/5), [kernel handoff](WORLD_V2_PHASE1_KERNEL.md). | Published canonical geography was deliberately **not** part of Phase 1. |
| **2 — Geography/navigation** | **Core implemented (staging only)** | [PR #6](https://github.com/blooprocket-create/APlus/pull/6), [PR #7](https://github.com/blooprocket-create/APlus/pull/7), [PR #8](https://github.com/blooprocket-create/APlus/pull/8), [PR #9](https://github.com/blooprocket-create/APlus/pull/9); [runtime handoff](WORLD_V2_PHASE2_RUNTIME.md), [successful CI](https://github.com/blooprocket-create/APlus/actions/runs/42566887740). | Final atlas/anchors not approved; deeper hydrology, authored-object/bridge physics, long-range nav, distant LOD, real-device profiling and full gameplay integration remain open. Track owner phase for each. |
| **3 — Hearthmere on V2** | **In progress — 3.0 opt-in first beat, NOT full migration** | [PR #11](https://github.com/blooprocket-create/APlus/pull/11) introduces one live V2 `arrival` interaction shared with legacy script and three hero rigs; see [3.0 evidence/limitations](WORLD_V2_PHASE3_PROGRESS.md). | Remaining 12 beats, actual scene/NPC/companion gameplay AI, scripted cinematics, new V2 save/resume, canonical town plan, complete three-role acceptance and cutover. |
| **4 — Maritime world + persistence** | **Not implemented** | Ship/shore behavior defined in [architecture](WORLD_V2_ARCHITECTURE.md). | Control, buoyancy/grounding, boarding, free landing, persistent identities, recovery, fast travel, new-world deltas. Current shore probe is **not** a vessel implementation. |
| **5 — Production optimization & authoring** | **Not completed** | No on-device performance certification. | World LOD/proxies, biome/region polish, authoring tools, physical mobile measurements/optimization, future region pipeline. |

**Status vocabulary:** Complete (engineering) != game shipped != all product gates met. A merged PR or passing desktop CI means only that the tested scopes passed.

## Working executable entrypoints and code ownership

| Entry | Today | Not today |
| --- | --- | --- |
| `/index.html` / `src/main.ts` | Playable original Hearthmere opening through refuge for one selected hero and AI companions; existing quests/combat/cinematics and v1 local saves. | World V2 playable campaign or a new V2 save. |
| `/world-v2-lab.html` | Phase 1 deterministic seeded-cell streaming fixture (81 test tiles). | Production geography, story or sea transport. |
| `/world-v2-geography.html` | Phase 2 **staging** lab: procedural land/water/biomes, ground-aware walking, page streaming, A* path diagnostics and spectator view jumps. | Existing Hearthmere quests/NPC schedules; ship navigation or an approved atlas. |
| `/world-v2-story.html` (PR #11) | Opt-in Phase 3 **first playable arrival lead** using hero selection and shared dialogue/step data on streamed V2 terrain. Companion rigs are a simple formation preview. | Full opening, real companion AI/combat, NPCs, cinematics, V2 saves or finalized geography. |
| `src/game/GameEngine.ts` | Current live game and optional `attachWorldV2Port()` lifecycle seam. | A default replacement engine running V2 story scenarios. |

### Verified Phase 2 engineering facts (not final gameplay design)

- **Staging world:** 2 sample continents / 3 sample islands, with six constrained radial river paths, story-pad clearance and signed shorelines. Source: `src/world-v2/WorldGeographyStage.ts` and `WorldGeography.ts`.
- **Offline world bake:** entire finite staging extent is **4,608 tiles in 72 8×8 manifest pages**, with deterministic bidirectional verification and SHA-256-checked HTTP cell/page loads. Source: `tools/world-v2-compile.mjs`, `WorldArtifacts.ts`, `WorldV2GameplayBridge.ts`. These numbers are **test/engineering choices, not world lore/canon**.
- **Ground & navigation:** global/world-space triangle-accurate ground height, normals, slopes, water/river walkability, swept character movement, 16×16 nav masks and resident-cell A* across adjacent tiles. Source: `WorldTerrain.ts`, `WorldSurface.ts`, `WorldNavigation.ts`. A* is not a world-wide ocean navigation planner or actual NPC AI integration.
- **Camera:** V2 lab uses the original game’s **close perspective/isometric follow-offset language**; no distant orthographic production camera or third-person ship chase camera. Source: `src/rendering/IsometricCamera.ts`, `geography-lab.ts`.
- **Visuals:** shared painted material/lighting/sky/foliage primitives and screenshot-regression tooling exist, but visual production is **unfinished/deferred**. Source: [visual contract](WORLD_V2_ART_PARITY.md) and [review log](WORLD_V2_VISUAL_REVIEW_LOG.md).
- **Regression:** merged PR #9's main-branch CI completed successfully. The normal opening and QA labs are separate. Desktop Chrome tests do **not** prove real-phone sustained 60 FPS.

## Immediate next milestone: Phase 3 integration

**3.0 completed as a first-beat slice in merged PR #11:** Start with the [first-beat opt-in entry](WORLD_V2_PHASE3_PROGRESS.md) and preserve the existing game. The next integration work is authentic NPC/cutscene/input/AI ownership, not duplicating a quest engine. The 13-beat plan is intentionally semantic, not a set of approved positions.

Use [WORLD_V2_PHASE3_HANDOFF.md](WORLD_V2_PHASE3_HANDOFF.md). Begin **additively**, extracting the live opening's semantic event/cinematic/interaction boundaries before changing world positions. Author proposed V2 story anchors through data, test all three heroes, then place the existing characters/scenes on streamed ground. Finish every step with a runnable game and an explicit rollback path. **Do not migrate v1 saves.**

**Phase 3 exit gate:** One playable connected Hearthmere arrival → Mara/Rowan → shipment → giant attack → civilian rescue/escort → refuge sequence running on V2 terrain and navigation for all three heroes, with correct companions and giant/story flags, cinematic skip/defeat/retry, **fresh** V2 save/reload, and no dependency on the old corridor topology. Merely moving a town model or seeing a page load is not acceptance.

## Outstanding cross-phase risks: no hidden assumptions

| Risk / uncertainty | Owner | Current truth |
| --- | --- | --- |
| Final story geography & world seed | Before final canonical publish / Phase 3 authoring | User has not accepted the staging map; **do not freeze sample positions by accident**. |
| Existing actors crossing bridges, buildings, cliffs, authored hazards | Phase 3 terrain/scene integration; broaden spatial layer as necessary | Heightfield-only solver doesn't implement obstacle/bridge/overhang collision. |
| Coastal landing correctness for actual ships | Phase 4 (with terrain probe improvements) | Candidate shoreline search exists; boarding/landing doesn't. |
| Long-distance land/nav and regional geography expansion | Phase 3/5 | Current A* is bounded to resident terrain; no hierarchical route planner. |
| Distant terrain LOD and large-instance streaming budgets | Phase 5, earlier if blocking Phase 3 | Warm cells use active detail; proxies/LOD and sustained memory budgets not certified. |
| Final hydrology/vegetation/atmospheric art | Phase 2 creative follow-up / Phase 5 | Staging algorithms and visual baselines exist, not finished production assets. |
| iPhone 14 Pro 60 FPS / Android browser validation | Phase 5 / release gate | Unmeasured on physical reference hardware. |
| Preservation of prototype artifacts | Until Phase 3 regression + cutover | Old modules remain reachable; don't bulk-delete to make import counts look smaller. |

## Updating this file

After each architectural PR: identify changed **module ownership**, new/retired interfaces, what tests actually passed, any user-approved versus merely prototyped parameters, new gaps/risks, which phase owns the unfinished work, and a link to the validating run. Update this document and [roadmap](PRODUCTION_ROADMAP.md) in the same PR. Never claim code or a physical-device result without inspectable evidence.
