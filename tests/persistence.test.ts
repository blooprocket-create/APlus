import { describe, expect, it, beforeEach } from 'vitest';
import {
  CharacterLimitExceededError,
  CharacterSlotOccupiedError,
  PersistenceManager,
} from '../src/persistence/PersistenceManager';
import { InMemoryStorageAdapter } from '../src/persistence/StorageAdapter';
import {
  CHARACTER_CLASSES,
  computeEffectiveStats,
  computePowerRating,
} from '../src/data/classes';
import { generateLootItem } from '../src/game/LootSystem';
import {
  clampToProceduralPath,
  generateStompingGroundsPath,
  STOMPING_GROUNDS_SEGMENT_LENGTH,
  STOMPING_GROUNDS_TOTAL_DISTANCE,
} from '../src/game/ProceduralPathGenerator';
import { createDefaultQuestState, QuestEngine } from '../src/game/QuestEngine';

describe('PersistenceManager, Classes, Zones & Procedural Stomping Grounds', () => {
  let persistence: PersistenceManager;

  beforeEach(async () => {
    persistence = new PersistenceManager(new InMemoryStorageAdapter());
    await persistence.init();
  });

  it('creates accounts, isolates characters per account, and places new heroes in Starting Town', async () => {
    const accA = await persistence.loginOrCreateAccount('player_one', 'Player One');
    const accB = await persistence.loginOrCreateAccount('player_two', 'Player Two');

    const cA = await persistence.createCharacter({
      accountId: accA.id,
      name: 'Akatsuki',
      classId: 'assassin',
    });

    const cB = await persistence.createCharacter({
      accountId: accB.id,
      name: 'Celestia',
      classId: 'mage',
    });

    expect(cA.currentZone).toBe('starting_town');
    expect(cB.currentZone).toBe('starting_town');

    const charsA = await persistence.getCharactersForAccount(accA.id);
    const charsB = await persistence.getCharactersForAccount(accB.id);

    expect(charsA).toHaveLength(1);
    expect(charsA[0].name).toBe('Akatsuki');
    expect(charsB).toHaveLength(1);
    expect(charsB[0].name).toBe('Celestia');
  });

  it('enforces a strict maximum of 3 characters per account across Warrior, Mage, and Assassin', async () => {
    const acc = await persistence.loginOrCreateAccount('trio_master');

    const c1 = await persistence.createCharacter({
      accountId: acc.id,
      name: 'HeroWarrior',
      classId: 'warrior',
    });
    const c2 = await persistence.createCharacter({
      accountId: acc.id,
      name: 'HeroMage',
      classId: 'mage',
    });
    const c3 = await persistence.createCharacter({
      accountId: acc.id,
      name: 'HeroAssassin',
      classId: 'assassin',
    });

    expect(c1.slotIndex).toBe(0);
    expect(c2.slotIndex).toBe(1);
    expect(c3.slotIndex).toBe(2);

    await expect(
      persistence.createCharacter({
        accountId: acc.id,
        name: 'HeroFour',
        classId: 'warrior',
      })
    ).rejects.toThrow(CharacterLimitExceededError);
  });

  it('prevents creating a character in an already occupied slot and allows reuse after deletion', async () => {
    const acc = await persistence.loginOrCreateAccount('slot_tester');

    const c1 = await persistence.createCharacter({
      accountId: acc.id,
      slotIndex: 1,
      name: 'SlotTwoHero',
      classId: 'warrior',
    });

    await expect(
      persistence.createCharacter({
        accountId: acc.id,
        slotIndex: 1,
        name: 'DuplicateSlot',
        classId: 'assassin',
      })
    ).rejects.toThrow(CharacterSlotOccupiedError);

    await persistence.deleteCharacter(acc.id, c1.id);
    const replacement = await persistence.createCharacter({
      accountId: acc.id,
      slotIndex: 1,
      name: 'RebornHero',
      classId: 'mage',
    });

    expect(replacement.slotIndex).toBe(1);
    expect(replacement.name).toBe('RebornHero');
  });

  it('persists character progression, zone transitions, stats, and equipped loot per character', async () => {
    const acc = await persistence.loginOrCreateAccount('progression_acc');
    const char = await persistence.createCharacter({
      accountId: acc.id,
      slotIndex: 0,
      name: 'Brynhildr',
      classId: 'warrior',
    });

    const initialPower = computePowerRating(char);

    char.level = 5;
    char.currentZone = 'market_crossing';
    char.stompingGroundsClears = 3;
    char.currentWave = 4;
    char.highestWave = 4;
    char.gold = 980;
    const mythicDrop = generateLootItem('warrior', 4, 'mythic');
    char.inventory.push(mythicDrop);
    if (mythicDrop.slot === 'weapon') {
      char.equipped.weapon = mythicDrop;
    } else {
      char.equipped.charm = mythicDrop;
    }

    await persistence.saveCharacter(char);

    const slots = await persistence.getCharacterSlots(acc.id);
    const loaded = slots[0]!;
    expect(loaded).not.toBeNull();
    expect(loaded.level).toBe(5);
    expect(loaded.currentZone).toBe('market_crossing');
    expect(loaded.stompingGroundsClears).toBe(3);
    expect(loaded.gold).toBe(980);

    const updatedStats = computeEffectiveStats(loaded);
    const updatedPower = computePowerRating(loaded);
    expect(updatedStats.attack).toBeGreaterThan(char.baseStats.attack);
    expect(updatedPower).toBeGreaterThan(initialPower);
  });

  it('defines distinct delivery styles and attack cadences for Spear Warrior, Mage, and Ranged Assassin', () => {
    const warrior = CHARACTER_CLASSES.warrior;
    const mage = CHARACTER_CLASSES.mage;
    const assassin = CHARACTER_CLASSES.assassin;

    expect(warrior.deliveryStyle).toBe('spear_melee');
    expect(mage.deliveryStyle).toBe('arcane_caster');
    expect(assassin.deliveryStyle).toBe('kunai_ranged');

    // Assassin has the fastest attack cadence; Warrior has the slowest/heaviest cadence
    expect(assassin.skills.basic.cooldown).toBeLessThan(mage.skills.basic.cooldown);
    expect(mage.skills.basic.cooldown).toBeLessThan(warrior.skills.basic.cooldown);
    expect(assassin.baseStats.attackSpeed).toBeGreaterThan(warrior.baseStats.attackSpeed);
  });

  it('generates procedural Stomping Grounds single paths with different curves but identical total distance and continuity', () => {
    const pathA = generateStompingGroundsPath(101);
    const pathB = generateStompingGroundsPath(202);

    // Same exact total distance and segment count
    expect(pathA.totalDistance).toBe(STOMPING_GROUNDS_TOTAL_DISTANCE);
    expect(pathB.totalDistance).toBe(STOMPING_GROUNDS_TOTAL_DISTANCE);
    expect(pathA.waypoints).toHaveLength(pathB.waypoints.length);

    // Verify each segment in both paths has the exact segment length (14.0 units) and advances northward (-Z)
    for (const layout of [pathA, pathB]) {
      let accumulated = 0;
      for (let i = 0; i < layout.waypoints.length - 1; i++) {
        const a = layout.waypoints[i];
        const b = layout.waypoints[i + 1];
        const segLen = Math.hypot(b.x - a.x, b.z - a.z);
        expect(segLen).toBeCloseTo(STOMPING_GROUNDS_SEGMENT_LENGTH, 2);
        expect(b.z).toBeLessThan(a.z); // Strictly progresses forward without looping
        accumulated += segLen;
      }
      expect(accumulated).toBeCloseTo(STOMPING_GROUNDS_TOTAL_DISTANCE, 1);
    }

    // Different seeds produce different X coordinates along the path
    const xDiffs = pathA.waypoints.some(
      (wp, idx) => Math.abs(wp.x - pathB.waypoints[idx].x) > 0.5
    );
    expect(xDiffs).toBe(true);

    // Clamping at start portal = 0% progress, clamping at end portal = 100% progress
    const startClamp = clampToProceduralPath(
      pathA.startPortalPos.x,
      pathA.startPortalPos.z,
      pathA
    );
    const endClamp = clampToProceduralPath(
      pathA.endPortalPos.x,
      pathA.endPortalPos.z,
      pathA
    );
    expect(startClamp.progress).toBeCloseTo(0, 2);
    expect(endClamp.progress).toBeCloseTo(1, 2);
  });

  it('progresses through all 5 stages of the Prototype Quest (Starting Town -> Clear Stomping Grounds -> Market Crossing Twist -> Clear Stomping Grounds Again -> Finish at Starting Town NPC)', () => {
    const quest = createDefaultQuestState();
    expect(quest.stage).toBe('not_started');

    // Step 1: Accept quest from Commander Vael in Starting Town
    const step1 = QuestEngine.interactWithNpc(quest, 'npc_commander_vael');
    expect(step1.advanced).toBe(true);
    expect(step1.eventType).toBe('accepted');
    expect(quest.stage).toBe('clear_stomping_1');

    // Step 2: Enter Stomping Grounds and clear all 27 enemies
    QuestEngine.onEnterStompingGrounds(quest, 27);
    const partialClear = QuestEngine.onStompingGroundsEnemyCountChanged(quest, 10);
    expect(partialClear.stageAdvanced).toBe(false);
    expect(quest.outboundEnemiesKilled).toBe(17);

    const fullClear1 = QuestEngine.onStompingGroundsEnemyCountChanged(quest, 0);
    expect(fullClear1.stageAdvanced).toBe(true);
    expect(quest.stage).toBe('talk_market_npc');

    // Step 3: Arrive at Market Crossing and report to Grand Merchant Lyra ("No it's not! Go back!")
    const step3 = QuestEngine.interactWithNpc(quest, 'npc_merchant_lyra');
    expect(step3.advanced).toBe(true);
    expect(step3.eventType).toBe('market_twist');
    expect(quest.stage).toBe('clear_stomping_2');

    // Step 4: Re-enter Stomping Grounds (monsters are back!) and clear all enemies again
    QuestEngine.onEnterStompingGrounds(quest, 27);
    const fullClear2 = QuestEngine.onStompingGroundsEnemyCountChanged(quest, 0);
    expect(fullClear2.stageAdvanced).toBe(true);
    expect(quest.stage).toBe('return_starting_npc');

    // Step 5: Finish quest at original NPC (Commander Vael in Starting Town)
    const step5 = QuestEngine.interactWithNpc(quest, 'npc_commander_vael');
    expect(step5.advanced).toBe(true);
    expect(step5.eventType).toBe('completed');
    expect(quest.stage).toBe('completed');
    expect(quest.completedCount).toBe(1);
  });
});
