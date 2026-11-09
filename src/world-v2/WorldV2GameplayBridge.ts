import { StoryAnchorRegistry, type StoryAnchorDeclaration } from './WorldAtlas';
import { decodeCompiledCell, findCompiledCell, validateCompiledAtlasIndex, type CompiledAtlasIndex } from './WorldArtifacts';
import { WorldCellStreamer, type CellLoader, type CellStreamerOptions } from './WorldCellStreamer';
import { renderOriginFor, type WorldPosition, type WorldCellCoordinate } from './WorldCoordinates';
import type { TerrainCell } from './WorldTerrain';

/** The only source of cell bytes for the Phase 1 preview is the offline bake. */
export interface WorldArtifactTransport {
  read(relativePath: string, signal?: AbortSignal): Promise<string>;
}

export class HttpWorldArtifactTransport implements WorldArtifactTransport {
  constructor(private readonly basePath = '/world-v2/preview') {}
  async read(relativePath: string, signal?: AbortSignal): Promise<string> {
    if (!/^(?:atlas-index\.json|cells\/0\/-?\d+\/-?\d+\.json)$/.test(relativePath)) {
      throw new Error('World V2: disallowed artifact path');
    }
    const response = await fetch(this.basePath.replace(/\/$/, '') + '/' + relativePath, { signal });
    if (!response.ok) throw new Error(`World V2 artifact HTTP ${response.status}: ${relativePath}`);
    return response.text();
  }
}

function checksumBytes(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function verifySha256(text: string, expected: string): Promise<void> {
  if (!globalThis.crypto?.subtle) throw new Error('World V2 requires a secure-origin SHA-256 verifier');
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  const actual = checksumBytes(new Uint8Array(digest));
  if (actual !== expected) throw new Error('World V2 cell digest mismatch; refusing corrupt/stale content');
}

export class WorldV2ArtifactSource {
  readonly anchors: StoryAnchorRegistry;
  private readonly available: Map<string, true>;

  private constructor(
    readonly catalog: CompiledAtlasIndex,
    private readonly transport: WorldArtifactTransport,
  ) {
    this.anchors = new StoryAnchorRegistry(catalog.atlas.anchors);
    this.available = new Map(catalog.cells.map(ref => [`${ref.coordinate.x}:${ref.coordinate.z}`, true]));
  }

  static async open(transport: WorldArtifactTransport): Promise<WorldV2ArtifactSource> {
    const raw = await transport.read('atlas-index.json');
    const catalog = validateCompiledAtlasIndex(JSON.parse(raw) as unknown);
    return new WorldV2ArtifactSource(catalog, transport);
  }

  hasCell(address: WorldCellCoordinate): boolean {
    return this.available.has(`${address.x}:${address.z}`);
  }

  resolveAnchor(id: string): StoryAnchorDeclaration {
    return this.anchors.resolve(id);
  }

  async loadTerrainCell(address: WorldCellCoordinate, signal: AbortSignal): Promise<TerrainCell> {
    const ref = findCompiledCell(this.catalog, address);
    if (!ref) throw new Error(`World V2 cell is not in published catalog: ${address.x},${address.z}`);
    const raw = await this.transport.read(ref.path, signal);
    if (signal.aborted) throw new Error('World V2 cell load was cancelled');
    await verifySha256(raw, ref.sha256);
    if (signal.aborted) throw new Error('World V2 cell load was cancelled');
    const cell = decodeCompiledCell(JSON.parse(raw) as unknown, this.catalog.atlas, ref, this.catalog.segments);
    if (this.catalog.profile === 'geography-stage-v1' && !cell.geography) {
      throw new Error('World V2 geographic cell is missing water/biome/road classifications');
    }
    return cell;
  }
}

/** Engine-facing, generic resource-agnostic seam; no dependency on THREE or legacy routes. */
export interface WorldV2GameplayPort {
  update(position: Pick<WorldPosition, 'x' | 'z'>, heading: { x: number; z: number }): void;
  resolveAnchor(id: string): StoryAnchorDeclaration;
  renderOrigin(position: WorldPosition): WorldPosition;
  dispose(): void;
}

/**
 * Narrow runtime bridge intended for GameEngine integration.
 * Scene rendering is delegated to a loader; quests and saving never depend
 * on cell meshes, and world coordinates are never overwritten by render-local.
 */
export class WorldV2GameplayBridge<Resource> implements WorldV2GameplayPort {
  readonly anchors: StoryAnchorRegistry;
  readonly streamer: WorldCellStreamer<Resource>;
  readonly worldId: string;
  readonly atlasHash: string;
  readonly cellSize: number;

  constructor(
    readonly source: WorldV2ArtifactSource,
    loader: CellLoader<Resource>,
    options: Pick<CellStreamerOptions,
      'activeRadius' | 'warmRadius' | 'lookAheadDistance' | 'maxConcurrentLoads' | 'maxLoadsPerUpdate'>,
  ) {
    const atlas = source.catalog.atlas;
    this.anchors = source.anchors;
    this.worldId = atlas.worldId;
    this.atlasHash = atlas.contentHash;
    this.cellSize = atlas.cellSize;
    this.streamer = new WorldCellStreamer({
      ...options, worldId: atlas.worldId, cellSize: atlas.cellSize,
      isAvailable: address => source.hasCell(address),
    }, loader);
  }

  /** GameEngine calls once per streaming frame with authoritative actor state. */
  update(position: Pick<WorldPosition, 'x' | 'z'>, heading: { x: number; z: number }): void {
    this.streamer.update(position, heading);
  }

  resolveAnchor(id: string): StoryAnchorDeclaration {
    return this.anchors.resolve(id);
  }

  renderOrigin(position: WorldPosition): WorldPosition {
    return renderOriginFor(position, this.cellSize);
  }

  dispose(): void { this.streamer.dispose(); }
}
