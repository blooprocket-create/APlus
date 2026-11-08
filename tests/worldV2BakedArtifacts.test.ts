import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { previewAtlas } from '../src/world-v2/WorldPreviewAtlas';
import {
  decodeCompiledCell, encodeCompiledCell, validateCompiledAtlasIndex,
  type CompiledAtlasIndex,
} from '../src/world-v2/WorldArtifacts';
import { WorldV2ArtifactSource, WorldV2GameplayBridge, type WorldArtifactTransport } from '../src/world-v2/WorldV2GameplayBridge';
import { buildPlaceholderTerrainCell, sampleCellHeight } from '../src/world-v2/WorldTerrain';

function bakedFixture() {
  const cell = buildPlaceholderTerrainCell(previewAtlas, { x: 0, z: 0 });
  const raw = JSON.stringify(encodeCompiledCell(previewAtlas, cell)) + '\n';
  const sha256 = createHash('sha256').update(raw).digest('hex');
  const cellRef = { id: cell.id, coordinate: { x: 0, z: 0 },
    path: 'cells/0/0/0.json', sha256 };
  const index: CompiledAtlasIndex = {
    schemaVersion: 1, profile: 'placeholder-preview-v1', atlas: previewAtlas,
    segments: 16, cells: [cellRef],
  };
  const files = new Map<string, string>([
    ['atlas-index.json', JSON.stringify(index)],
    [cellRef.path, raw],
  ]);
  const transport: WorldArtifactTransport = {
    read: async (relativePath) => {
      const file = files.get(relativePath);
      if (file === undefined) throw new Error('Fixture artifact absent: ' + relativePath);
      return file;
    },
  };
  return { cell, raw, cellRef, index, files, transport };
}

describe('World V2 Phase 1: offline baked catalog', () => {
  it('round-trips cell geometry without changing float32 values', () => {
    const { cell, raw, cellRef, index } = bakedFixture();
    expect(validateCompiledAtlasIndex(index)).toEqual(index);
    const decoded = decodeCompiledCell(JSON.parse(raw), index.atlas, cellRef, 16);
    expect(decoded.heights).toEqual(cell.heights);
    expect(decoded.corner).toEqual(cell.corner);
    expect(decoded.id).toEqual(cell.id);
  });

  it('rejects stale world versions, invalid values, duplicates and unexpected paths', () => {
    const { index, raw, cellRef } = bakedFixture();
    expect(() => validateCompiledAtlasIndex({ ...index, atlas: { ...index.atlas, worldSeed: 'tampered' } }))
      .toThrow(/hash or normalized/);
    expect(() => validateCompiledAtlasIndex({ ...index, cells: [cellRef, cellRef] }))
      .toThrow(/Duplicate/);
    expect(() => validateCompiledAtlasIndex({ ...index, cells: [{ ...cellRef, path: '../leak.json' }] }))
      .toThrow(/path/);
    expect(() => decodeCompiledCell({ ...JSON.parse(raw), heights: [Infinity] },
      index.atlas, cellRef, 16)).toThrow(/heightfield/);
    expect(() => decodeCompiledCell({ ...JSON.parse(raw), atlasHash: 'older-world' },
      index.atlas, cellRef, 16)).toThrow(/mismatch/);
    expect(() => decodeCompiledCell({ ...JSON.parse(raw), coordinate: { x: 1, z: 0 } },
      index.atlas, cellRef, 16)).toThrow(/Unexpected/);
  });

  it('loads only correctly signed, published cells and refuses mutated bytes', async () => {
    const { transport, files } = bakedFixture();
    const source = await WorldV2ArtifactSource.open(transport);
    expect(source.catalog.atlas.contentHash).toBe(previewAtlas.contentHash);
    expect(source.hasCell({ x: 0, z: 0 })).toBe(true);
    expect(source.hasCell({ x: 1, z: 0 })).toBe(false);
    expect(source.resolveAnchor('lab.arrival').id).toBe('lab.arrival');
    expect(() => source.resolveAnchor('hearthmere.refuge')).toThrow(/Unknown/);

    const actual = await source.loadTerrainCell({ x: 0, z: 0 }, new AbortController().signal);
    expect(actual.heights).toEqual(buildPlaceholderTerrainCell(previewAtlas, { x: 0, z: 0 }).heights);
    files.set('cells/0/0/0.json', files.get('cells/0/0/0.json')!.replace('"cellSize":64', '"cellSize":128'));
    await expect(source.loadTerrainCell({ x: 0, z: 0 }, new AbortController().signal))
      .rejects.toThrow(/digest mismatch/);
    await expect(source.loadTerrainCell({ x: 10, z: 10 }, new AbortController().signal))
      .rejects.toThrow(/not in published catalog/);
  });

  it('declines cancelled reads and blocks path traversal in HTTP adapter', async () => {
    const { transport } = bakedFixture();
    const source = await WorldV2ArtifactSource.open(transport);
    const cancelled = new AbortController();
    cancelled.abort();
    await expect(source.loadTerrainCell({ x: 0, z: 0 }, cancelled.signal))
      .rejects.toThrow(/cancelled/);
  });

  it('samples baked heights continuously at two adjacent cells', () => {
    const first = buildPlaceholderTerrainCell(previewAtlas, { x: -1, z: 0 });
    const next = buildPlaceholderTerrainCell(previewAtlas, { x: 0, z: 0 });
    for (const z of [0, 16, 32, 48, 64]) {
      expect(sampleCellHeight(first, 0, z)).toBe(sampleCellHeight(next, 0, z));
    }
    expect(() => sampleCellHeight(next, -0.1, 0)).toThrow(/outside/);
    expect(() => sampleCellHeight(next, Infinity, 0)).toThrow(/finite/);
  });

  it('the gameplay bridge streams only catalog cells, resolves anchors and frees resources', async () => {
    const { transport } = bakedFixture();
    const source = await WorldV2ArtifactSource.open(transport);
    const unloaded: string[] = [];
    const bridge = new WorldV2GameplayBridge(source, {
      load: (address, signal) => source.loadTerrainCell(address, signal),
      unload: resource => { unloaded.push(resource.id); },
    }, { activeRadius: 0, warmRadius: 1, lookAheadDistance: 0,
      maxConcurrentLoads: 2, maxLoadsPerUpdate: 2 });
    bridge.update({ x: 1, z: 1 }, { x: 1, z: 0 });
    await bridge.streamer.settle();
    expect(bridge.streamer.loaded()).toHaveLength(1);
    expect(bridge.streamer.loaded()[0].resource.id).toBe(source.catalog.cells[0].id);
    expect(bridge.renderOrigin({ x: 129.5, y: 3, z: -0.1 })).toEqual({ x: 128, y: 0, z: -64 });
    expect(bridge.resolveAnchor('lab.refuge').id).toBe('lab.refuge');
    bridge.update({ x: 2000, z: 2000 }, { x: 1, z: 0 });
    await bridge.streamer.settle();
    expect(bridge.streamer.loaded()).toHaveLength(0);
    expect(unloaded).toEqual([source.catalog.cells[0].id]);
    bridge.dispose();
    expect(unloaded).toHaveLength(1);
  });
});
