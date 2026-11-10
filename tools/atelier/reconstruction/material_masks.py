"""Editable palette masks for original paint; independent of reconstruction.
Conservative warm-metal selection avoids treating ivory limestone as brass.
"""
import numpy as np
from PIL import Image

def write_masks(rgb,kind,output,head_mask=None):
 r,g,b=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2];gold=(r>b*1.38)&(g>b*1.12)&(r>g*.96);gem=(g>r*1.5)&(b>r*1.4)&((np.maximum(g,b)-r)>.19)
 if kind=='stone':gold&=(r>b*1.6)&((r-g)>.08)
 if kind=='organic':gold[:]=False;gem[:]=False
 if kind=='hero':
  gold&=r>b*1.75
  if head_mask is not None:gold[head_mask]=False
 orm=np.ones_like(rgb);orm[:,:,1]=np.where(gem,.25,np.where(gold,.40,.94 if kind=='organic' else .78 if kind=='hero' else .82));orm[:,:,2]=np.where(gold,.72,0)
 Image.fromarray(np.uint8(np.clip(orm,0,1)*255)).save(output/'orm.png')
 emission=rgb*gem[:,:,None]*(.16 if kind=='hero' else 1.)
 if kind=='organic':emission=rgb*((g>r*.90)&(g>b*1.05))[:,:,None]*.12
 Image.fromarray(np.uint8(np.clip(emission,0,1)*255)).save(output/'emission.png')

if __name__=='__main__':
 import argparse,json,hashlib
 from pathlib import Path
 p=argparse.ArgumentParser();p.add_argument('source',type=Path);p.add_argument('--kind',choices=['stone','organic'],required=True);a=p.parse_args()
 rgb=np.asarray(Image.open(a.source/'albedo.png').convert('RGB')).astype(np.float32)/255;write_masks(rgb,a.kind,a.source)
 (a.source/'material-mask-provenance.json').write_text(json.dumps({'source':'Original calibrated UV paint','sourceSHA256':hashlib.sha256((a.source/'albedo.png').read_bytes()).hexdigest(),'kind':a.kind,'method':'Conservative palette masks: warm ivory excluded from brass; original gem palette only for emission'},indent=2)+'\n')
 print('Original material masks authored',a.source,flush=True)
