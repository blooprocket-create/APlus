"""Offline geometry review, explicitly not a screenshot of the game.
blender -b --python review_clay.py -- SOURCE_DIRECTORY OUTPUT_DIRECTORY
"""
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector

source, output = map(Path, sys.argv[sys.argv.index('--') + 1:])
output.mkdir(parents=True, exist_ok=True)
data = np.load(source / 'sculpt.npz')
vertices = data['vertices']
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
geometry = bpy.data.meshes.new('Original source sculpture')
geometry.from_pydata(vertices.tolist(), [], data['faces'].tolist())
geometry.update()
sculpture = bpy.data.objects.new('Original source sculpture', geometry)
bpy.context.collection.objects.link(sculpture)
for poly in geometry.polygons:
    poly.use_smooth = True
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'STUDIO'
scene.display.shading.show_shadows = True
scene.display.shading.show_cavity = True
scene.display.shading.cavity_type = 'BOTH'
scene.display.shading.color_type = 'SINGLE'
scene.display.shading.single_color = (.56, .59, .64)
scene.display.shading.background_type = 'WORLD'
scene.world.color = (.025, .025, .03)
scene.render.resolution_x, scene.render.resolution_y = 600, 800
scene.render.resolution_percentage = 100
center = Vector((vertices.min(axis=0) + vertices.max(axis=0)) * .5)
camera_data = bpy.data.cameras.new('Source inspection')
camera = bpy.data.objects.new('Source inspection', camera_data)
bpy.context.collection.objects.link(camera)
scene.camera = camera
camera_data.type = 'ORTHO'
for name, direction in [('front', (4, 0, 0)), ('side', (0, 4, 0)), ('three-quarter', (4, 2, 0)), ('back', (-4, 0, 0))]:
    camera.location = center + Vector(direction)
    camera.rotation_euler = (center - camera.location).to_track_quat('-Z', 'Y').to_euler()
    axes = np.array(camera.rotation_euler.to_matrix())
    projected = vertices @ axes
    camera_data.ortho_scale = float(max(np.ptp(projected[:, 0]) / .75, np.ptp(projected[:, 1])) * 1.12)
    scene.render.filepath = str(output / ('source-clay-' + name + '.png'))
    bpy.ops.render.render(write_still=True)
