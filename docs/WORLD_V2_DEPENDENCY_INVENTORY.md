# World V2 — Source dependency inventory

**Date:** 2026-11-08  
**Evidence:** `npm run audit:world` parses every `src/**/*.ts(x)` import/export using the installed TypeScript parser; it resolves relative source modules, tracks type-only edges separately, recognizes Vite CSS/JSON assets, and follows executable static/dynamic import edges from `src/main.ts`.  
**Machine-readable output:** each [verify workflow run](https://github.com/blooprocket-create/APlus/actions/workflows/verify.yml) uploads `world-v2-dependencies.json`. Reference [successful baseline run](https://github.com/blooprocket-create/APlus/actions/runs/42532457184).  
**Important:** Static import reachability means **bundled/reachable for loading**, not proof a specific legacy function executes. It is intentionally conservative; no module is authorized for deletion solely because this report labels it unused or old.

## Current entrypoint

```text
src/main.ts
  → src/ui/UIManager.ts
    → Hearthmere lobby / in-memory character → Hearthmere opening
    → old Chronicle atlas/help/quest UI (retained in same module)
  → src/game/GameEngine.ts
    → HearthmereOpening.ts + scenes/combat/companion systems
    → MoatSlice.ts (prototype-only conditional)
    → ChronicleWorld.ts / CampaignEngine.ts / QuestEngine.ts
    → ProceduralPathGenerator.ts / WorldRoutes.ts / FieldActivities.ts
    → EnvironmentBuilder.ts → buildSlice (live) + old region builders
  → src/persistence/PersistenceManager.ts
    → QuestEngine.ts (legacy quest defaults on old character factory)
```

The current user-facing start screen takes the Hearthmere branch and does **not** offer the old Long Dawn chapter campaign. Still, the old systems are **statically bundled via the shared large modules**, and legacy engine methods can be invoked by API/tests. This is why no bulk deletion should precede further modularization.

## Verified graph findings

| Measure | Result |
| --- | --- |
| TypeScript source files analyzed | **76** |
| Conservatively statically reachable from `src/main.ts` | **76 / 76** |
| Legacy files immediately safe to delete from this criterion | **0** |
| Unresolved local TypeScript imports | **0** |
| Forbidden imports into pure Hearthmere story/save/companion modules | **0** |
| Ancillary imports | CSS and animation JSON classified as Vite assets rather than missing code |
| Automated checks | The audit is a required GitHub Actions CI step, with JSON output retained as a workflow artifact |

### Legacy module imports requiring staged isolation

| Legacy family | Source | Incoming production imports / disposition |
| --- | --- | --- |
| Corridor routes | `src/game/ProceduralPathGenerator.ts` | GameEngine, ChronicleEnvironment. **Replace** as default terrain/walkability, then retire old callers. |
| Chapter geography | `src/game/ChronicleWorld.ts` | GameEngine. **Replace** with canonical atlas; old per-character chapter seeds are incompatible with V2. |
| Portal roads | `src/game/WorldRoutes.ts` | GameEngine, CampaignEngine. **Replace** old travel graph with world navigation. |
| Legacy campaign | `src/game/CampaignEngine.ts` | GameEngine, UIManager. **Extract** reusable state functions; remove old story coupling. |
| Legacy quests | `src/game/QuestEngine.ts` | GameEngine, PersistenceManager. **Extract** any shared methods, then retire prototype quest state. |
| Route field objectives | `src/game/FieldActivities.ts` | GameEngine, EnvironmentBuilder. **Adapt** only reusable encounter mechanics; remove waypoint placement. |
| Internal moat prototype | `src/game/MoatSlice.ts` | GameEngine. **Keep** as test reference until traversal/puzzle primitives are reused. |
| Old regional environment | `src/rendering/ChronicleEnvironment.ts` | EnvironmentBuilder. **Replace** topology-dependent scene generation. |
| Old biome art | `src/rendering/EmberCoast.ts`, `RememberingWood.ts` | ChronicleEnvironment. **Evaluate reusable visuals**, not old road-dependent maps. |
| Old story content | `src/data/chronicle.ts` | Legacy campaign/zone/UI modules. **Retire** after callers removed, no rewriting into new canon. |
| Old story types | `src/types/campaign.ts`, `src/types/quest.ts` | Legacy and mixed systems. **Split** new campaign/quest types from prototype types. |

### Mixed ownership still blocking removal

| Mixed module | Why it needs decomposition |
| --- | --- |
| `src/game/GameEngine.ts` | Live opening + combat/companions + old chapter/zone APIs in one class. Default opening now skips legacy campaign/quest normalization, but static dependencies remain. |
| `src/ui/UIManager.ts` | Live Hearthmere lobby/HUD + old atlas, classic quest help and management UI. |
| `src/rendering/EnvironmentBuilder.ts` | Live `buildSlice` + old chapter/zone constructors and terrain rules. |
| `src/persistence/PersistenceManager.ts` | Used as temporary new-character factory for Hearthmere; initializes old prototype quest defaults. A future separate role/character factory should avoid the legacy dependency. |
| `src/ui/CutsceneDirector.ts` | Shared cinema support plus older scene scripts; shared canonical hero names now come from pure CompanionRoster. |
| `src/types/game.ts` | Includes both current and historical zone/character state shapes. |

## Protect/reuse

`CompanionRoster.ts` owns canonical hero and companion identities independent of Riftscar quests. `HearthmereStory.ts` owns the pure 13-step narrative sequence and legacy coordinate type independent of Three.js; `HearthmereSave.ts` no longer imports `HearthmereOpening.ts`. New V2 save schemas will be fresh; **there is no requirement to convert v1 saves (D165)**.

Preserve `HearthmereOpening`'s quest/event functionality, residents, giant, scenery assets, animations, cinematic beats, VFX, audio, combat and interaction patterns. Their old physical coordinates are **not** part of the acceptance contract.

## Phase 0 conclusion

The repository's legacy branches are now **identified and automatically mapped**. No existing legacy module passes the conservative import-graph test for direct removal, so Phase 0 deliberately deletes nothing.

Phase 1 will introduce the new atlas and spatial contracts alongside today's runtime. Later integrations can separate the live Hearthmere entrypoint from the legacy chapter/quest modules, after which this audit should visibly report a shrinking set of imported legacy paths.

Run locally:

```sh
npm ci
npm run audit:world
npm run audit:world -- --json > world-v2-dependencies.json
npm run build
npm test
npm run test:browser
```

**Limitations:** This audit does not prove tree-shaken bundle inclusion, dynamic reflection reachability, feature-complete gameplay or physical mobile FPS. It is evidence for code-retirement planning and regression safety, not a substitute for gameplay QA.
