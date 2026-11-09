/** Asset handoff gates: embedded originals, fitted joints, non-empty surfaces.
 * This validates integrity and production contracts, never artistic quality. */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const required=['Hips','Coat','Head','Hair','Weapon','UpperArm.L','UpperArm.R','Forearm.L','Forearm.R','Shin.L','Shin.R','ShoulderPlate.L','ShoulderPlate.R'];
const manifest={schemaVersion:1,artDirection:'proposed / isolated visual target',assets:[]};
for(const name of ['garden.glb','celestia.glb','keeper.glb']){
 const bytes=readFileSync('public/art/observatory/'+name);
 if(bytes.readUInt32LE(0)!==0x46546c67||bytes.readUInt32LE(4)!==2)throw Error('Invalid glTF: '+name);
 const doc=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
 if(doc.buffers.some(b=>b.uri)||doc.images?.some(i=>i.uri))throw Error('Untracked external asset: '+name);
 if(!doc.meshes.length||!doc.materials.length)throw Error('Empty art: '+name);
 if(name==='celestia.glb'){
  const joints=doc.nodes.filter(n=>n.name?.startsWith('attach__')).map(n=>n.name.slice(8));
  for(const r of required)if(!joints.includes(r))throw Error('Missing animation fitting: '+r);
 }
 manifest.assets.push({name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),meshes:doc.meshes.length,materials:doc.materials.length});
}
const png=readFileSync('public/art/observatory/pigments.png');
manifest.assets.push({name:'pigments.png',bytes:png.length,sha256:createHash('sha256').update(png).digest('hex'),source:'Original generated albedo atlas; prompt and use documented in docs/OBSERVATORY_ATELIER.md'});
if(process.argv.includes('--write'))writeFileSync('public/art/observatory/manifest.json',JSON.stringify(manifest,null,2)+'\n');
else {const checked=JSON.parse(readFileSync('public/art/observatory/manifest.json','utf8'));if(JSON.stringify(checked)!==JSON.stringify(manifest))throw Error('Asset manifest drift; inspect changes and run art:manifest');}
console.log(JSON.stringify(manifest,null,2));
