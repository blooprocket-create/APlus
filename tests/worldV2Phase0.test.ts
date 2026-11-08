import { describe, expect, it } from 'vitest';
import { CANONICAL_HERO_NAMES, getCompanionClassesForPlayer } from '../src/game/CompanionRoster';
import {
  CANONICAL_HERO_NAMES as legacyHeroNames,
  getCompanionClassesForPlayer as legacyCompanionClasses,
} from '../src/game/QuestEngine';
import { OPENING_LEADS } from '../src/game/HearthmereOpening';
import { OPENING_STEPS } from '../src/game/HearthmereStory';

describe('World V2 phase-0 preservation contracts', () => {
  it('keeps the three canonical roles independent of prototype quest definitions', () => {
    expect(CANONICAL_HERO_NAMES).toEqual({
      warrior: 'Brynhildr',
      mage: 'Celestia',
      assassin: 'Akatsuki',
    });
    expect(getCompanionClassesForPlayer('warrior')).toEqual(['mage', 'assassin']);
    expect(getCompanionClassesForPlayer('mage')).toEqual(['warrior', 'assassin']);
    expect(getCompanionClassesForPlayer('assassin')).toEqual(['warrior', 'mage']);
  });

  it('keeps legacy import compatibility until consumers are migrated', () => {
    expect(legacyHeroNames).toBe(CANONICAL_HERO_NAMES);
    expect(legacyCompanionClasses).toBe(getCompanionClassesForPlayer);
  });

  it('preserves the opening story beats independently of their world coordinates', () => {
    const milestones = ['arrival', 'mara', 'rowan', 'shipment', 'escort', 'refuge', 'complete'];
    const indices = milestones.map(step => OPENING_STEPS.indexOf(step as (typeof OPENING_STEPS)[number]));
    expect(indices.every(index => index >= 0)).toBe(true);
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
    expect(Object.keys(OPENING_LEADS).sort()).toEqual(['assassin', 'mage', 'warrior']);
  });
});
