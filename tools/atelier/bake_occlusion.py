"""Offline geometric occlusion baked into a glTF COLOR_0 attribute.
This supplies contact/crevice structure independent of runtime shadow resolution.
A BVH of the actual sculpture is sampled; no screen-space dark halo is added.
"""
import bpy,math
from mathutils import Vector
from mathutils.bvhtree import BVHTree

def bake_occlusion(objects,rays=12,distance=1.8):
 solids=[o for o in objects if o.type=='MESH' and not o.data.materials[0].name.startswith(('Foliage','Valley','Petal','Cliff'))]
 vertices=[];polys=[]
 for o in solids:
  start=len(vertices);vertices.extend(o.matrix_world@v.co for v in o.data.vertices)
  polys.extend(tuple(start+i for i in p.vertices) for p in o.data.polygons)
 tree=BVHTree.FromPolygons(vertices,polys,all_triangles=False)
 for o in solids:
  me=o.data;normal=o.matrix_world.to_3x3().inverted().transposed();values=[]
  for v in me.vertices:
   n=(normal@v.normal).normalized();origin=o.matrix_world@v.co+n*.025
   tangent=n.cross(Vector((0,0,1)))
   if tangent.length<.01:tangent=n.cross(Vector((1,0,0)))
   tangent.normalize();bitangent=n.cross(tangent);obscured=0
   for k in range(rays):
    u=(k+.5)/rays;a=k*2.399963;rad=math.sqrt(u)
    direction=tangent*(math.cos(a)*rad)+bitangent*(math.sin(a)*rad)+n*math.sqrt(1-u)
    hit,_,_,d=tree.ray_cast(origin,direction,distance)
    if hit is not None:obscured+=(1-d/distance)**.6
   ao=max(.38,1-obscured/rays*.85);values.append(ao)
  color=me.color_attributes.new(name='Sculpt occlusion',type='FLOAT_COLOR',domain='POINT')
  for i,ao in enumerate(values):color.data[i].color=(ao,ao,ao,1)
 print('ATELIER: geometric occlusion baked',len(vertices),'vertices',flush=True)
