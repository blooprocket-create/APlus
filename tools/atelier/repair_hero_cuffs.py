"""Authored sculpt repair: remove residual neural fingertips beyond the cuffs.
Keeps the reviewed UVs, expressions and smoothed skin field. The game's original
articulated glove and instrument grip provide the hands. Run once on source,
then export_authored_hero.py; do not regenerate weights for a mesh cleanup.
"""
import bpy,os,json
from pathlib import Path
root=Path(__file__).resolve().parents[2];source=Path(os.environ.get('ASTRAL_HERO_SCULPT_SOURCE',str(root/'art/atelier/sculpts/celestia')))
bpy.ops.wm.open_mainfile(filepath=str(source/'CelestiaFitted.blend'))
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE');mesh=next(o for o in bpy.data.objects if o.type=='MESH')
remove=set();original_vertices=len(mesh.data.vertices);original_faces=len(mesh.data.polygons);length=json.loads((source/'fit.json').read_text())['dimensions']['forearm']
for side,sign in [('L',-1),('R',1)]:
 bone=rig.data.bones['Forearm.'+side];direction=(bone.head_local-bone.tail_local).normalized();wrist=bone.head_local+direction*length
 for v in mesh.data.vertices:
  if v.co.x*sign>.40 and v.co.z>wrist.z-.18 and (v.co-bone.head_local).dot(direction)>length-.018:remove.add(v.index)
# Shape-key geometry cannot be edited through bmesh. Remove faces with Blender's
# mesh operator so all shape-key vertex arrays, UV loops and groups stay aligned.
bpy.context.view_layer.objects.active=mesh;bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True)
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='DESELECT');bpy.context.tool_settings.mesh_select_mode=(True,False,False);bpy.ops.object.mode_set(mode='OBJECT')
for v in mesh.data.vertices:v.select=v.index in remove
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.delete(type='VERT');bpy.ops.object.mode_set(mode='OBJECT')
if len(mesh.data.vertices)<max(1000,original_vertices*.8) or len(mesh.data.polygons)<max(1000,original_faces*.8):raise RuntimeError('Cuff repair removed the body; source not saved')
bpy.context.preferences.filepaths.save_version=0;bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(source/'CelestiaFitted.blend'),compress=True)
print('ATELIER: residual cuff vertices removed',len(remove))
