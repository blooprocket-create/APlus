## Goal / scope
<!-- Describe what actually changed; distinguish current live game, World V2 staging lab, and future intended behavior. -->

## Governing decisions and open questions
<!-- Cite IDs from docs/WORLD_V2_DECISIONS.md / docs/DESIGN_DIRECTION.md. -->
- [ ] I separated **LOCKED user behavior**, **IMPLEMENTED (STAGING)** details, and **OPEN / PROPOSED** items.
- [ ] I did not convert prototype coordinates, landmass counts, item/ship mechanics or performance assumptions into canon.

## Architecture and compatibility
- [ ] I identified authoritative owner modules; no duplicate physics, quest, atlas, save or camera implementation.
- [ ] I preserved the existing Hearthmere opening and its three hero routes, or documented tested cutover behavior.
- [ ] I respected the fresh V2 save namespace (D165); no old-save migration or unintentional browser-data deletion.
- [ ] I considered streaming/anchor IDs, story actor lifecycle and any dependency/rollback impact.

## Documentation updates
- [ ] `docs/WORLD_V2_STATUS.md` updated if implemented behavior, test evidence, owner or current phase changed (or N/A with explanation).
- [ ] `docs/WORLD_V2_DECISIONS.md` updated **only for actual user-confirmed decisions** (or N/A).
- [ ] `docs/WORLD_V2_ARCHITECTURE.md`, relevant phase handoff and `docs/PRODUCTION_ROADMAP.md` updated if interfaces/gates/order changed (or N/A).
- [ ] New/unresolved limitations and next-smallest slice recorded; no unsupported `production-complete` claims.

## Verification
- [ ] `npm run docs:check`
- [ ] `npm run build` and `npm test`
- [ ] World bake + reverse-order verification (when geography/artifacts changed).
- [ ] `npm run audit:world`, `npm run test:browser` and visual screenshot evidence (as relevant).
- [ ] Physical-device results are stated **only when measured**; 60 FPS iPhone 14 Pro is an unverified requirement until profiled.

**Evidence / artifacts:** <!-- CI URL, browser screenshot archive, actual played story steps, device model and performance numbers where available -->

**Explicitly not implemented by this PR:** <!-- Be concrete about outstanding gates. -->

**Next dependency / smallest follow-up PR:** <!-- Point to Phase 3 integration or later owner. -->
