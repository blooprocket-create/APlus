/** Asset handoff gates: embedded originals, fitted joints, non-empty surfaces.
 * This validates integrity and production contracts, never artistic quality. */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const required=['Hips','Coat','Head','Hair','Weapon','UpperArm.L','UpperArm.R','Forearm.L','Forearm.R','Shin.L','Shin.R','ShoulderPlate.L','ShoulderPlate.R','Foot.L','Foot.R'];
const manifest={schemaVersion:1,artDirection:'proposed / isolated visual target',assets:[]};
for(const name of ['garden.glb','celestia.glb','keeper.glb','keeper-sculpt.glb','celestia-sculpt.glb','elder-tree.glb','elder-tree-porous.glb','moon-gate.glb','riven-cliff.glb']){
 const bytes=readFileSync('public/art/observatory/'+name);
 if(bytes.readUInt32LE(0)!==0x46546c67||bytes.readUInt32LE(4)!==2)throw Error('Invalid glTF: '+name);
 const doc=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
 if(!doc.buffers?.length||!doc.meshes?.length||!doc.materials?.length)throw Error('Empty art: '+name);
 if(doc.buffers.some(b=>b.uri)||doc.images?.some(i=>i.uri))throw Error('Untracked external asset: '+name);
 if(!doc.meshes.length||!doc.materials.length)throw Error('Empty art: '+name);
 if(name==='celestia-sculpt.glb'){
  const valid=new Set(['Hips','Head','Hair','Coat','Coat.Hem',...['L','R'].flatMap(s=>['UpperArm','Forearm','Elbow','Thigh','Shin','Knee','Foot'].map(n=>n+'.'+s))]);
  if(doc.skins?.length!==1||doc.skins[0].joints.some(j=>!valid.has(doc.nodes[j].name)))throw Error('Sculpt violates canonical skin ownership');
  const start=20+bytes.readUInt32LE(12)+8;
  for(const mesh of doc.meshes)for(const p of mesh.primitives){
   if(['TEXCOORD_0','JOINTS_0','WEIGHTS_0'].some(n=>p.attributes[n]===undefined)||p.targets?.length!==7)throw Error('Missing sculpture UV/skin/expressions');
   const wa=doc.accessors[p.attributes.WEIGHTS_0],wv=doc.bufferViews[wa.bufferView];
   const ja=doc.accessors[p.attributes.JOINTS_0],jv=doc.bufferViews[ja.bufferView];
   for(let i=0;i<wa.count;i++){let sum=0;for(let c=0;c<4;c++){
    const w=bytes.readFloatLE(start+(wv.byteOffset??0)+(wa.byteOffset??0)+i*(wv.byteStride??16)+c*4);
    const offset=start+(jv.byteOffset??0)+(ja.byteOffset??0)+i*(jv.byteStride??(ja.componentType===5121?4:8))+c*(ja.componentType===5121?1:2);
    const joint=ja.componentType===5121?bytes.readUInt8(offset):bytes.readUInt16LE(offset);
    if(!Number.isFinite(w)||w<0||joint>=doc.skins[0].joints.length)throw Error('Invalid fitted skin influence');sum+=w;
   }if(Math.abs(sum-1)>.001)throw Error('Unnormalized fitted skin');}
  }
 }
 if(name==='celestia.glb'){
  const joints=doc.nodes.filter(n=>n.name?.startsWith('attach__')).map(n=>n.name.slice(8));
  for(const r of required)if(!joints.includes(r))throw Error('Missing animation fitting: '+r);
  const face=doc.meshes.find(m=>m.extras?.targetNames?.includes('SpeakOpen'));
  if(!face||!['Blink','Focus','Concern','Gaze','SpeakOpen','SpeakWide','SpeakRound'].every(n=>face.extras.targetNames.includes(n)))throw Error('Missing sculpt performance shapes');
  for(const mesh of doc.meshes)for(const p of mesh.primitives){
   if(doc.materials[p.material].name.startsWith('Couture')&&p.attributes.TEXCOORD_0===undefined)throw Error('Missing couture grain/embroidery UV: '+mesh.name);
  }
 }
 if(name==='garden.glb'){
  const binary=20+bytes.readUInt32LE(12)+8;
  for(const mesh of doc.meshes.filter(m=>m.name.startsWith('Eroded ravine')))for(const p of mesh.primitives){
   const a=doc.accessors[p.attributes.NORMAL],v=doc.bufferViews[a.bufferView];let z=0;
   for(let i=0;i<a.count;i++)z+=bytes.readFloatLE(binary+(v.byteOffset??0)+(a.byteOffset??0)+i*(v.byteStride??12)+8);
   if(z/a.count<.2)throw Error('Ravine patch faces away from the art stage');
  }
  if(!doc.meshes.some(m=>m.primitives.some(p=>p.attributes.COLOR_0!==undefined)))throw Error('Missing baked sculpture occlusion');
 }
 if(name==='riven-cliff.glb'){
  const flow=JSON.parse(readFileSync('public/art/observatory/riven-cliff-flow.json')),p=doc.accessors[doc.meshes[0].primitives[0].attributes.POSITION];
  if(flow.schemaVersion!==1||flow.points.length!==12||flow.points.some(v=>v.length!==3||v.some((x,i)=>!Number.isFinite(x)||x<p.min[i]-.1||x>p.max[i]+.1)))throw Error('Surface flow does not fit the original vista sculpture');
 }
 manifest.assets.push({name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),meshes:doc.meshes.length,materials:doc.materials.length});
}
const portraitBytes=readFileSync('public/art/observatory/portrait.json');
const portrait=JSON.parse(portraitBytes);
if(portrait.schemaVersion!==1||portrait.depth.length!==portrait.nx*portrait.ny||!portrait.depth.every(Number.isFinite))throw Error('Invalid sculpt-fitting surface');
manifest.assets.push({name:'portrait.json',bytes:portraitBytes.length,sha256:createHash('sha256').update(portraitBytes).digest('hex'),source:'Front-surface samples from original landmark sculpt; drives eye/lid fitting'});
for(const name of ['pigments.png','couture.png','leaves.png','face.png','sky.png','energy.png','hero-source-paint.png']){
const png=readFileSync('public/art/observatory/'+name);
manifest.assets.push({name,bytes:png.length,sha256:createHash('sha256').update(png).digest('hex'),source:name==='hero-source-paint.png'?'Original front paint; calibrated reference on the 3D face surface for gaze/blink, never a scene billboard':'Original generated albedo/flow source; prompt and use documented in docs/OBSERVATORY_ATELIER.md'});
}
const fitBytes=readFileSync('public/art/observatory/celestia-sculpt-fit.json'),fit=JSON.parse(fitBytes);
if(fit.schemaVersion!==1||fit.sourceProjection.length!==16||!fit.sourceProjection.every(Number.isFinite)||!['Hips','Head','Foot.L','Foot.R','Weapon.L','Weapon'].every(n=>fit.restOffsets[n]?.length===3&&fit.restOffsets[n].every(Number.isFinite)))throw Error('Invalid original sculpture fitting metadata');
manifest.assets.push({name:'celestia-sculpt-fit.json',bytes:fitBytes.length,sha256:createHash('sha256').update(fitBytes).digest('hex'),source:'Reviewed original sculpt proportions; existing canonical skeleton and animator retain ownership'});
const flowBytes=readFileSync('public/art/observatory/riven-cliff-flow.json');manifest.assets.push({name:'riven-cliff-flow.json',bytes:flowBytes.length,sha256:createHash('sha256').update(flowBytes).digest('hex'),source:'Original annotated pixels ray-fitted to sculpture; visual watercourse only, never gameplay navigation'});
const performanceBytes=readFileSync('src/data/observatoryAbility.json');
const performance=JSON.parse(performanceBytes),canonical=JSON.parse(readFileSync('src/data/heroAnimationClips.json'));
if(JSON.stringify(performance.joints)!==JSON.stringify(canonical.joints)||JSON.stringify(performance.castingJoints)!==JSON.stringify(canonical.castingJoints))throw Error('Art performance violates canonical joint order');
const packed=Buffer.from(performance.clip.samples,'base64'),frameSize=3+4*(performance.joints.length+performance.castingJoints.length);
if(packed.length%(frameSize*2)||performance.clip.release<=0||performance.clip.release>=1)throw Error('Invalid art performance span/release');
manifest.assets.push({name:'observatoryAbility.json',bytes:performanceBytes.length,sha256:createHash('sha256').update(performanceBytes).digest('hex'),source:'Bundled src/data module, original Blender action on canonical rig'});
if(process.argv.includes('--write'))writeFileSync('public/art/observatory/manifest.json',JSON.stringify(manifest,null,2)+'\n');
else {const checked=JSON.parse(readFileSync('public/art/observatory/manifest.json','utf8'));if(JSON.stringify(checked)!==JSON.stringify(manifest))throw Error('Asset manifest drift; inspect changes and run art:manifest');}
console.log(JSON.stringify(manifest,null,2));
