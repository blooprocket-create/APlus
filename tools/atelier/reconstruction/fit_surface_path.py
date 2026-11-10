"""Artist-annotated source pixels -> actual 3D surface attachment path.
Uses the calibrated paint camera, raycasts the original reconstruction, then
applies the SAME root pivot/scale as the glTF exporter. No gameplay coordinates.
"""
import argparse,json,math
from pathlib import Path
import numpy as np
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('source',type=Path);p.add_argument('image',type=Path);p.add_argument('--height',type=float,required=True);p.add_argument('--pixels',type=Path,required=True);a=p.parse_args()
raw=np.load(a.source/'sculpt.npz');v=raw['vertices'];tri=v[raw['faces']];paint=np.load(a.source/'uv-sculpt.npz')['vertices'];low=paint.min(axis=0);high=paint.max(axis=0);center=(low+high)*.5;center[:2]=np.median(paint[paint[:,2]<low[2]+(high[2]-low[2])*.15,:2],axis=0);scale=a.height/(high[2]-low[2])
rgba=np.asarray(Image.open(a.image).convert('RGBA'));yy,xx=np.where(rgba[:,:,3]>0);x0,x1,y0,y1=xx.min(),xx.max(),yy.min(),yy.max();square=max(y1-y0,x1-x0);pad=int(square/.85)-square;left=(square-(x1-x0))//2+pad//2;top=(square-(y1-y0))//2+pad//2;size=square+pad
distance,fov,elev,az,tx,ty=json.loads((a.source/'paint-provenance.json').read_text())['camera'];elev,az=np.deg2rad([elev,az]);eye=np.array([math.cos(elev)*math.cos(az),math.cos(elev)*math.sin(az),math.sin(elev)]);right=np.array([-math.sin(az),math.cos(az),0]);up=np.cross(eye,right);origin=eye*distance;e1=tri[:,1]-tri[:,0];e2=tri[:,2]-tri[:,0]
pixels=json.loads(a.pixels.read_text());points=[]
for pixel in pixels:
 u=(pixel[0]-x0+left)/size;py=(pixel[1]-y0+top)/size;direction=-eye+right*((u-.5-tx)*2*math.tan(math.radians(fov)/2))+up*((.5+ty-py)*2*math.tan(math.radians(fov)/2));direction/=np.linalg.norm(direction)
 pv=np.cross(direction,e2);det=np.sum(e1*pv,axis=1);valid=np.abs(det)>1e-8;inv=np.zeros_like(det);inv[valid]=1/det[valid];tv=origin-tri[:,0];bu=np.sum(tv*pv,axis=1)*inv;qv=np.cross(tv,e1);bv=np.sum(direction*qv,axis=1)*inv;t=np.sum(e2*qv,axis=1)*inv;valid&=(bu>=0)&(bv>=0)&(bu+bv<=1)&(t>0)
 if not np.any(valid):raise RuntimeError('Source annotation misses the reconstructed surface: '+str(pixel))
 hit=origin+direction*np.min(t[valid]);points.append([float((hit[1]-center[1])*scale),float((hit[2]-low[2])*scale),float((hit[0]-center[0])*scale)])
(a.source/'flow-path.json').write_text(json.dumps({'schemaVersion':1,'source':'Original annotated empty watercourse; calibrated raycast to this sculpture','height':a.height,'pixels':pixels,'points':points},indent=2)+'\n');print('Original surface attachment path fitted',len(points),flush=True)
