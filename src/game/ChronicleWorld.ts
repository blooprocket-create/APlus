import { ChronicleChapter, ChronicleSite } from '../types/campaign';
import { PathWaypoint, ProceduralPathLayout } from '../types/world';
import { CHAPTER_ECHOES } from '../data/chronicle';

export interface ChronicleLayout { layout: ProceduralPathLayout; sites: ChronicleSite[] }

export function buildChronicleLayout(chapter: ChronicleChapter): ChronicleLayout {
  const waypoints: PathWaypoint[] = [];
  const connections: [number, number][] = [];
  for (let i = 0; i <= 12; i++) {
    waypoints.push({ index: i, x: Math.sin(i * 0.7 + chapter.seed) * 14, z: -i * 22, radius: i === 11 ? 10 : 7, distanceFromStart: i * 22 });
    if (i > 0) connections.push([i - 1, i]);
  }
  const branch = (at: number, side: number) => {
    const anchor = waypoints[at];
    const index = waypoints.length;
    const point = { index, x: anchor.x + side * 23, z: anchor.z - 8, radius: 7, distanceFromStart: anchor.distanceFromStart };
    waypoints.push(point); connections.push([at, index], [index, at + 1]);
    return point;
  };
  const sites: ChronicleSite[] = [];
  const battleIndex = chapter.objectives.findIndex(objective => objective.kind === 'battle');
  chapter.objectives.forEach((objective, i) => {
    let point: PathWaypoint;
    if (objective.kind === 'battle') point = waypoints[11];
    else if (i > battleIndex) point = { ...waypoints[12], x: waypoints[12].x + (i - battleIndex - 1) * 3 };
    else if (objective.kind === 'puzzle') point = branch(7, 1);
    else point = waypoints[2 + i * 3];
    sites.push({ id: objective.id, kind: objective.kind, title: objective.title, position: { x: point.x, z: point.z }, objectiveIndex: i });
  });
  [3, 5, 9].forEach((at, i) => {
    const point = branch(at, -1);
    const echo = CHAPTER_ECHOES[chapter.id][i];
    sites.push({ id: `${chapter.id}_echo_${i}`, title: echo.title, kind: 'echo', position: { x: point.x, z: point.z }, objectiveIndex: -1, text: echo.text });
  });
  const encounters = Array.from({ length: 9 }, (_, i) => ({ waypointIndex: i + 1, x: waypoints[i + 1].x, z: waypoints[i + 1].z, enemies: i % 3 === 0 ? ['sentinel', 'slime', 'slime'] as const : ['slime', 'sentinel'] as const }));
  return {
    sites,
    layout: {
      seed: chapter.seed, waypoints, connections, segmentCount: connections.length, segmentLength: 22,
      totalDistance: 264, corridorHalfWidth: 5.3,
      encounters: encounters.map(pack => ({ ...pack, enemies: [...pack.enemies] })),
      startPortalPos: { x: waypoints[0].x, z: waypoints[0].z }, endPortalPos: { x: waypoints[12].x, z: waypoints[12].z },
    },
  };
}
