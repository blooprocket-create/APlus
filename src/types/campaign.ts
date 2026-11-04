import type { CharacterSaveData, ZoneId } from './game';

export type ChronicleRegion = 'whispering_woods' | 'ember_coast' | 'glass_desert' | 'frostmarch' | 'crown_of_night' | 'world_heart';
export type ObjectiveKind = 'memory' | 'puzzle' | 'battle' | 'conversation' | 'choice' | 'field';
export type FieldActivityKind = 'recover' | 'escort' | 'defend' | 'relays' | 'hunt';
export interface FieldActivityDefinition { kind: FieldActivityKind; title: string; instruction: string; labels: string[] }
export interface FieldProgress {
  collected: number[];
  charge: number;
  wave: number;
  waypoint: number;
  actor?: { x: number; z: number };
}
export interface ChronicleObjective {
  id: string;
  kind: ObjectiveKind;
  title: string;
  hint: string;
  speaker: string;
  text: string[];
  clue?: string;
  options?: string[];
  answer?: number;
  field?: FieldActivityDefinition;
}
export interface ChronicleChapter {
  id: string;
  act: string;
  title: string;
  region: ChronicleRegion;
  subtitle: string;
  seed: number;
  palette: { ground: number; stone: number; foliage: number; glow: number; sky: number };
  guardian: { name: string; epithet: string; lastWords: string };
  objectives: ChronicleObjective[];
  codex: { title: string; text: string };
}
export interface CampaignState {
  version: 1;
  started: boolean;
  chapterIndex: number;
  objectiveIndex: number;
  chapterProgress: Record<string, number>;
  completedChapterIds: string[];
  discoveries: string[];
  choices: Record<string, number>;
  codexEntries: string[];
  journal: string[];
  checkpoints: Record<string, { journey: NonNullable<CharacterSaveData['journeyState']>; position: { x: number; y: number; z: number } }>;
  worldSeeds?: Record<string, number>;
  fieldProgress?: Record<string, FieldProgress>;
}
export interface ChronicleSite {
  id: string;
  title: string;
  kind: ObjectiveKind | 'echo';
  position: { x: number; z: number };
  objectiveIndex: number;
  text?: string;
}
export interface ChronicleInteraction {
  chapterTitle: string;
  objective: ChronicleObjective;
  siteId: string;
  optional: boolean;
}
export interface ChronicleView {
  chapter: ChronicleChapter;
  state: CampaignState;
  currentZone: ZoneId;
}
