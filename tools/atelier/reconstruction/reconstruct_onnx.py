"""Experimental higher-fidelity ORIGINAL sculpt generation with TripoSG/ORT.
Neural weights are tools, never game assets. All inference is local. Tensor data
is streamed into external ORT initializers in RAM, so large float16 checkpoints
do not require a second multi-GB disk copy. CPU arithmetic defaults to float32. Components
are staged/evicted; ordinary game builds and authored-asset exports use none of it.
"""
import argparse,gc,hashlib,json,math,time
from pathlib import Path
import numpy as np
from PIL import Image
import onnx,onnxruntime as ort,requests,trimesh
from onnx import TensorProto as T,numpy_helper
from scipy import ndimage
from skimage.measure import marching_cubes

REPO='cgb/triposg-onnx-webgpu';REVISION='4db41a2fec8b5785e3f7ec721a2c4b703943b57c'
PARENT='VAST-AI/TripoSG';PARENT_REVISION='2c1c516d22d58db486a058d98d31bb6177344e06'
GRAPHS={'encode':'triposg_image_encoder_q8.onnx','denoise':'triposg_dit_step_fp16.onnx','latents':'triposg_vae_latents_q8.onnx','surface':'triposg_vae_decoder.onnx'}
p=argparse.ArgumentParser();p.add_argument('image',type=Path);p.add_argument('output',type=Path);p.add_argument('--cache',type=Path,default=Path('/tmp/astral-triposg-onnx'));p.add_argument('--stage',choices=['encode','denoise','surface','all'],default='all');p.add_argument('--steps',type=int,default=50);p.add_argument('--resolution',type=int,default=192);p.add_argument('--coarse',type=int,default=64);p.add_argument('--seed',type=int,default=42);p.add_argument('--quantize-dense',action='store_true');p.add_argument('--stream-half-weights',action='store_true');p.add_argument('--benchmark',action='store_true');p.add_argument('--resume',action='store_true');p.add_argument('--surface-point-budget',type=int,default=0);a=p.parse_args();a.cache.mkdir(parents=True,exist_ok=True);a.output.mkdir(parents=True,exist_ok=True)
if a.quantize_dense and a.stream_half_weights:raise RuntimeError('Choose the experimental int8 path or original-weight streaming, not both')
started=time.monotonic()
if list(a.output.glob('*.blend')):raise RuntimeError('Reviewed editable sources exist here; reconstruct into a fresh candidate directory')

def url(name):return f'https://huggingface.co/{REPO}/resolve/{REVISION}/{name}'
metadata_path=a.cache/'source-manifest.json'
if not metadata_path.exists():
 r=requests.get(f'https://huggingface.co/api/models/{REPO}/revision/{REVISION}?blobs=true',timeout=60);r.raise_for_status();metadata_path.write_text(json.dumps(r.json()))
metadata=json.loads(metadata_path.read_text());files={f['rfilename']:f for f in metadata['siblings']}

def digest(data):return hashlib.sha256(data).hexdigest()
def graph_file(name):
 path=a.cache/name;expected=files[name].get('lfs',{}).get('sha256')
 if path.exists() and (not expected or digest(path.read_bytes())==expected):return path
 r=requests.get(url(name),timeout=(30,120));r.raise_for_status();data=r.content
 if expected and digest(data)!=expected:raise RuntimeError('Graph checksum mismatch '+name)
 path.write_bytes(data);return path

class TensorStream:
 def __init__(self,name):
  if Path(name).name!=name or name not in files:raise RuntimeError('Unexpected external tensor file')
  self.name=name;self.saved=a.cache/name;self.pending=a.cache/(name+'.part');self.cache_writer=None
  if self.saved.exists():
   self.response=self.saved.open('rb');self.chunks=iter(lambda:self.response.read(8*1024*1024),b'')
  else:
   self.response=requests.get(url(name),stream=True,timeout=(30,120));self.response.raise_for_status();self.chunks=self.response.iter_content(8*1024*1024)
   if name=='triposg_dit_step_fp16.onnx.data':self.cache_writer=self.pending.open('wb')
  self.buffer=bytearray();self.position=0;self.received=0;self.hash=hashlib.sha256();self.report=0
 def read(self,n):
  while len(self.buffer)<n:
   chunk=next(self.chunks);self.buffer.extend(chunk);self.hash.update(chunk);self.received+=len(chunk)
   if self.cache_writer:self.cache_writer.write(chunk)
   if self.received-self.report>=128*1024*1024:self.report=self.received;print('Tool tensors received',self.name,round(self.received/1048576),'MiB',flush=True)
  out=bytes(self.buffer[:n]);del self.buffer[:n];self.position+=n;return out
 def finish(self):
  for chunk in self.chunks:
   self.hash.update(chunk);self.received+=len(chunk)
   if self.cache_writer:self.cache_writer.write(chunk)
  self.response.close();expected=files[self.name].get('lfs',{})
  if self.cache_writer:self.cache_writer.close()
  if self.received!=expected.get('size',self.received) or self.hash.hexdigest()!=expected.get('sha256',self.hash.hexdigest()):
   if self.pending.exists():self.pending.unlink()
   raise RuntimeError('Tensor checksum mismatch '+self.name)
  if self.cache_writer:self.pending.replace(self.saved)
  self.buffer.clear();print('Verified tensor stream',self.name,flush=True)

def float32_tensor(t):
 if t.data_type==T.FLOAT16 and t.data_location!=T.EXTERNAL:
  value=numpy_helper.to_array(t).astype(np.float32);name=t.name;t.CopyFrom(numpy_helper.from_array(value,name))

def convert_graph(graph):
 for value in [*graph.input,*graph.output,*graph.value_info]:
  if value.type.HasField('tensor_type') and value.type.tensor_type.elem_type==T.FLOAT16:value.type.tensor_type.elem_type=T.FLOAT
 for t in graph.initializer:float32_tensor(t)
 for node in graph.node:
  for attribute in node.attribute:
   if node.op_type=='Cast' and attribute.name=='to' and attribute.i==T.FLOAT16:attribute.i=T.FLOAT
   if attribute.type==onnx.AttributeProto.TENSOR:float32_tensor(attribute.t)
   elif attribute.type==onnx.AttributeProto.GRAPH:convert_graph(attribute.g)

def quantize_dense(model,names,arrays):
 """Optional dynamic int8 dense layers; floating-point attention stays intact."""
 initializers={t.name:t for t in model.graph.initializer};indices={name:i for i,name in enumerate(names)};consumers={}
 for node in model.graph.node:
  for name in node.input:consumers.setdefault(name,[]).append(node)
 replacements={};nodes=[]
 for node in model.graph.node:
  weight=node.input[1] if node.op_type=='MatMul' else None
  eligible=weight in indices and arrays[indices[weight]].ndim==2 and all(n.op_type=='MatMul' and n.input[1]==weight for n in consumers[weight])
  if not eligible:nodes.append(node);continue
  if weight not in replacements:
   index=indices[weight];values=arrays[index];scales=np.maximum(np.max(np.abs(values),axis=0)/127,1e-8).astype(np.float32);arrays[index]=np.clip(np.rint(values/scales),-127,127).astype(np.int8)
   tensor=initializers[weight];tensor.data_type=T.INT8
   for entry in tensor.external_data:
    if entry.key=='length':entry.value=str(arrays[index].nbytes)
   scale_name=weight+'_q8_scale';zero_name=weight+'_q8_zero';model.graph.initializer.extend([numpy_helper.from_array(scales,scale_name),numpy_helper.from_array(np.array(0,np.int8),zero_name)]);replacements[weight]=(scale_name,zero_name)
  scale_name,zero_name=replacements[weight];base=node.name+'_q8';qa,sa,za,integer,cast,scale=[base+s for s in ['_a','_as','_az','_integer','_float','_scale']]
  nodes.extend([onnx.helper.make_node('DynamicQuantizeLinear',[node.input[0]],[qa,sa,za],name=base+'_quantize'),onnx.helper.make_node('MatMulInteger',[qa,weight,za,zero_name],[integer],name=base+'_matmul'),onnx.helper.make_node('Cast',[integer],[cast],to=T.FLOAT,name=base+'_cast'),onnx.helper.make_node('Mul',[sa,scale_name],[scale],name=base+'_rescale'),onnx.helper.make_node('Mul',[cast,scale],list(node.output),name=base+'_output')])
 del model.graph.node[:];model.graph.node.extend(nodes);print('Experimental int8 dense weights',len(replacements),flush=True)

def stream_original_weights(model):
 """Retain original F16 storage; cast each weight immediately before use.
 All arithmetic remains the same F32 graph. Prepending all casts would keep
 every expanded weight live and defeat the memory saving, so preserve order.
 """
 descriptors={t.name:t for t in model.graph.initializer if t.data_type==T.FLOAT16};half=set(descriptors)
 for value in [*model.graph.input,*model.graph.value_info]:
  if value.name in half:value.type.tensor_type.elem_type=T.FLOAT16
 converted={};nodes=[];zero_name='astral_stream_zero_f32';model.graph.initializer.append(numpy_helper.from_array(np.array(0,np.float32),zero_name))
 for node in model.graph.node:
  for index,name in enumerate(node.input):
   if name not in half:continue
   if name not in converted:
    target=name+'_original_weight_f32';cast_input=name
    if node.op_type=='MatMul' and index==1:
     # ORT may topologically schedule independent constant casts eagerly even
     # when they appear beside their consumer. Tie the reshape/cast to this
     # layer's actual activation so only the current expanded weight is live.
     # The dynamic shape offset is exactly zero for finite model activations.
     summed,zfloat,zint,shape,view=[target+s for s in ['_sum','_zero','_zero_i64','_shape','_view']];dims=target+'_dims'
     model.graph.initializer.append(numpy_helper.from_array(np.array(descriptors[name].dims,np.int64),dims))
     nodes.extend([onnx.helper.make_node('ReduceSum',[node.input[0]],[summed],keepdims=0),onnx.helper.make_node('Mul',[summed,zero_name],[zfloat]),onnx.helper.make_node('Cast',[zfloat],[zint],to=T.INT64),onnx.helper.make_node('Add',[dims,zint],[shape]),onnx.helper.make_node('Reshape',[name,shape],[view])]);cast_input=view
    nodes.append(onnx.helper.make_node('Cast',[cast_input],[target],to=T.FLOAT,name=target+'_cast'));converted[name]=target
   node.input[index]=converted[name]
  nodes.append(node)
 del model.graph.node[:];model.graph.node.extend(nodes);print('Original half-storage weights / F32 computation',len(converted),flush=True)

class Component:
 def __init__(self,stage):
  print('Loading CPU tool component',stage,flush=True);path=graph_file(GRAPHS[stage]);model=onnx.load(path,load_external_data=False);self.arrays=[];self.values=[];names=[];external={}
  for tensor in model.graph.initializer:
   if tensor.data_location==T.EXTERNAL:
    info={v.key:v.value for v in tensor.external_data};external.setdefault(info['location'],[]).append((int(info.get('offset','0')),int(info['length']),tensor))
  for filename,items in external.items():
   stream=TensorStream(filename)
   for offset,length,tensor in sorted(items,key=lambda item:item[0]):
    if offset<stream.position:raise RuntimeError('Overlapping external tensors are not supported')
    if offset>stream.position:stream.read(offset-stream.position)
    raw=stream.read(length);dtype=onnx.helper.tensor_dtype_to_np_dtype(tensor.data_type);array=np.frombuffer(raw,dtype=dtype).reshape(tuple(tensor.dims))
    if tensor.data_type==T.FLOAT16 and not (a.stream_half_weights and stage=='denoise'):
     array=array.astype(np.float32);tensor.data_type=T.FLOAT
     for entry in tensor.external_data:
      if entry.key=='length':entry.value=str(array.nbytes)
    self.arrays.append(array);names.append(tensor.name)
   stream.finish()
  convert_graph(model.graph)
  if a.quantize_dense and stage=='denoise':quantize_dense(model,names,self.arrays)
  if a.stream_half_weights and stage=='denoise':stream_original_weights(model)
  self.values=[ort.OrtValue.ortvalue_from_numpy(array) for array in self.arrays]
  cpu_path=a.cache/('cpu-'+('stream-f32-' if a.stream_half_weights else 'q8-' if a.quantize_dense else 'f32-')+GRAPHS[stage]);cpu_path.write_bytes(model.SerializeToString())
  options=ort.SessionOptions();options.intra_op_num_threads=2;options.inter_op_num_threads=1;options.enable_cpu_mem_arena=False;options.enable_mem_pattern=False;options.graph_optimization_level=ort.GraphOptimizationLevel.ORT_DISABLE_ALL;options.add_session_config_entry('session.disable_prepacking','1')
  # add_external_initializers copies into the model proto and can double a
  # multi-GB checkpoint. add_initializer explicitly shares caller-owned CPU
  # OrtValues instead; keep arrays/values alive until the session is closed.
  for name,value in zip(names,self.values):options.add_initializer(name,value)
  self.session=ort.InferenceSession(str(cpu_path),sess_options=options,providers=['CPUExecutionProvider'])
  print('CPU component ready',stage,[(i.name,i.shape,i.type) for i in self.session.get_inputs()],flush=True)
 def run(self,inputs):return self.session.run(None,inputs)
 def close(self):
  self.session=None;self.values.clear();self.arrays.clear();gc.collect()

def encode():
 image=Image.open(a.image).convert('RGBA');alpha=np.asarray(image)[:,:,3];yy,xx=np.where(alpha>0);crop=image.crop((int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1)));size=math.ceil(max(crop.size)*1.20);white=Image.new('RGBA',(size,size),(255,255,255,255));white.alpha_composite(crop,((size-crop.width)//2,(size-crop.height)//2));image=white.convert('RGB').resize((256,256),Image.Resampling.BICUBIC).crop((16,16,240,240));image.save(a.output/'conditioning.png');pixels=np.asarray(image).astype(np.float32).transpose(2,0,1)[None]/255
 component=Component('encode');embedding=component.run({component.session.get_inputs()[0].name:pixels})[0];np.save(a.output/'embedding.npy',embedding);component.close();print('Original source encoded',embedding.shape,flush=True)

def denoise():
 embedding=np.load(a.output/'embedding.npy').astype(np.float32);latents=np.random.default_rng(a.seed).standard_normal((1,2048,64)).astype(np.float32);first=0;precision='f32/original-half-storage' if a.stream_half_weights else 'dynamic-int8-dense/f32-attention' if a.quantize_dense else 'f32'
 if a.resume:
  checkpoint=np.load(a.output/'checkpoint.npz')
  if a.benchmark or int(checkpoint['steps'])!=a.steps or int(checkpoint['seed'])!=a.seed or str(checkpoint['precision'])!=precision:raise RuntimeError('Resume settings do not match the original sampling run')
  latents=checkpoint['latents'].astype(np.float32);first=int(checkpoint['completedSteps'])
  if not np.isfinite(latents).all() or latents.shape!=(1,2048,64) or first<0 or first>a.steps:raise RuntimeError('Invalid sampling checkpoint')
  print('Resuming original sculpt after step',first,flush=True)
 component=Component('denoise');inputs=component.session.get_inputs()
 def velocity(context,timestep):
  feed={}
  for item in inputs:
   rank=len(item.shape)
   if rank==3 and item.shape[-1]==64:feed[item.name]=latents
   elif rank==3:feed[item.name]=context
   else:feed[item.name]=np.asarray(timestep,dtype=np.float32) if rank==0 else np.array([timestep],np.float32)
  return component.run(feed)[0].astype(np.float32)
 if a.benchmark:
  tick=time.monotonic();unconditional=velocity(np.zeros_like(embedding),1000);conditional=velocity(embedding,1000);np.savez_compressed(a.output/'velocity-benchmark.npz',unconditional=unconditional,conditional=conditional);print('Velocity benchmark seconds',round(time.monotonic()-tick,2),flush=True);component.close();return
 for i in range(first,a.steps):
  tick=time.monotonic();sigma=1-i/a.steps;unconditional=velocity(np.zeros_like(embedding),1000*sigma);conditional=velocity(embedding,1000*sigma);latents+=(unconditional+7*(conditional-unconditional))/a.steps
  if not np.isfinite(latents).all():raise RuntimeError('Non-finite original sculpt latents')
  np.savez_compressed(a.output/'checkpoint.tmp.npz',latents=latents,completedSteps=i+1,steps=a.steps,seed=a.seed,precision=precision);(a.output/'checkpoint.tmp.npz').replace(a.output/'checkpoint.npz')
  np.save(a.output/'latents.npy',latents);(a.output/'sampling.json').write_text(json.dumps({'steps':a.steps,'completedSteps':i+1,'seed':a.seed,'precision':precision,'elapsedSeconds':round(time.monotonic()-started,2)},indent=2)+'\n');print('Original sculpt denoise',i+1,'/',a.steps,'seconds',round(time.monotonic()-tick,2),flush=True)
 component.close()

def surface():
 sampling=json.loads((a.output/'sampling.json').read_text())
 if sampling['completedSteps']!=sampling['steps']:raise RuntimeError('Incomplete denoising; preserve as an experiment, not a finished sculpture')
 if (a.output/'checkpoint.npz').exists():
  checkpoint=np.load(a.output/'checkpoint.npz')
  if int(checkpoint['completedSteps'])!=int(checkpoint['steps']) or int(checkpoint['steps'])!=sampling['steps']:raise RuntimeError('Checkpoint and completed sampling evidence disagree')
  latents=checkpoint['latents'].astype(np.float32)
 else:latents=np.load(a.output/'latents.npy').astype(np.float32)
 latent_hash=digest(latents.tobytes());cache_path=a.output/'vae-cache.npz';cache=None
 if cache_path.exists():
  saved=np.load(cache_path)
  if str(saved['latentSHA256'])==latent_hash and str(saved['exportRevision'])==REVISION:cache=[saved['cache'+str(i)] for i in range(int(saved['count']))]
 if cache is None:
  component=Component('latents');cache=component.run({component.session.get_inputs()[0].name:latents});component.close();np.savez_compressed(cache_path,latentSHA256=latent_hash,exportRevision=REVISION,count=len(cache),**{'cache'+str(i):v for i,v in enumerate(cache)})
 decoder=Component('surface');inputs=decoder.session.get_inputs();point_input=next(i for i in inputs if i.shape[-1]==3);others=[i for i in inputs if i.name!=point_input.name]
 if len(others)!=len(cache):raise RuntimeError('VAE cache handoff mismatch')
 base={item.name:value for item,value in zip(others,cache)}
 consumed=0
 def field(points):
  nonlocal consumed
  points=points.astype(np.float32);key=digest((latent_hash+REVISION).encode()+points.tobytes());prefix=a.output/('field-'+key[:20]);data_path=prefix.with_suffix('.npy');state_path=prefix.with_suffix('.json');completed=0
  if data_path.exists() and state_path.exists():
   state=json.loads(state_path.read_text())
   if state['key']!=key or state['count']!=len(points):raise RuntimeError('Surface cache metadata mismatch')
   result=np.lib.format.open_memmap(data_path,mode='r+');completed=state['completed']
   if result.shape!=(len(points),):raise RuntimeError('Surface cache shape mismatch')
  else:result=np.lib.format.open_memmap(data_path,mode='w+',dtype=np.float32,shape=(len(points),))
  if completed:print('Resuming surface samples',completed,'/',len(points),flush=True)
  for i in range(completed,len(points),8192):
   if a.surface_point_budget and consumed>=a.surface_point_budget:
    print('Surface checkpoint saved; rerun the same extraction command to continue',flush=True);raise SystemExit(3)
   block=points[i:i+8192];feed={**base,point_input.name:block[None] if len(point_input.shape)==3 else block};values=decoder.run(feed)[0].reshape(-1)
   if not np.isfinite(values).all():raise RuntimeError('Non-finite generated surface')
   result[i:i+len(block)]=values;result.flush();consumed+=len(block)
   temporary=prefix.with_suffix('.next.json');temporary.write_text(json.dumps({'key':key,'count':len(points),'completed':i+len(block)}));temporary.replace(state_path)
   if (i//8192)%16==15:print('Surface samples saved',i+len(block),'/',len(points),flush=True)
  return np.asarray(result)
 bound=1.005;n=a.coarse;axis=np.linspace(-bound,bound,n,dtype=np.float32);points=np.stack(np.meshgrid(axis,axis,axis,indexing='ij'),axis=-1).reshape(-1,3);coarse=field(points).reshape(n,n,n);print('SDF range',float(coarse.min()),float(coarse.max()),'inside fraction',float(np.mean(coarse<0)),flush=True)
 if coarse.min()>=0 or coarse.max()<=0:raise RuntimeError('Generated field has no original surface')
 positive=coarse>0;change=np.zeros_like(positive)
 for dimension in range(3):change|=positive!=np.roll(positive,1,axis=dimension);change|=positive!=np.roll(positive,-1,axis=dimension)
 # Thin cloth can lie between every coarse sample without a sign crossing.
 # Preserve the model's near-zero band as well, matching the upstream flash
 # extractor's abs(logits)<.95 candidate rule rather than clipping that cloth.
 mask=ndimage.binary_dilation(change|(np.abs(coarse)<.95),iterations=2);factor=a.resolution/n;dense=ndimage.zoom(coarse,factor,order=1);mask=ndimage.zoom(mask.astype(np.uint8),factor,order=0)>0;indices=np.column_stack(np.nonzero(mask));coords=indices.astype(np.float32)/(a.resolution-1)*(2*bound)-bound
 print('Refining original surface samples',len(coords),flush=True);dense[mask]=field(coords);decoder.close();np.savez_compressed(a.output/'surface-field.npz',sdf=dense,bound=bound)
 vertices,faces,_,_=marching_cubes(-dense,level=0);vertices=vertices/(a.resolution-1)*(2*bound)-bound;mesh=trimesh.Trimesh(vertices,faces,process=False)
 if mesh.volume<0:mesh.invert()
 # Common source coordinates expected by the existing paint/fit tools: X front,
 # Y right, Z up. Preserve the original model's geometry, normalized to 1.6 high.
 vertices=np.asarray(mesh.vertices)[:,[2,0,1]];vertices*=1.6/np.ptp(vertices[:,2]);colors=np.full((len(vertices),4),190,np.uint8);colors[:,3]=255
 np.savez_compressed(a.output/'sculpt.npz',vertices=vertices,faces=np.asarray(mesh.faces),colors=colors)
 meta={'sourceImage':str(a.image),'sourceSHA256':digest(a.image.read_bytes()),'method':'TripoSG via CPU ONNX, streamed shared initializers; original paint authored separately','model':PARENT,'modelRevision':PARENT_REVISION,'export':REPO,'exportRevision':REVISION,'license':'MIT; DINOv2 encoder Apache-2.0','steps':sampling['steps'],'seed':sampling['seed'],'rng':'NumPy PCG64','denoisePrecision':sampling.get('precision','f32'),'coarse':a.coarse,'resolution':a.resolution,'vertices':len(vertices),'triangles':len(mesh.faces),'seconds':round(time.monotonic()-started,2),'status':'UNREVIEWED original sculpture; compare actual live renderer before adoption'};(a.output/'provenance.json').write_text(json.dumps(meta,indent=2)+'\n');print(json.dumps(meta),flush=True)

if a.stage in ['encode','all']:encode()
if a.stage in ['denoise','all']:denoise()
if a.stage in ['surface','all']:surface()
