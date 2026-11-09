import { worldToCell, type WorldCellCoordinate, type WorldPosition } from './WorldCoordinates';
import type { TerrainCell } from './WorldTerrain';
import {
  DEFAULT_TRAVERSAL_RULES, getTraversalBlock, sampleTerrainSurface, surfaceAt,
  traverseTerrain, type TerrainCellStore, type TraversalRules,
} from './WorldSurface';

export interface TerrainNavigation {
  readonly gridSize: number;
  /** One byte per cell-centered vertex of the traversable grid (0/1). */
  readonly walkable: Uint8Array;
}
export interface NavigationResult {
  readonly status: 'complete' | 'unreachable' | 'awaiting-cells' | 'budget-exhausted';
  readonly waypoints: readonly WorldPosition[];
  readonly visited: number;
}
const directions = [
  [1, 0],[-1, 0],[0, 1],[0, -1],
  [1, 1],[1, -1],[-1, 1],[-1, -1],
] as const;

/** Bake a navigation overlay from exactly the same ground triangle used by
 * the rendered mesh and the character's movement solver. */
export function bakeTerrainNavigation(
  cell: TerrainCell, rules: TraversalRules = DEFAULT_TRAVERSAL_RULES,
): TerrainNavigation {
  const n = cell.segments, walkable = new Uint8Array(n * n);
  const gridStep = cell.cellSize / n;
  for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) {
    const p = sampleTerrainSurface(cell, cell.corner.x + (col + 0.5) * gridStep,
      cell.corner.z + (row + 0.5) * gridStep, rules);
    walkable[row * n + col] = p.walkable ? 1 : 0;
  }
  return { gridSize: n, walkable };
}

export function withTerrainNavigation(cell: TerrainCell, navigation = bakeTerrainNavigation(cell)): TerrainCell {
  if (navigation.gridSize !== cell.segments ||
    navigation.walkable.length !== cell.segments * cell.segments) {
    throw new RangeError('Navigation grid must match cell segments');
  }
  return { ...cell, navigation };
}
export function navigationCellMask(cell: TerrainCell, x: number, z: number): boolean {
  const n = cell.segments, gridStep = cell.cellSize / n;
  const col = Math.floor((x - cell.corner.x) / gridStep);
  const row = Math.floor((z - cell.corner.z) / gridStep);
  if (col < 0 || row < 0 || col >= n || row >= n) return false;
  if (cell.navigation) return cell.navigation.walkable[row * n + col] === 1;
  return sampleTerrainSurface(cell, x, z).walkable;
}

export function findTerrainPath(
  store: TerrainCellStore,
  start: Pick<WorldPosition, 'x' | 'z'>,
  goal: Pick<WorldPosition, 'x' | 'z'>,
  options: { maxVisited?: number; rules?: TraversalRules } = {},
): NavigationResult {
  const rules = options.rules ?? DEFAULT_TRAVERSAL_RULES;
  const maxVisited = options.maxVisited ?? 2500;
  if (!Number.isSafeInteger(maxVisited) || maxVisited < 1 || maxVisited > 50000) {
    throw new RangeError('Invalid pathfinding search budget');
  }
  if (![start.x, start.z, goal.x, goal.z].every(Number.isFinite)) {
    throw new RangeError('Non-finite navigation target');
  }
  const cell = store.getCell(worldToCell(start, store.cellSize));
  if (!cell) return { status: 'awaiting-cells', waypoints: [], visited: 0 };
  const spacing = store.cellSize / cell.segments;
  if (!Number.isFinite(spacing) || spacing <= 0) throw new RangeError('Invalid navigation sampling scale');

  type Node = { x: number; z: number; g: number; f: number; prev: string | null };
  const key = (x: number, z: number) => x + ':' + z;
  const pos = (x: number, z: number) => ({ x: (x + 0.5) * spacing, z: (z + 0.5) * spacing });
  const sx = Math.floor(start.x / spacing), sz = Math.floor(start.z / spacing);
  const gx = Math.floor(goal.x / spacing), gz = Math.floor(goal.z / spacing);
  const heuristic = (x: number, z: number) => Math.hypot(gx - x, gz - z) * spacing;
  const open: Node[] = [{ x: sx, z: sz, g: 0, f: heuristic(sx, sz), prev: null }];
  const best = new Map<string, Node>(), closed = new Set<string>();
  best.set(key(sx, sz), open[0]);
  let missing = false;
  let visited = 0;
  const query = (x: number, z: number): { walkable: boolean; missing: boolean; y: number } => {
    const point = pos(x, z);
    const address = worldToCell(point, store.cellSize);
    const tile = store.getCell(address);
    if (!tile) return { walkable: false, missing: true, y: 0 };
    const sample = surfaceAt(store, point.x, point.z, rules);
    return {
      walkable: !!sample && navigationCellMask(tile, point.x, point.z) &&
        !getTraversalBlock(sample, rules), missing: false, y: sample?.y ?? 0,
    };
  };
  const begin = query(sx, sz), end = query(gx, gz);
  if (begin.missing || end.missing) return { status: 'awaiting-cells', waypoints: [], visited: 0 };
  if (!begin.walkable || !end.walkable) return { status: 'unreachable', waypoints: [], visited: 0 };

  while (open.length && visited < maxVisited) {
    open.sort((a, b) => b.f - a.f || b.g - a.g || a.z - b.z || a.x - b.x);
    const current = open.pop()!;
    const id = key(current.x, current.z);
    if (closed.has(id)) continue;
    closed.add(id);
    visited++;
    if (current.x === gx && current.z === gz) {
      const path: WorldPosition[] = [];
      let step: Node | undefined = current;
      while (step) {
        const point = pos(step.x, step.z);
        const sampled = surfaceAt(store, point.x, point.z, rules);
        path.push({ ...point, y: sampled?.y ?? 0 });
        step = step.prev ? best.get(step.prev) : undefined;
      }
      path.reverse();
      return { status: 'complete', waypoints: path, visited };
    }
    const from = pos(current.x, current.z), fromSample = query(current.x, current.z);
    for (const [dx, dz] of directions) {
      const nx = current.x + dx, nz = current.z + dz, nid = key(nx, nz);
      if (closed.has(nid)) continue;
      const target = query(nx, nz);
      if (target.missing) { missing = true; continue; }
      if (!target.walkable) continue;
      // Don't cut diagonally across cliff corners or between two river banks.
      if (dx && dz) {
        const ax = query(current.x + dx, current.z);
        const az = query(current.x, current.z + dz);
        if (ax.missing || az.missing) { missing = true; continue; }
        if (!ax.walkable || !az.walkable) continue;
      }
      const next = pos(nx, nz);
      const crossing = traverseTerrain(store,
        { ...from, y: fromSample.y }, next.x - from.x, next.z - from.z, rules);
      if (!crossing.moved) {
        if (crossing.blockedBy === 'missing-terrain') missing = true;
        continue;
      }
      const distance = Math.hypot(dx, dz) * spacing;
      const cost = current.g + distance + Math.max(0, target.y - fromSample.y) * 0.8;
      const old = best.get(nid);
      if (!old || cost < old.g - 1e-6) {
        const node = { x: nx, z: nz, g: cost, f: cost + heuristic(nx, nz), prev: id };
        best.set(nid, node); open.push(node);
      }
    }
  }
  return { status: visited >= maxVisited ? 'budget-exhausted' :
    missing ? 'awaiting-cells' : 'unreachable', waypoints: [], visited };
}

/**
 * Player vessel can later ask for a nearby physical landing point without
 * inventing dock-only markers. This is an access probe, not ship movement.
 */
export function findShoreApproach(
  store: TerrainCellStore, fromWater: { x: number; z: number },
  searchRadius = 30, angularSamples = 40,
): WorldPosition | null {
  const center = surfaceAt(store, fromWater.x, fromWater.z);
  if (!center || center.waterKind !== 1) return null;
  if (!Number.isFinite(searchRadius) || searchRadius < 1 || searchRadius > 200) {
    throw new RangeError('Invalid shore search radius');
  }
  let best: WorldPosition | null = null;
  let bestDist = Infinity;
  for (let i = 0; i < angularSamples; i++) {
    const theta = i / angularSamples * 2 * Math.PI;
    for (let distance = 2; distance <= searchRadius; distance += 2) {
      const x = fromWater.x + Math.cos(theta) * distance;
      const z = fromWater.z + Math.sin(theta) * distance;
      const sample = surfaceAt(store, x, z);
      if (!sample) break;
      if (!sample.walkable || sample.y < 0.35 || sample.y > 3.5) continue;
      const approach = surfaceAt(store, x - Math.cos(theta) * 2,
        z - Math.sin(theta) * 2);
      if (!approach || approach.y > 0.5) continue;
      const dist = Math.hypot(x - fromWater.x, z - fromWater.z);
      if (dist < bestDist) { best = { x, y: sample.y, z }; bestDist = dist; }
      break;
    }
  }
  return best;
}
