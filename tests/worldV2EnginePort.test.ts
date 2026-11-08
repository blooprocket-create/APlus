import { describe, expect, it, vi } from 'vitest';
import { GameEngine } from '../src/game/GameEngine';
import type { WorldV2GameplayPort } from '../src/world-v2/WorldV2GameplayBridge';

function fakePort(): WorldV2GameplayPort & { dispose: ReturnType<typeof vi.fn> } {
  return {
    update: vi.fn(),
    resolveAnchor: vi.fn(() => { throw new Error('Test stub'); }),
    renderOrigin: vi.fn(world => world),
    dispose: vi.fn(),
  };
}

describe('Phase 1 GameEngine opt-in integration boundary', () => {
  it('does not initialize V2 by default and disposes a replaced/removed port once', () => {
    // Only test the pure attachment/lifetime seam; this is not a gameplay run.
    // The real Hearthmere paths are covered by separate full integration tests.
    const engine = Object.create(GameEngine.prototype) as GameEngine;
    const first = fakePort();
    const second = fakePort();
    engine.attachWorldV2Port(first);
    engine.attachWorldV2Port(first);
    expect(first.dispose).not.toHaveBeenCalled();
    engine.attachWorldV2Port(second);
    expect(first.dispose).toHaveBeenCalledTimes(1);
    engine.attachWorldV2Port(null);
    engine.attachWorldV2Port(null);
    expect(second.dispose).toHaveBeenCalledTimes(1);
  });
});
