"""Optional CPU reconstruction experiment for ORIGINAL authored source art.
Requires a separate venv and a pinned TripoSR checkout; never runs in the game
or the ordinary build. Outputs geometry/paint plus provenance for art review.
"""
import argparse,sys,types,time,json,subprocess,hashlib
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('image',type=Path);parser.add_argument('output',type=Path);parser.add_argument('--source',type=Path,required=True);parser.add_argument('--resolution',type=int,default=128);parser.add_argument('--model',default='stabilityai/TripoSR');parser.add_argument('--revision',default='5b521936b01fbe1890f6f9baed0254ab6351c04a');parser.add_argument('--scene-code',type=Path);args=parser.parse_args()
import numpy as np
import torch
from PIL import Image
from skimage.measure import marching_cubes
# The upstream helper reverses torchmcubes' ZYX output. Supply that interface
# with skimage's CPU marching cubes, avoiding a CUDA/custom compiler dependency.
def cpu_surface(level,threshold):
 v,f,_,_=marching_cubes(level.detach().cpu().numpy(),level=threshold)
 return torch.from_numpy(v[:,[2,1,0]].copy()),torch.from_numpy(f.astype(np.int64).copy())
mc=types.ModuleType('torchmcubes');mc.marching_cubes=cpu_surface;sys.modules['torchmcubes']=mc
# Sources are RGBA, so no background-removal network is needed or invoked.
sys.modules['rembg']=types.ModuleType('rembg');sys.path.insert(0,str(args.source.resolve()))
from tsr.system import TSR
from tsr.utils import resize_foreground
from huggingface_hub import snapshot_download
torch.set_num_threads(2);torch.set_num_interop_threads(2)
started=time.monotonic();print('Loading reconstruction weights',flush=True)
# Load only tensor state; no pickled arbitrary model classes are required.
load=torch.load
def tensor_load(*a,**kw):
 kw.setdefault('weights_only',True);return load(*a,**kw)
torch.load=tensor_load
model_dir=snapshot_download(args.model,revision=args.revision,allow_patterns=['config.yaml','model.ckpt']);model=TSR.from_pretrained(model_dir,config_name='config.yaml',weight_name='model.ckpt');model.renderer.set_chunk_size(16384);model.eval()
print('Weights ready',round(time.monotonic()-started,2),flush=True)
image=Image.open(args.image).convert('RGBA');image=resize_foreground(image,.85);pixels=np.asarray(image).astype(np.float32)/255.;rgb=pixels[:,:,:3]*pixels[:,:,3:4]+.5*(1-pixels[:,:,3:4]);image=Image.fromarray((rgb*255).astype(np.uint8))
args.output.mkdir(parents=True,exist_ok=True)
with torch.inference_mode():
 print('Inferring original sculpt',flush=True);code=torch.load(args.scene_code,map_location='cpu') if args.scene_code else model([image],device='cpu');torch.save(code,args.output/'scene-code.pt')
 print('Extracting surface',args.resolution,round(time.monotonic()-started,2),flush=True);mesh=model.extract_mesh(code,True,resolution=args.resolution)[0]
np.savez_compressed(args.output/'sculpt.npz',vertices=mesh.vertices,faces=mesh.faces,colors=mesh.visual.vertex_colors)
mesh.export(args.output/'sculpt.ply')
meta={'sourceImage':str(args.image),'method':'TripoSR + CPU scikit-image surface extraction','upstream':'https://github.com/VAST-AI-Research/TripoSR','upstreamCommit':subprocess.check_output(['git','-C',str(args.source.resolve()),'rev-parse','HEAD'],text=True).strip(),'model':args.model,'modelRevision':args.revision,'sourceSHA256':hashlib.sha256(args.image.read_bytes()).hexdigest(),'resolution':args.resolution,'vertices':len(mesh.vertices),'triangles':len(mesh.faces),'seconds':round(time.monotonic()-started,2),'status':'UNREVIEWED original reconstruction; not accepted production art'}
(args.output/'provenance.json').write_text(json.dumps(meta,indent=2)+'\n');print(json.dumps(meta),flush=True)
