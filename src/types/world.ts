import { ZoneId } from './game';

export interface PortalTrigger {
  id: string;
  label: string;
  subtitle: string;
  targetZone: ZoneId;
  targetChapterIndex?: number;
  requiresChapterId?: string;
  targetSpawnTag:
    | 'from_town'
    | 'from_stomping_south'
    | 'from_stomping_north'
    | 'from_market'
    | 'from_market_north'
    | 'from_ruins_south'
    | 'from_ruins_north'
    | 'from_sanctum'
    | 'from_bellroad';
  // Campaign roads return to a town landing rather than a combat-route reward trigger.
  position: { x: number; z: number };
  radius: number;
  colorHex: number;
}

export interface NpcActor {
  id: string;
  name: string;
  role: string;
  dialogue: string;
  position: { x: number; z: number };
  colorHex: number;
}

export interface PathWaypoint {
  index: number;
  x: number;
  z: number;
  radius: number;
  distanceFromStart: number;
}

export interface ProceduralEncounterPack {
  waypointIndex: number;
  x: number;
  z: number;
  enemies: Array<'slime' | 'sentinel' | 'boss_knight'>;
}

export interface ProceduralPathLayout {
  seed: number;
  version?: 1 | 2;
  topology?: string;
  totalDistance: number;
  segmentCount: number;
  segmentLength: number;
  corridorHalfWidth: number;
  waypoints: PathWaypoint[];
  encounters: ProceduralEncounterPack[];
  connections?: [number, number][];
  startPortalPos: { x: number; z: number };
  endPortalPos: { x: number; z: number };
}
