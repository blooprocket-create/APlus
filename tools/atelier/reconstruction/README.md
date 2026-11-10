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

## Higher-fidelity shape experiment: TripoSG

`reconstruct_onnx.py` is a separate CPU-only adapter for
[`VAST-AI/TripoSG`](https://huggingface.co/VAST-AI/TripoSG), MIT, revision
`2c1c516d22d58db486a058d98d31bb6177344e06`. Its portable graph export is
[`cgb/triposg-onnx-webgpu`](https://huggingface.co/cgb/triposg-onnx-webgpu),
revision `4db41a2fec8b5785e3f7ec721a2c4b703943b57c`. The DINOv2 encoder is
Apache-2.0. The parent's [MIT license](TRIPOSG_LICENSE.txt) is retained.
Install `requirements-onnx.txt` in a separate Python environment. This adapter
does not execute downloaded Python code, upload source artwork, add a game
dependency or replace the reviewed production sculpture.

It verifies the pinned external tensor SHA-256 values, streams tensors directly
into caller-owned shared ONNX Runtime initializers, and stages encoder, shape
transformer and surface decoder separately. CPU arithmetic defaults to float32. The
transformer stage peaks close to an 8 GiB machine's memory limit; do not run a
software browser capture alongside it. Tool weights remain outside the repository.

```sh
python tools/atelier/reconstruction/reconstruct_onnx.py \
  art/atelier/references/celestia-apose.png /tmp/celestia-candidate --stage encode
python tools/atelier/reconstruction/reconstruct_onnx.py \
  art/atelier/references/celestia-apose.png /tmp/celestia-candidate --stage denoise --steps 12
python tools/atelier/reconstruction/reconstruct_onnx.py \
  art/atelier/references/celestia-apose.png /tmp/celestia-candidate --stage surface
```

Twelve steps are an experimental fast comparison, **not** the upstream 50-step
quality configuration. Intermediate latents and completed-step counts are saved;
surface extraction refuses incomplete denoising. The output is an unreviewed
original shape without inferred color. Paint, fit, inspect and animate it before
adoption. Neither model size nor a successful extraction demonstrates better art.
Use `ASTRAL_HERO_SCULPT_SOURCE` and `ASTRAL_HERO_SCULPT_PREFIX` with the Blender
hero tools to keep candidate exports separate from the retained character.

`--quantize-dense` is an **experimental**, local dynamic-int8 conversion of the
222 constant-weight dense MatMul layers; attention and the surface decoder stay
float32. A numerical study on Celestia's original conditioning image compared
the first conditional/unconditional predictions at sigma=1: cosine similarity
0.99950/0.99952, relative L2 error 3.16%/3.10%, and 39.70 seconds versus 80.45
seconds for the full-precision pair. This is a limited numerical comparison,
not a completed-sculpture quality result or a claim of equivalent outputs.
The 24-step portrait trial subsequently **failed geometry review**: both the
coarse field and the refined mesh contain severe vertical artifacts and floating
fragments. It was not painted, fitted or adopted. A full-precision run with the
same input/seed is the controlled follow-up; similarity of the first prediction
is insufficient to approve a compressed generation path.
`--stage denoise --benchmark` writes those two predictions without starting a
finished sampling run. Compare them before evaluating accelerated sculptures.

Sampling writes an atomic `checkpoint.npz` after every step. `--resume` requires
the same seed, step count and precision, and resumes at the actual saved step;
it does not reinterpret a 12-step result as an unfinished 50-step schedule.
The original verified DiT tensor file may be retained in the external cache for
repeated local comparisons. It is 2.7 GiB; it is a replaceable tool dependency,
never an asset or a committed source. Surface extraction additionally preserves
`surface-field.npz` so repair experiments can work from the actual field.

Surface queries also checkpoint every 8,192 points into latent/coordinate/revision
keyed memory maps. Rerunning the same surface command resumes those queries.
`--surface-point-budget 131072` deliberately returns code 3 after a bounded
checkpoint; repeat the same command to continue. A completed coarse pass is
retained when the fine pass restarts. Refinement includes both sign crossings and
the upstream `abs(logits) < .95` near-surface rule, since sign crossings alone can
miss thin cloth between coarse samples.

For constrained CPU memory, `--stream-half-weights` keeps the **same original
portable FP16 values** in storage and expands each dense layer for F32 computation
when its activation is ready. It adds no int8 quantization. A naive constant-cast
version was scheduled eagerly by ORT and exceeded memory; activation-dependent
shape/cast dependencies keep the expanded layers from accumulating at startup.
The [reference comparison](../../../art/atelier/validation/triposg-original-storage.json)
reports **bitwise-identical** first conditional and unconditional predictions
against the working expanded-F32 graph, taking 132.25 seconds versus 80.45 on
this CPU. The portrait run still requires completed geometry and browser review.
This is slower, and it preserves the working reference computation rather than
approving the failed integer-weight optimization.

For portrait-scale detail, `prepare_portrait.py OUTPUT` preserves unretouched
pixels from the project's original front/rear paintings and records the parent
hashes/crop rectangles. `review_clay.py` provides four **offline source** views
before paint and rig work; these are not screenshots of the game.
The experimental `build_portrait_patch.py` fitting prototype targets the existing body using
ray-matched eyes, preserving the body-coordinate/weight signature and canonical
rest offsets. The candidate remains separate until actual browser views and
performance are inspected. It has not yet been run on an accepted portrait. This is a source experiment, not a production face
topology or expression sign-off.

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
