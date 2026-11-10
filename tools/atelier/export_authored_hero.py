"""Export the reviewed editable weighted hero without regenerating its skin.
Texture refresh and sculpt/weight authoring are separate production operations.
Normal art builds require the committed sources, never reconstruction weights.
"""
import bpy,os,json,shutil
from pathlib import Path
root=Path(__file__).resolve().parents[2];source=Path(os.environ.get('ASTRAL_HERO_SCULPT_SOURCE',str(root/'art/atelier/sculpts/celestia')))
prefix=os.environ.get('ASTRAL_HERO_SCULPT_PREFIX','celestia-sculpt')
bpy.ops.wm.open_mainfile(filepath=str(source/'CelestiaFitted.blend'))
for material in bpy.data.materials:
 if not material.use_nodes:continue
 for node in material.node_tree.nodes:
  if node.type!='TEX_IMAGE' or not node.image:continue
  old=node.image;name=Path(bpy.path.abspath(old.filepath)).name;path=source/name
  if path.exists():
   image=bpy.data.images.load(str(path),check_existing=False);image.colorspace_settings.name=old.colorspace_settings.name;node.image=image
fit=json.loads((source/'fit.json').read_text());rig=next(o for o in bpy.data.objects if o.type=='ARMATURE');before=dict(fit['statistics'])
meshes=[o.data for o in bpy.data.objects if o.type=='MESH'];fit['statistics']['vertices']=sum(len(m.vertices) for m in meshes);fit['statistics']['triangles']=sum(len(p.vertices)-2 for m in meshes for p in m.polygons)
if fit['statistics']['vertices']<max(1000,before['vertices']*.25) or fit['statistics']['triangles']<max(1000,before['triangles']*.25):raise RuntimeError('Refusing empty/damaged authored hero export')
(source/'fit.json').write_text(json.dumps(fit,indent=2)+'\n');rig['astral_visual_fit']=json.dumps(fit,separators=(',',':'))
output=root/'public/art/observatory';(output/(prefix+'-fit.json')).write_text(json.dumps(fit,indent=2)+'\n')
if (source/'projection-source.png').exists():shutil.copyfile(source/'projection-source.png',output/('hero-source-paint.png' if prefix=='celestia-sculpt' else prefix+'-source-paint.png'))
bpy.ops.export_scene.gltf(filepath=str(output/(prefix+'.glb')),export_format='GLB',export_yup=True,export_all_influences=False)
bpy.context.preferences.filepaths.save_version=0;bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(source/'CelestiaFitted.blend'),compress=True)
print('ATELIER: reviewed hero surface/weights exported with refreshed original paint')
