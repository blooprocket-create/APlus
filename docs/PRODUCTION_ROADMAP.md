# The Starforged Crown production roadmap

**2026-11-09 owner-requested art investigation:** an isolated [Observatory vertical-slice pipeline](OBSERVATORY_ATELIER.md) explores reference-led UV couture, continuous original sculptures, baked geometric occlusion, painted material/sky authoring and a marker-linked original Blender ability. This is an explicit visual-priority exception for this branch, not a change to Phase 3 completion requirements. Production art acceptance and hardware profiling remain open.

November 10 evidence retains pass 28 after actual browser movement, damage and
three ability phases; local checks pass 189 tests. A finer shadow pass was
rejected for weak visible gain, and a malformed portrait source was rejected
before fitting. The full-precision portrait follow-up remains a source experiment.
These findings do not complete the high-end art target or any World V2 gate.

The later investigation changes the upstream asset source: original authored
images → offline reconstruction → calibrated multi-view UV paint → editable
weighted Blender source → the existing live rig. It materially improves the
hero and guardian; it does not by itself establish production retopology,
facial performance, foliage quality or environmental art acceptance. Browser
images, rather than inference previews, remain the review evidence.


Updated November 8, 2026. **Active World V2 engineering roadmap and downstream campaign-production plan.** Start with [agent instructions](../AGENTS.md), [current implementation status](WORLD_V2_STATUS.md) and [locked decisions](WORLD_V2_DECISIONS.md) before following individual milestones. The downstream campaign sections of this document are a content plan, **not proof that their features have shipped**. [Design decisions](DESIGN_DIRECTION.md) govern creative requirements. [The design overview](DESIGN_OVERVIEW.md) summarizes them, [the branching draft](BRANCHING_CAMPAIGN.md) supplies campaign continuity, and [the opening draft](OPENING_HOUR.md) supplies the first playable story beats.

## Where development starts

The player-facing game starts in Hearthmere and currently runs through refuge, with local resume and a defeat retry. The isometric camera, existing combat, and companion behavior are the starting point. The earlier moat test is an internal reference for cooperative puzzles and connected travel. World streaming, persistent branching consequences, production cinematics, and sustained mobile performance remain to be proven.

Build on the opening in the existing TypeScript and Three.js project. Reuse working input, combat, rendering, and persistence where they meet the new requirements. Add each production milestone to the same campaign.

## World Architecture V2 — active priority and phase gates

**Product authority:** [decision register](WORLD_V2_DECISIONS.md) (D153–D165), [world architecture](WORLD_V2_ARCHITECTURE.md), [implementation status](WORLD_V2_STATUS.md). The user approved a procedural-first, deterministic shared world with multiple continents/islands, navigable oceans and persistent ships; Hearthmere's **layout may be completely rebuilt** while asset/quest/cinematic functionality survives. **Do not migrate old prototype saves**. The default playable opening is **still** the original Hearthmere code, not the V2 terrain lab.

| Phase | Engineering / product state | What is shipped or demonstrable | What is required before declaring the phase production-complete |
| --- | --- | --- | --- |
| **0 — Legacy audit/preflight** | **Engineering complete** | Preservation inventory, current/legacy boundaries, baseline tests and dependencies ([audit](WORLD_V2_PHASE0_AUDIT.md)). | No full deletion of old reachable modules until Phase 3 regression and cutover. |
| **1 — World kernel** | **Engineering complete** | Versioned seed/atlas, semantic anchors, global coordinates, cell streaming and offline bake, opt-in game port ([Phase 1](WORLD_V2_PHASE1_KERNEL.md), PRs #4–5). | Real approved geography was out of Phase 1 scope. |
| **2 — Geography/terrain/nav foundation** | **Staging engineering core complete; production gates OPEN** | Deterministic sample 2-continent/3-island geography, 4,608 baked cells in 72 checksum-verified pages, native close camera, triangle collision/ground movement, cross-cell A* and shore probes ([Phase 2](WORLD_V2_PHASE2_RUNTIME.md), PRs #6–9). | Approved canonical atlas/anchors, more sophisticated land/river/bridge & authored-collider rules, distant LOD/proxies, broader performance evidence. Some integration work belongs to Phases 3/5. |
| **3 — Hearthmere on World V2** | **IN PROGRESS — first lead in PR #11** | [Opt-in first arrival integration](WORLD_V2_PHASE3_PROGRESS.md) reuses actual hero rigs and the existing dialogue/step script on V2 terrain; [full handoff](WORLD_V2_PHASE3_HANDOFF.md). | All other beats, real companion AI/combat, authored town/NPCs/cinematics, independent new V2 save/resume and correct giant/occupation outcomes across all three heroes. |
| **4 — Ships, persistent world state, sea traversal** | **Future — not implemented** | Architectural behavior approved, shoreline candidate search exists. | Pilot ship→land→island→ship→reload/recovery with ownership/persistent location; optional fast travel must not move ships implicitly. |
| **5 — World production/performance/authoring** | **Future — production gates open** | Visual staging review infrastructure and shared painterly art pipeline exist. | Distant LOD, bigger region tools, final environment detailing, and measured sustained 60 FPS on iPhone 14 Pro (plus Apple/Android browser validation). |

**Important distinction:** *Engineering complete* describes the covered tests/code, not final creative approval. The staged landmass count, seed, exact 64-unit tile and proposed Hearthmere coordinates are **not canon**. The planned ship behavior is **not** currently playable. A merged PR is never a substitute for a three-role, saved, repeatable opening or on-device performance proof.

**Current assignment:** Continue the [Phase 3 integration](WORLD_V2_PHASE3_HANDOFF.md) after the [first opt-in arrival slice](WORLD_V2_PHASE3_PROGRESS.md), connecting real NPCs, hero input/combat/companion ownership and cinematic anchors to V2. Keep original Hearthmere fully playable until all V2 story acceptance gates pass. Integrate the existing game's movement, AI, combat, interaction/cinematic and state owners rather than rewriting them. Let functionality lead; defer decorative art polishing while preserving the established anime/cel-shaded style ([art contract](WORLD_V2_ART_PARITY.md)).

**Required tests and evidence for each applicable PR:** `npm run build`, `npm test`, `npm run world:geo:verify`, `npm run world:geo:verify -- --reverse`, `npm run audit:world`, `npm run test:browser`, `npm run test:visual`, `npm run docs:check`. Existing CI passing on [the merged Phase 2 baseline](https://github.com/blooprocket-create/APlus/actions/runs/42566887740) certifies only that test matrix. Add story-specific browser scenarios and real-world device profiling before declaring the relevant gates passed.

## Downstream content-production handoffs (after World V2 integration)

The following materials still govern quests, cinematics, combat and broader campaign development, but they **do not replace** the new [Phase 3 World V2 handoff](WORLD_V2_PHASE3_HANDOFF.md) as an initial implementation task. Existing story briefs often contain **old world layout examples**—reuse their behaviors and narrative intent, not the old coordinate geometry.

## What to give the agents

| Handoff | What the agent needs in concrete terms | First use |
| --- | --- | --- |
| **Hearthmere opening build brief** | Marked-up blockout with routes, entrances, sightlines, encounter footprints, refuge and return points. A beat sheet from the 15–20-minute town lead-in through the giant attack, civilian rescue, and escape. For each beat, specify player input, companion jobs for each selected hero, triggers, success and defeat outcomes, pause and reload behavior, and asset placeholders. Include a short scene script and shot list for the giant reveal. | Reuse story/behavior requirements during Phase 3; start with the V2 integration contract, not the old spatial layout. |
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

## Current agent handoff

**Immediate next work:** [Phase 3 — Hearthmere on World V2](WORLD_V2_PHASE3_HANDOFF.md). Preserve the original opening and its 13 machine story IDs; introduce a gated V2 gameplay session, named scene anchors, terrain/prop collisions, NPC and companion navigation, staged cinematic and quest integration, and a **fresh versioned World V2 save**. Keep the staging map provisional until reviewed. Do **not** migrate old saves or use the old corridor as the hidden new-world backbone.

**Definition of done:** Every hero can play the entire opening on V2, rescue/escort to refuge, handle defeat/skip/resume and persist the right giant/occupation flags, with genuine continuous ground traversal. Exact world layout, additional coasts and vessel gameplay are separate creative/Phase 4 decisions. The 60 FPS device requirement remains unverified.

**Status/evidence discipline:** Every PR updates [status](WORLD_V2_STATUS.md) and the relevant [decision ledger](WORLD_V2_DECISIONS.md) when a user decision changes; document remaining risks rather than silently calling a prototype production-ready.
