# Hearthmere hero animation

Open [HearthmereHeroes.blend](HearthmereHeroes.blend) in Blender 5.2. Brynhildr, Celestia, and Akatsuki each have a weighted copy of their in-game model, 17 animated joints, and 6 automatic followers. Select a rig and choose one of its named actions in the Dope Sheet's Action Editor. The coat, hair, weapons, and ankles have separate bones. Akatsuki's offhand blade uses `Weapon.L`. The sleeves and trousers bend through the elbow and knee followers, and the shoulder plates follow part of each arm's rotation. The cloth blends between `Coat` and `Coat.Hem`, with the latter keyed to follow the coat's rotation with a slight delay. The run cycles include baked stance-foot contacts, with rotation keys available for editing.

Celestia has ten additional finger joints on her free hand. Her `Weapon.L` joint controls the casting wrist. Open her **Combo 1** action to see the fingers curl during the windup and spread at the `Release` marker. Both knuckle joints on each digit are keyed and editable. The hands holding weapons have modeled grips that move with the corresponding weapon joint.

The 33 actions cover idle, run, evade, hit reaction, three combo strikes, two skills, and the Eclipse anticipation and release for each hero. The `Release` action marker on each strike controls when the game spawns the hit or projectile and its effects. Keep it on the contact pose when editing the action. The game controls travel and uses the same marker to unlock dodge during skill recovery.

Brynhildr’s three combo actions use authored foot marks that account for the step into each strike. The `astral_advance` action property records the in-game travel distance. The runtime eases that distance in during the windup and reaches it at `Release`. To revise the advance and foot marks together, edit `SPEAR_ADVANCE` and `SPEAR_STANCE` in `tools/blender/hero_poses.py` and rebuild the rig.

Select a hero's **expression controls** mesh and open **Object Data → Shape Keys** to preview blinks, brow poses, gaze, and speech shapes. In the game, these shapes blend on top of the body action. Dialogue voice cues drive the visible mouth shapes. Akatsuki's mask leaves her eyes and brows as the visible expression controls.

To bake edits from the saved Blender project into the game, run from the repository root with Blender on your path.

```powershell
blender --background art/blender/HearthmereHeroes.blend --python-exit-code 1 --python tools/blender/build_hero_rigs.py -- --clips src/data/heroAnimationClips.json
```

The browser data contains 30 fps samples with packed rotations and hip offsets. Keep the armature bone names and the `astral_role` and `astral_clip` action properties when editing. Use the action frame range to control the baked span. Browser playback maps one-shot clips to the combat state's normalized progress.

To rebuild the project from current game meshes and the original authored poses, set a temporary export path and run the mesh and rig scripts. This regenerates the Blender project at the supplied destination.

```powershell
$env:ASTRAL_HERO_MESH_DUMP = Join-Path ([System.IO.Path]::GetTempPath()) 'astral-hero-meshes.json'
node node_modules/vite-node/vite-node.mjs tools/blender/export-hero-meshes.ts
blender --background --python-exit-code 1 --python tools/blender/build_hero_rigs.py -- --meshes $env:ASTRAL_HERO_MESH_DUMP --blend art/blender/HearthmereHeroes.blend --clips src/data/heroAnimationClips.json
```
