import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { MoatSlice, SLICE_CAMP, SliceActors } from '../src/game/MoatSlice';
import { CharacterClassId } from '../src/types/game';

function startPuzzle(playerClass: CharacterClassId) {
  const slice = new MoatSlice();
  const positions = {
    warrior: new Vector3(1.3, 0, -25),
    mage: new Vector3(0.4, 0, -25),
    assassin: new Vector3(0.4, 0, -25),
  };
  const actors: SliceActors = { playerClass, position: role => positions[role], pose() {} };
  const tick = (frames: number) => {
    for (let i = 0; i < frames; i++) slice.update(1 / 60, actors);
  };
  expect(slice.walkable(-8, -25)).toBe(false);
  expect(slice.startIfNear(positions[playerClass])).toBe(false);
  slice.routeCleared();
  expect(slice.startIfNear(positions[playerClass])).toBe(true);
  expect(slice.startIfNear(positions[playerClass])).toBe(false);
  return { slice, actors, positions, tick };
}

describe('Hearthmere crossing', () => {
  it('uses the existing swept collision owner for an optional art arena and restores the moat rules',()=>{
    const slice=new MoatSlice();slice.configureArena({x:-9,z:10,radiusX:6.2,radiusZ:5.9});
    const player=SLICE_CAMP.clone();player.x+=50;player.z+=20;slice.constrainPlayer(player);
    expect(slice.walkable(player.x,player.z)).toBe(true);expect(player.x).toBeLessThan(-2.7);
    const enemy=new Vector3(30,0,40);slice.constrainActor(enemy,-9,10);
    expect(slice.walkable(enemy.x,enemy.z)).toBe(true);expect(enemy.distanceTo(new Vector3(-9,0,10))).toBeLessThan(6.3);
    slice.configureArena(null);expect(slice.walkable(-8,-25)).toBe(false);expect(slice.walkable(-8,11)).toBe(true);
  });
  it('lets the warrior vault and break the crate while companions handle the key and lever', () => {
    const { slice, actors, positions, tick } = startPuzzle('warrior');
    expect(slice.useUtility(actors)).toBe(true);
    tick(45);
    expect(positions.warrior.x).toBeGreaterThan(11.1);
    expect(slice.step).toBe('crate');
    expect(slice.breakCrate(actors)).toBe(true);
    tick(360);
    expect(slice.bridgeOpen).toBe(true);
  });

  it('waits for the mage to transfer the key and requires the footbridge to complete the loop', () => {
    const { slice, actors, positions, tick } = startPuzzle('mage');
    tick(180);
    expect(slice.step).toBe('transfer');
    expect(slice.walkable(7, 9)).toBe(false);
    expect(slice.useUtility(actors)).toBe(true);
    tick(360);
    expect(slice.step).toBe('bridge');
    const moveTo = (x: number, z: number) => {
      positions.mage.set(x, 0, z);
      slice.constrainPlayer(positions.mage);
    };
    moveTo(SLICE_CAMP.x, SLICE_CAMP.z);
    tick(1);
    expect(slice.step).toBe('bridge');
    moveTo(1.3, -25);
    moveTo(14, -25);
    expect(positions.mage.x).toBeCloseTo(14);
    moveTo(14, 9);
    moveTo(-8, 9);
    expect(positions.mage.x).toBeCloseTo(-8);
    tick(1);
    expect(slice.step).toBe('complete');
  });

  it('resets only the stealth step when the assassin is caught', () => {
    const { slice, actors, positions, tick } = startPuzzle('assassin');
    tick(180);
    expect(slice.step).toBe('stealth');
    expect(slice.useUtility(actors)).toBe(true);
    // Stand on the patrol line until the guard walks into close range.
    positions.assassin.set(-2.3, 0, -29.6);
    tick(150);
    expect(slice.message).toContain('Spotted');
    expect(slice.step).toBe('stealth');
    expect(slice.canLowerBridge(actors)).toBe(false);
    expect(slice.useUtility(actors)).toBe(true);
    positions.assassin.set(-1, 0, -34);
    expect(slice.canLowerBridge(actors)).toBe(true);
    slice.lowerBridge();
    expect(slice.walkable(7, -25)).toBe(false);
    tick(40);
    expect(slice.walkable(7, -25)).toBe(true);
  });
});
