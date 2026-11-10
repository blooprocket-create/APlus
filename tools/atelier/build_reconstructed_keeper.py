"""Fit an original reconstructed sculpture to the existing sentinel art root.
Input is authored-art reconstruction, never a downloaded game asset. Replaces
no AI, hitbox, telegraph, projectile, health or gameplay animation owner.
"""
import bpy,sys,os,math,json,numpy as np,bmesh
from pathlib import Path
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from atelier_mesh import mat,OUT
source=Path(os.environ.get('ASTRAL_SCULPT_SOURCE',str(Path(__file__).resolve().parents[2]/'art/atelier/sculpts/lunar-warden')))
painted=(source/'uv-sculpt.npz').exists();payload=np.load(source/('uv-sculpt.npz' if painted else 'sculpt.npz'));vertices=payload['vertices'];faces=payload['faces'];colors=None if painted else payload['colors']
label=os.environ.get('ASTRAL_SCULPT_LABEL','Lunar warden');low=vertices.min(axis=0);high=vertices.max(axis=0);scale=float(os.environ.get('ASTRAL_SCULPT_HEIGHT','2.2'))/(high[2]-low[2]);center=(low+high)*.5
if os.environ.get('ASTRAL_SCULPT_PIVOT')=='roots':
 base=vertices[vertices[:,2]<low[2]+(high[2]-low[2])*.15];center[:2]=np.median(base[:,:2],axis=0)
# Reconstruction coordinates: X is back/front, Y right, Z up.
points=[((v[1]-center[1])*scale,-(v[0]-center[0])*scale,(v[2]-low[2])*scale) for v in vertices]
me=bpy.data.meshes.new('Original '+label+' reconstructed sculpture');me.from_pydata(points,[],faces.tolist());me.update()
if not painted:
 bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free()
o=bpy.data.objects.new(label+' • original sculpt',me);bpy.context.collection.objects.link(o)
for p in me.polygons:p.use_smooth=True
m=mat('Reconstructed original • '+label.lower(),'ffffff',.82);nodes=m.node_tree.nodes;links=m.node_tree.links;bsdf=nodes.get('Principled BSDF')
if painted:
 uvs=payload['uv'];uv=me.uv_layers.new(name='Sculpt paint UV')
 for poly in me.polygons:
  for li in poly.loop_indices:uv.data[li].uv=uvs[me.loops[li].vertex_index]
 if 'normals' in payload:
  me.normals_split_custom_set_from_vertices([(float(n[1]),-float(n[0]),float(n[2])) for n in payload['normals']])
 def texture(name,space='sRGB'):
  node=nodes.new('ShaderNodeTexImage');node.image=bpy.data.images.load(str(source/name));node.image.colorspace_settings.name=space;return node
 albedo=texture('albedo.png');links.new(albedo.outputs['Color'],bsdf.inputs['Base Color'])
 orm=texture('orm.png','Non-Color');separate=nodes.new('ShaderNodeSeparateColor');links.new(orm.outputs['Color'],separate.inputs[0]);links.new(separate.outputs['Green'],bsdf.inputs['Roughness']);links.new(separate.outputs['Blue'],bsdf.inputs['Metallic'])
 emission=texture('emission.png');links.new(emission.outputs['Color'],bsdf.inputs['Emission Color']);bsdf.inputs['Emission Strength'].default_value=.5
 if (source/'normal.png').exists():
  normal=texture('normal.png','Non-Color');tangent=nodes.new('ShaderNodeNormalMap');tangent.inputs['Strength'].default_value=.65;links.new(normal.outputs['Color'],tangent.inputs['Color']);links.new(tangent.outputs['Normal'],bsdf.inputs['Normal'])
else:
 color=me.color_attributes.new(name='Original sculpt paint',type='FLOAT_COLOR',domain='POINT')
 for i,c in enumerate(colors):color.data[i].color=tuple((float(x)/255)**2.2 for x in c[:3])+(1,)
 vcol=nodes.new('ShaderNodeVertexColor');vcol.layer_name=color.name;links.new(vcol.outputs['Color'],bsdf.inputs['Base Color'])
me.materials.append(m)
bpy.ops.export_scene.gltf(filepath=OUT+'/'+os.environ.get('ASTRAL_SCULPT_OUTPUT','keeper-sculpt.glb'),export_format='GLB',export_yup=True)
# Offline diagnostic source, not a replacement for browser screenshot review.
bpy.context.preferences.filepaths.save_version=0
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(source/os.environ.get('ASTRAL_SCULPT_BLEND','LunarWarden.blend')),compress=True)
print('ATELIER: original keeper sculpt fitted',len(vertices),'vertices')
