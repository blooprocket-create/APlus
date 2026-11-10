# World V2 integration and environmental polish — November 10, 2026

Status: **first opt-in GameEngine integration slice, not Phase 2.5 complete or a production cutover**. Governing decisions: D153–D168 in the [decision register](WORLD_V2_DECISIONS.md). Baseline: production commit `92c0de443594733cdc19881ff4b986b63c99609e` at https://astralcronicles.vercel.app/.

## Playable entries

- `/index.html`: existing Hearthmere opening, with the environmental asset pass described below. Character meshes, costumes, animation clips, story sequence and save keys retain their existing owners.
- `/world-v2-gameplay.html`: new opt-in playtest. Select any hero in the familiar lobby, then traverse baked V2 terrain with the real GameEngine, existing hero attacks/skills/ultimate/dodge, two AI companions, a small slime/sentinel encounter, original HUD/input/audio and existing animation/effect owners. The clearing-edge start and encounter placements are **engineering fixtures**, not approved story geography.
- Existing geography and first-arrival story labs remain separate. The new gameplay entry does not add later story beats to `/world-v2-story.html`.

## Implemented boundaries

`WorldV2GameSession` supplies scene/spatial services to the existing GameEngine. `WorldV2GameWorld` owns verified artifact loading, cell visuals, scenery footprints, initial loading, retry preloading, and disposal. `WorldActorSurface` sweeps movement over the real triangle samples with short steps, water/slope/unloaded-cell rejection and conservative scenery footprints. Movement, dodge/blink, strike advances, enemy knockback/separation and companion following use the same terrain service. The engine remains the only combat/AI/animation owner.

`WorldTerrainRender` is extracted from the existing geography lab and shared by both entries. This avoids a second terrain art pipeline. Actors and meshes currently both use global coordinates; floating-origin rebasing is **not yet integrated**. The normal isometric camera now follows target elevation; the old Y=0 camera assumption placed it under the V2 terrain. Sun/shadow focus follows the hero in the new session and resets when leaving it. Shared instanced painted materials now compute their brush/cutaway positions with the instance transform.

The session is explicitly temporary: the UI says progress resets on exit, saving performs no legacy writes, and the old campaign atlas/cutscene library is unavailable in this route. Retry reloads arrival terrain before replacing actors; a disposed or replaced session cannot repopulate its old encounter. Full V2 persistence remains Phase 3 work.

## Environment execution

`StorybookNature` supplies shared branching deciduous trees with root flare, exposed boughs, irregular upright crown clusters, bark accents and painted leaf shading. Evergreens use whorled branches with individual needle sprays. Hearthmere and V2 instantiate the same geometry builders; existing batching/instancing keeps the pieces from becoming individual scene draws.

Hearthmere also gains staved barrels with inset lids and raised iron hoops, overlapping roof tiles and edge trim, and a hollow masonry well with stone courses, an axle, wound rope and a bucket. Existing tree/well collision is rebuilt from the updated meshes. The hero model files and Blender source are unchanged. These are a **first environmental pass**, not a claim of final production beauty or approved look-development completion.

## Verification

- TypeScript and production build pass.
- 188 tests pass, including the existing three-hero opening/rescue/skip/defeat regressions; real V2 kits/companions; movement beyond the former zone radius and across a cell boundary; elevated camera; scenery collision; sea and unloaded-cell rejection; and isolation from legacy saves.
- Deterministic preview/geography artifacts verify, including reverse geography load order. Dependency audit reports no forbidden dependencies or unresolved local imports.
- Browser and visual evidence are recorded by `npm run test:browser` and `npm run test:visual`; final results are recorded in the [visual review log](WORLD_V2_VISUAL_REVIEW_LOG.md). The new browser scenarios use actual keyboard input for each hero and verify legacy save bytes remain unchanged.
- Physical iPhone/Android performance and touch hardware are unmeasured. Desktop software WebGL is not a 60 FPS certification.

## Remaining work before the Phase 2.5 gate

Complete terrain-aware ability/VFX review on varied slopes (including the specialized meteor and ground-impact renderers); obstacle-aware companion/enemy path planning beyond direct swept pursuit; gameplay actor residency/pins across eviction; arbitrary-world floating origin; water presentation convergence; touch/browser interruption and long-session memory checks; and visual review/iteration with the user. Current scenery colliders use conservative trunk/boulder circles; bridge decks, roofs and overhangs still need authored spatial layers.

Then resume the full Hearthmere NPC, giant attack, rescue, cinematic and fresh V2-save integration in Phase 3. The complete cinematic campaign, ships, approved final geography, and final world-wide environment production remain unimplemented gates.

## Rollback

The production entrypoint still runs the existing opening. Remove the separate Vite gameplay entry or revert this change to withdraw the integration playtest. No V2 or legacy save migration is performed. The environment pass can be reverted independently of the session/spatial seam; preserve the elevated camera correction for any terrain-based route.
