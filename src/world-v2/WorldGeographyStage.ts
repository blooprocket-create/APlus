import { buildAtlas, type AtlasDefinition } from './WorldAtlas';
import { createGeography, type GeographyDefinition } from './WorldGeography';

/**
 * STAGING GEOGRAPHY, not committed narrative canon.
 * The 5 landmasses and Hearthmere coordinates are an inspectable baseline
 * and can be rebuilt without losing the existing quest or character assets.
 * Once the user approves the layout, a separately versioned canonical atlas
 * can be published with these stable IDs and a locked seed.
 */
export const STAGE_ATLAS_DEFINITION: AtlasDefinition = {
  worldId: 'astral-geography-stage',
  worldSeed: 'geography-review-stage-seed-v1',
  atlasVersion: 'stage-v1',
  generatorVersion: 'geography-v1',
  cellSize: 64, // staging benchmark, not final performance selection
  landmasses: [
    { id: 'continent-a', kind: 'continent',
      envelope: { minX: -900, maxX: 900, minZ: -900, maxZ: 900 } },
    { id: 'continent-b', kind: 'continent',
      envelope: { minX: 1780, maxX: 3620, minZ: -670, maxZ: 1170 } },
    { id: 'island-a', kind: 'island',
      envelope: { minX: 1060, maxX: 1640, minZ: 250, maxZ: 830 } },
    { id: 'island-b', kind: 'island',
      envelope: { minX: 1260, maxX: 1840, minZ: -790, maxZ: -210 } },
    { id: 'island-c', kind: 'island',
      envelope: { minX: -1610, maxX: -1090, minZ: 380, maxZ: 900 } },
  ],
  anchors: [
    { id: 'hearthmere.arrival', landmassId: 'continent-a',
      position: { x: 0, y: 18, z: 0 }, clearanceRadius: 24,
      connectsTo: ['hearthmere.refuge', 'hearthmere.foothill'] },
    { id: 'hearthmere.refuge', landmassId: 'continent-a',
      position: { x: 150, y: 14, z: 60 }, clearanceRadius: 19,
      connectsTo: ['hearthmere.coast-route'] },
    { id: 'hearthmere.foothill', landmassId: 'continent-a',
      position: { x: -150, y: 25, z: -100 }, clearanceRadius: 18 },
    { id: 'hearthmere.coast-route', landmassId: 'continent-a',
      position: { x: 330, y: 8, z: 70 }, clearanceRadius: 14 },
    { id: 'stage.other-continent', landmassId: 'continent-b',
      position: { x: 2700, y: 22, z: 250 }, clearanceRadius: 22 },
    { id: 'stage.first-island', landmassId: 'island-a',
      position: { x: 1350, y: 12, z: 540 }, clearanceRadius: 13 },
  ],
};
export const STAGE_GEOGRAPHY_DEFINITION: GeographyDefinition = {
  schemaVersion: 1, profile: 'geography-stage-v1', seaLevel: 0,
  landmasses: [
    { id: 'continent-a', cx: 0, cz: 0, radiusX: 590, radiusZ: 470,
      rotation: -0.16, coastRoughness: 1.0, elevationScale: 0.94,
      climateOffset: -0.04, riverAngles: [0.86, 2.38, 4.30] },
    { id: 'continent-b', cx: 2700, cz: 250, radiusX: 650, radiusZ: 500,
      rotation: 0.21, coastRoughness: 1.12, elevationScale: 1.16,
      climateOffset: 0.08, riverAngles: [0.51, 2.85, 5.04] },
    { id: 'island-a', cx: 1350, cz: 540, radiusX: 210, radiusZ: 155,
      rotation: 0.31, coastRoughness: 1.0, elevationScale: 0.58,
      climateOffset: 0.14, riverAngles: [] },
    { id: 'island-b', cx: 1550, cz: -500, radiusX: 170, radiusZ: 135,
      rotation: -0.38, coastRoughness: 1.16, elevationScale: 0.72,
      climateOffset: 0.08, riverAngles: [] },
    { id: 'island-c', cx: -1350, cz: 640, radiusX: 145, radiusZ: 105,
      rotation: 0.65, coastRoughness: 0.88, elevationScale: 0.56,
      climateOffset: -0.1, riverAngles: [] },
  ],
};
export const stageAtlas = buildAtlas(STAGE_ATLAS_DEFINITION);
export const stageGeography = createGeography(stageAtlas, STAGE_GEOGRAPHY_DEFINITION);
