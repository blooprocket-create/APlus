import type { CharacterClassId } from '../types/game';
import { OPENING_STEPS, type OpeningStep } from '../game/HearthmereStory';
import { OPENING_BEAT_TEXT, openingDialogue, nextOpeningStep } from '../game/HearthmereScript';
import type { StoryAnchorRegistry } from './WorldAtlas';
import type { WorldPosition } from './WorldCoordinates';

/**
 * Phase 3 proposed narrative footprint registry, deliberately without fixed
 * X/Z or world-geometry ownership. This is NOT a published canon anchor map.
 * The staged atlas still has only arrival/refuge authored anchors.
 */
export interface OpeningSiteSpec {
  readonly step: OpeningStep;
  readonly id: `hearthmere.beat.${OpeningStep}`;
  readonly reservedWithin: 'hearthmere.arrival' | 'hearthmere.refuge';
  readonly clearanceRadius: number;
  readonly stage: 'playable-arrival' | 'pending-restage';
  readonly title: string;
}
export const PROPOSED_OPENING_SITES: readonly OpeningSiteSpec[] = Object.freeze(
  OPENING_STEPS.map(step => Object.freeze({
    step,
    id: `hearthmere.beat.${step}` as const,
    reservedWithin: step === 'refuge' || step === 'complete'
      ? 'hearthmere.refuge' as const : 'hearthmere.arrival' as const,
    clearanceRadius: step === 'square' || step === 'far_hold' ? 7 : 3,
    stage: step === 'arrival' ? 'playable-arrival' as const : 'pending-restage' as const,
    title: OPENING_BEAT_TEXT[step].title,
  })),
);

/** Validates the semantic graph against a supplied compiled atlas without
 * publishing the proposed story sites or accepting its lab coordinates.
 */
export function validateProposedOpeningSites(anchors: StoryAnchorRegistry): void {
  const seen = new Set<string>();
  if (PROPOSED_OPENING_SITES.length !== OPENING_STEPS.length) {
    throw new Error('Opening site inventory lost machine story steps');
  }
  for (const site of PROPOSED_OPENING_SITES) {
    if (seen.has(site.id)) throw new Error('Duplicate proposed story site: ' + site.id);
    seen.add(site.id);
    if (!anchors.has(site.reservedWithin)) {
      throw new Error('Missing staging parent for ' + site.id + ': ' + site.reservedWithin);
    }
    const parent = anchors.resolve(site.reservedWithin);
    if (site.clearanceRadius >= parent.clearanceRadius) {
      throw new Error('Proposed story site exceeds staging parent clearance: ' + site.id);
    }
  }
}
export interface ProvisionalArrivalPlacement {
  readonly regionId: 'hearthmere.arrival';
  readonly spawn: WorldPosition;
  readonly lead: WorldPosition;
}

/** A reversible local composition inside the already-baked ARRIVAL clearing.
 * When a canonical town plan is approved, author real world locations for
 * these IDs rather than copying these offsets to production quests.
 */
export function provisionalArrivalPlacement(anchors: StoryAnchorRegistry): ProvisionalArrivalPlacement {
  validateProposedOpeningSites(anchors);
  const parent = anchors.resolve('hearthmere.arrival');
  if (parent.clearanceRadius < 8) throw new Error('Arrival site requires an eight-unit walkable clearing');
  return {
    regionId: 'hearthmere.arrival',
    spawn: { x: parent.position.x - 3.5, y: parent.position.y, z: parent.position.z },
    lead: { x: parent.position.x + 2.5, y: parent.position.y, z: parent.position.z },
  };
}

/** First Phase 3 playable interaction: delegates the story script and step
 * transition to the SAME pure owners used by the existing HearthmereOpening.
 * All later objectives remain unported: there is no parallel quest engine.
 */
export function tryInvestigateArrival(
  role: CharacterClassId,
  step: OpeningStep,
  heroName: string,
  player: Pick<WorldPosition, 'x' | 'z'>,
  lead: Pick<WorldPosition, 'x' | 'z'>,
  groundSafe: boolean,
): { readonly next: OpeningStep; readonly speaker: string; readonly text: string } | null {
  if (step !== 'arrival' || !groundSafe ||
      Math.hypot(player.x - lead.x, player.z - lead.z) > 2.5) return null;
  const dialogue = openingDialogue(role, step, heroName);
  if (!dialogue) throw new Error('Missing shared Hearthmere arrival dialogue');
  return { next: nextOpeningStep(step), speaker: dialogue.speaker, text: dialogue.text };
}
