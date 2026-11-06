import { describe, expect, it } from 'vitest';
import { type HearthmereSave, deleteHearthmereSave, readHearthmereSave, writeHearthmereSave } from '../src/persistence/HearthmereSave';

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

  it('deletes both snapshots for one hero without changing other heroes or preferences', () => {
    const entries = new Map<string, string>([['astral-screen-shake', 'false']]);
    const storage = {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => { entries.set(key, value); },
      removeItem: (key: string) => { entries.delete(key); },
    };
    const warrior: HearthmereSave = { ...START, classId: 'warrior', name: 'Kael' };
    const assassin: HearthmereSave = { ...START, classId: 'assassin', name: 'Shadow' };
    const snapshots: HearthmereSave[] = [START, { ...START, step: 'mara' }, warrior, assassin];
    for (const snapshot of snapshots) {
      expect(writeHearthmereSave(snapshot, storage)).toBe(true);
    }
    expect(deleteHearthmereSave('mage', storage)).toBe(true);
    expect(entries.has('astral_hearthmere_v1_mage')).toBe(false);
    expect(readHearthmereSave('mage', storage)).toBeNull();
    expect(readHearthmereSave('warrior', storage)).toEqual(warrior);
    expect(readHearthmereSave('assassin', storage)).toEqual(assassin);
    expect(entries.get('astral-screen-shake')).toBe('false');
    expect(deleteHearthmereSave('mage', storage)).toBe(true);
    expect(writeHearthmereSave(START, storage)).toBe(true);
    expect(JSON.parse(entries.get('astral_hearthmere_v1_mage')!).previous).toBeNull();
  });

  it('reports blocked deletion without losing the saved run', () => {
    const storage = {
      getItem: () => JSON.stringify({ current: START, previous: null }),
      setItem: () => { throw new Error('Storage access denied'); },
      removeItem: () => { throw new Error('Storage access denied'); },
    };
    expect(deleteHearthmereSave('mage', storage)).toBe(false);
    expect(readHearthmereSave('mage', storage)).toEqual(START);
  });
});
