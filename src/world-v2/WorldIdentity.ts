/**
 * Deterministic namespace and identity layer. No Math.random(), load-order
 * RNG, object identity or player ID in canonical world generation.
 */
const ENCODER = new TextEncoder();
const ID_PATTERN = /^[a-z][a-z0-9]*(?:[-.][a-z0-9]+)*$/;

export function assertWorldId(id: string, label = 'id'): string {
  if (!ID_PATTERN.test(id) || id.length > 120) {
    throw new Error(`Invalid ${label}: ${JSON.stringify(id)}`);
  }
  return id;
}

/** UTF-8 FNV-1a 32-bit: pinned behavior across Node and web browsers. */
export function hash32(input: string): number {
  let hash = 0x811c9dc5;
  for (const byte of ENCODER.encode(input)) {
    hash = Math.imul(hash ^ byte, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Tuple serialization prevents ambiguous paths: ('ab','c') != ('a','bc'). */
export function deriveSeed(worldSeed: string, ...namespace: string[]): number {
  if (!worldSeed) throw new Error('A canonical world seed is required');
  return hash32(JSON.stringify(['astral-world-v2-seed-v1', worldSeed, ...namespace]));
}

export function worldCellId(worldId: string, cell: { x: number; z: number; lod: number }): string {
  assertWorldId(worldId, 'worldId');
  if (![cell.x, cell.z, cell.lod].every(Number.isSafeInteger) || cell.lod < 0) {
    throw new RangeError('Invalid cell address');
  }
  return `${worldId}/cell/${cell.lod}/${cell.x}/${cell.z}`;
}

/** Unique per generated object, stable regardless of cell-load order. */
export function worldEntityId(worldId: string, contentNamespace: string, instanceKey: string): string {
  assertWorldId(worldId, 'worldId');
  assertWorldId(contentNamespace, 'contentNamespace');
  if (!instanceKey) throw new Error('Entity instanceKey cannot be empty');
  const digest = deriveSeed(worldId, 'entity', contentNamespace, instanceKey).toString(16).padStart(8, '0');
  // Preserve a recognizable key for debugging and guard against hash collisions
  // by retaining the exact escaped instanceKey in the canonical identifier.
  return `${worldId}/entity/${contentNamespace}/${encodeURIComponent(instanceKey)}/${digest}`;
}
