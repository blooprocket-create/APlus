# Original art reconstruction tooling

This optional **offline toolchain** turns project-authored original images into
editable 3D sources. It does not download game geometry or run in the game.
The user explicitly authorized pretrained generation weights as production tools.

The investigated backend is [TripoSR](https://github.com/VAST-AI-Research/TripoSR),
MIT, copyright 2024 Tripo AI & Stability AI. Its license is retained in
[TRIPOSR_LICENSE.txt](TRIPOSR_LICENSE.txt). Code commit:
`107cefdc244c39106fa830359024f6a2f1c78871`. Tensor weights:
[`stabilityai/TripoSR`](https://huggingface.co/stabilityai/TripoSR), revision
`5b521936b01fbe1890f6f9baed0254ab6351c04a`. Neither weights nor upstream checkout
are committed. Source image SHA-256, exact revisions and extraction settings are
recorded beside each sculpture in `art/atelier/sculpts/`.

## Separate environments

Use an isolated Python environment with `requirements-cpu.txt`; install the CPU
PyTorch wheel from its official index. Clone the pinned upstream revision outside
the game repository. The CPU adapter substitutes scikit-image marching cubes for
the upstream custom CUDA extension. Sources already have alpha, so no background
removal network is used. Tensor-only loading is enabled. No npm/game dependency
or runtime server is added.

```sh
python tools/atelier/reconstruction/reconstruct.py \
  art/atelier/references/lunar-warden.png /tmp/warden \
  --source /path/to/pinned/TripoSR --resolution 192
python tools/atelier/reconstruction/bake_projection.py \
  /tmp/warden art/atelier/references/lunar-warden.png --kind stone
```

The raw neural result is a **starting sculpture**, not finished production art.
`bake_projection.py` calibrates a camera against the source alpha silhouette,
z-tests the actual geometry, unwraps it with xatlas, and bakes original paint only
onto visible surfaces. It retains generated 3D paint elsewhere, blends chart
edges, dilates padding, and creates editable roughness/metal/emission masks.
`--append --azimuth … --orthographic --view-name back` paints another original
view onto existing UVs. It preserves the first projection metadata used for face
fitting. `--kind organic` avoids metallic foliage and preserves crown brushwork.

## Editable handoff, independent of inference

Copy reviewed mesh arrays, paint maps and provenance into `art/atelier/sculpts/`.
Blender fitting/export tools under `tools/atelier/` require only these committed
sources. `npm run art:bake` needs Blender; ordinary `npm run build` and
`npm run art:verify` need neither Blender nor pretrained weights/network access.

For Celestia, `build_reconstructed_hero.py` bootstraps landmark fitting, named
joint weights and expression shapes. Welded adjacency smoothing prevents hard
classification boundaries from splitting shoulders into spikes. The reviewed
`CelestiaFitted.blend` is then authoritative: edit sculpt/skin weights there and
use `export_authored_hero.py` to refresh paint/export **without regenerating skin**.
`repair_hero_cuffs.py` is a one-time authoring repair, not a normal bake step.
Deliberately rebuilding an existing reviewed binding requires the explicit
`ASTRAL_REBUILD_HERO_BINDINGS=1` tool option, preventing accidental replacement of
sculpt/weight edits by a fresh heuristic fit.

`foliage_from_sculpt.py` segments the original crown's painted green surfaces,
removes the sealed outer lobes, and replaces them with 6,500 curved cutout blades
conditioned on the same authored surface. It preserves the original bark/root
sculpture. The sealed version remains available for comparison.

`bake_relief.py` derives restrained illustrated normal detail from original UV
paint while rejecting broad source lighting and suppressing UV gutters. These
are editable material suggestions, not a recovered physical-depth/high-poly bake.
`fit_surface_path.py` raycasts artist-annotated image pixels through the calibrated
camera to the actual sculpture. The cliff's committed `flow-pixels.json` and
`flow-path.json` drive animated surface water in the live material. These are
rendering attachments, never gameplay navigation or geographical anchors.

Runtime uses the existing `CharacterRig` bones, `HeroMotion` player, shared leg
solver, ability release/damage marker and camera. Source armatures are export
carriers; they do not introduce a second animator or gameplay actor. The explicit
browser `__atelier.inspect()` probe reports visible art and live sole height;
it never runs in the render loop.

## Limits that require visual review

Single-view inference can soften carvings, seal foliage into solid lobes, infer
poor rear anatomy, merge accessories and leave unreliable topology. Projected
paint can retain source lighting or distort on oblique views. A posed asset
looking good from the conditioning camera does not prove good deformation.
This pipeline does not substitute for retopology, facial topology, animation
direction or review of actual rendered frames. See the screenshot-backed
[atelier review](../../../docs/OBSERVATORY_ATELIER.md).
