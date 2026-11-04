import { CHRONICLE_CHAPTERS } from '../data/chronicle';
import { CampaignState } from '../types/campaign';
import { ZoneId } from '../types/game';
import { PortalTrigger, ProceduralPathLayout } from '../types/world';

export function roadDirectionTarget(layout: ProceduralPathLayout, player: { x: number; z: number }, destination: { x: number; z: number }): { x: number; z: number } {
  const points = layout.waypoints;
  const distance = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);
  const nearest = (point: { x: number; z: number }) => points.reduce((best, candidate) => distance(candidate, point) < distance(points[best], point) ? candidate.index : best, 0);
  const start = nearest(player); const goal = nearest(destination);
  if (start === goal || distance(player, destination) < 5) return destination;
  const costs = points.map(() => Infinity); const previous = points.map(() => -1); const visited = new Set<number>();
  costs[start] = 0;
  const edges = layout.connections ?? points.slice(1).map((_, i) => [i, i + 1] as [number, number]);
  for (let step = 0; step < points.length; step++) {
    let current = -1;
    for (let i = 0; i < points.length; i++) if (!visited.has(i) && (current < 0 || costs[i] < costs[current])) current = i;
    if (current < 0 || !Number.isFinite(costs[current]) || current === goal) break;
    visited.add(current);
    for (const [a, b] of edges) {
      const next = a === current ? b : b === current ? a : -1;
      if (next < 0) continue;
      const cost = costs[current] + distance(points[current], points[next]);
      if (cost < costs[next]) { costs[next] = cost; previous[next] = current; }
    }
  }
  let next = goal;
  while (previous[next] >= 0 && previous[next] !== start) next = previous[next];
  if (previous[next] < 0) return destination;
  const a = points[start]; const b = points[next];
  const dx = b.x - a.x; const dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((player.x - a.x) * dx + (player.z - a.z) * dz) / Math.max(.001, dx * dx + dz * dz)));
  const onEdge = Math.hypot(player.x - (a.x + dx * t), player.z - (a.z + dz * t)) <= layout.corridorHalfWidth;
  return distance(player, a) < a.radius - 1 || onEdge ? b : a;
}

export function nextCampaignChapter(state: CampaignState): number {
  if (state.started && !state.completedChapterIds.includes(CHRONICLE_CHAPTERS[state.chapterIndex].id)) return state.chapterIndex;
  const next = CHRONICLE_CHAPTERS.findIndex(chapter => !state.completedChapterIds.includes(chapter.id));
  return next < 0 ? 0 : next;
}

/** The atlas is optional fast travel. Every forward campaign connection also exists in the world. */
export function campaignRoads(state: CampaignState, zone: ZoneId, layout: ProceduralPathLayout | null): PortalTrigger[] {
  const gate = (id: string, label: string, targetZone: ZoneId, x: number, z: number, extra: Partial<PortalTrigger> = {}): PortalTrigger => ({
    id, label, subtitle: 'Walk through to travel', targetZone, targetSpawnTag: 'from_bellroad', position: { x, z }, radius: 2.2, colorHex: 0xd7bb86, ...extra,
  });
  if (zone === 'starting_town' || zone === 'market_crossing') {
    const index = nextCampaignChapter(state);
    return [
      gate('bellroad_outbound', `Bellroad · ${CHRONICLE_CHAPTERS[index].title}`, CHRONICLE_CHAPTERS[index].region, 14.5, 0, { targetChapterIndex: index }),
      gate('bellroad_town_link', zone === 'starting_town' ? 'Market Crossing · resupply' : 'Aetherhaven · home', zone === 'starting_town' ? 'market_crossing' : 'starting_town', -14.5, 0),
    ];
  }
  if (!layout) return [];
  const chapter = CHRONICLE_CHAPTERS[state.chapterIndex];
  const next = CHRONICLE_CHAPTERS[state.chapterIndex + 1];
  const camp = layout.endPortalPos;
  const home: ZoneId = state.chapterIndex < 2 ? 'starting_town' : 'market_crossing';
  const roads = [gate('bellroad_return', home === 'starting_town' ? 'Aetherhaven · rest and supplies' : 'Market Crossing · rest and supplies', home, layout.startPortalPos.x, layout.startPortalPos.z + 3)];
  const direct = next && next.region === chapter.region;
  roads.push(gate('bellroad_forward', !next ? 'Home · Aetherhaven' : direct ? `Onward · ${next.title}` : `Market Crossing · road to ${next.title}`, !next ? 'starting_town' : direct ? next.region : 'market_crossing', camp.x + 4, camp.z - 3, {
    requiresChapterId: chapter.id, ...(direct ? { targetChapterIndex: state.chapterIndex + 1 } : {}),
  }));
  return roads;
}
