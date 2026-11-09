import { buildAtlas, type WorldAtlasManifest } from './WorldAtlas';
import { cellToWorldCorner, type WorldCellCoordinate } from './WorldCoordinates';
import { deriveSeed, worldCellId } from './WorldIdentity';
import type { TerrainCell } from './WorldTerrain';
import { createGeography, type GeographyDefinition } from './WorldGeography';

/**
 * Versioned immutable cell-bake contract. Maps are CONTENT, not save data.
 * The "placeholder-preview" profile cannot be mistaken for Phase 2 geography.
 */
export interface CompiledCell {
  readonly schemaVersion: 1;
  /** Region-independent generation profile so new islands do not invalidate existing cells. */
  readonly generationHash: string;
  readonly id: string;
  readonly coordinate: WorldCellCoordinate;
  readonly cellSize: number;
  readonly segments: number;
  readonly heights: readonly number[];
  readonly geography?: {
    readonly waterLevels: readonly number[];
    readonly waterKinds: readonly number[];
    readonly biomes: readonly number[];
    readonly roads: readonly number[];
  };
  readonly navigation?: { readonly gridSize: number; readonly walkable: readonly number[] };
}

export interface CompiledCellReference {
  readonly id: string;
  readonly coordinate: WorldCellCoordinate;
  readonly path: string;
  /** SHA-256 of the exact JSON UTF-8 bytes written by the offline compiler. */
  readonly sha256: string;
}

/** Each geographic catalog page describes 8×8 world cells, so the atlas
 * root stays small and the browser can discover distant land without a giant
 * eager flat tile index. Coordinates are signed page-grid coordinates. */
export const WORLD_PAGE_SIZE = 8;
export interface CompiledPageReference {
  readonly x: number;
  readonly z: number;
  readonly path: string;
  readonly sha256: string;
  readonly cellCount: number;
}
export interface CompiledCellPage {
  readonly schemaVersion: 1;
  readonly atlasHash: string;
  readonly x: number;
  readonly z: number;
  readonly cells: readonly CompiledCellReference[];
}
export interface CompiledAtlasIndex {
  readonly schemaVersion: 1;
  readonly profile: 'placeholder-preview-v1' | 'geography-stage-v1';
  readonly atlas: WorldAtlasManifest;
  readonly segments: number;
  readonly cells: readonly CompiledCellReference[];
  /** Optional lazily loaded 8×8 region pages; direct inline cells remain compatible. */
  readonly pages?: readonly CompiledPageReference[];
  readonly geography?: GeographyDefinition;
}

function fail(message: string): never { throw new Error('World V2 artifact: ' + message); }
function validRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function cellGenerationHash(
  atlas: Pick<WorldAtlasManifest, 'worldSeed' | 'worldId' | 'cellSize' | 'generatorVersion'>,
  segments: number,
): string {
  return deriveSeed(atlas.worldSeed, 'cell-bake-v1', atlas.worldId,
    atlas.generatorVersion, String(atlas.cellSize), String(segments))
    .toString(16).padStart(8, '0');
}

export function encodeCompiledCell(atlas: WorldAtlasManifest, cell: TerrainCell): CompiledCell {
  if (cell.id !== worldCellId(atlas.worldId, { ...cell.coordinate, lod: 0 }) ||
    cell.cellSize !== atlas.cellSize) fail('Cell identity or size does not match atlas');
  return {
    schemaVersion: 1,
    generationHash: cellGenerationHash(atlas, cell.segments),
    id: cell.id, coordinate: { ...cell.coordinate },
    cellSize: cell.cellSize, segments: cell.segments,
    heights: Array.from(cell.heights),
    ...(cell.geography ? { geography: {
      waterLevels: Array.from(cell.geography.waterLevels),
      waterKinds: Array.from(cell.geography.waterKinds),
      biomes: Array.from(cell.geography.biomes),
      roads: Array.from(cell.geography.roads),
    } } : {}),
    ...(cell.navigation ? { navigation: {
      gridSize: cell.navigation.gridSize,
      walkable: Array.from(cell.navigation.walkable),
    } } : {}),
  };
}

/** Validate untrusted fetched JSON; never trust it as TerrainCell without checks. */
export function decodeCompiledCell(
  value: unknown, atlas: WorldAtlasManifest, cellRef: CompiledCellReference, segments: number,
): TerrainCell {
  if (!validRecord(value)) return fail('Cell JSON is not an object');
  const { coordinate, heights } = value;
  if (!validRecord(coordinate) || !Array.isArray(heights)) return fail('Malformed cell coordinate or heights');
  const x = coordinate.x, z = coordinate.z;
  if (!Number.isSafeInteger(x) || !Number.isSafeInteger(z) ||
    x !== cellRef.coordinate.x || z !== cellRef.coordinate.z) return fail('Unexpected cell coordinates');
  if (value.schemaVersion !== 1 || value.generationHash !== cellGenerationHash(atlas, segments) ||
    value.cellSize !== atlas.cellSize || value.segments !== segments ||
    value.id !== cellRef.id || value.id !== worldCellId(atlas.worldId, { x: x as number, z: z as number, lod: 0 })) {
    return fail('Cell schema, atlas version, dimensions or ID mismatch');
  }
  if (heights.length !== (segments + 1) ** 2 || !heights.every(h => typeof h === 'number' && Number.isFinite(h))) {
    return fail('Cell heightfield shape or values invalid');
  }
  const typed = new Float32Array(heights);
  if (typed.some((h, i) => h !== heights[i])) return fail('Heightfield has non-float32 values');
  let geography: TerrainCell['geography'];
  if (value.geography !== undefined) {
    if (!validRecord(value.geography)) return fail('Invalid geographic terrain attributes');
    const attrs = value.geography;
    const count = (segments + 1) ** 2;
    const validFloats = (items: unknown): items is number[] =>
      Array.isArray(items) && items.length === count &&
      items.every(v => typeof v === 'number' && Number.isFinite(v) && Math.fround(v) === v);
    const validBytes = (items: unknown, max: number): items is number[] =>
      Array.isArray(items) && items.length === count &&
      items.every(v => Number.isInteger(v) && v >= 0 && v <= max);
    if (!validFloats(attrs.waterLevels) || !validBytes(attrs.waterKinds, 2) ||
      !validBytes(attrs.biomes, 7) || !validBytes(attrs.roads, 255)) {
      return fail('Bad geographic array size, non-float32 elevations or out-of-range classifications');
    }
    geography = {
      waterLevels: new Float32Array(attrs.waterLevels),
      waterKinds: new Uint8Array(attrs.waterKinds),
      biomes: new Uint8Array(attrs.biomes),
      roads: new Uint8Array(attrs.roads),
    };
  }
  let navigation: TerrainCell['navigation'];
  if (value.navigation !== undefined) {
    if (!validRecord(value.navigation) || value.navigation.gridSize !== segments ||
      !Array.isArray(value.navigation.walkable) ||
      value.navigation.walkable.length !== segments * segments ||
      !value.navigation.walkable.every(bit => bit === 0 || bit === 1)) {
      return fail('Invalid baked navigation grid or walkability bits');
    }
    navigation = { gridSize: segments, walkable: new Uint8Array(value.navigation.walkable) };
  }
  const address = { x: x as number, z: z as number };
  return {
    id: cellRef.id, coordinate: address, corner: cellToWorldCorner(address, atlas.cellSize),
    segments, cellSize: atlas.cellSize, heights: typed,
    ...(geography ? { geography } : {}),
    ...(navigation ? { navigation } : {}),
  };
}

export function validateCompiledAtlasIndex(value: unknown): CompiledAtlasIndex {
  if (!validRecord(value) || value.schemaVersion !== 1 ||
    !['placeholder-preview-v1', 'geography-stage-v1'].includes(String(value.profile)) ||
    !validRecord(value.atlas) ||
    !Array.isArray(value.cells)) return fail('Invalid world catalog header');
  const index = value as unknown as CompiledAtlasIndex;
  // Canonical normalization enforces valid anchors, landmasses, seeds, hash,
  // and compatibility with this version of the world-generation kernel.
  let rebuilt: WorldAtlasManifest;
  try { rebuilt = buildAtlas(index.atlas); }
  catch (error) { return fail('Atlas rejected: ' + String(error)); }
  if (JSON.stringify(rebuilt) !== JSON.stringify(index.atlas)) return fail('Atlas hash or normalized data differs');
  if (index.profile === 'geography-stage-v1') {
    if (!index.geography) return fail('Geography catalog missing geography definition');
    let normalized;
    try { normalized = createGeography(index.atlas, index.geography).definition; }
    catch (error) { return fail('Geography constraints rejected: ' + String(error)); }
    if (JSON.stringify(normalized) !== JSON.stringify(index.geography)) {
      return fail('Geography definition not canonical or has mismatched landmasses');
    }
  } else if (index.geography !== undefined) return fail('Placeholder catalog cannot include geographic shapes');
  if (!Number.isSafeInteger(index.segments) || index.segments < 1 || index.segments > 256 ||
    index.cells.length > 100000 ||
    (index.cells.length === 0 && !(Array.isArray(index.pages) && index.pages.length > 0))) {
    return fail('Invalid cell catalog size');
  }
  if (index.pages !== undefined) {
    if (!Array.isArray(index.pages) || index.pages.length < 1 || index.pages.length > 5000 ||
      index.profile !== 'geography-stage-v1') return fail('Invalid paged geography catalog');
    const seenPages = new Set<string>();
    for (const page of index.pages) {
      if (!validRecord(page) || !Number.isSafeInteger(page.x) || !Number.isSafeInteger(page.z) ||
        page.path !== `pages/${page.x}/${page.z}.json` ||
        !/^[0-9a-f]{64}$/.test(page.sha256) ||
        !Number.isSafeInteger(page.cellCount) || page.cellCount < 1 ||
        page.cellCount > WORLD_PAGE_SIZE ** 2) return fail('Invalid geographic page reference');
      const key = `${page.x}:${page.z}`;
      if (seenPages.has(key)) return fail('Duplicate world geographic page');
      seenPages.add(key);
    }
  }
  const found = new Set<string>();
  for (const cell of index.cells) {
    if (!validRecord(cell) || !validRecord(cell.coordinate) ||
      !Number.isSafeInteger(cell.coordinate.x) || !Number.isSafeInteger(cell.coordinate.z)) {
      return fail('Invalid cell entry');
    }
    const expected = worldCellId(index.atlas.worldId, { ...cell.coordinate, lod: 0 });
    if (cell.id !== expected || found.has(cell.id)) return fail('Duplicate or inconsistent cell ID');
    found.add(cell.id);
    if (cell.path !== `cells/0/${cell.coordinate.x}/${cell.coordinate.z}.json` ||
      !/^[0-9a-f]{64}$/.test(cell.sha256)) return fail('Invalid cell path or digest');
  }
  return index;
}

export function validateCompiledCellPage(
  value: unknown,
  index: CompiledAtlasIndex,
  reference: CompiledPageReference,
): CompiledCellPage {
  if (!validRecord(value) || value.schemaVersion !== 1 ||
    value.atlasHash !== index.atlas.contentHash ||
    value.x !== reference.x || value.z !== reference.z ||
    !Array.isArray(value.cells) || value.cells.length !== reference.cellCount) {
    return fail('Geographic page identity or size mismatch');
  }
  const cells = value.cells as CompiledCellReference[];
  const seen = new Set<string>();
  for (const cell of cells) {
    if (!validRecord(cell) || !validRecord(cell.coordinate) ||
      !Number.isSafeInteger(cell.coordinate.x) || !Number.isSafeInteger(cell.coordinate.z)) {
      return fail('Geographic page cell address invalid');
    }
    const addr = cell.coordinate;
    if (Math.floor(addr.x / WORLD_PAGE_SIZE) !== reference.x ||
      Math.floor(addr.z / WORLD_PAGE_SIZE) !== reference.z ||
      cell.id !== worldCellId(index.atlas.worldId, { ...addr, lod: 0 }) ||
      cell.path !== `cells/0/${addr.x}/${addr.z}.json` ||
      !/^[0-9a-f]{64}$/.test(cell.sha256) || seen.has(cell.id)) {
      return fail('Invalid or duplicate geographic page cell');
    }
    seen.add(cell.id);
  }
  return value as unknown as CompiledCellPage;
}

export function findCompiledCell(index: CompiledAtlasIndex, address: WorldCellCoordinate): CompiledCellReference | undefined {
  // The index is small in the preview. A published world uses a paged catalog
  // and spatial lookup; this API intentionally hides that future replacement.
  return index.cells.find(c => c.coordinate.x === address.x && c.coordinate.z === address.z);
}
