import type { WorldAtlasManifest, StoryAnchorDeclaration } from './WorldAtlas';

/**
 * Phase 2 analytic geography prototype. Everything is a pure world-space
 * function: cell load order, camera position and player save never affect it.
 * +Y is elevation, y=0 is sea level; +Z is south.
 *
 * This is a real continent/island and coastline algorithm, NOT a finished
 * authored world layout or a physically complete river-flow simulator.
 */
export type Biome = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const BIOME_LABELS = [
  'deep-ocean', 'shallow-ocean', 'beach', 'grassland',
  'forest', 'highlands', 'snow', 'drylands',
] as const;
export type WaterKind = 0 | 1 | 2; // dry, ocean, river
export interface GeographicalLandmass {
  readonly id: string;
  readonly cx: number;
  readonly cz: number;
  readonly radiusX: number;
  readonly radiusZ: number;
  readonly rotation: number;
  readonly coastRoughness: number;
  readonly elevationScale: number;
  readonly climateOffset: number;
  readonly riverAngles: readonly number[];
}
export interface GeographyDefinition {
  readonly schemaVersion: 1;
  readonly profile: 'geography-stage-v1';
  readonly seaLevel: 0;
  /** Only declared landmasses have coast masks; unclaimed space is ocean. */
  readonly landmasses: readonly GeographicalLandmass[];
}
export interface GeographySample {
  readonly height: number;
  readonly waterLevel: number;
  readonly waterKind: WaterKind;
  readonly biome: Biome;
  readonly road: number;
  readonly temperature: number;
  readonly moisture: number;
  readonly coastDistance: number;
  readonly landmassId: string | null;
}
export interface RiverPoint { readonly x: number; readonly z: number; readonly waterLevel: number }
export interface RiverPath {
  readonly id: string;
  readonly landmassId: string;
  readonly points: readonly RiverPoint[];
  readonly halfWidth: number;
}
export interface GeographyWorld {
  readonly atlas: WorldAtlasManifest;
  readonly definition: GeographyDefinition;
  readonly rivers: readonly RiverPath[];
  sample(x: number, z: number): GeographySample;
  coastDistance(x: number, z: number): number;
}
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = (t: number) => { const c = clamp(t); return c * c * (3 - 2 * c); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function hashLattice(seed: number, x: number, z: number): number {
  let h = seed ^ Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(z | 0, 0x165667b1);
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15; h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) / 0xffffffff;
}
function valueNoise(seed: number, x: number, z: number): number {
  const ix = Math.floor(x), iz = Math.floor(z);
  const u = smooth(x - ix), v = smooth(z - iz);
  const a = lerp(hashLattice(seed, ix, iz), hashLattice(seed, ix + 1, iz), u);
  const b = lerp(hashLattice(seed, ix, iz + 1), hashLattice(seed, ix + 1, iz + 1), u);
  return lerp(a, b, v) * 2 - 1;
}
function fractal(seed: number, x: number, z: number): number {
  return valueNoise(seed, x / 110, z / 110) * 0.55
    + valueNoise(seed ^ 0xa84ce331, x / 38, z / 38) * 0.3
    + valueNoise(seed ^ 0xeaf72a19, x / 14, z / 14) * 0.15;
}
function localCoord(land: GeographicalLandmass, x: number, z: number) {
  const dx = x - land.cx, dz = z - land.cz;
  const cos = Math.cos(land.rotation), sin = Math.sin(land.rotation);
  return { x: dx * cos + dz * sin, z: -dx * sin + dz * cos };
}
function pointAt(land: GeographicalLandmass, angle: number, radial: number): { x: number; z: number } {
  const x = Math.cos(angle) * radial * land.radiusX;
  const z = Math.sin(angle) * radial * land.radiusZ;
  const cos = Math.cos(land.rotation), sin = Math.sin(land.rotation);
  return { x: land.cx + x * cos - z * sin, z: land.cz + x * sin + z * cos };
}
/** Coast shape uses angular harmonics; no discontinuity across the 2π seam. */
function signedCoast(land: GeographicalLandmass, seed: number, x: number, z: number): number {
  const p = localCoord(land, x, z);
  const theta = Math.atan2(p.z / land.radiusZ, p.x / land.radiusX);
  const radius = Math.hypot(p.x / land.radiusX, p.z / land.radiusZ);
  const phase = (seed % 1000) * 0.006283185307179586;
  const ripple = (0.12 * Math.sin(theta * 3 + phase) +
    0.052 * Math.sin(theta * 7 - phase * 1.8) +
    0.025 * Math.cos(theta * 11 + phase * 0.7)) * land.coastRoughness;
  return (1 + ripple - radius) * Math.min(land.radiusX, land.radiusZ);
}
function rawElevation(land: GeographicalLandmass, seed: number, x: number, z: number, inland: number): number {
  const rough = fractal(seed, x, z);
  const mountain = Math.max(0, fractal(seed ^ 0x42b5a31e, x * 0.68 + 231, z * 0.68 - 19));
  return Math.max(0.04, inland * land.elevationScale * 0.11 +
    smooth(inland / 22) * (Math.max(0, rough * 9) + Math.pow(mountain, 2) * land.elevationScale * 1.55));
}
function segmentDistance(x: number, z: number, a: { x: number; z: number }, b: { x: number; z: number }) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / Math.max(0.000001, dx * dx + dz * dz));
  return { distance: Math.hypot(x - a.x - dx * t, z - a.z - dz * t), t };
}
function shapeRoads(anchors: readonly StoryAnchorDeclaration[]) {
  const indexed = new Map(anchors.map(a => [a.id, a]));
  const pairKeys = new Set<string>();
  const roads: { a: StoryAnchorDeclaration; b: StoryAnchorDeclaration }[] = [];
  for (const anchor of anchors) for (const id of anchor.connectsTo ?? []) {
    const other = indexed.get(id)!;
    const key = [anchor.id, id].sort().join('|');
    if (pairKeys.has(key)) continue;
    pairKeys.add(key);
    if (other.landmassId !== anchor.landmassId) throw new Error('An overland road cannot connect separate landmasses');
    roads.push({ a: anchor, b: other });
  }
  return roads;
}
function riverPaths(land: GeographicalLandmass, seed: number): RiverPath[] {
  return land.riverAngles.map((angle, index) => {
    const points: RiverPoint[] = [];
    // A monotonic headwater-to-sea channel, following a gently meandering
    // radial basin. This is a constrained drainage placeholder, not erosion.
    const sourceAngle = angle + Math.sin(seed * 0.00001) * 0.13;
    const sourceRadial = 0.29;
    const n = 44;
    const first = pointAt(land, sourceAngle, sourceRadial);
    const inland = Math.max(0, signedCoast(land, seed, first.x, first.z));
    const sourceWater = Math.max(4.2, Math.min(land.elevationScale * 2, rawElevation(land, seed, first.x, first.z, inland) * 0.55));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const theta = sourceAngle + Math.sin(t * Math.PI * 2 + index) * Math.sin(Math.PI * t) * 0.11;
      const point = pointAt(land, theta, lerp(sourceRadial, 1.30, t));
      points.push({
        ...point,
        waterLevel: sourceWater * (1 - smooth(t / 0.77)),
      });
    }
    return {
      id: `${land.id}.river-${index + 1}`, landmassId: land.id,
      points, halfWidth: 3.4 + (seed % 7) * 0.45,
    };
  });
}

export function createGeography(atlas: WorldAtlasManifest, definition: GeographyDefinition): GeographyWorld {
  if (definition.schemaVersion !== 1 || definition.profile !== 'geography-stage-v1' || definition.seaLevel !== 0) {
    throw new Error('Unsupported Phase 2 geography schema/profile');
  }
  if (definition.landmasses.length !== atlas.landmasses.length) {
    throw new Error('Geography must define precisely one shape per atlas landmass');
  }
  const seeds = new Map(atlas.landmasses.map(l => [l.id, l.seed]));
  const shapes = [...definition.landmasses].sort((a, b) => a.id.localeCompare(b.id, 'en'));
  const seen = new Set<string>();
  for (const land of shapes) {
    if (seen.has(land.id) || !seeds.has(land.id)) throw new Error(`Unknown or duplicate geography landmass ${land.id}`);
    seen.add(land.id);
    for (const field of ['cx', 'cz', 'radiusX', 'radiusZ', 'rotation', 'coastRoughness', 'elevationScale', 'climateOffset'] as const) {
      if (!Number.isFinite(land[field])) throw new Error(`Invalid ${field} on ${land.id}`);
    }
    if (land.radiusX < 40 || land.radiusZ < 40 || land.coastRoughness < 0 || land.coastRoughness > 2 ||
      land.elevationScale <= 0 || !Array.isArray(land.riverAngles) || land.riverAngles.length > 8 ||
      !land.riverAngles.every(Number.isFinite)) throw new Error(`Invalid geography shape ${land.id}`);
    const reserved = atlas.landmasses.find(l => l.id === land.id)!.envelope;
    const r = Math.max(land.radiusX, land.radiusZ) * (1 + land.coastRoughness * 0.21);
    if (land.cx - r < reserved.minX || land.cx + r > reserved.maxX ||
      land.cz - r < reserved.minZ || land.cz + r > reserved.maxZ) {
      throw new Error(`Coastal footprint outside ${land.id} reservation envelope`);
    }
  }
  for (let i = 0; i < shapes.length; i++) for (let j = i + 1; j < shapes.length; j++) {
    const a = shapes[i], b = shapes[j];
    const ra = Math.max(a.radiusX, a.radiusZ) * 1.21;
    const rb = Math.max(b.radiusX, b.radiusZ) * 1.21;
    if (Math.hypot(a.cx - b.cx, a.cz - b.cz) <= ra + rb) {
      throw new Error(`Landmass envelopes overlap or lack safe sea separation: ${a.id} / ${b.id}`);
    }
  }
  for (const anchor of atlas.anchors) {
    const land = shapes.find(l => l.id === anchor.landmassId)!;
    if (signedCoast(land, seeds.get(land.id)!, anchor.position.x, anchor.position.z) <
      Math.max(9, anchor.clearanceRadius + 5)) {
      throw new Error(`Story anchor ${anchor.id} is too close to the coast or underwater`);
    }
  }
  const roads = shapeRoads(atlas.anchors);
  // Roads must stay physically on the assigned landmass; otherwise they would
  // require a bridge or dock, which should be modeled as explicit story content.
  for (const road of roads) {
    const shape = shapes.find(s => s.id === road.a.landmassId)!;
    for (let i = 0; i <= 32; i++) {
      const t = i / 32;
      if (signedCoast(shape, seeds.get(shape.id)!, lerp(road.a.position.x, road.b.position.x, t),
        lerp(road.a.position.z, road.b.position.z, t)) <= 7) {
        throw new Error(`Road ${road.a.id} → ${road.b.id} would cross untraversable coastline`);
      }
    }
  }
  const rivers = shapes.flatMap(s => riverPaths(s, seeds.get(s.id)!));
  // Freeze public declaration from untrusted mutable caller data.
  const publicDefinition: GeographyDefinition = {
    schemaVersion: 1, profile: 'geography-stage-v1', seaLevel: 0,
    landmasses: shapes.map(s => ({ ...s, riverAngles: [...s.riverAngles] })),
  };
  function coastDistance(x: number, z: number): number {
    if (!Number.isFinite(x) || !Number.isFinite(z)) throw new RangeError('Non-finite geography coordinate');
    return Math.max(...shapes.map(s => signedCoast(s, seeds.get(s.id)!, x, z)));
  }
  function sample(x: number, z: number): GeographySample {
    if (!Number.isFinite(x) || !Number.isFinite(z)) throw new RangeError('Non-finite geography coordinate');
    let land: GeographicalLandmass | null = null;
    let inland = -Infinity;
    for (const s of shapes) {
      const d = signedCoast(s, seeds.get(s.id)!, x, z);
      if (d > inland) { inland = d; land = s; }
    }
    if (!land || inland <= 0) {
      return { height: inland * 0.16, waterLevel: 0, waterKind: 1,
        biome: inland < -34 ? 0 : 1, road: 0,
        temperature: clamp(0.58 - z / 13000),
        moisture: 1, coastDistance: inland, landmassId: null };
    }
    const seed = seeds.get(land.id)!;
    let height = rawElevation(land, seed, x, z, inland);
    let road = 0;
    for (const anchor of atlas.anchors) {
      if (anchor.landmassId !== land.id) continue;
      const dist = Math.hypot(anchor.position.x - x, anchor.position.z - z);
      const influence = 1 - smooth((dist - anchor.clearanceRadius) / 20);
      if (dist <= anchor.clearanceRadius + 20) {
        height = lerp(height, anchor.position.y, influence);
      }
    }
    for (const segment of roads) {
      if (segment.a.landmassId !== land.id) continue;
      const closest = segmentDistance(x, z, segment.a.position, segment.b.position);
      if (closest.distance >= 11) continue;
      const influence = 1 - smooth((closest.distance - 3.5) / 7.5);
      const target = lerp(segment.a.position.y, segment.b.position.y, closest.t);
      height = lerp(height, target, influence);
      road = Math.max(road, Math.round(clamp(1 - closest.distance / 6) * 255));
    }
    let waterKind: WaterKind = 0;
    let waterLevel = 0;
    for (const river of rivers) {
      if (river.landmassId !== land.id) continue;
      const points = river.points;
      for (let index = 1; index < points.length; index++) {
        const previous = points[index - 1], next = points[index];
        const closest = segmentDistance(x, z, previous, next);
        if (closest.distance >= river.halfWidth * 2.1) continue;
        const level = lerp(previous.waterLevel, next.waterLevel, closest.t);
        const core = clamp(1 - closest.distance / river.halfWidth);
        const bank = 1 - smooth((closest.distance - river.halfWidth) / (river.halfWidth * 1.1));
        const depth = Math.max(1.1, 1.4 * core);
        height = lerp(height, Math.min(height, level - depth), bank);
        if (core > 0 && (waterKind === 0 || level > waterLevel)) {
          waterLevel = level;
          waterKind = 2;
        }
      }
    }
    const temperature = clamp(0.71 + land.climateOffset - Math.abs(z) / 6800 - height / 230 +
      valueNoise(seed ^ 0x47245a9d, x / 2, z / 2) * 0.08);
    const moisture = clamp(0.49 + valueNoise(seed ^ 0x8bd18a13, x / 1.4, z / 1.4) * 0.27 +
      (Math.abs(inland) < 45 ? 0.15 : 0) + (waterKind === 2 ? 0.24 : 0));
    let biome: Biome = 3;
    if (height > 65 && temperature < 0.37) biome = 6;
    else if (height > 38) biome = 5;
    else if (inland < 15 && road === 0) biome = 2;
    else if (temperature > 0.72 && moisture < 0.41) biome = 7;
    else if (moisture > 0.56) biome = 4;
    return { height, waterLevel, waterKind, biome, road, temperature, moisture,
      coastDistance: inland, landmassId: land.id };
  }
  return { atlas, definition: publicDefinition, rivers, sample, coastDistance };
}
