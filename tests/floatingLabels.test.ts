import { describe, expect, it } from 'vitest';
import { placeFloatingLabel } from '../src/rendering/FloatingLabels';

const viewport = { width: 393, height: 852 };

describe('floating combat label placement', () => {
  it('separates a critical hit and two companion hits above the same health bar', () => {
    const critical = placeFloatingLabel(202, 380, 92, 32, viewport, [], -1)!;
    const first = placeFloatingLabel(202, 380, 30, 24, viewport, [critical], -1)!;
    const second = placeFloatingLabel(202, 380, 30, 24, viewport, [critical, first], -1)!;
    const labels = [critical, first, second];
    labels.forEach((a, index) => {
      expect(a.y + a.height).toBeLessThan(380);
      for (const b of labels.slice(index + 1)) {
        expect(a.x + a.width + 4 <= b.x || b.x + b.width + 4 <= a.x
          || a.y + a.height + 4 <= b.y || b.y + b.height + 4 <= a.y).toBe(true);
      }
    });
    expect(placeFloatingLabel(205, 373, 30, 24, viewport, [], second.lane)?.lane).toBe(second.lane);
  });

  it('keeps a burst inside the phone edge while staying above its target', () => {
    const first = placeFloatingLabel(389, 102, 65, 32, viewport, [], -1)!;
    const second = placeFloatingLabel(389, 102, 65, 32, viewport, [first], -1)!;
    expect(first.x + first.width).toBeLessThan(viewport.width);
    expect(second.x + second.width + 4 <= first.x || second.y + second.height + 4 <= first.y).toBe(true);
    expect(placeFloatingLabel(389, 24, 65, 32, viewport, [], -1)).toBeUndefined();
  });
});
