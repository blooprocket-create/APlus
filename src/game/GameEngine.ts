import * as THREE from 'three';
import { CHARACTER_CLASSES, computeEffectiveStats } from '../data/classes';
import { ActionId, InputManager } from '../input/InputManager';
import { PersistenceManager, xpRequiredForLevel } from '../persistence/PersistenceManager';
import { attachAnimeOutline, createAnimeToonMaterial } from '../rendering/AnimeMaterials';
import { CharacterAnimationState, CharacterRig } from '../rendering/CharacterMeshBuilder';
import { buildEnemyMesh, EnemyKind, EnemyMeshBundle } from '../rendering/EnemyMeshBuilder';
import { EnvironmentBuilder, SAFE_ZONE_RADIUS } from '../rendering/EnvironmentBuilder';
import { IsometricCameraController } from '../rendering/IsometricCamera';
import { VfxSystem } from '../rendering/VfxSystem';
import {
  CharacterClassId,
  CharacterSaveData,
  CharacterStats,
  InventoryItem,
  ZoneId,
} from '../types/game';
import { NpcActor, PortalTrigger, ProceduralPathLayout } from '../types/world';
import { QuestObjectiveView } from '../types/quest';
import { generateLootItem } from './LootSystem';
import {
  clampToProceduralPath,
  generateStompingGroundsPath,
} from './ProceduralPathGenerator';
import { normalizeQuestState, QuestEngine } from './QuestEngine';

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
}

export interface ProjectileEntity {
  id: string;
  mesh: THREE.Object3D;
  position: THREE.Vector3;
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
  colorHex: number;
  accentHex: number;
  colorCss: string;
  age: number;
  duration: number;
  tickInterval: number;
  tickTimer: number;
  pullInward: boolean;
}

export interface LootOrbEntity {
  id: string;
  mesh: THREE.Object3D;
  position: THREE.Vector3;
  gold: number;
  item: InventoryItem | null;
  age: number;
}

export interface HudTelemetry {
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
  nearbyNpc: NpcActor | null;
  questView: QuestObjectiveView;
  wave: number;
  enemiesRemaining: number;
  comboCount: number;
  comboRank: string;
  cooldowns: Record<ActionId, { remaining: number; total: number }>;
  lastSavedText: string;
}

export interface GameEngineCallbacks {
  onHudUpdate: (telemetry: HudTelemetry) => void;
  onUltimateCutIn: (className: string, skillName: string, colorCss: string) => void;
  onBannerNotification: (title: string, subtitle: string) => void;
  onLootObtained: (item: InventoryItem) => void;
  onCharacterSaved: (character: CharacterSaveData) => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private cameraController: IsometricCameraController;
  private environment: EnvironmentBuilder;
  private vfx: VfxSystem;
  public readonly input: InputManager;
  private persistence: PersistenceManager;
  private callbacks: GameEngineCallbacks;

  private mode: 'preview' | 'playing' = 'preview';
  private previewRig: CharacterRig | null = null;
  private pedestalMesh: THREE.Mesh | null = null;

  // Active Gameplay State
  private activeCharacter: CharacterSaveData | null = null;
  private effectiveStats: CharacterStats | null = null;
  private playerRig: CharacterRig | null = null;
  private playerPos = new THREE.Vector3(0, 0, 0);
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
  private projectiles: ProjectileEntity[] = [];
  private groundHazards: GroundHazardEntity[] = [];
  private lootOrbs: LootOrbEntity[] = [];
  private autoSaveTimer = 0;
  private lastSavedAt = Date.now();
  private lastFrameTime = performance.now();

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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.cameraController = new IsometricCameraController();
    this.environment = new EnvironmentBuilder();
    this.environment.buildZone(this.scene, 'starting_town');

    this.vfx = new VfxSystem(this.scene, damageLayer);
    this.input = new InputManager();

    this.buildPreviewPedestal();

    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', (e) => {
      if ((e.code === 'KeyF' || e.code === 'Enter') && this.mode === 'playing') {
        if (!this.interactWithNearbyQuestNpc()) {
          this.tryTraverseNearbyPortal();
        }
      }
    });
    document.addEventListener('visibilitychange', () => {
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
   * Switches to 3D Pedestal Preview mode for Character Select / Creation.
   */
  public setPreviewCharacter(classId: CharacterClassId | null): void {
    this.mode = 'preview';
    this.clearGameplayEntities();
    this.environment.buildZone(this.scene, 'starting_town');

    if (this.pedestalMesh) {
      this.pedestalMesh.visible = true;
    }

    if (this.previewRig) {
      this.scene.remove(this.previewRig.root);
      this.previewRig = null;
    }

    if (classId) {
      this.previewRig = new CharacterRig(classId);
      this.previewRig.root.position.set(0, 0.26, 0);
      this.scene.add(this.previewRig.root);
    }
  }

  /**
   * Starts the Isometric ARPG Gameplay session for a selected character slot.
   * New characters start in Starting Town (Safe Zone) and traverse portals to Stomping Grounds & Market Crossing.
   */
  public startGameplayWithCharacter(character: CharacterSaveData): void {
    this.clearGameplayEntities();
    if (this.previewRig) {
      this.scene.remove(this.previewRig.root);
      this.previewRig = null;
    }
    if (this.pedestalMesh) {
      this.pedestalMesh.visible = false;
    }

    this.mode = 'playing';
    this.activeCharacter = structuredClone(character);
    this.activeCharacter.questState = normalizeQuestState(this.activeCharacter.questState);
    this.effectiveStats = computeEffectiveStats(this.activeCharacter);
    this.activeCharacter.currentHp = Math.min(
      this.effectiveStats.maxHp,
      Math.max(1, this.activeCharacter.currentHp || this.effectiveStats.maxHp)
    );

    this.playerRig = new CharacterRig(this.activeCharacter.classId);
    this.scene.add(this.playerRig.root);
    this.buildCompassArrow();

    this.cooldowns = { basic: 0, dash: 0, skill1: 0, skill2: 0, ultimate: 0 };
    this.hitComboCount = 0;
    this.autoSaveTimer = 0;

    const initialZone: ZoneId = this.activeCharacter.currentZone || 'starting_town';
    this.enterZone(initialZone);
    this.emitHudTelemetry();
  }

  /**
   * Transitions the player into a target Zone via portal or initial spawn.
   */
  public enterZone(
    zoneId: ZoneId,
    spawnTag?: PortalTrigger['targetSpawnTag'],
    explicitSeed?: number
  ): void {
    if (!this.activeCharacter || !this.effectiveStats) return;

    this.clearZoneCombatEntities();
    this.currentZone = zoneId;
    this.activeCharacter.currentZone = zoneId;
    this.portalGraceTimer = 1.65;
    this.nearbyPortal = null;
    this.nearbyNpc = null;

    if (zoneId === 'starting_town') {
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
        'Safe Zone • Head North through the Rift Portal to enter Stomping Grounds'
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
      const questBanner = QuestEngine.onEnterStompingGrounds(quest, this.enemies.length);

      this.callbacks.onBannerNotification(
        questBanner.bannerTitle ?? `STOMPING GROUNDS // PATH #${layout.seed % 1000}`,
        questBanner.bannerSubtitle ??
          `Procedural Single Path (${layout.totalDistance}m) • Battle to the far Portal!`
      );
    } else {
      this.currentPathLayout = null;
      this.currentPathProgress = 1;
      const built = this.environment.buildZone(this.scene, 'market_crossing');
      this.activePortals = built.portals;
      this.activeNpcs = built.npcs;

      this.playerPos.set(0, 0, 10.2);
      this.playerYaw = Math.PI;

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
        this.spawnLootOrb(new THREE.Vector3(0, 0, 6.5), bonusGold, rewardItem);
      }

      this.activeCharacter.currentHp = this.effectiveStats.maxHp;
      this.callbacks.onBannerNotification(
        'MARKET CROSSING // STARLIGHT BAZAAR',
        'Safe Zone • Rest, equip new relics, or step through the Portal for a new Stomping Grounds run!'
      );
    }

    if (this.playerRig) {
      this.playerRig.root.position.copy(this.playerPos);
      this.playerRig.root.rotation.y = this.playerYaw;
    }
    this.vfx.spawnShockwaveRing(this.playerPos, 3.2, 0x4cc9f0, 0xffffff, 0.45);
    void this.saveActiveCharacterNow();
  }

  public tryTraverseNearbyPortal(): boolean {
    if (!this.nearbyPortal || this.mode !== 'playing') return false;
    const target = this.nearbyPortal;
    this.enterZone(target.targetZone, target.targetSpawnTag);
    return true;
  }

  /**
   * Interacts with the nearby NPC to accept, advance, or complete the active quest.
   */
  public interactWithNearbyQuestNpc(): boolean {
    if (!this.activeCharacter || !this.nearbyNpc || this.mode !== 'playing') {
      return false;
    }
    const quest = normalizeQuestState(this.activeCharacter.questState);
    this.activeCharacter.questState = quest;

    const result = QuestEngine.interactWithNpc(quest, this.nearbyNpc.id);
    if (!result.advanced) return false;

    this.vfx.spawnShockwaveRing(this.playerPos, 3.8, 0xffd166, 0xffffff, 0.48);

    if (result.eventType === 'completed') {
      this.activeCharacter.xp += 500;
      this.activeCharacter.gold += 600;
      this.activeCharacter.aetherCrystals += 50;
      this.checkAndApplyLevelUps();

      const mythicReward = generateLootItem(
        this.activeCharacter.classId,
        Math.max(2, this.activeCharacter.currentWave + 1),
        'mythic'
      );
      this.spawnLootOrb(
        this.playerPos.clone().add(new THREE.Vector3(0, 0, -1.2)),
        250,
        mythicReward
      );
    }

    if (result.bannerTitle && result.bannerSubtitle) {
      this.callbacks.onBannerNotification(result.bannerTitle, result.bannerSubtitle);
    }

    void this.saveActiveCharacterNow();
    this.emitHudTelemetry();
    return true;
  }

  private buildCompassArrow(): void {
    if (this.compassGroup) {
      this.scene.remove(this.compassGroup);
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

    if (this.currentZone === 'starting_town') {
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
      } else {
        const portal = this.activePortals[0];
        if (portal) targetPos = portal.position;
      }
    }

    if (targetPos) {
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

  public async saveActiveCharacterNow(): Promise<void> {
    if (!this.activeCharacter || this.mode !== 'playing') return;
    this.activeCharacter.position = {
      x: Number(this.playerPos.x.toFixed(2)),
      y: 0,
      z: Number(this.playerPos.z.toFixed(2)),
    };
    const saved = await this.persistence.saveCharacter(this.activeCharacter);
    this.activeCharacter = saved;
    this.lastSavedAt = Date.now();
    this.callbacks.onCharacterSaved(saved);
  }

  private clearZoneCombatEntities(): void {
    for (const enemy of this.enemies) {
      this.scene.remove(enemy.bundle.root);
    }
    this.enemies = [];
    for (const proj of this.projectiles) {
      this.scene.remove(proj.mesh);
    }
    this.projectiles = [];
    for (const haz of this.groundHazards) {
      this.scene.remove(haz.mesh);
    }
    this.groundHazards = [];
    for (const orb of this.lootOrbs) {
      this.scene.remove(orb.mesh);
    }
    this.lootOrbs = [];
    this.vfx.clearAll();
  }

  private clearGameplayEntities(): void {
    if (this.playerRig) {
      this.scene.remove(this.playerRig.root);
      this.playerRig = null;
    }
    if (this.compassGroup) {
      this.scene.remove(this.compassGroup);
      this.compassGroup = null;
    }
    this.clearZoneCombatEntities();
  }

  private spawnProceduralStompingGroundsEncounters(layout: ProceduralPathLayout): void {
    const clears = this.activeCharacter?.stompingGroundsClears ?? 0;
    const scale = 1 + clears * 0.22;

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

  private spawnEnemyAtPosition(
    kind: EnemyKind,
    x: number,
    z: number,
    scale: number
  ): void {
    const bundle = buildEnemyMesh(kind);
    bundle.root.position.set(x, 0, z);
    this.scene.add(bundle.root);

    const baseHp = kind === 'boss_knight' ? 680 : kind === 'sentinel' ? 210 : 135;
    const baseAtk = kind === 'boss_knight' ? 38 : kind === 'sentinel' ? 22 : 15;
    const speed = kind === 'boss_knight' ? 3.3 : kind === 'sentinel' ? 3.8 : 4.3;

    this.enemies.push({
      id: `enemy_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
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
    });
  }

  private loop = (now: number): void => {
    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastFrameTime) / 1000));
    this.lastFrameTime = now;

    this.environment.update(dt);

    if (this.mode === 'preview') {
      if (this.previewRig) {
        this.previewRig.root.rotation.y += dt * 0.65;
        this.previewRig.updateAnimation(dt, {
          isMoving: false,
          moveSpeedRatio: 0,
          attackComboStep: 0,
          attackSwingProgress: 0,
          isDashing: false,
          hitFlashTimer: 0,
        });
      }
      this.cameraController.updatePedestalPreview(dt);
    } else if (this.mode === 'playing' && this.activeCharacter && this.playerRig && this.effectiveStats) {
      this.updateGameplay(dt);
    }

    this.vfx.update(dt, this.cameraController.camera);
    this.renderer.render(this.scene, this.cameraController.camera);

    requestAnimationFrame(this.loop);
  };

  private updateGameplay(dt: number): void {
    const char = this.activeCharacter!;
    const stats = this.effectiveStats!;
    const classDef = CHARACTER_CLASSES[char.classId];

    char.playTimeSeconds += dt;
    this.autoSaveTimer += dt;
    if (this.autoSaveTimer >= 5.0) {
      this.autoSaveTimer = 0;
      void this.saveActiveCharacterNow();
    }

    if (this.portalGraceTimer > 0) {
      this.portalGraceTimer = Math.max(0, this.portalGraceTimer - dt);
    }

    // Safe Zone passive regeneration
    if (this.currentZone !== 'stomping_grounds') {
      if (char.currentHp < stats.maxHp) {
        char.currentHp = Math.min(stats.maxHp, Math.ceil(char.currentHp + stats.maxHp * 0.15 * dt));
      }
      if (char.ultimateEnergy < 100) {
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
    const move = this.input.moveVector;

    // Handle Dash state
    if (this.dashTimer > 0) {
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
        this.playerYaw = Math.atan2(move.x, move.y);
        this.animState.isMoving = true;
        this.animState.moveSpeedRatio = move.length();
      } else {
        this.animState.isMoving = false;
        this.animState.moveSpeedRatio = 0;
      }
    }

    // Process Action Inputs (Dash, Ultimate, Skill 2, Skill 1, Basic Attack)
    if (this.input.consumeAction('dash') && this.cooldowns.dash <= 0) {
      this.executeDash(classDef);
    } else if (
      this.input.consumeAction('ultimate') &&
      this.cooldowns.ultimate <= 0 &&
      char.ultimateEnergy >= classDef.skills.ultimate.energyCost
    ) {
      this.executeSkill('ultimate');
    } else if (this.input.consumeAction('skill2') && this.cooldowns.skill2 <= 0) {
      this.executeSkill('skill2');
    } else if (this.input.consumeAction('skill1') && this.cooldowns.skill1 <= 0) {
      this.executeSkill('skill1');
    } else if (this.input.consumeAction('basic') && this.cooldowns.basic <= 0) {
      this.executeBasicCombo();
    }

    // Update attack swing animation progress
    if (this.activeAttackTimer > 0) {
      this.activeAttackTimer -= dt;
      this.animState.attackSwingProgress =
        1 - Math.max(0, this.activeAttackTimer / this.activeAttackDuration);
      if (this.activeAttackTimer <= 0) {
        this.animState.attackComboStep = 0;
      }
    }

    // Update Player Rig transform & animation
    this.playerRig!.root.position.copy(this.playerPos);
    this.playerRig!.root.rotation.y = this.playerYaw;
    this.playerRig!.updateAnimation(dt, this.animState);

    // Update Projectiles, Ground Hazards, Enemies & Loot
    this.updateProjectiles(dt);
    this.updateGroundHazards(dt);
    this.updateEnemies(dt);
    this.updateLootOrbs(dt);
    this.updatePortalAndNpcProximity();
    this.updateCompassArrow();

    this.cameraController.updateIsometricFollow(dt, this.playerPos, move);
    this.emitHudTelemetry();
  }

  private clampPlayerToZone(): void {
    if (this.currentZone === 'stomping_grounds' && this.currentPathLayout) {
      const clamped = clampToProceduralPath(
        this.playerPos.x,
        this.playerPos.z,
        this.currentPathLayout,
        0.55
      );
      this.playerPos.x = clamped.x;
      this.playerPos.z = clamped.z;
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
    if (closestPortal && bestPortalDist <= 1.35 && this.portalGraceTimer <= 0) {
      this.enterZone(closestPortal.targetZone, closestPortal.targetSpawnTag);
    }
  }

  private faceNearestEnemy(maxRange: number): EnemyEntity | null {
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
    const dashSkill = classDef.skills.dash;
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
      this.vfx.spawnDashAfterimage(this.playerPos, dashSkill.colorHex);
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

  private executeBasicCombo(): void {
    const char = this.activeCharacter!;
    const stats = this.effectiveStats!;
    const classDef = CHARACTER_CLASSES[char.classId];
    const basic = classDef.skills.basic;
    const skillLevelBonus = 1 + (char.skillLevels.basic - 1) * 0.1;

    this.faceNearestEnemy(basic.range + 2.0);
    this.comboStep = (this.comboStep % 3) + 1;
    this.comboResetTimer = 1.4;

    const cd = basic.cooldown / stats.attackSpeed;
    const forward = new THREE.Vector3(Math.sin(this.playerYaw), 0, Math.cos(this.playerYaw));

    if (char.classId === 'warrior') {
      // SPEAR WARRIOR CADENCE:
      // Steps 1 & 2: Long-reach linear piercing spear thrusts
      // Step 3: Slower, heavy 360° Dragon-Halberd Cyclone Slam
      this.cooldowns.basic = this.comboStep === 3 ? cd * 1.35 : cd;
      this.activeAttackDuration = this.comboStep === 3 ? 0.36 : 0.26;
      this.activeAttackTimer = this.activeAttackDuration;
      this.animState.attackComboStep = this.comboStep;
      this.animState.attackSwingProgress = 0;

      this.playerPos.addScaledVector(forward, this.comboStep === 3 ? 0.65 : 0.45);
      this.clampPlayerToZone();

      if (this.comboStep === 1 || this.comboStep === 2) {
        const thrustMult = (this.comboStep === 1 ? 1.05 : 1.25) * skillLevelBonus;
        this.vfx.spawnSpearThrustBeam(
          this.playerPos,
          this.playerYaw,
          basic.range,
          basic.colorHex,
          basic.accentHex
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
        this.vfx.spawnSlashArc(
          this.playerPos,
          this.playerYaw,
          basic.aoeRadius,
          basic.colorHex,
          basic.accentHex,
          0
        );
        this.vfx.spawnShockwaveRing(
          this.playerPos,
          basic.aoeRadius,
          basic.colorHex,
          basic.accentHex,
          0.34
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
      this.cooldowns.basic = this.comboStep === 3 ? cd * 1.2 : cd;
      this.activeAttackDuration = 0.28;
      this.activeAttackTimer = this.activeAttackDuration;
      this.animState.attackComboStep = this.comboStep;
      this.animState.attackSwingProgress = 0;

      if (this.comboStep === 1) {
        this.spawnProjectile({
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
      } else if (this.comboStep === 2) {
        for (const angleOffset of [-0.18, 0.18]) {
          this.spawnProjectile({
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
        // Step 3: Large Nova Comet that explodes in a wide AoE splash!
        this.vfx.spawnShockwaveRing(this.playerPos, 1.4, basic.colorHex, basic.accentHex, 0.2);
        this.spawnProjectile({
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
      this.cooldowns.basic = this.comboStep === 3 ? cd * 1.15 : cd;
      this.activeAttackDuration = 0.18;
      this.activeAttackTimer = this.activeAttackDuration;
      this.animState.attackComboStep = this.comboStep;
      this.animState.attackSwingProgress = 0;

      if (this.comboStep === 1) {
        // Rapid Twin Kunai throw
        for (const side of [-0.07, 0.07]) {
          this.spawnProjectile({
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
      } else if (this.comboStep === 2) {
        // 3-Kunai Fan Spread
        for (const spread of [-0.24, 0, 0.24]) {
          this.spawnProjectile({
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
        // Step 3: Piercing Spinning Shadow Chakram + Kiting Backflip!
        this.vfx.spawnDashAfterimage(this.playerPos, basic.accentHex);
        this.playerPos.addScaledVector(forward, -1.35);
        this.clampPlayerToZone();

        this.spawnProjectile({
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
    const stats = this.effectiveStats!;
    const classDef = CHARACTER_CLASSES[char.classId];
    const skill = classDef.skills[skillKey];
    const lvlKey = skillKey === 'ultimate' ? 'ultimate' : skillKey;
    const skillLevelBonus = 1 + (char.skillLevels[lvlKey] - 1) * 0.12;

    const nearest = this.faceNearestEnemy(skill.range + 4.0);
    const forward = new THREE.Vector3(Math.sin(this.playerYaw), 0, Math.cos(this.playerYaw));

    this.cooldowns[skillKey] = skill.cooldown;
    this.activeAttackDuration = skillKey === 'ultimate' ? 0.5 : 0.35;
    this.activeAttackTimer = this.activeAttackDuration;
    this.animState.attackComboStep = skillKey === 'ultimate' ? 5 : 4;
    this.animState.attackSwingProgress = 0;

    if (skillKey === 'ultimate') {
      char.ultimateEnergy = 0;
      this.cameraController.triggerUltimateZoom();
      this.cameraController.triggerShake(0.65, 0.45);
      this.callbacks.onUltimateCutIn(classDef.name, skill.name, classDef.elementColor);
      this.vfx.spawnUltimateBurst(this.playerPos, skill.aoeRadius, skill.colorHex, skill.accentHex);

      if (char.classId === 'warrior') {
        const heal = Math.round(stats.maxHp * 0.25);
        char.currentHp = Math.min(stats.maxHp, char.currentHp + heal);
        this.vfx.spawnDamageNumber(this.playerPos, heal, false, '#64dfdf', `+${heal} HP`);
      } else if (char.classId === 'assassin') {
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
        this.playerPos.addScaledVector(forward, 0.85);
        this.clampPlayerToZone();
        this.vfx.spawnSpearThrustBeam(
          this.playerPos,
          this.playerYaw,
          skill.range,
          skill.colorHex,
          skill.accentHex
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
        const heal = Math.round(stats.maxHp * 0.12);
        char.currentHp = Math.min(stats.maxHp, char.currentHp + heal);
        this.vfx.spawnDamageNumber(this.playerPos, heal, false, '#64dfdf', `+${heal} HP`);
        this.vfx.spawnShockwaveRing(
          this.playerPos,
          skill.aoeRadius,
          skill.colorHex,
          skill.accentHex,
          0.5
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
              this.vfx.spawnShockwaveRing(
                impactPos,
                skill.aoeRadius,
                skill.colorHex,
                skill.accentHex,
                0.4
              );
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
        const count = 7;
        for (let i = 0; i < count; i++) {
          const frac = i / (count - 1) - 0.5; // -0.5 .. +0.5
          const angle = this.playerYaw + frac * 1.15;
          this.spawnProjectile({
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
        // Deathmark Shuriken Traps: Deploys 3 spinning ground shuriken traps!
        for (const angleOffset of [-0.45, 0, 0.45]) {
          const dir = new THREE.Vector3(
            Math.sin(this.playerYaw + angleOffset),
            0,
            Math.cos(this.playerYaw + angleOffset)
          );
          const trapPos = this.playerPos.clone().addScaledVector(dir, 3.4);
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
    shape: 'orb' | 'comet' | 'kunai' | 'chakram';
  }): void {
    const group = new THREE.Group();
    const startPos = this.playerPos
      .clone()
      .add(new THREE.Vector3(Math.sin(opts.yaw) * 0.65, 0.95, Math.cos(opts.yaw) * 0.65));
    group.position.copy(startPos);
    group.rotation.y = opts.yaw;

    const coreMat = new THREE.MeshBasicMaterial({ color: opts.accentHex });
    const glowMat = new THREE.MeshBasicMaterial({
      color: opts.colorHex,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });

    if (opts.shape === 'kunai') {
      const bladeGeo = new THREE.ConeGeometry(0.14, 0.78, 4);
      bladeGeo.rotateX(Math.PI / 2);
      const blade = new THREE.Mesh(bladeGeo, coreMat);
      const trailGeo = new THREE.ConeGeometry(0.22, 1.1, 4);
      trailGeo.rotateX(-Math.PI / 2);
      trailGeo.translate(0, 0, -0.45);
      const trail = new THREE.Mesh(trailGeo, glowMat);
      group.add(blade, trail);
    } else if (opts.shape === 'chakram') {
      const ringGeo = new THREE.TorusGeometry(0.62, 0.08, 8, 24);
      ringGeo.rotateX(Math.PI / 2);
      const ring = new THREE.Mesh(ringGeo, coreMat);
      const crossGeo = new THREE.BoxGeometry(1.15, 0.04, 0.14);
      const cross1 = new THREE.Mesh(crossGeo, glowMat);
      const cross2 = new THREE.Mesh(crossGeo, glowMat);
      cross2.rotation.y = Math.PI / 2;
      group.add(ring, cross1, cross2);
    } else {
      const r = opts.shape === 'comet' ? 0.38 : 0.22;
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(r, 1), coreMat);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(r * 1.55, 12, 12), glowMat);
      group.add(core, halo);
    }

    this.scene.add(group);

    this.projectiles.push({
      id: `proj_${Date.now()}_${Math.random()}`,
      mesh: group,
      position: group.position,
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
      spinSpeed: opts.shape === 'chakram' ? 18 : opts.shape === 'kunai' ? 0 : 8,
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
      if (p.spinSpeed !== 0) {
        p.mesh.rotation.y += p.spinSpeed * dt;
      }

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
            this.vfx.spawnShockwaveRing(
              new THREE.Vector3(p.position.x, 0, p.position.z),
              p.explodeRadius,
              p.colorHex,
              p.accentHex,
              0.28
            );
            this.dealAreaDamage(
              new THREE.Vector3(p.position.x, 0, p.position.z),
              p.explodeRadius,
              p.damageMultiplier,
              p.energyGain,
              p.colorCss,
              2.8
            );
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
        if (p.explodeRadius >= 2.8 && p.hitEnemyIds.size === 0) {
          // Detonate Nova Comet at end of range even if it didn't direct-hit
          const groundPos = new THREE.Vector3(p.position.x, 0, p.position.z);
          this.vfx.spawnShockwaveRing(
            groundPos,
            p.explodeRadius,
            p.colorHex,
            p.accentHex,
            0.32
          );
          this.dealAreaDamage(
            groundPos,
            p.explodeRadius,
            p.damageMultiplier,
            p.energyGain,
            p.colorCss,
            3.5
          );
        }
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }
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
    const group = new THREE.Group();
    group.position.set(opts.position.x, 0.06, opts.position.z);

    const outerGeo = new THREE.RingGeometry(opts.radius * 0.75, opts.radius, 32);
    outerGeo.rotateX(-Math.PI / 2);
    const outerMat = new THREE.MeshBasicMaterial({
      color: opts.colorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
    });
    group.add(new THREE.Mesh(outerGeo, outerMat));

    if (opts.visualStyle === 'vortex') {
      const coreGeo = new THREE.SphereGeometry(0.65, 16, 16);
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0x10002b,
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.y = 0.55;
      group.add(core);
    } else {
      // Spinning 4-blade Shuriken Trap
      const bladeMat = new THREE.MeshBasicMaterial({ color: opts.accentHex });
      const b1 = new THREE.Mesh(
        new THREE.BoxGeometry(opts.radius * 1.4, 0.06, 0.24),
        bladeMat
      );
      const b2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.06, opts.radius * 1.4),
        bladeMat
      );
      group.add(b1, b2);
    }

    this.scene.add(group);
    this.groundHazards.push({
      id: `haz_${Date.now()}_${Math.random()}`,
      mesh: group,
      position: new THREE.Vector3(opts.position.x, 0, opts.position.z),
      radius: opts.radius,
      damageMultiplier: opts.damageMultiplier,
      energyGain: opts.energyGain,
      colorHex: opts.colorHex,
      accentHex: opts.accentHex,
      colorCss: opts.colorCss,
      age: 0,
      duration: opts.duration,
      tickInterval: opts.tickInterval,
      tickTimer: 0.05,
      pullInward: opts.pullInward,
    });
  }

  private updateGroundHazards(dt: number): void {
    for (let i = this.groundHazards.length - 1; i >= 0; i--) {
      const h = this.groundHazards[i];
      h.age += dt;
      h.tickTimer -= dt;
      h.mesh.rotation.y += dt * 9.5;

      if (h.tickTimer <= 0) {
        h.tickTimer = h.tickInterval;
        this.vfx.spawnShockwaveRing(h.position, h.radius, h.colorHex, h.accentHex, 0.25);
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

      if (h.age >= h.duration) {
        this.scene.remove(h.mesh);
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
    const char = this.activeCharacter!;
    const stats = this.effectiveStats!;

    const isCrit = Math.random() < stats.critRate;
    const variance = 0.92 + Math.random() * 0.16;
    const rawDmg = stats.attack * multiplier * variance * (isCrit ? stats.critDamage : 1);
    const dmg = Math.max(1, Math.round(rawDmg));

    enemy.hp = Math.max(0, enemy.hp - dmg);
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

    this.vfx.spawnDamageNumber(enemy.bundle.root.position, dmg, isCrit, colorCss);
    this.hitComboCount += 1;
    this.hitComboDecayTimer = 3.5;

    if (energyGain > 0) {
      char.ultimateEnergy = Math.min(100, char.ultimateEnergy + energyGain);
    }

    if (enemy.hp <= 0) {
      this.handleEnemyDefeated(enemy, enemyIndex);
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

    this.vfx.spawnShockwaveRing(pos, 1.8, 0xffbe0b, 0xffffff, 0.3);
    this.scene.remove(enemy.bundle.root);
    this.enemies.splice(index, 1);

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

    // Check Quest Progress if in Stomping Grounds
    if (this.currentZone === 'stomping_grounds') {
      const quest = normalizeQuestState(char.questState);
      char.questState = quest;
      const qUpdate = QuestEngine.onStompingGroundsEnemyCountChanged(
        quest,
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

    this.checkAndApplyLevelUps();
  }

  private checkAndApplyLevelUps(): void {
    const char = this.activeCharacter!;
    while (char.xp >= char.xpToNextLevel) {
      char.xp -= char.xpToNextLevel;
      char.level += 1;
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

  private updateLootOrbs(dt: number): void {
    const char = this.activeCharacter!;
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
        char.gold += orb.gold;
        if (orb.item) {
          if (char.inventory.length >= 24) {
            char.inventory.shift();
          }
          char.inventory.push(orb.item);
          this.callbacks.onLootObtained(orb.item);
          this.vfx.spawnDamageNumber(
            this.playerPos,
            0,
            true,
            '#4cc9f0',
            `${orb.item.icon} ${orb.item.name}`
          );
          void this.saveActiveCharacterNow();
        } else {
          this.vfx.spawnDamageNumber(
            this.playerPos,
            orb.gold,
            false,
            '#ffd166',
            `+${orb.gold}G`
          );
        }

        this.scene.remove(orb.mesh);
        this.lootOrbs.splice(i, 1);
      }
    }
  }

  private updateEnemies(dt: number): void {
    const char = this.activeCharacter!;
    const stats = this.effectiveStats!;

    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      const pos = enemy.bundle.root.position;

      // Apply knockback decay
      if (enemy.knockbackVel.lengthSq() > 0.05) {
        pos.addScaledVector(enemy.knockbackVel, dt);
        enemy.knockbackVel.multiplyScalar(Math.pow(0.04, dt));
      }

      const toPlayer = this.playerPos.clone().sub(pos);
      toPlayer.y = 0;
      const dist = toPlayer.length();

      // Enemies along the Stomping Grounds path aggro when player approaches within 16.5m
      if (dist <= 16.5 && dist > 0.01) {
        const dir = toPlayer.clone().normalize();
        enemy.bundle.bodyMesh.rotation.y = Math.atan2(dir.x, dir.z);

        const stopRange = enemy.radius + 0.78;
        if (dist > stopRange) {
          pos.addScaledVector(dir, enemy.speed * dt);
        } else {
          enemy.attackCooldown -= dt;
          if (enemy.attackCooldown <= 0) {
            enemy.attackCooldown = 1.35;
            if (this.invulnerableTimer <= 0) {
              const mitigated = Math.max(
                1,
                Math.round(enemy.attack * (100 / (100 + stats.defense)))
              );
              char.currentHp = Math.max(0, char.currentHp - mitigated);
              this.animState.hitFlashTimer = 0.18;
              this.vfx.spawnDamageNumber(
                this.playerPos,
                mitigated,
                false,
                '#ff4d6d',
                `-${mitigated}`
              );
              this.cameraController.triggerShake(0.22, 0.15);

              if (char.currentHp <= 0) {
                char.currentHp = stats.maxHp;
                this.enterZone('starting_town');
                this.callbacks.onBannerNotification(
                  'RETURNED TO STARTING TOWN',
                  'Outpost healers restored your vitality!'
                );
                return;
              }
            }
          }
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
          other.bundle.root.position.sub(push);
        }
      }

      // Clamp enemy to the procedural Stomping Grounds path
      if (this.currentZone === 'stomping_grounds' && this.currentPathLayout) {
        const clamped = clampToProceduralPath(pos.x, pos.z, this.currentPathLayout, 0.65);
        pos.x = clamped.x;
        pos.z = clamped.z;
      }

      // Enemy idle bounce / float animation
      if (enemy.kind === 'slime') {
        const squash = 1 + Math.sin(performance.now() * 0.008 + i) * 0.1;
        enemy.bundle.bodyMesh.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
      } else {
        enemy.bundle.bodyMesh.position.y =
          1.05 + Math.sin(performance.now() * 0.005 + i) * 0.12;
      }

      if (enemy.hitFlashTimer > 0) {
        enemy.hitFlashTimer -= dt;
        enemy.bundle.mainMaterial.emissive.setHex(0xffffff);
        enemy.bundle.mainMaterial.emissiveIntensity = 0.95;
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
      zoneTitle = `STOMPING GROUNDS (${pct}%)`;
      zoneSubtitle = `${this.enemies.length} Fiends Left • Path Seed #${(this.currentPathLayout?.seed ?? 0) % 1000}`;
    } else if (this.currentZone === 'market_crossing') {
      zoneTitle = 'MARKET CROSSING';
      zoneSubtitle = 'Safe Zone • Starlight Bazaar';
    }

    const quest = normalizeQuestState(char.questState);
    char.questState = quest;
    const questView = QuestEngine.getObjectiveView(
      quest,
      this.currentZone,
      this.nearbyNpc?.id ?? null
    );

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

    this.callbacks.onHudUpdate({
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
      isSafeZone: this.currentZone !== 'stomping_grounds',
      pathProgress: this.currentPathProgress,
      pathSeed: this.currentPathLayout?.seed ?? null,
      nearbyPortal: this.nearbyPortal,
      nearbyNpc: contextualNpc,
      questView,
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
      lastSavedText: secsAgo <= 1 ? 'Saved just now' : `Saved ${secsAgo}s ago`,
    });
  }

  private onResize = (): void => {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.cameraController.updateAspect();
  };
}
