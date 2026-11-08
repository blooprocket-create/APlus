import { OPENING_STEPS, type OpeningPoint, type OpeningStep } from '../game/HearthmereStory';
import type { CharacterClassId } from '../types/game';

export interface HearthmereSave {
  version: 1;
  classId: CharacterClassId;
  name: string;
  step: OpeningStep;
  position: OpeningPoint;
  yaw: number;
  hp: number;
  energy: number;
  flasks: number;
  seconds: number;
  movingGroup?: OpeningPoint;
  enemies: Array<OpeningPoint & { id: string; hp: number }>;
}

type HearthmereStorage = Pick<Storage, 'getItem' | 'setItem'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function isPoint(value: unknown): value is OpeningPoint {
  return isRecord(value) && Number.isFinite(value.x) && Number.isFinite(value.z);
}

function isSave(value: unknown, role: CharacterClassId): value is HearthmereSave {
  return isRecord(value) && value.version === 1 && value.classId === role &&
    typeof value.name === 'string' && value.name.length >= 2 && value.name.length <= 18 &&
    OPENING_STEPS.some(step => step === value.step) && isPoint(value.position) &&
    (value.movingGroup === undefined || isPoint(value.movingGroup)) &&
    [value.yaw, value.hp, value.energy, value.flasks, value.seconds].every(Number.isFinite) &&
    Array.isArray(value.enemies) && value.enemies.length <= 8 &&
    value.enemies.every(enemy => isRecord(enemy) && typeof enemy.id === 'string' &&
      Number.isFinite(enemy.hp) && isPoint(enemy));
}

function key(role: CharacterClassId): string { return `astral_hearthmere_v1_${role}`; }

export function deleteHearthmereSave(role: CharacterClassId, storage?: Pick<Storage, 'removeItem'>): boolean {
  try {
    (storage ?? localStorage).removeItem(key(role));
    return true;
  } catch { return false; }
}

export function readHearthmereSave(role: CharacterClassId, storage?: HearthmereStorage): HearthmereSave | null {
  try {
    const parsed: unknown = JSON.parse((storage ?? localStorage).getItem(key(role)) ?? 'null');
    if (!isRecord(parsed)) return null;
    if (isSave(parsed.current, role)) return parsed.current;
    if (isSave(parsed.previous, role)) return parsed.previous;
  } catch { /* A blocked or unreadable store has no usable snapshot. */ }
  return null;
}

export function writeHearthmereSave(snapshot: HearthmereSave, storage?: HearthmereStorage): boolean {
  try {
    const target = storage ?? localStorage;
    const previous = readHearthmereSave(snapshot.classId, target);
    // One storage write replaces the envelope, so a quota failure leaves the last valid run intact.
    target.setItem(key(snapshot.classId), JSON.stringify({ current: snapshot, previous }));
    return true;
  } catch { return false; }
}
