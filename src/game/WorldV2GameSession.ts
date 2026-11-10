import type * as THREE from 'three';
import type { WorldV2GameplayPort } from '../world-v2/WorldV2GameplayBridge';
import type { WorldPosition } from '../world-v2/WorldCoordinates';
import type {
  TraversalResult,
  WorldSurfaceSample,
} from '../world-v2/WorldSurface';
import type { EnemyKind } from '../rendering/EnemyMeshBuilder';

/** Scene/spatial services only. GameEngine remains the sole combat, input,
 * animation, companion and HUD owner. No quest or save owner lives here. */
export interface WorldV2GameSession extends WorldV2GameplayPort {
  readonly group: THREE.Group;
  readonly spawn: WorldPosition;
  readonly encounters: readonly { kind: EnemyKind; position: WorldPosition }[];
  prepareSpawn(): Promise<void>;
  surface(x: number, z: number): WorldSurfaceSample | null;
  move(
    from: WorldPosition,
    dx: number,
    dz: number,
    radius?: number,
  ): TraversalResult;
  frame(seconds: number, player: THREE.Vector3, camera: THREE.Camera): void;
}
