# World V2 in-engine art direction study

**State: opt-in experimental art-target scene, not production-quality approval.** Entry: [/world-v2-art-target.html](/world-v2-art-target.html). Implemented as an extra Vite entry based on the **real** World V2 geographic artifact source, streaming, ground sampling and Three.js scene. The original game and the Phase 2/3 labs remain unchanged by default.

## Goal

Explore the requested original anime visual target: painterly, layered storybook/coastal-fantasy environments with the atmospheric warmth and depth associated with Studio Ghibli, contrasted with sharp, high-energy modern-anime character silhouettes and restrained, impactful magic reminiscent in *feeling* of Solo Leveling. Do not replicate specific copyrighted art, characters or locations.

## What is in the executable scene

- Real compiled World V2 ground at the staging Hearthmere arrival, resident-cell collision and native close isometric camera.
- Real in-project Brynhildr/warrior, Celestia/chronomancer and Akatsuki/assassin character rigs with their current wardrobe/animation shaders. The trio is staged as visual companions, **not yet functional combat AI**.
- A relocated instance of the actual detailed Hearthmere refuge lodge mesh, hand-placed stone path, a sculpted stone arch, flowering tree silhouettes, hanging fabric, lantern lighting, and local detail.
- A more cinematic shared evening lighting treatment, lavender painterly sky, cool distance fog, warm local light pools, ACES tonemapping, **restrained** bloom, GPU motes, mist and animated astral rings.
- WASD/arrow movement remains available; G or the Effects button disables the atmospheric particle and spell stage for comparison. H hides the overlay. `?showcaseShot=1` provides a clean screenshot view; `?functionalQA=1` exposes the smoke-test-only world scene summary.

## Production separation

This scene is an art-direction **experiment using the real renderer**, not an image composited over gameplay. The procedural atlas positions and composition are not geography canon. Lodge/tree/path meshes currently have **no authored object collision**, magic rings are **visual-stage props**, the companions are **not** the existing real AI/combat agents here, and it contains **no** V2 save/quest migration. Do not advertise the page as the completed Phase 2.5 gameplay convergence.

Current in-project hand-built geometry and character assets still impose a clear visual-quality ceiling. A scene like this is a test of lighting, color, composition, atmospheric depth, effect density and reuse, *not* proof of the user's full production-quality aspiration. Truly reaching it will require improved character models, rich environment asset families, animation, collision, dynamic combat choreography and sustained mobile profiling. Review actual browser screenshots and clips before approving the target.

## Review and tests

Run `npm run build`, `npm test`, `npm run test:browser` and `npm run test:visual` in the usual repository matrix. The browser smoke must render the opt-in art-target page with 3 real hero rigs and validated streamed geography, save `test-artifacts/browser-smoke/world-v2-art-target.png`, exercise the VFX toggle and find no streaming errors. Compare that **real WebGL PNG** against the intended target before declaring visual success. Headless desktop screenshots are not mobile 60 FPS evidence.

**Next step:** Inspect actual output, iterate on art and the shot, and only then carry approved shared lighting/material/VFX improvements into the real V2 gameplay integration. Preserve the normal gameplay camera and art readability in combat.
