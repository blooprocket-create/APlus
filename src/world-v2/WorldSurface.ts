import { worldToCell, type WorldCellCoordinate, type WorldPosition } from './WorldCoordinates';
import { sampleCellTriangle, type TerrainCell } from './WorldTerrain';

/** The exact two-triangle plane used by the Three.js PlaneGeometry grid.
 * Calling this for collision avoids the former bilinear-vs-render mismatch.
 */
export interface WorldSurfaceSample {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly normal: { readonly x: number; readonly y: number; readonly z: number };
  readonly slopeDegrees: number;
  readonly biome: number;
  readonly road: number;
  readonly waterKind: 0 | 1 | 2;
  readonly waterLevel: number | null;
  readonly walkable: boolean;
}
export interface TerrainCellStore {
  readonly cellSize: number;
  getCell(address: WorldCellCoordinate): TerrainCell | undefined;
}
export interface TraversalRules {
  readonly maxSlopeDegrees: number;
  readonly maxRisePerUnit: number;
  readonly maxStepUp: number;
  readonly allowRiver: boolean;
}
export const DEFAULT_TRAVERSAL_RULES: TraversalRules = Object.freeze({
  maxSlopeDegrees: 40, maxRisePerUnit: 0.73, maxStepUp: 0.9, allowRiver: false,
});
export type TraversalBlock = 'missing-terrain' | 'sea' | 'river' | 'steep' | 'step';
export interface TraversalResult {
  readonly position: WorldPosition;
  readonly moved: boolean;
  readonly blockedBy: TraversalBlock | null;
}

/**
 * Exact triangle plane interpolation. PlaneGeometry's diagonal connects
 * (x0,z1) to (x1,z0), not (x0,z0) to (x1,z1). Must match render geometry.
 */
export function sampleGroundTriangle(cell: TerrainCell, x: number, z: number): {
  height: number; dx: number; dz: number;
} {
  return sampleCellTriangle(cell, x, z);
}

export function sampleTerrainSurface(
  cell: TerrainCell, x: number, z: number, rules: TraversalRules = DEFAULT_TRAVERSAL_RULES,
): WorldSurfaceSample {
  const plane = sampleGroundTriangle(cell, x, z);
  const mag = Math.hypot(plane.dx, plane.dz, 1);
  const slopeDegrees = Math.atan(Math.hypot(plane.dx, plane.dz)) * 180 / Math.PI;
  const g = cell.geography;
  const fx = (x - cell.corner.x) / cell.cellSize * cell.segments;
  const fz = (z - cell.corner.z) / cell.cellSize * cell.segments;
  const ix = Math.min(cell.segments, Math.max(0, Math.round(fx)));
  const iz = Math.min(cell.segments, Math.max(0, Math.round(fz)));
  const at = iz * (cell.segments + 1) + ix;
  let waterKind = (g?.waterKinds[at] ?? 0) as 0 | 1 | 2;
  // The visible seabed crosses sea level along triangle edges. Never let
  // nearest-vertex rounding create a walkable submerged shoreline.
  if (plane.height < -0.005 && (waterKind === 1 || !g)) waterKind = 1;
  const waterLevel = waterKind === 0 ? null : waterKind === 1 ? 0 : g!.waterLevels[at];
  const wet = waterLevel !== null && plane.height < waterLevel - 0.08;
  const walkable = (waterKind !== 1 || !wet) &&
    (waterKind !== 2 || rules.allowRiver || !wet) &&
    plane.height >= -0.005 && slopeDegrees <= rules.maxSlopeDegrees;
  return {
    x, y: plane.height, z,
    normal: { x: -plane.dx / mag, y: 1 / mag, z: -plane.dz / mag },
    slopeDegrees, biome: g?.biomes[at] ?? 3, road: g?.roads[at] ?? 0,
    waterKind, waterLevel, walkable,
  };
}
export function surfaceAt(
  store: TerrainCellStore, x: number, z: number,
  rules: TraversalRules = DEFAULT_TRAVERSAL_RULES,
): WorldSurfaceSample | null {
  const address = worldToCell({ x, z }, store.cellSize);
  const cell = store.getCell(address);
  if (!cell) return null;
  return sampleTerrainSurface(cell, x, z, rules);
}
export function getTraversalBlock(
  sample: WorldSurfaceSample | null, rules: TraversalRules = DEFAULT_TRAVERSAL_RULES,
): TraversalBlock | null {
  if (!sample) return 'missing-terrain';
  if (sample.waterKind === 1 && sample.y < 0) return 'sea';
  if (sample.waterKind === 2 && !rules.allowRiver &&
    sample.waterLevel !== null && sample.y < sample.waterLevel - 0.08) return 'river';
  if (sample.slopeDegrees > rules.maxSlopeDegrees) return 'steep';
  return sample.walkable ? null : 'sea';
}

/**
 * Swept 3D traversal: samples the baked ground on the actual proposed route.
 * Rejects unloaded ground, sea, rivers and steep slopes. One axis can slide
 * after a blocked diagonal; never forces y=0 or silently crosses a gap.
 */
export function traverseTerrain(
  store: TerrainCellStore, from: WorldPosition, dx: number, dz: number,
  rules: TraversalRules = DEFAULT_TRAVERSAL_RULES,
): TraversalResult {
  if (![from.x, from.y, from.z, dx, dz].every(Number.isFinite)) throw new RangeError('Invalid movement');
  const sampleStart = surfaceAt(store, from.x, from.z, rules);
  if (!sampleStart) return { position: from, moved: false, blockedBy: 'missing-terrain' };
  const advance = (stepX: number, stepZ: number): TraversalResult => {
    const distance = Math.hypot(stepX, stepZ);
    if (!distance) return { position: from, moved: false, blockedBy: null };
    const count = Math.max(1, Math.ceil(distance / 0.8));
    let previous = sampleStart;
    for (let i = 1; i <= count; i++) {
      const x = from.x + stepX * i / count, z = from.z + stepZ * i / count;
      const current = surfaceAt(store, x, z, rules);
      const blocked = getTraversalBlock(current, rules);
      if (blocked) return { position: from, moved: false, blockedBy: blocked };
      const travel = distance / count, deltaY = current!.y - previous.y;
      if (deltaY > rules.maxStepUp || deltaY / travel > rules.maxRisePerUnit)
        return { position: from, moved: false, blockedBy: 'step' };
      previous = current!;
    }
    return { position: { x: from.x + stepX, y: previous.y, z: from.z + stepZ },
      moved: true, blockedBy: null };
  };
  const first = advance(dx, dz);
  if (first.moved || dx === 0 || dz === 0) return first;
  const slideX = advance(dx, 0), slideZ = advance(0, dz);
  if (!slideX.moved) return slideZ.moved ? slideZ : first;
  if (!slideZ.moved) return slideX;
  return Math.abs(dx) >= Math.abs(dz) ? slideX : slideZ;
}
