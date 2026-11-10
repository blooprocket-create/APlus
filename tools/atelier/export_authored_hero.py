"""Export the reviewed editable weighted hero without regenerating its skin.
Texture refresh and sculpt/weight authoring are separate production operations.
Normal art builds require the committed sources, never reconstruction weights.
"""
import bpy,os,json
from pathlib import Path
root=Path(__file__).resolve().parents[2];source=Path(os.environ.get('ASTRAL_HERO_SCULPT_SOURCE',str(root/'art/atelier/sculpts/celestia')))
bpy.ops.wm.open_mainfile(filepath=str(source/'CelestiaFitted.blend'))
for material in bpy.data.materials:
 if not material.use_nodes:continue
 for node in material.node_tree.nodes:
  if node.type!='TEX_IMAGE' or not node.image:continue
  old=node.image;name=Path(bpy.path.abspath(old.filepath)).name;path=source/name
  if path.exists():
   image=bpy.data.images.load(str(path),check_existing=False);image.colorspace_settings.name=old.colorspace_settings.name;node.image=image
fit=json.loads((source/'fit.json').read_text());rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
meshes=[o.data for o in bpy.data.objects if o.type=='MESH'];fit['statistics']['vertices']=sum(len(m.vertices) for m in meshes);fit['statistics']['triangles']=sum(len(p.vertices)-2 for m in meshes for p in m.polygons)
if fit['statistics']['vertices']<20000 or fit['statistics']['triangles']<20000:raise RuntimeError('Refusing empty/damaged authored hero export')
(source/'fit.json').write_text(json.dumps(fit,indent=2)+'\n');rig['astral_visual_fit']=json.dumps(fit,separators=(',',':'))
output=root/'public/art/observatory';(output/'celestia-sculpt-fit.json').write_text(json.dumps(fit,indent=2)+'\n')
bpy.ops.export_scene.gltf(filepath=str(output/'celestia-sculpt.glb'),export_format='GLB',export_yup=True,export_all_influences=False)
bpy.context.preferences.filepaths.save_version=0;bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(source/'CelestiaFitted.blend'),compress=True)
print('ATELIER: reviewed hero surface/weights exported with refreshed original paint')
