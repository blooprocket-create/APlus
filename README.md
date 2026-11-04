# Astral Chronicles

A local-first, browser-based action RPG built with TypeScript and Three.js. Lead a spear warrior, chronomancer, or kunai assassin with two AI companions through The Long Dawn, a twelve-chapter chronicle across six belllands. The original five-zone route remains available from Aetherhaven.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:5173. Production build: `npm run build`. Tests: `npm test`.

## Play

Choose **Enter Aetherhaven** on the hero screen. New heroes begin in town. The east **Bellroad** gate leads into The Long Dawn; the north gate retains the original procedural wilderness route. The west road connects Aetherhaven and Market Crossing. Both towns heal the triad and refill flasks.

Follow the gold compass along the roads to field objectives, inscriptions, and guardians. At chapter’s end, walk through the road beyond camp: it leads to the next chapter or through Market Crossing before the next region. The entrance road always leads back to a sanctuary. No atlas or completion-report menu is required to keep traveling. **M** opens optional fast travel, the journal, and recovered histories.

The campaign contains twelve named guardians, twelve inscription puzzles, five persistent story decisions, thirty-six optional echoes, and a world account that reflects your choices. Each chapter opens with a playable field task: recovering scattered objects, escorting an ally who waits for danger or distance, defending a beacon against three assaults, aligning relays in order while holding position, or hunting marked captains. Recovered opening accounts are saved in the journal. Story conversations and inscription choices remain part of the campaign.

Regional maps use a seed derived from the hero and chapter, so different heroes get different road geometry and encounter placement. The seed, partial activities, surviving enemies, and loot remain stable through reloads and town visits. Woodland loops, coastal islands, desert basins, mountain switchbacks, city blocks, and archive rings have different connections and scenery. Existing chapter checkpoints retain their original geography; new chapters use the new generator. Read [the world bible](docs/WORLD_BIBLE.md) for the setting, character arcs, and the distinction between implemented content and the remaining production work.

Choose **Watch a guardian finisher** on the hero screen to preview the selected class's execution without changing saves. In combat, any lethal hit on a boss starts the same 12.4-second sequence. It includes camera cuts, class-specific staging, impact effects, a guardian's final words, and a requiem. An original ElevenLabs Music v2 orchestral cue is bundled locally, with timed synthesized charge and impact effects. **Escape** skips it and resolves rewards exactly once.

| Action | Controls |
| --- | --- |
| Move | WASD / arrow keys |
| Chain basic attacks | Hold left mouse, J, or Space |
| Evade | Shift / K |
| Abilities | Q / E (or 1 / 2) |
| Ultimate | R / 3, at 100 energy |
| Mending flask | H |
| Talk / use a portal | F / Enter |
| Equipment, companions, runes, story | I |
| World atlas / journal / codex | M |
| Pause / resume | Escape |

Mobile web is designed for **landscape**. Move with the left thumbstick, hold Attack with your right thumb to chain attacks, and tap the surrounding abilities or Evade. Movement and attack fingers work independently. Gear, the world atlas, pause, and optional fullscreen are in the upper right; nearby story objects and portals have a central interaction button.

Portrait shows a rotation prompt and pauses the game and finisher audio; **Continue in portrait** allows an optional fallback. Fullscreen requests landscape locking where the browser permits it. Browser play remains available when fullscreen or locking is unsupported. The manifest requests landscape for installed launches; no offline mode is included. The game fits the visible browser area, respects safe-area insets, and uses scrollable short-screen menus. Touch render density is capped at 1.5 with a pixel budget and smaller shadow maps.

Red ground markers lock when enemies begin attacking: move clear before they fill. Evading a strike during dash invulnerability awards 12 ultimate energy. Gatekeepers enrage below half health.

Flasks heal 40% of maximum vitality, hold three charges, and refill in sanctuaries. Defeat returns you to Aetherhaven after confirmation and preserves equipment, currency, and experience. Clearing a wilderness expedition banks remaining drops and shows a nonblocking road-open notification.

## Saving and settings

Progress is stored on the current browser/device, with three hero slots per local profile. Saves preserve the route seed, position, surviving enemy health, defeated enemies, uncollected loot, flask charges, and expedition statistics. Existing prototype characters remain supported; their next save gains the new journey snapshot. Newly entering a zone starts a fresh expedition; continuing a saved session restores that expedition.

The pause menu includes sound effects and camera-shake controls. Audio starts after a user gesture. Settings persist on this device. Inventory and story screens pause gameplay, and hiding the browser opens the pause menu.

## Verification

The Vitest suite includes full campaign progression, puzzle answers, chapter revisit safety, branching route connectivity, ending choices, cinematic timing and cleanup, and boss reward idempotency. It also covers persistence and account isolation, quest progression, procedural generation, management systems, combat telegraphs, evasion, enrage timing, sanctuary regeneration, healing charges, pause ownership, defeat/revival, portal locks, expedition rewards, journey restoration, and asynchronous saves. Rendering is stubbed in gameplay integration tests; visual checks still require a browser.

Mobile tests cover independent joystick/attack/ability pointers, pointer cancellation, quick taps, interruption reset, HUD rebinding, rotation pause ownership, viewport sizing, density budgets, and denied fullscreen/orientation APIs. With the dev server running, open `http://127.0.0.1:5173/tests/mobile-preview.html` for actual-game frames from 640 × 320 to 1024 × 600 plus portrait. Its layout check flags small, overlapping, or off-screen combat controls. Using 127.0.0.1 keeps QA saves separate from localhost. These browser-frame checks do not replace physical iOS Safari and Android Chrome testing, including notches, browser chrome, the software keyboard, and OS gesture interruptions.

This is a single-player campaign foundation with procedural art. Completion time has not been measured; it is not a verified twenty-hour adventure. There is no server, multiplayer, or cloud synchronization.

The connected-world tests cover all field activity rules, chapter roads, travel locks, town returns, partial objective persistence, hero-specific map seeds, legacy checkpoint layouts, and the walkability of objectives across multiple generated maps. Browser checks exercise the real renderer and touch HUD separately from the rendering stubs in integration tests.
