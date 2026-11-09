import { assertCellSize, cellToWorldCorner, type WorldCellCoordinate } from './WorldCoordinates';
import { deriveSeed, worldCellId } from './WorldIdentity';
import type { WorldAtlasManifest } from './WorldAtlas';
import type { GeographyWorld } from './WorldGeography';

/**
 * TEMPORARY smooth placeholder surface only. Not a final continent, biome,
 * coastline or quest geometry. Generated from world-space samples so cell
 * generation order and streaming radius cannot create terrain seams.
 */
export const PLACEHOLDER_SEGMENTS = 16;
const hashLattice = (seed: number, x: number, z: number): number => {
  // Integer noise. All coordinates are part of the same world-space field,
  // not re-seeded per cell. The 32-bit integer grid is deliberately provisional.
  let h = seed ^ Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(z | 0, 0x165667b1);
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) / 0xffffffff;
};
const smoother = (v: number): number => v * v * (3 - 2 * v);

function valueNoise(seed: number, x: number, z: number): number {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = smoother(x - ix), fz = smoother(z - iz);
  const a = hashLattice(seed, ix, iz);
  const b = hashLattice(seed, ix + 1, iz);
  const c = hashLattice(seed, ix, iz + 1);
  const d = hashLattice(seed, ix + 1, iz + 1);
  return (a + (b - a) * fx) * (1 - fz) + (c + (d - c) * fx) * fz;
}

export function createPlaceholderHeightSampler(worldSeed: string): (x: number, z: number) => number {
  const seed = deriveSeed(worldSeed, 'placeholder-surface-v1');
  return (x, z) => {
    if (!Number.isFinite(x) || !Number.isFinite(z)) throw new RangeError('Non-finite terrain position');
    // A low-gradient, passable sandbox surface, never a finalized coast map.
    return (valueNoise(seed, x / 70, z / 70) - 0.5) * 8
      + (valueNoise(seed ^ 0x649379ab, x / 30, z / 30) - 0.5) * 2;
  };
}

export interface TerrainCell {
  readonly id: string;
  readonly coordinate: WorldCellCoordinate;
  /** World-space bottom-left corner; +X and +Z span this cell. */
  readonly corner: { readonly x: number; readonly z: number };
  readonly segments: number;
  readonly cellSize: number;
  /** Row-major (z then x), including both edges (segments+1)^2. */
  readonly heights: Float32Array;
  /** Optional Phase 2 geography vertex attributes, aligned with heights. */
  readonly geography?: {
    readonly waterLevels: Float32Array;
    readonly waterKinds: Uint8Array;
    readonly biomes: Uint8Array;
    readonly roads: Uint8Array;
  };
  /** Offline walkability overlay, derived from the same triangles as collision. */
  readonly navigation?: { readonly gridSize: number; readonly walkable: Uint8Array };
}

/**
 * Generate only lod=0 placeholder terrain. Other LODs are a later bake/runtime
 * contract, not fake interpolations that might break when geography changes.
 */
export function buildPlaceholderTerrainCell(
  atlas: Pick<WorldAtlasManifest, 'worldId' | 'worldSeed' | 'cellSize'>,
  coordinate: WorldCellCoordinate,
  segments = PLACEHOLDER_SEGMENTS,
): TerrainCell {
  assertCellSize(atlas.cellSize);
  if (!Number.isSafeInteger(segments) || segments < 1 || segments > 256) {
    throw new RangeError('segments must be an integer between 1 and 256');
  }
  const corner = cellToWorldCorner(coordinate, atlas.cellSize);
  const heightAt = createPlaceholderHeightSampler(atlas.worldSeed);
  const heights = new Float32Array((segments + 1) ** 2);
  for (let row = 0; row <= segments; row++) {
    for (let col = 0; col <= segments; col++) {
      // Relative cell fractions multiply into the *global* coordinate.
      // At shared boundaries the expression is bit-for-bit identical.
      const wx = (coordinate.x + col / segments) * atlas.cellSize;
      const wz = (coordinate.z + row / segments) * atlas.cellSize;
      heights[row * (segments + 1) + col] = heightAt(wx, wz);
    }
  }
  return {
    id: worldCellId(atlas.worldId, { ...coordinate, lod: 0 }),
    coordinate: { ...coordinate }, corner, segments, cellSize: atlas.cellSize, heights,
  };
}

export function terrainHeightAtVertex(cell: TerrainCell, column: number, row: number): number {
  if (!Number.isSafeInteger(column) || !Number.isSafeInteger(row) ||
    column < 0 || row < 0 || column > cell.segments || row > cell.segments) {
    throw new RangeError('Terrain sample outside cell bounds');
  }
  return cell.heights[row * (cell.segments + 1) + column];
}

/**
 * Query height from a *resident baked* terrain tile using bilinear sampling.
 * This is a Phase 1 walking-preview query, not final character collision/slope.
 */
/**
 * Single source of truth for the exact two-triangle mesh under a player or
 * environment prop. Three.js PlaneGeometry connects the (x0,z1) and (x1,z0)
 * corners, so bilinear interpolation was previously wrong inside each quad.
 */
export function sampleCellTriangle(
  cell: TerrainCell, worldX: number, worldZ: number,
): { height: number; dx: number; dz: number } {
  if (!Number.isFinite(worldX) || !Number.isFinite(worldZ)) {
    throw new RangeError('Terrain query coordinates must be finite');
  }
  const x = (worldX - cell.corner.x) / cell.cellSize * cell.segments;
  const z = (worldZ - cell.corner.z) / cell.cellSize * cell.segments;
  if (x < -1e-5 || z < -1e-5 || x > cell.segments + 1e-5 || z > cell.segments + 1e-5) {
    throw new RangeError('Terrain query falls outside resident tile');
  }
  const ix = Math.min(cell.segments - 1, Math.max(0, Math.floor(Math.min(x, cell.segments - 1e-5))));
  const iz = Math.min(cell.segments - 1, Math.max(0, Math.floor(Math.min(z, cell.segments - 1e-5))));
  const tx = Math.max(0, Math.min(1, x - ix)), tz = Math.max(0, Math.min(1, z - iz));
  const w = cell.segments + 1;
  const h00 = cell.heights[iz * w + ix], h10 = cell.heights[iz * w + ix + 1];
  const h01 = cell.heights[(iz + 1) * w + ix], h11 = cell.heights[(iz + 1) * w + ix + 1];
  const step = cell.cellSize / cell.segments;
  if (tx + tz <= 1) {
    return { height: h00 + tx * (h10 - h00) + tz * (h01 - h00),
      dx: (h10 - h00) / step, dz: (h01 - h00) / step };
  }
  return { height: h11 + (1 - tx) * (h01 - h11) + (1 - tz) * (h10 - h11),
    dx: (h11 - h01) / step, dz: (h11 - h10) / step };
}
export function sampleCellHeight(cell: TerrainCell, worldX: number, worldZ: number): number {
  return sampleCellTriangle(cell, worldX, worldZ).height;
}

/** Builds exactly shared world-space samples; no hardcoded path constraints. */
export function buildGeographyTerrainCell(
  world: GeographyWorld,
  coordinate: WorldCellCoordinate,
  segments = PLACEHOLDER_SEGMENTS,
): TerrainCell {
  const atlas = world.atlas;
  assertCellSize(atlas.cellSize);
  if (!Number.isSafeInteger(segments) || segments < 1 || segments > 256) {
    throw new RangeError('segments must be an integer between 1 and 256');
  }
  const corner = cellToWorldCorner(coordinate, atlas.cellSize);
  const vertices = (segments + 1) ** 2;
  const heights = new Float32Array(vertices);
  const waterLevels = new Float32Array(vertices);
  const waterKinds = new Uint8Array(vertices);
  const biomes = new Uint8Array(vertices);
  const roads = new Uint8Array(vertices);
  for (let row = 0; row <= segments; row++) for (let column = 0; column <= segments; column++) {
    const wx = (coordinate.x + column / segments) * atlas.cellSize;
    const wz = (coordinate.z + row / segments) * atlas.cellSize;
    const sample = world.sample(wx, wz);
    const i = row * (segments + 1) + column;
    heights[i] = sample.height;
    waterLevels[i] = sample.waterLevel;
    waterKinds[i] = sample.waterKind;
    biomes[i] = sample.biome;
    roads[i] = sample.road;
  }
  return {
    id: worldCellId(atlas.worldId, { ...coordinate, lod: 0 }),
    coordinate: { ...coordinate }, corner, segments, cellSize: atlas.cellSize,
    heights, geography: { waterLevels, waterKinds, biomes, roads },
  };
}

/** Surface and water classification at a vertex, safe for player/boat code. */
export function terrainVertexSurface(cell: TerrainCell, column: number, row: number): {
  ground: number; waterLevel: number | null; waterKind: number; biome: number; road: number;
} {
  const ground = terrainHeightAtVertex(cell, column, row);
  const i = row * (cell.segments + 1) + column;
  const geography = cell.geography;
  return {
    ground,
    waterLevel: geography && geography.waterKinds[i] !== 0 ? geography.waterLevels[i] : null,
    waterKind: geography?.waterKinds[i] ?? 0,
    biome: geography?.biomes[i] ?? 3,
    road: geography?.roads[i] ?? 0,
  };
}
