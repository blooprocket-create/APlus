import { CharacterClassId, EquipmentSlot, InventoryItem, ItemRarity } from '../types/game';

const WEAPON_NAMES: Record<CharacterClassId, string[]> = {
  warrior: [
    'Stormguard Halberd',
    'Golden Dawn Partisan',
    'Dragoon Thunder-Spear',
    'Heavensfall Aegis Lance',
  ],
  mage: [
    'Starlight Astrolabe',
    'Nebula Echo Grimoire',
    'Voidweaver Chronos Codex',
    'Celestial Sovereign Atlas',
  ],
  assassin: [
    'Shadowfang Twin-Kunai',
    'Crimson Dusk Chakram',
    'Phantom Eclipse Shuriken',
    'Eternity Nightblade Daggers',
  ],
};

const CHARM_NAMES = [
  'Aether Lotus Pendant',
  'Signet of the Crimson Valkyrie',
  'Starfall Hourglass',
  'Crown of the Astral Eclipse',
];

export function generateLootItem(
  classId: CharacterClassId,
  wave: number,
  forceRarity?: ItemRarity
): InventoryItem {
  const roll = Math.random();
  let rarity: ItemRarity = forceRarity ?? 'common';
  if (!forceRarity) {
    if (roll > 0.92) rarity = 'mythic';
    else if (roll > 0.72) rarity = 'epic';
    else if (roll > 0.35) rarity = 'rare';
  }

  const rarityMultiplier: Record<ItemRarity, number> = {
    common: 1.0,
    rare: 1.35,
    epic: 1.8,
    mythic: 2.5,
  };

  const slot: EquipmentSlot = Math.random() < 0.58 ? 'weapon' : 'charm';
  const mult = rarityMultiplier[rarity];
  const scale = Math.max(1, wave);

  const rarityIdx =
    rarity === 'common' ? 0 : rarity === 'rare' ? 1 : rarity === 'epic' ? 2 : 3;

  const baseName =
    slot === 'weapon'
      ? WEAPON_NAMES[classId][rarityIdx]
      : CHARM_NAMES[rarityIdx];

  const attackBonus = Math.round((10 + scale * 4.5) * mult);
  const maxHpBonus = Math.round((35 + scale * 16) * mult);
  const critRateBonus = Number((0.02 * mult + Math.min(0.12, scale * 0.004)).toFixed(3));

  const icon =
    slot === 'charm'
      ? '🔮'
      : classId === 'warrior'
        ? '🔱'
        : classId === 'mage'
          ? '💠'
          : '🗡️';

  return {
    id: `item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name: `${baseName} +${Math.min(9, Math.ceil(wave / 2))}`,
    slot,
    rarity,
    levelReq: Math.max(1, Math.floor(wave / 2)),
    attackBonus,
    maxHpBonus,
    critRateBonus,
    icon,
  };
}
