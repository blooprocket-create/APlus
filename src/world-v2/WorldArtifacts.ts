import { buildAtlas, type WorldAtlasManifest } from './WorldAtlas';
import { cellToWorldCorner, type WorldCellCoordinate } from './WorldCoordinates';
import { deriveSeed, worldCellId } from './WorldIdentity';
import type { TerrainCell } from './WorldTerrain';

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
}

export interface CompiledCellReference {
  readonly id: string;
  readonly coordinate: WorldCellCoordinate;
  readonly path: string;
  /** SHA-256 of the exact JSON UTF-8 bytes written by the offline compiler. */
  readonly sha256: string;
}

export interface CompiledAtlasIndex {
  readonly schemaVersion: 1;
  readonly profile: 'placeholder-preview-v1';
  readonly atlas: WorldAtlasManifest;
  readonly segments: number;
  readonly cells: readonly CompiledCellReference[];
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
  const address = { x: x as number, z: z as number };
  return {
    id: cellRef.id, coordinate: address, corner: cellToWorldCorner(address, atlas.cellSize),
    segments, cellSize: atlas.cellSize, heights: typed,
  };
}

export function validateCompiledAtlasIndex(value: unknown): CompiledAtlasIndex {
  if (!validRecord(value) || value.schemaVersion !== 1 ||
    value.profile !== 'placeholder-preview-v1' || !validRecord(value.atlas) ||
    !Array.isArray(value.cells)) return fail('Invalid world catalog header');
  const index = value as unknown as CompiledAtlasIndex;
  // Canonical normalization enforces valid anchors, landmasses, seeds, hash,
  // and compatibility with this version of the world-generation kernel.
  let rebuilt: WorldAtlasManifest;
  try { rebuilt = buildAtlas(index.atlas); }
  catch (error) { return fail('Atlas rejected: ' + String(error)); }
  if (JSON.stringify(rebuilt) !== JSON.stringify(index.atlas)) return fail('Atlas hash or normalized data differs');
  if (!Number.isSafeInteger(index.segments) || index.segments < 1 || index.segments > 256 ||
    index.cells.length < 1 || index.cells.length > 100000) return fail('Invalid cell catalog size');
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

export function findCompiledCell(index: CompiledAtlasIndex, address: WorldCellCoordinate): CompiledCellReference | undefined {
  // The index is small in the preview. A published world uses a paged catalog
  // and spatial lookup; this API intentionally hides that future replacement.
  return index.cells.find(c => c.coordinate.x === address.x && c.coordinate.z === address.z);
}
