# The Starforged Crown production roadmap

November 5, 2026. Proposed implementation order and handoff checklist. [Design decisions](DESIGN_DIRECTION.md) govern creative requirements. [The design overview](DESIGN_OVERVIEW.md) summarizes them, [the branching draft](BRANCHING_CAMPAIGN.md) supplies campaign continuity, and [the opening draft](OPENING_HOUR.md) supplies the first playable story beats.

## Where development starts

The player-facing game starts in Hearthmere and currently runs through refuge, with local resume and a defeat retry. The isometric camera, existing combat, and companion behavior are the starting point. The earlier moat test is an internal reference for cooperative puzzles and connected travel. World streaming, persistent branching consequences, production cinematics, and sustained mobile performance remain to be proven.

Build on the opening in the existing TypeScript and Three.js project. Reuse working input, combat, rendering, and persistence where they meet the new requirements. Add each production milestone to the same campaign.

## World Architecture V2 takes engineering priority (November 8, 2026)

The user approved a **procedural-first, one-seed canonical, multi-continent/island world with fully explorable oceans**, ship control, free physically valid coastal landings, optional fast travel, persistent vessels and port recovery. **Hearthmere may be spatially redesigned** as dramatically as needed; the preservation constraints apply to quests, assets, character/companion functionality, story outcomes and cinematics, not to previous X/Z positions. D165 explicitly removes migration of old Hearthmere/prototype saves; new World V2 progress will have its own save system. See [World Architecture V2](WORLD_V2_ARCHITECTURE.md) for locked decisions versus proposed systems and [Phase 0 audit](WORLD_V2_PHASE0_AUDIT.md) for the actual legacy inventory.

**Priority sequence before the earlier content-production gates:**
1. **Phase 0 — completed engineering audit:** Document current/legacy dependencies, preserve Hearthmere story/assets, extract shared code, and establish passing CI, three-role Chrome smoke and dependency inventory. Do not bulk-delete prototype modules.
2. **Phase 1 — engineering foundation complete:** Versioned deterministic atlas and semantic anchors, double-precision global coordinates, seam-safe cell streaming, reproducible offline preview bake, checksummed HTTP loading, an isolated browser QA lab and opt-in GameEngine bridge. No production geography or Hearthmere conversion implied. [Phase 1 evidence](WORLD_V2_PHASE1_KERNEL.md).
3. **Phase 2 — screenshot-driven art verification now active:** [11-view visual review system](WORLD_V2_SCREENSHOT_REVIEW.md) and [screenshot-grounded iteration log](WORLD_V2_VISUAL_REVIEW_LOG.md) capture the actual Three.js geography from fixed world/camera positions, compare against previous builds, and uncover invisible-to-unit-test flaws (ocean gaps, steep river ravines, hovering water meshes). Continue iterating on this evidence before declaring visually complete.
4. **Phase 2 — staging geography built, production work remains:** Deterministic two-continent/three-island test atlas, beaches and ocean, elevations, biomes, rivers, flat story pads and connecting routes, pre-baked into 302 inspectable tiles. The **exact map and story coordinates are not approved canon**; complete atlas paging, collisions/navigation and user-reviewed landmass shapes are still necessary. [Phase 2 evidence](WORLD_V2_PHASE2_GEOGRAPHY.md).
5. **Phase 3:** Rebuild Hearthmere on V2, moving story staging/actors freely while maintaining opening beat IDs and assets, with all three hero opening and **new V2 save/resume** acceptance runs.
6. **Phase 4:** Add persistent world deltas, free ocean/ship traversal, save-compatible boarding/disembarkation and port recovery.
7. **Phase 5:** Validate mobile performance, map representation and scalable authoring; only then use the same pipeline for other continents.

**Gate:** Build/test CI green, real-browser launch smoke and three-role opening integration tests before declaring the Phase 0 engineering audit complete. Full cinematic visual QA and device-specific performance remain later production gates, and legacy save migration is explicitly out of scope. The 60 FPS iPhone 14 Pro target must be verified on hardware rather than assumed from a desktop build. A V2 engineering PR should remain small, runnable and reversible; it must not attempt the entire world conversion in one commit.

## What to give the agents

| Handoff | What the agent needs in concrete terms | First use |
| --- | --- | --- |
| **Hearthmere opening build brief** | Marked-up blockout with routes, entrances, sightlines, encounter footprints, refuge and return points. A beat sheet from the 15–20-minute town lead-in through the giant attack, civilian rescue, and escape. For each beat, specify player input, companion jobs for each selected hero, triggers, success and defeat outcomes, pause and reload behavior, and asset placeholders. Include a short scene script and shot list for the giant reveal. | Build the first substantial playable part of the actual game. Start here. |
| **World and delivery specification** | World topology and stable IDs for cells, paths, actors, and encounters. Define how town and countryside meet, how state and actors survive unloading, and how streaming interacts with fast travel and resume. Specify fresh World V2 versioned saves (without legacy migration), defeat versus resume, and browser storage and download behavior. Define cloud conflict rules before cloud implementation. Record reference browsers, device scenarios, performance budgets, and how to capture measurements. | Give the opening durable world state. Make the next region a repeatable engineering task. |
| **Campaign mission graph and state rules** | Stable mission and beat IDs, ordered dependencies, route eligibility, exact choice conditions, effects, irreversible warnings, follow-up missions, and fallbacks for missing allies. Enumerate each route's three ending predicates, how mixed outcomes resolve, and which scenes vary. Include example saved states and expected results. Start by translating the existing reservoir fork and late route commitment into this format. | Prove a choice can change playable content, persist across sessions, and reach a valid ending. |
| **Combat, progression, and economy catalogs** | For each hero, specify how the four ability trees change moves, when nodes unlock, the fixed awakened kit, and companion behavior. Give enemies and bosses phase rules, telegraphs, attacks, recovery, and player responses. Define region danger bands, item and recipe data, progression, sources and sinks, and the first gather → craft → equip or commission loop. Begin with opening kits and one complete example of each system. | Balance the first region and give later content authors reusable patterns. |
| **Art, cinematic, and audio production briefs** | Provide annotated visual targets for one hero, a giant, and a town district. List assets and reuse rules with rig, animation, effect, and mobile cost budgets. For flagship scenes include blocking, framing, action beats, timing, dialogue and subtitle IDs, vocal treatment, music cues, and skip handoff. Use the opening giant reveal as the first reference scene. | Give every content agent a shared quality target they can match and test. |
| **Campaign content inventory and pacing budget** | Track each region, mission, dungeon, boss, side story, and scene with prerequisites, route availability, expected duration, reusable assets, and status. Report per-playthrough totals and sample paths. Track measured duration once each region is playable. The current 45–55 main-story hours are a provisional planning target. | Estimate production and find missing playtime before expanding the world. |

The first three handoffs need a usable first version for the opening and the first durable choice. The catalogs and production briefs grow alongside the first region. Content packs can use the same structure for each subsequent region.

## Build order and gates

### 1. Hearthmere opening

Block out the market, forge and work yard, shipment square, shelter route, and physical exit to refuge. Use a shared lead-in for all three classes, with class-specific reasons for arriving. Give Mara and Rowan a playable interaction before the crisis. During the giant attack the player rescues civilians and gets out. The trio meets as strangers, and the giant survives for the later rematch. Record the exact state at the refuge so a subsequent mission can read it.

**Gate.** Play from arrival to refuge with each hero, including one skipped cutscene, one interrupted session, and one defeat. Verify that the next required action remains clear, the right party members are present, and the route uses continuous travel. On a physical iPhone 14 Pro, record frame timing during town traversal and the giant sequence against the 60 fps requirement. Compare the reveal, playable danger, and handoff back to control with the approved scene brief.

### 2. First persistent region

Connect a settlement, camp, exploration route, and dungeon to the opening. Exercise a repeatable adventure loop with loot or gathering, a useful upgrade, and a reason to leave the main road. Introduce one behavior-changing upgrade per hero and a representative gathering and crafting chain. Prove a named defeat stays recorded while ordinary enemies repopulate. Use the reservoir fork as a separate campaign test fixture if it falls outside the first region.

**Gate.** Play a complete adventure, leave and resume mid-route, then defeat a named boss and test the return trip. Exercise both reservoir outcomes across reload and confirm the next scene and local world state reflect the decision. Repeat enough of the route on Apple and Android reference devices to catch load hitches and sustained performance regressions.

### 3. Campaign from opening to credits

Build the critical path in graybox. Connect the occupied-town return and liberation, the parley and witness branches, the defense and giant rematch, and the late choice of final campaign. Implement a playable path through each finale and the rules for all nine principal endings before polishing their scenes. Use stub assets for unapproved presentation. Prove the opening giant's rematch and first awakening as a separate encounter milestone.

**Gate.** Run one complete playthrough per final campaign and verify all nine principal endings with state fixtures. Verify that every supported path can progress when a named witness or ally is unavailable. At final campaign commitment, check the warned closure of the prison rescue and persist the fate of anyone still captive. Review the full run for narrative continuity, travel friction, and pacing.

### 4. Region production and release

Turn graybox regions into shippable content in batches. Fill out side adventures, professions, mounts, town travel, builds, companion behavior, environmental art, voice, and cinematics according to approved regional briefs. Finish offline downloads, recovery, and optional cross-device synchronization against real campaign saves. Budget and verify the heaviest boss and town scenes on the target devices as the assets arrive.

**Gate.** Measure real first-playthrough duration, including route-specific and optional play, against the content budget. Verify saves through upgrade, offline play, and synchronization conflicts. Test touch play on Apple and Android and run sustained performance checks on the iPhone 14 Pro. Check all endings, accessibility settings, readable touch controls, and cinematic skip/resume on representative full runs.

## The format for each implementation ticket

Give the agent one milestone or playable beat at a time. Attach the precise build brief, governing decision IDs, entry and exit conditions, scope boundaries, required assets or placeholders, save mutations, and acceptance scenarios. Mark unresolved creative decisions separately from delegated tuning. Ask the agent to return a playable entry point, automated checks, manual test evidence, and any decisions made during implementation. Use `npm run build` and `npm test` alongside the milestone's manual checks.

For example, the reservoir ticket would identify the exact warning trigger, the two committed outcomes, the recorded status of Rowan and the ward, and the condition of Lowbank's lower district and clinic. It would list the follow-up scenes, routes, and services that read those facts, including what happens on reload. The state fixture would load each branch and verify the corresponding consequences. Exact staging and Mara's later trust triggers need their own authored rules.

## First implementation handoff

The **immediate** assignment is **World V2 Phase 2 completion**: review the currently implemented [staging continent/island geography](WORLD_V2_PHASE2_GEOGRAPHY.md), then settle a canonical published atlas and add paged terrain plus collision/nav overlays on the completed [Phase 1 platform](WORLD_V2_PHASE1_KERNEL.md). The [Phase 0 audit](WORLD_V2_PHASE0_AUDIT.md) is complete for engineering preflight and documents remaining *later-phase* visual/device requirements. The [Hearthmere opening build brief](HEARTHMERE_OPENING_BUILD.md) remains an important **narrative/behavior** handoff, but its old spatial blockout is not a World V2 constraint.
