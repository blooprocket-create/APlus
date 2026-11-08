import { describe, expect, it } from 'vitest';
import {
  cellToWorldCorner, fromRenderLocal, renderOriginFor, toRenderLocal, worldToCell,
} from '../src/world-v2/WorldCoordinates';
import { deriveSeed, hash32, worldCellId, worldEntityId } from '../src/world-v2/WorldIdentity';
import {
  buildAtlas, StoryAnchorRegistry, type AtlasDefinition,
} from '../src/world-v2/WorldAtlas';
import {
  buildPlaceholderTerrainCell, createPlaceholderHeightSampler, terrainHeightAtVertex,
} from '../src/world-v2/WorldTerrain';
import {
  planCells, WorldCellStreamer,
} from '../src/world-v2/WorldCellStreamer';

const fixture = (): AtlasDefinition => ({
  worldId: 'astral-world', worldSeed: 'shared-world-seed-fixture-001',
  atlasVersion: 'atlas-v1', generatorVersion: 'kernel-v1', cellSize: 64,
  // Reservation envelopes only, not final landmass shapes/geography.
  landmasses: [
    { id: 'west-continent', kind: 'continent', envelope: { minX: -4096, maxX: 4096, minZ: -4096, maxZ: 4096 } },
    { id: 'far-isle', kind: 'island', envelope: { minX: 6000, maxX: 8000, minZ: -500, maxZ: 900 } },
  ],
  anchors: [
    { id: 'hearthmere.waystation', landmassId: 'west-continent',
      position: { x: -120, y: 0, z: 20 }, clearanceRadius: 12, connectsTo: ['hearthmere.refuge'] },
    { id: 'hearthmere.refuge', landmassId: 'west-continent',
      position: { x: 230, y: 0, z: 100 }, clearanceRadius: 25 },
  ],
});

describe('World V2: identity and coordinates', () => {
  it('pins stable 32-bit UTF-8 hash behavior', () => {
    expect(hash32('hello')).toBe(0x4f9f2cab);
    expect(hash32('héllo')).not.toBe(hash32('hello'));
    expect(deriveSeed('shared', 'ab', 'c')).not.toBe(deriveSeed('shared', 'a', 'bc'));
  });
  it('derives world/landmass/entity identity without player identity or load order', () => {
    expect(deriveSeed('same', 'landmass-v1', 'a')).toBe(deriveSeed('same', 'landmass-v1', 'a'));
    expect(deriveSeed('same', 'landmass-v1', 'a')).not.toBe(deriveSeed('same', 'landmass-v1', 'b'));
    expect(worldCellId('astral-world', { x: -3, z: 4, lod: 0 })).toBe('astral-world/cell/0/-3/4');
    expect(worldEntityId('astral-world', 'wildlife', 'wolf-21')).toBe(worldEntityId('astral-world', 'wildlife', 'wolf-21'));
    expect(worldEntityId('astral-world', 'wildlife', 'wolf-21')).not.toBe(worldEntityId('astral-world', 'wildlife', 'wolf-22'));
    expect(() => worldCellId('astral-world', { x: 0, z: 0, lod: -1 })).toThrow();
  });
  it('handles negative seams and 3D floating origins', () => {
    expect(worldToCell({ x: -0.0001, z: -64 }, 64)).toEqual({ x: -1, z: -1 });
    expect(worldToCell({ x: 0, z: 64 }, 64)).toEqual({ x: 0, z: 1 });
    expect(cellToWorldCorner({ x: -1, z: 2 }, 64)).toEqual({ x: -64, z: 128 });
    const pos = { x: 1048576.375, y: 124.2, z: -2200000.75 };
    const origin = renderOriginFor(pos, 64);
    expect(origin).toEqual({ x: 1048576, y: 0, z: -2200064 });
    const local = toRenderLocal(pos, origin);
    expect(local.x).toBeGreaterThanOrEqual(0);
    expect(local.x).toBeLessThan(64);
    expect(fromRenderLocal(local, origin)).toEqual(pos);
    expect(() => worldToCell({ x: Infinity, z: 0 }, 64)).toThrow();
    expect(() => worldToCell({ x: 0, z: 0 }, 0)).toThrow();
  });
});

describe('World V2: canonical atlas and semantic anchors', () => {
  it('is deterministic under declaration reordering and cold builds', () => {
    const definition = fixture();
    const a = buildAtlas(definition);
    const b = buildAtlas({ ...definition, landmasses: [...definition.landmasses].reverse(), anchors: [...definition.anchors].reverse() });
    expect(a).toEqual(b);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.landmasses.map(x => x.id)).toEqual(['far-isle', 'west-continent']);
    expect(a.anchors.map(x => x.id)).toEqual(['hearthmere.refuge', 'hearthmere.waystation']);
    expect(a.schemaVersion).toBe(1);
    expect(a.contentHash).toMatch(/^[0-9a-f]{8}$/);
  });

  it('adding a new island never changes older sub-seeds or story-anchor coordinates', () => {
    const original = fixture(), before = buildAtlas(original);
    const expanded = buildAtlas({ ...original, landmasses: [
      { id: 'another-isle', kind: 'island', envelope: { minX: 9000, maxX: 10000, minZ: 0, maxZ: 900 } },
      ...original.landmasses,
    ] });
    expect(expanded.contentHash).not.toBe(before.contentHash);
    for (const old of before.landmasses) expect(expanded.landmasses.find(x => x.id === old.id)).toEqual(old);
    expect(expanded.anchors).toEqual(before.anchors);
    expect(buildAtlas(fixture()).contentHash).toBe(before.contentHash);
  });

  it('provides an immutable, fail-closed semantic anchor registry', () => {
    const original = buildAtlas(fixture());
    const registry = new StoryAnchorRegistry(original.anchors);
    expect(registry.has('hearthmere.waystation')).toBe(true);
    expect(registry.resolve('hearthmere.refuge').clearanceRadius).toBe(25);
    expect(() => registry.resolve('hearthmere.missing')).toThrow(/Unknown story anchor/);
    expect(Object.isFrozen(registry.resolve('hearthmere.refuge').position)).toBe(true);
    expect(() => new StoryAnchorRegistry([...original.anchors, original.anchors[0]])).toThrow(/Duplicate/);
  });

  it('rejects duplicate IDs, broken references, invalid bounds and non-finite placements', () => {
    const d = fixture();
    expect(() => buildAtlas({ ...d, landmasses: [d.landmasses[0], d.landmasses[0]] })).toThrow(/Duplicate landmass/);
    expect(() => buildAtlas({ ...d, anchors: [d.anchors[0], d.anchors[0]] })).toThrow(/Duplicate story anchor/);
    expect(() => buildAtlas({ ...d, anchors: [{ ...d.anchors[0], landmassId: 'missing' }] })).toThrow(/unknown landmass/);
    expect(() => buildAtlas({ ...d, anchors: [{ ...d.anchors[0], connectsTo: ['hearthmere.no-such-place'] }] })).toThrow(/missing/);
    expect(() => buildAtlas({ ...d, anchors: [{ ...d.anchors[0], position: { x: Infinity, y: 0, z: 0 } }] })).toThrow(/finite/);
    expect(() => buildAtlas({ ...d, anchors: [{ ...d.anchors[0], position: { x: 9999, y: 0, z: 0 } }] })).toThrow(/outside/);
    expect(() => buildAtlas({ ...d, landmasses: [{ id: 'broken', kind: 'island', envelope: { minX: 0, maxX: 0, minZ: 0, maxZ: 3 } }] })).toThrow(/Invalid reservation/);
    expect(() => buildAtlas({ ...d, anchors: [{ ...d.anchors[0], clearanceRadius: -5 }] })).toThrow(/clearanceRadius/);
  });
});

describe('World V2: seam-safe placeholder heightfield', () => {
  it('is independent of cell generation order, client identity and load frequency', () => {
    const atlas = buildAtlas(fixture());
    const one = buildPlaceholderTerrainCell(atlas, { x: -2, z: 0 });
    const unrelated = buildPlaceholderTerrainCell(atlas, { x: 7, z: -4 });
    const again = buildPlaceholderTerrainCell(atlas, { x: -2, z: 0 });
    expect(one.heights).toEqual(again.heights);
    expect(unrelated.id).not.toBe(one.id);
    expect(one.heights.length).toBe(17 * 17);
    expect(one.coordinate).toEqual({ x: -2, z: 0 });
  });

  it('matches all shared edge vertices across positive and negative cell coordinates', () => {
    const atlas = buildAtlas(fixture());
    for (const cell of [{ x: -1, z: 0 }, { x: 0, z: -1 }, { x: 3, z: -7 }]) {
      const a = buildPlaceholderTerrainCell(atlas, cell);
      const east = buildPlaceholderTerrainCell(atlas, { x: cell.x + 1, z: cell.z });
      const south = buildPlaceholderTerrainCell(atlas, { x: cell.x, z: cell.z + 1 });
      for (let i = 0; i <= a.segments; i++) {
        expect(terrainHeightAtVertex(a, a.segments, i)).toBe(terrainHeightAtVertex(east, 0, i));
        expect(terrainHeightAtVertex(a, i, a.segments)).toBe(terrainHeightAtVertex(south, i, 0));
      }
    }
  });
  it('samples world-space heights independently of cell IDs and rejects bad coordinates', () => {
    const a = createPlaceholderHeightSampler('world-a');
    const b = createPlaceholderHeightSampler('world-a');
    const c = createPlaceholderHeightSampler('world-b');
    expect(a(128, -640)).toBe(b(128, -640));
    expect(a(128, -640)).not.toBe(c(128, -640));
    expect(() => a(NaN, 0)).toThrow();
    expect(() => buildPlaceholderTerrainCell(buildAtlas(fixture()), { x: 0, z: 0 }, 0)).toThrow();
  });
});

describe('World V2: cell residency and lifetime', () => {
  const opts = { worldId: 'astral-world', cellSize: 64, activeRadius: 1, warmRadius: 2, lookAheadDistance: 64 };
  it('plans active cells, warm neighbors and prefetch, with deterministic ordering', () => {
    const plan = planCells({ x: 1, z: 1 }, { x: 1, z: 0 }, opts);
    expect(plan.filter(p => p.residency === 'active')).toHaveLength(9);
    expect(new Set(plan.map(p => p.id)).size).toBe(plan.length);
    expect(plan[0].residency).toBe('active');
    expect(plan.some(p => p.address.x === 2 && p.address.z === 0 && p.residency === 'warm')).toBe(true);
    expect(planCells({ x: 1, z: 1 }, { x: 1, z: 0 }, opts)).toEqual(plan);
  });
  it('loads bounded work, reuses cells, and unloads after crossing', async () => {
    const loaded: string[] = [];
    const unloaded: string[] = [];
    const streamer = new WorldCellStreamer({ ...opts, activeRadius: 0, warmRadius: 0, lookAheadDistance: 0,
      maxConcurrentLoads: 2, maxLoadsPerUpdate: 1 }, {
      load: async (cell) => { const id = `${cell.x}:${cell.z}`; loaded.push(id); return id; },
      unload: (id) => { unloaded.push(id); },
    });
    streamer.update({ x: -0.5, z: 0 });
    await streamer.settle();
    expect(loaded).toEqual(['-1:0']);
    streamer.update({ x: -0.25, z: 0 });
    await streamer.settle();
    expect(loaded).toEqual(['-1:0']);
    streamer.update({ x: 0, z: 0 });
    await streamer.settle();
    expect(loaded).toEqual(['-1:0', '0:0']);
    expect(unloaded).toEqual(['-1:0']);
    expect(streamer.loaded()).toHaveLength(1);
    streamer.dispose();
    expect(unloaded).toEqual(['-1:0', '0:0']);
  });
  it('discards a late loading cell after moving away, without leaking resources', async () => {
    const resolvers: Array<(resource: string) => void> = [];
    const freed: string[] = [];
    const streamer = new WorldCellStreamer({ ...opts, activeRadius: 0, warmRadius: 0,
      lookAheadDistance: 0, maxConcurrentLoads: 2, maxLoadsPerUpdate: 1 }, {
      load: () => new Promise(resolve => { resolvers.push(resolve); }),
      unload: resource => { freed.push(resource); },
    });
    streamer.update({ x: 0, z: 0 });
    await Promise.resolve();
    streamer.update({ x: 100, z: 0 });
    await Promise.resolve();
    expect(resolvers).toHaveLength(2);
    resolvers[0]('stale');
    resolvers[1]('current');
    await streamer.settle();
    expect(freed).toEqual(['stale']);
    expect(streamer.loaded()).toMatchObject([{ resource: 'current' }]);
    streamer.dispose();
    expect(freed).toEqual(['stale', 'current']);
  });
  it('does not lose another player-free load when islands are appended to an atlas', async () => {
    const atlas = buildAtlas(fixture());
    const used: string[] = [];
    const streamer = new WorldCellStreamer({ ...opts, activeRadius: 0, warmRadius: 0,
      lookAheadDistance: 0, maxConcurrentLoads: 1, maxLoadsPerUpdate: 1 }, {
      load: async (addr) => {
        const cell = buildPlaceholderTerrainCell(atlas, addr);
        used.push(cell.id); return cell;
      },
      unload: () => {},
    });
    for (const x of [-128, -64, 0, 64, 128]) {
      streamer.update({ x, z: 0 });
      await streamer.settle();
      expect(streamer.loaded()).toHaveLength(1);
    }
    expect(new Set(used).size).toBe(5);
    streamer.dispose();
  });
});
