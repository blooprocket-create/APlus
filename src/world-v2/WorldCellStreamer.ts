import { assertCellSize, worldToCell, type WorldCellCoordinate } from './WorldCoordinates';
import { worldCellId } from './WorldIdentity';

export type CellResidency = 'active' | 'warm';
export interface DesiredCell {
  readonly id: string;
  readonly address: WorldCellCoordinate;
  readonly residency: CellResidency;
  readonly priority: number;
}

export interface StreamingPlanOptions {
  readonly worldId: string;
  readonly cellSize: number;
  /** Chebyshev radius around player. */
  readonly activeRadius: number;
  readonly warmRadius: number;
  /** Units of additional prefetch ahead of the player's heading (0 = off). */
  readonly lookAheadDistance?: number;
}

function validRadius(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > 12) {
    throw new RangeError(`${label} must be between 0 and 12`);
  }
}

/**
 * Deterministic load plan with a protective warm ring and forward prefetch.
 * Does not depend on frame order or mutate terrain; it plans *residency only*.
 */
export function planCells(
  player: { x: number; z: number },
  heading: { x: number; z: number },
  options: StreamingPlanOptions,
): readonly DesiredCell[] {
  assertCellSize(options.cellSize);
  validRadius(options.activeRadius, 'activeRadius');
  validRadius(options.warmRadius, 'warmRadius');
  if (options.warmRadius < options.activeRadius) {
    throw new RangeError('warmRadius cannot be smaller than activeRadius');
  }
  const ahead = options.lookAheadDistance ?? 0;
  if (!Number.isFinite(ahead) || ahead < 0 || ahead > options.cellSize * 12) {
    throw new RangeError('Invalid lookAheadDistance');
  }
  if (!Number.isFinite(heading.x) || !Number.isFinite(heading.z)) throw new RangeError('Invalid heading');
  const current = worldToCell(player, options.cellSize);
  const length = Math.hypot(heading.x, heading.z);
  const future = length > 0 && ahead > 0
    ? worldToCell({ x: player.x + heading.x / length * ahead, z: player.z + heading.z / length * ahead }, options.cellSize)
    : current;
  const desired = new Map<string, DesiredCell>();
  const mark = (center: WorldCellCoordinate, radius: number, active: boolean) => {
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const address = { x: center.x + dx, z: center.z + dz };
        const id = worldCellId(options.worldId, { ...address, lod: 0 });
        const distance = Math.hypot(address.x - current.x, address.z - current.z);
        const priority = (active ? 0 : 1) * 100 + distance;
        const previous = desired.get(id);
        if (!previous || priority < previous.priority) {
          desired.set(id, { id, address, residency: active ? 'active' : 'warm', priority });
        }
      }
    }
  };
  mark(current, options.warmRadius, false);
  if (future.x !== current.x || future.z !== current.z) mark(future, options.activeRadius, false);
  mark(current, options.activeRadius, true);
  return [...desired.values()].sort((a, b) =>
    a.priority - b.priority || a.address.z - b.address.z || a.address.x - b.address.x);
}

export interface CellLoader<Resource> {
  load(address: WorldCellCoordinate, signal: AbortSignal): Promise<Resource>;
  unload(resource: Resource, address: WorldCellCoordinate): void;
  onError?(error: unknown, address: WorldCellCoordinate): void;
}
interface CellRecord<Resource> {
  readonly desired: DesiredCell;
  readonly controller: AbortController;
  resource?: Resource;
  loading?: Promise<void>;
}

export interface CellStreamerOptions extends StreamingPlanOptions {
  readonly maxConcurrentLoads: number;
  readonly maxLoadsPerUpdate: number;
  /** Paged/finite published catalogs can reject cells not yet part of a release. */
  readonly isAvailable?: (address: WorldCellCoordinate) => boolean;
}

/**
 * Owns residency/cancellation and resource lifecycle, not gameplay or world
 * generation. Late results of an abandoned load are always discarded.
 */
export class WorldCellStreamer<Resource> {
  private readonly records = new Map<string, CellRecord<Resource>>();
  private readonly pending = new Set<Promise<void>>();
  private disposed = false;

  constructor(
    readonly options: CellStreamerOptions,
    private readonly loader: CellLoader<Resource>,
  ) {
    if (!Number.isSafeInteger(options.maxConcurrentLoads) || options.maxConcurrentLoads < 1) {
      throw new RangeError('maxConcurrentLoads must be positive');
    }
    if (!Number.isSafeInteger(options.maxLoadsPerUpdate) || options.maxLoadsPerUpdate < 1) {
      throw new RangeError('maxLoadsPerUpdate must be positive');
    }
  }

  update(player: { x: number; z: number }, heading: { x: number; z: number } = { x: 0, z: 0 }): void {
    if (this.disposed) throw new Error('Streamer has been disposed');
    const plan = planCells(player, heading, this.options)
      .filter(item => this.options.isAvailable?.(item.address) ?? true);
    const next = new Map(plan.map(item => [item.id, item]));
    for (const [id, record] of this.records) {
      if (!next.has(id)) {
        this.records.delete(id);
        record.controller.abort();
        if (record.resource !== undefined) this.loader.unload(record.resource, record.desired.address);
      }
    }
    // The same loaded cell can switch between warm/active without reloading.
    for (const desired of plan) {
      const old = this.records.get(desired.id);
      if (old && (old.desired.residency !== desired.residency || old.desired.priority !== desired.priority)) {
        this.records.set(desired.id, { ...old, desired });
      }
    }
    let slots = Math.min(
      this.options.maxLoadsPerUpdate,
      Math.max(0, this.options.maxConcurrentLoads - this.pending.size),
    );
    for (const desired of plan) {
      if (slots === 0) break;
      if (this.records.has(desired.id)) continue;
      slots--;
      const record: CellRecord<Resource> = { desired, controller: new AbortController() };
      this.records.set(desired.id, record);
      const request = Promise.resolve()
        .then(() => this.loader.load(desired.address, record.controller.signal))
        .then(resource => {
          const current = this.records.get(desired.id);
          if (current?.controller !== record.controller || this.disposed || record.controller.signal.aborted) {
            this.loader.unload(resource, desired.address);
          } else {
            current.resource = resource;
          }
        })
        .catch(error => {
          if (!record.controller.signal.aborted && !this.disposed) {
            this.records.delete(desired.id);
            this.loader.onError?.(error, desired.address);
          }
        })
        .finally(() => { this.pending.delete(request); });
      record.loading = request;
      this.pending.add(request);
    }
  }

  /** Currently resident resources in deterministic cell-id order. */
  loaded(): readonly { id: string; residency: CellResidency; resource: Resource }[] {
    return [...this.records].filter(([, record]) => record.resource !== undefined)
      .map(([id, record]) => ({
        id, residency: record.desired.residency, resource: record.resource as Resource,
      }))
      .sort((a, b) => a.id.localeCompare(b.id, 'en'));
  }

  /** Wait for requests started by previous update calls (useful for QA/tests). */
  async settle(): Promise<void> { await Promise.allSettled([...this.pending]); }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const record of this.records.values()) {
      record.controller.abort();
      if (record.resource !== undefined) this.loader.unload(record.resource, record.desired.address);
    }
    this.records.clear();
  }
}
