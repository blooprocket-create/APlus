import { describe, expect, it } from 'vitest';
import { moveWorldActor } from '../src/world-v2/WorldActorSurface';
import type { TerrainCellStore } from '../src/world-v2/WorldSurface';
import type { TerrainCell } from '../src/world-v2/WorldTerrain';

function cell(x: number, height: number, sea = false): TerrainCell {
  return {
    id: `tile-${x}`,
    coordinate: { x, z: 0 },
    corner: { x: x * 16, z: 0 },
    cellSize: 16,
    segments: 1,
    heights: new Float32Array(4).fill(height),
    geography: sea
      ? {
          biomes: new Uint8Array(4),
          roads: new Uint8Array(4),
          waterKinds: new Uint8Array(4).fill(1),
          waterLevels: new Float32Array(4),
        }
      : undefined,
  };
}
function store(...cells: TerrainCell[]): TerrainCellStore {
  return {
    cellSize: 16,
    getCell: (a) =>
      cells.find((c) => c.coordinate.x === a.x && c.coordinate.z === a.z),
  };
}
describe('real GameEngine world movement service', () => {
  it('grounds actors and crosses a loaded cell boundary without a flat-ground reset', () => {
    const world = store(cell(0, 18), cell(1, 18));
    const moved = moveWorldActor(world, [], { x: 15, y: 18, z: 8 }, 3, 0);
    expect(moved.position.x).toBeCloseTo(18);
    expect(moved.position.y).toBe(18);
  });
  it('sweeps dash-sized moves against trunks and stops at unloaded terrain or sea', () => {
    const world = store(cell(0, 18));
    const blocked = moveWorldActor(
      world,
      [{ x: 8, z: 8, radius: 0.4 }],
      { x: 2, y: 18, z: 8 },
      12,
      0,
    );
    expect(blocked.position.x).toBeLessThan(7.3);
    const missing = moveWorldActor(world, [], { x: 15, y: 18, z: 8 }, 5, 0);
    expect(missing.position.x).toBeLessThan(16);
    expect(missing.blockedBy).toBe('missing-terrain');
    const ocean = moveWorldActor(
      store(cell(0, 0), cell(1, -2, true)),
      [],
      { x: 15, y: 0, z: 8 },
      5,
      0,
    );
    expect(ocean.position.x).toBeLessThan(16);
    expect(ocean.blockedBy).toBe('sea');
  });
  it('slides along a prop without tunneling through it or losing terrain elevation', () => {
    const result = moveWorldActor(
      store(cell(0, 7)),
      [{ x: 8, z: 8, radius: 1 }],
      { x: 6, y: 7, z: 6 },
      4,
      4,
    );
    expect(
      Math.hypot(result.position.x - 8, result.position.z - 8),
    ).toBeGreaterThanOrEqual(1.35);
    expect(result.position.y).toBe(7);
    expect(result.moved).toBe(true);
  });
});
