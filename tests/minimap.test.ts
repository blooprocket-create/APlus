import { describe, expect, it, vi } from 'vitest';
import { drawMinimap, type MapSnapshot } from '../src/ui/Minimap';

function renderMap(partial: Partial<MapSnapshot> = {}, displayWidth = 158, width = 220, height = 220) {
  const ctx = {
    clearRect: vi.fn(), save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), clip: vi.fn(),
    fillRect: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), fill: vi.fn(),
    translate: vi.fn(), rotate: vi.fn(), closePath: vi.fn(),
  };
  const canvas = {
    width, height,
    getContext: () => ctx,
    getBoundingClientRect: () => ({ width: displayWidth }),
  } as unknown as HTMLCanvasElement;
  const map: MapSnapshot = {
    player: { x: 0, z: 0, yaw: 0 }, enemies: [], portals: [], npcs: [], path: [], ...partial,
  };
  drawMinimap(canvas, map);
  return { ctx, canvas };
}

describe('mini-map rendering', () => {
  it('centers the player and uses the smaller canvas dimension for the round clipping region', () => {
    const { ctx } = renderMap({ player: { x: 10, z: -5, yaw: Math.PI / 2 } }, 158, 220, 160);
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 220, 160);
    expect(ctx.arc).toHaveBeenCalledWith(110, 80, 77, 0, Math.PI * 2);
    expect(ctx.translate).toHaveBeenLastCalledWith(110, 80);
    expect(ctx.rotate).toHaveBeenLastCalledWith(Math.PI / 2);
  });

  it('keeps markers and the player direction legible on a shrunk mobile canvas', () => {
    const map: Partial<MapSnapshot> = { enemies: [{ x: 4, z: 0, boss: false }] };
    const desktop = renderMap(map, 158).ctx;
    const phone = renderMap(map, 68).ctx;
    const desktopMarker = desktop.arc.mock.calls.find(call => call[2] === 2.5);
    const phoneMarker = phone.arc.mock.calls.find(call => call[2] === 2.5 * Math.min(2.4, 158 / 68));
    expect(desktopMarker).toBeDefined();
    expect(phoneMarker).toBeDefined();
    expect(phone.moveTo).toHaveBeenLastCalledWith(0, -7 * Math.min(2.4, 158 / 68));
  });

  it('shows the bearing of distant portals and objectives, but not distant enemies', () => {
    const { ctx } = renderMap({
      portals: [{ x: 200, z: 0 }], npcs: [{ x: 0, z: -200 }],
      enemies: [{ x: 300, z: 0, boss: false }],
    });
    // Each off-screen point of interest translates to a different map-rim position.
    expect(ctx.translate.mock.calls).toHaveLength(3);
    expect(ctx.translate.mock.calls[0][0]).toBeGreaterThan(110);
    expect(ctx.translate.mock.calls[1][1]).toBeLessThan(110);
    // Only the clipping circle and the origin ring use arcs; off-screen enemies are skipped.
    expect(ctx.arc).toHaveBeenCalledTimes(2);
  });

  it('does not throw when a restored route contains invalid connections or points', () => {
    const { ctx } = renderMap({ path: [{ x: 0, z: 0 }, { x: Number.NaN, z: 5 }], connections: [[0, 1], [0, 99]] });
    expect(ctx.restore).toHaveBeenCalledTimes(1);
    expect(ctx.clearRect).toHaveBeenCalledTimes(1);
  });
});
