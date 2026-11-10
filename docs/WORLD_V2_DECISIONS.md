# Astral Chronicles — World V2 decision register

**Last reconciled:** 2026-11-08 against merged [PR #9](https://github.com/blooprocket-create/APlus/pull/9) and the source tree. **Use [AGENTS.md](../AGENTS.md) first.**

## Decision semantics

- **LOCKED:** explicitly approved by the user (the original D-number is from [DESIGN_DIRECTION.md](DESIGN_DIRECTION.md)). Change only on a new explicit user decision.
- **IMPLEMENTED (STAGING):** tested code or an agent-selected engineering approach, **not** an approval of gameplay content, final world topology, numbers or polish.
- **PROPOSED / OPEN:** needs design approval or evidence; must not be promoted to LOCKED simply because an agent coded it.
- **SUPERSEDED:** a newer decision replaces an older one. Do not resurrect the old behavior.

**Precedence:** the latest explicit user decision wins; document resulting changes here and the architecture/roadmap. If the source code disagrees with a LOCKED decision, the code is not canon.

## User-confirmed world decisions

**Latest clarification — D167, November 10, 2026:** Preserve the current live game's art direction and raise its polish substantially while continuing conversion to an **open-world anime action RPG with cinematic storytelling**. The inspected production reference is [the live game](https://astralcronicles.vercel.app/) at commit `92c0de443594733cdc19881ff4b986b63c99609e`. This refines D166: outside inspirations support the established visual identity. Existing asset/shader implementations may improve, and current visual quality is not a ceiling. It does not change the established isometric gameplay camera, story decisions, world architecture, or integration gates. Specific rendering changes remain implementation proposals until reviewed.

| ID | Status | Decision and nonnegotiable consequence |
| --- | --- | --- |
| D168 (2026-11-10) | LOCKED DIRECTION / POLISH EXECUTION OPEN | The current characters are acceptable and need polish; prioritize the prototype-looking scenery. Trees and static objects should read clearly as their real counterparts, with substantially heavier environmental polish. Preserve the chosen live visual identity while improving environment execution. |
| D167 (2026-11-10) | LOCKED DIRECTION / POLISH EXECUTION OPEN | Use the current live game's art direction as the visual foundation; deliver substantially more polish while continuing the open-world anime action RPG and cinematic story conversion. D166's references are subordinate to this continuity requirement. |
| D153 (supersedes D11/D143) | LOCKED | Keep the game's existing close **isometric gameplay camera**; it is not a third-person chase view. The shipped prototype perspective is the starting point. |
| D154 / D22 | LOCKED (REFINED BY D166) | Beautiful anime/cel-shaded visual identity, shaped silhouettes and painted environments. The existing shaders/assets remain a functional baseline, **not** the final production look. Generic primitives are not the target aesthetic. |
| D166 (2026-11-08) | LOCKED DIRECTION / DETAILS OPEN | Upgrade Astral Chronicles' visual ambition: a **beautiful original anime style**, environments with evocative, lush **Studio Ghibli-leaning painterly atmosphere**, and sharper, dramatic **Solo Leveling-feeling characters and combat effects**. These are inspiration references, not a mandate to copy IP-specific designs. Current original-game art parity is a temporary starting point, **not a quality ceiling**; target shots and final shader/material decisions need user review. |\n| D155 | LOCKED | **Procedural-first true open world**, no exploration limited to the former path/corridor network. Roads are terrain features, not the edges of the world. |
| D156 | LOCKED | **One canonical deterministic geography shared by all players/playthroughs**; private player world/quest deltas do not change the master terrain. |
| D157 | LOCKED | **Multiple continents and islands** in a finite, expandable atlas. No user-approved number, size, outline or seed yet. |
| D158 | LOCKED | **Fully explorable oceans** connecting landmasses; not just teleport portals between zones. |
| D159 | LOCKED | **Player-controlled ships**, with optional fast travel supplementing normal exploration. |
| D160 | LOCKED | Ships handle **responsively like an action RPG** while retaining some believable boat weight; no compulsory simulation of sails/wind logistics. |
| D161 | LOCKED | Sailing retains the **isometric camera**, widening it smoothly for navigation. Do not switch to a third-person chase camera. |
| D162 | LOCKED | Allow landing on **physically accessible coasts**, not just designated docks. Actual grade/depth/obstacles determine validity. |
| D163 | LOCKED | **Owned ships persist at their last physical world location**; fast travel does not auto-move them. Recovery services at ports/shipyards must restore the **same vessel**, with no duplication. Costs and restrictions remain open. |
| D164 | LOCKED | **Hearthmere may be completely restructured spatially**—roads, cliffs, buildings, encounters, cinematic shots and quest positions can change. Preserve assets, quest function and story beats, **not legacy coordinates**. |
| D165 | LOCKED | **Do not migrate old prototype/Hearthmere saves** to World V2. Create clean, versioned V2 saves; never accidentally erase previous local-storage data. |
| D16 / D19 | LOCKED | Select **one** of three heroes (spear warrior, chronomancer, kunai assassin); the other two are **AI-controlled companions**, with player-triggered occasional team actions, not freely player-switched heroes. |
| D101–D115 (opening/return arc) | LOCKED at narrative-beat level | Keep the Hearthmere arrival, Mara/Rowan lead-in, shipment/crisis, overpowering giant attack, rescue/escape/refuge, town occupation, later liberation/defense and giant rematch. The opening giant is **not killed**; the trio's bond and later awakening payoff remain. Specific spatial staging/dialogue/timings may be authored separately. |
| D28 | LOCKED target, NOT VERIFIED | **Minimum 60 FPS on iPhone 14 Pro** during real play; no CI desktop result can certify this. |

For detailed story/ending decisions, [DESIGN_DIRECTION.md](DESIGN_DIRECTION.md) and [DESIGN_OVERVIEW.md](DESIGN_OVERVIEW.md) remain authoritative on creative behavior. This register emphasizes the **World V2 architectural subset**.

## Implemented engineering choices — *not* user-locked canon

| Item | Status | Where and what it means |
| --- | --- | --- |
| Pure versioned atlas, deterministic sub-seeds, stable IDs, global coordinates | IMPLEMENTED (STAGING) | `WorldAtlas.ts`, `WorldIdentity.ts`, `WorldCoordinates.ts`; shared geography infrastructure exists, **published final world does not**. |
| Offline compiled heightfields, coastal masks, climate/biomes and constrained river paths | IMPLEMENTED (STAGING) | `WorldGeography.ts`, `WorldTerrain.ts`, `tools/world-v2-compile.mjs`; radial rivers are not a full watershed solution. |
| Two sample continents, three sample islands, 64-unit cells, 16×16 nav overlays | IMPLEMENTED (STAGING) | `WorldGeographyStage.ts`, `WorldNavigation.ts`. **Never claim the count, dimensions, river locations or anchors are approved.** |
| Full finite staging bounds: 4,608 terrain tiles in 72 verified 8×8 catalog pages | IMPLEMENTED (STAGING) | Offline bake + `WorldArtifacts.ts` + `WorldV2GameplayBridge.ts`. Covers this **staging** extent, not all possible world expansions. |
| Triangle-exact height/slope collision, blocking sea/unsafe rivers, budgeted resident-cell A* | IMPLEMENTED (STAGING) | `WorldSurface.ts`, `WorldNavigation.ts`, `geography-lab.ts`. Does **not** include authored prop/building collision or full companion integration. |
| Close game-like perspective in V2 lab | IMPLEMENTED (STAGING) | `IsometricCamera.ts` shared follow offset and V2 lab. Does not prove future cliff occlusion or all cinematics. |
| Shore-access candidate detection | IMPLEMENTED (STAGING) | `findShoreApproach` in `WorldNavigation.ts`; **not** actual ship landing, boarding or water physics. |
| Same painted rendering idiom as the original game | IMPLEMENTED (STAGING) | [Art parity contract](WORLD_V2_ART_PARITY.md). The lab is **not** final-quality region art; functional integration takes priority. |
| Current Hearthmere entrypoint and unchanged old saves | IMPLEMENTED (LIVE) | `/index.html`, `HearthmereOpening.ts`, `HearthmereSave.ts`. Keep working until V2 replacement passes the cutover gate. |

## Open decisions and production proof gates

| Topic | Status | Must happen before calling it complete |
| --- | --- | --- |
| Canonical atlas world ID, seed, boundaries, scale and landmass layouts | OPEN | User/creative review, then deliberate publish/version/fingerprint policy. Staging fixtures cannot be silently relabeled canonical. |
| Exact Hearthmere terrain plan and final semantic anchor catalog | OPEN | Narrative/site plan + user review of major creative changes. Keep existing story beats, not existing coordinates. |
| Runtime NPC/companion navigation on V2 terrain and around authored obstacles | OPEN | Integrate existing actors/AI, colliders/bridges, scene pins/streaming and tests for rescue/escort. |
| Streamed distant terrain LOD, silhouettes and long-range navigation | OPEN | Implement and profile; warm cells currently use active geometry and A* searches resident cells only. |
| Complex hydrology, tributaries, crossings, shoreline grade/landing QA | OPEN | Design/QA beyond current constrained radial channels and candidate shore probe. |
| New V2 save/resume and persistent world-state deltas | OPEN | Versioned namespace, reliable checkpoints, reload/defeat tests; **no legacy migration**. |
| Controllable boats, physical free landing, ship ownership/location, recovery and fast travel | OPEN | Phase 4 end-to-end water → land → water → reload/recovery tests. |
| Mobile FPS/thermal/memory/draw-call budgets | OPEN | Physical iPhone 14 Pro measurement; optimize until target is met. |
| Final environment/cinematic art quality | DIRECTION LOCKED (D166), EXECUTION OPEN | Start original target look-development and composed gameplay scene review in Phase 2.5. Existing painted visual parity is a baseline, not the final target. Large-scale region/cinematic asset production remains Phase 5; exact targets need user approval. |

## Recording a new decision

For each newly confirmed change: add a D-number cross-reference or a clearly named decision entry, state **LOCKED / IMPLEMENTED (STAGING) / PROPOSED / OPEN / SUPERSEDED**, add rationale and consequences, update [WORLD_V2_ARCHITECTURE.md](WORLD_V2_ARCHITECTURE.md), [WORLD_V2_STATUS.md](WORLD_V2_STATUS.md) and the [roadmap](PRODUCTION_ROADMAP.md) in the **same PR**. Do not make a user decision from a coding-agent suggestion, a renderer screenshot, a default parameter, or an unreviewed test fixture.
