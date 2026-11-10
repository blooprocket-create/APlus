"""Fit a portrait-scale original sculpture to the reviewed canonical hero.

The body, its authored weights, rest offsets and animation remain authoritative.
Only the head's geometry/material detail budget changes. Run after the separate
portrait reconstruction and calibrated front/back UV paint stages.
Experimental fitting prototype: the first portrait failed source review before
this stage. This tool has not yet been exercised on an accepted portrait.
"""
import bpy
import hashlib
import json
import math
import os
import shutil
from pathlib import Path

import numpy as np

root = Path(__file__).resolve().parents[2]
portrait = Path(os.environ['ASTRAL_PORTRAIT_SCULPT_SOURCE']).resolve()
body_source = root / 'art/atelier/sculpts/celestia'
output = Path(os.environ.get('ASTRAL_HERO_SCULPT_SOURCE', str(root / 'art/atelier/sculpts/celestia-portrait'))).resolve()
prefix = os.environ.get('ASTRAL_HERO_SCULPT_PREFIX', 'celestia-portrait')
if output == body_source or (output / 'CelestiaFitted.blend').exists():
    raise RuntimeError('Use a fresh candidate source directory; reviewed body sources are never overwritten')
for name in ['uv-sculpt.npz', 'paint-provenance.json', 'albedo.png', 'orm.png', 'emission.png', 'projection-source.png', 'source.png', 'crop.json']:
    if not (portrait / name).exists():
        raise RuntimeError('Missing reviewed portrait intermediate: ' + name)

data = np.load(portrait / 'uv-sculpt.npz')
raw, faces, uv = data['vertices'], data['faces'], data['uv']
camera = json.loads((portrait / 'paint-provenance.json').read_text())['camera']
distance, fov, elevation, azimuth, tx, ty = camera
elevation, azimuth = np.deg2rad([elevation, azimuth])
eye = np.array([math.cos(elevation) * math.cos(azimuth), math.cos(elevation) * math.sin(azimuth), math.sin(elevation)])
right = np.array([-math.sin(azimuth), math.cos(azimuth), 0])
up = np.cross(eye, right)
rotation = np.stack([right, [0, 0, 1], [math.cos(azimuth), math.sin(azimuth), 0]])
points = raw @ rotation.T
fit = json.loads((body_source / 'fit.json').read_text())
original_rest = json.dumps(fit['restOffsets'], sort_keys=True)

# Match the exact foreground crop/padding convention used by bake_projection.
image = bpy.data.images.load(str(portrait / 'source.png'))
width, height = image.size
pixels = np.empty(width * height * 4, np.float32)
image.pixels.foreach_get(pixels)
rgba = pixels.reshape(height, width, 4)[::-1]
yy, xx = np.where(rgba[:, :, 3] > 0)
x0, x1, y0, y1 = xx.min(), xx.max(), yy.min(), yy.max()
square = max(y1 - y0, x1 - x0)
padding = int(square / .85) - square
left = (square - (x1 - x0)) // 2 + padding // 2
top = (square - (y1 - y0)) // 2 + padding // 2
condition = square + padding
crop = json.loads((portrait / 'crop.json').read_text())['crop']
triangles = raw[faces]
edge1, edge2 = triangles[:, 1] - triangles[:, 0], triangles[:, 2] - triangles[:, 0]
origin = eye * distance
denominator = 2 * math.tan(math.radians(fov) / 2)

def landmark(original_pixel):
    pixel = np.array(original_pixel) - np.array(crop[:2])
    u, v = (pixel[0] - x0 + left) / condition, (pixel[1] - y0 + top) / condition
    direction = -eye + right * ((u - .5 - tx) * denominator) + up * ((.5 + ty - v) * denominator)
    direction /= np.linalg.norm(direction)
    cross = np.cross(direction, edge2)
    determinant = np.sum(edge1 * cross, axis=1)
    inverse = np.divide(1., determinant, out=np.zeros_like(determinant), where=np.abs(determinant) > 1e-8)
    delta = origin - triangles[:, 0]
    bary_u = np.sum(delta * cross, axis=1) * inverse
    q = np.cross(delta, edge1)
    bary_v = np.sum(direction * q, axis=1) * inverse
    ray_distance = np.sum(edge2 * q, axis=1) * inverse
    valid = (np.abs(determinant) > 1e-8) & (bary_u >= 0) & (bary_v >= 0) & (bary_u + bary_v <= 1) & (ray_distance > 0)
    if not np.any(valid):
        raise RuntimeError('Portrait landmark missed the actual sculpture: ' + str(original_pixel))
    return rotation @ (origin + direction * np.min(ray_distance[valid]))

marks = {name: landmark(pixel) for name, pixel in {'eyeL': (475, 158), 'eyeR': (550, 158), 'mouth': (512, 204)}.items()}
target = {name: np.array(fit['face'][name]) for name in marks}

def eye_basis(a, b):
    x = b - a
    x /= np.linalg.norm(x)
    y = np.array([0., 1., 0.])
    y -= x * np.dot(x, y)
    y /= np.linalg.norm(y)
    return np.stack([x, y, np.cross(x, y)], axis=1)

alignment = eye_basis(target['eyeL'], target['eyeR']) @ eye_basis(marks['eyeL'], marks['eyeR']).T
scale = np.linalg.norm(target['eyeR'] - target['eyeL']) / np.linalg.norm(marks['eyeR'] - marks['eyeL'])
offset = (target['eyeL'] + target['eyeR']) * .5 - scale * alignment @ ((marks['eyeL'] + marks['eyeR']) * .5)
points = scale * points @ alignment.T + offset
marks = {name: scale * alignment @ point + offset for name, point in marks.items()}
neck = fit['face']['neck'][1]
faces = faces[np.any(points[faces, 1] > neck - .04, axis=1)]
used, inverse = np.unique(faces.reshape(-1), return_inverse=True)
faces, points, uv = inverse.reshape(-1, 3), points[used], uv[used]
if not .08 < scale < .8 or len(points) < 1000 or np.ptp(points[:, 1]) > .75:
    raise RuntimeError('Implausible portrait alignment; inspect the sculpture and landmarks')

output.mkdir(parents=True, exist_ok=True)
for name in ['albedo.png', 'orm.png', 'emission.png']:
    shutil.copyfile(body_source / name, output / name)
    shutil.copyfile(portrait / name, output / ('portrait-' + name))
shutil.copyfile(portrait / 'projection-source.png', output / 'projection-source.png')
shutil.copyfile(body_source / 'fit.json', output / 'body-fit.json')
bpy.ops.wm.open_mainfile(filepath=str(body_source / 'CelestiaFitted.blend'))
rig = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
body = next(o for o in bpy.data.objects if o.type == 'MESH')

def body_signature():
    records = [(tuple(v.co), tuple((g.group, g.weight) for g in v.groups)) for v in body.data.vertices if v.co.z < neck - .1]
    return hashlib.sha256(repr(sorted(records)).encode()).hexdigest()

before = body_signature()
bpy.context.view_layer.objects.active = body
bpy.ops.object.select_all(action='DESELECT')
body.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='DESELECT')
bpy.context.tool_settings.mesh_select_mode = (True, False, False)
bpy.ops.object.mode_set(mode='OBJECT')
for vertex in body.data.vertices:
    vertex.select = vertex.co.z > neck + .03
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.delete(type='VERT')
bpy.ops.object.mode_set(mode='OBJECT')
if before != body_signature():
    raise RuntimeError('Portrait replacement changed the reviewed body coordinates or weights')

def xyz(point):
    return float(point[0]), -float(point[2]), float(point[1])

mesh = bpy.data.meshes.new('Original portrait • feature-scale surface')
mesh.from_pydata([xyz(p) for p in points], [], faces.tolist())
mesh.update()
actor = bpy.data.objects.new('Celestia • portrait-scale original head', mesh)
bpy.context.collection.objects.link(actor)
actor.parent = rig
for poly in mesh.polygons:
    poly.use_smooth = True
layer = mesh.uv_layers.new(name='Portrait paint UV')
for loop in mesh.loops:
    layer.data[loop.index].uv = uv[loop.vertex_index]
group = actor.vertex_groups.new(name='Head')
group.add(list(range(len(points))), 1., 'REPLACE')
modifier = actor.modifiers.new('Canonical Head handoff', 'ARMATURE')
modifier.object = rig

albedo = bpy.data.images.load(str(output / 'portrait-albedo.png'))
paint = np.empty(albedo.size[0] * albedo.size[1] * 4, np.float32)
albedo.pixels.foreach_get(paint)
paint = paint.reshape(albedo.size[1], albedo.size[0], 4)
colors = paint[np.clip((uv[:, 1] * (albedo.size[1] - 1)).astype(int), 0, albedo.size[1] - 1), np.clip((uv[:, 0] * (albedo.size[0] - 1)).astype(int), 0, albedo.size[0] - 1), :3]

for name, roughness, metallic, anisotropy in [('Skin • original portrait porcelain', .8, 0, 0), ('Original portrait • silver tresses', .48, 0, .25), ('Original portrait • gilded ornament', .38, .68, 0), ('Original portrait • eyes', .28, 0, 0)]:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    nodes, links = material.node_tree.nodes, material.node_tree.links
    bsdf = nodes.get('Principled BSDF')
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Anisotropic IOR Level'].default_value = anisotropy
    texture = nodes.new('ShaderNodeTexImage')
    texture.image = albedo
    links.new(texture.outputs['Color'], bsdf.inputs['Base Color'])
    mesh.materials.append(material)
for poly in mesh.polygons:
    r, g, b = colors[list(poly.vertices)].mean(axis=0)
    x, y, z = points[list(poly.vertices)].mean(axis=0)
    face_region = abs(x) < .14 and neck < y < fit['face']['head'][1] + .15 and z > fit['face']['head'][2] + .025
    skin = face_region and r > g * 1.06 and g > b * .94
    gold = r > b * 1.7 and r > g * 1.12 and not face_region
    eye_region = face_region and any(abs(x - marks['eye' + side][0]) < .029 and abs(y - marks['eye' + side][1]) < .012 for side in ['L', 'R'])
    poly.material_index = 3 if eye_region else 0 if skin else 2 if gold else 1

actor.shape_key_add(name='Basis')
for name in ['Blink', 'Focus', 'Concern', 'Gaze', 'SpeakOpen', 'SpeakWide', 'SpeakRound']:
    key = actor.shape_key_add(name=name)
    for i, point in enumerate(points):
        x, y, z = point
        delta = np.zeros(3)
        if abs(x) < .13 and y > neck + .04 and z > fit['face']['head'][2] + .025:
            for side in ['L', 'R']:
                ex, ey, _ = marks['eye' + side]
                region = math.exp(-((x - ex) / .041) ** 4 - ((y - ey) / .018) ** 4)
                if name == 'Blink': delta[1] += (ey - y) * region * .88
                if name == 'Focus': delta[1] -= .004 * region
                if name == 'Concern': delta[1] += .003 * region
            mouth = math.exp(-((x - marks['mouth'][0]) / .055) ** 4 - ((y - marks['mouth'][1] + .018) / .045) ** 4)
            if name == 'SpeakOpen': delta[1] -= .012 * mouth
            if name == 'SpeakWide': delta[0] += x * .06 * mouth
            if name == 'SpeakRound': delta[0] -= x * .10 * mouth; delta[2] += .003 * mouth
        key.data[i].co = xyz(point + delta)

# Exact rational projection from the fitted global rest coordinates back into
# this original portrait painting. The existing face driver owns gaze/blink.
transform = alignment @ rotation
A = transform.T / scale
B = -A @ offset
rw, ow = -eye @ A, distance - eye @ B
ru, ou = (.5 + tx) * rw + right @ A / denominator, (.5 + tx) * ow + right @ B / denominator
rv, ov = (.5 + ty) * rw - up @ A / denominator, (.5 + ty) * ow - up @ B / denominator
fit['sourceProjection'] = np.array([[*ru, ou], [*rv, ov], [0, 0, 0, 0], [*rw, ow]]).T.reshape(-1).tolist()
fit['face'].update({name: point.tolist() for name, point in marks.items()})
fit['portraitPatch'] = {'body': str(body_source.relative_to(root)), 'crop': crop, 'sourceSHA256': hashlib.sha256((portrait / 'source.png').read_bytes()).hexdigest(), 'scale': float(scale), 'bodySignature': before, 'status': 'UNREVIEWED: compare the actual game, including neck seam and performance'}
fit['statistics'] = {'vertices': sum(len(o.data.vertices) for o in [body, actor]), 'triangles': sum(len(p.vertices) - 2 for o in [body, actor] for p in o.data.polygons)}
if json.dumps(fit['restOffsets'], sort_keys=True) != original_rest:
    raise RuntimeError('Portrait patch changed canonical body fitting')
(output / 'fit.json').write_text(json.dumps(fit, indent=2) + '\n')
destination = root / 'public/art/observatory'
(destination / (prefix + '-fit.json')).write_text(json.dumps(fit, indent=2) + '\n')
shutil.copyfile(output / 'projection-source.png', destination / (prefix + '-source-paint.png'))
bpy.ops.export_scene.gltf(filepath=str(destination / (prefix + '.glb')), export_format='GLB', export_yup=True, export_tangents=True, export_all_influences=False)
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(output / 'CelestiaFitted.blend'), compress=True)
print('ATELIER: original portrait candidate exported; body coordinates/weights and canonical rest offsets preserved', fit['statistics'])
