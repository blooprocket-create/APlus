# World V2 Phase 3.0 — first playable Hearthmere story integration

**Status:** First Phase 3.0 integration slice **merged** in [PR #11](https://github.com/blooprocket-create/APlus/pull/11) (commit `800eeead491179c6a162c5bb0c384c0e0b9fd1a9`). [PR branch full CI: SUCCESS](https://github.com/blooprocket-create/APlus/actions/runs/42570055439) — **181/181 tests**, existing opening smoke for all three heroes, selected-role World V2 entry tests and all 11 geometry screenshots. This is **only an opt-in first-beat vertical slice**—**not** the complete Phase 3 campaign port, and not a claim that the existing full quest engine, NPC AI, cinemas or V2 save system are running on procedural terrain.

**Design authority:** [locked world decisions](WORLD_V2_DECISIONS.md), [Phase 3 acceptance plan](WORLD_V2_PHASE3_HANDOFF.md), [World architecture](WORLD_V2_ARCHITECTURE.md), [source owners](../AGENTS.md).

## What the slice introduces

- **`/world-v2-story.html`** is a separate, reversible opt-in browser entrypoint. Existing live `/index.html` and its save/quest/asset state remain unchanged. The original World V2 QA geography lab remains the independent benchmarking entrypoint.
- **Original selected hero rigs** for warrior/Brynhildr, mage/Celestia and assassin/Akatsuki. The other two original character rigs appear in a **formation-follow preview only**, with their feet sampled over terrain. This is **not** the real companion navigation/decision/combat AI.
- **A first playable story objective:** approach the temporary first lead within the already-baked `hearthmere.arrival` clearing, press **F** (or tap Investigate), and receive **the actual role-specific opening dialogue**. The step advances `arrival → market`, and then explicitly **halts**: the gatekeeper and all later story beats are *not yet ported*. No pretend auto-completion.
- **Shared script owner:** `src/game/HearthmereScript.ts` centralizes existing role-specific leads, dialogue, machine-step transitions and objective titles. `HearthmereOpening.ts` now calls this same data. The new V2 interface does **not** clone a second full quest engine.
- **Provisional site plan:** `src/game/WorldV2OpeningPlan.ts` enumerates every current story machine step as `hearthmere.beat.<step>`, with a staging parent/clearance requirement but **no baked final world positions**. Only `arrival` has a small, reversible test offset inside `hearthmere.arrival`. These IDs/offsets are a proposal **not a published canonical Hearthmere plan**.
- **UI ownership:** `src/ui/WorldV2ArrivalSession.ts` owns the first-beat prompt/role select, not the terrain generator; it calls pure gameplay story functions and only permits interaction on actually loaded, walkable ground.
- **Reuse core spatial systems:** `geography-lab.ts` (reused by the new HTML page) still owns Phase 2 screenshot/terrain rendering, checksummed resident pages, native close perspective, terrain collision and its player control. It does not become a second gameplay engine.

## Verification

- The first four Phase 3 unit tests check every 13-step mapping, named anchor validity, hero/companion role coverage, actual role-specific dialogue, proximity/walkability gating and stopping after one beat.
- The real Chrome smoke visits the opt-in new page as **Celestia**, verifies warrior + assassin visual roster, actually walks with keyboard input to the lead over streamed ground, presses F and validates her **existing** dialogue and transition to `market`. It also tests Brynhildr through the clickable hero picker and Akatsuki through the direct role link, checking fresh `arrival` state and each unique companion pair. A PNG is included in the same Hearthmere browser smoke archive.
- Existing Hearthmere three-role start, Phase 1 streaming, Phase 2 geography/navigation and screenshot regression tests remain required. A separate new World V2 save is **not** written by this test.

Run `npm run build`, `npm test`, `npm run world:geo:verify`, `npm run audit:world`, `npm run docs:check`, `npm run test:browser` and `npm run test:visual`. [Full PR run 42570055439 passed](https://github.com/blooprocket-create/APlus/actions/runs/42570055439); the prior original game remained covered by the same regression matrix. The normal main-branch post-merge verification is tracked independently.

## Crucial non-claims and next steps

**Not yet working on V2:** actual playable gatekeeper/Mara/Rowan interactions after `arrival`; quest-gated cart and escort sequences; giant attacks/cinematic/reveal; real companion AI and combat; full authored town, buildings/bridges collision; world-state persistence or fresh V2 save/reload; user-approved published geography/anchor layout; sailing and ship recovery.

**Next small slice (3.1/3.2):** Build the authored *spatial* site catalogue and validate reachability and physical scene clearance; introduce a real V2 gameplay adapter into `GameEngine`, swapping its movement/ground query and scenario scene owner without reproducing combat/input/companion logic. Port a full NPC interaction alongside the first lead, then grow the preserved 13-step opening as one sequence. Validate all three hero playthroughs and scenario streaming pins before cutover.

**Do not** use the existing old `HearthmereOpening` scene's entire flat-road art or its fixed X/Z safety bounds as the World V2 world. Shared quest text and step ownership may be extracted safely; relocation and playable behavior must be intentionally adapted.
