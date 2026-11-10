import * as THREE from 'three';
import type { WorldV2GameSession } from '../game/WorldV2GameSession';
import {
  HttpWorldArtifactTransport,
  WorldV2ArtifactSource,
  WorldV2GameplayBridge,
} from '../world-v2/WorldV2GameplayBridge';
import { createWorldTerrainVisual } from '../world-v2/WorldTerrainRender';
import { surfaceAt, type TerrainCellStore } from '../world-v2/WorldSurface';
import {
  moveWorldActor,
  type WorldObstacle,
} from '../world-v2/WorldActorSurface';
import { makeSceneryPlacements } from '../world-v2/WorldScenery';
import type { WorldPosition } from '../world-v2/WorldCoordinates';
import { addPaintedSky } from './PaintedWorldStyle';
import { disposeObject } from './SceneResources';

type Visual = ReturnType<typeof createWorldTerrainVisual> & {
  obstacles: WorldObstacle[];
};

/** Opt-in integration session on the existing provisional baked atlas.
 * Actors and meshes currently both use global coordinates; floating-origin
 * rebasing and river/ocean gameplay are deliberately not implemented here. */
export class WorldV2GameWorld implements WorldV2GameSession {
  readonly group = new THREE.Group();
  readonly spawn: { x: number; y: number; z: number };
  readonly encounters: Array<{
    kind: 'slime' | 'sentinel';
    position: WorldPosition;
  }> = [];
  private readonly sky = new THREE.Group();
  private readonly focus = { value: new THREE.Vector4() };
  private readonly origin = { value: new THREE.Vector3() };
  private readonly bridge: WorldV2GameplayBridge<Visual>;
  private readonly store: TerrainCellStore;
  private disposed = false;
  private sun: {
    light: THREE.DirectionalLight;
    position: THREE.Vector3;
    target: THREE.Vector3;
  } | null = null;

  private constructor(source: WorldV2ArtifactSource) {
    const atlas = source.catalog.atlas;
    this.spawn = { ...source.resolveAnchor('hearthmere.arrival').position };
    this.spawn.x -= 20; // Provisional clearing-edge start, not a published story anchor.
    this.group.name = 'World V2 integrated gameplay · provisional geography';
    addPaintedSky(this.sky, 140);
    this.group.add(this.sky);
    this.bridge = new WorldV2GameplayBridge(
      source,
      {
        load: async (address, signal) => {
          const cell = await source.loadTerrainCell(address, signal);
          if (signal.aborted) throw new Error('World load cancelled');
          const visual = createWorldTerrainVisual(
            cell,
            atlas.worldSeed,
            atlas.anchors,
            this.origin,
            this.focus,
          );
          // Use the same deterministic placements as the actual scenery meshes.
          const obstacles = makeSceneryPlacements(
            cell,
            atlas.worldSeed,
            atlas.anchors,
          )
            .filter((p) => p.kind !== 'shrub')
            .map((p) => ({
              x: p.x,
              z: p.z,
              radius: p.scale * (p.kind === 'boulder' ? 1.5 : 0.36),
            }));
          this.group.add(visual.mesh);
          return { ...visual, obstacles };
        },
        unload: (visual) => {
          visual.mesh.removeFromParent();
          disposeObject(visual.mesh);
        },
        onError: (error) =>
          console.error('World V2 terrain load failed', error),
      },
      {
        activeRadius: 1,
        warmRadius: 2,
        lookAheadDistance: 32,
        maxConcurrentLoads: 3,
        maxLoadsPerUpdate: 3,
      },
    );
    this.store = {
      cellSize: atlas.cellSize,
      getCell: (address) =>
        this.bridge.streamer
          .loaded()
          .find(
            (entry) =>
              entry.resource.cell.coordinate.x === address.x &&
              entry.resource.cell.coordinate.z === address.z,
          )?.resource.cell,
    };
  }

  static async create(): Promise<WorldV2GameWorld> {
    const source = await WorldV2ArtifactSource.open(
      new HttpWorldArtifactTransport('/world-v2/geography'),
    );
    if (source.catalog.profile !== 'geography-stage-v1')
      throw new Error('Expected geography artifacts');
    const world = new WorldV2GameWorld(source);
    try {
      // Load the initial active ring before handing control to the real engine.
      await world.prepareSpawn();
      const ground = world.surface(world.spawn.x, world.spawn.z);
      if (!ground?.walkable)
        throw new Error('The arrival ground could not be loaded');
      world.spawn.y = ground.y;
      // Small engineering encounter, not a new canonical story or town plan.
      for (const [index, offset] of [
        [-6, -10],
        [4, -12],
        [8, -8],
      ].entries()) {
        const x = world.spawn.x + offset[0],
          z = world.spawn.z + offset[1];
        const sample = world.surface(x, z);
        if (sample?.walkable)
          world.encounters.push({
            kind: index === 1 ? 'sentinel' : 'slime',
            position: { x, y: sample.y, z },
          });
      }
      return world;
    } catch (error) {
      world.dispose();
      throw error;
    }
  }
  update(
    position: Pick<WorldPosition, 'x' | 'z'>,
    heading: { x: number; z: number },
  ): void {
    this.bridge.update(position, heading);
  }
  async prepareSpawn(): Promise<void> {
    for (let i = 0; i < 3; i++) {
      if (this.disposed) throw new Error('World session ended');
      this.update(this.spawn, { x: 0, z: 0 });
      await this.bridge.streamer.settle();
    }
    if (!this.surface(this.spawn.x, this.spawn.z)?.walkable)
      throw new Error('Arrival terrain unavailable');
  }
  resolveAnchor(id: string) {
    return this.bridge.resolveAnchor(id);
  }
  renderOrigin(position: WorldPosition) {
    return this.bridge.renderOrigin(position);
  }
  surface(x: number, z: number) {
    return surfaceAt(this.store, x, z);
  }
  move(from: WorldPosition, dx: number, dz: number, radius = 0.35) {
    const obstacles = this.bridge.streamer
      .loaded()
      .flatMap((e) => e.resource.obstacles);
    return moveWorldActor(this.store, obstacles, from, dx, dz, radius);
  }
  frame(seconds: number, player: THREE.Vector3, camera: THREE.Camera): void {
    this.sky.position.copy(camera.position);
    if (!this.sun) {
      const light = this.group.parent?.children.find(
        (child) => child instanceof THREE.DirectionalLight && child.castShadow,
      );
      if (light instanceof THREE.DirectionalLight)
        this.sun = {
          light,
          position: light.position.clone(),
          target: light.target.position.clone(),
        };
    }
    if (this.sun) {
      this.sun.light.position.copy(player).add(this.sun.position);
      this.sun.light.target.position.copy(player);
      this.sun.light.target.updateMatrixWorld();
    }
    camera.updateMatrixWorld();
    const view = player
      .clone()
      .add(new THREE.Vector3(0, 1.1, 0))
      .applyMatrix4(camera.matrixWorldInverse);
    this.focus.value.set(view.x, view.y, view.z, 1);
    for (const { resource } of this.bridge.streamer.loaded())
      resource.sceneryTime.value = seconds;
  }
  dispose(): void {
    if (this.disposed) return;
    if (this.sun) {
      this.sun.light.position.copy(this.sun.position);
      this.sun.light.target.position.copy(this.sun.target);
      this.sun.light.target.updateMatrixWorld();
    }
    this.disposed = true;
    this.bridge.dispose();
    this.sky.removeFromParent();
    disposeObject(this.sky);
    this.group.removeFromParent();
  }
}
