"""Editable illustrated relief from original UV paint, not downloaded normals.
Reject broad source lighting with a low-pass subtraction, preserve restrained
engraving/bark detail, and suppress gradients at UV chart gutters. This supplies
material relief, not a claim of a high-to-low production sculpture bake.
"""
import argparse,json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage
from skimage.draw import polygon
p=argparse.ArgumentParser();p.add_argument('source',type=Path);p.add_argument('--strength',type=float,default=7);a=p.parse_args()
rgb=np.asarray(Image.open(a.source/'albedo.png').convert('RGB')).astype(np.float32)/255;h,w=rgb.shape[:2]
d=np.load(a.source/'uv-sculpt.npz');uv=d['uv'].copy();uv[:,1]=1-uv[:,1];uv*=np.array([w-1,h-1]);mask=np.zeros((h,w),bool)
for f in d['faces']:
 r,c=polygon(uv[f,1],uv[f,0],shape=mask.shape);mask[r,c]=True
luma=rgb@np.array([.2126,.7152,.0722]);height=ndimage.gaussian_filter(luma-ndimage.gaussian_filter(luma,5),.7)
dy,dx=np.gradient(height);gate=np.clip((ndimage.distance_transform_edt(mask)-2)/3,0,1)
normal=np.stack([-dx*a.strength*gate,dy*a.strength*gate,np.ones_like(dx)],axis=-1);normal/=np.linalg.norm(normal,axis=-1,keepdims=True)
Image.fromarray(np.uint8(np.clip(normal*.5+.5,0,1)*255)).save(a.source/'normal.png')
(a.source/'relief-provenance.json').write_text(json.dumps({'source':'Original calibrated albedo.png and UV chart mask','method':'Illustrated high-frequency relief; broad lighting removed; chart-gutter suppression','strength':a.strength,'textureSize':[w,h],'limitation':'Material suggestion, not recovered physical depth or a sculpt-normal bake'},indent=2)+'\n')
print('Original illustrated relief baked',a.source,flush=True)
