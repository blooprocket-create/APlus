import { Scene, Sprite, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { CHRONICLE_CHAPTERS } from '../src/data/chronicle';
import { buildChronicleLayout } from '../src/game/ChronicleWorld';
import { sweepGroundMovement } from '../src/game/GroundMeshCollider';
import { buildChronicleEnvironment } from '../src/rendering/ChronicleEnvironment';

vi.mock('../src/rendering/WorldLabel', () => ({ worldLabel: () => new Sprite() }));

describe('Ember Coast mesh collision', () => {
  it.each([1, 2] as const)('keeps the version %s crossings walkable and stops movement into the sea', version => {
    const chapter = CHRONICLE_CHAPTERS.find(chapter => chapter.region === 'ember_coast')!;
    const { layout, sites } = buildChronicleLayout(chapter, chapter.seed, version);
    const { biome } = buildChronicleEnvironment(new Scene(), chapter, layout, sites);
    const walkable = biome!.walkable;
    for (const [start, end] of layout.connections!) {
      const a = layout.waypoints[start], b = layout.waypoints[end];
      for (const t of [0, .25, .5, .75, 1]) {
        expect(walkable({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }),
          `crossing ${start} to ${end} at ${t}`).toBe(true);
      }
    }
    const start = layout.startPortalPos;
    const offshore = new Vector3(start.x, 0, start.z + 23);
    expect(walkable(offshore)).toBe(false);
    sweepGroundMovement(offshore, start.x, start.z, walkable);
    expect(walkable(offshore)).toBe(true);
    expect(offshore.z - start.z).toBeGreaterThan(8);
    expect(offshore.z - start.z).toBeLessThan(13);
  });
});
