import { CharacterQuestState } from './quest';

export const MAX_CHARACTERS_PER_ACCOUNT = 3 as const;

export type CharacterSlotIndex = 0 | 1 | 2;

export type CharacterClassId = 'warrior' | 'mage' | 'assassin';

export type ZoneId = 'starting_town' | 'stomping_grounds' | 'market_crossing';

export type ItemRarity = 'common' | 'rare' | 'epic' | 'mythic';

export type EquipmentSlot = 'weapon' | 'charm';

export type AttackDeliveryStyle =
  | 'spear_melee'
  | 'arcane_caster'
  | 'kunai_ranged';

export interface InventoryItem {
  id: string;
  name: string;
  slot: EquipmentSlot;
  rarity: ItemRarity;
  levelReq: number;
  attackBonus: number;
  maxHpBonus: number;
  critRateBonus: number;
  icon: string;
}

export interface CharacterStats {
  maxHp: number;
  attack: number;
  defense: number;
  critRate: number;
  critDamage: number;
  moveSpeed: number;
  attackSpeed: number;
}

export interface SkillDefinition {
  id: 'basic' | 'dash' | 'skill1' | 'skill2' | 'ultimate';
  name: string;
  subtitle: string;
  description: string;
  cooldown: number;
  energyGain: number;
  energyCost: number;
  damageMultiplier: number;
  range: number;
  aoeRadius: number;
  colorHex: number;
  accentHex: number;
  keyHint: string;
}

export interface CharacterClassDefinition {
  id: CharacterClassId;
  name: string;
  archetypeLabel: string;
  title: string;
  element: string;
  elementColor: string;
  primaryColorHex: number;
  secondaryColorHex: number;
  hairColorHex: number;
  weaponColorHex: number;
  deliveryStyle: AttackDeliveryStyle;
  cadenceDescription: string;
  lore: string;
  playstyle: string;
  baseStats: CharacterStats;
  starterWeapon: InventoryItem;
  skills: {
    basic: SkillDefinition;
    dash: SkillDefinition;
    skill1: SkillDefinition;
    skill2: SkillDefinition;
    ultimate: SkillDefinition;
  };
}

export interface AccountProfile {
  id: string;
  username: string;
  displayName: string;
  createdAt: string;
  lastLoginAt: string;
  lastSelectedCharacterId: string | null;
}

export interface CharacterSaveData {
  id: string;
  accountId: string;
  slotIndex: CharacterSlotIndex;
  name: string;
  classId: CharacterClassId;
  level: number;
  xp: number;
  xpToNextLevel: number;
  gold: number;
  aetherCrystals: number;
  baseStats: CharacterStats;
  currentHp: number;
  ultimateEnergy: number;
  currentZone: ZoneId;
  questState?: CharacterQuestState;
  position: { x: number; y: number; z: number };
  currentWave: number;
  highestWave: number;
  stompingGroundsClears: number;
  enemiesDefeated: number;
  playTimeSeconds: number;
  equipped: {
    weapon: InventoryItem | null;
    charm: InventoryItem | null;
  };
  inventory: InventoryItem[];
  skillLevels: {
    basic: number;
    skill1: number;
    skill2: number;
    ultimate: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateCharacterInput {
  accountId: string;
  slotIndex?: CharacterSlotIndex;
  name: string;
  classId: CharacterClassId;
}
