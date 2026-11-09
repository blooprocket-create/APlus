# Astral Chronicles — Phase 2.5: Gameplay & Visual Foundation Convergence

**Status: PLANNED. Priority after merged Phase 3.0 first-arrival slice, BEFORE continuing Phase 3.1+.** Phase 3.0 is retained as a useful proof of world/story entry, but it does not satisfy this new phase. Source of truth: [agent instructions](../AGENTS.md), [status](WORLD_V2_STATUS.md), [decisions](WORLD_V2_DECISIONS.md), [architecture](WORLD_V2_ARCHITECTURE.md), [Phase 3 handoff](WORLD_V2_PHASE3_HANDOFF.md), [art contract](WORLD_V2_ART_PARITY.md).

## Objective

Put **the real existing Astral Chronicles gameplay stack** on World V2's deterministic streamed land and actual terrain elevation. Do not create a second combat system inside the geography lab. The geography lab remains a dedicated infrastructure and screenshot QA fixture; the opt-in World V2 playable session becomes the destination for integrated systems and eventually the production entrypoint. Keep the existing original game at /index.html working as a regression baseline until cutover.

This is **porting and adapting owners**, not duplicating or reimplementing abilities, movement math, companion AI, UI, sounds, camera, animation, or effects. The previous painted art parity is a **minimum continuity baseline, not an approved beauty/quality target**. This phase also establishes new original art-direction/look-development targets for later production refinement.

## System migration matrix

| Category | Source ownership to inspect | Acceptance on playable World V2 |
| --- | --- | --- |
| Movement & physics | GameEngine, HeroMotion, HeroFootPlants, world-V2 WorldSurface/WorldNavigation | Same responsive controls and action/animation timing; real slopes, Y, water, obstacles and stable cross-cell movement. No implicit flat ground or legacy path restriction. |
| Combat and player powers | GameEngine, CombatRules, class definitions, original ability and enemy modules | Actual existing primary attacks, all implemented class abilities, hits, damage, cooldowns, hit reactions, defeat/retry and targeting for each hero; no fake lab combat. |
| Combat animation & enemy rigs | CharacterMeshBuilder, EnemyMeshBuilder, hero wardrobes, HeroMotion, enemy scene owners | Original player/enemy animation states and transitions are playable with terrain grounding, equipment/character identity retained. |
| VFX and projectiles | VfxSystem, StarlightProjectile, NightbladeProjectiles, Deathmark, EarthshakerImpact, CelestialMeteor and other original ability modules | Existing particle/projectile/cast/impact behavior works with 3D ground, proper world/render origin and lifecycle. |
| Painterly world, character shading, post effects | PaintedWorldStyle, AnimeMaterials, EnvironmentBuilder, HearthmereScenery, PaintedMeadow, water shaders | Reuse functional rendering owners and improve their shared look-development parameters; environment and hero/effect rendering have a coherent deliberate anime aesthetic. |
| Companion and enemy AI | GameEngine party/actor owners, CompanionRoster, navigation adapters | Real companion behavior (not visual following only), enemy combat and targeting/pathing on loaded world terrain; pin/await cells as required. |
| Camera & inputs | IsometricCamera, input modules, UIManager, mobile CSS | Original close isometric camera, hero targeting, keyboard/mouse/touch input, camera elevation correctness and useful combat HUD. |
| UI, minimap, audio | UIManager, Minimap, audio modules and original gameplay cues | Original health/ability UI, feedback, target markers, minimap and actual audio triggers in the V2 session. |
| Lifecycle | GameEngine optional WorldV2 port, WorldV2GameplayBridge, WorldCellStreamer | One authoritative game runtime; deterministic streaming activation, cleanup, world-space positions, no duplicate actors, bounded loading. |

Treat file names as **audit entry points**, not proof that features already work. Inspect current /index.html mechanics before asserting parity. Keep role-specific data and animation behavior intact.

## Ordered delivery slices

### 2.5.0 — Source audit and visual target definition
Inventory every live hero attack/ability, animation, input path, enemy and companion behavior, particle/shader effect, UI/audio interaction and current tests. Map ownership and old-world coordinate/collider assumptions. Record **parity baseline screenshots and gameplay clips for all three heroes**. Create an ORIGINAL visual target brief and sample scene combining upgraded painted environments with dramatically rendered anime characters and action effects. Obtain user approval of the visual target; do not mistake current screenshots for the desired quality.

### 2.5.1 — V2 GameEngine integration and movement
Introduce a world/spatial adapter on the real gameplay engine and one opt-in V2 gameplay route. Use WorldSurface/WorldNavigation as the authoritative terrain service; handle world-object collision, stable actor coordinates and rendering origin conversion. Reuse all existing movement/action/camera input and animation owners.

### 2.5.2 — Combat, abilities and AI parity
Run actual hero attacks, complete presently implemented ability kits, enemy encounters, damage/defeat/retry and companion AI in the integrated V2 session. Validate combat across ground height changes, shore/water boundaries and loaded-cell transitions. Prevent duplicate authoring or simultaneous independent combat simulations.

### 2.5.3 — Shared presentation integration
Connect all gameplay VFX, impacts, projectiles, character shading, environmental rendering, audio cues, camera behaviors, HUD and touch controls to the same world-aware runtime. Establish consistent color/lighting/exposure/occlusion decisions for environments, characters and effects. Screenshot and playable video comparisons must be visually reviewed, not passed solely by a pipeline marker.

### 2.5.4 — Parity validation and Phase 3 handback
Test all three hero kits and companion roles under live combat on V2 ground; test desktop/touch, collision, streaming, memory/resource disposal and original game's regression suite. Preserve and document unresolved polish work and target-device performance gaps. Do not claim new V2 save/reload or complete Hearthmere story: **those stay in Phase 3**.

## Creative direction: refined visual North Star

The user explicitly requests a **beautiful original anime-style game**, with **environments leaning toward Studio Ghibli's evocative painterly natural-world feeling**, and **heroes, combat and effects leaning toward the dramatic, high-impact anime feeling of Solo Leveling**. These are reference *qualities*, not instructions to copy distinctive characters, scenes, symbols or assets.

- **World:** lush layered nature, painterly atmospheric depth, appealing color relationships, richly authored silhouettes and architecture, lived-in details, animated foliage, thoughtful lighting and focal composition; world-scale drama without visual noise. Not procedural emptiness decorated with repeated low-poly trees.
- **Characters:** sharper heroic anime silhouettes, expressive and detailed stylized faces and hair, well-articulated costume materials, strong pose design and fluid animation. Respect actual selected hero and companions.
- **Combat/VFX:** high-energy impact frames, readable speed/energy trails, intentional glow and contrast, dramatic timed hit effects, animation/lighting/camera choreography. Powerful **without** flooding the isometric view with illegible particles.
- **Unifying rule:** coherent lighting, color temperature, shared physical scale and visual hierarchy so painterly scenery and sharper heroes still belong in one world. Performance and mobile touch readability remain mandatory engineering constraints.
- **Status boundary:** these are new target qualities. Current shaders, hero meshes and screenshots **do not yet demonstrate this art quality**. Phase 2.5 preserves working functionality while setting the production-facing rendering foundation; Phase 5 still owns broad asset production and final polish. Review a composed V2 scene in motion before calling visual direction successful.

## Non-negotiable tests and output evidence

Use repository validation commands: npm ci, npm run build, npm test, npm run world:geo:verify, npm run world:geo:verify -- --reverse, npm run audit:world, npm run test:browser, npm run test:visual, npm run docs:check. Add scenario-specific assertions for movement, every existing hero ability and companion combat; capture gameplay recordings/screenshots and honestly list untested device conditions. Compare against both the old game (behavioral parity) **and** user-reviewed new art goals (visual quality), which are distinct gates.

**Exit gate:** All three heroes can navigate, fight and use their actual presently implemented kits on true streamed terrain; enemies and companions act, attacks connect, UI/audio/camera/shaders/VFX work, original game stays regression-green. No lab-only replacement systems. Once this gate is met, resume Phase 3.1 onward with Hearthmere scene geography, quest/NPC/cinematic migration and fresh V2 save/resume.

**Not Phase 2.5:** finishing all Hearthmere story steps, new V2 save schema, changing game canon or creating ships, declaring the full open-world atlas final, shipping production art everywhere, or claiming mobile 60 FPS without physical hardware measurement.
