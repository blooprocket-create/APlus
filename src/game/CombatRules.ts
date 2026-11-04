import { ZoneId } from '../types/game';

export const FLASK_CAPACITY = 3;
export const FLASK_HEAL_RATIO = 0.4;

export function isSafeZone(zone: ZoneId): boolean {
  return zone === 'starting_town' || zone === 'market_crossing';
}

export interface AttackPattern {
  radius: number;
  windup: number;
  recovery: number;
  reach: number;
  damageScale: number;
  innerRadius?: number;
}

export function getGuardianPattern(region: string, enraged: boolean): AttackPattern {
  const fast = enraged ? 0.75 : 1;
  const patterns: Record<string, AttackPattern> = {
    whispering_woods: { radius: 4.2, windup: 1.3, recovery: 2.1, reach: 4.5, damageScale: 1.9 },
    ember_coast: { radius: 2.5, windup: 1.1, recovery: 1.7, reach: 9, damageScale: 1.7 },
    glass_desert: { radius: 3.8, innerRadius: 1.7, windup: 1.2, recovery: 1.8, reach: 6, damageScale: 2 },
    frostmarch: { radius: 5.5, innerRadius: 2.2, windup: 1.45, recovery: 2.2, reach: 6, damageScale: 2.2 },
    crown_of_night: { radius: 3.4, windup: 0.9, recovery: 1.4, reach: 4, damageScale: 1.9 },
    world_heart: { radius: 3.1, windup: 1.15, recovery: 1.4, reach: 10, damageScale: 2.3 },
  };
  const pattern = patterns[region] ?? getAttackPattern('boss_knight', enraged);
  return { ...pattern, windup: pattern.windup * fast, recovery: pattern.recovery * fast };
}

export function getAttackPattern(kind: 'slime' | 'sentinel' | 'boss_knight', enraged = false): AttackPattern {
  if (kind === 'boss_knight') {
    return { radius: enraged ? 3.8 : 3.2, windup: enraged ? 0.8 : 1.15, recovery: enraged ? 1.4 : 2.1, reach: 3.5, damageScale: 1.8 };
  }
  if (kind === 'sentinel') {
    return { radius: 1.65, windup: 0.95, recovery: 1.8, reach: 7.5, damageScale: 1.2 };
  }
  return { radius: 1.4, windup: 0.7, recovery: 1.3, reach: 2, damageScale: 1 };
}

export function resolveFlask(hp: number, maxHp: number, charges: number): { hp: number; charges: number; healed: number } {
  if (charges <= 0 || hp <= 0 || hp >= maxHp) return { hp, charges, healed: 0 };
  const nextHp = Math.min(maxHp, hp + Math.round(maxHp * FLASK_HEAL_RATIO));
  return { hp: nextHp, charges: charges - 1, healed: nextHp - hp };
}

/** Resolve against the position locked when the windup began, so movement can evade it. */
export function isInsideAttack(player: { x: number; z: number }, target: { x: number; z: number }, radius: number, innerRadius = 0): boolean {
  const distance = Math.hypot(player.x - target.x, player.z - target.z);
  return distance <= radius + 0.3 && distance >= Math.max(0, innerRadius - 0.3);
}
