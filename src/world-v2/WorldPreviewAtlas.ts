import { buildAtlas, type AtlasDefinition } from './WorldAtlas';

/**
 * DEVELOPMENT ONLY. Stable sample IDs prove atlas build/streaming infrastructure.
 * This does NOT lock the final canon/world seed, Hearthmere placement or shores.
 * Phase 2 publishes real story and geography data under a different world ID.
 */
export const WORLD_V2_PREVIEW_DEFINITION: AtlasDefinition = {
  worldId: 'astral-lab',
  worldSeed: 'temporary-v2-lab-001',
  atlasVersion: 'lab-v1',
  generatorVersion: 'kernel-v1',
  cellSize: 64, // preview/test choice; not the selected production cell size
  landmasses: [
    { id: 'lab-mainland', kind: 'continent', envelope: { minX: -512, maxX: 512, minZ: -512, maxZ: 512 } },
    { id: 'lab-island', kind: 'island', envelope: { minX: 1024, maxX: 1536, minZ: 256, maxZ: 768 } },
  ],
  anchors: [
    { id: 'lab.arrival', landmassId: 'lab-mainland',
      position: { x: 0, y: 0, z: 0 }, clearanceRadius: 12, connectsTo: ['lab.refuge'] },
    { id: 'lab.refuge', landmassId: 'lab-mainland',
      position: { x: 230, y: 0, z: -80 }, clearanceRadius: 18 },
  ],
};

export const previewAtlas = buildAtlas(WORLD_V2_PREVIEW_DEFINITION);
