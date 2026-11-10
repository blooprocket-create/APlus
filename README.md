# Astral Chronicles

A local-first browser action RPG built with TypeScript and Three.js. The playable opening of **The Starforged Crown** begins in Hearthmere, where three strangers face a giant attack. Choose a spear warrior, chronomancer, or kunai assassin.

The [story foundation](docs/OPEN_WORLD_STORY.md) and [campaign treatment](docs/CAMPAIGN_TREATMENT.md) describe the larger connected world and planned campaign. The current build runs from arrival in Hearthmere to the refuge camp.

**Coding agents (Claude/Codex/others): start with [AGENTS.md](AGENTS.md)** (and [CLAUDE.md](CLAUDE.md) for Claude). The [World V2 status](docs/WORLD_V2_STATUS.md) distinguishes verified code from staging samples and unfinished systems; the [decision register](docs/WORLD_V2_DECISIONS.md) identifies locked decisions. [Design overview](docs/DESIGN_OVERVIEW.md) is for the broader creative requirements. [Saving and offline play](docs/SAVE_AND_OFFLINE.md) covers guest access, optional cloud/cross-device sync, evolving hero saves, recovery backups, and downloaded-content offline play.

The new [branching campaign draft](docs/BRANCHING_CAMPAIGN.md) develops major decisions and persistent consequences around a confirmed three-route, nine-ending structure: hopeful, bittersweet, and dark per route, plus variations. Particular new scenes and ending conditions are awaiting review.

The [opening sequence draft](docs/OPENING_HOUR.md) develops the confirmed 15–20-minute playable lead-in in Hearthmere, with proposed character introductions and first-hour crisis beats.

The [crafting and economy brief](docs/CRAFTING_DESIGN.md) collects confirmed profession, resource, equipment, and NPC-trade requirements as that part of the interview develops.

The [narrative and cinematic brief](docs/NARRATIVE_PRESENTATION.md) collects the presentation, generated vocal audio, and choice-driven narrative requirements. Branch scope and vocal coverage are still being refined.

The [resistance design](docs/RESISTANCE_DESIGN.md) records the faction conflict chosen under the user's delegation; exact branch missions and endings remain in design.

The [exploration and puzzle brief](docs/EXPLORATION_PUZZLES.md) collects the three class utilities, automatic companion use, exploration freedom, and puzzle direction.

The [combat and progression brief](docs/COMBAT_PROGRESSION.md) collects the action foundation, class skill trees, awakening, difficulty modes, and defeat direction.

## Current priority: Phase 2.5 gameplay & rendering convergence\n\nBefore completing the Phase 3 Hearthmere migration, integrate the **existing real gameplay engine** on V2 streamed ground: movement, all currently implemented three-hero combat/abilities, NPC/enemy/companion AI, animation, effects, shaders, audio, camera, HUD and desktop/touch controls. Use shared owners, not a duplicated lab-only game. The old painted styling is an implementation baseline; the new desired art quality combines **lush, painterly Ghibli-leaning environments** with **dramatic, sharp Solo Leveling-feeling anime heroes and VFX**, in an original unified look. Full final polish is not claimed. See [Phase 2.5 handoff](docs/WORLD_V2_PHASE2_5_GAMEPLAY_INTEGRATION.md) and [revised art contract](docs/WORLD_V2_ART_PARITY.md).\n\n## Agent handoff and roadmap

The [production roadmap](docs/PRODUCTION_ROADMAP.md) and [Phase 3 Hearthmere integration plan](docs/WORLD_V2_PHASE3_HANDOFF.md) are the active work queue. Phase 2's staged engineering core is merged, but the **existing Hearthmere opening is not yet running on World V2**; exact atlas layout, ships, persistence on V2, distant LOD and physical-device FPS remain open. See [the status matrix](docs/WORLD_V2_STATUS.md) before assigning work.

### Phase 3 — first playable story integration

The [opt-in World V2 story entry](/world-v2-story.html) begins Hearthmere's migration without replacing the live game. Select Brynhildr, Celestia or Akatsuki, walk across compiled V2 terrain with the native close camera, and investigate the first role-specific lead. The same original dialogue and step progression powers this initial `arrival → market` interaction. **It then stops**: the rest of the quest chain, companions' combat AI, NPCs, cinematic sequences and new V2 save/reload are not yet ported. This is a functional **Phase 3.0 prototype**, not the complete Hearthmere quest experience. See the [Phase 3 progress report](docs/WORLD_V2_PHASE3_PROGRESS.md).

## World Architecture V2

The next engineering program is [World Architecture V2](docs/WORLD_V2_ARCHITECTURE.md): a deterministic canonical procedural world with multiple continents and islands, freely navigable oceans, persistent ships and an open-world Hearthmere rebuilt around story anchors rather than old coordinates. The [Phase 0 legacy audit](docs/WORLD_V2_PHASE0_AUDIT.md) and [dependency inventory](docs/WORLD_V2_DEPENDENCY_INVENTORY.md) documents active assets/quests, legacy systems and retirement boundaries and no-legacy-migration policy. The current game remains playable at `/index.html`; a separate **functional World V2 geography sandbox** now demonstrates close-perspective walking, 3D ground collision, streamed pages and test navigation. That sandbox does not yet run the existing Hearthmere quests.

### World V2 streaming lab (Phase 1)

The completed Phase 1 world platform has a separate **development/QA scene** available at [`/world-v2-lab.html`](world-v2-lab.html). Move with WASD/arrow keys (Shift to go faster) or the touch D-pad. It streams an **offline-baked 81-cell heightfield** from versioned, SHA-256-checked HTTP artifacts and demonstrates deterministic terrain seams, global coordinates, origin rebasing, and active/warm cell streaming in an isometric view. This is **provisional geometry, not the published continents or redesigned Hearthmere**; the normal game remains at `/index.html`.

Read [World V2 Phase 1 completion](docs/WORLD_V2_PHASE1_KERNEL.md) for compiler commands, source contracts, QA evidence and the Phase 2 integration handoff. `npm run build` generates the world preview automatically; `npm run world:bake:verify` rechecks its byte-level reproducibility.

### World V2 geography lab (Phase 2 staging)

Explore the [3D geography lab](/world-v2-geography.html) to see **two staged continents, three islands, coastlines, ocean depths, forest/highland/beach biomes, river channels, and Hearthmere's proposed story pads and roads**. Use the buttons to jump to mainland, island and open-ocean sample regions. A fully **offline-baked atlas overview** shows all five landmasses in the top-right.

This map is **for inspection and iteration, not yet approved canonical geography**; its five landmasses, names, sizes and Hearthmere coordinates are intentionally provisional. The existing normal game continues untouched. The compiler now writes **4,608** staged geographical cell files organized into **72 checksummed pages**, validating seams, slopes, water classification and baked navigation masks. The lab uses the same [original Hearthmere painted-art systems](docs/WORLD_V2_ART_PARITY.md)—shared watercolor/paper shader, sky, lighting, sculpted foliage and painted meadow—not the early generic cone/sphere proof-of-concept scenery. The automated gallery includes the actual Hearthmere screenshot for visual comparison. The [automated screenshot review guide](docs/WORLD_V2_SCREENSHOT_REVIEW.md) and [visual iteration log](docs/WORLD_V2_VISUAL_REVIEW_LOG.md) document the actual captured render evidence, critical defects and improvements. `npm run test:visual` writes 11 screenshot PNGs plus an offline HTML gallery and contact sheet to `test-artifacts/world-v2-review/`. CI uploads those visuals on each PR and main push.

See [Phase 2 functional world and navigation](docs/WORLD_V2_PHASE2_RUNTIME.md) for the closer native camera, slope/shore/water collision, ground-navigation rules and complete staging atlas. Try WASD/arrow keys and right-click on visible ground to inspect a path. Open-water jumps are camera inspection only, not ships or walking-on-water gameplay.

See [Phase 2 geography implementation](docs/WORLD_V2_PHASE2_GEOGRAPHY.md). To reproduce: `npm run world:geo:bake`, then `npm run world:geo:verify` and `npm run world:geo:verify -- --reverse`.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:5173. Production build: `npm run build`. Tests: `npm test`.

## Play

Choose a hero and select **Start Hearthmere**. Select **Continue Hearthmere** to resume that hero’s local run. Follow the town through the giant attack and take the civilians to refuge. See the [opening build brief](docs/HEARTHMERE_OPENING_BUILD.md).

| Action | Controls |
| --- | --- |
| Move | WASD / arrow keys |
| Chain basic attacks | Hold left mouse, J, or Space |
| Evade | Shift / K |
| Abilities | Q / E or 1 / 2 |
| Ultimate | R / 3 at 100 energy |
| Mending flask | H |
| Interact | F / Enter |
| Pause / resume | Escape |

On phones and tablets, use landscape, move with the left thumbstick, and tap the action buttons or nearby interaction prompt. The pause menu provides sound, camera shake, and **Save & return to heroes**.

Each hero’s progress is saved in the current browser. Defeat returns you to the waystation and preserves the progress you secured. The same campaign opens for all three classes.

To start over, choose the hero on the hero selection screen and select **Delete save**. Confirm to permanently remove that hero’s local progress and recovery backup; other heroes’ saves are unchanged. Select **Keep save** or press Escape to cancel.

## Verification

The Vitest suite includes full campaign progression, puzzle answers, chapter revisit safety, branching route connectivity, ending choices, cinematic timing and cleanup, and boss reward idempotency. It also covers persistence and account isolation, quest progression, procedural generation, management systems, combat telegraphs, evasion, enrage timing, sanctuary regeneration, healing charges, pause ownership, defeat/revival, portal locks, expedition rewards, journey restoration, and asynchronous saves. Rendering is stubbed in gameplay integration tests; visual checks still require a browser.

Mobile tests cover independent joystick/attack/ability pointers, pointer cancellation, quick taps, interruption reset, HUD rebinding, rotation pause ownership, viewport sizing, density budgets, and denied fullscreen/orientation APIs. With the dev server running, open `http://127.0.0.1:5173/tests/mobile-preview.html` for actual-game frames from 640 × 320 to 1024 × 600 plus portrait. Its layout check flags small, overlapping, or off-screen combat controls. Using 127.0.0.1 keeps QA saves separate from localhost. These browser-frame checks do not replace physical iOS Safari and Android Chrome testing, including notches, browser chrome, the software keyboard, and OS gesture interruptions.

This is a single-player campaign foundation with procedural art. Completion time has not been measured; it is not a verified twenty-hour adventure. There is no server, multiplayer, or cloud synchronization.

The connected-world tests cover all field activity rules, chapter roads, travel locks, town returns, partial objective persistence, hero-specific map seeds, legacy checkpoint layouts, and the walkability of objectives across multiple generated maps. Browser checks exercise the real renderer and touch HUD separately from the rendering stubs in integration tests.


## Optional visual atelier

`/atelier.html` opens the isolated Remembering Observatory art investigation. It uses the existing engine, animation and combat; the regular opening remains `/index.html`. See [the audit, rebuild instructions, browser evidence and limitations](docs/OBSERVATORY_ATELIER.md). This candidate is not signed off as high-end production art.
