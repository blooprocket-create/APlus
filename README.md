# Astral Chronicles

A local-first, browser-based action RPG built with TypeScript and Three.js. Lead a spear warrior, chronomancer, or kunai assassin with two AI companions through The Long Dawn, a twelve-chapter chronicle across six belllands. The original five-zone route remains available from Aetherhaven.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:5173. Production build: `npm run build`. Tests: `npm test`.

## Play

Choose **Begin The Long Dawn** on the hero screen. Follow the gold compass to memory stones, inscriptions, and guardians. Press **M** for the world atlas, journal, recovered histories, and chapter travel. Finishing a chapter opens the next one; completed regions can be revisited without losing an unfinished chapter's progress.

The campaign contains twelve named guardians, twelve inscription puzzles, five persistent story decisions, thirty-six optional echoes, and a world account that reflects your choices. Exploration happens across six regional landscapes with branching roads and landmarks. Read [the world bible](docs/WORLD_BIBLE.md) for the setting, character arcs, and the distinction between implemented content and the remaining production work.

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

Flasks heal 40% of maximum vitality, hold three charges, and refill in sanctuaries. Defeat returns you to Aetherhaven after confirmation and preserves equipment, currency, and experience. Expedition reports bank remaining drops when a route is cleared.

## Saving and settings

Progress is stored on the current browser/device, with three hero slots per local profile. Saves preserve the route seed, position, surviving enemy health, defeated enemies, uncollected loot, flask charges, and expedition statistics. Existing prototype characters remain supported; their next save gains the new journey snapshot. Newly entering a zone starts a fresh expedition; continuing a saved session restores that expedition.

The pause menu includes sound effects and camera-shake controls. Audio starts after a user gesture. Settings persist on this device. Inventory and story screens pause gameplay, and hiding the browser opens the pause menu.

## Verification

The Vitest suite includes full campaign progression, puzzle answers, chapter revisit safety, branching route connectivity, ending choices, cinematic timing and cleanup, and boss reward idempotency. It also covers persistence and account isolation, quest progression, procedural generation, management systems, combat telegraphs, evasion, enrage timing, sanctuary regeneration, healing charges, pause ownership, defeat/revival, portal locks, expedition rewards, journey restoration, and asynchronous saves. Rendering is stubbed in gameplay integration tests; visual checks still require a browser.

Mobile tests cover independent joystick/attack/ability pointers, pointer cancellation, quick taps, interruption reset, HUD rebinding, rotation pause ownership, viewport sizing, density budgets, and denied fullscreen/orientation APIs. With the dev server running, open `http://127.0.0.1:5173/tests/mobile-preview.html` for actual-game frames from 640 × 320 to 1024 × 600 plus portrait. Its layout check flags small, overlapping, or off-screen combat controls. Using 127.0.0.1 keeps QA saves separate from localhost. These browser-frame checks do not replace physical iOS Safari and Android Chrome testing, including notches, browser chrome, the software keyboard, and OS gesture interruptions.

This is a single-player campaign foundation with procedural art. Completion time has not been measured; it is not a verified twenty-hour adventure. There is no server, multiplayer, or cloud synchronization.
