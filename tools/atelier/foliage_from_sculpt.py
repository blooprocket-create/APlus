"""Replace a sealed reconstructed crown with porous, painted leaf surfaces.
The original sculpt defines all crown volumes and placement; no ellipsoid cloud
or primitive tree assembly is generated. Organic bark/root silhouette survives.
This is an offline authoring experiment, reviewed against the sealed version.
"""
import bpy,math,numpy as np
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[2];source=root/'art/atelier/sculpts/elder-tree'
bpy.ops.wm.open_mainfile(filepath=str(source/'ElderTree.blend'))
tree=next(o for o in bpy.data.objects if o.type=='MESH');me=tree.data
albedo=bpy.data.images.load(str(source/'albedo.png'));w,h=albedo.size
pixels=np.empty(w*h*4,np.float32);albedo.pixels.foreach_get(pixels);pixels=pixels.reshape(h,w,4)
uvs=me.uv_layers.active.data;positions=np.array([v.co[:] for v in me.vertices]);normals=np.array([v.normal[:] for v in me.vertices])
retained=[];retained_uv=[];samples=[];areas=[]
for poly in me.polygons:
 uv=np.array([uvs[i].uv[:] for i in poly.loop_indices]);paint=pixels[np.clip((uv[:,1]*(h-1)).astype(int),0,h-1),np.clip((uv[:,0]*(w-1)).astype(int),0,w-1),:3].mean(axis=0)
 r,g,b=paint;p=positions[list(poly.vertices)];green=g>r*1.04 and g>b*1.09 and p[:,2].mean()>4.8
 if green and len(p)==3:
  area=np.linalg.norm(np.cross(p[1]-p[0],p[2]-p[0]))*.5
  if area>.00001:samples.append((p,normals[list(poly.vertices)].mean(axis=0),paint));areas.append(area)
 else:retained.append(tuple(poly.vertices));retained_uv.extend(uv.tolist())
if len(samples)<1000:raise RuntimeError('Crown segmentation failed; source not modified')
wood=bpy.data.meshes.new('Elder • preserved original bark and boughs');wood.from_pydata(positions.tolist(),[],retained);wood.update()
wood.materials.append(me.materials[0]);uv=wood.uv_layers.new(name='Original sculpt paint')
for i,p in enumerate(retained_uv):uv.data[i].uv=p
wood.normals_split_custom_set_from_vertices(normals.tolist());tree.data=wood
for p in wood.polygons:p.use_smooth=True
rng=np.random.default_rng(428);choice=rng.choice(len(samples),6500,p=np.array(areas)/sum(areas));vs=[];fs=[];uvs=[];colors=[]
for selected in choice:
 tri,n,paint=samples[selected];bary=rng.random(3);bary=-np.log(np.maximum(.00001,bary));bary/=bary.sum();center=bary@tri
 normal=Vector(n.tolist()).normalized();up=Vector((0,0,1));normal=(normal*.42+up*.72).normalized()
 tangent=normal.cross(Vector((0,1,0))).normalized();bitangent=normal.cross(tangent).normalized();a=float(rng.uniform(0,math.tau));direction=tangent*math.cos(a)+bitangent*math.sin(a);across=normal.cross(direction).normalized()
 length=float(rng.uniform(.27,.47));width=length*float(rng.uniform(.35,.52));q=int(rng.integers(0,3));start=len(vs)
 # A shallow, curved blade has both volume and a porous cutout silhouette.
 for j in range(5):
  t=j/4;shape=math.sin(math.pi*t)**.65*.48+.015
  for side in [-1,1]:
   p=Vector(center.tolist())+direction*((t-.5)*length)+across*(side*width*shape)+normal*(math.sin(math.pi*t)*length*.13)
   vs.append(tuple(p));uvs.append(((q%2)*.5+.125+(side+1)*.125,(q//2)*.5+.009+t*.482))
   brightness=float(np.clip(paint.mean()/.33,.72,1.20));colors.append((brightness,brightness,brightness,1))
  if j:base=start+(j-1)*2;fs.extend([(base,base+1,base+3),(base,base+3,base+2)])
leaves=bpy.data.meshes.new('Elder • sculpt-conditioned porous blades');leaves.from_pydata(vs,[],fs);leaves.update()
uv=leaves.uv_layers.new(name='Original painted leaf atlas')
for loop in leaves.loops:uv.data[loop.index].uv=uvs[loop.vertex_index]
color=leaves.color_attributes.new(name='Source crown values',type='FLOAT_COLOR',domain='POINT')
for i,c in enumerate(colors):color.data[i].color=c
material=bpy.data.materials.new('Reconstructed elder foliage • porous painted blades');material.use_nodes=True
nodes=material.node_tree.nodes;links=material.node_tree.links;bsdf=nodes.get('Principled BSDF');tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(root/'public/art/observatory/leaves.png'))
vc=nodes.new('ShaderNodeVertexColor');vc.layer_name=color.name;multiply=nodes.new('ShaderNodeMixRGB');multiply.blend_type='MULTIPLY';multiply.inputs[0].default_value=1
links.new(tex.outputs['Color'],multiply.inputs[1]);links.new(vc.outputs['Color'],multiply.inputs[2]);links.new(multiply.outputs[0],bsdf.inputs['Base Color']);links.new(tex.outputs['Alpha'],bsdf.inputs['Alpha']);links.new(multiply.outputs[0],bsdf.inputs['Emission Color']);bsdf.inputs['Emission Strength'].default_value=.08;bsdf.inputs['Roughness'].default_value=.86
leaves.materials.append(material);o=bpy.data.objects.new('Elder • porous leaf crown',leaves);bpy.context.collection.objects.link(o)
for p in leaves.polygons:p.use_smooth=True
bpy.ops.export_scene.gltf(filepath=str(root/'public/art/observatory/elder-tree-porous.glb'),export_format='GLB',export_yup=True)
bpy.context.preferences.filepaths.save_version=0;bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(source/'ElderTreeFoliage.blend'),compress=True)
print('ATELIER: sealed crown replaced, triangles removed',len(samples),'curved blades',len(choice),'preserved bark triangles',len(retained))
