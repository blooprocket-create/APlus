import { describe, expect, it } from 'vitest';
import { stageAtlas, stageGeography } from '../src/world-v2/WorldGeographyStage';
import { buildGeographyTerrainCell } from '../src/world-v2/WorldTerrain';
import { withTerrainNavigation } from '../src/world-v2/WorldNavigation';
import {
  encodeCompiledCell, validateCompiledAtlasIndex, validateCompiledCellPage,
  type CompiledAtlasIndex, type CompiledCellPage,
} from '../src/world-v2/WorldArtifacts';
import { WorldV2ArtifactSource, type WorldArtifactTransport } from '../src/world-v2/WorldV2GameplayBridge';

async function digest(raw: string): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',
    new TextEncoder().encode(raw))), v=>v.toString(16).padStart(2,'0')).join('');
}
async function fixture() {
  const tile = withTerrainNavigation(buildGeographyTerrainCell(stageGeography,{x:0,z:0}));
  const encoded = JSON.stringify(encodeCompiledCell(stageAtlas,tile))+'\n';
  const reference = {
    id:tile.id,coordinate:tile.coordinate,path:'cells/0/0/0.json',sha256:await digest(encoded),
  };
  const page: CompiledCellPage = {schemaVersion:1,atlasHash:stageAtlas.contentHash,
    x:0,z:0,cells:[reference] };
  const pageRaw = JSON.stringify(page)+'\n';
  const pageRef={x:0,z:0,path:'pages/0/0.json',
    sha256:await digest(pageRaw),cellCount:1};
  const index:CompiledAtlasIndex = {schemaVersion:1,profile:'geography-stage-v1',
    atlas:stageAtlas,geography:stageGeography.definition,segments:16,cells:[],pages:[pageRef]};
  const files=new Map<string,string>([['atlas-index.json',JSON.stringify(index)],
    [pageRef.path,pageRaw],[reference.path,encoded]]);
  const reads:string[]=[];
  const transport:WorldArtifactTransport = {
    async read(relativePath) {
      reads.push(relativePath);
      const result=files.get(relativePath);
      if(result===undefined)throw new Error('Missing fixture '+relativePath);
      return result;
    },
  };
  return {tile,index,page,pageRef,reference,files,transport,reads};
}

describe('World V2 paged geographic world catalog',()=>{
  it('accepts lazy remote page metadata and verifies a cell through two independent hashes',async()=>{
    const sample=await fixture();
    const valid=validateCompiledAtlasIndex(sample.index);
    expect(valid.pages).toHaveLength(1);
    expect(validateCompiledCellPage(sample.page,valid,sample.pageRef)).toEqual(sample.page);
    const source=await WorldV2ArtifactSource.open(sample.transport);
    expect(source.hasCell({x:0,z:0})).toBe(true);
    expect(source.hasCell({x:24,z:24})).toBe(false);
    const result=await source.loadTerrainCell({x:0,z:0},new AbortController().signal);
    expect(result.heights).toEqual(sample.tile.heights);
    expect(result.navigation?.walkable).toEqual(sample.tile.navigation?.walkable);
    expect(sample.reads).toEqual(['atlas-index.json','pages/0/0.json','cells/0/0/0.json']);
  });
  it('deduplicates concurrent page requests, while keeping tiles individually verified',async()=>{
    const sample=await fixture();
    const source=await WorldV2ArtifactSource.open(sample.transport);
    const cancel=new AbortController();
    const [a,b]=await Promise.all([source.loadTerrainCell({x:0,z:0},cancel.signal),
      source.loadTerrainCell({x:0,z:0},new AbortController().signal)]);
    expect(a.id).toBe(b.id);
    expect(sample.reads.filter(path=>path==='pages/0/0.json')).toHaveLength(1);
    expect(sample.reads.filter(path=>path==='cells/0/0/0.json')).toHaveLength(2);
  });
  it('rejects corrupt page digests, invalid cell IDs, duplicate pages, and malformed signed page paths',async()=>{
    const sample=await fixture();
    expect(()=>validateCompiledAtlasIndex({...sample.index,pages:[sample.pageRef,sample.pageRef]}))
      .toThrow(/Duplicate world/);
    expect(()=>validateCompiledAtlasIndex({...sample.index,
      pages:[{...sample.pageRef,path:'../arbitrary.json'}]})).toThrow(/page reference/);
    expect(()=>validateCompiledCellPage({...sample.page,x:1},sample.index,sample.pageRef))
      .toThrow(/page identity/);
    expect(()=>validateCompiledCellPage({...sample.page,
      cells:[{...sample.reference,id:'bad'}]},sample.index,sample.pageRef))
      .toThrow(/page cell/);
    sample.files.set('pages/0/0.json',JSON.stringify({...sample.page,atlasHash:'bad'})+'\n');
    const source=await WorldV2ArtifactSource.open(sample.transport);
    await expect(source.loadTerrainCell({x:0,z:0},new AbortController().signal))
      .rejects.toThrow(/digest mismatch/);
  });
});
