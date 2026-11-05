import { describe, expect, it } from 'vitest';
import { type HearthmereSave, readHearthmereSave, writeHearthmereSave } from '../src/persistence/HearthmereSave';

const START: HearthmereSave = {
  version: 1, classId: 'mage', name: 'Celestia', step: 'arrival',
  position: { x: -24, z: 5 }, yaw: Math.PI, hp: 530, energy: 35, flasks: 3,
  seconds: 0, enemies: [],
};

describe('Hearthmere local snapshots', () => {
  it('recovers the previous valid snapshot when the current version is unusable', () => {
    let saved: string | null = null;
    const storage = { getItem: () => saved, setItem: (_: string, data: string) => { saved = data; } };
    expect(writeHearthmereSave(START, storage)).toBe(true);
    expect(writeHearthmereSave({ ...START, step: 'mara' }, storage)).toBe(true);
    expect(readHearthmereSave('mage', storage)?.step).toBe('mara');
    const envelope = JSON.parse(saved!);
    envelope.current.position = { x: 'broken', z: 0 };
    saved = JSON.stringify(envelope);
    expect(readHearthmereSave('mage', storage)).toEqual(START);
    expect(readHearthmereSave('assassin', storage)).toBeNull();
  });

  it('surfaces a failed write while the previous snapshot remains readable', () => {
    const storage = {
      getItem: () => JSON.stringify({ current: START, previous: null }),
      setItem: () => { throw new Error('Storage quota exceeded'); },
    };
    expect(writeHearthmereSave({ ...START, step: 'mara' }, storage)).toBe(false);
    expect(readHearthmereSave('mage', storage)).toEqual(START);
  });
});
