import type { WorldPosition } from './WorldCoordinates';
import {
  surfaceAt,
  traverseTerrain,
  type TerrainCellStore,
  type TraversalResult,
} from './WorldSurface';

export interface WorldObstacle {
  readonly x: number;
  readonly z: number;
  readonly radius: number;
}

/** Short swept steps check the same loaded ground and scenery footprints.
 * Unloaded terrain remains blocked, including dash/attack displacement.
 * Obstacles never alter the canonical baked terrain or its sample heights. */
export function moveWorldActor(
  store: TerrainCellStore,
  obstacles: readonly WorldObstacle[],
  from: WorldPosition,
  dx: number,
  dz: number,
  radius = 0.35,
): TraversalResult {
  if (![radius, dx, dz].every(Number.isFinite) || radius < 0)
    throw new RangeError('Invalid actor sweep');
  let position = from,
    moved = false;
  let blockedBy: TraversalResult['blockedBy'] = null;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.2));
  const occupied = (p: WorldPosition) =>
    obstacles.some((o) => Math.hypot(p.x - o.x, p.z - o.z) < o.radius + radius);
  for (let i = 0; i < steps; i++) {
    const full = traverseTerrain(store, position, dx / steps, dz / steps);
    let next = full;
    if (full.moved && occupied(full.position)) {
      const x = traverseTerrain(store, position, dx / steps, 0);
      const z = traverseTerrain(store, position, 0, dz / steps);
      next =
        x.moved && !occupied(x.position)
          ? x
          : z.moved && !occupied(z.position)
            ? z
            : { position, moved: false, blockedBy: null };
    }
    if (next.moved) {
      position = next.position;
      moved = true;
    } else {
      blockedBy = next.blockedBy;
      break;
    }
  }
  // Ground a stationary actor too, but never invent Y=0 for missing cells.
  const ground = surfaceAt(store, position.x, position.z);
  if (ground) position = { ...position, y: ground.y };
  return { position, moved, blockedBy };
}
