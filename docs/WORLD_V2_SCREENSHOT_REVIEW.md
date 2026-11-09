# World V2 — Screenshot-driven design and world-building review

**Purpose:** Close the gap between technically passing terrain/streaming tests and a visually convincing isometric, cel-shaded open world. This is the standard review loop for **Phase 2 geography**, later reused for Hearthmere, ships, quests and mobile performance.

**Visual authority:** [Original Hearthmere art-continuity contract](WORLD_V2_ART_PARITY.md). Procedural geometry must use the established painted anime/cel-shaded presentation; a passing render in an unrelated default Three.js material is not an acceptable art review.\n\n**Authority:** [World V2 architecture](WORLD_V2_ARCHITECTURE.md), [Phase 2 geography staging](WORLD_V2_PHASE2_GEOGRAPHY.md). The current five-landmass atlas and all camera coordinates remain **review-only**, not approved story/world canon.

## What the system actually does

1. **Deterministic screenshot registry:** `tools/world-v2-review-shots.json` declares 11 world positions, camera angles, orthographic zooms, viewport sizes (including mobile portrait), expected water classification and focus questions. Adding a shot is a source-controlled change.
2. **Real browser rendering:** `npm run test:visual` starts the built Vite preview, launches headless Chromium, and opens `/world-v2-geography.html?visualReview=1` with UI hidden. It does not render map concepts from an image model.
3. **Fully loaded capture:** The lab exposes `window.__worldV2Review.setView` and `snapshot`. The capture waits for **all required catalogued cell IDs**, a resident central tile, several completed frames and zero loading errors. A screenshot isn't taken just because a loading spinner disappeared.
4. **Visual inspection:** It writes individual PNGs, a single `contact-sheet.svg`, and an offline image gallery `gallery.html`, with optional **before/after** images (via `--baseline`). CI also includes the **actual Hearthmere warrior screenshot** as an art reference inside that same gallery, so new geography is visually compared against the game rather than merely against older placeholder terrain. This is what a reviewer/assistant should actually open and inspect.
5. **Machine diagnostics:** `visual-review.json` includes camera position, active cells, biome and water classification, scenery count, atlas fingerprint, image luminance, color-bucket count, dark/bright coverage, high-contrast edges, browser exceptions and warnings. These are **technical signals, not aesthetic judgments**.
6. **Human/assistant critique:** The generated `review-checklist.md` asks for screenshot-specific observations and severity. The user/assistant should record the actual visible defect, the code/asset owner, what to change, and a new before/after capture. A green CI is not permission to mark a poorly composed world as visually approved.
7. **CI evidence on every PR/main push:** `.github/workflows/verify.yml` runs the visual audit *after* the deterministic bake and browser-game regression, and uploads `world-v2-visual-review` for 30 days. No continuous screenshot-watch service or background AI approval is claimed.

## Commands

```sh
npm ci
npm run build
npm run test:visual
# Outputs: test-artifacts/world-v2-review/
# Files: gallery.html, contact-sheet.svg, visual-review.json,
#        review-checklist.md, shots/<id>.png
npm run test:visual -- --baseline ./previous-review
# Adds optional before/after views when prior screenshots exist.
```

Open `gallery.html` locally and visually inspect all viewpoints; alternatively inspect `contact-sheet.svg` before opening full-resolution PNGs. The `--baseline` directory should contain `shots/<shot-id>.png` from a previous run.

**To retrieve artifacts for review via ChatGPT:** use the connected GitHub repository's latest successful Actions workflow, locate artifact `world-v2-visual-review`, download the ZIP and open the actual PNG images. Record evidence-based findings in the PR description or [Phase 2 geography specification](WORLD_V2_PHASE2_GEOGRAPHY.md). Future chats can repeat this workflow without manual screenshots from the user.

## Review categories and acceptance

| Category | What to look for in screenshots | Automation |
|---|---|---|
| Ocean continuity | No hard squares, blank unloaded areas, sudden color seams | Black/navy coverage warning; actual screenshot review required |
| Coastline | Natural readable slopes, recognizable beach zone, no clipping / impossible landing cliffs | Position and water class checks; physical disembark tests later |
| Silhouette and elevation | Interesting landmass shape, depth and scale in isometric camera | Fixed camera captures; artistic review required |
| Vegetation / scenery | Region-specific clusters, believable scale, no primitive stacking, no obvious repetition | Stable placements and presence checks; artistic review required |
| Story-stage pads | Flat clearance for encounters, readable quest paths, sufficiently dramatic staging | Canonical anchor and path constraints checked by compiler; cinematic review later |
| Rivers | Start inland, drain to sea, no fragmented banks or unsupported crossings | Phase 2 monotonic/seam tests and visual screenshot review |
| Mobile framing | No clipping / empty viewport, information fits portrait composition | Mobile screenshot, pixel dimensions, full physical device profiling later |
| Visual regression | If a fix improved one view, it must not destroy another | Compare all saved shots and metadata; optional baseline image pairs |

Severity guide: **critical** = missing geometry, black voids, broken water or major load failure; **major** = recognizably barren/repetitive scenery, unreadable cliffs/coasts, misleading scale; **minor** = colors, detail density or props that need art polish; **acceptable** = ready for the current *staging* milestone. For every major defect, prefer one focused generator/rendering change, rerun the entire set, and inspect the before/after visuals.

## Actual first screenshot-led findings (2026-11-08)

The previous [production smoke screenshot archive](https://github.com/blooprocket-create/APlus/actions/runs/42537843437) was retrieved and examined at full resolution.

- **Critical:** Ocean scene captured with very large navy polygons and square discontinuities near the edge of streamed cells. Cause: each cell created its own translucent ocean plane and it disappeared outside the catalogued stream ring. **First fix:** introduce continuous camera-centered world-space ocean mesh/wave shader, no per-cell sea plane; keep terrain cells authoritative for their coast and underwater geometry.
- **Major:** Stage land lacked distinctive silhouettes and was primarily smooth per-vertex colors with debug gridlines. **First fix:** add original, deterministic, biome-aware low-poly pine/round-tree/boulder/shrub instancing, hiding debug grid by default and retaining an explicit `debugGrid=1` option.
- **Major:** Earlier captures only showed the open sea and had an overlay covering most of the view. **First fix:** capture 11 repeatable clean camera views spanning actual narrative pads, mountains, river, coast, islands, ocean and mobile. Preserve technical metadata separately.

**Do not accept these fixes on code review alone:** download the new screenshot ZIP, compare against the observed baseline, log any visual problems that persist and iterate again.

## Remaining Phase 2 production gates (not waived)

A screenshot-review system is necessary for visual iteration, but it is **not equivalent** to finishing geographic production. The [functional Stage V2 world](WORLD_V2_PHASE2_RUNTIME.md) now has a complete finite atlas in 72 pages, a close native camera, and bare-ground collision plus pathfinding. Still outstanding: approved canonical geography, distant LOD, integrated hero/companion and authored-object collision, complex river crossings, and physical phone GPU/performance profiling. Original Hearthmere quests/assets are not restaged into the new world until Phase 3; old saves need no migration.

**Workflow to finish Phase 2:** freeze staging-independent world design after screenshots meet art/readability goals; add complete atlas/LOD and physical navigation; then repeat the same fixed screenshot and movement/shoreline QA before marking the phase complete.
