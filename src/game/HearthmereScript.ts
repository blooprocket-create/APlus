import type { CharacterClassId } from '../types/game';
import { OPENING_STEPS, type OpeningStep } from './HearthmereStory';

/**
 * One script authority for the live Hearthmere opening and a gradual World V2
 * restaging. No rendering or legacy X/Z coordinates are allowed here.
 *
 * V2 intentionally consumes only the first beat during Phase 3.0; the legacy
 * opening retains the remaining story execution until proper integration.
 */
export interface OpeningLine {
  speaker: string;
  text: string;
  pitch: number;
}
export const OPENING_LEADS: Record<CharacterClassId, {
  hint: string; arrival: string; shipment: string;
}> = {
  warrior: {
    hint: 'Check the Covenant seal on the guard’s cart at the west gate.',
    arrival: 'That is the Covenant’s seal. They changed the escort order after I signed it.',
    shipment: 'The escort order says to clear the square before you open it.',
  },
  mage: {
    hint: 'Inspect the stalled water pump by the west gate.',
    arrival: 'The record says this pump was serviced. The old fitting hasn’t even been touched.',
    shipment: 'That fitting is cracked. Stop before you break the seal.',
  },
  assassin: {
    hint: 'Check the courier’s manifest at the west gate.',
    arrival: 'He left the missing worker’s name off the manifest. He’s heading for the square.',
    shipment: 'The courier left in a hurry. What was he really delivering?',
  },
};
export const OPENING_BEAT_TEXT: Record<OpeningStep, {
  title: string;
  action?: string;
}> = {
  arrival: { title: 'Find your lead', action: 'Investigate' },
  market: { title: 'Ask the gatekeeper', action: 'Ask for directions' },
  mara: { title: 'Meet Mara at the well', action: 'Speak to Mara' },
  rowan: { title: 'Help Rowan with the cart', action: 'Brace the cart' },
  cart_test: { title: 'Test the repaired wheel' },
  shipment: { title: 'Investigate the shipment', action: 'Approach the shipment' },
  square: { title: 'Reach the stranded civilians', action: 'Rally the civilians' },
  yard_gate: { title: 'Open the rear gate', action: 'Clear the gate' },
  load_cart: { title: 'Help the injured resident', action: 'Help onto the cart' },
  far_hold: { title: 'Cross the exposed mill road', action: 'Signal the group' },
  escort: { title: 'Walk the group to refuge' },
  refuge: { title: 'Account for the survivors', action: 'Speak to Mara' },
  complete: { title: 'A foothold outside Hearthmere' },
};

export function nextOpeningStep(current: OpeningStep): OpeningStep {
  const i = OPENING_STEPS.indexOf(current);
  return OPENING_STEPS[i + 1] ?? current;
}

export function openingDialogue(
  role: CharacterClassId, step: OpeningStep, name: string,
): OpeningLine | null {
  const lines: Partial<Record<OpeningStep, OpeningLine>> = {
    arrival: { speaker: name, text: OPENING_LEADS[role].arrival, pitch: 180 },
    market: { speaker: 'Gatekeeper',
      text: 'Royal square, past the well. Ask Mara. She knows which roads they still let us use.', pitch: 125 },
    mara: { speaker: 'Mara',
      text: 'The well cart goes first. Rowan’s at the forge with a bad wheel. Take him this pin, will you?', pitch: 196 },
    rowan: { speaker: 'Rowan',
      text: 'Hold the axle there. Right. Try it over the step. If it holds there, it holds all the way to the well.', pitch: 232 },
    square: { speaker: 'Mara',
      text: 'I’m here. Keep them behind you. Rowan’s cart should still be by the rear gate.', pitch: 196 },
    yard_gate: { speaker: 'Mara',
      text: 'That’s it. Bring the cart through before the road gives.', pitch: 196 },
    load_cart: { speaker: 'Resident', text: 'I can sit up. Get us to the wall and I’ll hold on.', pitch: 152 },
    far_hold: { speaker: 'Mara', text: 'Everyone move. Stay together past the bend.', pitch: 196 },
    refuge: { speaker: 'Mara',
      text: 'They’ve put troops on every way back in. Rowan’s still out there. A carter saw the soldiers take the mill road.', pitch: 196 },
  };
  return lines[step] ?? null;
}
