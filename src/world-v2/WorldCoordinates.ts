/**
 * Canonical atlas coordinates use JS numbers (IEEE-754 doubles), not Three.js
 * local floating-point transform coordinates. +X east; -Z north; +Y up.
 * These utilities are pure and do not depend on rendering or prototype routes.
 */
export interface WorldPosition {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}
export interface WorldCellCoordinate {
  readonly x: number;
  readonly z: number;
}
export interface WorldCellAddress extends WorldCellCoordinate {
  readonly lod: number;
}

export function assertFiniteCoordinate(n: number, name: string): number {
  if (!Number.isFinite(n)) throw new RangeError(`${name} must be finite`);
  return n;
}

export function assertCellSize(cellSize: number): number {
  if (!Number.isSafeInteger(cellSize) || cellSize <= 0) {
    throw new RangeError('cellSize must be a positive safe integer');
  }
  return cellSize;
}

/** Floors negative coordinates correctly: x=-0.1 belongs to cell -1. */
export function worldToCell(point: Pick<WorldPosition, 'x' | 'z'>, cellSize: number): WorldCellCoordinate {
  assertCellSize(cellSize);
  return {
    x: Math.floor(assertFiniteCoordinate(point.x, 'x') / cellSize),
    z: Math.floor(assertFiniteCoordinate(point.z, 'z') / cellSize),
  };
}

export function cellToWorldCorner(cell: WorldCellCoordinate, cellSize: number): { x: number; z: number } {
  assertCellSize(cellSize);
  if (!Number.isSafeInteger(cell.x) || !Number.isSafeInteger(cell.z)) {
    throw new RangeError('Cell coordinates must be safe integers');
  }
  return { x: cell.x * cellSize, z: cell.z * cellSize };
}

/**
 * Render only near the camera origin to avoid jitter over ocean-scale distances.
 * Never write these local coordinates back to canonical save/world state.
 */
export function renderOriginFor(position: WorldPosition, cellSize: number): WorldPosition {
  const cell = worldToCell(position, cellSize);
  const corner = cellToWorldCorner(cell, cellSize);
  return { x: corner.x, y: 0, z: corner.z };
}
export function toRenderLocal(world: WorldPosition, origin: WorldPosition): WorldPosition {
  return {
    x: assertFiniteCoordinate(world.x, 'x') - assertFiniteCoordinate(origin.x, 'origin.x'),
    y: assertFiniteCoordinate(world.y, 'y') - assertFiniteCoordinate(origin.y, 'origin.y'),
    z: assertFiniteCoordinate(world.z, 'z') - assertFiniteCoordinate(origin.z, 'origin.z'),
  };
}
export function fromRenderLocal(local: WorldPosition, origin: WorldPosition): WorldPosition {
  return {
    x: assertFiniteCoordinate(local.x, 'x') + assertFiniteCoordinate(origin.x, 'origin.x'),
    y: assertFiniteCoordinate(local.y, 'y') + assertFiniteCoordinate(origin.y, 'origin.y'),
    z: assertFiniteCoordinate(local.z, 'z') + assertFiniteCoordinate(origin.z, 'origin.z'),
  };
}
