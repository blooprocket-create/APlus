import * as THREE from 'three';
import { CHARACTER_CLASSES, computeEffectiveStats } from '../data/classes';
import { ActionId, InputManager } from '../input/InputManager';
import { PersistenceManager, xpRequiredForLevel } from '../persistence/PersistenceManager';
import { attachAnimeOutline, createAnimeToonMaterial } from '../rendering/AnimeMaterials';
import { CharacterAnimationState, CharacterRig } from '../rendering/CharacterMeshBuilder';
import { buildEnemyMesh, EnemyKind, EnemyMeshBundle } from '../rendering/EnemyMeshBuilder';
import { ARENA_RADIUS, EnvironmentBuilder } from '../rendering/EnvironmentBuilder';
import { IsometricCameraController } from '../rendering/IsometricCamera';
import { VfxSystem } from '../rendering/VfxSystem';
import {
  CharacterClassId,
  CharacterSaveData,
  CharacterStats,
  InventoryItem,
} from '../types/game';
import { generateLootItem } from './LootSystem';

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
  private lootOrbs: LootOrbEntity[] = [];
  private waveTransitionTimer = 0;
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
    this.environment.buildArena(this.scene);

    this.vfx = new VfxSystem(this.scene, damageLayer);
    this.input = new InputManager();

    this.buildPreviewPedestal();

    window.addEventListener('resize', this.onResize);
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
    this.effectiveStats = computeEffectiveStats(this.activeCharacter);
    this.activeCharacter.currentHp = Math.min(
      this.effectiveStats.maxHp,
      Math.max(1, this.activeCharacter.currentHp || this.effectiveStats.maxHp)
    );

    this.playerRig = new CharacterRig(this.activeCharacter.classId);
    this.playerPos.set(
      this.activeCharacter.position.x || 0,
      0,
      this.activeCharacter.position.z || 0
    );
    // Clamp inside arena
    if (this.playerPos.length() > ARENA_RADIUS - 3) {
      this.playerPos.set(0, 0, 0);
    }
    this.playerRig.root.position.copy(this.playerPos);
    this.scene.add(this.playerRig.root);

    this.cooldowns = { basic: 0, dash: 0, skill1: 0, skill2: 0, ultimate: 0 };
    this.hitComboCount = 0;
    this.autoSaveTimer = 0;

    this.spawnWave(this.activeCharacter.currentWave);
    this.emitHudTelemetry();
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

  private clearGameplayEntities(): void {
    if (this.playerRig) {
      this.scene.remove(this.playerRig.root);
      this.playerRig = null;
    }
    for (const enemy of this.enemies) {
      this.scene.remove(enemy.bundle.root);
    }
    this.enemies = [];
    for (const orb of this.lootOrbs) {
      this.scene.remove(orb.mesh);
    }
    this.lootOrbs = [];
    this.vfx.clearAll();
  }

  private spawnWave(waveNumber: number): void {
    for (const e of this.enemies) {
      this.scene.remove(e.bundle.root);
    }
    this.enemies = [];

    const isBossWave = waveNumber % 3 === 0;
    const baseCount = Math.min(10, 4 + Math.floor(waveNumber * 1.2));
    const scale = 1 + (waveNumber - 1) * 0.22;

    for (let i = 0; i < baseCount; i++) {
      const kind: EnemyKind = i % 3 === 0 ? 'sentinel' : 'slime';
      this.spawnEnemyInstance(kind, scale, i, baseCount);
    }

    if (isBossWave) {
      this.spawnEnemyInstance('boss_knight', scale * 1.35, 0, 1, true);
      this.callbacks.onBannerNotification(
        `WAVE ${waveNumber} // ABYSSAL BOSS`,
        'An Abyssal Dread-Knight has entered the Astral Sanctuary!'
      );
    } else {
      this.callbacks.onBannerNotification(
        `WAVE ${waveNumber}`,
        `Purge ${baseCount} Rift Fiends from the Sanctuary`
      );
    }
  }

  private spawnEnemyInstance(
    kind: EnemyKind,
    scale: number,
    index: number,
    total: number,
    isBoss = false
  ): void {
    const bundle = buildEnemyMesh(kind);
    const angle = (index / Math.max(1, total)) * Math.PI * 2 + Math.random() * 0.4;
    const dist = isBoss ? 11 : 8 + Math.random() * 7;

    const spawnX = THREE.MathUtils.clamp(
      this.playerPos.x + Math.cos(angle) * dist,
      -(ARENA_RADIUS - 2.5),
      ARENA_RADIUS - 2.5
    );
    const spawnZ = THREE.MathUtils.clamp(
      this.playerPos.z + Math.sin(angle) * dist,
      -(ARENA_RADIUS - 2.5),
      ARENA_RADIUS - 2.5
    );

    bundle.root.position.set(spawnX, 0, spawnZ);
    this.scene.add(bundle.root);

    const baseHp = kind === 'boss_knight' ? 680 : kind === 'sentinel' ? 210 : 135;
    const baseAtk = kind === 'boss_knight' ? 38 : kind === 'sentinel' ? 22 : 15;
    const speed = kind === 'boss_knight' ? 3.2 : kind === 'sentinel' ? 3.8 : 4.3;

    this.enemies.push({
      id: `enemy_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      kind,
      name:
        kind === 'boss_knight'
          ? 'Abyssal Dread-Knight'
          : kind === 'sentinel'
            ? 'Void Sentinel'
            : 'Aether Slime',
      maxHp: Math.round(baseHp * scale),
      hp: Math.round(baseHp * scale),
      attack: Math.round(baseAtk * scale),
      speed,
      radius: kind === 'boss_knight' ? 1.15 : 0.7,
      xpReward: Math.round((kind === 'boss_knight' ? 120 : kind === 'sentinel' ? 38 : 24) * scale),
      goldReward: Math.round((kind === 'boss_knight' ? 95 : kind === 'sentinel' ? 26 : 14) * scale),
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
      this.clampPlayerToArena();
      this.animState.isDashing = true;
    } else {
      this.animState.isDashing = false;

      // Normal isometric movement
      const speed = this.activeAttackTimer > 0 ? stats.moveSpeed * 0.45 : stats.moveSpeed;
      if (move.lengthSq() > 0.01) {
        this.playerPos.x += move.x * speed * dt;
        this.playerPos.z += move.y * speed * dt;
        this.clampPlayerToArena();
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

    // Update Enemies & Loot
    this.updateEnemies(dt);
    this.updateLootOrbs(dt);

    // Check Wave Clear
    if (this.enemies.length === 0) {
      this.waveTransitionTimer += dt;
      if (this.waveTransitionTimer >= 1.5) {
        this.waveTransitionTimer = 0;
        char.currentWave += 1;
        char.highestWave = Math.max(char.highestWave, char.currentWave);
        // Heal 25% HP between waves
        char.currentHp = Math.min(stats.maxHp, Math.round(char.currentHp + stats.maxHp * 0.25));
        void this.saveActiveCharacterNow();
        this.spawnWave(char.currentWave);
      }
    }

    this.cameraController.updateIsometricFollow(dt, this.playerPos, move);
    this.emitHudTelemetry();
  }

  private clampPlayerToArena(): void {
    const maxR = ARENA_RADIUS - 1.3;
    const len = Math.hypot(this.playerPos.x, this.playerPos.z);
    if (len > maxR) {
      const scale = maxR / len;
      this.playerPos.x *= scale;
      this.playerPos.z *= scale;
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
    this.dashTimer = 0.22;
    this.invulnerableTimer = 0.35;

    if (this.input.moveVector.lengthSq() > 0.05) {
      this.dashDirection.set(this.input.moveVector.x, 0, this.input.moveVector.y).normalize();
      this.playerYaw = Math.atan2(this.dashDirection.x, this.dashDirection.z);
    } else {
      this.dashDirection.set(Math.sin(this.playerYaw), 0, Math.cos(this.playerYaw)).normalize();
    }

    this.vfx.spawnDashAfterimage(this.playerPos, dashSkill.colorHex);
    this.vfx.spawnShockwaveRing(this.playerPos, 1.8, dashSkill.colorHex, dashSkill.accentHex, 0.25);
    this.dealAreaDamage(
      this.playerPos,
      dashSkill.aoeRadius,
      dashSkill.damageMultiplier,
      dashSkill.energyGain,
      classDef.elementColor,
      2.5
    );
  }

  private executeBasicCombo(): void {
    const char = this.activeCharacter!;
    const stats = this.effectiveStats!;
    const classDef = CHARACTER_CLASSES[char.classId];
    const basic = classDef.skills.basic;

    this.faceNearestEnemy(basic.range + 2.5);

    this.comboStep = (this.comboStep % 3) + 1;
    this.comboResetTimer = 1.25;

    const stepMultiplier =
      this.comboStep === 1 ? 1.0 : this.comboStep === 2 ? 1.2 : 1.55;
    const cd = basic.cooldown / stats.attackSpeed;
    this.cooldowns.basic = this.comboStep === 3 ? cd * 1.25 : cd;

    this.activeAttackDuration = 0.24;
    this.activeAttackTimer = this.activeAttackDuration;
    this.animState.attackComboStep = this.comboStep;
    this.animState.attackSwingProgress = 0;

    // Slight forward step during melee combo
    const forward = new THREE.Vector3(Math.sin(this.playerYaw), 0, Math.cos(this.playerYaw));
    this.playerPos.addScaledVector(forward, 0.35);
    this.clampPlayerToArena();

    const hitCenter = this.playerPos
      .clone()
      .addScaledVector(forward, basic.range * 0.48);

    const tilt = this.comboStep === 1 ? 0.15 : this.comboStep === 2 ? -0.25 : 0;
    this.vfx.spawnSlashArc(
      this.playerPos,
      this.playerYaw,
      basic.aoeRadius + (this.comboStep === 3 ? 0.8 : 0),
      basic.colorHex,
      basic.accentHex,
      tilt
    );

    if (this.comboStep === 3) {
      this.vfx.spawnShockwaveRing(
        hitCenter,
        basic.aoeRadius * 1.15,
        basic.colorHex,
        basic.accentHex,
        0.3
      );
    }

    const skillLevelBonus = 1 + (char.skillLevels.basic - 1) * 0.1;
    this.dealAreaDamage(
      hitCenter,
      basic.aoeRadius,
      basic.damageMultiplier * stepMultiplier * skillLevelBonus,
      basic.energyGain,
      classDef.elementColor,
      this.comboStep === 3 ? 4.5 : 2.2
    );
  }

  private executeSkill(skillKey: 'skill1' | 'skill2' | 'ultimate'): void {
    const char = this.activeCharacter!;
    const stats = this.effectiveStats!;
    const classDef = CHARACTER_CLASSES[char.classId];
    const skill = classDef.skills[skillKey];

    this.faceNearestEnemy(skill.range + 3.0);

    this.cooldowns[skillKey] = skill.cooldown;
    if (skillKey === 'ultimate') {
      char.ultimateEnergy = 0;
      this.cameraController.triggerUltimateZoom();
      this.cameraController.triggerShake(0.65, 0.45);
      this.callbacks.onUltimateCutIn(classDef.name, skill.name, classDef.elementColor);
      this.vfx.spawnUltimateBurst(this.playerPos, skill.aoeRadius, skill.colorHex, skill.accentHex);

      if (char.classId === 'valkyrie') {
        const heal = Math.round(stats.maxHp * 0.25);
        char.currentHp = Math.min(stats.maxHp, char.currentHp + heal);
        this.vfx.spawnDamageNumber(this.playerPos, heal, false, '#64dfdf', `+${heal} HP`);
      }
    } else {
      this.cameraController.triggerShake(0.32, 0.22);
      this.vfx.spawnShockwaveRing(
        this.playerPos,
        skill.aoeRadius,
        skill.colorHex,
        skill.accentHex,
        0.45
      );
      this.vfx.spawnSlashArc(
        this.playerPos,
        this.playerYaw,
        skill.aoeRadius * 0.9,
        skill.colorHex,
        skill.accentHex,
        0
      );

      if (char.classId === 'valkyrie' && skillKey === 'skill1') {
        const heal = Math.round(stats.maxHp * 0.08);
        char.currentHp = Math.min(stats.maxHp, char.currentHp + heal);
        this.vfx.spawnDamageNumber(this.playerPos, heal, false, '#64dfdf', `+${heal} HP`);
      }
    }

    this.activeAttackDuration = skillKey === 'ultimate' ? 0.5 : 0.35;
    this.activeAttackTimer = this.activeAttackDuration;
    this.animState.attackComboStep = skillKey === 'ultimate' ? 5 : 4;
    this.animState.attackSwingProgress = 0;

    const lvlKey = skillKey === 'ultimate' ? 'ultimate' : skillKey;
    const skillLevelBonus = 1 + (char.skillLevels[lvlKey] - 1) * 0.12;

    this.dealAreaDamage(
      this.playerPos,
      skill.aoeRadius,
      skill.damageMultiplier * skillLevelBonus,
      skill.energyGain,
      classDef.elementColor,
      skillKey === 'ultimate' ? 9.0 : 5.5,
      char.classId === 'astral_weaver' && skillKey === 'skill1' // Gravity Singularity pulls inward!
    );
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
    const stats = this.effectiveStats!;
    let hitAny = false;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const dist = center.distanceTo(enemy.bundle.root.position);
      if (dist <= radius + enemy.radius) {
        hitAny = true;
        const isCrit = Math.random() < stats.critRate;
        const variance = 0.92 + Math.random() * 0.16;
        const rawDmg = stats.attack * multiplier * variance * (isCrit ? stats.critDamage : 1);
        const dmg = Math.max(1, Math.round(rawDmg));

        enemy.hp = Math.max(0, enemy.hp - dmg);
        enemy.hitFlashTimer = 0.14;

        // Knockback or Gravity Pull
        const dir = enemy.bundle.root.position.clone().sub(this.playerPos);
        dir.y = 0;
        if (dir.lengthSq() > 0.001) {
          dir.normalize();
          if (pullInward) {
            enemy.knockbackVel.copy(dir.multiplyScalar(-knockbackStrength * 1.3));
          } else {
            enemy.knockbackVel.copy(dir.multiplyScalar(knockbackStrength));
          }
        }

        this.vfx.spawnDamageNumber(enemy.bundle.root.position, dmg, isCrit, colorCss);

        this.hitComboCount += 1;
        this.hitComboDecayTimer = 3.5;

        if (enemy.hp <= 0) {
          this.handleEnemyDefeated(enemy, i);
        }
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

    // Spawn loot orb (gold + chance of equipment item on bosses or lucky roll)
    const shouldDropItem =
      enemy.kind === 'boss_knight' || Math.random() < 0.22;
    const droppedItem = shouldDropItem
      ? generateLootItem(
          char.classId,
          char.currentWave,
          enemy.kind === 'boss_knight' ? 'epic' : undefined
        )
      : null;

    this.spawnLootOrb(pos, enemy.goldReward, droppedItem);

    // Check Level Up
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
        // Magnetize toward player
        const pullDir = this.playerPos.clone().sub(orb.position).normalize();
        orb.position.addScaledVector(pullDir, 11.5 * dt);
      }

      if (dist < 0.95) {
        char.gold += orb.gold;
        if (orb.item) {
          // Keep inventory tidy (cap at 24 items)
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

      // Move toward player
      const toPlayer = this.playerPos.clone().sub(pos);
      toPlayer.y = 0;
      const dist = toPlayer.length();

      if (dist > 0.01) {
        const dir = toPlayer.clone().normalize();
        enemy.bundle.bodyMesh.rotation.y = Math.atan2(dir.x, dir.z);

        const stopRange = enemy.radius + 0.78;
        if (dist > stopRange) {
          pos.addScaledVector(dir, enemy.speed * dt);
        } else {
          // Enemy attacks player when in range
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
                // Sanctuary Second Wind revive so single-player flow stays smooth
                char.currentHp = stats.maxHp;
                this.vfx.spawnShockwaveRing(this.playerPos, 5.0, 0x4cc9f0, 0xffffff, 0.5);
                this.callbacks.onBannerNotification(
                  'ASTRAL REVIVAL',
                  'Aether Resonance restored your vitality!'
                );
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

      // Clamp enemy inside arena
      const rLen = Math.hypot(pos.x, pos.z);
      if (rLen > ARENA_RADIUS - 1.5) {
        const s = (ARENA_RADIUS - 1.5) / rLen;
        pos.x *= s;
        pos.z *= s;
      }

      // Enemy idle bounce / float animation
      if (enemy.kind === 'slime') {
        const squash = 1 + Math.sin(performance.now() * 0.008 + i) * 0.1;
        enemy.bundle.bodyMesh.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
      } else {
        enemy.bundle.bodyMesh.position.y =
          1.05 + Math.sin(performance.now() * 0.005 + i) * 0.12;
      }

      // Hit flash
      if (enemy.hitFlashTimer > 0) {
        enemy.hitFlashTimer -= dt;
        enemy.bundle.mainMaterial.emissive.setHex(0xffffff);
        enemy.bundle.mainMaterial.emissiveIntensity = 0.95;
      } else {
        enemy.bundle.mainMaterial.emissive.setHex(enemy.bundle.baseEmissiveHex);
        enemy.bundle.mainMaterial.emissiveIntensity = 0.4;
      }

      // Update floating HP Bar & billboard toward camera
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

    this.callbacks.onHudUpdate({
      hp: char.currentHp,
      maxHp: this.effectiveStats.maxHp,
      xp: char.xp,
      xpToNextLevel: char.xpToNextLevel,
      level: char.level,
      gold: char.gold,
      aetherCrystals: char.aetherCrystals,
      ultimateEnergy: char.ultimateEnergy,
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
