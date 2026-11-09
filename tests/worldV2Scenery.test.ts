import { describe, expect, it } from 'vitest';
import { stageAtlas, stageGeography, STAGE_ATLAS_DEFINITION, STAGE_GEOGRAPHY_DEFINITION } from '../src/world-v2/WorldGeographyStage';
import { buildAtlas } from '../src/world-v2/WorldAtlas';
import { createGeography } from '../src/world-v2/WorldGeography';
import { buildGeographyTerrainCell, sampleCellHeight } from '../src/world-v2/WorldTerrain';
import { makeSceneryPlacements } from '../src/world-v2/WorldScenery';

describe('World V2 screenshot-led scenery placement', () => {
  it('is reproducible across loads and independent of cell bake order', () => {
    const cell = buildGeographyTerrainCell(stageGeography, { x: 0, z: 0 });
    const before = makeSceneryPlacements(cell, stageAtlas.worldSeed);
    buildGeographyTerrainCell(stageGeography, { x: -30, z: 30 });
    const after = makeSceneryPlacements(buildGeographyTerrainCell(stageGeography, { x: 0, z: 0 }), stageAtlas.worldSeed);
    expect(before).toEqual(after);
    expect(before.length).toBeGreaterThan(0);
    expect(new Set(before.map(item => item.id)).size).toBe(before.length);
    for (const item of before) {
      expect(item.x).toBeGreaterThan(cell.corner.x);
      expect(item.x).toBeLessThan(cell.corner.x + cell.cellSize);
      expect(item.z).toBeGreaterThan(cell.corner.z);
      expect(item.z).toBeLessThan(cell.corner.z + cell.cellSize);
      expect(item.y).toBeCloseTo(sampleCellHeight(cell, item.x, item.z), 6);
    }
  });

  it('respects named story clearances even after reshuffling tile generation', () => {
    const cell = buildGeographyTerrainCell(stageGeography, { x: 0, z: 0 });
    const placements = makeSceneryPlacements(cell, stageAtlas.worldSeed, stageAtlas.anchors);
    expect(placements.length).toBeGreaterThan(0);
    for (const placement of placements) {
      for (const anchor of stageAtlas.anchors) {
        if (anchor.landmassId !== 'continent-a') continue;
        expect(Math.hypot(placement.x - anchor.position.x, placement.z - anchor.position.z))
          .toBeGreaterThanOrEqual(anchor.clearanceRadius + 3);
      }
    }
  });

  it('places nothing on open sea cells or preview tiles without geology', () => {
    const ocean = buildGeographyTerrainCell(stageGeography, { x: 20, z: 11 });
    expect(stageGeography.sample(1330, 760).waterKind).toBe(1);
    expect(makeSceneryPlacements(ocean, stageAtlas.worldSeed)).toHaveLength(0);
  });

  it('preserves existing placement IDs when adding a geographically distant island', () => {
    const a = buildGeographyTerrainCell(stageGeography, { x: 1, z: 1 });
    const expandedAtlas = buildAtlas({ ...STAGE_ATLAS_DEFINITION, landmasses: [
      ...STAGE_ATLAS_DEFINITION.landmasses,
      { id: 'visual-fixture-island', kind: 'island',
        envelope: { minX: 4300, maxX: 5000, minZ: -900, maxZ: -200 } },
    ] });
    const expanded = createGeography(expandedAtlas, { ...STAGE_GEOGRAPHY_DEFINITION, landmasses: [
      ...STAGE_GEOGRAPHY_DEFINITION.landmasses,
      { id: 'visual-fixture-island', cx: 4650, cz: -550,
        radiusX: 165, radiusZ: 145, rotation: 0.1, coastRoughness: 1,
        elevationScale: 0.8, climateOffset: 0, riverAngles: [] },
    ] });
    const b = buildGeographyTerrainCell(expanded, { x: 1, z: 1 });
    expect(makeSceneryPlacements(a, stageAtlas.worldSeed))
      .toEqual(makeSceneryPlacements(b, stageAtlas.worldSeed));
  });
});
