import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { getAttackPattern, isInsideAttack, isSafeZone, resolveFlask } from '../src/game/CombatRules';
import { EnemyEntity, GameEngine, GameEngineCallbacks, HudTelemetry } from '../src/game/GameEngine';
import { PersistenceManager } from '../src/persistence/PersistenceManager';
import { InMemoryStorageAdapter } from '../src/persistence/StorageAdapter';
import { CharacterSaveData } from '../src/types/game';

// Keep the real world, input, combat, loot, and persistence logic. Stub only browser rendering.
vi.mock('three', async importOriginal => {
  const actual = await importOriginal<typeof import('three')>();
  return { ...actual, WebGLRenderer: class {
    shadowMap = { enabled: false, type: 0 };
    setPixelRatio() {} setSize() {} render() {}
  } };
});
vi.mock('../src/rendering/EnvironmentBuilder', () => ({
  SAFE_ZONE_RADIUS: 18.5,
  EnvironmentBuilder: class {
    buildPreviewScene() {}
    buildChronicle() { return { portals: [], npcs: [] }; }
    buildZone() { return { portals: [], npcs: [] }; }
    update() {}
  },
}));
vi.mock('../src/rendering/VfxSystem', () => ({ VfxSystem: class {
  clearAll() {} update() {} spawnDamageNumber() {} spawnDashAfterimage() {}
  spawnFallingMeteor() {} spawnShockwaveRing() {} spawnSlashArc() {}
  spawnSpearThrustBeam() {} spawnUltimateBurst() {}
} }));

interface EngineState {
  activeCharacter: CharacterSaveData;
  enemies: EnemyEntity[];
  companions: unknown[];
  playerPos: THREE.Vector3;
  nearbyPortal: { targetZone: string; targetSpawnTag: string } | null;
  currentZone: string;
  cooldowns: Record<string, number>;
  lootOrbs: Array<{ gold: number }>;
  invulnerableTimer: number;
  flaskCharges: number;
  expedition: { total: number };
  updateGameplay(dt: number): void;
  updateEnemies(dt: number): void;
  chronicleSites: Array<{ id: string; kind: string; position: { x: number; z: number } }>;
  spawnEnemyAtPosition(kind: 'boss_knight', x: number, z: number, scale: number): void;
  applySingleEnemyHit(enemy: EnemyEntity, index: number, multiplier: number, energy: number, color: string, knockback: number): void;
  handleEnemyDefeated(enemy: EnemyEntity, index: number): void;
}

describe('combat rules', () => {
  it('regenerates only in the two sanctuaries', () => {
    expect(isSafeZone('starting_town')).toBe(true);
    expect(isSafeZone('market_crossing')).toBe(true);
    for (const zone of ['stomping_grounds', 'sunken_ruins', 'abyssal_sanctum'] as const) expect(isSafeZone(zone)).toBe(false);
  });
  it('heals 40%, clamps overhealing, and never spends an unusable flask', () => {
    expect(resolveFlask(100, 500, 3)).toEqual({ hp: 300, charges: 2, healed: 200 });
    expect(resolveFlask(450, 500, 1)).toEqual({ hp: 500, charges: 0, healed: 50 });
    expect(resolveFlask(500, 500, 3).charges).toBe(3);
    expect(resolveFlask(100, 500, 0).hp).toBe(100);
    expect(resolveFlask(0, 500, 3).healed).toBe(0);
  });
  it('lets movement escape the position locked at attack start', () => {
    const target = { x: 4, z: -8 };
    expect(isInsideAttack({ x: 4, z: -8 }, target, 1.4)).toBe(true);
    expect(isInsideAttack({ x: 7, z: -8 }, target, 1.4)).toBe(false);
  });
  it('gives ranged sentinels and enraged bosses distinct timings', () => {
    expect(getAttackPattern('sentinel').reach).toBeGreaterThan(getAttackPattern('slime').reach);
    expect(getAttackPattern('boss_knight', true).windup).toBeLessThan(getAttackPattern('boss_knight').windup);
    expect(getAttackPattern('boss_knight', true).recovery).toBeLessThan(getAttackPattern('boss_knight').recovery);
  });
});

describe('gameplay integration', () => {
  let engine: GameEngine;
  let state: EngineState;
  let persistence: PersistenceManager;
  let callbacks: GameEngineCallbacks;
  let latestHud: HudTelemetry;
  let frame: FrameRequestCallback;

  beforeEach(async () => {
    vi.stubGlobal('window', Object.assign(new EventTarget(), { innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1 }));
    vi.stubGlobal('document', Object.assign(new EventTarget(), { visibilityState: 'visible' }));
    vi.stubGlobal('HTMLElement', class extends EventTarget {});
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frame = callback; return 1; });
    persistence = new PersistenceManager(new InMemoryStorageAdapter());
    await persistence.init();
    const account = await persistence.loginOrCreateAccount('combat_test', 'Test');
    const character = await persistence.createCharacter({ accountId: account.id, classId: 'warrior', name: 'Test hero' });
    callbacks = {
      onHudUpdate: vi.fn(hud => { latestHud = hud; }),
      onBannerNotification: vi.fn(), onUltimateCutIn: vi.fn(), onLootObtained: vi.fn(),
      onFinisherFrame: vi.fn(), onFinisherEnd: vi.fn(), onChronicleInteraction: vi.fn(),
      onCharacterSaved: vi.fn(), onDefeated: vi.fn(), onZoneCleared: vi.fn(),
    };
    engine = new GameEngine(new EventTarget() as HTMLCanvasElement, {} as HTMLElement, persistence, callbacks);
    engine.startGameplayWithCharacter(character);
    state = engine as unknown as EngineState;
    state.companions = [];
    await engine.saveActiveCharacterNow();
  });

  function startCombat(): EnemyEntity {
    engine.enterZone('stomping_grounds', 'from_town', 321);
    const enemy = state.enemies[0];
    state.enemies = [enemy];
    enemy.bundle.root.position.copy(state.playerPos).add(new THREE.Vector3(0, 0, -1));
    enemy.attackCooldown = 0;
    return enemy;
  }

  it('does not regenerate in ruins or the boss arena', () => {
    for (const zone of ['sunken_ruins', 'abyssal_sanctum'] as const) {
      engine.enterZone(zone);
      state.enemies = [];
      state.activeCharacter.currentHp = 100;
      state.updateGameplay(0.05);
      expect(state.activeCharacter.currentHp).toBe(100);
    }
    engine.enterZone('starting_town');
    state.activeCharacter.currentHp = 100;
    state.updateGameplay(0.05);
    expect(state.activeCharacter.currentHp).toBeGreaterThan(100);
  });

  it('locks a telegraph and lets the player walk out before impact', () => {
    const enemy = startCombat();
    const hp = state.activeCharacter.currentHp;
    state.updateEnemies(0.05);
    expect(enemy.telegraph).not.toBeNull();
    expect(state.activeCharacter.currentHp).toBe(hp);
    state.playerPos.x += 5;
    state.updateEnemies(2);
    expect(state.activeCharacter.currentHp).toBe(hp);
    expect(enemy.telegraph).toBeNull();
  });

  it('damages a player who stays in a telegraph and rewards an invulnerable evade', () => {
    const enemy = startCombat();
    const char = state.activeCharacter;
    const hp = char.currentHp;
    state.updateEnemies(0.05);
    state.updateEnemies(2);
    expect(char.currentHp).toBeLessThan(hp);
    enemy.attackCooldown = 0;
    state.updateEnemies(0.05);
    state.invulnerableTimer = 1;
    char.ultimateEnergy = 0;
    const afterHit = char.currentHp;
    state.updateEnemies(2);
    expect(char.currentHp).toBe(afterHit);
    expect(char.ultimateEnergy).toBe(12);
  });

  it('keeps an active attack consistent if the boss enrages during its windup', () => {
    const enemy = startCombat();
    enemy.kind = 'boss_knight';
    state.updateEnemies(0.05);
    const locked = enemy.attackPattern;
    enemy.hp = enemy.maxHp * 0.4;
    state.updateEnemies(0.1);
    expect(enemy.enraged).toBe(true);
    expect(enemy.attackPattern).toBe(locked);
    expect(enemy.attackPattern!.radius).toBe(getAttackPattern('boss_knight').radius);
  });

  it('keeps all pause owners active until each is released', () => {
    startCombat();
    state.cooldowns.skill1 = 4;
    engine.setPaused('deck', true);
    engine.setPaused('cutscene', true);
    engine.setPaused('deck', false);
    const played = state.activeCharacter.playTimeSeconds;
    frame(performance.now() + 50);
    expect(state.cooldowns.skill1).toBe(4);
    expect(state.activeCharacter.playTimeSeconds).toBe(played);
    engine.setPaused('cutscene', false);
    expect(engine.isPaused).toBe(false);
  });

  it('keeps defeat on screen until the player revives, preserving rewards', () => {
    startCombat();
    const char = state.activeCharacter;
    const gold = char.gold;
    char.currentHp = 1;
    state.updateEnemies(0.05);
    state.updateEnemies(2);
    expect(char.currentHp).toBe(0);
    expect(engine.isPaused).toBe(true);
    expect(callbacks.onDefeated).toHaveBeenCalledOnce();
    expect(state.currentZone).toBe('stomping_grounds');
    engine.reviveAtSanctuary();
    expect(state.currentZone).toBe('starting_town');
    expect(char.currentHp).toBeGreaterThan(1);
    expect(char.gold).toBe(gold);
    expect(engine.isPaused).toBe(false);
  });

  it('refills flasks in sanctuaries and keeps charges across combat zones', () => {
    startCombat();
    state.activeCharacter.currentHp = 100;
    engine.useFlask();
    expect(state.flaskCharges).toBe(2);
    engine.enterZone('sunken_ruins');
    expect(state.flaskCharges).toBe(2);
    engine.enterZone('market_crossing');
    expect(state.flaskCharges).toBe(3);
  });

  it('seals the forward portal until the route is clear', () => {
    startCombat();
    state.nearbyPortal = { targetZone: 'market_crossing', targetSpawnTag: 'from_stomping_north' };
    expect(engine.tryTraverseNearbyPortal()).toBe(false);
    expect(state.currentZone).toBe('stomping_grounds');
    state.enemies = [];
    expect(engine.tryTraverseNearbyPortal()).toBe(true);
    expect(state.currentZone).toBe('market_crossing');
  });

  it('banks final drops exactly once and reports a completed expedition', () => {
    const enemy = startCombat();
    state.expedition.total = 1;
    const beforeGold = state.activeCharacter.gold;
    state.handleEnemyDefeated(enemy, 0);
    expect(state.activeCharacter.gold).toBe(beforeGold + enemy.goldReward);
    expect(callbacks.onZoneCleared).toHaveBeenCalledWith(expect.objectContaining({ kills: 1, gold: enemy.goldReward }));
    state.updateGameplay(0.05);
    expect(state.activeCharacter.gold).toBe(beforeGold + enemy.goldReward);
    state.updateGameplay(0.1);
    expect(latestHud.expedition.total).toBe(1);
  });

  it('resumes the same seeded route with kills, position, health, and flask charges intact', async () => {
    engine.enterZone('stomping_grounds', 'from_town', 7462);
    const first = state.enemies[0];
    state.handleEnemyDefeated(first, 0);
    const survivor = state.enemies[0];
    survivor.hp = 80;
    state.activeCharacter.currentHp = 100;
    engine.useFlask();
    const waypoint = engine.getCurrentPathLayout()!.waypoints[2];
    state.playerPos.set(waypoint.x, 0, waypoint.z);
    state.updateGameplay(0.01);
    const hp = state.activeCharacter.currentHp;
    const gold = state.activeCharacter.gold;
    await engine.saveActiveCharacterNow();
    const saved = engine.getActiveCharacter()!;
    const pendingGold = state.lootOrbs.reduce((total, orb) => total + orb.gold, 0);
    engine.setPreviewCharacter('warrior');
    engine.startGameplayWithCharacter(saved);
    expect(engine.getCurrentPathLayout()!.seed).toBe(7462);
    expect(state.enemies.some(enemy => enemy.id === first.id)).toBe(false);
    expect(state.enemies.find(enemy => enemy.id === survivor.id)!.hp).toBe(80);
    expect(state.enemies.length).toBe(26);
    expect(state.playerPos.x).toBeCloseTo(waypoint.x, 1);
    expect(state.playerPos.z).toBeCloseTo(waypoint.z, 1);
    expect(state.activeCharacter.currentHp).toBe(hp);
    expect(state.activeCharacter.gold).toBe(gold);
    expect(state.flaskCharges).toBe(2);
    expect(state.lootOrbs.reduce((total, orb) => total + orb.gold, 0)).toBe(pendingGold);
  });

  it('defers a lethal boss reward until its cinematic ends, and skip pays exactly once', () => {
    state.spawnEnemyAtPosition('boss_knight', 0, 1, 1);
    const enemy = state.enemies[state.enemies.length - 1];
    state.enemies = [enemy];
    const before = state.activeCharacter.enemiesDefeated;
    state.applySingleEnemyHit(enemy, 0, 10000, 0, '#fff', 0);
    expect(engine.isFinishing).toBe(true);
    expect(state.activeCharacter.enemiesDefeated).toBe(before);
    expect(callbacks.onFinisherFrame).toHaveBeenCalled();
    engine.skipBossFinisher();
    engine.skipBossFinisher();
    expect(engine.isFinishing).toBe(false);
    expect(state.activeCharacter.enemiesDefeated).toBe(before + 1);
    expect(callbacks.onFinisherEnd).toHaveBeenCalledOnce();
    expect(state.enemies).toHaveLength(0);
  });

  it('travels into the new campaign and resolves an actual nearby memory', async () => {
    expect(await engine.travelToChapter(1)).toBe(false);
    expect(await engine.travelToChapter(0)).toBe(true);
    expect(state.currentZone).toBe('whispering_woods');
    const site = state.chronicleSites[0];
    state.playerPos.set(site.position.x, 0, site.position.z);
    state.updateGameplay(0.01);
    expect(engine.interactWithNearbyQuestNpc()).toBe(true);
    expect(callbacks.onChronicleInteraction).toHaveBeenCalled();
    expect(engine.resolveChronicleInteraction(site.id).advanced).toBe(true);
    expect(state.activeCharacter.campaign!.objectiveIndex).toBe(1);
    expect(engine.resolveChronicleInteraction(site.id).advanced).toBe(false);
    await engine.saveActiveCharacterNow();
    const saved = engine.getActiveCharacter()!;
    engine.setPreviewCharacter('warrior');
    engine.startGameplayWithCharacter(saved);
    expect(state.currentZone).toBe('whispering_woods');
    expect(state.activeCharacter.campaign!.objectiveIndex).toBe(1);
  });

  it('reports a failed save without breaking later saves', async () => {
    vi.spyOn(persistence, 'saveCharacter').mockRejectedValueOnce(new Error('Storage unavailable'));
    expect(await engine.saveActiveCharacterNow()).toBe(false);
    expect(callbacks.onBannerNotification).toHaveBeenCalledWith('SAVE FAILED', expect.any(String));
    await engine.saveActiveCharacterNow();
    expect(callbacks.onCharacterSaved).toHaveBeenCalled();
  });

  it('does not replace live combat state when an older asynchronous save completes', async () => {
    let resolveSave!: (saved: CharacterSaveData) => void;
    const char = state.activeCharacter;
    const snapshot = structuredClone(char);
    vi.spyOn(persistence, 'saveCharacter').mockImplementationOnce(() => new Promise(resolve => { resolveSave = resolve; }));
    const pending = engine.saveActiveCharacterNow();
    await Promise.resolve();
    char.currentHp = 123;
    char.gold += 50;
    resolveSave(snapshot);
    await pending;
    expect(state.activeCharacter).toBe(char);
    expect(char.currentHp).toBe(123);
    expect(char.gold).toBe(snapshot.gold + 50);
  });
});

