import * as THREE from 'three';
import type { WorldV2GameplayPort } from '../world-v2/WorldV2GameplayBridge';
import { getViewportProfile } from '../platform/Viewport';
import { dressGuardian } from '../rendering/GuardianRegalia';
import { BossFinisher } from '../rendering/BossFinisher';
import { FinisherFrame } from './FinisherTimeline';
import { MoatSlice, SLICE_CAMP, SliceActors } from './MoatSlice';
import { HearthmereOpening, HEARTHMERE_COVER, HEARTHMERE_REFUGE, HEARTHMERE_WAYSTATION } from './HearthmereOpening';
import { type HearthmereSave, writeHearthmereSave } from '../persistence/HearthmereSave';
import { heroSyllables, type HeroExpression, type HeroSyllable } from './HeroSpeech';
import { CHRONICLE_CHAPTERS, REGION_NAMES } from '../data/chronicle';
import { ChronicleInteraction, ChronicleSite } from '../types/campaign';
import { advanceChronicle, beginChapter, chronicleObjectiveView, currentChapter, currentObjective, ensureCampaign, isChronicleRegion } from './CampaignEngine';
import { buildChronicleLayout, chapterSeed } from './ChronicleWorld';
import { sweepGroundMovement } from './GroundMeshCollider';
import { campaignRoads, roadDirectionTarget } from './WorldRoutes';
import { createFieldPlan, FieldPlan, FieldSpawn, fieldSpawns, fieldStatus, fieldTarget, newFieldProgress, updateFieldActivity } from './FieldActivities';
import { AudioSystem } from '../audio/AudioSystem';
import { AttackPattern, FLASK_CAPACITY, getAttackPattern, getGuardianPattern, isInsideAttack, isSafeZone, resolveFlask } from './CombatRules';
import { MapSnapshot } from '../ui/Minimap';
import { CHARACTER_CLASSES, computeEffectiveStats } from '../data/classes';
import { ActionId, InputManager } from '../input/InputManager';
import { PersistenceManager, xpRequiredForLevel } from '../persistence/PersistenceManager';
import { attachAnimeOutline, createAnimeToonMaterial } from '../rendering/AnimeMaterials';
import { CharacterAnimationState, CharacterRig } from '../rendering/CharacterMeshBuilder';
import { heroAttackAdvance, heroAttackRetreat, heroReleaseProgress } from '../rendering/HeroMotion';
import { buildEnemyMesh, EnemyKind, EnemyMeshBundle } from '../rendering/EnemyMeshBuilder';
import { EnvironmentBuilder, SAFE_ZONE_RADIUS } from '../rendering/EnvironmentBuilder';
import { MinimapTerrainCapture } from '../rendering/MinimapTerrainCapture';
import { buildDeathmark } from '../rendering/Deathmark';
import { buildGravitySingularity } from '../rendering/GravitySingularity';
import { IsometricCameraController } from '../rendering/IsometricCamera';
import { buildLobbyMote } from '../rendering/LobbyMote';
import { disposeObject } from '../rendering/SceneResources';
import { buildKunai, buildShadowChakram } from '../rendering/NightbladeProjectiles';
import { buildStarlightProjectile } from '../rendering/StarlightProjectile';
import { VfxSystem } from '../rendering/VfxSystem';
import {
  CharacterClassId,
  CharacterSaveData,
  CharacterStats,
  CompanionStatusView,
  CutsceneId,
  InventoryItem,
  ZoneId,
} from '../types/game';
import { NpcActor, PortalTrigger, ProceduralPathLayout } from '../types/world';
import { QuestObjectiveView } from '../types/quest';
import { generateLootItem } from './LootSystem';
import {
  COMPANION_STANCE_INFO,
  ensureCompanionConfigs,
  ensureSkillRunes,
} from './ManagementSystem';
import {
  clampToProceduralPath,
  generateStompingGroundsPath,
} from './ProceduralPathGenerator';
import { CANONICAL_HERO_NAMES, getCompanionClassesForPlayer } from './CompanionRoster';
import { normalizeQuestState, QuestEngine } from './QuestEngine';

export interface CompanionEntity {
  classId: CharacterClassId;
  name: string;
  level: number;
  isFromAccountSlot: boolean;
  wingSide: -1 | 1;
  rig: CharacterRig;
  position: THREE.Vector3;
  yaw: number;
  attackCooldown: number;
  attackCount: number;
  animState: CharacterAnimationState;
  activeAttackTimer: number;
  pendingAttack?: TimedHeroRelease;
  actionText: string;
}

interface TimedHeroRelease {
  releaseAt: number;
  release: () => void;
  advance: number;
  travelled: number;
}

function stepIntoStrike(attack: TimedHeroRelease, progress: number, position: THREE.Vector3, yaw: number): boolean {
  if (attack.advance === 0) return false;
  const travel = attack.advance * THREE.MathUtils.smoothstep(progress, attack.releaseAt * .20, attack.releaseAt);
  const delta = travel - attack.travelled;
  attack.travelled = travel;
  position.x += Math.sin(yaw) * delta;
  position.z += Math.cos(yaw) * delta;
  return delta > 0;
}

interface PendingHeroAttack extends TimedHeroRelease {
  committed: boolean;
  retreat: ReturnType<typeof heroAttackRetreat>;
}

const COMPANION_SWING_DURATION = 0.32;

export interface EnemyEntity {
  id: string;
  kind: EnemyKind;
  name: string;
  maxHp: number;
  hp: number;
  attack: number;
  speed: number;
  radius: number;
  xpReward: number;
  goldReward: number;
  attackCooldown: number;
  hitFlashTimer: number;
  knockbackVel: THREE.Vector3;
  bundle: EnemyMeshBundle;
  windup: number;
  attackPattern: AttackPattern | null;
  attackTarget: THREE.Vector3;
  telegraph: THREE.Group | null;
  enraged: boolean;
  lastWords?: string;
}

export interface ProjectileEntity {
  shape: 'orb' | 'comet' | 'kunai' | 'chakram';
  id: string;
  mesh: THREE.Object3D;
  position: THREE.Vector3;
  visualOffset?: THREE.Vector3;
  velocity: THREE.Vector3;
  radius: number;
  damageMultiplier: number;
  energyGain: number;
  colorHex: number;
  accentHex: number;
  colorCss: string;
  age: number;
  maxLifetime: number;
  pierceRemaining: number;
  explodeRadius: number;
  homingStrength: number;
  spinSpeed: number;
  hitEnemyIds: Set<string>;
}

export interface GroundHazardEntity {
  id: string;
  mesh: THREE.Object3D;
  position: THREE.Vector3;
  radius: number;
  damageMultiplier: number;
  energyGain: number;
  colorCss: string;
  age: number;
  duration: number;
  tickInterval: number;
  tickTimer: number;
  pullInward: boolean;
  pose: (age: number, duration: number, sinceTick: number) => void;
}

export interface LootOrbEntity {
  id: string;
  mesh: THREE.Object3D;
  position: THREE.Vector3;
  gold: number;
  item: InventoryItem | null;
  age: number;
}

export interface ExpeditionReport {
  zone: ZoneId;
  kills: number;
  seconds: number;
  gold: number;
  damageTaken: number;
}

export interface HudTelemetry {
  map: MapSnapshot;
  boss: { name: string; hp: number; maxHp: number; enraged: boolean } | null;
  flaskCharges: number;
  expedition: { defeated: number; total: number; seconds: number };
  damageFlash: boolean;
  nearbyChronicle: { title: string; resolved: boolean } | null;
  fieldActivity: { status: string; instruction: string } | null;
  hp: number;
  maxHp: number;
  xp: number;
  xpToNextLevel: number;
  level: number;
  gold: number;
  aetherCrystals: number;
  ultimateEnergy: number;
  zoneId: ZoneId;
  zoneTitle: string;
  zoneSubtitle: string;
  isSafeZone: boolean;
  pathProgress: number; // 0..1 when in stomping_grounds
  pathSeed: number | null;
  nearbyPortal: PortalTrigger | null;
  portalLocked: boolean;
  nearbyNpc: NpcActor | null;
  questView: QuestObjectiveView;
  companions: CompanionStatusView[];
  wave: number;
  enemiesRemaining: number;
  comboCount: number;
  comboRank: string;
  cooldowns: Record<ActionId, { remaining: number; total: number }>;
  lastSavedText: string;
  slice?: { bossAvailable: boolean; bossLocked: boolean; committed: boolean; canUseLever: boolean };
  opening?: { action?: string; line?: { speaker: string; text: string }; committed: boolean };
}

export interface GameEngineCallbacks {
  onHudUpdate: (telemetry: HudTelemetry) => void;
  onUltimateCutIn: (className: string, skillName: string, colorCss: string) => void;
  onBannerNotification: (title: string, subtitle: string) => void;
  onLootObtained: (item: InventoryItem) => void;
  onCharacterSaved: (character: CharacterSaveData) => void;
  onDefeated?: () => void;
  onZoneCleared?: (report: ExpeditionReport) => void;
  onFinisherFrame?: (frame: FinisherFrame) => void;
  onFinisherEnd?: () => void;
  onChronicleInteraction?: (interaction: ChronicleInteraction) => void;
  onTriggerCutscene?: (cutsceneId: CutsceneId) => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private cameraController: IsometricCameraController;
  private environment: EnvironmentBuilder;
  /** Optional V2 residency/anchor port. Never enabled for legacy Hearthmere. */
  private worldV2Port: WorldV2GameplayPort | null = null;
  private worldV2LastTick = -Infinity;
  private worldV2PreviousPosition: { x: number; z: number } | null = null;
  private minimapTerrain: MinimapTerrainCapture | null = null;
  private vfx: VfxSystem;
  public readonly input: InputManager;
  private persistence: PersistenceManager;
  private callbacks: GameEngineCallbacks;

  private mode: 'preview' | 'playing' = 'preview';
  private slice: MoatSlice | null = null;
  private opening: HearthmereOpening | null = null;
  private heroDialogue: { actor: CharacterRig; tone: HeroExpression; cues: readonly HeroSyllable[]; elapsed: number } | null = null;
  private openingSaveFailed = false;
  private sliceBossLock: EnemyEntity | null = null;
  private sliceBossDefeated = false;
  private sliceWindup = 0;
  private previewRig: CharacterRig | null = null;
  private previewCompanionRigs: CharacterRig[] = [];
  private previewMote: ReturnType<typeof buildLobbyMote> | null = null;
  private pedestalMesh: THREE.Mesh | null = null;

  // Active Gameplay State
  private activeCharacter: CharacterSaveData | null = null;
  private effectiveStats: CharacterStats | null = null;
  private playerRig: CharacterRig | null = null;
  private playerPos = new THREE.Vector3(0, 0, 0);
  private readonly biomePlayerSafe = new THREE.Vector3();
  private playerYaw = 0;
  private animState: CharacterAnimationState = {
    isMoving: false,
    moveSpeedRatio: 0,
    attackComboStep: 0,
    attackSwingProgress: 0,
    isDashing: false,
    hitFlashTimer: 0,
  };

  // Multi-Zone & Procedural Path State
  private currentZone: ZoneId = 'starting_town';
  private currentPathLayout: ProceduralPathLayout | null = null;
  private currentPathProgress = 0;
  private activePortals: PortalTrigger[] = [];
  private activeNpcs: NpcActor[] = [];
  private nearbyPortal: PortalTrigger | null = null;
  private nearbyNpc: NpcActor | null = null;
  private portalGraceTimer = 0;
  private compassGroup: THREE.Group | null = null;

  private comboStep = 0;
  private comboResetTimer = 0;
  private activeAttackTimer = 0;
  private activeAttackDuration = 0.26;
  private pendingAttack: PendingHeroAttack | null = null;
  private attackRetreat: { yaw: number; distance: number; from: number; until: number; travelled: number } | null = null;
  private dashTimer = 0;
  private dashDirection = new THREE.Vector3(0, 0, 1);
  private invulnerableTimer = 0;

  private hitComboCount = 0;
  private hitComboDecayTimer = 0;

  private cooldowns: Record<ActionId, number> = {
    basic: 0,
    dash: 0,
    skill1: 0,
    skill2: 0,
    ultimate: 0,
  };

  private enemies: EnemyEntity[] = [];
  private companions: CompanionEntity[] = [];
  private projectiles: ProjectileEntity[] = [];
  private groundHazards: GroundHazardEntity[] = [];
  private lootOrbs: LootOrbEntity[] = [];
  private autoSaveTimer = 0;
  private supportPulseTimer = 0;
  private lastSavedAt = Date.now();
  private lastFrameTime = performance.now();
  public readonly audio = new AudioSystem();
  private pauseReasons = new Set<string>();
  private defeated = false;
  private flaskCharges = FLASK_CAPACITY;
  private flaskCooldown = 0;
  private hitStop = 0;
  private hudTimer = 0;
  private expedition = { total: 0, defeated: 0, seconds: 0, gold: 0, damageTaken: 0 };
  private saveQueue: Promise<void> = Promise.resolve();
  private defeatedEnemyIds = new Set<string>();
  private finisher: BossFinisher | null = null;
  private chronicleSites: ChronicleSite[] = [];
  private nearbyChronicleSite: ChronicleSite | null = null;
  private fieldPlan: FieldPlan | null = null;
  private travelInProgress = false;

  /**
   * Phase 1 opt-in seam. A future World V2 game mode attaches its runtime here;
   * legacy opening, quests, collision and saves retain their existing behavior.
   * The caller owns setup; the engine owns detachment between sessions.
   */
  public attachWorldV2Port(port: WorldV2GameplayPort | null): void {
    if (port === this.worldV2Port) return;
    this.worldV2Port?.dispose();
    this.worldV2Port = port;
    this.worldV2LastTick = -Infinity;
    this.worldV2PreviousPosition = null;
  }

  public get isFinishing(): boolean { return this.finisher !== null; }
  public get isSlice(): boolean { return this.slice !== null; }
  public get isOpening(): boolean { return this.opening !== null; }
  public skipBossFinisher(): void { this.finisher?.finish(); }

  private sliceActors(): SliceActors {
    const playerClass = this.activeCharacter!.classId;
    return {
      playerClass,
      position: role => role === playerClass ? this.playerPos : this.companions.find(c => c.classId === role)!.position,
      pose: (role, yaw, moving) => {
        if (role === playerClass) {
          this.playerYaw = yaw;
          this.animState.isMoving = moving;
          this.animState.moveSpeedRatio = moving ? 1 : 0;
          return;
        }
        const companion = this.companions.find(c => c.classId === role)!;
        if (moving) companion.yaw = yaw;
        companion.animState.isMoving = moving;
        companion.animState.moveSpeedRatio = moving ? 1 : 0;
        companion.actionText = moving ? 'Crossing plan' : 'Ready';
      },
    };
  }

  public useSliceUtility(): void {
    if (!this.slice || this.isPaused || this.dashTimer > 0 || this.sliceWindup > 0) return;
    if (this.slice.useUtility(this.sliceActors())) this.audio.play('dash');
    this.emitHudTelemetry();
  }

  public toggleSliceBossLock(): void {
    if (!this.slice || this.isPaused) return;
    this.sliceBossLock = this.sliceBossLock ? null : this.findSliceBoss();
    this.emitHudTelemetry();
  }

  private findSliceBoss(): EnemyEntity | null {
    return this.enemies.find(enemy => enemy.kind === 'boss_knight' && enemy.bundle.root.position.distanceToSquared(this.playerPos) < 19 * 19) ?? null;
  }

  public previewBossFinisher(classId: CharacterClassId): void {
    if (this.finisher || this.mode !== 'preview') return;
    this.setPreviewCharacter(classId);
    const hero = this.previewRig!;
    if (this.previewMote) this.previewMote.visible = false;
    const boss = buildEnemyMesh('boss_knight');
    boss.root.position.set(0, 0, -2.5); this.scene.add(boss.root);
    this.previewCompanionRigs.forEach(rig => { rig.root.visible = false; });
    this.setPaused('finisher', true);
    this.audio.startCinematic();
    this.finisher = new BossFinisher(this.scene, this.cameraController.camera,
      { hero, boss, classId, bossName: 'Avel, the Rootbound', lastWords: CHRONICLE_CHAPTERS[0].guardian.lastWords },
      frame => this.callbacks.onFinisherFrame?.(frame), cue => this.audio.cinematic(cue),
      () => {
        this.finisher = null; this.audio.stopCinematic(); this.setPaused('finisher', false);
        this.removeSceneObject(boss.root);
        this.previewCompanionRigs.forEach(rig => { rig.root.visible = true; });
        this.cameraController.updateAspect();
        this.cameraController.snapToPedestalPreview();
        this.callbacks.onFinisherEnd?.();
      }, this.cameraController.shakeEnabled);
  }

  private beginBossFinisher(enemy: EnemyEntity): void {
    if (this.finisher || !this.playerRig || !this.activeCharacter) return;
    enemy.hp = 1; this.removeTelegraph(enemy);
    this.setPaused('finisher', true);
    this.audio.startCinematic();
    this.finisher = new BossFinisher(this.scene, this.cameraController.camera,
      { hero: this.playerRig, boss: enemy.bundle, classId: this.activeCharacter.classId, bossName: enemy.name, lastWords: enemy.lastWords ?? 'The oath is broken. Let the ones I kept waiting find their way home.' },
      frame => this.callbacks.onFinisherFrame?.(frame), cue => this.audio.cinematic(cue),
      () => {
        this.finisher = null; this.audio.stopCinematic(); this.setPaused('finisher', false);
        this.callbacks.onFinisherEnd?.();
        const index = this.enemies.findIndex(candidate => candidate.id === enemy.id);
        if (index >= 0) { enemy.hp = 0; this.handleEnemyDefeated(enemy, index); }
        this.cameraController.updateAspect();
        this.cameraController.snapToIsometricFollow(this.playerPos);
        this.emitHudTelemetry();
      }, this.cameraController.shakeEnabled);
  }

  public async travelToChapter(index: number): Promise<boolean> {
    if (this.slice || this.opening) return false;
    if (!this.activeCharacter || this.finisher || this.defeated) return false;
    if (!await this.saveActiveCharacterNow()) return false;
    if (!beginChapter(this.activeCharacter, index)) return false;
    const chapter = currentChapter(this.activeCharacter);
    const checkpoint = ensureCampaign(this.activeCharacter).checkpoints[chapter.id];
    if (checkpoint) this.activeCharacter.position = { ...checkpoint.position };
    const state = ensureCampaign(this.activeCharacter);
    const seed = checkpoint?.journey.seed ?? (state.worldSeeds![chapter.id] ??= chapterSeed(this.activeCharacter.id, chapter));
    this.enterZone(chapter.region, undefined, seed, checkpoint ? { ...checkpoint.journey, flaskCharges: this.flaskCharges } : undefined);
    this.emitHudTelemetry();
    return true;
  }

  private async traverseWorldRoad(portal: PortalTrigger): Promise<void> {
    if (this.travelInProgress || !this.activeCharacter) return;
    this.travelInProgress = true; this.setPaused('travel', true);
    try {
      if (portal.targetChapterIndex !== undefined) await this.travelToChapter(portal.targetChapterIndex);
      else if (await this.saveActiveCharacterNow()) this.enterZone(portal.targetZone, portal.targetSpawnTag);
    } finally { this.travelInProgress = false; this.setPaused('travel', false); }
  }

  private fieldThreats() {
    return this.enemies.map(enemy => ({ id: enemy.id, x: enemy.bundle.root.position.x, z: enemy.bundle.root.position.z }));
  }

  private spawnFieldEnemies(spawns: FieldSpawn[]): void {
    for (const spawn of spawns) {
      this.spawnEnemyAtPosition(spawn.kind, spawn.x, spawn.z, 1 + ensureCampaign(this.activeCharacter!).chapterIndex * .09);
      const enemy = this.enemies[this.enemies.length - 1]; enemy.id = spawn.id;
      if (spawn.id.includes('_captain_')) { enemy.name = 'Ministry Warden'; enemy.hp = enemy.maxHp = Math.round(enemy.maxHp * 1.8); }
      this.expedition.total += 1;
    }
  }

  private initializeFieldActivity(): void {
    if (!this.activeCharacter || !this.currentPathLayout) return;
    const objective = currentObjective(this.activeCharacter);
    if (!objective?.field || objective.kind !== 'field') return;
    const state = ensureCampaign(this.activeCharacter);
    const progress = state.fieldProgress![objective.id] ??= newFieldProgress();
    this.fieldPlan = createFieldPlan(objective.id, objective.field, this.currentPathLayout);
    this.environment.showFieldActivity(this.fieldPlan, progress);
    this.spawnFieldEnemies(fieldSpawns(this.fieldPlan, progress));
  }

  private updateFieldObjective(dt: number): void {
    if (!this.activeCharacter || !this.fieldPlan || !isChronicleRegion(this.currentZone)) return;
    const objective = currentObjective(this.activeCharacter);
    if (objective?.id !== this.fieldPlan.id || objective.kind !== 'field') return;
    const state = ensureCampaign(this.activeCharacter);
    const progress = state.fieldProgress![objective.id];
    const result = updateFieldActivity(this.fieldPlan, progress, this.playerPos, this.fieldThreats(), dt);
    this.spawnFieldEnemies(result.spawns);
    this.environment.updateFieldActivity(progress, !result.complete);
    if (result.notice) this.callbacks.onBannerNotification(result.notice.toUpperCase(), fieldStatus(this.fieldPlan, progress));
    if (result.complete) {
      const advanced = advanceChronicle(this.activeCharacter, objective.id);
      if (advanced.advanced) {
        state.journal.push(`${objective.speaker}: ${objective.text.join(' ')}`);
        this.checkAndApplyLevelUps(); this.spawnChronicleGuardian();
        this.callbacks.onBannerNotification('THE ROAD REMEMBERS', `Recovered account added to your journal. ${currentObjective(this.activeCharacter)?.title ?? 'Follow the road onward.'}`);
      }
      this.fieldPlan = null;
    }
    if (result.changed || result.complete) void this.saveActiveCharacterNow();
  }

  private spawnChronicleGuardian(): void {
    if (!this.activeCharacter || !this.currentPathLayout || !isChronicleRegion(this.currentZone)) return;
    const chapter = currentChapter(this.activeCharacter);
    if (currentObjective(this.activeCharacter)?.kind !== 'battle' || this.enemies.some(enemy => enemy.kind === 'boss_knight')) return;
    const point = this.currentPathLayout.waypoints[11];
    this.spawnEnemyAtPosition('boss_knight', point.x, point.z, 1.1 + ensureCampaign(this.activeCharacter).chapterIndex * 0.08);
    const enemy = this.enemies[this.enemies.length - 1];
    dressGuardian(enemy.bundle, chapter.region, chapter.palette.glow);
    enemy.name = chapter.guardian.name; enemy.lastWords = chapter.guardian.lastWords;
    enemy.hp = enemy.maxHp = Math.round(enemy.maxHp * 2.2);
    this.expedition.total += 1;
  }

  private interactChronicleSite(): boolean {
    if (!this.activeCharacter || !this.nearbyChronicleSite || this.isPaused) return false;
    const site = this.nearbyChronicleSite;
    const state = ensureCampaign(this.activeCharacter);
    const chapter = currentChapter(this.activeCharacter);
    if (state.discoveries.includes(site.id)) return false;
    const objective = site.kind === 'echo' ? { id: site.id, kind: 'memory' as const, title: site.title, hint: '', speaker: 'An echo of Elarion', text: [site.text ?? ''] } : chapter.objectives[site.objectiveIndex];
    if (site.kind !== 'echo' && (site.objectiveIndex !== state.objectiveIndex || site.kind === 'battle' || site.kind === 'field')) return false;
    this.callbacks.onChronicleInteraction?.({ chapterTitle: chapter.title, objective, siteId: site.id, optional: site.kind === 'echo' });
    return true;
  }

  public resolveChronicleInteraction(siteId: string, option?: number): { advanced: boolean; message: string } {
    if (!this.activeCharacter || this.finisher || this.defeated) return { advanced: false, message: 'The world is not ready.' };
    const site = this.chronicleSites.find(candidate => candidate.id === siteId);
    if (!site || Math.hypot(site.position.x - this.playerPos.x, site.position.z - this.playerPos.z) > 4.5) return { advanced: false, message: 'Return to the memory stone.' };
    const state = ensureCampaign(this.activeCharacter);
    if (site.kind === 'field') return { advanced: false, message: 'Complete this objective in the world. Follow the gold compass.' };
    if (site.kind === 'echo') {
      if (state.discoveries.includes(site.id)) return { advanced: false, message: 'This echo is already in your journal.' };
      state.discoveries.push(site.id); state.journal.push(`${site.title}: ${site.text}`);
      this.activeCharacter.xp += 40; this.activeCharacter.aetherCrystals += 3;
    } else {
      const result = advanceChronicle(this.activeCharacter, site.id, option);
      if (!result.advanced) return result;
      if (result.chapterComplete) this.callbacks.onBannerNotification('CHAPTER COMPLETE', result.message);
    }
    this.nearbyChronicleSite = null;
    this.spawnChronicleGuardian(); this.checkAndApplyLevelUps();
    this.vfx.spawnShockwaveRing(this.playerPos, 3, 0xd7bb86, 0xffffff, 0.5);
    void this.saveActiveCharacterNow(); this.emitHudTelemetry();
    return { advanced: true, message: 'Your journal has been updated.' };
  }

  public setPaused(reason: string, paused: boolean): void {
    if (paused) this.pauseReasons.add(reason);
    else this.pauseReasons.delete(reason);
    this.input.resetAll();
    if (reason === 'orientation') this.audio.suspendForInterruption(paused || document.visibilityState === 'hidden');
  }

  public get isPaused(): boolean { return this.pauseReasons.size > 0 || this.defeated; }

  public setScreenShake(enabled: boolean): void { this.cameraController.shakeEnabled = enabled; }

  public useFlask(): void {
    if (this.mode !== 'playing' || this.isPaused || !this.activeCharacter || !this.effectiveStats || this.flaskCooldown > 0) return;
    const result = resolveFlask(this.activeCharacter.currentHp, this.effectiveStats.maxHp, this.flaskCharges);
    if (!result.healed) {
      this.callbacks.onBannerNotification(this.flaskCharges === 0 ? 'FLASK EMPTY' : 'VITALITY FULL', this.flaskCharges === 0 ? 'Return to a sanctuary to refill your flask.' : 'Save your flask for the next battle.');
      return;
    }
    this.activeCharacter.currentHp = result.hp;
    this.flaskCharges = result.charges;
    this.flaskCooldown = 0.7;
    void this.saveActiveCharacterNow();
    this.audio.play('heal');
    this.vfx.spawnShockwaveRing(this.playerPos, 2.5, 0x9ed8b4, 0xeaffdb, 0.5);
    this.vfx.spawnDamageNumber(this.playerPos, result.healed, false, '#a8e6bd', `+${result.healed}`);
    this.emitHudTelemetry();
  }

  public reviveAtSanctuary(): void {
    if (!this.defeated || !this.activeCharacter || !this.effectiveStats) return;
    this.defeated = false;
    this.activeCharacter.currentHp = this.effectiveStats.maxHp;
    this.hitComboCount = 0;
    this.hitStop = 0;
    this.cooldowns = { basic: 0, dash: 0, skill1: 0, skill2: 0, ultimate: 0 };
    if (this.opening) {
      this.resetOpeningAfterDefeat();
    } else if (this.slice) {
      this.clearZoneCombatEntities();
      this.resetSliceAtCamp();
    } else this.enterZone('starting_town');
    this.emitHudTelemetry();
  }

  constructor(
    canvas: HTMLCanvasElement,
    damageLayer: HTMLElement,
    persistence: PersistenceManager,
    callbacks: GameEngineCallbacks
  ) {
    this.canvas = canvas;
    this.persistence = persistence;
    this.callbacks = callbacks;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    const viewport = getViewportProfile();
    this.renderer.setPixelRatio(viewport.pixelRatio);
    this.renderer.setSize(viewport.width, viewport.height, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.cameraController = new IsometricCameraController();
    this.environment = new EnvironmentBuilder();
    this.environment.buildPreviewScene(this.scene);
    // Gameplay tests use a headless document with no createElement. The minimap
    // remains a presentation feature and must not be required for simulation.
    if (typeof document.createElement === 'function') {
      try { this.minimapTerrain = new MinimapTerrainCapture(); } catch { /* Fall back to plain HUD markers. */ }
    }

    this.vfx = new VfxSystem(this.scene, damageLayer);
    this.input = new InputManager();
    this.input.bindCanvas(this.canvas);

    this.buildPreviewPedestal();

    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLElement && (e.target.matches('input, textarea, select') || e.target.isContentEditable)) return;
      if (this.isPaused || e.repeat) return;
      if (e.code === 'KeyH') this.useFlask();
      if (e.code === 'KeyU') this.useSliceUtility();
      if (e.code === 'KeyL') this.toggleSliceBossLock();
      if ((e.code === 'KeyF' || e.code === 'Enter') && this.mode === 'playing') {
        if (!this.interactWithNearbyQuestNpc()) {
          this.tryTraverseNearbyPortal();
        }
      }
    });
    document.addEventListener('visibilitychange', () => {
      this.audio.suspendForInterruption(document.visibilityState === 'hidden' || this.pauseReasons.has('orientation'));
      if (document.visibilityState === 'hidden') {
        void this.saveActiveCharacterNow();
      }
    });
    window.addEventListener('pagehide', () => {
      void this.saveActiveCharacterNow();
    });

    requestAnimationFrame(this.loop);
  }

  private buildPreviewPedestal(): void {
    const geo = new THREE.CylinderGeometry(1.15, 1.35, 0.26, 32);
    const mat = createAnimeToonMaterial({
      color: 0x262b47,
      emissive: 0x4cc9f0,
      emissiveIntensity: 0.25,
    });
    this.pedestalMesh = new THREE.Mesh(geo, mat);
    this.pedestalMesh.position.set(0, 0.13, 0);
    attachAnimeOutline(this.pedestalMesh, 1.04);
    this.scene.add(this.pedestalMesh);
  }

  /**
   * Switches to 3D Pedestal Preview mode for Character Select / Creation,
   * displaying the chosen hero in the center flanked by their two companions.
   */
  public setPreviewCharacter(classId: CharacterClassId | null): void {
    this.mode = 'preview';
    this.slice = null;
    this.opening = null;
    this.sliceBossLock = null;
    this.sliceWindup = 0;
    for (const reason of this.pauseReasons) if (reason !== 'orientation') this.pauseReasons.delete(reason);
    this.defeated = false;
    this.input.resetAll();
    this.clearGameplayEntities();
    this.environment.buildPreviewScene(this.scene);

    if (this.pedestalMesh) {
      this.pedestalMesh.visible = true;
    }

    if (this.previewRig) {
      this.removeSceneObject(this.previewRig.root);
      this.previewRig = null;
    }
    this.previewMote = null;
    for (const cRig of this.previewCompanionRigs) {
      this.removeSceneObject(cRig.root);
    }
    this.previewCompanionRigs = [];

    if (classId) {
      this.previewRig = new CharacterRig(classId);
      this.previewRig.root.position.set(0, 0.26, 0.2);
      this.previewRig.root.rotation.y = { warrior: .10, mage: .12, assassin: .24 }[classId];
      this.scene.add(this.previewRig.root);
      if (classId === 'mage') {
        this.previewMote = buildLobbyMote();
        this.previewRig.root.add(this.previewMote);
      }

      const compClasses = getCompanionClassesForPlayer(classId);
      compClasses.forEach((compClass, idx) => {
        const side = idx === 0 ? -1 : 1;
        const cRig = new CharacterRig(compClass);
        cRig.root.scale.setScalar(0.86);
        const spacing = classId === 'mage' && compClass === 'warrior' ? 1.63 : 1.36;
        cRig.root.position.set(side * spacing, 0.02, -0.65);
        cRig.root.rotation.y = side * -0.27;
        this.scene.add(cRig.root);
        this.previewCompanionRigs.push(cRig);
      });
    }
    this.cameraController.snapToPedestalPreview();
  }

  /**
   * Starts the Isometric ARPG Gameplay session for a selected character slot,
   * automatically spawning the other two classes as 3D AI Companions.
   */
  public startGameplayWithCharacter(
    character: CharacterSaveData,
    accountRoster: CharacterSaveData[] = [],
    playableSlice = false,
    openingSave?: HearthmereSave
  ): void {
    this.clearGameplayEntities();
    if (this.previewRig) {
      this.removeSceneObject(this.previewRig.root);
      this.previewRig = null;
    }
    this.previewMote = null;
    for (const cRig of this.previewCompanionRigs) {
      this.removeSceneObject(cRig.root);
    }
    this.previewCompanionRigs = [];
    if (this.pedestalMesh) {
      this.pedestalMesh.visible = false;
    }

    this.mode = 'playing';
    this.slice = playableSlice ? new MoatSlice() : null;
    this.opening = openingSave ? new HearthmereOpening(character.classId, openingSave.step) : null;
    this.openingSaveFailed = false;
    this.sliceBossDefeated = false;
    this.sliceBossLock = null;
    this.sliceWindup = 0;
    for (const reason of this.pauseReasons) if (reason !== 'orientation') this.pauseReasons.delete(reason);
    this.defeated = false;
    this.flaskCharges = FLASK_CAPACITY;
    this.hitStop = 0;
    this.flaskCooldown = 0;
    this.dashTimer = 0;
    this.activeAttackTimer = 0;
    this.animState = { isMoving: false, moveSpeedRatio: 0, attackComboStep: 0, attackSwingProgress: 0, isDashing: false, hitFlashTimer: 0 };
    this.comboStep = 0;
    this.input.resetAll();
    this.activeCharacter = structuredClone(character);
    // Hearthmere and the internal moat slice do not use the retired Long Dawn
    // campaign or Riftscar quest state. Keep normalization in legacy entrypoints.
    if (!this.opening && !this.slice) {
      ensureCampaign(this.activeCharacter);
      this.activeCharacter.questState = normalizeQuestState(this.activeCharacter.questState);
    }
    ensureSkillRunes(this.activeCharacter);
    ensureCompanionConfigs(this.activeCharacter);
    if (!this.activeCharacter.seenCutscenes) {
      this.activeCharacter.seenCutscenes = [];
    }
    this.effectiveStats = computeEffectiveStats(this.activeCharacter);
    this.activeCharacter.currentHp = Math.min(
      this.effectiveStats.maxHp,
      Math.max(1, this.activeCharacter.currentHp || this.effectiveStats.maxHp)
    );

    this.playerRig = new CharacterRig(this.activeCharacter.classId);
    this.scene.add(this.playerRig.root);
    this.buildCompassArrow();
    if (!this.opening) this.spawnCompanionPair(this.activeCharacter, accountRoster);

    this.cooldowns = { basic: 0, dash: 0, skill1: 0, skill2: 0, ultimate: 0 };
    this.hitComboCount = 0;
    this.autoSaveTimer = 0;

    if (this.slice || this.opening) {
      this.currentZone = 'starting_town';
      this.currentPathLayout = null;
      this.currentPathProgress = 0;
      this.activePortals = [];
      this.activeNpcs = [];
      this.chronicleSites = [];
      this.nearbyNpc = null;
      this.nearbyPortal = null;
      this.nearbyChronicleSite = null;
      this.fieldPlan = null;
      if (this.compassGroup) this.compassGroup.visible = false;
      if (this.opening && openingSave) {
        this.environment.buildSlice(this.scene, this.opening.group, 0x758984);
        this.restoreOpening(openingSave);
        this.emitHudTelemetry();
        return;
      }
      this.environment.buildSlice(this.scene, this.slice!.group);
      this.resetSliceAtCamp();
      this.callbacks.onBannerNotification('HEARTHMERE OUTSKIRTS', 'Clear the road, open the crossing, and follow the shortcut home.');
      this.emitHudTelemetry();
      return;
    }

    const initialZone: ZoneId = this.activeCharacter.currentZone || 'starting_town';
    const journey = this.activeCharacter.journeyState;
    this.enterZone(initialZone, undefined, journey?.seed ?? undefined, journey?.zone === initialZone ? journey : undefined);
    this.emitHudTelemetry();
  }

  private restoreOpening(snapshot: HearthmereSave): void {
    const character = this.activeCharacter!;
    character.currentHp = THREE.MathUtils.clamp(snapshot.hp, 1, this.effectiveStats!.maxHp);
    character.ultimateEnergy = THREE.MathUtils.clamp(snapshot.energy, 0, 100);
    character.playTimeSeconds = Math.max(0, snapshot.seconds);
    this.flaskCharges = THREE.MathUtils.clamp(Math.floor(snapshot.flasks), 0, FLASK_CAPACITY);
    this.placeOpeningPlayer(snapshot.position, snapshot.yaw);
    if (snapshot.movingGroup) this.opening!.restoreMovingGroup(snapshot.movingGroup);
    this.spawnOpeningEncounter(snapshot.enemies);
    void this.saveActiveCharacterNow();
  }

  private placeOpeningPlayer(point: { x: number; z: number }, yaw: number): void {
    this.opening!.placePlayer(this.playerPos, point);
    this.playerYaw = yaw;
    this.playerRig!.root.position.copy(this.playerPos);
    this.playerRig!.root.rotation.y = yaw;
    if (this.opening!.hasParty && this.companions.length === 0) this.spawnCompanionPair(this.activeCharacter!, []);
    for (const companion of this.companions) {
      const nearby = { x: this.playerPos.x + companion.wingSide * 1.5, z: this.playerPos.z + 1.2 };
      const destination = this.opening!.walkable(nearby) ? nearby : this.playerPos;
      companion.position.set(destination.x, 0, destination.z);
      companion.rig.root.position.copy(companion.position);
    }
    this.cameraController.snapToIsometricFollow(this.playerPos);
  }

  private spawnOpeningEncounter(resume?: HearthmereSave['enemies']): void {
    this.expedition = { total: 0, defeated: 0, seconds: 0, gold: 0, damageTaken: 0 };
    for (const seed of this.opening!.seeds) {
      this.spawnEnemyAtPosition(seed.kind, seed.x, seed.z, seed.scale);
      if (!resume) continue;
      const enemy = this.enemies[this.enemies.length - 1];
      const saved = resume.find(entry => entry.id === enemy.id && entry.hp > 0);
      if (!saved) {
        this.enemies.pop();
        this.removeSceneObject(enemy.bundle.root);
      } else {
        enemy.hp = Math.min(saved.hp, enemy.maxHp);
        if (this.opening!.walkable(saved)) enemy.bundle.root.position.set(saved.x, 0, saved.z);
      }
    }
    this.expedition.total = this.enemies.length;
  }

  private resetOpeningAfterDefeat(): void {
    this.clearZoneCombatEntities();
    this.opening!.resetEncounter();
    const atRefuge = this.opening!.step === 'complete' || this.opening!.step === 'refuge';
    this.placeOpeningPlayer(atRefuge ? HEARTHMERE_REFUGE : HEARTHMERE_WAYSTATION, Math.PI / 2);
    this.flaskCharges = FLASK_CAPACITY;
    this.dashTimer = 0;
    this.activeAttackTimer = 0;
    this.sliceWindup = 0;
    this.animState.attackComboStep = 0;
    this.input.resetAll();
    this.spawnOpeningEncounter();
    void this.saveActiveCharacterNow();
  }

  private interactOpening(): boolean {
    const opening = this.opening!;
    if (this.isPaused || !opening.interact(this.playerPos, this.enemies.length, this.activeCharacter!.name)) return false;
    if (opening.step === 'square') {
      this.placeOpeningPlayer(HEARTHMERE_COVER, Math.PI / 2);
      this.spawnOpeningEncounter();
      this.triggerCutscene('hearthmere_shipment');
    } else if (opening.step === 'yard_gate' || opening.step === 'far_hold') {
      this.spawnOpeningEncounter();
    }
    if (opening.line) this.audio.voice(opening.line.pitch);
    void this.saveActiveCharacterNow();
    this.emitHudTelemetry();
    return true;
  }

  private resetSliceAtCamp(): void {
    this.slice!.resetToCamp();
    this.playerPos.copy(SLICE_CAMP);
    this.playerYaw = Math.PI;
    this.playerRig!.root.position.copy(this.playerPos);
    this.playerRig!.root.rotation.y = this.playerYaw;
    for (const companion of this.companions) {
      companion.position.set(this.playerPos.x + companion.wingSide * 1.9, 0, this.playerPos.z + 1.6);
      companion.rig.root.position.copy(companion.position);
      companion.yaw = this.playerYaw;
    }
    this.sliceBossLock = null;
    this.sliceWindup = 0;
    this.dashTimer = 0;
    this.activeAttackTimer = 0;
    this.animState.attackComboStep = 0;
    this.flaskCharges = FLASK_CAPACITY;
    this.input.resetAll();
    this.cameraController.snapToIsometricFollow(this.playerPos);
    this.expedition = { total: 0, defeated: 0, seconds: 0, gold: 0, damageTaken: 0 };
    if (this.slice!.step === 'road') {
      this.spawnEnemyAtPosition('slime', -10.3, -4.2, 0.72);
      this.spawnEnemyAtPosition('sentinel', -6, -7.6, 0.7);
      if (!this.sliceBossDefeated) {
        this.spawnEnemyAtPosition('boss_knight', -8, -13, 0.6);
        this.enemies[this.enemies.length - 1].name = 'Causeway Guardian';
      }
      this.expedition.total = this.enemies.length;
    }
  }

  private spawnCompanionPair(
    playerChar: CharacterSaveData,
    accountRoster: CharacterSaveData[]
  ): void {
    for (const c of this.companions) {
      this.removeSceneObject(c.rig.root);
    }
    this.companions = [];

    const companionClasses = getCompanionClassesForPlayer(playerChar.classId);
    companionClasses.forEach((compClassId, idx) => {
      const rosterMatch = accountRoster.find(
        (r) => r.id !== playerChar.id && r.classId === compClassId
      );
      const name = rosterMatch?.name ?? CANONICAL_HERO_NAMES[compClassId];
      const level = rosterMatch?.level ?? playerChar.level;
      const wingSide: -1 | 1 = idx === 0 ? -1 : 1;

      const rig = new CharacterRig(compClassId);
      // Scale companions slightly (0.94) so the active hero remains the clear visual anchor
      rig.root.scale.setScalar(0.94);
      this.scene.add(rig.root);

      this.companions.push({
        classId: compClassId,
        name,
        level,
        isFromAccountSlot: Boolean(rosterMatch),
        wingSide,
        rig,
        position: new THREE.Vector3(wingSide * 1.9, 0, 1.8),
        yaw: Math.PI,
        attackCooldown: 0.6 + idx * 0.35,
        attackCount: 0,
        animState: {
          isMoving: false,
          moveSpeedRatio: 0,
          attackComboStep: 0,
          attackSwingProgress: 0,
          isDashing: false,
          hitFlashTimer: 0,
        },
        activeAttackTimer: 0,
        actionText: 'In Formation',
      });
    });
  }

  /**
   * Transitions the player into a target Zone via portal or initial spawn.
   */
  public enterZone(
    zoneId: ZoneId,
    spawnTag?: PortalTrigger['targetSpawnTag'],
    explicitSeed?: number,
    resume?: CharacterSaveData['journeyState']
  ): void {
    if (this.slice || this.opening) return;
    if (!this.activeCharacter || !this.effectiveStats) return;

    const savedPosition = resume ? { ...this.activeCharacter.position } : null;
    const savedQuest = resume ? structuredClone(this.activeCharacter.questState) : null;
    for (const orb of this.lootOrbs) this.collectLootOrb(orb);
    this.clearZoneCombatEntities();
    this.defeatedEnemyIds.clear();
    this.currentZone = zoneId;
    this.expedition = { total: 0, defeated: 0, seconds: 0, gold: 0, damageTaken: 0 };
    this.hitStop = 0;
    this.dashTimer = 0;
    this.activeAttackTimer = 0;
    this.input.resetAll();
    if (isSafeZone(zoneId)) this.flaskCharges = FLASK_CAPACITY;
    this.activeCharacter.currentZone = zoneId;
    this.portalGraceTimer = 1.65;
    this.nearbyPortal = null;
    this.nearbyNpc = null;
    this.chronicleSites = [];
    this.nearbyChronicleSite = null;
    this.fieldPlan = null;

    if (isChronicleRegion(zoneId)) {
      const chapter = currentChapter(this.activeCharacter);
      const state = ensureCampaign(this.activeCharacter);
      const seed = explicitSeed ?? (state.worldSeeds![chapter.id] ??= chapterSeed(this.activeCharacter.id, chapter));
      state.worldSeeds![chapter.id] = seed;
      const built = buildChronicleLayout(chapter, seed, resume?.layoutVersion ?? (resume ? 1 : 2));
      this.currentPathLayout = built.layout; this.chronicleSites = built.sites;
      this.environment.buildChronicle(this.scene, chapter, built.layout, built.sites);
      this.activePortals = []; this.activeNpcs = [];
      this.playerPos.set(built.layout.startPortalPos.x, 0, built.layout.startPortalPos.z);
      this.playerYaw = Math.PI; this.currentPathProgress = 0;
      this.spawnProceduralStompingGroundsEncounters(built.layout, 0.8 + ensureCampaign(this.activeCharacter).chapterIndex * 0.08);
      this.spawnChronicleGuardian();
      this.initializeFieldActivity();
      this.callbacks.onBannerNotification(chapter.title.toUpperCase(), built.layout.topology ?? chapter.subtitle);
    } else if (zoneId === 'starting_town') {
      this.currentPathLayout = null;
      this.currentPathProgress = 0;
      const built = this.environment.buildZone(this.scene, 'starting_town');
      this.activePortals = built.portals;
      this.activeNpcs = built.npcs;

      if (spawnTag === 'from_stomping_south') {
        this.playerPos.set(0, 0, -10.5);
        this.playerYaw = 0;
      } else {
        this.playerPos.set(0, 0, 3.5);
        this.playerYaw = Math.PI;
      }

      this.activeCharacter.currentHp = this.effectiveStats.maxHp;
      this.callbacks.onBannerNotification(
        'STARTING TOWN // AETHERHAVEN',
        'East: The Long Dawn • North: procedural wilderness • West: Market Crossing'
      );
    } else if (zoneId === 'stomping_grounds') {
      const layout = generateStompingGroundsPath(explicitSeed);
      this.currentPathLayout = layout;
      const built = this.environment.buildZone(this.scene, 'stomping_grounds', layout);
      this.activePortals = built.portals;
      this.activeNpcs = built.npcs;

      if (spawnTag === 'from_market') {
        this.playerPos.set(layout.endPortalPos.x, 0, layout.endPortalPos.z + 2.2);
        this.playerYaw = 0;
        this.currentPathProgress = 1;
      } else {
        this.playerPos.set(layout.startPortalPos.x, 0, layout.startPortalPos.z - 2.2);
        this.playerYaw = Math.PI;
        this.currentPathProgress = 0;
      }

      this.spawnProceduralStompingGroundsEncounters(layout);
      const quest = normalizeQuestState(this.activeCharacter.questState);
      this.activeCharacter.questState = quest;
      const questBanner = QuestEngine.onEnterCombatZone(
        quest,
        'stomping_grounds',
        this.enemies.length
      );

      this.callbacks.onBannerNotification(
        questBanner.bannerTitle ?? `STOMPING GROUNDS // PATH #${layout.seed % 1000}`,
        questBanner.bannerSubtitle ??
          `Procedural Single Path (${layout.totalDistance}m) • Battle to the far Portal!`
      );
    } else if (zoneId === 'sunken_ruins') {
      const layout = generateStompingGroundsPath(explicitSeed);
      this.currentPathLayout = layout;
      const built = this.environment.buildZone(this.scene, 'sunken_ruins', layout);
      this.activePortals = built.portals;
      this.activeNpcs = built.npcs;

      if (spawnTag === 'from_sanctum') {
        this.playerPos.set(layout.endPortalPos.x, 0, layout.endPortalPos.z + 2.2);
        this.playerYaw = 0;
        this.currentPathProgress = 1;
      } else {
        this.playerPos.set(layout.startPortalPos.x, 0, layout.startPortalPos.z - 2.2);
        this.playerYaw = Math.PI;
        this.currentPathProgress = 0;
      }

      this.spawnProceduralStompingGroundsEncounters(layout, 1.35);
      const quest = normalizeQuestState(this.activeCharacter.questState);
      this.activeCharacter.questState = quest;
      const questBanner = QuestEngine.onEnterCombatZone(
        quest,
        'sunken_ruins',
        this.enemies.length
      );

      this.callbacks.onBannerNotification(
        questBanner.bannerTitle ?? `SUNKEN ASTRAL RUINS // PATH #${layout.seed % 1000}`,
        questBanner.bannerSubtitle ??
          `Act II Procedural Temple Path (${layout.totalDistance}m) • Battle to the Abyssal Sanctum!`
      );
    } else if (zoneId === 'abyssal_sanctum') {
      this.currentPathLayout = null;
      this.currentPathProgress = 1;
      const built = this.environment.buildZone(this.scene, 'abyssal_sanctum');
      this.activePortals = built.portals;
      this.activeNpcs = built.npcs;

      this.playerPos.set(0, 0, 10.2);
      this.playerYaw = Math.PI;

      const quest = normalizeQuestState(this.activeCharacter.questState);
      this.activeCharacter.questState = quest;
      if (quest.stage !== 'talk_sage_orin' && quest.stage !== 'completed') {
        const scale = 1.65 + (this.activeCharacter.stompingGroundsClears || 0) * 0.2;
        this.spawnEnemyAtPosition('boss_knight', 0, -1.5, scale * 1.45);
        this.spawnEnemyAtPosition('sentinel', -4.2, 0.5, scale);
        this.spawnEnemyAtPosition('sentinel', 4.2, 0.5, scale);
        this.spawnEnemyAtPosition('slime', -2.8, 3.0, scale);
        this.spawnEnemyAtPosition('slime', 2.8, 3.0, scale);
      }

      const questBanner = QuestEngine.onEnterCombatZone(
        quest,
        'abyssal_sanctum',
        this.enemies.length
      );
      this.callbacks.onBannerNotification(
        questBanner.bannerTitle ?? 'ABYSSAL SANCTUM // ECLIPSE SUMMIT',
        questBanner.bannerSubtitle ??
          'Confront the Eclipse Sovereign & speak with High Sage Orin at the North Altar!'
      );
      if (this.enemies.length > 0) {
        this.triggerCutsceneIfUnseen('act3_boss_intro');
      }
    } else {
      this.currentPathLayout = null;
      this.currentPathProgress = 1;
      const built = this.environment.buildZone(this.scene, 'market_crossing');
      this.activePortals = built.portals;
      this.activeNpcs = built.npcs;

      if (spawnTag === 'from_ruins_south') {
        this.playerPos.set(0, 0, -10.2);
        this.playerYaw = 0;
      } else {
        this.playerPos.set(0, 0, 10.2);
        this.playerYaw = Math.PI;
      }

      if (spawnTag === 'from_stomping_north') {
        this.activeCharacter.stompingGroundsClears =
          (this.activeCharacter.stompingGroundsClears || 0) + 1;
        this.activeCharacter.currentWave = this.activeCharacter.stompingGroundsClears + 1;
        this.activeCharacter.highestWave = Math.max(
          this.activeCharacter.highestWave,
          this.activeCharacter.currentWave
        );
        const bonusGold = 120 + this.activeCharacter.stompingGroundsClears * 45;
        this.activeCharacter.gold += bonusGold;
        this.activeCharacter.aetherCrystals += 20;
        const rewardItem = generateLootItem(
          this.activeCharacter.classId,
          this.activeCharacter.currentWave,
          'epic'
        );
        this.spawnLootOrb(new THREE.Vector3(0, 0, 6.5), 0, rewardItem);
      }

      this.activeCharacter.currentHp = this.effectiveStats.maxHp;
      this.callbacks.onBannerNotification(
        'MARKET CROSSING // STARLIGHT BAZAAR',
        'East: continue The Long Dawn • North / south: wilderness routes • West: Aetherhaven'
      );
    }

    if (isChronicleRegion(zoneId) || isSafeZone(zoneId)) {
      const roads = campaignRoads(ensureCampaign(this.activeCharacter), zoneId, this.currentPathLayout);
      for (const road of roads) { this.activePortals.push(road); this.environment.addTravelGate(road); }
    }
    this.expedition.total = resume ? resume.enemies.length + resume.defeatedEnemyIds.length : this.enemies.length;
    this.biomePlayerSafe.copy(this.playerPos);
    if (resume && savedPosition) {
      this.defeatedEnemyIds = new Set(resume.defeatedEnemyIds);
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        if (this.defeatedEnemyIds.has(enemy.id)) {
          this.removeSceneObject(enemy.bundle.root);
          this.enemies.splice(i, 1);
        } else {
          const savedEnemy = resume.enemies.find(saved => saved.id === enemy.id);
          if (savedEnemy) {
            enemy.hp = Math.max(1, Math.min(enemy.maxHp, savedEnemy.hp));
            enemy.bundle.root.position.set(savedEnemy.x, 0, savedEnemy.z);
            if (this.environment.biomeWalkable) {
              this.constrainBiomeActor(enemy.bundle.root.position, savedEnemy.x, savedEnemy.z, true);
            }
          }
        }
      }
      this.expedition.defeated = resume.defeatedEnemyIds.length;
      this.expedition.seconds = resume.elapsedSeconds;
      this.expedition.damageTaken = resume.damageTaken;
      this.expedition.gold = resume.goldEarned;
      if (!isSafeZone(zoneId)) this.flaskCharges = Math.max(0, Math.min(FLASK_CAPACITY, resume.flaskCharges));
      if (savedQuest) this.activeCharacter.questState = savedQuest;
      this.playerPos.set(savedPosition.x, 0, savedPosition.z);
      this.clampPlayerToZone(true);
      for (const orb of resume.pendingLoot) this.spawnLootOrb(new THREE.Vector3(orb.x, 0, orb.z), orb.gold, orb.item);
    }
    if (this.playerRig) {
      this.playerRig.root.position.copy(this.playerPos);
      this.playerRig.root.rotation.y = this.playerYaw;
    }
    // Snap companions into formation next to the player on zone entry
    const biomeWalkable = this.environment.biomeWalkable;
    for (const comp of this.companions) {
      comp.position.set(
        this.playerPos.x + comp.wingSide * 1.9,
        0,
        this.playerPos.z + 1.6
      );
      if (biomeWalkable && !biomeWalkable(comp.position)) comp.position.copy(this.playerPos);
      comp.rig.root.position.copy(comp.position);
      comp.rig.root.rotation.y = this.playerYaw;
    }
    this.cameraController.snapToIsometricFollow(this.playerPos);
    this.vfx.spawnShockwaveRing(this.playerPos, 3.2, 0x4cc9f0, 0xffffff, 0.45);
    void this.saveActiveCharacterNow();
  }

  private isPortalLocked(portal: PortalTrigger): boolean {
    if (portal.requiresChapterId && !this.activeCharacter?.campaign?.completedChapterIds.includes(portal.requiresChapterId)) return true;
    return this.enemies.length > 0 && ((this.currentZone === 'stomping_grounds' && portal.targetZone === 'market_crossing') || (this.currentZone === 'sunken_ruins' && portal.targetZone === 'abyssal_sanctum'));
  }

  public tryTraverseNearbyPortal(): boolean {
    if (!this.nearbyPortal || this.mode !== 'playing' || this.isPaused || this.travelInProgress) return false;
    if (this.isPortalLocked(this.nearbyPortal)) {
      this.callbacks.onBannerNotification('THE ROAD IS SEALED', this.nearbyPortal.requiresChapterId ? 'Finish the chapter’s story at camp to open this road.' : 'Defeat the remaining fiends to open the way forward.');
      return false;
    }
    const target = this.nearbyPortal;
    if (target.id?.startsWith('bellroad_')) void this.traverseWorldRoad(target);
    else this.enterZone(target.targetZone, target.targetSpawnTag);
    return true;
  }

  /**
   * Interacts with the nearby NPC to accept, advance, or complete the active quest.
   */
  public interactWithNearbyQuestNpc(): boolean {
    if (this.opening) return this.interactOpening();
    if (this.slice) {
      if (!this.isPaused && this.slice.canLowerBridge(this.sliceActors())) {
        this.slice.lowerBridge();
        this.audio.play('victory');
        this.emitHudTelemetry();
        return true;
      }
      return false;
    }
    if (this.interactChronicleSite()) return true;
    if (!this.activeCharacter || !this.nearbyNpc || this.mode !== 'playing' || this.isPaused) {
      return false;
    }
    const quest = normalizeQuestState(this.activeCharacter.questState);
    this.activeCharacter.questState = quest;

    const result = QuestEngine.interactWithNpc(quest, this.nearbyNpc.id);
    if (!result.advanced) return false;

    this.vfx.spawnShockwaveRing(this.playerPos, 3.8, 0xffd166, 0xffffff, 0.48);

    if (result.eventType === 'act1_completed' || result.eventType === 'completed') {
      const isFinal = result.eventType === 'completed';
      this.activeCharacter.xp += isFinal ? 1000 : 500;
      this.activeCharacter.gold += isFinal ? 1200 : 600;
      this.activeCharacter.aetherCrystals += isFinal ? 100 : 50;
      this.checkAndApplyLevelUps();

      const mythicReward = generateLootItem(
        this.activeCharacter.classId,
        Math.max(2, this.activeCharacter.currentWave + (isFinal ? 3 : 1)),
        'mythic'
      );
      this.spawnLootOrb(
        this.playerPos.clone().add(new THREE.Vector3(0, 0, -1.2)),
        isFinal ? 500 : 250,
        mythicReward
      );
    }

    if (result.bannerTitle && result.bannerSubtitle) {
      this.callbacks.onBannerNotification(result.bannerTitle, result.bannerSubtitle);
    }

    // Trigger Anime Story Cutscene on major narrative milestones
    if (result.eventType === 'accepted') {
      this.triggerCutscene('prologue_triad_awakening');
    } else if (result.eventType === 'market_twist') {
      this.triggerCutscene('act1_market_twist');
    } else if (result.eventType === 'ruins_unsealed') {
      this.triggerCutscene('act2_ruins_unsealed');
    } else if (result.eventType === 'completed') {
      this.triggerCutscene('act3_eclipse_sealed');
    }

    void this.saveActiveCharacterNow();
    this.emitHudTelemetry();
    return true;
  }

  public triggerCutsceneIfUnseen(cutsceneId: CutsceneId): void {
    if (!this.activeCharacter) return;
    if (!this.activeCharacter.seenCutscenes) {
      this.activeCharacter.seenCutscenes = [];
    }
    if (!this.activeCharacter.seenCutscenes.includes(cutsceneId)) {
      this.triggerCutscene(cutsceneId);
    }
  }

  public triggerCutscene(cutsceneId: CutsceneId): void {
    if (this.activeCharacter) {
      if (!this.activeCharacter.seenCutscenes) {
        this.activeCharacter.seenCutscenes = [];
      }
      if (!this.activeCharacter.seenCutscenes.includes(cutsceneId)) {
        this.activeCharacter.seenCutscenes.push(cutsceneId);
      }
    }
    this.callbacks.onTriggerCutscene?.(cutsceneId);
  }

  public setCutsceneCameraShot(
    shot: {
      cameraOffset: { x: number; y: number; z: number };
      lookAtOffset: { x: number; y: number; z: number };
    } | null,
    vfxBurst = false,
    cut = false,
  ): void {
    if (!shot) this.heroDialogue = null;
    this.cameraController.setCutsceneShot(shot, cut ? this.playerPos : undefined);
    if (this.opening) {
      for (const enemy of this.enemies) enemy.bundle.hpBarGroup.visible = shot === null;
    }
    if (vfxBurst && this.mode === 'playing') {
      this.vfx.spawnShockwaveRing(this.playerPos, 3.6, 0xffd166, 0xffffff, 0.45);
    }
  }

  public stageHeroDialogue(
    performance: { role: CharacterClassId; tone: HeroExpression; closeup?: boolean } | undefined,
    line: string,
  ): { cameraOffset: THREE.Vector3; lookAtOffset: THREE.Vector3 } | undefined {
    this.heroDialogue = null;
    if (!performance) return;
    const actor = this.playerRig?.classId === performance.role ? this.playerRig
      : this.companions.find(companion => companion.classId === performance.role)?.rig;
    if (!actor) return;
    const cues = heroSyllables(line);
    this.heroDialogue = { actor, cues, tone: performance.tone, elapsed: 0 };
    const pitch = { warrior: 174, mage: 215, assassin: 162 }[performance.role];
    this.audio.voice(pitch, cues);
    if (!performance.closeup) return;
    const head = actor.root.getObjectByName('Head')!.getWorldPosition(new THREE.Vector3());
    const camera = new THREE.Vector3(-.42, .18, 1.83)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), actor.root.rotation.y);
    return {
      cameraOffset: head.clone().add(camera).sub(this.playerPos),
      lookAtOffset: head.add(new THREE.Vector3(0, -.13, 0)).sub(this.playerPos),
    };
  }

  public silenceHeroDialogue(): void {
    if (this.heroDialogue) this.heroDialogue.cues = [];
  }

  private updateHeroDialogue(dt: number): void {
    const dialogue = this.heroDialogue;
    if (!dialogue || !this.playerRig) return;
    const { actor, tone, cues, elapsed } = dialogue;
    actor.updateFace(dt, { tone, cues, elapsed, speaking: true, gaze: -.16 });
    for (const listener of [this.playerRig, ...this.companions.map(companion => companion.rig)]) {
      if (listener === actor) continue;
      const delta = actor.root.position.clone().sub(listener.root.position).normalize();
      const yaw = listener.root.rotation.y;
      const gaze = delta.x * Math.cos(yaw) - delta.z * Math.sin(yaw);
      listener.updateFace(dt, { tone: 'alert', elapsed, cues: [], speaking: false, gaze });
    }
    dialogue.elapsed += dt;
  }

  public finishOpeningReveal(): void {
    this.opening?.stageReveal('response');
    this.cameraController.snapToIsometricFollow(this.playerPos);
  }

  public stageOpeningReveal(phase: 'seal' | 'impact' | 'response'): void {
    this.opening?.stageReveal(phase);
  }

  /**
   * Mutates the active character via a management action (Starforge, Salvage, Companion Stance, Ability Rune),
   * recalculates effective stats, and persists immediately.
   */
  public async mutateActiveCharacter(
    mutator: (char: CharacterSaveData) => void
  ): Promise<CharacterSaveData | null> {
    if (!this.activeCharacter) return null;
    mutator(this.activeCharacter);
    this.effectiveStats = computeEffectiveStats(this.activeCharacter);
    this.activeCharacter.currentHp = Math.min(
      this.effectiveStats.maxHp,
      this.activeCharacter.currentHp
    );
    await this.saveActiveCharacterNow();
    this.emitHudTelemetry();
    return structuredClone(this.activeCharacter);
  }

  /**
   * Commands both AI Companions to immediately unleash synchronized AoE Synergy Bursts.
   */
  public triggerCompanionSynergyBurst(): void {
    if (!this.activeCharacter) return;
    const configs = ensureCompanionConfigs(this.activeCharacter);
    for (const comp of this.companions) {
      const cDef = CHARACTER_CLASSES[comp.classId];
      const cfg = configs[comp.classId];
      const bondMult = 1 + (cfg.bondLevel - 1) * 0.12;
      comp.actionText = '★ TRIAD SYNERGY BURST!';
      comp.pendingAttack = undefined;
      comp.activeAttackTimer = COMPANION_SWING_DURATION;
      comp.animState.attackComboStep = 3;
      comp.animState.attackSwingProgress = 0;

      this.vfx.spawnShockwaveRing(
        comp.position,
        5.2,
        cDef.primaryColorHex,
        0xffffff,
        0.5
      );
      this.vfx.spawnSlashArc(
        comp.position,
        comp.yaw,
        4.6,
        cDef.primaryColorHex,
        0xffffff,
        0
      );
      this.dealAreaDamage(
        comp.position,
        5.2,
        1.85 * bondMult,
        8,
        cDef.elementColor,
        5.5,
        comp.classId === 'mage'
      );
    }
  }

  private buildCompassArrow(): void {
    if (this.compassGroup) {
      this.removeSceneObject(this.compassGroup);
    }
    this.compassGroup = new THREE.Group();
    const arrowGeo = new THREE.ConeGeometry(0.24, 0.62, 4);
    arrowGeo.rotateX(Math.PI / 2);
    arrowGeo.translate(0, 0.08, 1.38);
    const arrowMat = new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.9,
    });
    const arrowMesh = new THREE.Mesh(arrowGeo, arrowMat);
    this.compassGroup.add(arrowMesh);
    this.scene.add(this.compassGroup);
  }

  private updateCompassArrow(): void {
    if (!this.compassGroup || !this.activeCharacter) return;
    this.compassGroup.position.copy(this.playerPos);

    const quest = normalizeQuestState(this.activeCharacter.questState);
    let targetPos: { x: number; z: number } | null = null;

    const townRoad = isSafeZone(this.currentZone) ? this.activePortals.find(portal => portal.id === 'bellroad_outbound') : null;
    if (townRoad) targetPos = townRoad.position;
    else if (isChronicleRegion(this.currentZone)) {
      const objective = currentObjective(this.activeCharacter);
      const site = this.chronicleSites.find(candidate => candidate.id === objective?.id);
      if (objective?.kind === 'field' && this.fieldPlan) targetPos = fieldTarget(this.fieldPlan, ensureCampaign(this.activeCharacter).fieldProgress![objective.id], this.playerPos, this.fieldThreats());
      else if (site) targetPos = site.position;
      else targetPos = this.activePortals.find(portal => portal.id === 'bellroad_forward')?.position ?? null;
    } else if (this.currentZone === 'starting_town') {
      if (quest.stage === 'not_started' || quest.stage === 'return_starting_npc') {
        const vael = this.activeNpcs.find((n) => n.id === 'npc_commander_vael');
        if (vael) targetPos = vael.position;
      } else {
        const portal = this.activePortals[0];
        if (portal) targetPos = portal.position;
      }
    } else if (this.currentZone === 'stomping_grounds') {
      if (
        (quest.stage === 'clear_stomping_1' || quest.stage === 'clear_stomping_2') &&
        this.enemies.length > 0
      ) {
        let closest: EnemyEntity | null = null;
        let bestDist = Infinity;
        for (const e of this.enemies) {
          const d = this.playerPos.distanceTo(e.bundle.root.position);
          if (d < bestDist) {
            bestDist = d;
            closest = e;
          }
        }
        if (closest) {
          targetPos = {
            x: closest.bundle.root.position.x,
            z: closest.bundle.root.position.z,
          };
        }
      } else if (quest.stage === 'return_starting_npc' || quest.stage === 'not_started') {
        const southPortal = this.activePortals.find(
          (p) => p.targetZone === 'starting_town'
        );
        if (southPortal) targetPos = southPortal.position;
      } else {
        const northPortal = this.activePortals.find(
          (p) => p.targetZone === 'market_crossing'
        );
        if (northPortal) targetPos = northPortal.position;
      }
    } else if (this.currentZone === 'market_crossing') {
      if (quest.stage === 'talk_market_npc') {
        const lyra = this.activeNpcs.find((n) => n.id === 'npc_merchant_lyra');
        if (lyra) targetPos = lyra.position;
      } else if (quest.stage === 'talk_sol_market') {
        const sol = this.activeNpcs.find((n) => n.id === 'npc_artificer_sol');
        if (sol) targetPos = sol.position;
      } else if (
        quest.stage === 'clear_sunken_ruins' ||
        quest.stage === 'defeat_abyssal_sanctum' ||
        quest.stage === 'talk_sage_orin'
      ) {
        const northPortal = this.activePortals.find(
          (p) => p.targetZone === 'sunken_ruins'
        );
        if (northPortal) targetPos = northPortal.position;
      } else {
        const southPortal = this.activePortals.find(
          (p) => p.targetZone === 'stomping_grounds'
        );
        if (southPortal) targetPos = southPortal.position;
      }
    } else if (this.currentZone === 'sunken_ruins') {
      if (this.enemies.length > 0) {
        let closest: EnemyEntity | null = null;
        let bestDist = Infinity;
        for (const e of this.enemies) {
          const d = this.playerPos.distanceTo(e.bundle.root.position);
          if (d < bestDist) {
            bestDist = d;
            closest = e;
          }
        }
        if (closest) {
          targetPos = {
            x: closest.bundle.root.position.x,
            z: closest.bundle.root.position.z,
          };
        }
      } else {
        const sanctumPortal = this.activePortals.find(
          (p) => p.targetZone === 'abyssal_sanctum'
        );
        if (sanctumPortal) targetPos = sanctumPortal.position;
      }
    } else if (this.currentZone === 'abyssal_sanctum') {
      if (this.enemies.length > 0) {
        targetPos = {
          x: this.enemies[0].bundle.root.position.x,
          z: this.enemies[0].bundle.root.position.z,
        };
      } else {
        const orin = this.activeNpcs.find((n) => n.id === 'npc_sage_orin');
        if (orin) targetPos = orin.position;
      }
    }

    if (targetPos) {
      if (this.currentPathLayout?.version === 2) targetPos = roadDirectionTarget(this.currentPathLayout, this.playerPos, targetPos);
      const dx = targetPos.x - this.playerPos.x;
      const dz = targetPos.z - this.playerPos.z;
      if (Math.hypot(dx, dz) > 1.2) {
        this.compassGroup.visible = true;
        this.compassGroup.rotation.y = Math.atan2(dx, dz);
      } else {
        this.compassGroup.visible = false;
      }
    } else {
      this.compassGroup.visible = false;
    }
  }

  public getCurrentPathLayout(): ProceduralPathLayout | null {
    return this.currentPathLayout;
  }

  public getActiveCharacter(): CharacterSaveData | null {
    return this.activeCharacter ? structuredClone(this.activeCharacter) : null;
  }

  public async equipInventoryItem(itemId: string): Promise<CharacterSaveData | null> {
    if (!this.activeCharacter) return null;
    const item = this.activeCharacter.inventory.find((i) => i.id === itemId);
    if (!item) return null;

    if (item.slot === 'weapon') {
      this.activeCharacter.equipped.weapon = item;
    } else {
      this.activeCharacter.equipped.charm = item;
    }

    this.effectiveStats = computeEffectiveStats(this.activeCharacter);
    this.activeCharacter.currentHp = Math.min(
      this.effectiveStats.maxHp,
      this.activeCharacter.currentHp
    );
    await this.saveActiveCharacterNow();
    this.emitHudTelemetry();
    return structuredClone(this.activeCharacter);
  }

  public async saveActiveCharacterNow(): Promise<boolean> {
    if (this.slice) return true;
    if (!this.activeCharacter || this.mode !== 'playing') return false;
    if (this.opening) {
      const character = this.activeCharacter;
      const success = writeHearthmereSave({
        version: 1, classId: character.classId, name: character.name, step: this.opening.step,
        position: this.defeated ? HEARTHMERE_WAYSTATION : { x: this.playerPos.x, z: this.playerPos.z },
        yaw: this.playerYaw, hp: this.defeated ? this.effectiveStats!.maxHp : character.currentHp,
        energy: character.ultimateEnergy, flasks: this.defeated ? FLASK_CAPACITY : this.flaskCharges,
        seconds: character.playTimeSeconds,
        movingGroup: this.defeated ? undefined : this.opening.movingGroup,
        enemies: this.defeated ? this.opening.seeds.map(seed => ({
          id: this.enemyId(seed.kind, seed.x, seed.z), x: seed.x, z: seed.z,
          hp: seed.kind === 'slime' ? 210 : 380,
        })) : this.enemies.map(enemy => ({
          id: enemy.id, hp: enemy.hp, x: enemy.bundle.root.position.x, z: enemy.bundle.root.position.z,
        })),
      });
      if (success) this.lastSavedAt = Date.now();
      else if (!this.openingSaveFailed) this.callbacks.onBannerNotification('SAVE FAILED', 'Allow browser storage to keep your Hearthmere progress.');
      this.openingSaveFailed = !success;
      return success;
    }
    this.activeCharacter.position = { x: Number(this.playerPos.x.toFixed(2)), y: 0, z: Number(this.playerPos.z.toFixed(2)) };
    this.activeCharacter.journeyState = {
      zone: this.currentZone,
      seed: this.currentPathLayout?.seed ?? null,
      layoutVersion: this.currentPathLayout?.version,
      defeatedEnemyIds: [...this.defeatedEnemyIds],
      enemies: this.enemies.map(enemy => ({ id: enemy.id, hp: enemy.hp, x: enemy.bundle.root.position.x, z: enemy.bundle.root.position.z })),
      pendingLoot: this.lootOrbs.map(orb => ({ x: orb.position.x, z: orb.position.z, gold: orb.gold, item: orb.item })),
      flaskCharges: this.flaskCharges,
      elapsedSeconds: this.expedition.seconds,
      damageTaken: this.expedition.damageTaken,
      goldEarned: this.expedition.gold,
    };
    if (isChronicleRegion(this.currentZone)) {
      const state = ensureCampaign(this.activeCharacter);
      state.checkpoints[currentChapter(this.activeCharacter).id] = { journey: structuredClone(this.activeCharacter.journeyState), position: { ...this.activeCharacter.position } };
    }
    const character = this.activeCharacter;
    const snapshot = structuredClone(character);
    const write = this.saveQueue.then(async () => {
      const saved = await this.persistence.saveCharacter(snapshot);
      // Keep live combat state: replacing it with an older save rolls back damage and loot.
      if (this.activeCharacter === character) {
        character.updatedAt = saved.updatedAt;
        this.lastSavedAt = Date.now();
        this.callbacks.onCharacterSaved(saved);
      }
    });
    let success = true;
    this.saveQueue = write.catch(() => {
      success = false;
      this.callbacks.onBannerNotification('SAVE FAILED', 'Your session is still active. Check browser storage and try saving again.');
    });
    await this.saveQueue;
    return success;
  }

  private removeSceneObject(object: THREE.Object3D): void {
    this.scene.remove(object);
    disposeObject(object);
  }

  private removeTelegraph(enemy: EnemyEntity): void {
    if (!enemy.telegraph) return;
    this.removeSceneObject(enemy.telegraph);
    enemy.telegraph = null;
  }

  private clearZoneCombatEntities(): void {
    this.pendingAttack = null;
    this.attackRetreat = null;
    for (const companion of this.companions) companion.pendingAttack = undefined;
    for (const enemy of this.enemies) {
      this.removeTelegraph(enemy);
      this.removeSceneObject(enemy.bundle.root);
    }
    this.enemies = [];
    for (const proj of this.projectiles) {
      this.removeSceneObject(proj.mesh);
    }
    this.projectiles = [];
    for (const haz of this.groundHazards) {
      this.removeSceneObject(haz.mesh);
    }
    this.groundHazards = [];
    for (const orb of this.lootOrbs) {
      this.removeSceneObject(orb.mesh);
    }
    this.lootOrbs = [];
    this.vfx.clearAll();
  }

  private clearGameplayEntities(): void {
    this.attachWorldV2Port(null);
    if (this.playerRig) {
      this.removeSceneObject(this.playerRig.root);
      this.playerRig = null;
    }
    for (const c of this.companions) {
      this.removeSceneObject(c.rig.root);
    }
    this.companions = [];
    if (this.compassGroup) {
      this.removeSceneObject(this.compassGroup);
      this.compassGroup = null;
    }
    this.clearZoneCombatEntities();
  }

  private spawnProceduralStompingGroundsEncounters(
    layout: ProceduralPathLayout,
    zoneDifficultyMultiplier = 1.0
  ): void {
    const clears = this.activeCharacter?.stompingGroundsClears ?? 0;
    const scale = (1 + clears * 0.22) * zoneDifficultyMultiplier;

    for (const pack of layout.encounters) {
      const total = pack.enemies.length;
      for (let i = 0; i < total; i++) {
        const kind = pack.enemies[i];
        const angle = (i / Math.max(1, total)) * Math.PI * 2 + pack.waypointIndex * 0.7;
        const offsetDist = kind === 'boss_knight' ? 0 : 1.85;
        const sx = pack.x + Math.cos(angle) * offsetDist;
        const sz = pack.z + Math.sin(angle) * offsetDist;
        this.spawnEnemyAtPosition(kind, sx, sz, scale);
      }
    }
  }

  private enemyId(kind: EnemyKind, x: number, z: number): string {
    return `enemy_${this.currentZone}_${kind}_${x.toFixed(2)}_${z.toFixed(2)}`;
  }

  private spawnEnemyAtPosition(
    kind: EnemyKind,
    x: number,
    z: number,
    scale: number
  ): void {
    const bundle = buildEnemyMesh(kind);
    bundle.root.position.set(x, 0, z);
    this.scene.add(bundle.root);

    scale *= 1 + Math.max(0, (this.activeCharacter?.level ?? 1) - 1) * 0.1;
    const baseHp = kind === 'boss_knight' ? 1700 : kind === 'sentinel' ? 380 : 210;
    const baseAtk = kind === 'boss_knight' ? 75 : kind === 'sentinel' ? 44 : 30;
    const speed = kind === 'boss_knight' ? 3.3 : kind === 'sentinel' ? 3.8 : 4.3;

    this.enemies.push({
      id: this.enemyId(kind, x, z),
      kind,
      name:
        kind === 'boss_knight'
          ? 'Abyssal Gatekeeper'
          : kind === 'sentinel'
            ? 'Void Sentinel'
            : 'Aether Slime',
      maxHp: Math.round(baseHp * scale),
      hp: Math.round(baseHp * scale),
      attack: Math.round(baseAtk * scale),
      speed,
      radius: kind === 'boss_knight' ? 1.15 : 0.7,
      xpReward: Math.round((kind === 'boss_knight' ? 140 : kind === 'sentinel' ? 42 : 26) * scale),
      goldReward: Math.round((kind === 'boss_knight' ? 110 : kind === 'sentinel' ? 28 : 16) * scale),
      attackCooldown: 0.8 + Math.random() * 0.6,
      hitFlashTimer: 0,
      knockbackVel: new THREE.Vector3(),
      bundle,
      windup: 0,
      attackPattern: null,
      attackTarget: new THREE.Vector3(),
      telegraph: null,
      enraged: false,
    });
  }

  private loop = (now: number): void => {
    const elapsed = Math.max(0.001, (now - this.lastFrameTime) / 1000);
    const dt = Math.min(0.05, elapsed);
    this.lastFrameTime = now;

    if (this.finisher) {
      if (document.visibilityState !== 'hidden' && !this.pauseReasons.has('orientation')) this.finisher.update(Math.min(0.25, elapsed));
      this.opening?.setSceneryFocus(this.cameraController.camera, null);
      this.renderer.render(this.scene, this.cameraController.camera);
      requestAnimationFrame(this.loop); return;
    }
    if (!this.isPaused) this.environment.update(dt);

    if (this.mode === 'preview') {
      const idleAnim: CharacterAnimationState = {
        lobbyPhase: 0,
        isMoving: false,
        moveSpeedRatio: 0,
        attackComboStep: 0,
        attackSwingProgress: 0,
        isDashing: false,
        hitFlashTimer: 0,
      };
      if (this.previewRig) {
        this.previewRig.updateAnimation(dt, idleAnim);
      }
      for (const [index, cRig] of this.previewCompanionRigs.entries()) {
        idleAnim.lobbyPhase = .29 + index * .34;
        cRig.updateAnimation(dt, idleAnim);
      }
      this.cameraController.updatePedestalPreview(dt);
      if (this.previewMote && this.previewRig) {
        const palm = this.previewRig.getSpellEmitter(false)!;
        const time = now * .001;
        palm.y += .215 + .026 * Math.sin(time * 2.1);
        this.previewMote.position.copy(this.previewRig.root.worldToLocal(palm));
        this.previewMote.lookAt(this.cameraController.camera.position);
        this.previewMote.material.uniforms.time.value = time;
        this.previewMote.visible = true;
      }
    } else if (this.mode === 'playing' && this.activeCharacter && this.playerRig && this.effectiveStats) {
      if (this.isPaused) {
        if (this.pauseReasons.has('cutscene') && !this.pauseReasons.has('cutsceneHold') &&
          !this.pauseReasons.has('orientation') && document.visibilityState !== 'hidden') {
          if (this.opening?.updateReveal(dt)) {
            this.audio.cinematic('strike');
            this.cameraController.triggerShake(.68, .36);
          }
          this.updateHeroDialogue(dt);
          this.cameraController.updateIsometricFollow(dt, this.playerPos, new THREE.Vector2());
        }
      } else if (this.hitStop > 0) {
        this.hitStop = Math.max(0, this.hitStop - dt);
      } else {
        this.updateGameplay(dt);
      }
    }

    // Streaming sees authoritative global X/Z and the actual movement heading.
    // No V2 port is attached during the current Hearthmere opening.
    if (this.worldV2Port && this.mode === 'playing' && !this.isPaused &&
      now - this.worldV2LastTick >= 120) {
      const { x, z } = this.playerPos;
      const prior = this.worldV2PreviousPosition;
      this.worldV2Port.update({ x, z },
        prior ? { x: x - prior.x, z: z - prior.z } : { x: 0, z: 0 });
      this.worldV2PreviousPosition = { x, z };
      this.worldV2LastTick = now;
    }

    this.vfx.update(this.isPaused ? 0 : dt, this.cameraController.camera);
    this.opening?.setSceneryFocus(this.cameraController.camera,
      this.mode === 'playing' && !this.pauseReasons.has('cutscene') ? this.playerPos : null);
    if (this.mode === 'playing' && !this.isPaused && document.visibilityState !== 'hidden') {
      this.minimapTerrain?.update(this.renderer, this.scene, this.environment.minimapWorldRoot, this.playerPos, now);
    }
    this.renderer.render(this.scene, this.cameraController.camera);

    requestAnimationFrame(this.loop);
  };

  private updateGameplay(dt: number): void {
    const char = this.activeCharacter!;
    const stats = this.effectiveStats!;
    const classDef = CHARACTER_CLASSES[char.classId];

    char.playTimeSeconds += dt;
    if (!isSafeZone(this.currentZone) && this.enemies.length > 0) this.expedition.seconds += dt;
    this.flaskCooldown = Math.max(0, this.flaskCooldown - dt);
    this.autoSaveTimer += dt;
    if (this.autoSaveTimer >= 5.0) {
      this.autoSaveTimer = 0;
      void this.saveActiveCharacterNow();
    }

    if (this.portalGraceTimer > 0) {
      this.portalGraceTimer = Math.max(0, this.portalGraceTimer - dt);
    }

    // Safe Zone passive regeneration
    if (this.opening?.safe ?? this.slice?.atCamp ?? isSafeZone(this.currentZone)) {
      if (this.slice || this.opening) this.flaskCharges = FLASK_CAPACITY;
      if (char.currentHp < stats.maxHp) {
        char.currentHp = Math.min(stats.maxHp, char.currentHp + stats.maxHp * 0.15 * dt);
      }
      if (!this.opening && char.ultimateEnergy < 100) {
        char.ultimateEnergy = Math.min(100, char.ultimateEnergy + 8 * dt);
      }
    }

    // Update skill cooldowns
    for (const key of Object.keys(this.cooldowns) as ActionId[]) {
      if (this.cooldowns[key] > 0) {
        this.cooldowns[key] = Math.max(0, this.cooldowns[key] - dt);
      }
    }

    if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;
    if (this.animState.hitFlashTimer > 0) this.animState.hitFlashTimer -= dt;

    if (this.hitComboDecayTimer > 0) {
      this.hitComboDecayTimer -= dt;
      if (this.hitComboDecayTimer <= 0) {
        this.hitComboCount = 0;
      }
    }

    if (this.comboResetTimer > 0) {
      this.comboResetTimer -= dt;
      if (this.comboResetTimer <= 0) {
        this.comboStep = 0;
      }
    }

    this.input.update();
    const slice = this.slice;
    const move = this.input.moveVector;
    if (this.sliceBossLock && this.findSliceBoss() !== this.sliceBossLock) this.sliceBossLock = null;
    const playerVaulting = Boolean(slice?.vaulting && char.classId === 'warrior');

    // Handle Dash state
    if (playerVaulting) {
      this.animState.isDashing = false;
    } else if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      this.playerPos.addScaledVector(this.dashDirection, stats.moveSpeed * 2.45 * dt);
      this.clampPlayerToZone();
      this.animState.isDashing = true;
    } else {
      this.animState.isDashing = false;

      // Ranged classes (Mage & Assassin) retain higher mobility while casting/throwing
      const attackMovePenalty = char.classId === 'warrior' ? 0.45 : 0.72;
      const speed =
        this.activeAttackTimer > 0 ? stats.moveSpeed * attackMovePenalty : stats.moveSpeed;
      if (move.lengthSq() > 0.01) {
        this.playerPos.x += move.x * speed * dt;
        this.playerPos.z += move.y * speed * dt;
        this.clampPlayerToZone();
        if (!this.pendingAttack && !this.attackRetreat && this.sliceWindup <= 0) {
          const heading = Math.atan2(move.x, move.y);
          const spearRecovery = char.classId === 'warrior' && this.activeAttackTimer > 0
            && this.animState.attackComboStep >= 1 && this.animState.attackComboStep <= 3;
          const delta = heading - this.playerYaw;
          this.playerYaw = spearRecovery
            ? this.playerYaw + THREE.MathUtils.clamp(Math.atan2(Math.sin(delta), Math.cos(delta)), -12 * dt, 12 * dt)
            : heading;
        }
        this.animState.isMoving = true;
        this.animState.moveSpeedRatio = move.length();
      } else {
        this.animState.isMoving = false;
        this.animState.moveSpeedRatio = 0;
      }
    }

    // Process Action Inputs (Dash, Ultimate, Skill 2, Skill 1, Basic Attack)
    const dodgePressed = this.input.consumeAction('dash');
    const usesCommittedActions = slice !== null || this.opening !== null;
    if (this.attackCommitted || (usesCommittedActions && (playerVaulting || this.dashTimer > 0))) {
      for (const action of ['ultimate', 'skill2', 'skill1', 'basic'] as const) this.input.consumeAction(action);
      if (this.sliceWindup > 0) {
        this.sliceWindup = Math.max(0, this.sliceWindup - dt);
        if (this.sliceWindup === 0) this.executeSkill('ultimate');
      }
    } else if (dodgePressed && this.cooldowns.dash <= 0) {
      this.pendingAttack = null;
      this.attackRetreat = null;
      this.activeAttackTimer = 0;
      this.animState.attackComboStep = 0;
      this.animState.attackSwingProgress = 0;
      this.comboStep = 0;
      this.executeDash(classDef);
    } else if (this.pendingAttack) {
      // An unreleased basic strike can be dodged but cannot be replaced by another attack.
      for (const action of ['ultimate', 'skill2', 'skill1', 'basic'] as const) this.input.consumeAction(action);
    } else if (
      this.input.consumeAction('ultimate') &&
      this.cooldowns.ultimate <= 0 &&
      char.ultimateEnergy >= classDef.skills.ultimate.energyCost
    ) {
      this.attackRetreat = null;
      this.sliceWindup = 0.25;
      this.activeAttackDuration = this.sliceWindup;
      this.activeAttackTimer = this.sliceWindup;
      this.animState.attackComboStep = 5;
      this.animState.attackSwingProgress = 0;
      this.audio.cinematic('charge');
      const { colorHex, accentHex } = classDef.skills.ultimate;
      if (char.classId === 'mage') {
        const windup = this.sliceWindup;
        this.vfx.spawnGenesisCharge(.48, colorHex, accentHex, () => {
          if (this.animState.attackComboStep !== 5 || (!this.sliceWindup && !this.pendingAttack)) return undefined;
          const staff = this.playerRig?.getSpellEmitter(true);
          const palm = this.playerRig?.getSpellEmitter(false);
          const strength = this.sliceWindup ? 1 - this.sliceWindup / windup : 1;
          return staff && palm ? { staff, palm, strength } : undefined;
        });
      } else {
        this.vfx.spawnShockwaveRing(this.playerPos, 1.35, colorHex, accentHex, this.sliceWindup);
      }
    } else if (this.input.consumeAction('skill2') && this.cooldowns.skill2 <= 0) {
      this.executeSkill('skill2');
    } else if (this.input.consumeAction('skill1') && this.cooldowns.skill1 <= 0) {
      this.executeSkill('skill1');
    } else if (this.input.consumeAction('basic') && this.cooldowns.basic <= 0) {
      this.executeBasicCombo();
    }

    if (this.finisher) return;

    // Update attack swing animation progress
    if (this.activeAttackTimer > 0) {
      this.activeAttackTimer -= dt;
      this.animState.attackSwingProgress =
        1 - Math.max(0, this.activeAttackTimer / this.activeAttackDuration);
      if (this.activeAttackTimer <= 0) {
        this.animState.attackComboStep = 0;
      }
    }

    if (this.pendingAttack && stepIntoStrike(this.pendingAttack, this.animState.attackSwingProgress, this.playerPos, this.playerYaw)) {
      this.clampPlayerToZone();
    }
    if (this.attackRetreat) {
      const retreat = this.attackRetreat;
      const progress = this.animState.attackSwingProgress;
      const distance = retreat.distance * THREE.MathUtils.smoothstep(progress, retreat.from, retreat.until);
      const step = distance - retreat.travelled;
      this.playerPos.x -= Math.sin(retreat.yaw) * step;
      this.playerPos.z -= Math.cos(retreat.yaw) * step;
      this.clampPlayerToZone();
      retreat.travelled = distance;
      if (progress >= retreat.until) this.attackRetreat = null;
    }
    if (slice) slice.update(dt, this.sliceActors());

    // Update Player Rig transform & animation
    this.playerRig!.root.position.copy(this.playerPos);
    this.playerRig!.root.rotation.y = this.playerYaw;
    this.animState.charging = this.sliceWindup > 0;
    const attack = this.pendingAttack;
    const released = attack && this.animState.attackSwingProgress >= attack.releaseAt;
    const exactContact = char.classId === 'warrior'
      ? this.animState.attackComboStep >= 4
      : this.animState.attackComboStep <= 3
        || this.animState.attackComboStep === 5
        || (char.classId === 'assassin' && this.animState.skillSlot === 'skill2');
    this.playerRig!.updateAnimation(dt, released && exactContact
      ? { ...this.animState, attackSwingProgress: attack.releaseAt }
      : this.animState);
    if (released) {
      this.pendingAttack = null;
      if (attack.retreat) {
        this.attackRetreat = {
          yaw: this.playerYaw, distance: attack.retreat.distance, from: attack.releaseAt,
          until: attack.retreat.landAt, travelled: 0,
        };
      }
      const hitCount = this.hitComboCount;
      attack.release();
      if (this.finisher) return;
      this.playerRig!.root.position.copy(this.playerPos);
      if (this.hitComboCount > hitCount && (attack.committed || this.animState.attackComboStep === 3)) {
        this.hitStop = Math.max(this.hitStop, this.animState.attackComboStep === 5 ? 0.075 : 0.042);
      }
    }

    // Update Projectiles, Ground Hazards, Enemies & Loot
    if (slice?.inPuzzle) {
      for (const companion of this.companions) {
        companion.rig.root.position.copy(companion.position);
        companion.rig.root.rotation.y = companion.yaw;
        companion.rig.updateAnimation(dt, companion.animState);
      }
    } else this.updateCompanions(dt);
    if (this.finisher) return;
    this.updateProjectiles(dt);
    if (this.finisher) return;
    this.updateGroundHazards(dt);
    if (this.finisher) return;
    this.updateEnemies(dt);
    if (this.defeated) return;
    this.updateLootOrbs(dt);
    this.cameraController.updateIsometricFollow(dt, this.playerPos, move);
    if (slice) {
      if (slice.startIfNear(this.playerPos)) this.triggerCutscene('slice_moat_plan');
    } else if (this.opening) {
      const event = this.opening.update(dt, this.playerPos);
      this.opening.updateSceneryMotion(dt, this.playerRig!.root,
        this.companions.map(companion => companion.rig.root), this.enemies.map(enemy => enemy.bundle.root));
      if (event.tell) this.audio.cinematic('charge');
      if (event.strike) {
        this.audio.cinematic('strike');
        this.cameraController.triggerShake(0.34, 0.2);
      }
      if (event.hit) this.damagePlayer(Math.ceil(stats.maxHp * 0.46));
      if (event.changed) void this.saveActiveCharacterNow();
    } else {
      this.updateFieldObjective(dt);
      if (this.environment.biomeWalkable) {
        this.environment.updateBiomeMotion(dt, this.playerRig!.root,
          this.companions.map(companion => companion.rig.root), this.enemies.map(enemy => enemy.bundle.root));
      }
      this.updatePortalAndNpcProximity();
      this.updateCompassArrow();
    }
    this.hudTimer += dt;
    if (this.hudTimer >= 0.08) { this.hudTimer = 0; this.emitHudTelemetry(); }
  }

  private updateCompanions(dt: number): void {
    if (!this.activeCharacter || !this.effectiveStats) return;
    const configs = ensureCompanionConfigs(this.activeCharacter);
    const playerForward = new THREE.Vector3(
      Math.sin(this.playerYaw),
      0,
      Math.cos(this.playerYaw)
    );
    const playerRight = new THREE.Vector3(playerForward.z, 0, -playerForward.x);

    // Check if any companion is in 'support' stance for periodic Vanguard Aegis party heal
    const hasSupportCompanion = this.companions.some(
      (c) => configs[c.classId].stance === 'support'
    );
    if (hasSupportCompanion) {
      this.supportPulseTimer += dt;
      if (this.supportPulseTimer >= 4.0) {
        this.supportPulseTimer = 0;
        if (this.activeCharacter.currentHp < this.effectiveStats.maxHp) {
          const heal = Math.max(1, Math.round(this.effectiveStats.maxHp * 0.03));
          this.activeCharacter.currentHp = Math.min(
            this.effectiveStats.maxHp,
            this.activeCharacter.currentHp + heal
          );
          this.vfx.spawnDamageNumber(
            this.playerPos,
            heal,
            false,
            '#64dfdf',
            `+${heal} Aegis`
          );
        }
      }
    }

    for (const comp of this.companions) {
      const previousX = comp.position.x;
      const previousZ = comp.position.z;
      const cfg = configs[comp.classId];
      const stanceInfo = COMPANION_STANCE_INFO[cfg.stance];

      comp.level = Math.max(comp.level, this.activeCharacter.level);
      if (comp.attackCooldown > 0) {
        comp.attackCooldown = Math.max(
          0,
          comp.attackCooldown - dt * stanceInfo.attackRateMult
        );
      }
      if (comp.activeAttackTimer > 0) {
        comp.activeAttackTimer -= dt;
        comp.animState.attackSwingProgress = 1 - Math.max(0, comp.activeAttackTimer / COMPANION_SWING_DURATION);
        if (comp.activeAttackTimer <= 0) {
          comp.animState.attackComboStep = 0;
        }
      }

      // Formation anchor behind and to the left/right of the player
      const formationPos = this.playerPos
        .clone()
        .addScaledVector(playerForward, -2.1)
        .addScaledVector(playerRight, comp.wingSide * 1.85);

      // Find nearest enemy within the companion's stance leash range
      let targetEnemy: EnemyEntity | null = null;
      let bestDist = stanceInfo.leashRange;
      if (!this.slice?.atCamp && !this.opening?.safe) {
        for (const e of this.enemies) {
          const d = this.playerPos.distanceTo(e.bundle.root.position);
          if (d < bestDist) {
            bestDist = d;
            targetEnemy = e;
          }
        }
      }

      if (comp.pendingAttack) {
        comp.animState.isMoving = false;
        comp.animState.moveSpeedRatio = 0;
      } else if (targetEnemy) {
        const enemyPos = targetEnemy.bundle.root.position;
        const toEnemy = enemyPos.clone().sub(comp.position);
        toEnemy.y = 0;
        const distToEnemy = toEnemy.length();
        const dirToEnemy =
          distToEnemy > 0.01 ? toEnemy.clone().normalize() : new THREE.Vector3(0, 0, 1);

        comp.yaw = Math.atan2(dirToEnemy.x, dirToEnemy.z);

        const desiredRange =
          comp.classId === 'warrior' ? 2.6 : comp.classId === 'mage' ? 6.8 : 6.2;

        if (distToEnemy > desiredRange + 0.5) {
          comp.position.addScaledVector(dirToEnemy, 8.2 * dt);
          comp.animState.isMoving = true;
          comp.animState.moveSpeedRatio = 0.95;
          comp.actionText =
            comp.classId === 'warrior' ? 'Charging Target' : 'Positioning';
        } else if (comp.classId !== 'warrior' && distToEnemy < 2.6) {
          // Ranged companions kite backward slightly if an enemy gets too close
          comp.position.addScaledVector(dirToEnemy, -5.5 * dt);
          comp.animState.isMoving = true;
          comp.animState.moveSpeedRatio = 0.8;
          comp.actionText = 'Kiting';
        } else {
          comp.animState.isMoving = false;
          comp.animState.moveSpeedRatio = 0;
        }

        // Execute Companion Class Attack when cooldown is ready
        if (comp.attackCooldown <= 0 && distToEnemy <= desiredRange + 2.5) {
          this.executeCompanionAttack(comp, targetEnemy, dirToEnemy);
        }
      } else {
        // Follow player in formation
        const destination = this.opening ? this.opening.companionDestination(this.playerPos, formationPos, comp.classId, comp.position)
          : this.slice ? this.slice.companionRoute(comp.position, formationPos, this.playerPos) : formationPos;
        const toFormation = destination.clone().sub(comp.position);
        toFormation.y = 0;
        const dist = toFormation.length();
        if (dist > 0.45) {
          const moveSpeed = dist > 5.0 ? 11.5 : 8.4;
          const dir = toFormation.normalize();
          comp.position.addScaledVector(dir, Math.min(dist, moveSpeed * dt));
          comp.yaw = Math.atan2(dir.x, dir.z);
          comp.animState.isMoving = true;
          comp.animState.moveSpeedRatio = Math.min(1, dist / 2.5);
          comp.actionText = 'Following';
        } else {
          comp.animState.isMoving = false;
          comp.animState.moveSpeedRatio = 0;
          comp.yaw = THREE.MathUtils.lerp(comp.yaw, this.playerYaw, dt * 5);
          comp.actionText = 'Guarding';
        }
      }

      if (comp.pendingAttack) stepIntoStrike(comp.pendingAttack, comp.animState.attackSwingProgress, comp.position, comp.yaw);
      // The belllands are explorable landscapes; the tutorial retains its corridor bounds.
      if (this.environment.biomeWalkable) {
        this.constrainBiomeActor(comp.position, previousX, previousZ);
      } else if (this.currentPathLayout) {
        const clamped = clampToProceduralPath(
          comp.position.x,
          comp.position.z,
          this.currentPathLayout,
          0.6
        );
        comp.position.x = clamped.x;
        comp.position.z = clamped.z;
      } else if (this.opening) {
        this.opening.constrainMovement(comp.position, previousX, previousZ);
      } else if (this.slice) {
        if (!this.slice.walkable(comp.position.x, comp.position.z)) {
          comp.position.set(previousX, 0, previousZ);
        }
      } else {
        const maxR = SAFE_ZONE_RADIUS - 1.3;
        const len = Math.hypot(comp.position.x, comp.position.z);
        if (len > maxR) {
          comp.position.x *= maxR / len;
          comp.position.z *= maxR / len;
        }
      }

      comp.rig.root.position.copy(comp.position);
      comp.rig.root.rotation.y = comp.yaw;
      comp.rig.updateAnimation(dt, comp.animState);
      if (comp.pendingAttack && comp.animState.attackSwingProgress >= comp.pendingAttack.releaseAt) {
        const attack = comp.pendingAttack;
        comp.pendingAttack = undefined;
        attack.release();
        if (this.finisher) return;
      }
    }
  }

  private executeCompanionAttack(
    comp: CompanionEntity,
    targetEnemy: EnemyEntity,
    dirToEnemy: THREE.Vector3
  ): void {
    comp.attackCount += 1;
    const special = comp.attackCount % 4 === 0;
    const cooldown = { warrior: 1.25, mage: 1.35, assassin: 0.92 };
    comp.attackCooldown = cooldown[comp.classId];
    comp.activeAttackTimer = COMPANION_SWING_DURATION;
    comp.animState.attackComboStep = special ? (comp.classId === 'assassin' ? 3 : 4) : 1;
    comp.animState.skillSlot = special && comp.classId === 'warrior' ? 'skill2' : 'skill1';
    comp.animState.attackSwingProgress = 0;
    comp.pendingAttack = {
      releaseAt: heroReleaseProgress(comp.classId, comp.animState),
      advance: heroAttackAdvance(comp.classId, comp.animState),
      travelled: 0,
      release: () => this.releaseCompanionAttack(comp, targetEnemy, dirToEnemy, special),
    };
  }

  private releaseCompanionAttack(
    comp: CompanionEntity,
    targetEnemy: EnemyEntity,
    dirToEnemy: THREE.Vector3,
    special: boolean,
  ): void {
    const cDef = CHARACTER_CLASSES[comp.classId];
    const cfg = ensureCompanionConfigs(this.activeCharacter!)[comp.classId];
    const stanceInfo = COMPANION_STANCE_INFO[cfg.stance];
    const gearAtk =
      (cfg.equipped.weapon?.attackBonus ?? 0) +
      (cfg.equipped.charm?.attackBonus ?? 0);
    const gearScale = 1 + gearAtk * 0.008;
    const bondMult = 0.45 * (1 + (cfg.bondLevel - 1) * 0.12) * stanceInfo.damageMult * gearScale;

    if (comp.classId === 'warrior') {
      if (special) {
        comp.actionText = 'Earthshaker Slam!';
        this.vfx.spawnShockwaveRing(
          comp.position,
          3.6,
          cDef.skills.skill2.colorHex,
          cDef.skills.skill2.accentHex,
          0.38
        );
        this.dealAreaDamage(
          comp.position,
          3.6,
          0.75 * bondMult,
          3,
          cDef.elementColor,
          4.0
        );
      } else {
        comp.actionText = 'Dragon-Spear Thrust!';
        this.vfx.spawnSpearThrustBeam(
          comp.position,
          comp.yaw,
          4.8,
          cDef.skills.basic.colorHex,
          cDef.skills.basic.accentHex,
          comp.rig.getSpearTip(),
        );
        this.dealLineDamage(
          comp.position,
          dirToEnemy,
          4.8,
          1.1,
          0.58 * bondMult,
          2,
          cDef.elementColor,
          2.5
        );
      }
    } else if (comp.classId === 'mage') {
      if (special) {
        comp.actionText = 'Gravity Vortex!';
        this.spawnGroundHazard({
          position: targetEnemy.bundle.root.position.clone(),
          radius: 3.6,
          damageMultiplier: 0.35 * bondMult,
          energyGain: 3,
          colorHex: cDef.skills.skill1.colorHex,
          accentHex: cDef.skills.skill1.accentHex,
          colorCss: cDef.elementColor,
          duration: 1.9,
          tickInterval: 0.5,
          pullInward: true,
          visualStyle: 'vortex',
        });
      } else {
        comp.actionText = 'Starlight Bolt!';
        this.spawnProjectile({
          origin: comp.position,
          emitter: comp.rig.getSpellEmitter(false),
          yaw: comp.yaw,
          speed: 17.0,
          radius: 0.38,
          damageMultiplier: 0.52 * bondMult,
          energyGain: 2,
          colorHex: cDef.skills.basic.colorHex,
          accentHex: cDef.skills.basic.accentHex,
          colorCss: cDef.elementColor,
          maxLifetime: 0.7,
          pierceRemaining: 1,
          explodeRadius: 1.3,
          homingStrength: 3.2,
          shape: 'orb',
        });
      }
    } else {
      // Ranged Assassin Companion
      if (special) {
        comp.actionText = 'Shadow Chakram!';
        this.spawnProjectile({
          origin: comp.position,
          emitter: comp.rig.getBladeEmitter(1),
          yaw: comp.yaw,
          speed: 18.5,
          radius: 0.72,
          damageMultiplier: 0.68 * bondMult,
          energyGain: 3,
          colorHex: cDef.skills.basic.accentHex,
          accentHex: cDef.skills.basic.colorHex,
          colorCss: cDef.elementColor,
          maxLifetime: 0.6,
          pierceRemaining: 6,
          explodeRadius: 0,
          homingStrength: 0,
          shape: 'chakram',
        });
      } else {
        comp.actionText = 'Kunai Volley!';
        for (const spread of [-0.1, 0.1]) {
          this.spawnProjectile({
            origin: comp.position,
            emitter: comp.rig.getBladeEmitter(spread < 0 ? -1 : 1),
            yaw: comp.yaw + spread,
            speed: 23.0,
            radius: 0.32,
            damageMultiplier: 0.34 * bondMult,
            energyGain: 1,
            colorHex: cDef.skills.basic.colorHex,
            accentHex: cDef.skills.basic.accentHex,
            colorCss: cDef.elementColor,
            maxLifetime: 0.48,
            pierceRemaining: 2,
            explodeRadius: 0,
            homingStrength: 1.5,
            shape: 'kunai',
          });
        }
      }
    }
  }

  private constrainBiomeActor(position: THREE.Vector3, x: number, z: number, restore = false): void {
    const walkable = this.environment.biomeWalkable!;
    if (!restore && walkable({ x, z })) {
      sweepGroundMovement(position, x, z, walkable);
    } else if (!walkable(position)) {
      const layout = this.currentPathLayout!;
      const clamped = clampToProceduralPath(position.x, position.z, layout);
      if (walkable(clamped)) {
        position.set(clamped.x, 0, clamped.z);
      } else {
        const distance = (point: { x: number; z: number }) => (point.x - position.x) ** 2 + (point.z - position.z) ** 2;
        const nearest = layout.waypoints.reduce((best, point) => distance(point) < distance(best) ? point : best);
        position.set(nearest.x, 0, nearest.z);
      }
    }
  }

  private clampPlayerToZone(restore = false): void {
    if (this.opening) {
      this.opening.constrainPlayer(this.playerPos);
      return;
    }
    if (this.slice) {
      this.slice.constrainPlayer(this.playerPos);
      return;
    }
    if (this.currentPathLayout) {
      const walkable = this.environment.biomeWalkable;
      if (walkable) {
        this.constrainBiomeActor(this.playerPos, this.biomePlayerSafe.x, this.biomePlayerSafe.z, restore);
        this.biomePlayerSafe.copy(this.playerPos);
      }
      const clamped = clampToProceduralPath(
        this.playerPos.x,
        this.playerPos.z,
        this.currentPathLayout,
        0.55
      );
      if (!walkable) {
        this.playerPos.x = clamped.x;
        this.playerPos.z = clamped.z;
      }
      this.currentPathProgress = clamped.progress;
    } else {
      const maxR = SAFE_ZONE_RADIUS - 1.2;
      const len = Math.hypot(this.playerPos.x, this.playerPos.z);
      if (len > maxR) {
        const scale = maxR / len;
        this.playerPos.x *= scale;
        this.playerPos.z *= scale;
      }
    }
  }

  private updatePortalAndNpcProximity(): void {
    this.nearbyChronicleSite = null;
    if (this.activeCharacter && isChronicleRegion(this.currentZone)) {
      const state = ensureCampaign(this.activeCharacter);
      let distance = 3.5;
      for (const site of this.chronicleSites) {
        if (site.kind === 'battle' || site.kind === 'field' || state.discoveries.includes(site.id) || (site.kind !== 'echo' && site.objectiveIndex !== state.objectiveIndex)) continue;
        const d = Math.hypot(site.position.x - this.playerPos.x, site.position.z - this.playerPos.z);
        if (d < distance) { distance = d; this.nearbyChronicleSite = site; }
      }
    }
    // Check NPC proximity
    let closestNpc: NpcActor | null = null;
    let bestNpcDist = 3.6;
    for (const npc of this.activeNpcs) {
      const d = Math.hypot(
        this.playerPos.x - npc.position.x,
        this.playerPos.z - npc.position.z
      );
      if (d < bestNpcDist) {
        bestNpcDist = d;
        closestNpc = npc;
      }
    }
    this.nearbyNpc = closestNpc;

    // Check Portal proximity
    let closestPortal: PortalTrigger | null = null;
    let bestPortalDist = 3.6;
    for (const portal of this.activePortals) {
      const d = Math.hypot(
        this.playerPos.x - portal.position.x,
        this.playerPos.z - portal.position.z
      );
      if (d < bestPortalDist) {
        bestPortalDist = d;
        closestPortal = portal;
      }
    }
    this.nearbyPortal = closestPortal;

    // Auto-enter portal when stepping directly into the portal core after arrival grace period
    if (closestPortal && bestPortalDist <= 1.35 && this.portalGraceTimer <= 0 && !this.isPaused && !this.isPortalLocked(closestPortal)) {
      this.tryTraverseNearbyPortal();
    }
  }

  private faceNearestEnemy(maxRange: number): EnemyEntity | null {
    if (this.sliceBossLock) {
      const position = this.sliceBossLock.bundle.root.position;
      this.playerYaw = Math.atan2(position.x - this.playerPos.x, position.z - this.playerPos.z);
      return position.distanceToSquared(this.playerPos) < maxRange * maxRange ? this.sliceBossLock : null;
    }
    let closest: EnemyEntity | null = null;
    let bestDist = maxRange;
    for (const enemy of this.enemies) {
      const d = this.playerPos.distanceTo(enemy.bundle.root.position);
      if (d < bestDist) {
        bestDist = d;
        closest = enemy;
      }
    }
    if (closest) {
      const dx = closest.bundle.root.position.x - this.playerPos.x;
      const dz = closest.bundle.root.position.z - this.playerPos.z;
      this.playerYaw = Math.atan2(dx, dz);
    }
    return closest;
  }

  private executeDash(classDef: (typeof CHARACTER_CLASSES)[CharacterClassId]): void {
    this.animState.isDashing = true;
    const dashSkill = classDef.skills.dash;
    this.audio.play('dash');
    this.cooldowns.dash = dashSkill.cooldown;
    this.invulnerableTimer = 0.38;

    if (this.input.moveVector.lengthSq() > 0.05) {
      this.dashDirection.set(this.input.moveVector.x, 0, this.input.moveVector.y).normalize();
      this.playerYaw = Math.atan2(this.dashDirection.x, this.dashDirection.z);
    } else {
      this.dashDirection.set(Math.sin(this.playerYaw), 0, Math.cos(this.playerYaw)).normalize();
    }

    if (classDef.id === 'mage') {
      // Mage Phase Blink: explodes a frost-aether rune at departure and warps instantly!
      this.vfx.spawnDashAfterimage(this.playerPos, dashSkill.colorHex);
      this.vfx.spawnShockwaveRing(
        this.playerPos,
        dashSkill.aoeRadius,
        dashSkill.colorHex,
        dashSkill.accentHex,
        0.35
      );
      this.dealAreaDamage(
        this.playerPos,
        dashSkill.aoeRadius,
        dashSkill.damageMultiplier,
        dashSkill.energyGain,
        classDef.elementColor,
        3.5
      );
      this.playerPos.addScaledVector(this.dashDirection, 4.2);
      this.clampPlayerToZone();
      this.vfx.spawnShockwaveRing(
        this.playerPos,
        1.6,
        dashSkill.accentHex,
        0xffffff,
        0.25
      );
      this.dashTimer = 0.06;
    } else if (classDef.id === 'assassin') {
      // Ranged Assassin Mirage Backstep: leaves clone and throws 3 homing kunai!
      this.dashTimer = 0.2;
      this.vfx.spawnMirageAfterimage(this.playerRig!.root, dashSkill.colorHex);
      this.faceNearestEnemy(12.0);
      for (const spread of [-0.22, 0, 0.22]) {
        this.spawnProjectile({
          yaw: this.playerYaw + spread,
          speed: 23,
          radius: 0.35,
          damageMultiplier: dashSkill.damageMultiplier,
          energyGain: 3,
          colorHex: dashSkill.colorHex,
          accentHex: dashSkill.accentHex,
          colorCss: classDef.elementColor,
          maxLifetime: 0.55,
          pierceRemaining: 1,
          explodeRadius: 0,
          homingStrength: 4.5,
          shape: 'kunai',
        });
      }
    } else {
      // Spear Warrior Bull-Rush Vault: armored charge that plows through foes
      this.dashTimer = 0.25;
      this.vfx.spawnDashAfterimage(this.playerPos, dashSkill.colorHex);
      this.vfx.spawnSpearThrustBeam(
        this.playerPos,
        this.playerYaw,
        4.5,
        dashSkill.colorHex,
        dashSkill.accentHex
      );
      const forward = new THREE.Vector3(Math.sin(this.playerYaw), 0, Math.cos(this.playerYaw));
      this.dealLineDamage(
        this.playerPos,
        forward,
        4.8,
        1.35,
        dashSkill.damageMultiplier,
        dashSkill.energyGain,
        classDef.elementColor,
        5.5
      );
    }
  }

  private get attackCommitted(): boolean {
    return this.sliceWindup > 0 || this.pendingAttack?.committed === true;
  }

  private startHeroAttack(
    step: number,
    duration: number,
    release: () => void,
    skillSlot?: 'skill1' | 'skill2',
  ): void {
    this.attackRetreat = null;
    this.activeAttackDuration = duration;
    this.activeAttackTimer = duration;
    this.animState.attackComboStep = step;
    this.animState.attackSwingProgress = 0;
    this.animState.skillSlot = skillSlot;
    this.pendingAttack = {
      releaseAt: heroReleaseProgress(this.activeCharacter!.classId, this.animState),
      advance: heroAttackAdvance(this.activeCharacter!.classId, this.animState),
      travelled: 0,
      committed: step >= 4,
      retreat: heroAttackRetreat(this.activeCharacter!.classId, this.animState),
      release,
    };
  }

  private executeBasicCombo(): void {
    const char = this.activeCharacter!;
    const stats = this.effectiveStats!;
    const classDef = CHARACTER_CLASSES[char.classId];
    const basic = classDef.skills.basic;
    const runes = ensureSkillRunes(char);
    const skillLevelBonus = 1 + (char.skillLevels.basic - 1) * 0.1;

    this.faceNearestEnemy(basic.range + 2.0);
    this.comboStep = (this.comboStep % 3) + 1;
    const comboStep = this.comboStep;
    this.comboResetTimer = 1.4;

    const tempoMult = runes.basic === 'gale_tempo' ? 0.82 : 1.0;
    const cd = (basic.cooldown / stats.attackSpeed) * tempoMult;
    const finisherTempo = { warrior: 1.35, mage: 1.2, assassin: 1.15 };
    this.cooldowns.basic = comboStep === 3 ? cd * finisherTempo[char.classId] : cd;
    const duration = char.classId === 'warrior' ? (comboStep === 3 ? 0.42 : 0.28)
      : char.classId === 'mage' ? (comboStep === 3 ? .39 : .30) : (comboStep === 3 ? 0.30 : 0.20);
    this.startHeroAttack(comboStep, duration, () => this.releaseBasicCombo(comboStep, skillLevelBonus));
  }

  private releaseBasicCombo(comboStep: number, skillLevelBonus: number): void {
    const char = this.activeCharacter!;
    const stats = this.effectiveStats!;
    const classDef = CHARACTER_CLASSES[char.classId];
    const basic = classDef.skills.basic;
    const runes = ensureSkillRunes(char);
    this.audio.play('attack');
    if (this.slice?.breakCrate(this.sliceActors())) {
      this.audio.play('hit');
      this.vfx.spawnShockwaveRing(this.playerPos, 1.6, 0xffc269, 0xffffff, 0.3);
    }
    if (runes.basic === 'siphon_edge' && this.enemies.length > 0) {
      const heal = Math.max(1, Math.round(stats.maxHp * 0.015));
      char.currentHp = Math.min(stats.maxHp, char.currentHp + heal);
      char.ultimateEnergy = Math.min(100, char.ultimateEnergy + 3);
    }
    const forward = new THREE.Vector3(Math.sin(this.playerYaw), 0, Math.cos(this.playerYaw));

    if (char.classId === 'warrior') {
      // SPEAR WARRIOR CADENCE:
      // Steps 1 & 2: Long-reach linear piercing spear thrusts
      // Step 3: Slower, heavy 360° Dragon-Halberd Cyclone Slam
      if (comboStep === 1 || comboStep === 2) {
        const thrustMult = (comboStep === 1 ? 1.05 : 1.25) * skillLevelBonus;
        this.playerRig!.root.position.copy(this.playerPos);
        this.vfx.spawnSpearThrustBeam(
          this.playerPos,
          this.playerYaw,
          basic.range,
          basic.colorHex,
          basic.accentHex,
          this.playerRig!.getSpearTip(),
        );
        this.dealLineDamage(
          this.playerPos,
          forward,
          basic.range,
          1.15,
          basic.damageMultiplier * thrustMult,
          basic.energyGain,
          classDef.elementColor,
          3.2
        );
      } else {
        // Combo 3: 360° Halberd Cyclone Slam
        this.cameraController.triggerShake(0.28, 0.18);
        const tip = this.playerRig!.getSpearTip()?.sub(this.playerPos);
        const edgeYaw = tip ? Math.atan2(tip.x, tip.z) - .96 : this.playerYaw;
        const edgeReach = tip ? Math.hypot(tip.x, tip.z) : basic.aoeRadius;
        this.vfx.spawnSlashArc(
          this.playerPos,
          edgeYaw,
          edgeReach,
          basic.colorHex,
          basic.accentHex,
          0,
          tip?.y,
        );
        this.vfx.spawnShockwaveRing(
          this.playerPos,
          basic.aoeRadius,
          basic.colorHex,
          basic.accentHex,
          0.34,
          .42,
        );
        this.dealAreaDamage(
          this.playerPos,
          basic.aoeRadius,
          basic.damageMultiplier * 1.65 * skillLevelBonus,
          basic.energyGain + 4,
          classDef.elementColor,
          6.0
        );
      }
    } else if (char.classId === 'mage') {
      // ARCANE MAGE CADENCE:
      // Zero melee lunge! Casts ranged homing Starlight Bolts, Twin Orbs, and exploding Nova Comets
      if (comboStep === 1) {
        const palm = this.playerRig!.getSpellEmitter(false);
        if (palm) this.vfx.spawnCastingFlash(palm, this.playerYaw, basic.colorHex, basic.accentHex);
        this.spawnProjectile({
          emitter: palm,
          yaw: this.playerYaw,
          speed: 17.5,
          radius: 0.42,
          damageMultiplier: basic.damageMultiplier * skillLevelBonus,
          energyGain: basic.energyGain,
          colorHex: basic.colorHex,
          accentHex: basic.accentHex,
          colorCss: classDef.elementColor,
          maxLifetime: 0.72,
          pierceRemaining: 1,
          explodeRadius: 1.5,
          homingStrength: 3.4,
          shape: 'orb',
        });
      } else if (comboStep === 2) {
        for (const angleOffset of [-0.18, 0.18]) {
          const emitter = this.playerRig!.getSpellEmitter(angleOffset > 0);
          if (emitter) this.vfx.spawnCastingFlash(emitter, this.playerYaw + angleOffset, basic.colorHex, basic.accentHex, .81);
          this.spawnProjectile({
            emitter,
            yaw: this.playerYaw + angleOffset,
            speed: 18.0,
            radius: 0.36,
            damageMultiplier: basic.damageMultiplier * 0.72 * skillLevelBonus,
            energyGain: Math.round(basic.energyGain * 0.6),
            colorHex: basic.colorHex,
            accentHex: basic.accentHex,
            colorCss: classDef.elementColor,
            maxLifetime: 0.72,
            pierceRemaining: 1,
            explodeRadius: 1.4,
            homingStrength: 2.8,
            shape: 'orb',
          });
        }
      } else {
        const staff = this.playerRig!.getSpellEmitter(true);
        if (staff) this.vfx.spawnCastingFlash(staff, this.playerYaw, 0x7209b7, basic.accentHex, 1.62);
        this.spawnProjectile({
          emitter: staff,
          yaw: this.playerYaw,
          speed: 13.5,
          radius: 0.68,
          damageMultiplier: basic.damageMultiplier * 1.65 * skillLevelBonus,
          energyGain: basic.energyGain + 5,
          colorHex: 0x7209b7,
          accentHex: basic.colorHex,
          colorCss: classDef.elementColor,
          maxLifetime: 0.85,
          pierceRemaining: 1,
          explodeRadius: 3.4,
          homingStrength: 2.0,
          shape: 'comet',
        });
      }
    } else {
      // RANGED ASSASSIN CADENCE:
      // Ultra-fast staccato kunai volleys + Step 3 Piercing Boomerang Chakram with kiting backflip!
      const left = this.playerRig!.getBladeEmitter(-1);
      const right = this.playerRig!.getBladeEmitter(1);
      if (comboStep < 3 && left && right) {
        this.vfx.spawnNightbladeRelease(left, right, this.playerYaw, basic.colorHex, basic.accentHex,
          comboStep === 1 ? .36 : .54);
      }
      if (comboStep === 1) {
        // Rapid Twin Kunai throw
        for (const side of [-0.07, 0.07]) {
          this.spawnProjectile({
            emitter: side < 0 ? left : right,
            yaw: this.playerYaw + side,
            speed: 24.5,
            radius: 0.34,
            damageMultiplier: basic.damageMultiplier * skillLevelBonus,
            energyGain: Math.round(basic.energyGain * 0.55),
            colorHex: basic.colorHex,
            accentHex: basic.accentHex,
            colorCss: classDef.elementColor,
            maxLifetime: 0.48,
            pierceRemaining: 2,
            explodeRadius: 0,
            homingStrength: 1.5,
            shape: 'kunai',
          });
        }
      } else if (comboStep === 2) {
        // 3-Kunai Fan Spread
        for (const spread of [-0.24, 0, 0.24]) {
          this.spawnProjectile({
            emitter: spread < 0 ? left : right,
            yaw: this.playerYaw + spread,
            speed: 24.5,
            radius: 0.34,
            damageMultiplier: basic.damageMultiplier * 0.85 * skillLevelBonus,
            energyGain: Math.round(basic.energyGain * 0.45),
            colorHex: basic.colorHex,
            accentHex: basic.accentHex,
            colorCss: classDef.elementColor,
            maxLifetime: 0.48,
            pierceRemaining: 2,
            explodeRadius: 0,
            homingStrength: 1.2,
            shape: 'kunai',
          });
        }
      } else {
        // Freeze the departure pose and throw from that same takeoff position.
        this.vfx.spawnMirageAfterimage(this.playerRig!.root, basic.accentHex);

        this.spawnProjectile({
          emitter: right,
          yaw: this.playerYaw,
          speed: 19.0,
          radius: 0.85,
          damageMultiplier: basic.damageMultiplier * 1.75 * skillLevelBonus,
          energyGain: basic.energyGain + 4,
          colorHex: basic.accentHex,
          accentHex: basic.colorHex,
          colorCss: classDef.elementColor,
          maxLifetime: 0.62,
          pierceRemaining: 12,
          explodeRadius: 0,
          homingStrength: 0,
          shape: 'chakram',
        });
      }
    }
  }

  private executeSkill(skillKey: 'skill1' | 'skill2' | 'ultimate'): void {
    const char = this.activeCharacter!;
    const classDef = CHARACTER_CLASSES[char.classId];
    const skill = classDef.skills[skillKey];
    const runes = ensureSkillRunes(char);
    const lvlKey = skillKey === 'ultimate' ? 'ultimate' : skillKey;
    let skillLevelBonus = 1 + (char.skillLevels[lvlKey] - 1) * 0.12;

    if (skillKey === 'skill1' && runes.skill1 === 'overcharge') {
      skillLevelBonus *= 1.28;
    } else if (skillKey === 'skill2' && runes.skill2 === 'twin_cataclysm') {
      skillLevelBonus *= 1.3;
    } else if (skillKey === 'ultimate' && runes.ultimate === 'sovereign_exec') {
      skillLevelBonus *= 1.45;
    }

    const nearest = this.faceNearestEnemy(skill.range + 4.0);
    const forward = new THREE.Vector3(Math.sin(this.playerYaw), 0, Math.cos(this.playerYaw));

    let effectiveCd = skill.cooldown;
    if (skillKey === 'skill1' && runes.skill1 === 'quickcast') {
      effectiveCd *= 0.7;
      char.ultimateEnergy = Math.min(100, char.ultimateEnergy + 6);
    }
    this.cooldowns[skillKey] = effectiveCd;

    const ultimate = skillKey === 'ultimate';
    const heavensfall = ultimate && char.classId === 'warrior';
    const shadowExecution = ultimate && char.classId === 'assassin';
    const duration = ultimate ? { warrior: .68, assassin: .64, mage: .58 }[char.classId] : .38;
    this.startHeroAttack(ultimate ? 5 : 4, duration,
      () => this.releaseSkill(skillKey, skillLevelBonus, nearest, forward), ultimate ? undefined : skillKey);
    if (heavensfall) {
      const leap = this.pendingAttack!;
      this.vfx.spawnHeavensfallDescent(duration, skill.colorHex, skill.accentHex, () => {
        if (this.pendingAttack !== leap) return undefined;
        const tip = this.playerRig?.getSpearTip();
        return tip ? { tip, phase: this.animState.attackSwingProgress / leap.releaseAt } : undefined;
      });
    } else if (shadowExecution) {
      this.vfx.spawnShadowBladeTrails(duration + .15, skill.colorHex, skill.accentHex, () => {
        const phase = this.animState.attackSwingProgress;
        if (this.animState.attackComboStep !== 5 || this.animState.isDashing || phase > .76) return undefined;
        const left = this.playerRig?.getBladeEmitter(-1);
        const right = this.playerRig?.getBladeEmitter(1);
        return left && right ? { phase, blades: [left, right], center: this.playerPos } : undefined;
      });
    }
  }

  private releaseSkill(
    skillKey: 'skill1' | 'skill2' | 'ultimate',
    skillLevelBonus: number,
    nearest: EnemyEntity | null,
    forward: THREE.Vector3,
  ): void {
    const char = this.activeCharacter!;
    const stats = this.effectiveStats!;
    const classDef = CHARACTER_CLASSES[char.classId];
    const skill = classDef.skills[skillKey];
    const runes = ensureSkillRunes(char);

    if (skillKey === 'skill2' && runes.skill2 === 'aegis_ward') {
      const heal = Math.round(stats.maxHp * 0.1);
      char.currentHp = Math.min(stats.maxHp, char.currentHp + heal);
      this.invulnerableTimer = Math.max(this.invulnerableTimer, 0.8);
      this.vfx.spawnDamageNumber(this.playerPos, heal, false, '#64dfdf', `+${heal} Ward`);
    }

    if (skillKey === 'ultimate') {
      char.ultimateEnergy = runes.ultimate === 'triad_chain' ? 25 : 0;
      if (runes.ultimate === 'triad_chain') {
        this.triggerCompanionSynergyBurst();
      }
      this.cameraController.triggerUltimateZoom();
      this.cameraController.triggerShake(0.65, 0.45);
      this.callbacks.onUltimateCutIn(classDef.name, skill.name, classDef.elementColor);
      if (char.classId === 'warrior') {
        this.vfx.spawnHeavensfallImpact(this.playerPos, this.playerRig!.getSpearTip() ?? this.playerPos,
          skill.aoeRadius, skill.colorHex, skill.accentHex);
        this.audio.cinematic('strike');
        const heal = Math.min(Math.round(stats.maxHp * .25), stats.maxHp - char.currentHp);
        if (heal > 0) {
          char.currentHp += heal;
          this.vfx.spawnDamageNumber(this.playerPos, heal, false, '#64dfdf', `+${heal} HP`);
        }
      } else if (char.classId === 'mage') {
        this.vfx.spawnGenesisImpact(this.playerPos, this.playerRig!.getSpellEmitter(true) ?? this.playerPos, skill.aoeRadius,
          skill.colorHex, skill.accentHex);
      }
      if (char.classId === 'assassin') {
        this.vfx.spawnThousandShadows(this.playerPos, this.playerYaw, skill.aoeRadius, skill.colorHex, skill.accentHex);
        // Assassin Ultimate also unleashes a 16-blade radial kunai storm!
        for (let i = 0; i < 16; i++) {
          const angle = (i / 16) * Math.PI * 2;
          this.spawnProjectile({
            yaw: angle,
            speed: 22,
            radius: 0.45,
            damageMultiplier: 1.15 * skillLevelBonus,
            energyGain: 0,
            colorHex: skill.colorHex,
            accentHex: skill.accentHex,
            colorCss: classDef.elementColor,
            maxLifetime: 0.55,
            pierceRemaining: 8,
            explodeRadius: 0,
            homingStrength: 2.0,
            shape: 'kunai',
          });
        }
      }

      this.dealAreaDamage(
        this.playerPos,
        skill.aoeRadius,
        skill.damageMultiplier * skillLevelBonus,
        0,
        classDef.elementColor,
        9.0
      );
      return;
    }

    // Class-specific Skill 1 & Skill 2 implementations
    if (char.classId === 'warrior') {
      if (skillKey === 'skill1') {
        // Skyrend Impale: 8.2m Piercing Golden Spear Beam
        this.cameraController.triggerShake(0.35, 0.22);
        this.vfx.spawnSpearThrustBeam(
          this.playerPos,
          this.playerYaw,
          skill.range,
          skill.colorHex,
          skill.accentHex,
          this.playerRig!.getSpearTip(),
          2.45,
        );
        this.dealLineDamage(
          this.playerPos,
          forward,
          skill.range,
          1.45,
          skill.damageMultiplier * skillLevelBonus,
          skill.energyGain,
          classDef.elementColor,
          6.5
        );
      } else {
        // Earthshaker Banner: War-Stomp AoE + 12% Max HP Heal
        this.cameraController.triggerShake(0.42, 0.28);
        const heal = Math.min(Math.round(stats.maxHp * 0.12), stats.maxHp - char.currentHp);
        if (heal > 0) {
          char.currentHp += heal;
          this.vfx.spawnDamageNumber(this.playerPos, heal, false, '#64dfdf', `+${heal} HP`);
        }
        this.vfx.spawnEarthshaker(
          this.playerPos,
          this.playerRig!.getSpearButt() ?? this.playerPos,
          skill.aoeRadius,
          skill.colorHex,
          skill.accentHex,
        );
        this.dealAreaDamage(
          this.playerPos,
          skill.aoeRadius,
          skill.damageMultiplier * skillLevelBonus,
          skill.energyGain,
          classDef.elementColor,
          7.0
        );
      }
    } else if (char.classId === 'mage') {
      if (skillKey === 'skill1') {
        // Gravity Singularity: Persistent 2.6s Black-Star Vortex Zone placed at range!
        const targetPos = nearest
          ? nearest.bundle.root.position.clone()
          : this.playerPos.clone().addScaledVector(forward, 4.8);
        const palm = this.playerRig!.getSpellEmitter(false);
        if (palm) this.vfx.spawnGravityCast(palm, targetPos, this.playerYaw, skill.colorHex, skill.accentHex);
        this.spawnGroundHazard({
          position: targetPos,
          radius: skill.aoeRadius,
          damageMultiplier: skill.damageMultiplier * skillLevelBonus,
          energyGain: 6,
          colorHex: skill.colorHex,
          accentHex: skill.accentHex,
          colorCss: classDef.elementColor,
          duration: 2.6,
          tickInterval: 0.48,
          pullInward: true,
          visualStyle: 'vortex',
        });
      } else {
        // Celestial Meteor Rain: 3 sequential delayed meteors from the sky!
        const baseTarget = nearest
          ? nearest.bundle.root.position.clone()
          : this.playerPos.clone().addScaledVector(forward, 5.2);
        const staff = this.playerRig!.getSpellEmitter(true);
        if (staff) this.vfx.spawnCastingFlash(staff, this.playerYaw, skill.colorHex, skill.accentHex);

        for (let m = 0; m < 3; m++) {
          const offset = new THREE.Vector3(
            (m === 0 ? 0 : (Math.random() - 0.5) * 3.6),
            0,
            (m === 0 ? 0 : (Math.random() - 0.5) * 3.6)
          );
          const impactPos = baseTarget.clone().add(offset);
          const delay = 0.35 + m * 0.25;
          this.vfx.spawnFallingMeteor(
            impactPos,
            skill.aoeRadius,
            delay,
            skill.colorHex,
            skill.accentHex,
            () => {
              if (this.mode !== 'playing') return;
              this.cameraController.triggerShake(0.32, 0.2);
              this.vfx.spawnMeteorImpact(impactPos, skill.aoeRadius, skill.colorHex, skill.accentHex);
              this.dealAreaDamage(
                impactPos,
                skill.aoeRadius,
                skill.damageMultiplier * skillLevelBonus,
                Math.round(skill.energyGain / 3),
                classDef.elementColor,
                5.0
              );
            }
          );
        }
      }
    } else {
      // Ranged Assassin Skills:
      if (skillKey === 'skill1') {
        // Fan of Nightblades: 7-Kunai wide piercing cone barrage!
        const leftBlade = this.playerRig!.getBladeEmitter(-1);
        const rightBlade = this.playerRig!.getBladeEmitter(1);
        if (leftBlade && rightBlade) {
          this.vfx.spawnNightbladeRelease(leftBlade, rightBlade, this.playerYaw, skill.colorHex, skill.accentHex);
        }
        const count = 7;
        for (let i = 0; i < count; i++) {
          const frac = i / (count - 1) - 0.5; // -0.5 .. +0.5
          const angle = this.playerYaw + frac * 1.15;
          this.spawnProjectile({
            emitter: frac < 0 ? leftBlade : rightBlade,
            yaw: angle,
            speed: 24.0,
            radius: 0.38,
            damageMultiplier: skill.damageMultiplier * skillLevelBonus,
            energyGain: 4,
            colorHex: skill.colorHex,
            accentHex: skill.accentHex,
            colorCss: classDef.elementColor,
            maxLifetime: 0.52,
            pierceRemaining: 5,
            explodeRadius: 0,
            homingStrength: 0.8,
            shape: 'kunai',
          });
        }
      } else {
        const targets = [-.45, 0, .45].map(offset => {
          const angle = this.playerYaw + offset;
          return this.playerPos.clone().add(new THREE.Vector3(Math.sin(angle) * 3.4, 0, Math.cos(angle) * 3.4));
        });
        const blade = this.playerRig!.getBladeEmitter(-1);
        if (blade) this.vfx.spawnDeathmarkCast(blade, targets, skill.colorHex, skill.accentHex);
        for (const trapPos of targets) {
          this.spawnGroundHazard({
            position: trapPos,
            radius: skill.aoeRadius,
            damageMultiplier: skill.damageMultiplier * skillLevelBonus,
            energyGain: 4,
            colorHex: skill.colorHex,
            accentHex: skill.accentHex,
            colorCss: classDef.elementColor,
            duration: 4.0,
            tickInterval: 0.45,
            pullInward: false,
            visualStyle: 'shuriken_trap',
          });
        }
      }
    }
  }

  private spawnProjectile(opts: {
    origin?: THREE.Vector3;
    emitter?: THREE.Vector3;
    yaw: number;
    speed: number;
    radius: number;
    damageMultiplier: number;
    energyGain: number;
    colorHex: number;
    accentHex: number;
    colorCss: string;
    maxLifetime: number;
    pierceRemaining: number;
    explodeRadius: number;
    homingStrength: number;
    shape: ProjectileEntity['shape'];
  }): void {
    const group = new THREE.Group();
    const basePos = opts.origin ?? this.playerPos;
    const startPos = basePos
      .clone()
      .add(new THREE.Vector3(Math.sin(opts.yaw) * 0.65, 0.95, Math.cos(opts.yaw) * 0.65));
    group.position.copy(opts.emitter ?? startPos);
    group.rotation.y = opts.yaw;

    const coreMat = new THREE.MeshBasicMaterial({ color: opts.accentHex });
    const glowMat = new THREE.MeshBasicMaterial({
      color: opts.colorHex,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });

    if (opts.shape === 'kunai') {
      group.add(buildKunai(coreMat, glowMat));
    } else if (opts.shape === 'chakram') {
      group.add(buildShadowChakram(coreMat, glowMat));
    } else {
      group.add(buildStarlightProjectile(opts.shape === 'comet', coreMat, glowMat));
    }

    this.scene.add(group);

    this.projectiles.push({
      shape: opts.shape,
      id: `proj_${Date.now()}_${Math.random()}`,
      mesh: group,
      position: startPos,
      visualOffset: opts.emitter?.clone().sub(startPos),
      velocity: new THREE.Vector3(
        Math.sin(opts.yaw) * opts.speed,
        0,
        Math.cos(opts.yaw) * opts.speed
      ),
      radius: opts.radius,
      damageMultiplier: opts.damageMultiplier,
      energyGain: opts.energyGain,
      colorHex: opts.colorHex,
      accentHex: opts.accentHex,
      colorCss: opts.colorCss,
      age: 0,
      maxLifetime: opts.maxLifetime,
      pierceRemaining: opts.pierceRemaining,
      explodeRadius: opts.explodeRadius,
      homingStrength: opts.homingStrength,
      spinSpeed: opts.shape === 'chakram' ? 18 : opts.shape === 'kunai' ? 0 : opts.shape === 'comet' ? 7 : 10,
      hitEnemyIds: new Set(),
    });
  }

  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.age += dt;

      // Subtle homing steering toward nearest unhit enemy
      if (p.homingStrength > 0 && this.enemies.length > 0) {
        let nearest: EnemyEntity | null = null;
        let bestDist = 10.0;
        for (const e of this.enemies) {
          if (p.hitEnemyIds.has(e.id)) continue;
          const d = Math.hypot(
            e.bundle.root.position.x - p.position.x,
            e.bundle.root.position.z - p.position.z
          );
          if (d < bestDist) {
            bestDist = d;
            nearest = e;
          }
        }
        if (nearest) {
          const speed = p.velocity.length();
          const desired = new THREE.Vector3(
            nearest.bundle.root.position.x - p.position.x,
            0,
            nearest.bundle.root.position.z - p.position.z
          ).normalize();
          const currentDir = p.velocity.clone().normalize();
          currentDir.lerp(desired, Math.min(1, dt * p.homingStrength)).normalize();
          p.velocity.copy(currentDir.multiplyScalar(speed));
          p.mesh.rotation.y = Math.atan2(currentDir.x, currentDir.z);
        }
      }

      p.position.addScaledVector(p.velocity, dt);
      p.mesh.position.copy(p.position);
      if (p.visualOffset) {
        const settle = 1 - THREE.MathUtils.smoothstep(p.age, 0, .11);
        p.mesh.position.addScaledVector(p.visualOffset, settle);
        if (settle === 0) p.visualOffset = undefined;
      }
      if (p.shape === 'chakram') p.mesh.rotation.y += p.spinSpeed * dt;
      else if (p.spinSpeed !== 0) p.mesh.children[0].rotation.z += p.spinSpeed * dt;

      // Check collision against enemies
      let shouldRemove = p.age >= p.maxLifetime;
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        if (p.hitEnemyIds.has(enemy.id)) continue;

        const d = Math.hypot(
          enemy.bundle.root.position.x - p.position.x,
          enemy.bundle.root.position.z - p.position.z
        );
        if (d <= p.radius + enemy.radius) {
          p.hitEnemyIds.add(enemy.id);
          p.pierceRemaining -= 1;

          if (p.explodeRadius > 0) {
            this.detonateStarlight(p, 2.8);
          } else {
            this.applySingleEnemyHit(
              enemy,
              j,
              p.damageMultiplier,
              p.energyGain,
              p.colorCss,
              2.2
            );
          }

          if (p.pierceRemaining <= 0) {
            shouldRemove = true;
            break;
          }
        }
      }

      if (shouldRemove) {
        if (p.shape === 'comet' && p.hitEnemyIds.size === 0) this.detonateStarlight(p, 3.5);
        this.removeSceneObject(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }

  private detonateStarlight(projectile: ProjectileEntity, knockback: number): void {
    const { position, shape, explodeRadius, colorHex, accentHex, damageMultiplier, energyGain, colorCss } = projectile;
    const ground = new THREE.Vector3(position.x, 0, position.z);
    if (shape === 'comet') this.vfx.spawnNovaBurst(ground, explodeRadius, colorHex, accentHex);
    else this.vfx.spawnShockwaveRing(ground, explodeRadius, colorHex, accentHex, .28);
    this.dealAreaDamage(ground, explodeRadius, damageMultiplier, energyGain, colorCss, knockback);
  }

  private spawnGroundHazard(opts: {
    position: THREE.Vector3;
    radius: number;
    damageMultiplier: number;
    energyGain: number;
    colorHex: number;
    accentHex: number;
    colorCss: string;
    duration: number;
    tickInterval: number;
    pullInward: boolean;
    visualStyle: 'vortex' | 'shuriken_trap';
  }): void {
    const effect = opts.visualStyle === 'vortex'
      ? buildGravitySingularity(opts.radius, opts.colorHex, opts.accentHex)
      : buildDeathmark(opts.radius, opts.colorHex, opts.accentHex);
    effect.mesh.position.set(opts.position.x, .06, opts.position.z);
    this.scene.add(effect.mesh);
    this.groundHazards.push({
      id: `haz_${Date.now()}_${Math.random()}`,
      mesh: effect.mesh,
      position: new THREE.Vector3(opts.position.x, 0, opts.position.z),
      radius: opts.radius,
      damageMultiplier: opts.damageMultiplier,
      energyGain: opts.energyGain,
      colorCss: opts.colorCss,
      age: 0,
      duration: opts.duration,
      tickInterval: opts.tickInterval,
      tickTimer: 0.05,
      pullInward: opts.pullInward,
      pose: effect.pose,
    });
  }

  private updateGroundHazards(dt: number): void {
    for (let i = this.groundHazards.length - 1; i >= 0; i--) {
      const h = this.groundHazards[i];
      h.age += dt;
      h.tickTimer -= dt;
      if (h.tickTimer <= 0) {
        h.tickTimer = h.tickInterval;
        this.dealAreaDamage(
          h.position,
          h.radius,
          h.damageMultiplier,
          h.energyGain,
          h.colorCss,
          h.pullInward ? 5.5 : 1.5,
          h.pullInward
        );
      }
      h.pose(h.age, h.duration, h.tickInterval - h.tickTimer);

      if (h.age >= h.duration) {
        this.removeSceneObject(h.mesh);
        this.groundHazards.splice(i, 1);
      }
    }
  }

  /**
   * Deals piercing line/corridor damage along a forward ray (used by Spear Warrior thrusts).
   */
  private dealLineDamage(
    origin: THREE.Vector3,
    forwardDir: THREE.Vector3,
    length: number,
    halfWidth: number,
    multiplier: number,
    energyGain: number,
    colorCss: string,
    knockbackStrength: number
  ): void {
    const char = this.activeCharacter!;
    let hitAny = false;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const rel = enemy.bundle.root.position.clone().sub(origin);
      rel.y = 0;
      const forwardProj = rel.dot(forwardDir);
      if (forwardProj >= -0.5 && forwardProj <= length + enemy.radius) {
        const perpVec = rel.clone().addScaledVector(forwardDir, -forwardProj);
        if (perpVec.length() <= halfWidth + enemy.radius) {
          hitAny = true;
          this.applySingleEnemyHit(enemy, i, multiplier, 0, colorCss, knockbackStrength);
        }
      }
    }

    if (hitAny && energyGain > 0) {
      char.ultimateEnergy = Math.min(100, char.ultimateEnergy + energyGain);
    }
  }

  private applySingleEnemyHit(
    enemy: EnemyEntity,
    enemyIndex: number,
    multiplier: number,
    energyGain: number,
    colorCss: string,
    knockbackStrength: number,
    pullCenter?: THREE.Vector3
  ): void {
    if (this.finisher) return;
    const char = this.activeCharacter!;
    const stats = this.effectiveStats!;

    const isCrit = Math.random() < stats.critRate;
    const variance = 0.92 + Math.random() * 0.16;
    const rawDmg = stats.attack * multiplier * variance * (isCrit ? stats.critDamage : 1);
    const dmg = Math.max(1, Math.round(rawDmg));

    enemy.hp = Math.max(0, enemy.hp - dmg);
    this.audio.play(isCrit ? 'critical' : 'hit');
    if (isCrit) this.hitStop = Math.max(this.hitStop, 0.035);
    enemy.hitFlashTimer = 0.14;

    if (pullCenter) {
      const pullDir = pullCenter.clone().sub(enemy.bundle.root.position);
      pullDir.y = 0;
      if (pullDir.lengthSq() > 0.001) {
        enemy.knockbackVel.copy(pullDir.normalize().multiplyScalar(knockbackStrength));
      }
    } else {
      const dir = enemy.bundle.root.position.clone().sub(this.playerPos);
      dir.y = 0;
      if (dir.lengthSq() > 0.001) {
        enemy.knockbackVel.copy(dir.normalize().multiplyScalar(knockbackStrength));
      }
    }

    const labelAnchor = enemy.bundle.hpBarGroup.getWorldPosition(new THREE.Vector3());
    this.vfx.spawnDamageNumber(labelAnchor, dmg, isCrit, colorCss, undefined, .24);
    this.hitComboCount += 1;
    this.hitComboDecayTimer = 3.5;

    if (energyGain > 0) {
      char.ultimateEnergy = Math.min(100, char.ultimateEnergy + energyGain);
    }

    if (enemy.hp <= 0) {
      if (enemy.kind === 'boss_knight' && !this.slice) this.beginBossFinisher(enemy);
      else this.handleEnemyDefeated(enemy, enemyIndex);
    }
  }

  private dealAreaDamage(
    center: THREE.Vector3,
    radius: number,
    multiplier: number,
    energyGain: number,
    colorCss: string,
    knockbackStrength: number,
    pullInward = false
  ): void {
    const char = this.activeCharacter!;
    let hitAny = false;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const dist = center.distanceTo(enemy.bundle.root.position);
      if (dist <= radius + enemy.radius) {
        hitAny = true;
        this.applySingleEnemyHit(
          enemy,
          i,
          multiplier,
          0,
          colorCss,
          knockbackStrength,
          pullInward ? center : undefined
        );
      }
    }

    if (hitAny && energyGain > 0) {
      char.ultimateEnergy = Math.min(100, char.ultimateEnergy + energyGain);
    }
  }

  private handleEnemyDefeated(enemy: EnemyEntity, index: number): void {
    const char = this.activeCharacter!;
    const pos = enemy.bundle.root.position.clone();

    if (enemy.kind === 'boss_knight') {
      this.vfx.spawnShockwaveRing(pos, 1.8, 0xffbe0b, 0xffffff, 0.3);
    } else {
      if (enemy.bundle.emitter) enemy.bundle.emitter.visible = false;
      this.vfx.spawnFiendCollapse(enemy.bundle.bodyMesh, pos, enemy.kind === 'sentinel');
    }
    this.removeTelegraph(enemy);
    this.removeSceneObject(enemy.bundle.root);
    this.enemies.splice(index, 1);
    this.expedition.defeated += 1;
    this.defeatedEnemyIds.add(enemy.id);
    this.expedition.gold += enemy.goldReward;
    this.hitStop = Math.max(this.hitStop, 0.045);
    if (this.opening) {
      void this.saveActiveCharacterNow();
      return;
    }
    if (this.slice) {
      if (enemy.kind === 'boss_knight') {
        this.sliceBossDefeated = true;
        this.sliceBossLock = null;
      }
      if (this.enemies.length === 0) {
        this.slice.routeCleared();
        this.callbacks.onBannerNotification('THE ROAD IS CLEAR', 'Follow the lanterns to the ruined crossing.');
      }
      return;
    }

    char.enemiesDefeated += 1;
    char.xp += enemy.xpReward;

    const shouldDropItem =
      enemy.kind === 'boss_knight' || Math.random() < 0.25;
    const droppedItem = shouldDropItem
      ? generateLootItem(
          char.classId,
          char.currentWave,
          enemy.kind === 'boss_knight' ? 'epic' : undefined
        )
      : null;

    this.spawnLootOrb(pos, enemy.goldReward, droppedItem);

    // Check Quest Progress in any Combat Zone
    if (
      this.currentZone === 'stomping_grounds' ||
      this.currentZone === 'sunken_ruins' ||
      this.currentZone === 'abyssal_sanctum'
    ) {
      const quest = normalizeQuestState(char.questState);
      char.questState = quest;
      const qUpdate = QuestEngine.onCombatZoneEnemyCountChanged(
        quest,
        this.currentZone,
        this.enemies.length
      );
      if (qUpdate.stageAdvanced) {
        this.vfx.spawnShockwaveRing(this.playerPos, 6.0, 0xffd166, 0xffffff, 0.7);
        if (qUpdate.bannerTitle && qUpdate.bannerSubtitle) {
          this.callbacks.onBannerNotification(qUpdate.bannerTitle, qUpdate.bannerSubtitle);
        }
        void this.saveActiveCharacterNow();
      }
    }

    if (enemy.kind === 'boss_knight' && isChronicleRegion(this.currentZone)) {
      const objective = currentObjective(char);
      if (objective?.kind === 'battle') {
        advanceChronicle(char, objective.id);
        this.callbacks.onBannerNotification('THE OATH IS BROKEN', 'A guardian’s memory has been returned. Find your companion at the camp.');
      }
      void this.saveActiveCharacterNow();
    }
    this.checkAndApplyLevelUps();
    if (!isChronicleRegion(this.currentZone) && this.enemies.length === 0 && this.expedition.total > 0) {
      // Bank the drops before showing the report or allowing a zone transition.
      for (const orb of this.lootOrbs) this.collectLootOrb(orb);
      this.lootOrbs = [];
      this.audio.play('victory');
      void this.saveActiveCharacterNow();
      this.callbacks.onZoneCleared?.({ zone: this.currentZone, kills: this.expedition.defeated, seconds: this.expedition.seconds, gold: this.expedition.gold, damageTaken: this.expedition.damageTaken });
    }
  }

  private checkAndApplyLevelUps(): void {
    const char = this.activeCharacter!;
    while (char.xp >= char.xpToNextLevel) {
      char.xp -= char.xpToNextLevel;
      char.level += 1;
      this.audio.play('level');
      char.xpToNextLevel = xpRequiredForLevel(char.level);
      char.aetherCrystals += 15;
      char.skillLevels.basic += 1;
      if (char.level % 2 === 0) char.skillLevels.skill1 += 1;
      if (char.level % 3 === 0) char.skillLevels.skill2 += 1;
      if (char.level % 4 === 0) char.skillLevels.ultimate += 1;

      this.effectiveStats = computeEffectiveStats(char);
      char.currentHp = this.effectiveStats.maxHp;

      this.vfx.spawnShockwaveRing(this.playerPos, 5.2, 0xffea00, 0xffffff, 0.65);
      this.vfx.spawnDamageNumber(
        this.playerPos,
        char.level,
        true,
        '#ffea00',
        `★ LEVEL UP! LV.${char.level}`
      );
      this.callbacks.onBannerNotification(
        `LEVEL UP! // LV.${char.level}`,
        `${char.name}'s Astral Resonance has ascended!`
      );
      void this.saveActiveCharacterNow();
    }
  }

  private spawnLootOrb(pos: THREE.Vector3, gold: number, item: InventoryItem | null): void {
    const color = item
      ? item.rarity === 'mythic'
        ? 0xff0054
        : item.rarity === 'epic'
          ? 0x9d4edd
          : item.rarity === 'rare'
            ? 0x4cc9f0
            : 0x80ed99
      : 0xffd166;

    const geo = new THREE.OctahedronGeometry(item ? 0.34 : 0.22, 0);
    const mat = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos.x, 0.55, pos.z);
    attachAnimeOutline(mesh, 1.12);
    this.scene.add(mesh);

    this.lootOrbs.push({
      id: `loot_${Date.now()}_${Math.random()}`,
      mesh,
      position: mesh.position,
      gold,
      item,
      age: 0,
    });
  }

  private collectLootOrb(orb: LootOrbEntity): void {
    const char = this.activeCharacter;
    if (!char) return;
    char.gold += orb.gold;
    if (orb.item) {
      char.inventory.push(orb.item);
      this.callbacks.onLootObtained(orb.item);
      this.vfx.spawnDamageNumber(this.playerPos, 0, true, '#a8d9cb', `${orb.item.icon} ${orb.item.name}`);
    } else if (orb.gold > 0) {
      this.vfx.spawnDamageNumber(this.playerPos, orb.gold, false, '#d8b97d', `+${orb.gold}G`);
    }
    this.removeSceneObject(orb.mesh);
  }

  private updateLootOrbs(dt: number): void {
    for (let i = this.lootOrbs.length - 1; i >= 0; i--) {
      const orb = this.lootOrbs[i];
      orb.age += dt;
      orb.mesh.rotation.y += dt * 3.2;
      orb.position.y = 0.5 + Math.sin(orb.age * 4) * 0.14;
      const dist = this.playerPos.distanceTo(orb.position);
      if (dist < 4.5) {
        const pullDir = this.playerPos.clone().sub(orb.position).normalize();
        orb.position.addScaledVector(pullDir, 11.5 * dt);
      }
      if (dist < 0.95) {
        this.lootOrbs.splice(i, 1);
        this.collectLootOrb(orb);
        void this.saveActiveCharacterNow();
      }
    }
  }

  private damagePlayer(damage: number): boolean {
    const character = this.activeCharacter!;
    if (this.invulnerableTimer > 0) {
      character.ultimateEnergy = Math.min(100, character.ultimateEnergy + 12);
      this.vfx.spawnDamageNumber(this.playerPos, 0, false, '#a8e6d3', 'EVADE +12');
      return false;
    }
    character.currentHp = Math.max(0, character.currentHp - damage);
    this.expedition.damageTaken += damage;
    this.hitComboCount = 0;
    this.invulnerableTimer = 0.35;
    this.animState.hitFlashTimer = 0.22;
    this.audio.play('hurt');
    this.vfx.spawnDamageNumber(this.playerPos, damage, false, '#f48390', `-${damage}`);
    this.cameraController.triggerShake(0.25, 0.16);
    if (character.currentHp > 0) return false;
    this.defeated = true;
    this.input.resetAll();
    this.audio.play('defeat');
    if (this.opening) void this.saveActiveCharacterNow();
    this.emitHudTelemetry();
    this.callbacks.onDefeated?.();
    return true;
  }

  private updateEnemies(dt: number): void {
    if (this.finisher) return;
    const stats = this.effectiveStats!;

    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      const pos = enemy.bundle.root.position;
      const previousX = pos.x;
      const previousZ = pos.z;

      // Apply knockback decay
      if (enemy.knockbackVel.lengthSq() > 0.05) {
        pos.addScaledVector(enemy.knockbackVel, dt);
        enemy.knockbackVel.multiplyScalar(Math.pow(0.04, dt));
      }

      const toPlayer = this.playerPos.clone().sub(pos);
      toPlayer.y = 0;
      const dist = toPlayer.length();
      let released = false;
      let pursuing = false;

      if (enemy.kind === 'boss_knight' && !enemy.enraged && enemy.hp <= enemy.maxHp * 0.5) {
        enemy.enraged = true;
        this.vfx.spawnShockwaveRing(pos, 4, 0xff526d, 0xffbc80, 0.6);
        this.callbacks.onBannerNotification('THE GATEKEEPER ENRAGES', 'Faster strikes. Watch the ground and keep your dash ready.');
      }
      const pattern = enemy.windup > 0 && enemy.attackPattern ? enemy.attackPattern : enemy.kind === 'boss_knight' && isChronicleRegion(this.currentZone) ? getGuardianPattern(this.currentZone, enemy.enraged) : getAttackPattern(enemy.kind, enemy.enraged);
      if (enemy.windup > 0) {
        enemy.windup = Math.max(0, enemy.windup - dt);
        const progress = 1 - enemy.windup / pattern.windup;
        const fill = enemy.telegraph?.children[1];
        if (fill) fill.scale.setScalar(Math.max(0.03, progress));
        if (enemy.windup === 0) {
          released = true;
          this.removeTelegraph(enemy);
          if (enemy.bundle.emitter) {
            this.vfx.spawnSentinelDischarge(enemy.bundle.emitter.getWorldPosition(new THREE.Vector3()),
              enemy.attackTarget, pattern.radius);
          } else {
            this.vfx.spawnShockwaveRing(enemy.attackTarget, pattern.radius, 0xff526d, 0xffd3b4, 0.3);
          }
          enemy.attackCooldown = pattern.recovery;
          if (isInsideAttack(this.playerPos, enemy.attackTarget, pattern.radius, pattern.innerRadius)) {
            const damage = Math.max(1, Math.round(enemy.attack * pattern.damageScale * (100 / (100 + stats.defense))));
            if (this.damagePlayer(damage)) return;
          }
        }
      } else if (dist <= 16.5 && dist > 0.01 && !this.opening?.safe) {
        const dir = toPlayer.clone().normalize();
        enemy.bundle.bodyMesh.rotation.y = Math.atan2(dir.x, dir.z);
        enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
        if (dist > pattern.reach) {
          pursuing = true;
          pos.addScaledVector(dir, enemy.speed * (enemy.enraged ? 1.25 : 1) * dt);
        } else if (enemy.attackCooldown <= 0) {
          enemy.attackTarget.copy(enemy.kind === 'boss_knight' && this.currentZone !== 'ember_coast' && this.currentZone !== 'world_heart' ? pos : this.playerPos);
          enemy.attackTarget.y = 0.06;
          enemy.attackPattern = pattern;
          enemy.windup = pattern.windup;
          const group = new THREE.Group();
          group.position.copy(enemy.attackTarget);
          const makeMarker = (geometry: THREE.BufferGeometry, opacity: number) => {
            const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: enemy.kind === 'boss_knight' ? 0xff875b : 0xff526d, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false }));
            mesh.rotation.x = -Math.PI / 2;
            group.add(mesh);
          };
          makeMarker(new THREE.RingGeometry(pattern.radius - 0.07, pattern.radius, 48), 0.9);
          makeMarker(pattern.innerRadius ? new THREE.RingGeometry(pattern.innerRadius, pattern.radius, 48) : new THREE.CircleGeometry(pattern.radius, 48), 0.26);
          group.children[1].scale.setScalar(0.03);
          if (pattern.innerRadius) {
            const safe = new THREE.Mesh(new THREE.RingGeometry(pattern.innerRadius - 0.05, pattern.innerRadius, 48), new THREE.MeshBasicMaterial({ color: 0xa4e7cc, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false }));
            safe.rotation.x = -Math.PI / 2; safe.position.y = 0.01; group.add(safe);
          }
          enemy.telegraph = group;
          this.scene.add(group);
        }
      }

      // Soft separation between enemies
      for (let j = i + 1; j < this.enemies.length; j++) {
        const other = this.enemies[j];
        const diff = pos.clone().sub(other.bundle.root.position);
        diff.y = 0;
        const d = diff.length();
        const minDist = enemy.radius + other.radius + 0.25;
        if (d > 0.001 && d < minDist) {
          const push = diff.normalize().multiplyScalar((minDist - d) * 0.5);
          pos.add(push);
          const otherPosition = other.bundle.root.position;
          const { x, z } = otherPosition;
          otherPosition.sub(push);
          if (this.environment.biomeWalkable) this.constrainBiomeActor(otherPosition, x, z);
          else this.opening?.constrainMovement(otherPosition, x, z);
        }
      }

      // Clamp enemy to the procedural path if in a procedural corridor zone
      if (this.environment.biomeWalkable) {
        this.constrainBiomeActor(pos, previousX, previousZ);
      } else if (this.currentPathLayout) {
        const clamped = clampToProceduralPath(pos.x, pos.z, this.currentPathLayout, 0.65);
        pos.x = clamped.x;
        pos.z = clamped.z;
      } else if (this.opening) {
        this.opening.constrainMovement(pos, previousX, previousZ);
      }

      const anticipation = enemy.windup > 0 ? 1 - enemy.windup / pattern.windup : null;
      if (enemy.bundle.animate) {
        const travel = pursuing ? Math.hypot(pos.x - previousX, pos.z - previousZ) : 0;
        enemy.bundle.animate(dt, {
          windup: anticipation, released,
          moving: Math.min(1, travel / Math.max(.0001, enemy.speed * dt)),
          stagger: THREE.MathUtils.clamp(enemy.hitFlashTimer / .22, 0, 1),
        });
      } else {
        enemy.bundle.bodyMesh.position.y =
          1.05 + Math.sin(performance.now() * 0.005 + i) * 0.12 + (anticipation ?? 0) * 0.18;
      }

      if (enemy.hitFlashTimer > 0) {
        const intensity = THREE.MathUtils.clamp(enemy.hitFlashTimer / .14, 0, 1);
        enemy.hitFlashTimer -= dt;
        enemy.bundle.mainMaterial.emissive.setHex(0xffffff);
        enemy.bundle.mainMaterial.emissiveIntensity = intensity * (enemy.windup > 0 && enemy.bundle.emitter ? .28 : .95);
      } else {
        enemy.bundle.mainMaterial.emissive.setHex(enemy.bundle.baseEmissiveHex);
        enemy.bundle.mainMaterial.emissiveIntensity = 0.4;
      }

      const hpRatio = Math.max(0, Math.min(1, enemy.hp / enemy.maxHp));
      enemy.bundle.hpBarFill.scale.x = hpRatio;
      enemy.bundle.hpBarGroup.quaternion.copy(this.cameraController.camera.quaternion);
    }
  }

  private getComboRank(hits: number): string {
    if (hits >= 30) return 'SSS';
    if (hits >= 20) return 'SS';
    if (hits >= 12) return 'S';
    if (hits >= 7) return 'A';
    if (hits >= 4) return 'B';
    if (hits >= 2) return 'C';
    return 'D';
  }

  private emitHudTelemetry(): void {
    if (!this.activeCharacter || !this.effectiveStats) return;
    const char = this.activeCharacter;
    const classDef = CHARACTER_CLASSES[char.classId];
    const secsAgo = Math.max(0, Math.round((Date.now() - this.lastSavedAt) / 1000));

    let zoneTitle = 'STARTING TOWN';
    let zoneSubtitle = 'Safe Zone • Aetherhaven Outpost';
    if (this.currentZone === 'stomping_grounds') {
      const pct = Math.round(this.currentPathProgress * 100);
      zoneTitle = `STOMPING GROUNDS · ${pct}%`;
      zoneSubtitle = `${this.enemies.length} fiends remaining · Fractured wilds`;
    } else if (this.currentZone === 'market_crossing') {
      zoneTitle = 'MARKET CROSSING';
      zoneSubtitle = 'Safe Zone Hub • Starlight Bazaar';
    } else if (this.currentZone === 'sunken_ruins') {
      const pct = Math.round(this.currentPathProgress * 100);
      zoneTitle = `SUNKEN ASTRAL RUINS (${pct}%)`;
      zoneSubtitle = `${this.enemies.length} guardians remaining · The drowned spire`;
    } else if (this.currentZone === 'abyssal_sanctum') {
      zoneTitle = 'ABYSSAL SANCTUM';
      zoneSubtitle =
        this.enemies.length > 0
          ? `${this.enemies.length} Eclipse Bosses Remaining`
          : 'Sanctum Cleared • Speak with High Sage Orin';
    }

    const companionConfigs = ensureCompanionConfigs(char);
    const companionNamesMap: Partial<Record<CharacterClassId, string>> = {};
    const companionViews: CompanionStatusView[] = this.companions.map((c) => {
      companionNamesMap[c.classId] = c.name;
      const cDef = CHARACTER_CLASSES[c.classId];
      const cfg = companionConfigs[c.classId];
      return {
        classId: c.classId,
        name: c.name,
        archetypeLabel: cDef.archetypeLabel,
        icon: cDef.starterWeapon.icon,
        elementColor: cDef.elementColor,
        level: c.level,
        bondLevel: cfg.bondLevel,
        stance: cfg.stance,
        actionText: c.actionText,
        isFromAccountSlot: c.isFromAccountSlot,
      };
    });

    const quest = normalizeQuestState(char.questState);
    char.questState = quest;
    const legacyQuestView = QuestEngine.getObjectiveView(
      quest,
      this.currentZone,
      this.nearbyNpc?.id ?? null,
      char.classId,
      companionNamesMap
    );

    const questView = chronicleObjectiveView(char, this.currentZone) ?? legacyQuestView;
    // The Bellroad tracker must not hide the touch action for the original town quest givers.
    if (isSafeZone(this.currentZone)) questView.actionButtonLabel = legacyQuestView.actionButtonLabel;
    const field = this.fieldPlan && currentObjective(char)?.kind === 'field' ? this.fieldPlan : null;
    if (field) questView.progressText = fieldStatus(field, ensureCampaign(char).fieldProgress![field.id]);
    if (this.slice) {
      const objective = this.slice.objective(char.classId);
      zoneTitle = this.slice.atCamp ? 'HEARTHMERE OUTSKIRTS · CAMP' : 'HEARTHMERE OUTSKIRTS';
      zoneSubtitle = 'The old road and ruined crossing';
      Object.assign(questView, {
        chapterTitle: 'HEARTHMERE OUTSKIRTS', stage: 'chronicle', stepNumber: objective.step, totalSteps: 3,
        objectiveTitle: objective.title, objectiveHint: objective.hint,
        progressText: this.slice.message || (char.classId === 'assassin' && this.slice.stealthTime > 0
          ? `Veil · ${this.slice.stealthTime.toFixed(1)}s` : ''),
        isComplete: this.slice.step === 'complete', companionBanter: null,
      });
    }
    if (this.opening) {
      const objective = this.opening.objective;
      zoneTitle = this.opening.step === 'complete' || this.opening.step === 'refuge' ? 'HEARTHMERE · REFUGE CAMP' : 'HEARTHMERE';
      zoneSubtitle = this.opening.crisis ? 'The Starforged Crown · Flight from Hearthmere' : 'The Starforged Crown · Before the bell';
      Object.assign(questView, {
        chapterTitle: 'HEARTHMERE', stage: 'chronicle', stepNumber: objective.beat, totalSteps: 8,
        objectiveTitle: objective.title, objectiveHint: objective.hint,
        progressText: this.opening.crossingHint || (this.enemies.length
          ? `${this.enemies.length} ${this.enemies.length === 1 ? 'threat remains' : 'threats remain'}` : ''),
        isComplete: this.opening.step === 'complete', companionBanter: null,
      });
    }
    if (isChronicleRegion(this.currentZone)) {
      const chapter = currentChapter(char);
      zoneTitle = REGION_NAMES[chapter.region].toUpperCase();
      zoneSubtitle = chapter.title;
    }

    const contextualNpc: NpcActor | null = this.nearbyNpc
      ? {
          ...this.nearbyNpc,
          dialogue: QuestEngine.getContextualNpcDialogue(
            quest,
            this.nearbyNpc.id,
            this.nearbyNpc.dialogue
          ),
        }
      : null;

    const boss = this.enemies.find(enemy => enemy.kind === 'boss_knight' && enemy.bundle.root.position.distanceTo(this.playerPos) < 19);
    this.callbacks.onHudUpdate({
      map: {
        player: { x: this.playerPos.x, z: this.playerPos.z, yaw: this.playerYaw },
        enemies: this.enemies.filter(e => e.bundle.root.position.distanceTo(this.playerPos) < 28).map(e => ({ x: e.bundle.root.position.x, z: e.bundle.root.position.z, boss: e.kind === 'boss_knight' })),
        portals: this.activePortals.map(p => p.position),
        npcs: this.opening ? [this.opening.objective.target] : [...this.activeNpcs.map(n => n.position), ...this.chronicleSites.filter(site => site.kind !== 'field' && !ensureCampaign(char).discoveries.includes(site.id) && (site.kind === 'echo' || site.objectiveIndex === ensureCampaign(char).objectiveIndex)).map(site => site.position), ...(field ? [fieldTarget(field, ensureCampaign(char).fieldProgress![field.id], this.playerPos, this.fieldThreats())] : [])],
        terrain: this.minimapTerrain?.snapshot(this.environment.minimapWorldRoot),
      },
      boss: boss ? { name: boss.name, hp: boss.hp, maxHp: boss.maxHp, enraged: boss.enraged } : null,
      flaskCharges: this.flaskCharges,
      expedition: { defeated: this.expedition.defeated, total: this.expedition.total, seconds: this.expedition.seconds },
      damageFlash: this.animState.hitFlashTimer > 0,
      fieldActivity: field ? { status: questView.progressText, instruction: field.definition.instruction } : null,
      nearbyChronicle: this.nearbyChronicleSite ? { title: this.nearbyChronicleSite.title, resolved: false } : null,
      hp: char.currentHp,
      maxHp: this.effectiveStats.maxHp,
      xp: char.xp,
      xpToNextLevel: char.xpToNextLevel,
      level: char.level,
      gold: char.gold,
      aetherCrystals: char.aetherCrystals,
      ultimateEnergy: char.ultimateEnergy,
      zoneId: this.currentZone,
      zoneTitle,
      zoneSubtitle,
      isSafeZone: this.opening?.safe ?? this.slice?.atCamp ?? isSafeZone(this.currentZone),
      pathProgress: this.currentPathProgress,
      pathSeed: this.currentPathLayout?.seed ?? null,
      nearbyPortal: this.nearbyPortal,
      portalLocked: this.nearbyPortal ? this.isPortalLocked(this.nearbyPortal) : false,
      nearbyNpc: contextualNpc,
      questView,
      companions: companionViews,
      wave: char.currentWave,
      enemiesRemaining: this.enemies.length,
      comboCount: this.hitComboCount,
      comboRank: this.getComboRank(this.hitComboCount),
      cooldowns: {
        basic: {
          remaining: this.cooldowns.basic,
          total: classDef.skills.basic.cooldown,
        },
        dash: {
          remaining: this.cooldowns.dash,
          total: classDef.skills.dash.cooldown,
        },
        skill1: {
          remaining: this.cooldowns.skill1,
          total: classDef.skills.skill1.cooldown,
        },
        skill2: {
          remaining: this.cooldowns.skill2,
          total: classDef.skills.skill2.cooldown,
        },
        ultimate: {
          remaining: this.cooldowns.ultimate,
          total: classDef.skills.ultimate.cooldown,
        },
      },
      lastSavedText: this.openingSaveFailed ? 'Save failed' : this.slice ? 'Playtest session' : secsAgo <= 1 ? 'Saved just now' : `Saved ${secsAgo}s ago`,
      slice: this.slice ? {
        bossAvailable: Boolean(boss), bossLocked: Boolean(this.sliceBossLock),
        committed: this.attackCommitted, canUseLever: this.slice.canLowerBridge(this.sliceActors()),
      } : undefined,
      opening: this.opening ? {
        action: this.opening.actionAt(this.playerPos, this.enemies.length),
        line: this.opening.line ?? undefined,
        committed: this.attackCommitted,
      } : undefined,
    });
  }

  public resizeToViewport(): void {
    const viewport = getViewportProfile();
    this.renderer.setPixelRatio(viewport.pixelRatio);
    this.renderer.setSize(viewport.width, viewport.height, false);
    this.cameraController.updateAspect();
    this.input.resetAll();
  }

  private onResize = (): void => { this.resizeToViewport(); };
}
