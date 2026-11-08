import { describe, expect, it, vi } from 'vitest';
import { drawMinimap, type MapSnapshot } from '../src/ui/Minimap';

function renderMap(partial: Partial<MapSnapshot> = {}, displayWidth = 158, width = 220, height = 220) {
  const ctx = {
    clearRect: vi.fn(), save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), clip: vi.fn(),
    fillRect: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), fill: vi.fn(),
    translate: vi.fn(), rotate: vi.fn(), closePath: vi.fn(), drawImage: vi.fn(),
  };
  const canvas = {
    width, height,
    getContext: () => ctx,
    getBoundingClientRect: () => ({ width: displayWidth }),
  } as unknown as HTMLCanvasElement;
  const map: MapSnapshot = {
    player: { x: 0, z: 0, yaw: 0 }, enemies: [], portals: [], npcs: [], ...partial,
  };
  drawMinimap(canvas, map);
  return { ctx, canvas };
}

describe('world-accurate mini-map rendering', () => {
  it('keeps the player centered and north up even in a non-square viewport', () => {
    const { ctx } = renderMap({ player: { x: 10, z: -5, yaw: Math.PI / 2 } }, 158, 220, 160);
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 220, 160);
    expect(ctx.arc).toHaveBeenCalledWith(110, 80, 77, 0, Math.PI * 2);
    expect(ctx.translate).toHaveBeenLastCalledWith(110, 80);
    expect(ctx.rotate).toHaveBeenLastCalledWith(Math.PI / 2);
  });

  it('does not draw an invented road graph when there is no captured terrain', () => {
    const { ctx } = renderMap();
    expect(ctx.drawImage).not.toHaveBeenCalled();
    expect(ctx.stroke).not.toHaveBeenCalled();
    expect(ctx.fillRect).toHaveBeenCalledOnce();
  });

  it('crops and pans the real environment image in world coordinates, not along procedural waypoints', () => {
    const terrain = { canvas: { width: 320, height: 320 } as HTMLCanvasElement, x: 0, z: 0, radius: 38 };
    const first = renderMap({ terrain }).ctx;
    const second = renderMap({ terrain, player: { x: 2, z: -3, yaw: 0 } }).ctx;
    const a = first.drawImage.mock.calls[0];
    const b = second.drawImage.mock.calls[0];
    expect(a[0]).toBe(terrain.canvas);
    expect(a.slice(5)).toEqual([0, 0, 220, 220]);
    expect(b[1] - a[1]).toBeCloseTo(2 * 320 / 76);
    expect(b[2] - a[2]).toBeCloseTo(-3 * 320 / 76);
    expect(b[3]).toBeCloseTo(a[3]);
  });

  it('keeps markers and the player direction legible on a small phone canvas', () => {
    const map: Partial<MapSnapshot> = { enemies: [{ x: 4, z: 0, boss: false }] };
    const desktop = renderMap(map, 158).ctx;
    const phone = renderMap(map, 68).ctx;
    expect(desktop.arc.mock.calls.find(call => call[2] === 2.5)).toBeDefined();
    const scale = Math.min(2.4, 158 / 68);
    expect(phone.arc.mock.calls.find(call => call[2] === 2.5 * scale)).toBeDefined();
    expect(phone.moveTo).toHaveBeenLastCalledWith(0, -7 * scale);
  });

  it('shows edge bearings for far-off objectives and portals but not distant enemies', () => {
    const { ctx } = renderMap({
      portals: [{ x: 200, z: 0 }], npcs: [{ x: 0, z: -200 }],
      enemies: [{ x: 300, z: 0, boss: false }],
    });
    expect(ctx.translate.mock.calls).toHaveLength(3); // portal, objective, player
    expect(ctx.translate.mock.calls[0][0]).toBeGreaterThan(110);
    expect(ctx.translate.mock.calls[1][1]).toBeLessThan(110);
    expect(ctx.arc).toHaveBeenCalledTimes(1); // only the circular clip
  });

  it('ignores broken entity coordinates without losing the map', () => {
    const { ctx } = renderMap({ portals: [{ x: Number.NaN, z: 2 }] });
    expect(ctx.translate).toHaveBeenCalledTimes(1); // player only
    expect(ctx.restore).toHaveBeenCalledOnce();
  });
});
