import { describe, expect, it, beforeEach } from 'vitest';
import {
  CharacterLimitExceededError,
  CharacterSlotOccupiedError,
  PersistenceManager,
} from '../src/persistence/PersistenceManager';
import { InMemoryStorageAdapter } from '../src/persistence/StorageAdapter';
import { computeEffectiveStats, computePowerRating } from '../src/data/classes';
import { generateLootItem } from '../src/game/LootSystem';

describe('PersistenceManager & 3-Character-Per-Account Enforcement', () => {
  let persistence: PersistenceManager;

  beforeEach(async () => {
    persistence = new PersistenceManager(new InMemoryStorageAdapter());
    await persistence.init();
  });

  it('creates accounts and isolates characters per account', async () => {
    const accA = await persistence.loginOrCreateAccount('player_one', 'Player One');
    const accB = await persistence.loginOrCreateAccount('player_two', 'Player Two');

    await persistence.createCharacter({
      accountId: accA.id,
      name: 'Akatsuki',
      classId: 'bladedancer',
    });

    await persistence.createCharacter({
      accountId: accB.id,
      name: 'Celestia',
      classId: 'astral_weaver',
    });

    const charsA = await persistence.getCharactersForAccount(accA.id);
    const charsB = await persistence.getCharactersForAccount(accB.id);

    expect(charsA).toHaveLength(1);
    expect(charsA[0].name).toBe('Akatsuki');
    expect(charsB).toHaveLength(1);
    expect(charsB[0].name).toBe('Celestia');
  });

  it('enforces a strict maximum of 3 characters per account', async () => {
    const acc = await persistence.loginOrCreateAccount('trio_master');

    const c1 = await persistence.createCharacter({
      accountId: acc.id,
      name: 'HeroOne',
      classId: 'bladedancer',
    });
    const c2 = await persistence.createCharacter({
      accountId: acc.id,
      name: 'HeroTwo',
      classId: 'astral_weaver',
    });
    const c3 = await persistence.createCharacter({
      accountId: acc.id,
      name: 'HeroThree',
      classId: 'valkyrie',
    });

    expect(c1.slotIndex).toBe(0);
    expect(c2.slotIndex).toBe(1);
    expect(c3.slotIndex).toBe(2);

    // Attempting to create a 4th character must throw CharacterLimitExceededError
    await expect(
      persistence.createCharacter({
        accountId: acc.id,
        name: 'HeroFour',
        classId: 'bladedancer',
      })
    ).rejects.toThrow(CharacterLimitExceededError);
  });

  it('prevents creating a character in an already occupied slot and allows reuse after deletion', async () => {
    const acc = await persistence.loginOrCreateAccount('slot_tester');

    const c1 = await persistence.createCharacter({
      accountId: acc.id,
      slotIndex: 1,
      name: 'SlotTwoHero',
      classId: 'valkyrie',
    });

    await expect(
      persistence.createCharacter({
        accountId: acc.id,
        slotIndex: 1,
        name: 'DuplicateSlot',
        classId: 'bladedancer',
      })
    ).rejects.toThrow(CharacterSlotOccupiedError);

    // Delete character in slot 1 and create a new one there
    await persistence.deleteCharacter(acc.id, c1.id);
    const replacement = await persistence.createCharacter({
      accountId: acc.id,
      slotIndex: 1,
      name: 'RebornHero',
      classId: 'astral_weaver',
    });

    expect(replacement.slotIndex).toBe(1);
    expect(replacement.name).toBe('RebornHero');
  });

  it('persists character progression, wave, stats, and equipped loot per character', async () => {
    const acc = await persistence.loginOrCreateAccount('progression_acc');
    const char = await persistence.createCharacter({
      accountId: acc.id,
      slotIndex: 0,
      name: 'Valkyria',
      classId: 'valkyrie',
    });

    const initialPower = computePowerRating(char);

    // Simulate leveling up, advancing waves, and equipping a mythic drop
    char.level = 5;
    char.currentWave = 4;
    char.highestWave = 4;
    char.gold = 980;
    const mythicDrop = generateLootItem('valkyrie', 4, 'mythic');
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
    expect(loaded.currentWave).toBe(4);
    expect(loaded.gold).toBe(980);

    const updatedStats = computeEffectiveStats(loaded);
    const updatedPower = computePowerRating(loaded);
    expect(updatedStats.attack).toBeGreaterThan(char.baseStats.attack);
    expect(updatedPower).toBeGreaterThan(initialPower);
  });
});
