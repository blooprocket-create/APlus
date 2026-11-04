import {
  PathWaypoint,
  ProceduralEncounterPack,
  ProceduralPathLayout,
} from '../types/world';

export const STOMPING_GROUNDS_SEGMENTS = 8;
export const STOMPING_GROUNDS_SEGMENT_LENGTH = 14;
export const STOMPING_GROUNDS_TOTAL_DISTANCE =
  STOMPING_GROUNDS_SEGMENTS * STOMPING_GROUNDS_SEGMENT_LENGTH; // Always 112.0 units
export const STOMPING_GROUNDS_CORRIDOR_HALF_WIDTH = 4.2;

function createSeededRandom(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates a procedural single-path layout for the Stomping Grounds.
 * Enforces:
 * 1. Exact invariant total path distance (112.0 units across 8 segments of 14.0 units).
 * 2. Continuous forward progression from Starting Town portal (Waypoint 0) to Market Crossing portal (Waypoint 8) without loops.
 * 3. Deterministic pacing of enemy encounter packs along the single path.
 */
export function generateStompingGroundsPath(
  seed: number = Math.floor(Math.random() * 1_000_000) + 1
): ProceduralPathLayout {
  const rng = createSeededRandom(seed);
  const waypoints: PathWaypoint[] = [
    {
      index: 0,
      x: 0,
      z: 0,
      radius: 5.5,
      distanceFromStart: 0,
    },
  ];

  let heading = 0; // 0 rad = straight north (-Z)
  let currentX = 0;
  let currentZ = 0;

  for (let i = 1; i <= STOMPING_GROUNDS_SEGMENTS; i++) {
    // Choose a turn angle while keeping the path flowing forward (no self-intersections)
    const rawTurn = (rng() - 0.5) * 1.16; // ~ -33 deg to +33 deg
    heading += rawTurn;

    // Softly steer back toward center if heading drifts too far east/west
    if (heading > 0.85) {
      heading = 0.85 - rng() * 0.35;
    } else if (heading < -0.85) {
      heading = -0.85 + rng() * 0.35;
    }

    currentX += Math.sin(heading) * STOMPING_GROUNDS_SEGMENT_LENGTH;
    currentZ -= Math.cos(heading) * STOMPING_GROUNDS_SEGMENT_LENGTH;

    const isPortalEnd = i === STOMPING_GROUNDS_SEGMENTS;
    const isBossNode = i === STOMPING_GROUNDS_SEGMENTS - 1;

    waypoints.push({
      index: i,
      x: Number(currentX.toFixed(3)),
      z: Number(currentZ.toFixed(3)),
      radius: isBossNode ? 6.6 : isPortalEnd ? 5.8 : 5.0,
      distanceFromStart: i * STOMPING_GROUNDS_SEGMENT_LENGTH,
    });
  }

  // Build enemy encounter packs along Waypoints 1..7 (Waypoint 0 and 8 are portal landings)
  const encounters: ProceduralEncounterPack[] = [];
  for (let i = 1; i < STOMPING_GROUNDS_SEGMENTS; i++) {
    const wp = waypoints[i];
    if (i === 1 || i === 2) {
      encounters.push({
        waypointIndex: i,
        x: wp.x,
        z: wp.z,
        enemies: i === 1 ? ['slime', 'slime', 'slime'] : ['slime', 'slime', 'sentinel'],
      });
    } else if (i === 3 || i === 4) {
      encounters.push({
        waypointIndex: i,
        x: wp.x,
        z: wp.z,
        enemies: ['sentinel', 'slime', 'slime', 'sentinel'],
      });
    } else if (i === 5 || i === 6) {
      encounters.push({
        waypointIndex: i,
        x: wp.x,
        z: wp.z,
        enemies: ['sentinel', 'sentinel', 'slime', 'slime', 'slime'],
      });
    } else if (i === 7) {
      // Gatekeeper Boss Clearing right before Market Crossing portal
      encounters.push({
        waypointIndex: i,
        x: wp.x,
        z: wp.z,
        enemies: ['boss_knight', 'sentinel', 'sentinel'],
      });
    }
  }

  const firstWp = waypoints[0];
  const lastWp = waypoints[waypoints.length - 1];

  return {
    seed,
    totalDistance: STOMPING_GROUNDS_TOTAL_DISTANCE,
    segmentCount: STOMPING_GROUNDS_SEGMENTS,
    segmentLength: STOMPING_GROUNDS_SEGMENT_LENGTH,
    corridorHalfWidth: STOMPING_GROUNDS_CORRIDOR_HALF_WIDTH,
    waypoints,
    encounters,
    startPortalPos: { x: firstWp.x, z: firstWp.z },
    endPortalPos: { x: lastWp.x, z: lastWp.z },
  };
}

/**
 * Clamps any 2D (x, z) coordinate so it stays inside the single-path corridor
 * or waypoint clearings of the procedural Stomping Grounds layout, and also
 * returns the normalized progress (0..1) along the path.
 */
export function clampToProceduralPath(
  x: number,
  z: number,
  layout: ProceduralPathLayout,
  margin = 0.45
): { x: number; z: number; progress: number; closestSegmentIndex: number } {
  // Clearings are walkable discs even where a different, narrower road passes nearby.
  const clearing = layout.waypoints.find(point => Math.hypot(x - point.x, z - point.z) <= point.radius - margin);
  if (clearing) return { x, z, progress: Math.max(0, Math.min(1, clearing.distanceFromStart / Math.max(1, layout.totalDistance))), closestSegmentIndex: Math.max(0, clearing.index - 1) };
  let bestDistSq = Infinity;
  let bestClosestX = layout.waypoints[0].x;
  let bestClosestZ = layout.waypoints[0].z;
  let bestAllowedRadius = layout.corridorHalfWidth;
  let bestDistanceAlongPath = 0;
  let bestSegmentIdx = 0;

  const edges = layout.connections ?? layout.waypoints.slice(1).map((_, i) => [i, i + 1] as [number, number]);
  for (let i = 0; i < edges.length; i++) {
    const a = layout.waypoints[edges[i][0]];
    const b = layout.waypoints[edges[i][1]];
    const abx = b.x - a.x;
    const abz = b.z - a.z;
    const abLenSq = abx * abx + abz * abz;

    let t = 0;
    if (abLenSq > 0.0001) {
      t = ((x - a.x) * abx + (z - a.z) * abz) / abLenSq;
      t = Math.max(0, Math.min(1, t));
    }

    const cx = a.x + abx * t;
    const cz = a.z + abz * t;
    const dx = x - cx;
    const dz = z - cz;
    const dSq = dx * dx + dz * dz;

    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      bestClosestX = cx;
      bestClosestZ = cz;
      bestSegmentIdx = i;
      bestDistanceAlongPath = a.distanceFromStart + t * (layout.connections ? b.distanceFromStart - a.distanceFromStart : layout.segmentLength);

      // Expand walkable width smoothly near clearing waypoints
      const clearingRadius =
        t < 0.25 ? a.radius : t > 0.75 ? b.radius : layout.corridorHalfWidth;
      bestAllowedRadius = Math.max(layout.corridorHalfWidth, clearingRadius) - margin;
    }
  }

  const dist = Math.sqrt(bestDistSq);
  let clampedX = x;
  let clampedZ = z;

  if (dist > bestAllowedRadius && dist > 0.0001) {
    const scale = bestAllowedRadius / dist;
    clampedX = bestClosestX + (x - bestClosestX) * scale;
    clampedZ = bestClosestZ + (z - bestClosestZ) * scale;
  }

  const progress = Math.max(
    0,
    Math.min(1, bestDistanceAlongPath / Math.max(1, layout.totalDistance))
  );

  return {
    x: clampedX,
    z: clampedZ,
    progress,
    closestSegmentIndex: bestSegmentIdx,
  };
}
