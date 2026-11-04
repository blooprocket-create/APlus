import { FieldActivityDefinition, FieldProgress } from '../types/campaign';
import { ProceduralPathLayout } from '../types/world';

export interface FieldPoint { x: number; z: number }
export interface FieldThreat extends FieldPoint { id: string }
export interface FieldPlan { id: string; definition: FieldActivityDefinition; points: FieldPoint[]; route: FieldPoint[] }
export interface FieldSpawn extends FieldPoint { id: string; kind: 'slime' | 'sentinel' }
export interface FieldUpdate { complete: boolean; changed: boolean; spawns: FieldSpawn[]; notice?: string }

export function newFieldProgress(): FieldProgress { return { collected: [], charge: 0, wave: 0, waypoint: 0 }; }
const distance = (a: FieldPoint, b: FieldPoint) => Math.hypot(a.x - b.x, a.z - b.z);

export function createFieldPlan(id: string, definition: FieldActivityDefinition, layout: ProceduralPathLayout): FieldPlan {
  // Side trails carry recoveries and captains; the escort follows connected main-road nodes.
  const branches = layout.waypoints.slice(13, 16);
  const points = (branches.length === 3 ? branches : [layout.waypoints[2], layout.waypoints[4], layout.waypoints[6]]).map(p => ({ x: p.x, z: p.z }));
  const route = layout.waypoints.slice(1, 7).map(p => ({ x: p.x, z: p.z }));
  if (definition.kind === 'defend') points.splice(0, points.length, { x: layout.waypoints[3].x, z: layout.waypoints[3].z });
  return { id, definition, points, route };
}

export function fieldSpawns(plan: FieldPlan, progress: FieldProgress): FieldSpawn[] {
  if (plan.definition.kind === 'hunt') return plan.points.flatMap((point, i) => progress.collected.includes(i) ? [] : [{ ...point, id: `${plan.id}_captain_${i}`, kind: 'sentinel' as const }]);
  if (plan.definition.kind !== 'defend' || progress.wave === 0) return [];
  const center = plan.points[0];
  return Array.from({ length: 3 }, (_, i) => {
    const angle = i / 3 * Math.PI * 2 + progress.wave;
    return { id: `${plan.id}_wave_${progress.wave}_${i}`, kind: i === 0 ? 'sentinel' as const : 'slime' as const, x: center.x + Math.sin(angle) * 9, z: center.z + Math.cos(angle) * 9 };
  });
}

export function fieldTarget(plan: FieldPlan, progress: FieldProgress, player: FieldPoint, threats: FieldThreat[]): FieldPoint {
  if (plan.definition.kind === 'escort') return progress.actor ?? plan.route[0];
  if (plan.definition.kind === 'defend') return plan.points[0];
  if (plan.definition.kind === 'relays') return plan.points[Math.min(progress.collected.length, plan.points.length - 1)];
  const remaining = plan.points.filter((_, i) => !progress.collected.includes(i));
  if (plan.definition.kind === 'hunt') {
    const captains = threats.filter(enemy => enemy.id.startsWith(`${plan.id}_captain_`));
    if (captains.length) return captains.reduce((a, b) => distance(a, player) < distance(b, player) ? a : b);
  }
  return remaining.sort((a, b) => distance(a, player) - distance(b, player))[0] ?? plan.points[0];
}

export function fieldStatus(plan: FieldPlan, progress: FieldProgress): string {
  switch (plan.definition.kind) {
    case 'recover': return `${progress.collected.length} / 3 recovered · Explore the side trails`;
    case 'hunt': return `${progress.collected.length} / 3 captains defeated`;
    case 'escort': return `${Math.min(progress.waypoint, plan.route.length - 1)} / ${plan.route.length - 1} road markers · Stay close; clear the way`;
    case 'defend': return `Assault ${progress.wave} / 3 · Hold the beacon ${Math.min(6, Math.floor(progress.charge))} / 6s between waves`;
    case 'relays': return `${progress.collected.length} / 3 aligned · Next: ${plan.definition.labels[Math.min(2, progress.collected.length)]} · ${progress.charge.toFixed(1)} / 2s`;
  }
}

/** Only unpaused gameplay calls this. No wall-clock timers, menu answers, or random progress. */
export function updateFieldActivity(plan: FieldPlan, progress: FieldProgress, player: FieldPoint, threats: FieldThreat[], elapsed: number): FieldUpdate {
  const dt = Math.min(0.1, Math.max(0, elapsed));
  const result: FieldUpdate = { complete: false, changed: false, spawns: [] };
  switch (plan.definition.kind) {
    case 'recover':
      plan.points.forEach((point, i) => {
        if (!progress.collected.includes(i) && distance(player, point) <= 2.2) {
          progress.collected.push(i); result.changed = true; result.notice = `Recovered: ${plan.definition.labels[i]}`;
        }
      });
      result.complete = progress.collected.length === plan.points.length;
      break;
    case 'hunt':
      plan.points.forEach((_, i) => {
        if (!progress.collected.includes(i) && !threats.some(threat => threat.id === `${plan.id}_captain_${i}`)) {
          progress.collected.push(i); result.changed = true; result.notice = `Patrol broken: ${plan.definition.labels[i]}`;
        }
      });
      result.complete = progress.collected.length === plan.points.length;
      break;
    case 'relays': {
      const index = progress.collected.length;
      const point = plan.points[index];
      if (!point) { result.complete = true; break; }
      if (distance(player, point) <= 2.5 && !threats.some(threat => distance(threat, point) < 7)) progress.charge += dt;
      else progress.charge = 0;
      if (progress.charge >= 2) {
        progress.collected.push(index); progress.charge = 0; result.changed = true; result.notice = `${plan.definition.labels[index]} aligned`;
      }
      result.complete = progress.collected.length === plan.points.length;
      break;
    }
    case 'escort': {
      progress.actor ??= { ...plan.route[0] };
      const actor = progress.actor;
      const next = plan.route[progress.waypoint + 1];
      if (!next) { result.complete = true; break; }
      if (distance(player, actor) > 10 || threats.some(threat => distance(threat, actor) < 8)) break;
      const length = distance(actor, next);
      const step = Math.min(length, dt * 4.8);
      if (length > 0) { actor.x += (next.x - actor.x) / length * step; actor.z += (next.z - actor.z) / length * step; }
      if (length <= 0.5) { progress.waypoint += 1; result.changed = true; }
      result.complete = progress.waypoint >= plan.route.length - 1;
      break;
    }
    case 'defend': {
      const point = plan.points[0];
      if (distance(player, point) > 7) break;
      if (progress.wave === 0) {
        progress.wave = 1; result.changed = true; result.spawns = fieldSpawns(plan, progress); result.notice = 'The first assault is coming'; break;
      }
      if (threats.some(threat => threat.id.startsWith(`${plan.id}_wave_`) || distance(threat, point) < 8)) break;
      progress.charge += dt;
      if (progress.charge >= 6) {
        if (progress.wave === 3) result.complete = true;
        else {
          progress.wave += 1; progress.charge = 0; result.changed = true; result.spawns = fieldSpawns(plan, progress); result.notice = `Assault ${progress.wave} is approaching`;
        }
      }
      break;
    }
  }
  return result;
}
