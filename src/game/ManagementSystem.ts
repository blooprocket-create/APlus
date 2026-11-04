import {
  BasicRuneId,
  CharacterClassId,
  CharacterSaveData,
  CompanionConfig,
  CompanionTacticalStance,
  InventoryItem,
  ItemRarity,
  Skill1RuneId,
  Skill2RuneId,
  SkillRuneSelection,
  UltimateRuneId,
} from '../types/game';

export interface RuneMetadata {
  id: string;
  name: string;
  effectSummary: string;
}

export const SKILL_RUNE_CATALOG: {
  basic: Record<BasicRuneId, RuneMetadata>;
  skill1: Record<Skill1RuneId, RuneMetadata>;
  skill2: Record<Skill2RuneId, RuneMetadata>;
  ultimate: Record<UltimateRuneId, RuneMetadata>;
} = {
  basic: {
    gale_tempo: {
      id: 'gale_tempo',
      name: 'Gale Tempo Rune',
      effectSummary: '+20% Basic Attack Speed & +15% Projectile/Thrust Velocity',
    },
    siphon_edge: {
      id: 'siphon_edge',
      name: 'Astral Siphon Rune',
      effectSummary: 'Restores 2% Max HP per Basic Combo & +4 Bonus Ultimate Energy',
    },
  },
  skill1: {
    overcharge: {
      id: 'overcharge',
      name: 'Overcharged Nova Rune',
      effectSummary: '+28% Skill 1 Damage & +25% AoE / Barrage Size',
    },
    quickcast: {
      id: 'quickcast',
      name: 'Quickcast Echo Rune',
      effectSummary: '-30% Skill 1 Cooldown & +6 Bonus Energy Gain',
    },
  },
  skill2: {
    twin_cataclysm: {
      id: 'twin_cataclysm',
      name: 'Twin Cataclysm Rune',
      effectSummary: '+30% Skill 2 Damage & spawns an extra Meteor / Trap / Shockwave',
    },
    aegis_ward: {
      id: 'aegis_ward',
      name: 'Sanctuary Ward Rune',
      effectSummary: 'Casting Skill 2 heals 10% Max HP & grants 0.8s Invulnerability',
    },
  },
  ultimate: {
    triad_chain: {
      id: 'triad_chain',
      name: 'Triad Chain Resonance',
      effectSummary: 'Ultimate commands both Companions to unleash synchronized bursts & refunds 25% Energy',
    },
    sovereign_exec: {
      id: 'sovereign_exec',
      name: 'Sovereign Execution Rune',
      effectSummary: '+45% Ultimate Burst Damage & +25% Critical Damage',
    },
  },
};

export const COMPANION_STANCE_INFO: Record<
  CompanionTacticalStance,
  { label: string; description: string; attackRateMult: number; damageMult: number; leashRange: number }
> = {
  aggressive: {
    label: '⚔️ Relentless Assault',
    description: 'Companions hunt targets up to 18m away with +25% attack rate and +20% damage.',
    attackRateMult: 1.25,
    damageMult: 1.2,
    leashRange: 18.0,
  },
  balanced: {
    label: '⚖️ Triad Formation',
    description: 'Balanced wing formation with 13.5m engagement range and steady skill cadence.',
    attackRateMult: 1.0,
    damageMult: 1.0,
    leashRange: 13.5,
  },
  support: {
    label: '🛡️ Vanguard Aegis',
    description: 'Companions stay close (8.5m), prioritize crowd-control & heal you for 3% HP every 4s.',
    attackRateMult: 0.95,
    damageMult: 0.9,
    leashRange: 8.5,
  },
};

const RARITY_WEIGHT: Record<ItemRarity, number> = {
  common: 1,
  rare: 2,
  epic: 3,
  mythic: 4,
};

export function createDefaultSkillRunes(): SkillRuneSelection {
  return {
    basic: 'gale_tempo',
    skill1: 'overcharge',
    skill2: 'twin_cataclysm',
    ultimate: 'triad_chain',
  };
}

export function ensureSkillRunes(char: CharacterSaveData): SkillRuneSelection {
  if (!char.skillRunes) {
    char.skillRunes = createDefaultSkillRunes();
  }
  return char.skillRunes;
}

export function ensureCompanionConfigs(
  char: CharacterSaveData
): Record<CharacterClassId, CompanionConfig> {
  if (!char.companionConfigs) {
    char.companionConfigs = {
      warrior: {
        classId: 'warrior',
        stance: 'aggressive',
        bondLevel: 1,
        equipped: { weapon: null, charm: null },
      },
      mage: {
        classId: 'mage',
        stance: 'support',
        bondLevel: 1,
        equipped: { weapon: null, charm: null },
      },
      assassin: {
        classId: 'assassin',
        stance: 'aggressive',
        bondLevel: 1,
        equipped: { weapon: null, charm: null },
      },
    };
  }
  return char.companionConfigs;
}

export class ManagementSystem {
  public static getItemPowerScore(item: InventoryItem): number {
    return Math.round(
      item.attackBonus * 6.5 +
        item.maxHpBonus * 0.45 +
        item.critRateBonus * 400 +
        (item.upgradeLevel ?? 0) * 25
    );
  }

  public static compareWithEquipped(
    item: InventoryItem,
    equipped: InventoryItem | null
  ): { attackDelta: number; hpDelta: number; critDelta: number; powerDelta: number } {
    if (!equipped) {
      return {
        attackDelta: item.attackBonus,
        hpDelta: item.maxHpBonus,
        critDelta: item.critRateBonus,
        powerDelta: ManagementSystem.getItemPowerScore(item),
      };
    }
    return {
      attackDelta: item.attackBonus - equipped.attackBonus,
      hpDelta: item.maxHpBonus - equipped.maxHpBonus,
      critDelta: Number((item.critRateBonus - equipped.critRateBonus).toFixed(3)),
      powerDelta:
        ManagementSystem.getItemPowerScore(item) -
        ManagementSystem.getItemPowerScore(equipped),
    };
  }

  public static isItemEquippedAnywhere(char: CharacterSaveData, itemId: string): boolean {
    if (char.equipped.weapon?.id === itemId || char.equipped.charm?.id === itemId) {
      return true;
    }
    const configs = ensureCompanionConfigs(char);
    for (const c of Object.values(configs)) {
      if (c.equipped.weapon?.id === itemId || c.equipped.charm?.id === itemId) {
        return true;
      }
    }
    return false;
  }

  public static sortAndFilterInventory(
    items: InventoryItem[],
    slotFilter: 'all' | 'weapon' | 'charm' = 'all',
    sortBy: 'power' | 'rarity' | 'attack' = 'power'
  ): InventoryItem[] {
    const filtered = items.filter((item) =>
      slotFilter === 'all' ? true : item.slot === slotFilter
    );

    return filtered.sort((a, b) => {
      if (sortBy === 'rarity') {
        const diff = RARITY_WEIGHT[b.rarity] - RARITY_WEIGHT[a.rarity];
        if (diff !== 0) return diff;
      } else if (sortBy === 'attack') {
        const diff = b.attackBonus - a.attackBonus;
        if (diff !== 0) return diff;
      }
      return (
        ManagementSystem.getItemPowerScore(b) - ManagementSystem.getItemPowerScore(a)
      );
    });
  }

  public static toggleLockItem(char: CharacterSaveData, itemId: string): boolean {
    const item = char.inventory.find((i) => i.id === itemId);
    if (!item) return false;
    item.locked = !item.locked;
    return Boolean(item.locked);
  }

  /**
   * Starforge Enhancement: Upgrades an item up to +10 using Gold & Aether Crystals.
   */
  public static upgradeItemStarforge(
    char: CharacterSaveData,
    itemId: string
  ): { success: boolean; message: string; item?: InventoryItem } {
    const item = char.inventory.find((i) => i.id === itemId);
    if (!item) {
      return { success: false, message: 'Item not found in inventory.' };
    }

    const currentUpgrade = item.upgradeLevel ?? 0;
    if (currentUpgrade >= 10) {
      return { success: false, message: 'Item has already reached Maximum Starforge +10!' };
    }

    const goldCost = 80 + currentUpgrade * 65;
    const crystalCost = 8 + currentUpgrade * 5;

    if (char.gold < goldCost || char.aetherCrystals < crystalCost) {
      return {
        success: false,
        message: `Requires ${goldCost}G & ${crystalCost}✦ Crystals to Starforge.`,
      };
    }

    char.gold -= goldCost;
    char.aetherCrystals -= crystalCost;
    item.upgradeLevel = currentUpgrade + 1;
    item.attackBonus = Math.round(item.attackBonus * 1.14 + 4);
    item.maxHpBonus = Math.round(item.maxHpBonus * 1.12 + 12);
    item.critRateBonus = Number(Math.min(0.35, item.critRateBonus + 0.008).toFixed(3));

    // Synchronize if equipped on player or companion
    if (char.equipped.weapon?.id === item.id) char.equipped.weapon = structuredClone(item);
    if (char.equipped.charm?.id === item.id) char.equipped.charm = structuredClone(item);
    const configs = ensureCompanionConfigs(char);
    for (const c of Object.values(configs)) {
      if (c.equipped.weapon?.id === item.id) c.equipped.weapon = structuredClone(item);
      if (c.equipped.charm?.id === item.id) c.equipped.charm = structuredClone(item);
    }

    return {
      success: true,
      message: `Starforged ${item.name} to Lv.+${item.upgradeLevel}!`,
      item,
    };
  }

  /**
   * Salvages a single unequipped, unlocked item for Gold and Aether Crystals.
   */
  public static salvageItem(
    char: CharacterSaveData,
    itemId: string
  ): { success: boolean; goldGained: number; crystalsGained: number; message: string } {
    const idx = char.inventory.findIndex((i) => i.id === itemId);
    if (idx === -1) {
      return { success: false, goldGained: 0, crystalsGained: 0, message: 'Item not found.' };
    }

    const item = char.inventory[idx];
    if (item.locked) {
      return {
        success: false,
        goldGained: 0,
        crystalsGained: 0,
        message: 'Item is locked! Unlock it before salvaging.',
      };
    }

    if (ManagementSystem.isItemEquippedAnywhere(char, itemId)) {
      return {
        success: false,
        goldGained: 0,
        crystalsGained: 0,
        message: 'Cannot salvage an item currently equipped by you or a companion.',
      };
    }

    const rWeight = RARITY_WEIGHT[item.rarity];
    const goldGained = 35 * rWeight + (item.upgradeLevel ?? 0) * 25;
    const crystalsGained = 4 * rWeight + (item.upgradeLevel ?? 0) * 3;

    char.inventory.splice(idx, 1);
    char.gold += goldGained;
    char.aetherCrystals += crystalsGained;

    return {
      success: true,
      goldGained,
      crystalsGained,
      message: `Salvaged ${item.name} for +${goldGained}G & +${crystalsGained}✦!`,
    };
  }

  /**
   * Bulk-salvages all unequipped, unlocked items up to the specified rarity.
   */
  public static salvageBulkByRarity(
    char: CharacterSaveData,
    maxRarity: 'common' | 'rare' = 'rare'
  ): { count: number; goldGained: number; crystalsGained: number } {
    const maxWeight = RARITY_WEIGHT[maxRarity];
    let count = 0;
    let goldGained = 0;
    let crystalsGained = 0;

    for (let i = char.inventory.length - 1; i >= 0; i--) {
      const item = char.inventory[i];
      if (item.locked) continue;
      if (RARITY_WEIGHT[item.rarity] > maxWeight) continue;
      if (ManagementSystem.isItemEquippedAnywhere(char, item.id)) continue;

      const rWeight = RARITY_WEIGHT[item.rarity];
      const g = 35 * rWeight + (item.upgradeLevel ?? 0) * 25;
      const c = 4 * rWeight + (item.upgradeLevel ?? 0) * 3;
      goldGained += g;
      crystalsGained += c;
      count += 1;
      char.inventory.splice(i, 1);
    }

    char.gold += goldGained;
    char.aetherCrystals += crystalsGained;
    return { count, goldGained, crystalsGained };
  }

  /**
   * Equips an inventory item onto a specific Companion.
   */
  public static equipItemOnCompanion(
    char: CharacterSaveData,
    companionClass: CharacterClassId,
    itemId: string
  ): { success: boolean; message: string } {
    const item = char.inventory.find((i) => i.id === itemId);
    if (!item) return { success: false, message: 'Item not found.' };

    const configs = ensureCompanionConfigs(char);
    const compCfg = configs[companionClass];
    if (item.slot === 'weapon') {
      compCfg.equipped.weapon = structuredClone(item);
    } else {
      compCfg.equipped.charm = structuredClone(item);
    }

    return {
      success: true,
      message: `Assigned ${item.name} to ${companionClass.toUpperCase()} companion!`,
    };
  }

  public static setCompanionStance(
    char: CharacterSaveData,
    companionClass: CharacterClassId,
    stance: CompanionTacticalStance
  ): void {
    const configs = ensureCompanionConfigs(char);
    configs[companionClass].stance = stance;
  }

  public static trainCompanionBond(
    char: CharacterSaveData,
    companionClass: CharacterClassId
  ): { success: boolean; newBondLevel: number; message: string } {
    const configs = ensureCompanionConfigs(char);
    const cfg = configs[companionClass];
    if (cfg.bondLevel >= 10) {
      return {
        success: false,
        newBondLevel: cfg.bondLevel,
        message: 'Companion Bond has reached Max Rank 10!',
      };
    }

    const goldCost = 100 * cfg.bondLevel;
    const crystalCost = 12 * cfg.bondLevel;
    if (char.gold < goldCost || char.aetherCrystals < crystalCost) {
      return {
        success: false,
        newBondLevel: cfg.bondLevel,
        message: `Requires ${goldCost}G & ${crystalCost}✦ to train Companion Bond.`,
      };
    }

    char.gold -= goldCost;
    char.aetherCrystals -= crystalCost;
    cfg.bondLevel += 1;

    return {
      success: true,
      newBondLevel: cfg.bondLevel,
      message: `Companion Bond ascended to Rank ${cfg.bondLevel}! (+12% Companion Power)`,
    };
  }

  /**
   * Upgrades one of the player's 4 scalable ability ranks (basic, skill1, skill2, ultimate).
   */
  public static upgradeAbilityRank(
    char: CharacterSaveData,
    skillKey: 'basic' | 'skill1' | 'skill2' | 'ultimate'
  ): { success: boolean; newLevel: number; message: string } {
    const currentLv = char.skillLevels[skillKey];
    if (currentLv >= 15) {
      return {
        success: false,
        newLevel: currentLv,
        message: 'Ability has reached Maximum Mastery Rank 15!',
      };
    }

    const goldCost = 90 * currentLv;
    const crystalCost = 10 * currentLv;
    if (char.gold < goldCost || char.aetherCrystals < crystalCost) {
      return {
        success: false,
        newLevel: currentLv,
        message: `Requires ${goldCost}G & ${crystalCost}✦ to ascend ability rank.`,
      };
    }

    char.gold -= goldCost;
    char.aetherCrystals -= crystalCost;
    char.skillLevels[skillKey] = currentLv + 1;

    return {
      success: true,
      newLevel: char.skillLevels[skillKey],
      message: `Ascended ${skillKey.toUpperCase()} to Rank ${char.skillLevels[skillKey]}!`,
    };
  }
}
