# World V2 — Phase 0 legacy audit and preservation register

**Audit date:** 2026-11-08  
**Scope:** Current runtime entrypoint, Hearthmere, prototype world/quest systems, persistence and tests. Source import closure is automated across all 76 TypeScript modules; runtime execution, physical gameplay QA and tree-shaken dead-code status are separate questions.  
**Status:** **Phase 0 engineering audit and isolation baseline complete (2026-11-08)**. Automated build/127-test baseline, actual Chrome launch smoke for all three roles, and the full static dependency inventory passed. Physical-device FPS and complete visual/cinematic playthroughs are explicitly *not* verified; they remain later integration gates. Legacy save migration is waived by D165.  
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

**Preserve and adapt (live Hearthmere / shared assets):**

| Source | Current responsibility | Phase 0 / V2 action |
| --- | --- | --- |
| `src/game/HearthmereOpening.ts` | Opening steps, stage transitions, NPCs, giant crisis and source coordinates | **Preserve behavior**; extract location lookup and quest staging into anchor-driven data before moving geometry |
| `src/rendering/HearthmereScenery.ts` | Town/river/bridge/refuge visuals, environmental motion and collision | **Preserve assets and aesthetic**; decompose scenery assembly into placed prefabs/cell content |
| `src/rendering/HearthmereCast.ts`, `HearthmereGiant.ts`, `HearthmereFiends.ts`, `HearthmereRefuge.ts` | Residents, principal enemy, effects, crossing/refuge assets | Keep functionality and reusable geometry/animation; allow new terrain-relative placement |
| `src/rendering/CharacterMeshBuilder.ts`, `HeroMotion.ts`, character-specific wardrobe/attack/VFX modules | Player/companion visuals, combat feedback and animation | Reuse as shared systems; test against 3D grounded movement |
| `src/audio/AudioSystem.ts`, `src/game/HeroSpeech.ts`, `src/ui/CutsceneDirector.ts` | Sounds, vocalizations, cinematic presentation | Preserve; cinematic target transforms become anchor-/stage-relative |
| `src/input/InputManager.ts`, `src/platform/*`, `src/rendering/IsometricCamera.ts` | Movement input, touch/orientation, camera | Keep and extend for actual elevation, larger world and wider ship view |
| `src/persistence/HearthmereSave.ts` | `astral_hearthmere_v1_<role>`, `current/previous` recovery envelope | Keep current v1 save/resume functional while the old opening ships; no V2 migration is required (D165). The new world uses a separate save namespace. |
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
- Before Phase 0 extraction, `HearthmereSave.ts` imported `OPENING_STEPS` from scene-owning `HearthmereOpening.ts`. This dependency is **now removed**: the pure `HearthmereStory.ts` module owns step IDs and v1 coordinate types. The new world uses a fresh versioned save format, and no conversion of v1 snapshots is required.

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
8. New-world save/resume and defeat retry for all three roles. Existing v1 saving continues to work for the unmodified current opening; no migration is needed when V2 replaces it.

The 13 current machine step IDs are `arrival`, `market`, `mara`, `rowan`, `cart_test`, `shipment`, `square`, `yard_gate`, `load_cart`, `far_hold`, `escort`, `refuge`, `complete`. **Keep current story beats identifiable** even when rearranging scene geography; do not assume each must remain a distinct visual room or specific coordinate.

The user's permission to disrupt Hearthmere **does not** authorize losing quest/asset functionality. D165 explicitly removes prior-playthrough save migration from scope; when V2 goes live, it may start with fresh progress.

## 5. Saving and remaining architectural risks (D165)

**Legacy-save migration is explicitly out of scope.** The current build's `HearthmereSave.version=1` retains `astral_hearthmere_v1_<role>` snapshots with a `current/previous` recovery envelope. These old saves remain functional while the old opening is running but **will not be migrated** to a structurally rebuilt World V2. Avoid clearing browser storage as an incidental cleanup side effect; introduce a new versioned V2 namespace when implemented. A player can begin a new World V2 adventure. Ongoing V2 save/resume, ownership and persistent story outcomes remain essential.

| Risk / blocker for later phases | Severity | Follow-up owner |
| --- | --- | --- |
| Old quest/region modules stay eagerly bundled through mixed GameEngine/UI/EnvironmentBuilder | High | Phase 1–3: progressively separate live entrypoint from prototype handlers, then retire zero-import files |
| Streaming unloads scenery or NPCs during giant scenes, escort and cutscenes | High | Phase 1/3: scenario-aware streaming pins and interruption tests |
| Continental coordinates lose rendering precision | High | Phase 1: double-precision world state and local origin rebasing |
| Chronicle's hero-specific chapter seed contradicts shared world | High | Phase 1/2: canonical atlas ID/seed/version, never import chapterSeed into new world |
| World/entity IDs depend on procedural generation order | High | Phase 1/2: deterministic stable IDs, order-independent build tests |
| New geometry and elevations break companion movement/collision | High | Phase 2/3: grounded height, slope, navigation seam and scripted rescue route tests |
| Old quest defaults leak into the new campaign | High | Phase 1/3: independent new-campaign save/quest DTO and character factory |
| Mobile hitching and map GPU readbacks | Medium | Phase 5: capture on physical iPhone 14 Pro; evaluate atlas tile map |
| Maritime boat persistence/recovery creates duplicate vessels | High | Phase 4: atomic ownership/position changes and repeatable save/load tests |

## 6. Phase 0 implementation and evidence

- **Source isolation:** New pure `src/game/CompanionRoster.ts` owns canonical hero identities and companion selection; `GameEngine`, `UIManager`, `CutsceneDirector` import directly. The old `QuestEngine` reexports them for compatibility.
- **Story contract:** New pure `src/game/HearthmereStory.ts` owns the 13 opening-step IDs and legacy coordinate types. `HearthmereSave.ts` no longer imports scene-owning `HearthmereOpening.ts`; compatibility exports remain.
- **Legacy initialization:** Hearthmere and the internal moat slice now skip `ensureCampaign` and old `normalizeQuestState` within `startGameplayWithCharacter`. Existing legacy zone paths still initialize their old data; the temporary character factory retains the old quest defaults until its later separation.
- **Code inventory:** `tools/world-v2-dependency-audit.mjs` parses source imports with TypeScript, records asset/type edges, checks pure-module dependency rules and publishes a JSON artifact in CI. [Full interpretation](WORLD_V2_DEPENDENCY_INVENTORY.md).
- **New tests:** `tests/worldV2Phase0.test.ts` verifies shared hero roles and opening beats. `tests/worldV2LegacySaves.test.ts` covers synthetic v1 snapshots under the current app (useful regression evidence but **not** a migration obligation).
- **Earlier minimap regression:** Corrected stale test setup in `tests/minimap-terrain.test.ts` to expect the **new** world root, not the hidden old one, after a zone switch. The mini-map renderer itself was not modified.
- **Automated browser smoke:** `tools/world-v2-browser-smoke.mjs` launches the production build in headless Chrome via DevTools, enters the actual current Hearthmere HUD as warrior, mage and assassin, checks non-zero canvas dimensions, catches JS exceptions and uploads three screenshots. This is **not** a full playable ending-to-refuge run nor a mobile GPU measurement.
- **CI:** `.github/workflows/verify.yml` requires `npm ci`, `npm run build`, `npm test`, `npm run test:browser` and `npm run audit:world`; archives screenshots and dependency JSON.

### Verified build and test results

[GitHub Actions run 42532457184](https://github.com/blooprocket-create/APlus/actions/runs/42532457184) succeeded after introducing the audit/browser gates. It ran **127 passing Vitest tests across 17 files**, TypeScript/Vite production build, real Chrome boot smoke for **all three heroes** (quest title `Find your lead`, visible HUD, 1024×497 game canvas in the selected landscape viewport), and full dependency audit with **zero unresolved local imports or forbidden pure-module dependencies**. The run stores downloadable browser screenshots and the full JSON inventory as workflow artifacts.

The observed Vite build warns about JS chunks over 500 kB. This is not a build failure, but must be addressed or justified in Phase 5 mobile budget review.

## 7. Baseline evidence and next-phase gates

| Surface | Phase 0 coverage | Later test gate |
| --- | --- | --- |
| Current boot experience | Real Chromium production-build HUD entry for warrior, mage, assassin; screenshot artifacts | Visual full rescue run and cinematic shot review after world restaging |
| Quest function | Headless opening-to-refuge integration for all three hero roles, giant encounter/defeat/retry tests | Repeat after anchor placement and 3D terrain conversion |
| Combat/animation | Existing combat, hero motion, fiend movement, projectile and VFX tests | Terrain-grounding, pathfinding and cinematic terrain contact |
| Current save system | Current v1 read/write/backup and synthetic step fixtures | **New** V2 save/resume/backup tests; legacy migration is **not** required |
| Mobile UI | Existing touch/viewport tests, desktop-landscape Chrome smoke | Physical iOS Safari/Android Chrome and iPhone 14 Pro 60 FPS/perf under streaming |
| World topology | Static import graph and old-route test fixtures | Canonical atlas, stable IDs, terrain and navigation seams |
| Minimap | Top-down capture unit tests and Chrome boot artifact | Terrain-tile mapping design and mobile GPU readback profiling |

**Limits:** We did not physically play on an iPhone or inspect the full cinematic run in a real device browser. Running all 13 opening steps is covered by headless integration tests, not by the Chrome screenshot smoke. These are **Phase 3/5 acceptance tests**, not evidence already gathered. No old save migration will be attempted (D165).

## 8. Phase 0 closure checklist

- [x] Confirm the *actual* player-facing Hearthmere boot path and distinguish old callable alternate campaign code.
- [x] Create preserve/adapt/retire inventory of major assets, quests, mixed runtime owners and legacy modules.
- [x] Identify current Hearthmere hardcoded geometry, actor and quest coupling.
- [x] Record the approved V2 world and maritime decisions in governing documents (D155–D165).
- [x] Extract shared companion identity and pure opening-step/story DTOs from the legacy modules.
- [x] Stop unnecessary legacy quest/campaign normalization on Hearthmere startup.
- [x] Implement repeatable full import graph coverage with machine-readable CI artifacts; document **zero currently safe source deletions**.
- [x] Establish production TypeScript/Vite build, **127 automated tests**, 3-role real Chrome boot smoke and screenshot evidence.
- [x] Retain tested current v1 read/write behavior while the old prototype is still shipped.
- [x] Explicitly waive old-save migration; define a fresh, versioned **V2** save design requirement.
- [x] Separate hardware/full-cinematic acceptance from the Phase 0 static/regression audit; schedule it in later world integration and performance phases.

**Phase 0 engineering scope: COMPLETE.** It is complete as a **pre-implementation audit, safe extraction and repeatable baseline**, not a claim that World V2 exists or that physical-device performance is proven. No destructive legacy source removal occurred. The following work remains intentionally assigned to later phases rather than misrepresented as tested:

- Phase 1: canonical world seed/version, landmass IDs, coordinate frame, story-anchor registry and cell interface.
- Phase 2: terrain, hydrology, biome, navigation and bake/streaming implementation.
- Phase 3: move Hearthmere's objectives, residents, scenic assets, cinematics and combat into V2; verify full real-browser story flow and new V2 saving.
- Phase 4: ship/ocean travel and persistent maritime state.
- Phase 5: real-device GPU/perf profiling and content authoring tool validation.

## 9. Hand-off for the first World V2 implementation PR

Implement **only** a pure, headless World V2 kernel: atlas manifest, global coordinates, world/landmass/cell/entity/anchor IDs and deterministic seed partitioning. Add pure tests demonstrating same output across cold builds, source-order independence and adding an island without altering existing landmasses. Integrate with current game only behind optional adapters until the kernel tests pass. Do not attempt all continents, maritime simulation, new Hearthmere scenery or deletion of mixed legacy engine code in the first Phase 1 PR.

**Exit evidence:** green full CI, JSON dependency report still passes, and the existing three-role Chrome smoke remains functional. D165 removes the old-save migration block entirely, but new-world save design remains an upcoming requirement.
