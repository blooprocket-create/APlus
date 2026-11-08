import type { CharacterClassId } from '../types/game';

/** Shared story-role identity, independent of retired prototype quests. */
export const CANONICAL_HERO_NAMES: Record<CharacterClassId, string> = {
  warrior: 'Brynhildr',
  mage: 'Celestia',
  assassin: 'Akatsuki',
};

/** The selected hero is accompanied by the other two canonical roles. */
export function getCompanionClassesForPlayer(
  playerClassId: CharacterClassId,
): [CharacterClassId, CharacterClassId] {
  if (playerClassId === 'assassin') return ['warrior', 'mage'];
  if (playerClassId === 'mage') return ['warrior', 'assassin'];
  return ['mage', 'assassin'];
}
