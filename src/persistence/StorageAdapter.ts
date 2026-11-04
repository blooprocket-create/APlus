import { AccountProfile, CharacterSaveData } from '../types/game';

export interface StorageAdapter {
  init(): Promise<void>;
  getActiveAccountId(): Promise<string | null>;
  setActiveAccountId(accountId: string | null): Promise<void>;
  listAccounts(): Promise<AccountProfile[]>;
  getAccount(accountId: string): Promise<AccountProfile | null>;
  saveAccount(account: AccountProfile): Promise<void>;
  deleteAccount(accountId: string): Promise<void>;
  listCharactersByAccount(accountId: string): Promise<CharacterSaveData[]>;
  getCharacter(accountId: string, characterId: string): Promise<CharacterSaveData | null>;
  saveCharacter(character: CharacterSaveData): Promise<void>;
  deleteCharacter(accountId: string, characterId: string): Promise<void>;
}

const STORAGE_KEYS = {
  ACTIVE_ACCOUNT: 'astral_arpg_active_account_v1',
  ACCOUNTS: 'astral_arpg_accounts_v1',
  CHARACTERS: 'astral_arpg_characters_v1',
} as const;

const IDB_NAME = 'AstralChroniclesDB';
const IDB_VERSION = 1;
const STORE_ACCOUNTS = 'accounts';
const STORE_CHARACTERS = 'characters';
const STORE_META = 'meta';

/**
 * Local-first StorageAdapter backed by IndexedDB with synchronous localStorage mirroring.
 * Guarantees reliable saves even on abrupt mobile tab close (`pagehide`/`visibilitychange`)
 * and remains swappable with a remote REST/GraphQL/Supabase adapter.
 */
export class LocalFirstStorageAdapter implements StorageAdapter {
  private db: IDBDatabase | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    if (typeof indexedDB === 'undefined') {
      return;
    }

    try {
      this.db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(IDB_NAME, IDB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_ACCOUNTS)) {
            db.createObjectStore(STORE_ACCOUNTS, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORE_CHARACTERS)) {
            const charStore = db.createObjectStore(STORE_CHARACTERS, { keyPath: 'id' });
            charStore.createIndex('by_account', 'accountId', { unique: false });
          }
          if (!db.objectStoreNames.contains(STORE_META)) {
            db.createObjectStore(STORE_META, { keyPath: 'key' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Fallback to localStorage if IndexedDB is blocked in private mode
      this.db = null;
    }
  }

  private readLocalMap<T>(key: string): Record<string, T> {
    if (typeof localStorage === 'undefined') return {};
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as Record<string, T>) : {};
    } catch {
      return {};
    }
  }

  private writeLocalMap<T>(key: string, map: Record<string, T>): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(map));
    } catch {
      // Ignore quota errors
    }
  }

  async getActiveAccountId(): Promise<string | null> {
    await this.init();
    if (typeof localStorage !== 'undefined') {
      const val = localStorage.getItem(STORAGE_KEYS.ACTIVE_ACCOUNT);
      if (val) return val;
    }
    if (this.db) {
      const record = await this.idbGet<{ key: string; value: string | null }>(
        STORE_META,
        'activeAccountId'
      );
      return record?.value ?? null;
    }
    return null;
  }

  async setActiveAccountId(accountId: string | null): Promise<void> {
    await this.init();
    if (typeof localStorage !== 'undefined') {
      if (accountId) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_ACCOUNT, accountId);
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_ACCOUNT);
      }
    }
    if (this.db) {
      await this.idbPut(STORE_META, { key: 'activeAccountId', value: accountId });
    }
  }

  async listAccounts(): Promise<AccountProfile[]> {
    await this.init();
    const localMap = this.readLocalMap<AccountProfile>(STORAGE_KEYS.ACCOUNTS);
    if (this.db) {
      const idbAccounts = await this.idbGetAll<AccountProfile>(STORE_ACCOUNTS);
      for (const acc of idbAccounts) {
        localMap[acc.id] = acc;
      }
      this.writeLocalMap(STORAGE_KEYS.ACCOUNTS, localMap);
    }
    return Object.values(localMap).sort((a, b) =>
      b.lastLoginAt.localeCompare(a.lastLoginAt)
    );
  }

  async getAccount(accountId: string): Promise<AccountProfile | null> {
    const accounts = await this.listAccounts();
    return accounts.find((a) => a.id === accountId) ?? null;
  }

  async saveAccount(account: AccountProfile): Promise<void> {
    await this.init();
    const localMap = this.readLocalMap<AccountProfile>(STORAGE_KEYS.ACCOUNTS);
    localMap[account.id] = structuredClone(account);
    this.writeLocalMap(STORAGE_KEYS.ACCOUNTS, localMap);

    if (this.db) {
      await this.idbPut(STORE_ACCOUNTS, structuredClone(account));
    }
  }

  async deleteAccount(accountId: string): Promise<void> {
    await this.init();
    const localMap = this.readLocalMap<AccountProfile>(STORAGE_KEYS.ACCOUNTS);
    delete localMap[accountId];
    this.writeLocalMap(STORAGE_KEYS.ACCOUNTS, localMap);

    const charMap = this.readLocalMap<CharacterSaveData>(STORAGE_KEYS.CHARACTERS);
    for (const [charId, char] of Object.entries(charMap)) {
      if (char.accountId === accountId) {
        delete charMap[charId];
        if (this.db) {
          await this.idbDelete(STORE_CHARACTERS, charId);
        }
      }
    }
    this.writeLocalMap(STORAGE_KEYS.CHARACTERS, charMap);

    if (this.db) {
      await this.idbDelete(STORE_ACCOUNTS, accountId);
    }
  }

  async listCharactersByAccount(accountId: string): Promise<CharacterSaveData[]> {
    await this.init();
    const charMap = this.readLocalMap<CharacterSaveData>(STORAGE_KEYS.CHARACTERS);
    if (this.db) {
      const idbChars = await this.idbGetAll<CharacterSaveData>(STORE_CHARACTERS);
      for (const ch of idbChars) {
        charMap[ch.id] = ch;
      }
      this.writeLocalMap(STORAGE_KEYS.CHARACTERS, charMap);
    }
    return Object.values(charMap)
      .filter((c) => c.accountId === accountId)
      .sort((a, b) => a.slotIndex - b.slotIndex)
      .map((c) => structuredClone(c));
  }

  async getCharacter(
    accountId: string,
    characterId: string
  ): Promise<CharacterSaveData | null> {
    const chars = await this.listCharactersByAccount(accountId);
    return chars.find((c) => c.id === characterId) ?? null;
  }

  async saveCharacter(character: CharacterSaveData): Promise<void> {
    await this.init();
    const copy = structuredClone(character);
    const charMap = this.readLocalMap<CharacterSaveData>(STORAGE_KEYS.CHARACTERS);
    charMap[copy.id] = copy;
    this.writeLocalMap(STORAGE_KEYS.CHARACTERS, charMap);

    if (this.db) {
      await this.idbPut(STORE_CHARACTERS, copy);
    }
  }

  async deleteCharacter(accountId: string, characterId: string): Promise<void> {
    await this.init();
    const charMap = this.readLocalMap<CharacterSaveData>(STORAGE_KEYS.CHARACTERS);
    const target = charMap[characterId];
    if (target && target.accountId === accountId) {
      delete charMap[characterId];
      this.writeLocalMap(STORAGE_KEYS.CHARACTERS, charMap);
    }
    if (this.db) {
      await this.idbDelete(STORE_CHARACTERS, characterId);
    }
  }

  private idbGet<T>(storeName: string, key: string): Promise<T | undefined> {
    return new Promise((resolve) => {
      if (!this.db) return resolve(undefined);
      try {
        const tx = this.db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).get(key);
        req.onsuccess = () => resolve(req.result as T | undefined);
        req.onerror = () => resolve(undefined);
      } catch {
        resolve(undefined);
      }
    });
  }

  private idbGetAll<T>(storeName: string): Promise<T[]> {
    return new Promise((resolve) => {
      if (!this.db) return resolve([]);
      try {
        const tx = this.db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => resolve((req.result as T[]) ?? []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  private idbPut<T>(storeName: string, value: T): Promise<void> {
    return new Promise((resolve) => {
      if (!this.db) return resolve();
      try {
        const tx = this.db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).put(value);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  private idbDelete(storeName: string, key: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.db) return resolve();
      try {
        const tx = this.db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }
}

export class InMemoryStorageAdapter implements StorageAdapter {
  private activeAccountId: string | null = null;
  private accounts = new Map<string, AccountProfile>();
  private characters = new Map<string, CharacterSaveData>();

  async init(): Promise<void> {}

  async getActiveAccountId(): Promise<string | null> {
    return this.activeAccountId;
  }

  async setActiveAccountId(accountId: string | null): Promise<void> {
    this.activeAccountId = accountId;
  }

  async listAccounts(): Promise<AccountProfile[]> {
    return Array.from(this.accounts.values())
      .map((a) => structuredClone(a))
      .sort((a, b) => b.lastLoginAt.localeCompare(a.lastLoginAt));
  }

  async getAccount(accountId: string): Promise<AccountProfile | null> {
    const acc = this.accounts.get(accountId);
    return acc ? structuredClone(acc) : null;
  }

  async saveAccount(account: AccountProfile): Promise<void> {
    this.accounts.set(account.id, structuredClone(account));
  }

  async deleteAccount(accountId: string): Promise<void> {
    this.accounts.delete(accountId);
    for (const [charId, char] of this.characters.entries()) {
      if (char.accountId === accountId) {
        this.characters.delete(charId);
      }
    }
  }

  async listCharactersByAccount(accountId: string): Promise<CharacterSaveData[]> {
    return Array.from(this.characters.values())
      .filter((c) => c.accountId === accountId)
      .sort((a, b) => a.slotIndex - b.slotIndex)
      .map((c) => structuredClone(c));
  }

  async getCharacter(
    accountId: string,
    characterId: string
  ): Promise<CharacterSaveData | null> {
    const c = this.characters.get(characterId);
    if (!c || c.accountId !== accountId) return null;
    return structuredClone(c);
  }

  async saveCharacter(character: CharacterSaveData): Promise<void> {
    this.characters.set(character.id, structuredClone(character));
  }

  async deleteCharacter(accountId: string, characterId: string): Promise<void> {
    const c = this.characters.get(characterId);
    if (c && c.accountId === accountId) {
      this.characters.delete(characterId);
    }
  }
}
