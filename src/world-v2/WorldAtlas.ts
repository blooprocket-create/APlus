import { assertFiniteCoordinate, assertCellSize, type WorldPosition } from './WorldCoordinates';
import { assertWorldId, deriveSeed, hash32 } from './WorldIdentity';

/**
 * These are atlas *declarations*, not a claim that final coastlines or the
 * precise Hearthmere position have been designed. Geometry belongs to Phase 2.
 */
export interface LandmassDeclaration {
  readonly id: string;
  readonly kind: 'continent' | 'island';
  /** Reservation envelope, not a coast/height shape. */
  readonly envelope: {
    readonly minX: number; readonly maxX: number;
    readonly minZ: number; readonly maxZ: number;
  };
}

export interface StoryAnchorDeclaration {
  /** Stable semantic name; never generated from a quest-step index. */
  readonly id: string;
  readonly landmassId: string;
  readonly position: WorldPosition;
  readonly facingRadians?: number;
  /** Space to reserve in Phase 2 terrain and prop placement. */
  readonly clearanceRadius: number;
  /** Declarative connectivity needs; physical traversal is Phase 2. */
  readonly connectsTo?: readonly string[];
}

export interface AtlasDefinition {
  readonly worldId: string;
  readonly worldSeed: string;
  readonly atlasVersion: string;
  readonly generatorVersion: string;
  readonly cellSize: number;
  readonly landmasses: readonly LandmassDeclaration[];
  readonly anchors: readonly StoryAnchorDeclaration[];
}

export interface LandmassManifest extends LandmassDeclaration {
  readonly seed: number;
}
export interface WorldAtlasManifest {
  readonly schemaVersion: 1;
  readonly worldId: string;
  readonly worldSeed: string;
  readonly atlasVersion: string;
  readonly generatorVersion: string;
  readonly cellSize: number;
  readonly landmasses: readonly LandmassManifest[];
  readonly anchors: readonly StoryAnchorDeclaration[];
  /** Hash of the *normalized full* manifest, not a landmass-specific seed. */
  readonly contentHash: string;
}

function finite(value: number, name: string): void {
  assertFiniteCoordinate(value, name);
}

function checkBounds(area: LandmassDeclaration): void {
  const e = area.envelope;
  for (const [name, value] of Object.entries(e)) finite(value, `${area.id}.${name}`);
  if (!(e.minX < e.maxX && e.minZ < e.maxZ)) {
    throw new Error(`Invalid reservation envelope for ${area.id}`);
  }
}

/**
 * Resolves named locations without depending on procedural waypoint arrays.
 * The registry is pure: it does not construct meshes or mutate quest state.
 */
export class StoryAnchorRegistry {
  private readonly map = new Map<string, StoryAnchorDeclaration>();
  constructor(anchors: readonly StoryAnchorDeclaration[]) {
    for (const original of anchors) {
      if (this.map.has(original.id)) throw new Error(`Duplicate story anchor: ${original.id}`);
      const anchor: StoryAnchorDeclaration = Object.freeze({
        ...original,
        position: Object.freeze({ ...original.position }),
        connectsTo: Object.freeze([...(original.connectsTo ?? [])]),
      });
      this.map.set(anchor.id, anchor);
    }
  }
  resolve(id: string): StoryAnchorDeclaration {
    const anchor = this.map.get(id);
    if (!anchor) throw new Error(`Unknown story anchor: ${id}`);
    return anchor;
  }
  has(id: string): boolean { return this.map.has(id); }
  list(): readonly StoryAnchorDeclaration[] { return Object.freeze([...this.map.values()]); }
}

/**
 * Normalizes input arrays before hashing or assigning sub-seeds. Adding a new
 * island changes the atlas hash but NEVER changes existing landmass seeds.
 */
export function buildAtlas(definition: AtlasDefinition): WorldAtlasManifest {
  const { worldId, worldSeed, atlasVersion, generatorVersion } = definition;
  assertWorldId(worldId, 'worldId');
  assertWorldId(atlasVersion, 'atlasVersion');
  assertWorldId(generatorVersion, 'generatorVersion');
  if (!worldSeed || worldSeed.length > 256) throw new Error('worldSeed must be nonempty and <=256 chars');
  const cellSize = assertCellSize(definition.cellSize);
  if (definition.landmasses.length < 1) throw new Error('Atlas must define at least one landmass');

  const seenLandmasses = new Set<string>();
  const landmasses = [...definition.landmasses].map(source => {
    assertWorldId(source.id, 'landmassId');
    if (seenLandmasses.has(source.id)) throw new Error(`Duplicate landmass: ${source.id}`);
    seenLandmasses.add(source.id);
    if (source.kind !== 'continent' && source.kind !== 'island') throw new Error(`Invalid kind: ${source.id}`);
    checkBounds(source);
    return {
      id: source.id, kind: source.kind,
      envelope: { ...source.envelope },
      seed: deriveSeed(worldSeed, 'landmass-v1', source.id),
    } satisfies LandmassManifest;
  }).sort((a, b) => a.id.localeCompare(b.id, 'en'));

  const seenAnchors = new Set<string>();
  const anchors = [...definition.anchors].map(source => {
    assertWorldId(source.id, 'anchorId');
    if (!source.id.includes('.')) throw new Error(`Story anchor must be namespaced: ${source.id}`);
    if (seenAnchors.has(source.id)) throw new Error(`Duplicate story anchor: ${source.id}`);
    seenAnchors.add(source.id);
    if (!seenLandmasses.has(source.landmassId)) {
      throw new Error(`Anchor ${source.id} refers to unknown landmass ${source.landmassId}`);
    }
    const { x, y, z } = source.position;
    finite(x, 'anchor.x'); finite(y, 'anchor.y'); finite(z, 'anchor.z');
    const area = landmasses.find(l => l.id === source.landmassId)!.envelope;
    if (x < area.minX || x > area.maxX || z < area.minZ || z > area.maxZ) {
      throw new Error(`Anchor ${source.id} is outside its reserved landmass envelope`);
    }
    if (!Number.isFinite(source.clearanceRadius) || source.clearanceRadius < 0) {
      throw new Error(`Anchor ${source.id} clearanceRadius is invalid`);
    }
    if (source.facingRadians !== undefined) finite(source.facingRadians, 'anchor.facingRadians');
    const connectsTo = [...(source.connectsTo ?? [])].sort();
    for (const connection of connectsTo) assertWorldId(connection, 'anchor connection');
    if (new Set(connectsTo).size !== connectsTo.length) {
      throw new Error(`Duplicate connection on anchor: ${source.id}`);
    }
    return {
      id: source.id, landmassId: source.landmassId,
      position: { x, y, z },
      ...(source.facingRadians === undefined ? {} : { facingRadians: source.facingRadians }),
      clearanceRadius: source.clearanceRadius, connectsTo,
    } satisfies StoryAnchorDeclaration;
  }).sort((a, b) => a.id.localeCompare(b.id, 'en'));
  for (const anchor of anchors) {
    for (const linked of anchor.connectsTo ?? []) {
      if (!seenAnchors.has(linked)) throw new Error(`Anchor ${anchor.id} connects to missing ${linked}`);
      if (linked === anchor.id) throw new Error(`Anchor ${anchor.id} cannot connect to itself`);
    }
  }

  const normalized = {
    schemaVersion: 1 as const, worldId, worldSeed, atlasVersion,
    generatorVersion, cellSize, landmasses, anchors,
  };
  const contentHash = hash32(JSON.stringify(normalized)).toString(16).padStart(8, '0');
  return Object.freeze({
    ...normalized,
    landmasses: Object.freeze(landmasses.map(l => Object.freeze({
      ...l, envelope: Object.freeze({ ...l.envelope }),
    }))),
    anchors: new StoryAnchorRegistry(anchors).list(),
    contentHash,
  });
}
