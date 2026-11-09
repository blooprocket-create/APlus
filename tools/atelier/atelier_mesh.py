"""Original Astral atelier assets. Blender 3.4+; no downloaded geometry.
Coordinates below are game Y-up. Silhouettes are authored splines; surfaces
are continuous quad patches, subdivided before glTF export. Seed affects
surface wear only, never landmark composition. Run from repository root.
"""
import bpy, bmesh, math, random, os
from mathutils import Vector
random.seed(428)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
OUT=os.path.abspath('public/art/observatory'); os.makedirs(OUT,exist_ok=True)
def xyz(p): return (p[0],-p[2],p[1])
def mat(name,hex,rough=.8,metal=0):
 m=bpy.data.materials.new(name); m.diffuse_color=(*[(int(hex[i:i+2],16)/255)**2.2 for i in (0,2,4)],1); m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=m.diffuse_color; p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 return m
stone=mat('Limestone • aged celadon','889b88'); dark=mat('Carved recess • blue slate','334e50'); gold=mat('Old brass • warm light','c7a66c',.36,.65)
bark=mat('Heartwood • umber violet','655650'); moss=mat('Moss • viridian velvet','416b51'); ground=mat('Earth • malachite wash','526e59')
leaves=[mat('Foliage • '+str(i),h) for i,h in enumerate(['537a58','73955d','a2ae66','c8b875','d4c38b'])]
flower=mat('Petal • dusk iris','8686b1'); ivory=mat('Petal • candle cream','e8dba5')
def mesh(name,vs,fs,m,sub=0):
 me=bpy.data.meshes.new(name);me.from_pydata([xyz(v) for v in vs],[],fs);me.update();
 bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));
 if name.startswith(('Sculpted garden floor','Sculpted foliage')) and sum(f.normal.z for f in bm.faces)<0:bmesh.ops.reverse_faces(bm,faces=list(bm.faces))
 bm.to_mesh(me);bm.free();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);o.data.materials.append(m)
 for p in me.polygons:p.use_smooth=True
 if sub:
  mod=o.modifiers.new('Artist surface subdivision','SUBSURF');mod.levels=sub;mod.render_levels=sub
 return o
def sweep(name,pts,radii,m,sides=12,sub=1,flute=0):
 vs=[];fs=[]
 for i,p in enumerate(pts):
  tangent=Vector(pts[min(i+1,len(pts)-1)])-Vector(pts[max(0,i-1)]);tangent.normalize(); u=tangent.cross(Vector((0,0,1)))
  if u.length<.01:u=tangent.cross(Vector((1,0,0)))
  u.normalize();v=tangent.cross(u).normalized()
  for j in range(sides):
   a=j*math.tau/sides; r=radii[i]*(1+flute*math.cos(a*5+i*.3)); pos=Vector(p)+r*(math.cos(a)*u+math.sin(a)*v);vs.append(tuple(pos))
  if i:
   for j in range(sides): a=(i-1)*sides+j;b=(i-1)*sides+(j+1)%sides;fs.append((a,b,b+sides,a+sides))
 fs.extend([tuple(reversed(range(sides))),tuple((len(pts)-1)*sides+j for j in range(sides))]);return mesh(name,vs,fs,m,sub)
def rock(name,p,scale,m=stone,seed=0):
 # Deformed geodesic stone, bevel-free erosion; unique material planes.
 bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,radius=1,location=xyz(p));o=bpy.context.object;o.name=name;o.scale=(scale[0],scale[2],scale[1]);o.data.materials.append(m)
 for v in o.data.vertices:
  v.co*=1+.09*math.sin(v.co.x*7+v.co.z*4)*math.cos(v.co.y*9);v.co.z=math.copysign(abs(v.co.z)**.72,v.co.z)
 for poly in o.data.polygons:poly.use_smooth=True
 return o
def slab(name,p,w,d,h,angle=0,m=stone):
 n=8;outline=[]
 for j in range(n):
  a=math.tau*j/n; rr=random.uniform(.92,1.06);x=math.cos(a)*w*.5*rr;z=math.sin(a)*d*.5*rr;outline.append((p[0]+x*math.cos(angle)-z*math.sin(angle),p[2]+x*math.sin(angle)+z*math.cos(angle)))
 vs=[(x,p[1]+y,z) for y in [-h,0] for x,z in outline];fs=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(j,(j+1)%n,(j+1)%n+n,j+n) for j in range(n)]
 o=mesh(name,vs,fs,m);b=o.modifiers.new('Worn limestone arris','BEVEL');b.width=.06;b.segments=3
 return o
