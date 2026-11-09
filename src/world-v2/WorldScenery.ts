import { deriveSeed } from './WorldIdentity';
import { sampleCellHeight, type TerrainCell } from './WorldTerrain';

/**
 * Deterministic, development-only scenery placement for visual evaluation.
 * This does not spawn interactable objects, NPCs, resource nodes, or quest props.
 * A future Phase 2 ecology pass owns finalized plant and prop families.
 */
export type SceneryKind = 'pine' | 'round-tree' | 'boulder' | 'shrub';
export interface SceneryPlacement {
  readonly id: string;
  readonly kind: SceneryKind;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly scale: number;
  readonly rotation: number;
  readonly tint: number;
}

function randomStep(state: number): number {
  state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
  return state >>> 0;
}
function sampleBiome(cell: TerrainCell, x: number, z: number) {
  const g = cell.geography;
  if (!g) return null;
  const n = cell.segments;
  const col = Math.max(0, Math.min(n, Math.floor((x - cell.corner.x) / cell.cellSize * n)));
  const row = Math.max(0, Math.min(n, Math.floor((z - cell.corner.z) / cell.cellSize * n)));
  const index = row * (n + 1) + col;
  return {
    biome: g.biomes[index], waterKind: g.waterKinds[index],
    road: g.roads[index],
  };
}

/**
 * Placements are independent of load order and have stable cell-local IDs.
 * Objects are inset from cell edges, so cell boundaries never duplicate them.
 */
export function makeSceneryPlacements(
  cell: TerrainCell, worldSeed: string,
  protectedSites: readonly { position: { x: number; z: number }; clearanceRadius: number }[] = [],
): readonly SceneryPlacement[] {
  if (!cell.geography) return [];
  let state = deriveSeed(worldSeed, 'v2-scenery-review-v1', cell.id) || 1;
  const next = () => { state = randomStep(state); return state / 0x100000000; };
  const entries: SceneryPlacement[] = [];
  const inset = 3;
  const phase = deriveSeed(worldSeed, 'scenery-clusters-v1') / 0x100000000 * Math.PI * 2;
  // Deliberate clearings and woodland clusters instead of even salt-and-pepper
  // scattering. This density mask is global, so it doesn't follow tile edges.
  for (let index = 0; index < 28; index++) {
    const x = cell.corner.x + inset + next() * (cell.cellSize - 2 * inset);
    const z = cell.corner.z + inset + next() * (cell.cellSize - 2 * inset);
    const surface = sampleBiome(cell, x, z);
    const roll = next(), size = next(), rotate = next() * Math.PI * 2;
    if (!surface || surface.waterKind !== 0 || surface.road > 30) continue;
    if (protectedSites.some(site =>
      Math.hypot(site.position.x - x, site.position.z - z) < site.clearanceRadius + 3)) continue;
    const canopyPatch = Math.sin(x * 0.032 + phase) * Math.sin(z * 0.027 - phase * 0.71);
    const patchDensity = Math.max(0.20, Math.min(0.88, 0.58 + canopyPatch * 0.32));
    if (next() > patchDensity) continue;
    let kind: SceneryKind;
    const biome = surface.biome;
    if (biome === 4) { // woods
      if (roll < 0.78) kind = 'pine';
      else kind = 'round-tree';
    } else if (biome === 3) { // meadow
      if (roll < 0.15) kind = 'round-tree';
      else if (roll < 0.44) kind = 'shrub';
      else continue;
    } else if (biome === 5) { // rocky highland
      if (roll < 0.62) kind = 'boulder';
      else if (roll < 0.77) kind = 'pine';
      else continue;
    } else if (biome === 7) {
      if (roll < 0.55) kind = 'boulder';
      else continue;
    } else if (biome === 2) { // shore: only rare rock clusters
      if (roll < 0.14) kind = 'boulder';
      else continue;
    } else if (biome === 6) {
      if (roll < 0.4) kind = 'pine';
      else if (roll < 0.72) kind = 'boulder';
      else continue;
    } else continue;
    // Stronger scale variance than old uniform primitive scenery; stylized
    // silhouettes rather than realistic vegetation are deliberate here.
    const scale = (kind === 'pine' || kind === 'round-tree')
      ? 0.78 + size * 0.85 : 0.65 + size * 0.9;
    entries.push({
      id: `${cell.id}/scenery/${index}`, kind,
      x, y: sampleCellHeight(cell, x, z), z, scale, rotation: rotate,
      tint: next(),
    });
  }
  return entries;
}
