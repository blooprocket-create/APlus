import { describe, expect, it, vi } from 'vitest';
import { Camera, Scene, Vector3 } from 'three';
import { VfxSystem } from '../src/rendering/VfxSystem';

describe('Celestial Meteor Rain', () => {
  it('lands the three meteors in order and calls each impact once across uneven frames', () => {
    const scene = new Scene();
    const camera = new Camera();
    const effects = new VfxSystem(scene, {} as HTMLElement);
    const impacts = vi.fn<(index: number) => void>();

    for (const [index, duration] of [.35, .6, .85].entries()) {
      const target = new Vector3(index, 0, 0);
      effects.spawnFallingMeteor(target, 3.6, duration, 0x4361ee, 0x80ffdb, () => {
        expect(scene.children.find(child => child.position.x === index)?.visible).toBe(false);
        impacts(index);
        effects.spawnMeteorImpact(target, 3.6, 0x4361ee, 0x80ffdb);
      });
    }

    effects.update(.31, camera);
    expect(impacts).not.toHaveBeenCalled();
    effects.update(.02, camera);
    expect(impacts.mock.calls).toEqual([[0]]);
    effects.update(.23, camera);
    expect(impacts.mock.calls).toEqual([[0], [1]]);
    effects.update(.25, camera);
    expect(impacts.mock.calls).toEqual([[0], [1], [2]]);
    effects.update(.4, camera);
    expect(impacts).toHaveBeenCalledTimes(3);
    expect(scene.children).toHaveLength(0);
  });
});
