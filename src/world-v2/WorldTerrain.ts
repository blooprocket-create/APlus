import { assertCellSize, cellToWorldCorner, type WorldCellCoordinate } from './WorldCoordinates';
import { deriveSeed, worldCellId } from './WorldIdentity';
import type { WorldAtlasManifest } from './WorldAtlas';

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
export function sampleCellHeight(cell: TerrainCell, worldX: number, worldZ: number): number {
  if (!Number.isFinite(worldX) || !Number.isFinite(worldZ)) {
    throw new RangeError('Terrain query coordinates must be finite');
  }
  const x = (worldX - cell.corner.x) / cell.cellSize * cell.segments;
  const z = (worldZ - cell.corner.z) / cell.cellSize * cell.segments;
  if (x < 0 || z < 0 || x > cell.segments || z > cell.segments) {
    throw new RangeError('Terrain query falls outside resident tile');
  }
  const ax = Math.min(cell.segments - 1, Math.floor(x));
  const az = Math.min(cell.segments - 1, Math.floor(z));
  const tx = x - ax, tz = z - az;
  const a = terrainHeightAtVertex(cell, ax, az);
  const b = terrainHeightAtVertex(cell, ax + 1, az);
  const d = terrainHeightAtVertex(cell, ax, az + 1);
  const e = terrainHeightAtVertex(cell, ax + 1, az + 1);
  return (a + (b - a) * tx) * (1 - tz) + (d + (e - d) * tx) * tz;
}
