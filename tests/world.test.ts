import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { disposeObject } from '../src/rendering/SceneResources';
import { CHRONICLE_CHAPTERS } from '../src/data/chronicle';
import { buildChronicleLayout, chapterSeed } from '../src/game/ChronicleWorld';
import { createFieldPlan, fieldSpawns, newFieldProgress, updateFieldActivity } from '../src/game/FieldActivities';
import { FieldActivityKind } from '../src/types/campaign';
import { clampToProceduralPath } from '../src/game/ProceduralPathGenerator';
import { roadDirectionTarget } from '../src/game/WorldRoutes';

const planFor = (kind: FieldActivityKind) => {
  const chapter = CHRONICLE_CHAPTERS.find(chapter => chapter.objectives[0].field?.kind === kind)!;
  return createFieldPlan(chapter.objectives[0].id, chapter.objectives[0].field!, buildChronicleLayout(chapter).layout);
};

describe('procedural regional geography', () => {
  it('releases owned world-sign textures when unloading a region', () => {
    const texture = new THREE.Texture(); texture.userData.ownedByScene = true;
    const dispose = vi.spyOn(texture, 'dispose');
    const material = new THREE.SpriteMaterial({ map: texture }); const disposeMaterial = vi.spyOn(material, 'dispose');
    const group = new THREE.Group(); group.add(new THREE.Sprite(material), new THREE.Sprite(material));
    disposeObject(group);
    expect(dispose).toHaveBeenCalledOnce(); expect(disposeMaterial).toHaveBeenCalledOnce();
  });
  it('generates stable geography for a hero and different geography for another hero', () => {
    for (const chapter of CHRONICLE_CHAPTERS) {
      const a = chapterSeed('hero-a', chapter); const b = chapterSeed('hero-b', chapter);
      expect(buildChronicleLayout(chapter, a)).toEqual(buildChronicleLayout(chapter, a));
      expect(buildChronicleLayout(chapter, a).layout.waypoints).not.toEqual(buildChronicleLayout(chapter, b).layout.waypoints);
    }
    expect(new Set(CHRONICLE_CHAPTERS.map(chapter => buildChronicleLayout(chapter).layout.topology)).size).toBe(6);
  });
  it('keeps all field landmarks and forward gates on the connected, walkable graph', () => {
    for (let seed = 1; seed <= 8; seed++) for (const chapter of CHRONICLE_CHAPTERS) {
      const { layout } = buildChronicleLayout(chapter, seed);
      const plan = createFieldPlan(chapter.objectives[0].id, chapter.objectives[0].field!, layout);
      for (const point of [...plan.points, ...plan.route, { x: layout.endPortalPos.x + 4, z: layout.endPortalPos.z - 3 }]) {
        const clamped = clampToProceduralPath(point.x, point.z, layout);
        expect(clamped.x).toBeCloseTo(point.x); expect(clamped.z).toBeCloseTo(point.z);
      }
    }
  });
  it('retains the old layout for existing chapter checkpoints', () => {
    const chapter = CHRONICLE_CHAPTERS[0];
    const old = buildChronicleLayout(chapter, chapter.seed, 1).layout;
    expect(old.version).toBe(1); expect(old.waypoints[0].x).toBe(Math.sin(chapter.seed) * 14);
    expect(old.waypoints[11].z).toBe(-242);
    expect(buildChronicleLayout(chapter).layout.version).toBe(2);
  });
  it('points around a disconnected gap instead of straight across unwalkable terrain', () => {
    const layout = buildChronicleLayout(CHRONICLE_CHAPTERS[0]).layout;
    layout.waypoints = [[0, 0], [0, -20], [20, -20], [20, 0]].map(([x, z], index) => ({ x, z, index, radius: 5, distanceFromStart: index * 20 }));
    layout.connections = [[0, 1], [1, 2], [2, 3]]; layout.corridorHalfWidth = 4;
    expect(roadDirectionTarget(layout, { x: 0, z: 0 }, { x: 20, z: 0 })).toEqual(layout.waypoints[1]);
    expect(roadDirectionTarget(layout, { x: 0, z: -10 }, { x: 20, z: 0 })).toEqual(layout.waypoints[1]);
    expect(roadDirectionTarget(layout, { x: 20, z: -2 }, { x: 20, z: 0 })).toEqual({ x: 20, z: 0 });
  });
});

describe('field objectives', () => {
  it('requires visiting three different recovery sites and never counts the same one twice', () => {
    const plan = planFor('recover'); const progress = newFieldProgress();
    expect(updateFieldActivity(plan, progress, { x: 999, z: 999 }, [], .1).complete).toBe(false);
    for (const point of plan.points.slice(0, 2)) updateFieldActivity(plan, progress, point, [], .1);
    updateFieldActivity(plan, progress, plan.points[0], [], .1);
    expect(progress.collected).toHaveLength(2);
    expect(updateFieldActivity(plan, progress, plan.points[2], [], .1).complete).toBe(true);
  });
  it('makes an escort wait for the player and for nearby enemies, then reach its destination', () => {
    const plan = planFor('escort'); const progress = newFieldProgress();
    updateFieldActivity(plan, progress, { x: 999, z: 999 }, [], .1);
    expect(progress.actor).toEqual(plan.route[0]);
    updateFieldActivity(plan, progress, plan.route[0], [{ ...plan.route[0], id: 'blocker' }], .1);
    expect(progress.actor).toEqual(plan.route[0]);
    let complete = false;
    for (let i = 0; i < 5000 && !complete; i++) complete = updateFieldActivity(plan, progress, { ...progress.actor! }, [], .1).complete;
    expect(complete).toBe(true);
    expect(progress.waypoint).toBe(plan.route.length - 1);
  });
  it('aligns relays in order with uninterrupted presence and pauses under enemy pressure', () => {
    const plan = planFor('relays'); const progress = newFieldProgress();
    for (let i = 0; i < 30; i++) updateFieldActivity(plan, progress, plan.points[1], [], .1);
    expect(progress.collected).toHaveLength(0);
    updateFieldActivity(plan, progress, plan.points[0], [], .1);
    updateFieldActivity(plan, progress, plan.points[0], [{ ...plan.points[0], id: 'enemy' }], .1);
    expect(progress.charge).toBe(0);
    for (const point of plan.points) for (let i = 0; i < 21; i++) updateFieldActivity(plan, progress, point, [], .1);
    expect(progress.collected).toEqual([0, 1, 2]);
  });
  it('spawns three defense assaults, blocks recovery during attacks or absence, and restores wave identities', () => {
    const plan = planFor('defend'); const progress = newFieldProgress(); const player = plan.points[0];
    let result = updateFieldActivity(plan, progress, player, [], .1);
    expect(result.spawns).toHaveLength(3); expect(progress.wave).toBe(1);
    const attackers = result.spawns;
    expect(fieldSpawns(plan, structuredClone(progress))).toEqual(attackers);
    for (let i = 0; i < 100; i++) updateFieldActivity(plan, progress, player, attackers, .1);
    expect(progress.charge).toBe(0);
    for (let i = 0; i < 100; i++) updateFieldActivity(plan, progress, { x: 999, z: 999 }, [], .1);
    expect(progress.charge).toBe(0);
    let complete = false; const waveIds = new Set(attackers.map(enemy => enemy.id));
    for (let i = 0; i < 200 && !complete; i++) {
      result = updateFieldActivity(plan, progress, player, [], .1);
      result.spawns.forEach(enemy => waveIds.add(enemy.id)); complete = result.complete;
    }
    expect(progress.wave).toBe(3); expect(waveIds.size).toBe(9); expect(complete).toBe(true);
  });
  it('requires all marked captains to be defeated and retains partial hunts across a save', () => {
    const plan = planFor('hunt'); const progress = newFieldProgress(); const captains = fieldSpawns(plan, progress);
    expect(captains).toHaveLength(3);
    expect(updateFieldActivity(plan, progress, plan.points[0], captains, .1).complete).toBe(false);
    updateFieldActivity(plan, progress, plan.points[0], captains.slice(1), .1);
    expect(progress.collected).toEqual([0]);
    expect(fieldSpawns(plan, structuredClone(progress))).toEqual(captains.slice(1));
    expect(updateFieldActivity(plan, progress, plan.points[0], [], .1).complete).toBe(true);
  });
});
