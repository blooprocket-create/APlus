"""Bake original reconstruction paint into UVs and retain source-art fidelity.
Calibrates a real projection camera against the authored alpha silhouette,
z-tests the sculpture, and blends source paint only onto visible surfaces.
The back/occluded regions retain generated 3D paint. No scene billboard.
"""
import argparse,json,math,time
from pathlib import Path
import numpy as np
from PIL import Image
import trimesh,xatlas
from scipy import ndimage,optimize
from skimage.draw import polygon
from material_masks import write_masks
p=argparse.ArgumentParser();p.add_argument('sculpt',type=Path);p.add_argument('image',type=Path);p.add_argument('--size',type=int,default=2048);p.add_argument('--kind',choices=['stone','hero','organic'],default='stone');p.add_argument('--append',action='store_true');p.add_argument('--azimuth',type=float,default=0);p.add_argument('--orthographic',action='store_true');p.add_argument('--view-name',default='front');a=p.parse_args();start=time.monotonic()
d=np.load(a.sculpt/'sculpt.npz');mesh=trimesh.Trimesh(d['vertices'],d['faces'],vertex_colors=d['colors'],process=False)
if mesh.volume<0:mesh.invert()
verts=np.asarray(mesh.vertices);faces=np.asarray(mesh.faces);colors=np.asarray(mesh.visual.vertex_colors)[:,:3]/255
# Same alpha crop/padding convention as the reconstruction conditioning image.
rgba=np.asarray(Image.open(a.image).convert('RGBA'));yy,xx=np.where(rgba[:,:,3]>0);fg=rgba[yy.min():yy.max(),xx.min():xx.max()];s=max(fg.shape[:2]);top=(s-fg.shape[0])//2;left=(s-fg.shape[1])//2
square=np.zeros((s,s,4),np.uint8);square[top:top+fg.shape[0],left:left+fg.shape[1]]=fg
padding=int(s/.85)-s;image=np.pad(square,((padding//2,padding-padding//2),(padding//2,padding-padding//2),(0,0)))
Image.fromarray(image).save(a.sculpt/('projection-'+a.view_name+'-source.png' if a.append else 'projection-source.png'));source_mask=np.asarray(Image.fromarray(image[:,:,3]).resize((128,128)))>128

def project(v,parameters):
 distance,fov,elev,az,tx,ty=parameters;elev,az=np.deg2rad([elev,az]);eye=np.array([math.cos(elev)*math.cos(az),math.cos(elev)*math.sin(az),math.sin(elev)])
 right=np.array([-math.sin(az),math.cos(az),0]);up=np.cross(eye,right);z=distance-v@eye;scale=fov if a.orthographic else 2*math.tan(math.radians(fov)/2)
 if a.orthographic:z_project=np.ones_like(z)
 else:z_project=z
 return np.stack([.5+(v@right)/(z_project*scale)+tx,.5-(v@up)/(z_project*scale)+ty],axis=-1),z,eye

def score(parameters):
 uv,z,_=project(verts,parameters);px=np.floor(uv*128).astype(int);valid=(px[:,0]>=0)&(px[:,0]<128)&(px[:,1]>=0)&(px[:,1]<128)&(z>0)
 mask=np.zeros((128,128),bool);mask[px[valid,1],px[valid,0]]=True;mask=ndimage.binary_fill_holes(ndimage.binary_dilation(mask,iterations=1))
 iou=np.count_nonzero(mask&source_mask)/max(1,np.count_nonzero(mask|source_mask))
 return 1-iou+.000008*(parameters[2]**2+(parameters[3]-a.azimuth)**2)
bounds=[(1.9,2.1) if a.orthographic else (1.7,2.6),(1.0,2.2) if a.orthographic else (30,48),(-15,25),(a.azimuth-12,a.azimuth+12),(-.05,.05),(-.05,.05)]
print('Calibrating original paint projection',flush=True);fit=optimize.differential_evolution(score,bounds,popsize=6,maxiter=12,seed=428,polish=False);parameters=fit.x
print('Projection silhouette error',float(fit.fun),parameters.tolist(),flush=True)
# Rasterizer returns pixel centers and barycentric coordinates in a triangle.
def samples(uv,size):
 q=uv*(size-1);r,c=polygon(q[:,1],q[:,0],shape=(size,size));den=(q[1,1]-q[2,1])*(q[0,0]-q[2,0])+(q[2,0]-q[1,0])*(q[0,1]-q[2,1])
 if abs(den)<1e-8:return r[:0],c[:0],np.zeros((0,3))
 x=(c-q[2,0]);y=(r-q[2,1]);b0=((q[1,1]-q[2,1])*x+(q[2,0]-q[1,0])*y)/den;b1=((q[2,1]-q[0,1])*x+(q[0,0]-q[2,0])*y)/den
 return r,c,np.stack([b0,b1,1-b0-b1],axis=-1)
uv_screen,z_screen,eye=project(verts,parameters);zbuffer=np.full((512,512),np.inf)
for f in faces:
 r,c,w=samples(uv_screen[f],512)
 if len(r):z=np.sum(w*z_screen[f][None,:],axis=-1) if a.orthographic else 1/np.sum(w/z_screen[f][None,:],axis=-1);zbuffer[r,c]=np.minimum(zbuffer[r,c],z)
print('Preparing sculpt UVs',flush=True)
if a.append:
 existing=np.load(a.sculpt/'uv-sculpt.npz');mv=existing['vertices'];indices=existing['faces'];uv=existing['uv'];mn=existing['normals'];mc=None
else:
 mapping,indices,uv=xatlas.parametrize(verts.astype(np.float32),faces.astype(np.uint32));mv=verts[mapping];mc=colors[mapping];mn=np.asarray(mesh.vertex_normals)[mapping]
size=a.size;pos=np.zeros((size,size,3),np.float32);normal=np.zeros_like(pos);rgb=np.zeros_like(pos);mask=np.zeros((size,size),bool)
if a.append:rgb=np.asarray(Image.open(a.sculpt/'albedo.png').convert('RGB').resize((size,size))).astype(np.float32)/255
uv_image=uv.copy();uv_image[:,1]=1-uv_image[:,1]
for f in indices:
 r,c,w=samples(uv_image[f],size)
 if not len(r):continue
 pos[r,c]=w@mv[f];normal[r,c]=w@mn[f];mask[r,c]=True
 if not a.append:rgb[r,c]=w@mc[f]
points=pos[mask];normals=normal[mask];projected,depth,eye=project(points,parameters);h,w=image.shape[:2]
coords=np.stack([projected[:,1]*(h-1),projected[:,0]*(w-1)]);paint=np.stack([ndimage.map_coordinates(image[:,:,ch]/255.,coords,order=1,mode='constant',cval=0) for ch in range(4)],axis=-1)
pixels=np.rint(projected*511).astype(int);inside=(pixels[:,0]>=0)&(pixels[:,0]<512)&(pixels[:,1]>=0)&(pixels[:,1]<512);visible=np.zeros(len(points),bool);visible[inside]=np.abs(depth[inside]-zbuffer[pixels[inside,1],pixels[inside,0]])<.035
view=eye[None,:]*parameters[0]-points;view/=np.maximum(1e-6,np.linalg.norm(view,axis=1,keepdims=True));facing=np.sum(normals*view,axis=1)
# A porous crown has many locally grazing normals within one visible painted
# leaf mass. Preserve its authored brushwork; the z-buffer, rather than a steep
# normal cutoff, is the authority for occlusion. Keep the stricter garment fit.
weight=np.clip((facing+(.05 if a.kind=='organic' else -.06))/(.25 if a.kind=='organic' else .55),0,1)*visible*np.clip((paint[:,3]-.8)/.18,0,1);weight=weight[:,None]
base=rgb[mask];rgb[mask]=(base**2.2*(1-weight)+paint[:,:3]**2.2*weight)**(1/2.2)
# Dilate chart colors so filtering does not produce black seams.
nearest=ndimage.distance_transform_edt(~mask,return_distances=False,return_indices=True);rgb=rgb[nearest[0],nearest[1]]
Image.fromarray(np.uint8(np.clip(rgb,0,1)*255)).save(a.sculpt/'albedo.png')
# Editable material masks derived from the painted palette, never runtime AI.
head_mask=None
if a.kind=='hero':
 position_fill=pos[nearest[0],nearest[1]];head_mask=position_fill[:,:,2]>verts[:,2].min()+np.ptp(verts[:,2])*.77
write_masks(rgb,a.kind,a.sculpt,head_mask)
np.savez_compressed(a.sculpt/'uv-sculpt.npz',vertices=mv,faces=indices,uv=uv,normals=mn)
meta={'source':str(a.image),'view':a.view_name,'cameraModel':'orthographic' if a.orthographic else 'perspective','materialKind':a.kind,'camera':parameters.tolist(),'silhouetteError':float(fit.fun),'textureSize':size,'frontPaintFraction':float(np.mean(weight)),'seconds':round(time.monotonic()-start,2),'status':'UNREVIEWED texture projection; inspect distortion and seams in live renderer'}
(a.sculpt/('paint-'+a.view_name+'-provenance.json' if a.append else 'paint-provenance.json')).write_text(json.dumps(meta,indent=2)+'\n');print(json.dumps(meta),flush=True)
