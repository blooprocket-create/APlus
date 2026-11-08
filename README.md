# Astral Chronicles

A local-first browser action RPG built with TypeScript and Three.js. The playable opening of **The Starforged Crown** begins in Hearthmere, where three strangers face a giant attack. Choose a spear warrior, chronomancer, or kunai assassin.

The [story foundation](docs/OPEN_WORLD_STORY.md) and [campaign treatment](docs/CAMPAIGN_TREATMENT.md) describe the larger connected world and planned campaign. The current build runs from arrival in Hearthmere to the refuge camp.

**Start with [the consolidated design overview](docs/DESIGN_OVERVIEW.md)** for the current requirements, draft scope, remaining work, and reading order. [Saving and offline play](docs/SAVE_AND_OFFLINE.md) covers guest access, optional cloud/cross-device sync, evolving hero saves, recovery backups, and downloaded-content offline play.

The new [branching campaign draft](docs/BRANCHING_CAMPAIGN.md) develops major decisions and persistent consequences around a confirmed three-route, nine-ending structure: hopeful, bittersweet, and dark per route, plus variations. Particular new scenes and ending conditions are awaiting review.

The [opening sequence draft](docs/OPENING_HOUR.md) develops the confirmed 15–20-minute playable lead-in in Hearthmere, with proposed character introductions and first-hour crisis beats.

The [crafting and economy brief](docs/CRAFTING_DESIGN.md) collects confirmed profession, resource, equipment, and NPC-trade requirements as that part of the interview develops.

The [narrative and cinematic brief](docs/NARRATIVE_PRESENTATION.md) collects the presentation, generated vocal audio, and choice-driven narrative requirements. Branch scope and vocal coverage are still being refined.

The [resistance design](docs/RESISTANCE_DESIGN.md) records the faction conflict chosen under the user's delegation; exact branch missions and endings remain in design.

The [exploration and puzzle brief](docs/EXPLORATION_PUZZLES.md) collects the three class utilities, automatic companion use, exploration freedom, and puzzle direction.

The [combat and progression brief](docs/COMBAT_PROGRESSION.md) collects the action foundation, class skill trees, awakening, difficulty modes, and defeat direction.

## World Architecture V2

The next engineering program is [World Architecture V2](docs/WORLD_V2_ARCHITECTURE.md): a deterministic canonical procedural world with multiple continents and islands, freely navigable oceans, persistent ships and an open-world Hearthmere rebuilt around story anchors rather than old coordinates. The [Phase 0 legacy audit](docs/WORLD_V2_PHASE0_AUDIT.md) and [dependency inventory](docs/WORLD_V2_DEPENDENCY_INVENTORY.md) documents active assets/quests, legacy systems and retirement boundaries and no-legacy-migration policy. The new architecture is **planned**, not yet playable; the Phase 0 engineering baseline is complete (127 passing tests and real Chrome HUD entry for all three heroes).

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
