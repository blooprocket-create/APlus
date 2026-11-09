import { StoryAnchorRegistry, type StoryAnchorDeclaration } from './WorldAtlas';
import { decodeCompiledCell, findCompiledCell, validateCompiledAtlasIndex,
  validateCompiledCellPage, WORLD_PAGE_SIZE,
  type CompiledAtlasIndex, type CompiledCellPage,
  type CompiledPageReference } from './WorldArtifacts';
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
    if (!/^(?:atlas-index\.json|cells\/0\/-?\d+\/-?\d+\.json|pages\/-?\d+\/-?\d+\.json)$/.test(relativePath)) {
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
  private readonly pagesByKey = new Map<string, CompiledPageReference>();
  private readonly pageRequests = new Map<string, Promise<CompiledCellPage>>();
  private readonly pageLoaded = new Map<string, CompiledCellPage>();

  private constructor(
    readonly catalog: CompiledAtlasIndex,
    private readonly transport: WorldArtifactTransport,
  ) {
    this.anchors = new StoryAnchorRegistry(catalog.atlas.anchors);
    this.available = new Map(catalog.cells.map(ref => [`${ref.coordinate.x}:${ref.coordinate.z}`, true]));
    for (const page of catalog.pages ?? []) this.pagesByKey.set(`${page.x}:${page.z}`, page);
  }

  static async open(transport: WorldArtifactTransport): Promise<WorldV2ArtifactSource> {
    const raw = await transport.read('atlas-index.json');
    const catalog = validateCompiledAtlasIndex(JSON.parse(raw) as unknown);
    return new WorldV2ArtifactSource(catalog, transport);
  }

  hasCell(address: WorldCellCoordinate): boolean {
    return this.available.has(`${address.x}:${address.z}`) ||
      this.pagesByKey.has(`${Math.floor(address.x / WORLD_PAGE_SIZE)}:${Math.floor(address.z / WORLD_PAGE_SIZE)}`);
  }

  resolveAnchor(id: string): StoryAnchorDeclaration {
    return this.anchors.resolve(id);
  }

  private async loadPage(page: CompiledPageReference): Promise<CompiledCellPage> {
    const key = `${page.x}:${page.z}`;
    const cached = this.pageLoaded.get(key);
    if (cached) return cached;
    const pending = this.pageRequests.get(key);
    if (pending) return pending;
    // The page is shared by multiple loading cells; one cell abort must not
    // abort all sibling lookups. The small hashed page remains cacheable.
    const request = (async () => {
      const raw = await this.transport.read(page.path);
      await verifySha256(raw, page.sha256);
      const parsed = validateCompiledCellPage(JSON.parse(raw) as unknown, this.catalog, page);
      this.pageLoaded.set(key, parsed);
      return parsed;
    })();
    this.pageRequests.set(key, request);
    try { return await request; }
    finally { this.pageRequests.delete(key); }
  }

  async loadTerrainCell(address: WorldCellCoordinate, signal: AbortSignal): Promise<TerrainCell> {
    let ref = findCompiledCell(this.catalog, address);
    if (!ref) {
      const page = this.pagesByKey.get(
        `${Math.floor(address.x / WORLD_PAGE_SIZE)}:${Math.floor(address.z / WORLD_PAGE_SIZE)}`);
      if (page) {
        const index = await this.loadPage(page);
        ref = index.cells.find(cell =>
          cell.coordinate.x === address.x && cell.coordinate.z === address.z);
      }
    }
    if (signal.aborted) throw new Error('World V2 cell load was cancelled');
    if (!ref) throw new Error(`World V2 cell is not in published catalog: ${address.x},${address.z}`);
    const raw = await this.transport.read(ref.path, signal);
    if (signal.aborted) throw new Error('World V2 cell load was cancelled');
    await verifySha256(raw, ref.sha256);
    if (signal.aborted) throw new Error('World V2 cell load was cancelled');
    const cell = decodeCompiledCell(JSON.parse(raw) as unknown, this.catalog.atlas, ref, this.catalog.segments);
    if (this.catalog.profile === 'geography-stage-v1' &&
      (!cell.geography || !cell.navigation)) {
      throw new Error('World V2 geographic cell must include terrain, water, biome and navigation overlays');
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
