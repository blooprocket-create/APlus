import { describe, expect, it } from 'vitest';
import { buildAtlas } from '../src/world-v2/WorldAtlas';
import { createGeography, BIOME_LABELS } from '../src/world-v2/WorldGeography';
import {
  stageAtlas, stageGeography, STAGE_ATLAS_DEFINITION, STAGE_GEOGRAPHY_DEFINITION,
} from '../src/world-v2/WorldGeographyStage';
import {
  buildGeographyTerrainCell, terrainVertexSurface,
} from '../src/world-v2/WorldTerrain';
import {
  decodeCompiledCell, encodeCompiledCell, validateCompiledAtlasIndex,
  type CompiledAtlasIndex,
} from '../src/world-v2/WorldArtifacts';

describe('World V2 Phase 2 — geographic shapes and constraints', () => {
  it('has multiple continents and islands surrounded by physically connected ocean', () => {
    expect(stageAtlas.landmasses.filter(l => l.kind === 'continent')).toHaveLength(2);
    expect(stageAtlas.landmasses.filter(l => l.kind === 'island')).toHaveLength(3);
    expect(stageGeography.sample(0, 0).landmassId).toBe('continent-a');
    expect(stageGeography.sample(2700, 250).landmassId).toBe('continent-b');
    expect(stageGeography.sample(1350, 540).landmassId).toBe('island-a');
    expect(stageGeography.sample(-1350, 640).landmassId).toBe('island-c');
    const between = stageGeography.sample(950, 0);
    expect(between.waterKind).toBe(1);
    expect(between.height).toBeLessThan(0);
    expect(between.waterLevel).toBe(0);
    expect(BIOME_LABELS).toHaveLength(8);
  });

  it('produces deterministic irregular coastline with a continuous near-shore slope', () => {
    const a = createGeography(stageAtlas, STAGE_GEOGRAPHY_DEFINITION);
    const b = createGeography(stageAtlas, {
      ...STAGE_GEOGRAPHY_DEFINITION,
      landmasses: [...STAGE_GEOGRAPHY_DEFINITION.landmasses].reverse(),
    });
    for (const [x, z] of [[400, 20], [480, 90], [590, 0], [1220, 510], [2800, 520]] as const) {
      expect(a.sample(x, z)).toEqual(b.sample(x, z));
    }
    // Find a true shoreline intersection on a fixed ray, then verify the
    // signed distance changes sign and terrain meets sea continuously.
    let crossing = 0;
    for (let x = 250; x <= 850; x += 1) {
      if (a.coastDistance(x, 0) > 0 && a.coastDistance(x + 1, 0) <= 0) { crossing = x; break; }
    }
    expect(crossing).toBeGreaterThan(250);
    const inner = a.sample(crossing - 0.05, 0);
    const outer = a.sample(crossing + 1.05, 0);
    expect(inner.height).toBeGreaterThan(0);
    expect(outer.height).toBeLessThanOrEqual(0);
    expect(Math.abs(inner.height - outer.height)).toBeLessThan(5);
  });

  it('reserves flat accessible story locations and road-grade corridors', () => {
    for (const anchor of stageAtlas.anchors) {
      const here = stageGeography.sample(anchor.position.x, anchor.position.z);
      expect(here.landmassId).toBe(anchor.landmassId);
      expect(here.height).toBeCloseTo(anchor.position.y, 4);
      expect(here.waterKind).not.toBe(1);
      expect(here.coastDistance).toBeGreaterThan(anchor.clearanceRadius);
    }
    const middle = stageGeography.sample(75, 30);
    expect(middle.road).toBeGreaterThan(140);
    expect(middle.height).toBeCloseTo(16, 2);
    const nearby = stageGeography.sample(75, 36);
    expect(nearby.road).toBeLessThan(middle.road);
  });

  it('constructs monotonic headwater-to-sea river channels', () => {
    expect(stageGeography.rivers.length).toBeGreaterThanOrEqual(4);
    for (const river of stageGeography.rivers) {
      expect(river.points.length).toBeGreaterThan(20);
      const start = river.points[0], mouth = river.points[river.points.length - 1];
      expect(stageGeography.coastDistance(start.x, start.z)).toBeGreaterThan(0);
      expect(stageGeography.coastDistance(mouth.x, mouth.z)).toBeLessThan(0);
      expect(start.waterLevel).toBeGreaterThan(0);
      expect(mouth.waterLevel).toBe(0);
      for (let i = 1; i < river.points.length; i++) {
        expect(river.points[i].waterLevel).toBeLessThanOrEqual(river.points[i-1].waterLevel);
      }
      const middle = river.points[Math.floor(river.points.length * .45)];
      const wet = stageGeography.sample(middle.x, middle.z);
      expect(wet.waterKind).toBe(2);
      expect(wet.height).toBeLessThan(wet.waterLevel);
    }
  });

  it('fails closed for malformed or overlapping geography and obstructed story locations', () => {
    const d = STAGE_GEOGRAPHY_DEFINITION;
    const first = d.landmasses[0];
    expect(() => createGeography(stageAtlas, { ...d, landmasses: d.landmasses.slice(1) }))
      .toThrow(/precisely one/);
    expect(() => createGeography(stageAtlas, { ...d,
      landmasses: [{ ...first, cx: 12000 }, ...d.landmasses.slice(1)] }))
      .toThrow(/reservation/);
    expect(() => createGeography(stageAtlas, { ...d,
      landmasses: [{ ...first, radiusX: -20 }, ...d.landmasses.slice(1)] }))
      .toThrow(/Invalid geography/);
    const movedAtlas = buildAtlas({ ...STAGE_ATLAS_DEFINITION,
      anchors: STAGE_ATLAS_DEFINITION.anchors.map(a => a.id === 'hearthmere.arrival'
        ? { ...a, position: { x: 800, y: 18, z: 0 } } : a),
    });
    expect(() => createGeography(movedAtlas, d)).toThrow(/Story anchor/);
  });

  it('retains prior landmass samples after an append-only non-overlapping island', () => {
    const expandedAtlas = buildAtlas({
      ...STAGE_ATLAS_DEFINITION,
      landmasses: [...STAGE_ATLAS_DEFINITION.landmasses,
        { id: 'island-d', kind: 'island',
          envelope: { minX: 4400, maxX: 5000, minZ: 300, maxZ: 900 } }],
    });
    const expanded = createGeography(expandedAtlas, {
      ...STAGE_GEOGRAPHY_DEFINITION,
      landmasses: [...STAGE_GEOGRAPHY_DEFINITION.landmasses,
        { id: 'island-d', cx: 4700, cz: 600, radiusX: 170, radiusZ: 120,
          rotation: 0, coastRoughness: 1, elevationScale: 0.6,
          climateOffset: 0.1, riverAngles: [] }],
    });
    expect(expandedAtlas.contentHash).not.toBe(stageAtlas.contentHash);
    for (const point of [[0,0],[100,100],[450,0],[1350,540],[2700,250]] as const) {
      expect(expanded.sample(point[0], point[1])).toEqual(stageGeography.sample(point[0], point[1]));
    }
    expect(expanded.sample(4700, 600).landmassId).toBe('island-d');
  });
});

describe('World V2 Phase 2 — seam-safe geographic tile formats', () => {
  it('has exact cross-cell seams for height, water, biome, and roads', () => {
    const positions = [{ x: 0, z: 0 }, { x: 8, z: 0 }, { x: 21, z: 8 }, { x: -2, z: 2 }];
    for (const position of positions) {
      const west = buildGeographyTerrainCell(stageGeography, position);
      const east = buildGeographyTerrainCell(stageGeography, { x: position.x + 1, z: position.z });
      const south = buildGeographyTerrainCell(stageGeography, { x: position.x, z: position.z + 1 });
      const count = west.segments + 1;
      expect(west.geography).toBeDefined();
      for (let i = 0; i < count; i++) {
        const wa = i * count + (count - 1), eb = i * count;
        const sc = (count - 1) * count + i, nd = i;
        for (const [left, right, x, y] of [
          [west, east, wa, eb], [west, south, sc, nd],
        ] as const) {
          expect(left.heights[x]).toBe(right.heights[y]);
          expect(left.geography!.waterLevels[x]).toBe(right.geography!.waterLevels[y]);
          expect(left.geography!.waterKinds[x]).toBe(right.geography!.waterKinds[y]);
          expect(left.geography!.biomes[x]).toBe(right.geography!.biomes[y]);
          expect(left.geography!.roads[x]).toBe(right.geography!.roads[y]);
        }
      }
    }
  });

  it('round trips all geographic attributes and rejects tampered cell payloads', () => {
    const cell = buildGeographyTerrainCell(stageGeography, { x: 8, z: 0 });
    const object = encodeCompiledCell(stageAtlas, cell);
    const index = validateCompiledAtlasIndex({
      schemaVersion: 1, profile: 'geography-stage-v1',
      atlas: stageAtlas, geography: stageGeography.definition, segments: 16,
      cells: [{ id: cell.id, coordinate: cell.coordinate,
        path: 'cells/0/8/0.json', sha256: 'a'.repeat(64) }],
    } as CompiledAtlasIndex);
    expect(index.profile).toBe('geography-stage-v1');
    const decoded = decodeCompiledCell(object, index.atlas, index.cells[0], 16);
    expect(decoded.heights).toEqual(cell.heights);
    expect(decoded.geography!.biomes).toEqual(cell.geography!.biomes);
    expect(decoded.geography!.waterKinds).toEqual(cell.geography!.waterKinds);
    expect(decoded.geography!.waterLevels).toEqual(cell.geography!.waterLevels);
    expect(decoded.geography!.roads).toEqual(cell.geography!.roads);
    expect(() => decodeCompiledCell({ ...object, geography: {
      ...object.geography, biomes: [999] } }, index.atlas, index.cells[0], 16)).toThrow(/geographic/);
    expect(() => validateCompiledAtlasIndex({ ...index, geography: undefined })).toThrow(/missing geography/);
    expect(() => validateCompiledAtlasIndex({ ...index, geography: {
      ...index.geography, landmasses: [] } })).toThrow(/Geography constraints/);
    expect(terrainVertexSurface(cell, 2, 2).biome).toBeGreaterThanOrEqual(0);
  });
});
