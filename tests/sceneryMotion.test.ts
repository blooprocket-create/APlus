import { Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { SceneryMotion } from '../src/rendering/SceneryMotion';

describe('Hearthmere scenery motion', () => {
  it('tracks all actor types in world space and clears pressure when an actor is hidden', () => {
    const motion = new SceneryMotion();
    const [player, companion, enemy, resident] = Array.from({ length: 4 }, () => new Object3D());
    const evacuation = new Object3D();
    evacuation.position.x = 4;
    evacuation.add(resident);
    resident.position.x = 2;
    companion.position.x = 1;
    enemy.position.x = 3;
    motion.update(.05, player, [companion], [enemy], [resident]);
    expect(motion.actors.value.filter(actor => actor.w > 0).map(actor => actor.x)).toEqual([0, 1, 3, 6]);
    evacuation.visible = false;
    motion.update(.05, player, [companion], [enemy], [resident]);
    expect(motion.actors.value.filter(actor => actor.w > 0).map(actor => actor.x)).toEqual([0, 1, 3]);
  });

  it.each(['player', 'companion', 'enemy', 'resident'])('lets a moving %s produce a fading bank ripple', kind => {
    const motion = new SceneryMotion();
    const [player, other] = [new Object3D(), new Object3D()];
    player.position.x = other.position.x = 11.7;
    const companions = kind === 'companion' ? [other] : [];
    const enemies = kind === 'enemy' ? [other] : [];
    const residents = kind === 'resident' ? [other] : [];
    motion.update(.05, player, companions, enemies, residents);
    const moving = kind === 'player' ? player : other;
    moving.position.z += .45;
    motion.update(.05, player, companions, enemies, residents);
    moving.position.z += .45;
    motion.update(.05, player, companions, enemies, residents);
    const wake = motion.wakes.value.find(w => w.z === 0)!;
    expect(wake.x).toBeCloseTo(12.42);
    expect(wake.y).toBeCloseTo(.9);
    expect(wake.w).toBeGreaterThan(.6);
    motion.update(.75, player, companions, enemies, residents);
    expect(wake.z).toBe(1);
  });
});
