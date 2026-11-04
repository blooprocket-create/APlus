import { CHARACTER_CLASSES } from '../data/classes';
import {
  AccountProfile,
  CharacterSlotIndex,
  CharacterSaveData,
  CreateCharacterInput,
  MAX_CHARACTERS_PER_ACCOUNT,
} from '../types/game';
import { LocalFirstStorageAdapter, StorageAdapter } from './StorageAdapter';

export class CharacterLimitExceededError extends Error {
  constructor(accountId: string) {
    super(
      `Account "${accountId}" already has the maximum of ${MAX_CHARACTERS_PER_ACCOUNT} characters.`
    );
    this.name = 'CharacterLimitExceededError';
  }
}

export class CharacterSlotOccupiedError extends Error {
  constructor(slotIndex: number) {
    super(`Character slot ${slotIndex + 1} is already occupied.`);
    this.name = 'CharacterSlotOccupiedError';
  }
}

function generateId(prefix: string): string {
  const rand = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

export function xpRequiredForLevel(level: number): number {
  return Math.round(100 * Math.pow(level, 1.35));
}

export class PersistenceManager {
  private adapter: StorageAdapter;

  constructor(adapter: StorageAdapter = new LocalFirstStorageAdapter()) {
    this.adapter = adapter;
  }

  async init(): Promise<void> {
    await this.adapter.init();
  }

  /**
   * Ensures at least one account exists or signs into an existing account by username.
   */
  async loginOrCreateAccount(usernameInput: string, displayNameInput?: string): Promise<AccountProfile> {
    const normalizedUsername = usernameInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (normalizedUsername.length < 2) {
      throw new Error('Account username must contain at least 2 alphanumeric characters.');
    }

    const accounts = await this.adapter.listAccounts();
    const existing = accounts.find((a) => a.username === normalizedUsername);
    const now = new Date().toISOString();

    if (existing) {
      existing.lastLoginAt = now;
      if (displayNameInput && displayNameInput.trim().length > 0) {
        existing.displayName = displayNameInput.trim();
      }
      await this.adapter.saveAccount(existing);
      await this.adapter.setActiveAccountId(existing.id);
      return existing;
    }

    const newAccount: AccountProfile = {
      id: generateId('acc'),
      username: normalizedUsername,
      displayName: (displayNameInput?.trim() || usernameInput.trim()),
      createdAt: now,
      lastLoginAt: now,
      lastSelectedCharacterId: null,
    };

    await this.adapter.saveAccount(newAccount);
    await this.adapter.setActiveAccountId(newAccount.id);
    return newAccount;
  }

  async getActiveAccount(): Promise<AccountProfile | null> {
    const activeId = await this.adapter.getActiveAccountId();
    if (activeId) {
      const acc = await this.adapter.getAccount(activeId);
      if (acc) return acc;
    }
    const all = await this.adapter.listAccounts();
    if (all.length > 0) {
      await this.adapter.setActiveAccountId(all[0].id);
      return all[0];
    }
    return null;
  }

  async listAccounts(): Promise<AccountProfile[]> {
    return this.adapter.listAccounts();
  }

  async switchAccount(accountId: string): Promise<AccountProfile> {
    const acc = await this.adapter.getAccount(accountId);
    if (!acc) {
      throw new Error(`Account "${accountId}" not found.`);
    }
    acc.lastLoginAt = new Date().toISOString();
    await this.adapter.saveAccount(acc);
    await this.adapter.setActiveAccountId(acc.id);
    return acc;
  }

  /**
   * Lists the characters belonging to a specific account, sorted by slotIndex (0..2).
   */
  async getCharactersForAccount(accountId: string): Promise<CharacterSaveData[]> {
    return this.adapter.listCharactersByAccount(accountId);
  }

  /**
   * Returns a 3-element tuple representing Slots 0, 1, and 2 for the given account.
   */
  async getCharacterSlots(
    accountId: string
  ): Promise<[CharacterSaveData | null, CharacterSaveData | null, CharacterSaveData | null]> {
    const chars = await this.getCharactersForAccount(accountId);
    const slots: [CharacterSaveData | null, CharacterSaveData | null, CharacterSaveData | null] = [
      null,
      null,
      null,
    ];
    for (const ch of chars) {
      if (ch.slotIndex >= 0 && ch.slotIndex < MAX_CHARACTERS_PER_ACCOUNT) {
        slots[ch.slotIndex] = ch;
      }
    }
    return slots;
  }

  /**
   * Creates a new character for an account, strictly enforcing the 3-character maximum per account.
   */
  async createCharacter(input: CreateCharacterInput): Promise<CharacterSaveData> {
    const trimmedName = input.name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 18) {
      throw new Error('Character name must be between 2 and 18 characters.');
    }

    const existingChars = await this.adapter.listCharactersByAccount(input.accountId);
    if (existingChars.length >= MAX_CHARACTERS_PER_ACCOUNT) {
      throw new CharacterLimitExceededError(input.accountId);
    }

    const occupiedSlots = new Set(existingChars.map((c) => c.slotIndex));
    let targetSlot: CharacterSlotIndex;

    if (input.slotIndex !== undefined) {
      if (input.slotIndex < 0 || input.slotIndex >= MAX_CHARACTERS_PER_ACCOUNT) {
        throw new Error(`Invalid character slot index: ${input.slotIndex}. Must be 0, 1, or 2.`);
      }
      if (occupiedSlots.has(input.slotIndex)) {
        throw new CharacterSlotOccupiedError(input.slotIndex);
      }
      targetSlot = input.slotIndex;
    } else {
      const candidate = ([0, 1, 2] as CharacterSlotIndex[]).find(
        (slot) => !occupiedSlots.has(slot)
      );
      if (candidate === undefined) {
        throw new CharacterLimitExceededError(input.accountId);
      }
      targetSlot = candidate;
    }

    const classDef = CHARACTER_CLASSES[input.classId];
    if (!classDef) {
      throw new Error(`Unknown character class: ${input.classId}`);
    }

    const now = new Date().toISOString();
    const starterWeapon = structuredClone(classDef.starterWeapon);

    const newChar: CharacterSaveData = {
      id: generateId('char'),
      accountId: input.accountId,
      slotIndex: targetSlot,
      name: trimmedName,
      classId: input.classId,
      level: 1,
      xp: 0,
      xpToNextLevel: xpRequiredForLevel(1),
      gold: 150,
      aetherCrystals: 25,
      baseStats: structuredClone(classDef.baseStats),
      currentHp: classDef.baseStats.maxHp + starterWeapon.maxHpBonus,
      ultimateEnergy: 35,
      position: { x: 0, y: 0, z: 0 },
      currentWave: 1,
      highestWave: 1,
      enemiesDefeated: 0,
      playTimeSeconds: 0,
      equipped: {
        weapon: starterWeapon,
        charm: null,
      },
      inventory: [starterWeapon],
      skillLevels: {
        basic: 1,
        skill1: 1,
        skill2: 1,
        ultimate: 1,
      },
      createdAt: now,
      updatedAt: now,
    };

    await this.adapter.saveCharacter(newChar);

    const account = await this.adapter.getAccount(input.accountId);
    if (account) {
      account.lastSelectedCharacterId = newChar.id;
      await this.adapter.saveAccount(account);
    }

    return newChar;
  }

  /**
   * Saves updated character state, verifying account ownership and slot constraints.
   */
  async saveCharacter(character: CharacterSaveData): Promise<CharacterSaveData> {
    const existingForAccount = await this.adapter.listCharactersByAccount(character.accountId);
    const isExisting = existingForAccount.some((c) => c.id === character.id);

    if (!isExisting && existingForAccount.length >= MAX_CHARACTERS_PER_ACCOUNT) {
      throw new CharacterLimitExceededError(character.accountId);
    }

    const updated: CharacterSaveData = {
      ...structuredClone(character),
      updatedAt: new Date().toISOString(),
    };
    await this.adapter.saveCharacter(updated);

    const account = await this.adapter.getAccount(character.accountId);
    if (account && account.lastSelectedCharacterId !== updated.id) {
      account.lastSelectedCharacterId = updated.id;
      await this.adapter.saveAccount(account);
    }

    return updated;
  }

  async deleteCharacter(accountId: string, characterId: string): Promise<void> {
    await this.adapter.deleteCharacter(accountId, characterId);
    const account = await this.adapter.getAccount(accountId);
    if (account && account.lastSelectedCharacterId === characterId) {
      const remaining = await this.adapter.listCharactersByAccount(accountId);
      account.lastSelectedCharacterId = remaining[0]?.id ?? null;
      await this.adapter.saveAccount(account);
    }
  }
}
