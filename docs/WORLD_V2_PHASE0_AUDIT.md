# World V2 — Phase 0 legacy audit and preservation register

**Audit date:** 2026-11-08  
**Scope:** Current default-branch runtime entrypoint, Hearthmere opening, older quest/world systems, persistence and relevant tests; a targeted source dependency review, **not** a proof of whole-repository dead-code reachability.  
**Status:** Initial audit, preservation contract, and one non-destructive extraction completed on the World V2 preparation branch. Full baseline CI results, save fixture capture and browser/device QA are still pending.  
**Governing architecture:** [WORLD_V2_ARCHITECTURE.md](WORLD_V2_ARCHITECTURE.md).

## Executive finding

The visible launcher starts the **Hearthmere** story, but the shared game engine and some save and combat code still reference two previous campaigns and their waypoint-based environments. The older code is **not all safely dead**: legacy branch handlers are reachable when invoked through `GameEngine`, and old quest defaults are still initialized during the present Hearthmere startup. Do not bulk-delete these files.

We **can** relocate and reshape Hearthmere completely. The preservation target is the working assets, opening quest/story flow, role differences, combat/companion behavior, cinematic handoffs and save continuity — **not their source-level X/Z values**.

## 1. Runtime entrypoint and dependency chains

### Current user-visible experience

```text
src/main.ts
  -> new UIManager(...), showCharacterSelectScreen()
  -> UIManager.renderLobbyDOM()
  -> readHearthmereSave(selected class)
  -> launchHearthmere(role, name, prior snapshot)
  -> temporary in-memory CharacterSaveData
  -> GameEngine.startGameplayWithCharacter(..., openingSave)
  -> new HearthmereOpening(role, step)
  -> EnvironmentBuilder.buildSlice(scene, opening.group)
  -> HearthmereScenery + HearthmereCast + HearthmereGiant + bridge/refuge
  -> GameEngine combat, movement, companions, HUD, sound, VFX
  -> writeHearthmereSave (per-class local browser storage)
```

Evidence: [main.ts](../src/main.ts), [UIManager.ts](../src/ui/UIManager.ts), [GameEngine.ts](../src/game/GameEngine.ts), [HearthmereOpening.ts](../src/game/HearthmereOpening.ts), [HearthmereSave.ts](../src/persistence/HearthmereSave.ts).

The start screen is **not** currently an entrypoint to the historical Long Dawn atlas or the procedural Stomping Grounds. Those systems remain in source and are still callable from engine APIs and tests. They must be retired through verified dependency isolation, not assumed unused.

### Legacy paths still inside the runtime

```text
GameEngine.startGameplayWithCharacter(no openingSave)
  -> enterZone(starting_town / old procedural combat route / Chronicle region)
  -> EnvironmentBuilder.buildZone() or buildChronicle()
  -> ProceduralPathGenerator / ChronicleWorld / WorldRoutes
  -> QuestEngine and CampaignEngine / FieldActivities
  -> legacy saved journey + zone map + portal travel
```

- `GameEngine` also calls `ensureCampaign()` and `normalizeQuestState()` even when a Hearthmere snapshot is supplied, so the present flow still carries legacy state initialization.
- `UIManager` contains older atlas/journal and legacy quest/help UI for the non-opening path; its currently shown lobby is the Hearthmere one.
- `EnvironmentBuilder` implements both the current `buildSlice` wrapper and old separate-region builders.
- `MoatSlice` is instantiated only through the `playableSlice` parameter in `GameEngine`; current lobby supplies the Hearthmere snapshot instead. It remains a valuable puzzle/traversal test fixture.
- `ChronicleWorld.chapterSeed(characterId,...)` deliberately makes different maps for each hero. This **conflicts** with the newly approved shared canonical world; it is legacy behavior, not a V2 requirement.

## 2. Source inventory and disposition

**Preserve and migrate (live Hearthmere / shared assets):**

| Source | Current responsibility | Phase 0 / V2 action |
| --- | --- | --- |
| `src/game/HearthmereOpening.ts` | Opening steps, stage transitions, NPCs, giant crisis and source coordinates | **Preserve behavior**; extract location lookup and quest staging into anchor-driven data before moving geometry |
| `src/rendering/HearthmereScenery.ts` | Town/river/bridge/refuge visuals, environmental motion and collision | **Preserve assets and aesthetic**; decompose scenery assembly into placed prefabs/cell content |
| `src/rendering/HearthmereCast.ts`, `HearthmereGiant.ts`, `HearthmereFiends.ts`, `HearthmereRefuge.ts` | Residents, principal enemy, effects, crossing/refuge assets | Keep functionality and reusable geometry/animation; allow new terrain-relative placement |
| `src/rendering/CharacterMeshBuilder.ts`, `HeroMotion.ts`, character-specific wardrobe/attack/VFX modules | Player/companion visuals, combat feedback and animation | Reuse as shared systems; test against 3D grounded movement |
| `src/audio/AudioSystem.ts`, `src/game/HeroSpeech.ts`, `src/ui/CutsceneDirector.ts` | Sounds, vocalizations, cinematic presentation | Preserve; cinematic target transforms become anchor-/stage-relative |
| `src/input/InputManager.ts`, `src/platform/*`, `src/rendering/IsometricCamera.ts` | Movement input, touch/orientation, camera | Keep and extend for actual elevation, larger world and wider ship view |
| `src/persistence/HearthmereSave.ts` | `astral_hearthmere_v1_<role>`, `current/previous` recovery envelope | **Do not change or delete keys** before versioned migration and test fixtures |
| `src/rendering/MinimapTerrainCapture.ts`, `src/ui/Minimap.ts` | Current top-down scene mini-map (merged PR #2) | Retain as interim; benchmark GPU capture and plan atlas-derived tiles |

**Legacy or mixed modules (not immediately safe to delete):**

| Source | Why legacy or mixed | Isolation requirement |
| --- | --- | --- |
| `src/game/ProceduralPathGenerator.ts` | 112-unit single corridor, waypoint clearings, `clampToProceduralPath` | Remove from new land movement; retain old save/test compatibility while old routes exist |
| `src/game/ChronicleWorld.ts` | Per-character, per-chapter waypoint-based regions with v1/v2 layouts | Replace with canonical atlas data and stable story anchors; keep legacy fixture as needed |
| `src/game/WorldRoutes.ts` | Old portal destinations and graph navigation | Replace in V2 with world navigation/optional fast travel; preserve old route compatibility first |
| `src/game/CampaignEngine.ts`, `src/data/chronicle.ts`, `src/types/campaign.ts` | The Long Dawn chapter/story state | Do not use for Starforged Crown's campaign; extract any generic choice/state mechanics behind new interfaces |
| `src/game/QuestEngine.ts`, `src/types/quest.ts` | The Riftscar/Eclipse Triad prototype quest | Preserve only needed compatibility; separate reusable identity/state before retirement |
| `src/game/FieldActivities.ts` | Chapter-route field objectives tied to old layout | Candidate for mechanics reuse after detaching waypoint placement |
| `src/rendering/ChronicleEnvironment.ts`, `EmberCoast.ts`, `RememberingWood.ts` | Route-defined scenic regions and special-case collision | Reuse shaders, props, environmental techniques; do not carry legacy topology into V2 |
| `src/rendering/EnvironmentBuilder.ts` | Builds both current slice and historical zones in one class | Split preview/lighting, scene lifecycle, and V2 cell scene integration incrementally |
| `src/game/MoatSlice.ts` | Internal playable traversal/puzzle prototype | Archive as test/reference or adapt its mechanics; not part of today's launcher |
| `src/game/GameEngine.ts` (4,000+ lines) | Mixes combat, world transition, legacy routes, Hearthmere, save state and HUD | Extract world and state orchestration behind interfaces; avoid a single destructive rewrite |
| `src/ui/UIManager.ts` (1,400+ lines) | Current Hearthmere lobby/HUD plus older atlas, quest, inventory flows | Separate current UI from retired atlas behind feature modules after tests |

**Documentation disposition:** [WORLD_BIBLE.md](WORLD_BIBLE.md) explicitly describes the legacy Long Dawn story. Do not convert it into canonical Starforged Crown lore. The new world specification supersedes old route topology, not the modern [branching campaign](BRANCHING_CAMPAIGN.md).

## 3. Evidence of geometric coupling (must be removed)

- `HearthmereOpening.ts` defines fixed `HEARTHMERE_WAYSTATION`, `HEARTHMERE_REFUGE`, `HEARTHMERE_COVER`, cart, gate and bridge coordinates, a rigid `OPENING_PATH`, stage objectives with literal positions and enemy seeds using X/Z.
- `HearthmereOpening` constructs NPCs, props, giant staging, scenery and colliders in the same class. Moving the town without remapping these will break interactions, escorts, hit zones and cinematics.
- `HearthmereScenery.ts` uses special-case river and refuge geometry and `GroundMeshCollider`; those are reusable prototypes, but not yet a general 3D world terrain/nav solution.
- `src/game/GroundMeshCollider.ts` projects mesh faces into X/Z, and `sweepGroundMovement` sets the moved actor's Y coordinate to zero. V2 needs true height and slope interfaces.
- `GameEngine` implements alternate logic for opening, moat slice, corridor layouts and fixed-radius safe towns. The new movement and companion navigation contracts must replace these branching assumptions in stages.
- `ChronicleWorld` placements such as `waypoints[11]` bind bosses to array indices; quests should instead resolve a named place through a location service.
- `HearthmereSave.ts` imports `OPENING_STEPS` from the scene-owning `HearthmereOpening.ts`, coupling save schema validation to a rendering/gameplay module. Extract pure step types before converting save versions.

**Do not** interpret `OPENING_PATH` as the new world's atlas. It represents one scripted flow in the old town and should be replaced with semantic objectives and navigation between them.

## 4. Preservation contract (hard acceptance)

The following opening milestones must remain mechanically playable after spatial reconstruction, while the layout and camera staging are free to change:

1. Role-specific arrival lead and investigation.
2. Meeting Mara and helping Rowan.
3. Cart/ship­ment interaction leading to the crisis.
4. The giant's overpowering attack, warning/evade and escape rather than killing it.
5. Civilian rescue/escort and arrival at refuge.
6. Correct post-crisis state: companions united, giant alive, town occupied, later return/liberation/defense story still viable.
7. Hero-specific lead/dialogue, resident identity, reusable scenery/character/enemy/audio assets, cinematic skip/handback behavior.
8. Local save/resume and defeat retry for all three roles, including old v1 snapshots.

The 13 current machine step IDs are `arrival`, `market`, `mara`, `rowan`, `cart_test`, `shipment`, `square`, `yard_gate`, `load_cart`, `far_hold`, `escort`, `refuge`, `complete`. **Keep IDs/migration mappings stable** even when rearranging scene geography; do not assume each must remain a distinct visual room or specific coordinate.

The user's permission to disrupt Hearthmere **does not** authorize deleting quest/asset function or resetting saved progress.

## 5. Save contract and migration risks

**Active save model:** `HearthmereSave.version = 1`; per-hero localStorage key `astral_hearthmere_v1_<role>`; envelope with `current` and `previous`. Fields include hero class/name, opening step, X/Z position, yaw, HP, energy, flasks, elapsed seconds, optional moving group and up to eight enemy snapshots. Existing read validation and previous-snapshot fallback are important safety guarantees.

**Migration risks ranked:**

| Risk | Severity | Required mitigation |
| --- | --- | --- |
| Reshaped Hearthmere invalidates old saved X/Z, civilians or enemies spawn inside terrain | Critical | Step-based semantic anchor remap + nearest safe ground + deterministic relocation for groups/enemies |
| Legacy quest defaults leak into new quest/campaign state | High | Separate Hearthmere/current-campaign DTO from prototype QuestEngine; schema validation and one-way migration |
| World cells unload mid-cinematic, escort or boss event | High | Scenario-aware cell pins/streaming priority + repeatable interruption tests |
| Multi-continent coordinates lose render precision | High | Double-precision global state + local render origin rebasing |
| Per-hero Chronicle seed contradicts canonical geography | High | New atlas worldId/seed/version; never import chapterSeed into V2 world definitions |
| World/entity IDs change with cell generation/load order | High | Stable deterministic IDs and test fixtures independent of loading order |
| New movement paths break companion pursuit or 2.5D collision | High | Terrain/ground Y, navigation seam tests, scripted rescue route QA |
| Legacy UI/help/atlas appears during new campaign | Medium | Separate feature modules and restrict old surfaces to fixtures/legacy mode |
| Minimap GPU readback stalls mobile | Medium | Instrument and prefer pre-baked map tiles if budget requires |

**Save migration sequence:** capture and retain v1 fixtures → define pure versioned data contract → create stable semantic anchor catalog → implement idempotent migration on a copy → validate progress, actors and location → commit upgraded snapshot while retaining recovery → retry/rollback on failure. Never alter player storage silently without tested recovery.

## 6. Phase 0 changes made on the preparation branch

- Created `src/game/CompanionRoster.ts`, extracting canonical hero-role names and deterministic companion selection from the old quest engine.
- Updated `GameEngine.ts`, `UIManager.ts` and `CutsceneDirector.ts` to import these neutral shared rules directly rather than through `QuestEngine.ts`.
- Left compatibility re-exports in `QuestEngine.ts` so older tests and consumers continue working.
- Added `tests/worldV2Phase0.test.ts` for canonical roles, legacy import compatibility and Hearthmere's core story milestone order.
- Added `.github/workflows/verify.yml` to run `npm ci`, `npm run build` and `npm test` on pull requests and main.

These are **non-destructive** source changes. They do not rebuild the world or migrate saves. The starter test contract checks narrative/identity, not landscape coordinates.

## 7. Baseline test inventory and uncovered gaps

| Baseline surface | Existing evidence | Additional gate before Phase 1/3 |
| --- | --- | --- |
| Hearthmere save safety | `tests/hearthmereSave.test.ts`: backup recovery, failed writes, per-hero isolation | Real v1 snapshot fixtures across all steps; v1→V2 migration |
| Hearthmere gameplay | `tests/combat.test.ts`: giant, collision, escape/defeat and combat integration | Full three-role scripted opening after anchor migration; no hardcoded position asserts |
| Hero animation/fiends | `tests/heroMotion.test.ts`, `tests/fiendMotion.test.ts`, combat tests | Terrain height/grounding, large-vessel animations as added |
| Controls/mobile | `tests/mobile.test.ts`, `tests/mobile-preview.html` | Physical iOS Safari/Android Chrome; 60 FPS under active streaming/sailing |
| World/legacy routes | `tests/world.test.ts`, `tests/chronicle.test.ts`, `tests/persistence.test.ts` | Canonical seed, versioned atlas, anchor access, cell seam and save-order tests |
| Minimap | `tests/minimap.test.ts`, `tests/minimap-terrain.test.ts` | Visual landmark correctness and GPU readback profiling on devices |
| Cinematic/camera | Cutscene and gameplay tests; browser-only choreography still relevant | Moving actors/anchors, skip, cell pinning and resume through cinematic handoffs |

**Validation status at the time of this audit:** Earlier mini-map branch passed a Vercel TypeScript/Vite production build, but its full Vitest suite was not observed running. This preparation PR adds independent CI. **Do not claim the current branch has passed CI or real-device QA until there is run evidence.**

## 8. Phase 0 completion checklist

- [x] Identify the player-facing boot path and legacy alternative paths.
- [x] Record active Hearthmere assets, quest milestones and save format.
- [x] Identify high-risk geometry/quest/persistence coupling and retention boundaries.
- [x] Specify World V2 decisions, migration and acceptance requirements.
- [x] Extract one shared dependency from legacy quest code, keeping compatibility.
- [x] Add a narrative preservation contract test and an automated CI definition.
- [ ] Confirm `npm run build` and `npm test` pass on the preparation branch.
- [ ] Capture representative v1 saves at arrival, mid-quest, during escort, and refuge for all three heroes.
- [ ] Perform manual browser opening/defeat/resume/skip smoke checks and record results.
- [ ] Finish import/reachability inventory for every legacy module and classify safe retirement candidates with zero active imports.
- [ ] Extract pure opening-step/save types out of scene module and create the first versioned anchor-resolver boundary with tests.
- [ ] Measure current desktop and iPhone 14 Pro baseline before adding streaming or shipping assets.

**Gate:** Phase 0 is **in progress**, not complete, until the unchecked items are verified. No legacy source deletions and no automatic player-save reset are approved. Phase 1 can be designed in parallel but must not be merged over a failing Phase 0 regression baseline.

## 9. First follow-up tickets

1. **P0-01 baseline verification:** Run CI; triage failures without changing gameplay; record artifact links and test evidence.
2. **P0-02 save samples:** Produce anonymized v1 snapshot fixtures for three heroes and interrupted/defeat states. Add read/round-trip tests with error handling.
3. **P0-03 pure story DTO:** Move opening step/identity/quest types out of Three.js scene modules. Avoid importing renderer modules in persistence schemas.
4. **P0-04 dependency closure:** Enumerate imports/exports and remaining UI/API routes to the old campaigns; produce per-file retirement gate and compatibility strategy.
5. **P0-05 device/reference run:** Record current three-role Hearthmere completion, cutscene skip, save/resume and iPhone 14 Pro frame timings.
6. **P1-01 world kernel:** Start canonical atlas ID/seed/version/anchor interfaces with pure deterministic tests; no destructive world or maritime content change.

### Review rule

Every later PR must say which story IDs, save versions, world IDs, cell IDs and asset identifiers it touches. Missing migration evidence is a blocker, not a reason to delete the old snapshots.
