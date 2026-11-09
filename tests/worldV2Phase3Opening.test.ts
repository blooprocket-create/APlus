import { describe, expect, it } from 'vitest';
import { StoryAnchorRegistry } from '../src/world-v2/WorldAtlas';
import { stageAtlas } from '../src/world-v2/WorldGeographyStage';
import { OPENING_STEPS, type OpeningStep } from '../src/game/HearthmereStory';
import { OPENING_LEADS, openingDialogue, nextOpeningStep } from '../src/game/HearthmereScript';
import { OPENING_LEADS as OLD_OPENING_LEADS } from '../src/game/HearthmereOpening';
import { getCompanionClassesForPlayer } from '../src/game/CompanionRoster';
import {
  PROPOSED_OPENING_SITES, provisionalArrivalPlacement,
  tryInvestigateArrival, validateProposedOpeningSites,
} from '../src/world-v2/WorldV2OpeningPlan';

describe('Phase 3 opening integration contracts', () => {
  const anchors = new StoryAnchorRegistry(stageAtlas.anchors);

  it('maps all 13 real machine beats to distinct semantic sites without hardcoding old Hearthmere positions', () => {
    validateProposedOpeningSites(anchors);
    expect(PROPOSED_OPENING_SITES.map(site => site.step)).toEqual([...OPENING_STEPS]);
    expect(new Set(PROPOSED_OPENING_SITES.map(site => site.id)).size).toBe(OPENING_STEPS.length);
    expect(PROPOSED_OPENING_SITES[0]).toMatchObject({
      id: 'hearthmere.beat.arrival', reservedWithin: 'hearthmere.arrival', stage: 'playable-arrival',
    });
    expect(PROPOSED_OPENING_SITES.at(-2)?.reservedWithin).toBe('hearthmere.refuge');
    expect(PROPOSED_OPENING_SITES.at(-1)?.stage).toBe('pending-restage');
    expect(PROPOSED_OPENING_SITES.every(site => !('position' in site))).toBe(true);
    expect(() => validateProposedOpeningSites(new StoryAnchorRegistry([]))).toThrow(/Missing staging parent/);
  });

  it('retains original hero-specific opening dialogue and only selected hero controls the first lead', () => {
    expect(OLD_OPENING_LEADS).toBe(OPENING_LEADS);
    const placement = provisionalArrivalPlacement(anchors);
    expect(placement.spawn.x).toBeLessThan(placement.lead.x);
    const roles = ['warrior','mage','assassin'] as const;
    for (const role of roles) {
      const companionClasses = getCompanionClassesForPlayer(role);
      expect(new Set([role, ...companionClasses]).size).toBe(3);
      const line = openingDialogue(role,'arrival','Chosen Hero');
      expect(line?.text).toBe(OPENING_LEADS[role].arrival);
      const result = tryInvestigateArrival(role,'arrival','Chosen Hero',
        placement.lead,placement.lead,true);
      expect(result).toEqual({ next:'market',speaker:'Chosen Hero',text:OPENING_LEADS[role].arrival });
    }
    expect(OPENING_LEADS.warrior.arrival).not.toBe(OPENING_LEADS.mage.arrival);
  });

  it('never advances from a distant, underwater, unapproved or already-advanced objective', () => {
    const lead = {x:5,z:5};
    const role = 'warrior';
    expect(tryInvestigateArrival(role,'arrival','Brynhildr',{x:0,z:0},lead,true)).toBeNull();
    expect(tryInvestigateArrival(role,'arrival','Brynhildr',lead,lead,false)).toBeNull();
    for (const step of OPENING_STEPS.filter(step => step !== 'arrival')) {
      expect(tryInvestigateArrival(role,step,'Brynhildr',lead,lead,true)).toBeNull();
    }
  });

  it('retains the canonical machine sequence and never invents a 14th opening beat', () => {
    const visited: OpeningStep[] = [];
    let step: OpeningStep = 'arrival';
    for (let i = 0; i < OPENING_STEPS.length; i++) {
      visited.push(step);
      step = nextOpeningStep(step);
    }
    expect(visited).toEqual([...OPENING_STEPS]);
    expect(step).toBe('complete');
  });
});
