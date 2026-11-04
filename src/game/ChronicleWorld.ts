import { ChronicleChapter, ChronicleSite } from '../types/campaign';
import { PathWaypoint, ProceduralPathLayout } from '../types/world';
import { CHAPTER_ECHOES } from '../data/chronicle';

export interface ChronicleLayout { layout: ProceduralPathLayout; sites: ChronicleSite[] }

function buildLegacyChronicleLayout(chapter: ChronicleChapter): ChronicleLayout {
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
      seed: chapter.seed, version: 1, topology: 'legacy-road', waypoints, connections, segmentCount: connections.length, segmentLength: 22,
      totalDistance: 264, corridorHalfWidth: 5.3,
      encounters: encounters.map(pack => ({ ...pack, enemies: [...pack.enemies] })),
      startPortalPos: { x: waypoints[0].x, z: waypoints[0].z }, endPortalPos: { x: waypoints[12].x, z: waypoints[12].z },
    },
  };
}

function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let n = Math.imul(value ^ value >>> 15, 1 | value);
    n ^= n + Math.imul(n ^ n >>> 7, 61 | n);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}

export function chapterSeed(characterId: string, chapter: ChronicleChapter): number {
  let hash = chapter.seed;
  for (const letter of characterId) hash = Math.imul(hash ^ letter.charCodeAt(0), 16777619);
  return hash >>> 0;
}

/** A connected regional graph with persistent, hero-specific procedural geography. */
export function buildChronicleLayout(chapter: ChronicleChapter, seed = chapter.seed, version: 1 | 2 = 2): ChronicleLayout {
  if (version === 1) return buildLegacyChronicleLayout(chapter);
  const random = seededRandom(seed);
  const waypoints: PathWaypoint[] = [];
  const connections: [number, number][] = [];
  const region = chapter.region;
  const jitter = (range: number) => (random() - 0.5) * range;
  const variation = chapter.seed % 2 ? 1 : -1;
  for (let i = 0; i <= 12; i++) {
    let x = 0; let z = -i * 19;
    switch (region) {
      case 'whispering_woods': x = Math.sin(i * .73) * 23 + jitter(12); z += jitter(8); break;
      case 'ember_coast': x = (i % 2 ? 24 : -18) + jitter(12); z = -i * 16 + jitter(5); break;
      case 'glass_desert': x = Math.sin(i * Math.PI / 3) * 37 + jitter(10); z = -i * 17 + jitter(8); break;
      case 'frostmarch': x = (Math.floor(i / 2) % 2 ? 29 : -25) + jitter(9); z = -i * 17 + jitter(4); break;
      case 'crown_of_night': x = [0, 0, 30, 30, -6, -6, -36, -36, 0, 30, 30, 0, 0][i] + jitter(4); z = -Math.floor((i + 1) / 2) * 30 + jitter(4); break;
      case 'world_heart': x = Math.sin(i * Math.PI / 2.5) * (34 - i * .9) + jitter(6); z = -i * 18 + jitter(5); break;
    }
    waypoints.push({ index: i, x: i === 0 ? 0 : x * variation, z: i === 0 ? 0 : z, radius: i === 11 ? 12 : region === 'glass_desert' ? 12 : region === 'ember_coast' ? 9 : 7 + random() * 3, distanceFromStart: i * 20 });
    if (i > 0) connections.push([i - 1, i]);
  }
  // Three exploration branches, each returning to the next road node rather than a dead end.
  for (const [i, anchorIndex] of [2, 4, 6].entries()) {
    const anchor = waypoints[anchorIndex];
    const index = waypoints.length;
    const side = i % 2 ? 1 : -1;
    waypoints.push({ index, x: anchor.x + side * (24 + random() * 13), z: anchor.z - 8 + jitter(8), radius: 8, distanceFromStart: anchor.distanceFromStart + 10 });
    connections.push([anchorIndex, index], [index, anchorIndex + 1]);
  }
  // Region-specific shortcuts change navigation, sight lines, and encounter approach.
  const shortcuts: Partial<Record<typeof region, [number, number][]>> = {
    whispering_woods: [[1, 4], [5, 8]], glass_desert: [[2, 6], [4, 8], [6, 10]],
    crown_of_night: [[1, 5], [3, 7], [5, 9]], world_heart: [[2, 5], [4, 7], [6, 9]],
  };
  connections.push(...(shortcuts[region] ?? []));
  const sites: ChronicleSite[] = [];
  const battleIndex = chapter.objectives.findIndex(objective => objective.kind === 'battle');
  chapter.objectives.forEach((objective, i) => {
    const node = objective.kind === 'battle' ? 11 : i > battleIndex ? 12 : objective.kind === 'field' ? 1 : objective.kind === 'puzzle' ? 8 : 4 + i;
    const point = waypoints[node];
    sites.push({ id: objective.id, kind: objective.kind, title: objective.title, position: { x: point.x + (i > battleIndex ? (i - battleIndex - 1) * 2 : 0), z: point.z }, objectiveIndex: i });
  });
  for (let i = 0; i < 3; i++) {
    const anchor = waypoints[[3, 7, 9][i]];
    const index = waypoints.length;
    const point = { index, x: anchor.x + (i % 2 ? 1 : -1) * (20 + random() * 10), z: anchor.z + jitter(14), radius: 7, distanceFromStart: anchor.distanceFromStart };
    waypoints.push(point); connections.push([anchor.index, index]);
    const echo = CHAPTER_ECHOES[chapter.id][i];
    sites.push({ id: `${chapter.id}_echo_${i}`, kind: 'echo', title: echo.title, position: { x: point.x, z: point.z }, objectiveIndex: -1, text: echo.text });
  }
  const encounters = waypoints.slice(2, 11).filter((_, i) => random() > (region === 'glass_desert' ? .45 : .15) || i === 0).map(point => ({
    waypointIndex: point.index, x: point.x + jitter(3), z: point.z + jitter(3),
    enemies: region === 'frostmarch' || region === 'crown_of_night' ? ['sentinel', 'sentinel'] as Array<'slime' | 'sentinel'> : random() > .5 ? ['slime', 'slime', 'sentinel'] as Array<'slime' | 'sentinel'> : ['slime', 'sentinel'] as Array<'slime' | 'sentinel'>,
  }));
  const topology = { whispering_woods: 'Branching woodland trails', ember_coast: 'Island causeways and wreck paths', glass_desert: 'Open basins and crossed caravan roads', frostmarch: 'Mountain switchbacks and watchfires', crown_of_night: 'City blocks and patrol shortcuts', world_heart: 'Interlocking archive rings' }[region];
  return { sites, layout: { seed, version: 2, topology, waypoints, connections, encounters, segmentCount: connections.length, segmentLength: 20, totalDistance: 240, corridorHalfWidth: region === 'frostmarch' ? 3.5 : region === 'glass_desert' ? 7 : 5, startPortalPos: { ...waypoints[0] }, endPortalPos: { ...waypoints[12] } } };
}
