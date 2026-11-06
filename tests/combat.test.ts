import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { getAttackPattern, isInsideAttack, isSafeZone, resolveFlask } from '../src/game/CombatRules';
import { EnemyEntity, GameEngine, GameEngineCallbacks, HudTelemetry } from '../src/game/GameEngine';
import { PersistenceManager } from '../src/persistence/PersistenceManager';
import { InMemoryStorageAdapter } from '../src/persistence/StorageAdapter';
import { CharacterClassId, CharacterSaveData } from '../src/types/game';
import { CHRONICLE_CHAPTERS } from '../src/data/chronicle';
import { advanceChronicle } from '../src/game/CampaignEngine';
import { FieldPlan } from '../src/game/FieldActivities';
import { NpcActor, PortalTrigger } from '../src/types/world';
import { HearthmereOpening, HEARTHMERE_COVER, HEARTHMERE_REFUGE, HEARTHMERE_WAYSTATION } from '../src/game/HearthmereOpening';
import { type HearthmereSave, readHearthmereSave } from '../src/persistence/HearthmereSave';
import type { VfxSystem } from '../src/rendering/VfxSystem';

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
    buildSlice() {}
    addTravelGate() {} showFieldActivity() {} updateFieldActivity() {}
    update() {}
  },
}));
vi.mock('../src/rendering/VfxSystem', () => ({ VfxSystem: class {
  clearAll() {} update() {} spawnDamageNumber() {} spawnDashAfterimage() {} spawnMirageAfterimage() {}
  spawnFallingMeteor() {} spawnShockwaveRing() {} spawnSlashArc() {}
  spawnSpearThrustBeam() {} spawnEclipseImpact() {} spawnSentinelDischarge() {} spawnFiendCollapse() {}
} }));

interface EngineState {
  activeCharacter: CharacterSaveData;
  enemies: EnemyEntity[];
  companions: unknown[];
  playerPos: THREE.Vector3;
  playerYaw: number;
  nearbyPortal: { targetZone: string; targetSpawnTag: string } | null;
  activePortals: PortalTrigger[];
  activeNpcs: NpcActor[];
  fieldPlan: FieldPlan;
  portalGraceTimer: number;
  updatePortalAndNpcProximity(): void;
  emitHudTelemetry(): void;
  currentZone: string;
  cooldowns: Record<string, number>;
  activeAttackTimer: number;
  lootOrbs: Array<{ gold: number }>;
  invulnerableTimer: number;
  flaskCharges: number;
  expedition: { total: number };
  updateGameplay(dt: number): void;
  updateEnemies(dt: number): void;
  chronicleSites: Array<{ id: string; kind: string; position: { x: number; z: number } }>;
  spawnEnemyAtPosition(kind: EnemyEntity['kind'], x: number, z: number, scale: number): void;
  applySingleEnemyHit(enemy: EnemyEntity, index: number, multiplier: number, energy: number, color: string, knockback: number): void;
  handleEnemyDefeated(enemy: EnemyEntity, index: number): void;
  opening: HearthmereOpening;
  vfx: VfxSystem;
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
    const local = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => local.get(key) ?? null,
      setItem: (key: string, value: string) => local.set(key, value),
    });
    persistence = new PersistenceManager(new InMemoryStorageAdapter());
    await persistence.init();
    const account = await persistence.loginOrCreateAccount('combat_test', 'Test');
    const character = await persistence.createCharacter({ accountId: account.id, classId: 'warrior', name: 'Test hero' });
    callbacks = {
      onHudUpdate: vi.fn(hud => { latestHud = hud; }),
      onBannerNotification: vi.fn(), onUltimateCutIn: vi.fn(), onLootObtained: vi.fn(),
      onFinisherFrame: vi.fn(), onFinisherEnd: vi.fn(), onChronicleInteraction: vi.fn(),
      onCharacterSaved: vi.fn(), onDefeated: vi.fn(), onZoneCleared: vi.fn(),
      onTriggerCutscene: vi.fn(),
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

  async function startOpening(role: CharacterClassId) {
    const temporary = new PersistenceManager(new InMemoryStorageAdapter());
    const character = await temporary.createCharacter({ accountId: 'hearthmere-test', classId: role, name: 'Opening Hero' });
    const initial: HearthmereSave = {
      version: 1, classId: role, name: character.name, step: 'arrival',
      position: HEARTHMERE_WAYSTATION, yaw: Math.PI, hp: character.currentHp,
      energy: character.ultimateEnergy, flasks: 3, seconds: 0, enemies: [],
    };
    engine.startGameplayWithCharacter(character, [], false, initial);
    return character;
  }

  function useOpeningObjective() {
    state.opening.placePlayer(state.playerPos, state.opening.objective.target);
    expect(engine.interactWithNearbyQuestNpc()).toBe(true);
  }

  function clearOpeningWave() {
    while (state.enemies.length) state.handleEnemyDefeated(state.enemies[0], 0);
  }

  function reachShipment() {
    for (let i = 0; i < 4; i++) useOpeningObjective();
    for (const x of [-7, -6, -5, -4, -3]) {
      state.opening.placePlayer(state.playerPos, { x, z: 4 });
      state.updateGameplay(0.02);
    }
    expect(state.opening.step).toBe('shipment');
  }

  it.each(['warrior', 'mage', 'assassin'] as const)('takes the %s through the opening with a saved reveal and a playable rescue', async role => {
    const legacy = await persistence.getCharactersForAccount(state.activeCharacter.accountId);
    const character = await startOpening(role);
    expect(state.companions).toHaveLength(0);
    reachShipment();
    expect(state.opening.walkable({ x: 16, z: 5 })).toBe(false);
    useOpeningObjective();
    expect(callbacks.onTriggerCutscene).toHaveBeenCalledWith('hearthmere_shipment');
    const saved = readHearthmereSave(role)!;
    expect(saved.step).toBe('square');
    expect(saved.position).toEqual(HEARTHMERE_COVER);
    expect(saved.enemies).toHaveLength(2);
    engine.startGameplayWithCharacter(character, [], false, saved);
    expect(callbacks.onTriggerCutscene).toHaveBeenCalledTimes(1);
    expect(state.companions).toHaveLength(2);
    state.opening.placePlayer(state.playerPos, state.opening.objective.target);
    expect(engine.interactWithNearbyQuestNpc()).toBe(false);
    clearOpeningWave();
    useOpeningObjective();
    clearOpeningWave();
    useOpeningObjective();
    useOpeningObjective();
    expect(state.opening.walkable({ x: 16, z: 5 })).toBe(true);
    expect(state.opening.walkable({ x: 16, z: 1 })).toBe(false);
    clearOpeningWave();
    useOpeningObjective();
    expect(state.opening.movingGroup?.x).toBe(10);
    for (let i = 0; i < 35; i++) state.updateGameplay(0.1);
    expect(state.opening.movingGroup!.x).toBeGreaterThanOrEqual(22);
    state.opening.placePlayer(state.playerPos, HEARTHMERE_REFUGE);
    for (let i = 0; i < 30; i++) state.updateGameplay(0.1);
    expect(state.opening.step).toBe('refuge');
    useOpeningObjective();
    expect(readHearthmereSave(role)?.step).toBe('complete');
    expect(latestHud.questView.isComplete).toBe(true);
    expect(await persistence.getCharactersForAccount(legacy[0].accountId)).toEqual(legacy);
  });

  it('saves a waystation retry on defeat and preserves the secured gate', async () => {
    const character = await startOpening('warrior');
    reachShipment();
    useOpeningObjective();
    clearOpeningWave();
    useOpeningObjective();
    clearOpeningWave();
    useOpeningObjective();
    useOpeningObjective();
    clearOpeningWave();
    state.opening.placePlayer(state.playerPos, { x: 16, z: 5 });
    for (let i = 0; i < 7; i++) state.updateGameplay(0.1);
    await engine.saveActiveCharacterNow();
    const duringWindup = readHearthmereSave('warrior')!;
    engine.startGameplayWithCharacter(character, [], false, duringWindup);
    expect(state.playerPos.x).toBe(16);
    for (let i = 0; i < 7; i++) state.updateGameplay(0.1);
    expect(state.activeCharacter.currentHp).toBe(duringWindup.hp);
    for (let i = 0; i < 100 && !engine.isPaused; i++) state.updateGameplay(0.1);
    expect(callbacks.onDefeated).toHaveBeenCalledTimes(1);
    const retry = readHearthmereSave('warrior')!;
    expect(retry.position).toEqual(HEARTHMERE_WAYSTATION);
    expect(retry.step).toBe('far_hold');
    expect(retry.enemies).toHaveLength(1);
    engine.startGameplayWithCharacter(character, [], false, retry);
    expect(state.playerPos.x).toBe(HEARTHMERE_WAYSTATION.x);
    expect(state.opening.walkable({ x: 16, z: 5 })).toBe(true);
    expect(state.enemies).toHaveLength(1);
  });

  it('stages the colossus contact over the bridge and strikes only once per tell', () => {
    const opening = new HearthmereOpening('warrior', 'far_hold');
    const fist = opening.group.getObjectByName('Colossus striking fist')!;
    opening.stageReveal('impact');
    expect(opening.updateReveal(.69)).toBe(false);
    const raised = fist.position.y;
    expect(raised).toBeGreaterThan(8);
    expect(opening.updateReveal(.25)).toBe(true);
    const contact = fist.getWorldPosition(new THREE.Vector3());
    expect(contact.x).toBeCloseTo(16.5, 1);
    expect(contact.z).toBeCloseTo(4, 1);
    expect(contact.y).toBeLessThan(1.5);
    expect(opening.updateReveal(.25)).toBe(false);
    opening.resetEncounter();
    expect(opening.update(.95, { x: 16, z: 5 })).toMatchObject({ tell: true, strike: false, hit: false });
    expect(opening.update(.30, { x: 16, z: 5 })).toMatchObject({ tell: false, strike: true, hit: true });
    expect(opening.update(.30, { x: 16, z: 5 })).toMatchObject({ tell: false, strike: false, hit: false });
  });

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

  it('discards a dodge during Eclipse windup and lets a fresh dodge cancel recovery', () => {
    const character = structuredClone(state.activeCharacter);
    engine.startGameplayWithCharacter(character, [], true);
    state.activeCharacter.ultimateEnergy = 100;
    engine.input.triggerAction('ultimate');
    state.updateGameplay(0.02);
    expect(callbacks.onUltimateCutIn).not.toHaveBeenCalled();

    engine.input.triggerAction('dash');
    for (let i = 0; i < 20; i++) state.updateGameplay(0.02);
    expect(callbacks.onUltimateCutIn).toHaveBeenCalledTimes(1);
    expect(state.cooldowns.dash).toBe(0);
    expect(state.activeAttackTimer).toBeGreaterThan(0);

    engine.input.triggerAction('dash');
    state.updateGameplay(0.02);
    expect(state.cooldowns.dash).toBeGreaterThan(0);
    expect(state.activeAttackTimer).toBe(0);
  });

  it('applies the spear thrust once, when the visible strike reaches its release', () => {
    const enemy = startCombat();
    const startingPosition = state.playerPos.clone();
    enemy.hp = 1000;
    enemy.attackCooldown = 10;
    engine.input.triggerAction('basic');
    state.updateGameplay(0.02);
    state.updateGameplay(0.02);
    expect(enemy.hp).toBe(1000);
    expect(state.playerPos.distanceTo(startingPosition)).toBeGreaterThan(.05);
    expect(state.playerPos.distanceTo(startingPosition)).toBeLessThan(.45);

    state.updateGameplay(0.04);
    const afterRelease = enemy.hp;
    expect(afterRelease).toBeLessThan(1000);
    expect(state.playerPos.distanceTo(startingPosition)).toBeCloseTo(.45);
    for (let i = 0; i < 10; i++) state.updateGameplay(0.02);
    expect(enemy.hp).toBe(afterRelease);
    expect(state.playerPos.distanceTo(startingPosition)).toBeCloseTo(.45);
  });

  it('lets movement steer a spear recovery without snapping the attack pose to the new heading', () => {
    const enemy = startCombat();
    enemy.hp = 1000;
    enemy.attackCooldown = 10;
    engine.input.triggerAction('basic');
    for (let i = 0; i < 4; i++) state.updateGameplay(.02);
    expect(enemy.hp).toBeLessThan(1000);
    const facing = state.playerYaw;
    const position = state.playerPos.clone();
    const move = vi.spyOn(engine.input, 'update').mockImplementation(() => { engine.input.moveVector.set(1, 0); });
    state.updateGameplay(.025);
    move.mockRestore();
    expect(state.playerPos.x).toBeGreaterThan(position.x);
    expect(Math.abs(state.playerYaw - facing)).toBeCloseTo(.3);
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

  it('releases the sentinel discharge once from its animated core to the locked mark', () => {
    engine.enterZone('stomping_grounds', 'from_town', 321);
    const start = state.playerPos.clone();
    state.enemies = [];
    state.spawnEnemyAtPosition('sentinel', start.x + 4, start.z, 1);
    const sentinel = state.enemies[0];
    sentinel.attackCooldown = 0;
    const discharge = vi.spyOn(state.vfx, 'spawnSentinelDischarge');
    const hp = state.activeCharacter.currentHp;
    state.updateEnemies(.03);
    const locked = sentinel.attackTarget.clone();
    state.updateEnemies(.82);
    expect(discharge).not.toHaveBeenCalled();
    const chargedCore = sentinel.bundle.emitter!.getWorldPosition(new THREE.Vector3());
    expect(chargedCore.y).toBeGreaterThan(1);
    expect(chargedCore.distanceTo(sentinel.bundle.root.position)).toBeLessThan(2);
    state.playerPos.z += 4;
    state.updateEnemies(.14);
    state.updateEnemies(.10);
    expect(discharge).toHaveBeenCalledTimes(1);
    expect(discharge).toHaveBeenCalledWith(chargedCore, locked, getAttackPattern('sentinel').radius);
    expect(state.activeCharacter.currentHp).toBe(hp);
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

  it('preserves the rotation pause through hero changes and other menus', () => {
    engine.setPaused('orientation', true);
    engine.setPaused('menu', true);
    engine.setPaused('menu', false);
    expect(engine.isPaused).toBe(true);
    const character = structuredClone(state.activeCharacter);
    engine.setPreviewCharacter('warrior');
    expect(engine.isPaused).toBe(true);
    engine.startGameplayWithCharacter(character);
    expect(engine.isPaused).toBe(true);
    engine.setPaused('orientation', false);
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

  it('starts in town, recovers names through play, then resolves the next nearby memory', async () => {
    expect(state.currentZone).toBe('starting_town');
    expect(state.activePortals.some(portal => portal.id === 'bellroad_outbound')).toBe(true);
    expect(await engine.travelToChapter(1)).toBe(false);
    expect(await engine.travelToChapter(0)).toBe(true);
    expect(state.currentZone).toBe('whispering_woods');
    const fieldSite = state.chronicleSites[0];
    state.playerPos.set(fieldSite.position.x, 0, fieldSite.position.z);
    expect(engine.resolveChronicleInteraction(fieldSite.id).advanced).toBe(false);
    for (const point of state.fieldPlan.points) {
      state.playerPos.set(point.x, 0, point.z);
      state.updateGameplay(0.01);
    }
    expect(state.activeCharacter.campaign!.objectiveIndex).toBe(1);
    const site = state.chronicleSites[1];
    state.playerPos.set(site.position.x, 0, site.position.z);
    state.updateGameplay(0.01);
    expect(engine.interactWithNearbyQuestNpc()).toBe(true);
    expect(callbacks.onChronicleInteraction).toHaveBeenCalled();
    expect(engine.resolveChronicleInteraction(site.id).advanced).toBe(true);
    expect(state.activeCharacter.campaign!.objectiveIndex).toBe(2);
    expect(engine.resolveChronicleInteraction(site.id).advanced).toBe(false);
    await engine.saveActiveCharacterNow();
    const saved = engine.getActiveCharacter()!;
    engine.setPreviewCharacter('warrior');
    engine.startGameplayWithCharacter(saved);
    expect(state.currentZone).toBe('whispering_woods');
    expect(state.activeCharacter.campaign!.objectiveIndex).toBe(2);
  });

  it('keeps the original town quest available through its touch action', () => {
    state.activeNpcs = [{ id: 'npc_commander_vael', name: 'Vael', role: 'Commander', dialogue: 'The north road is open.', position: { x: 0, z: 0 }, colorHex: 0xffffff }];
    state.playerPos.set(0, 0, 0); state.updatePortalAndNpcProximity(); state.emitHudTelemetry();
    expect(latestHud.questView.objectiveTitle).toContain('east Bellroad');
    expect(latestHud.questView.actionButtonLabel).toBeTruthy();
    expect(engine.interactWithNearbyQuestNpc()).toBe(true);
    expect(state.activeCharacter.questState!.stage).not.toBe('not_started');
  });

  it('walks from town into the campaign and from a completed chapter into the next without an atlas', async () => {
    const walkThrough = async (id: string, check: () => void) => {
      const portal = state.activePortals.find(candidate => candidate.id === id)!;
      expect(portal).toBeTruthy();
      state.playerPos.set(portal.position.x, 0, portal.position.z);
      state.portalGraceTimer = 0;
      state.updatePortalAndNpcProximity();
      await vi.waitFor(check);
      await vi.waitFor(() => expect(engine.isPaused).toBe(false));
    };
    await walkThrough('bellroad_outbound', () => expect(state.currentZone).toBe('whispering_woods'));
    expect(state.activeCharacter.campaign!.chapterIndex).toBe(0);
    // Every chapter continues through a physical road, including each regional town stop.
    for (let index = 0; index < CHRONICLE_CHAPTERS.length; index++) {
      const chapter = CHRONICLE_CHAPTERS[index];
      const forward = state.activePortals.find(portal => portal.id === 'bellroad_forward')!;
      state.nearbyPortal = forward;
      expect(engine.tryTraverseNearbyPortal()).toBe(false);
      for (const objective of chapter.objectives) advanceChronicle(state.activeCharacter, objective.id, objective.answer ?? (objective.options ? 0 : undefined));
      const next = CHRONICLE_CHAPTERS[index + 1];
      if (!next) await walkThrough('bellroad_forward', () => expect(state.currentZone).toBe('starting_town'));
      else if (next.region === chapter.region) await walkThrough('bellroad_forward', () => expect(state.activeCharacter.campaign!.chapterIndex).toBe(index + 1));
      else {
        await walkThrough('bellroad_forward', () => expect(state.currentZone).toBe('market_crossing'));
        await walkThrough('bellroad_outbound', () => expect(state.activeCharacter.campaign!.chapterIndex).toBe(index + 1));
        expect(state.currentZone).toBe(next.region);
      }
    }
    expect(state.activeCharacter.campaign!.completedChapterIds).toHaveLength(12);
  });

  it('preserves a procedural chapter and partial recovery when walking to town and back', async () => {
    await engine.travelToChapter(0);
    const plan = state.fieldPlan;
    state.playerPos.set(plan.points[0].x, 0, plan.points[0].z); state.updateGameplay(.01);
    const seed = state.activeCharacter.campaign!.worldSeeds![CHRONICLE_CHAPTERS[0].id];
    const returned = state.activePortals.find(portal => portal.id === 'bellroad_return')!;
    state.nearbyPortal = returned;
    expect(engine.tryTraverseNearbyPortal()).toBe(true);
    await vi.waitFor(() => expect(state.currentZone).toBe('starting_town'));
    await vi.waitFor(() => expect(engine.isPaused).toBe(false));
    expect(await engine.travelToChapter(0)).toBe(true);
    expect(state.activeCharacter.campaign!.worldSeeds![CHRONICLE_CHAPTERS[0].id]).toBe(seed);
    expect(state.fieldPlan.points).toEqual(plan.points);
    expect(state.activeCharacter.campaign!.fieldProgress![plan.id].collected).toEqual([0]);
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

