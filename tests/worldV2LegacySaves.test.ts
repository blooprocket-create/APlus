import { describe, expect, it } from 'vitest';
import type { CharacterClassId } from '../src/types/game';
import { OPENING_STEPS, type OpeningStep } from '../src/game/HearthmereStory';
import { readHearthmereSave, writeHearthmereSave, type HearthmereSave } from '../src/persistence/HearthmereSave';

const roles: CharacterClassId[] = ['warrior', 'mage', 'assassin'];
const milestones: OpeningStep[] = ['arrival', 'rowan', 'escort', 'refuge'];

function storageFixture() {
  const files = new Map<string, string>();
  return {
    files,
    getItem: (key: string) => files.get(key) ?? null,
    setItem: (key: string, value: string) => { files.set(key, value); },
  };
}

function snapshot(role: CharacterClassId, step: OpeningStep, ordinal: number): HearthmereSave {
  return {
    version: 1, classId: role, name: role,
    step,
    // Historic X/Z are part of the v1 save contract, not locked world locations.
    position: { x: 20 + ordinal, z: -11 - ordinal },
    yaw: 0.3 * ordinal, hp: 230 + ordinal,
    energy: ordinal * 20, flasks: 3 - (ordinal % 3), seconds: ordinal * 45,
    movingGroup: step === 'escort' ? { x: 34, z: -16 } : undefined,
    enemies: step === 'escort' ? [{ id: 'opening_sentinel_1', x: 29, z: -12, hp: 110 }] : [],
  };
}

describe('World V2: synthetic legacy opening save fixtures', () => {
  it('recognizes all historical milestone names in the pure story contract', () => {
    for (const step of milestones) expect(OPENING_STEPS).toContain(step);
  });

  it('round-trips arrival, mid-quest, escort and refuge for every hero without cross-class loss', () => {
    const storage = storageFixture();
    const latest = new Map<CharacterClassId, HearthmereSave>();
    for (const role of roles) {
      for (const [index, step] of milestones.entries()) {
        const state = snapshot(role, step, index);
        expect(writeHearthmereSave(state, storage)).toBe(true);
        expect(readHearthmereSave(role, storage)).toEqual(state);
        latest.set(role, state);
      }
    }
    for (const role of roles) {
      expect(readHearthmereSave(role, storage)).toEqual(latest.get(role));
      const envelope = JSON.parse(storage.files.get(`astral_hearthmere_v1_${role}`)!);
      expect(envelope.current.step).toBe('refuge');
      expect(envelope.previous.step).toBe('escort');
    }
    expect(storage.files.size).toBe(3);
  });
});
