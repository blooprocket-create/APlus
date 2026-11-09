import type { CharacterClassId } from '../types/game';
import { CANONICAL_HERO_NAMES } from '../game/CompanionRoster';
import { OPENING_STEPS, type OpeningStep } from '../game/HearthmereStory';
import { OPENING_BEAT_TEXT, OPENING_LEADS } from '../game/HearthmereScript';
import type { StoryAnchorRegistry } from './WorldAtlas';
import type { WorldPosition } from './WorldCoordinates';
import { provisionalArrivalPlacement, tryInvestigateArrival } from './WorldV2OpeningPlan';

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error('Phase 3 story entry missing ' + selector);
  return element;
}

/**
 * Opt-in interface ONLY for the first playable opening beat on generated
 * terrain. Consumes the SAME story script/progression owner as Hearthmere.
 * The remaining beat ID exists in the planning catalog but has no runnable
 * second quest engine, NPC schedules, saves or cutscene implementation.
 */
export class WorldV2ArrivalSession {
  readonly placement;
  private selectedRole: CharacterClassId | null = null;
  private stepValue: OpeningStep = 'arrival';
  private lastLine = '';
  private readonly choices = requiredElement<HTMLElement>('#story-choose');
  private readonly hud = requiredElement<HTMLElement>('#story-hud');
  private readonly objective = requiredElement<HTMLElement>('#story-objective');
  private readonly hint = requiredElement<HTMLElement>('#story-hint');
  private readonly dialogue = requiredElement<HTMLElement>('#story-dialogue');
  private readonly action = requiredElement<HTMLButtonElement>('#story-action');
  private nearest = Number.POSITIVE_INFINITY;
  private groundReady = false;

  constructor(
    anchors: StoryAnchorRegistry,
    private readonly onSelected: (role: CharacterClassId) => void,
    private readonly surfaceWalkable: (x: number, z: number) => boolean,
    private readonly playerPosition: () => WorldPosition,
  ) {
    this.placement = provisionalArrivalPlacement(anchors);
    document.querySelectorAll<HTMLButtonElement>('[data-select-hero]').forEach(button => {
      button.addEventListener('click', () => {
        const role = button.dataset.selectHero;
        if (role === 'warrior' || role === 'mage' || role === 'assassin') {
          this.selectHero(role);
        }
      });
    });
    this.action.addEventListener('click', () => this.interact());
    // Query parameter is exclusively for deterministic browser QA and role-
    // specific direct links. Never read or mutate old Hearthmere saved state.
    const requested = new URLSearchParams(location.search).get('role');
    if (requested === 'warrior' || requested === 'mage' || requested === 'assassin') {
      this.selectHero(requested);
    }
  }

  get role(): CharacterClassId | null { return this.selectedRole; }
  get step(): OpeningStep { return this.stepValue; }

  selectHero(role: CharacterClassId): void {
    if (this.selectedRole) return; // No mid-session hero switching.
    this.onSelected(role);
    this.selectedRole = role;
    this.choices.hidden = true;
    this.hud.hidden = false;
    this.render();
  }

  update(): void {
    if (!this.selectedRole) return;
    const p = this.playerPosition();
    this.nearest = Math.hypot(p.x - this.placement.lead.x, p.z - this.placement.lead.z);
    this.groundReady = this.surfaceWalkable(p.x, p.z) &&
      this.surfaceWalkable(this.placement.lead.x, this.placement.lead.z);
    this.render();
  }

  interact(): boolean {
    const role = this.selectedRole;
    if (!role) return false;
    const result = tryInvestigateArrival(role, this.stepValue, CANONICAL_HERO_NAMES[role],
      this.playerPosition(), this.placement.lead, this.groundReady);
    if (!result) return false;
    this.stepValue = result.next;
    this.lastLine = result.speaker + ': ' + result.text;
    this.render();
    return true;
  }

  snapshot(): {
    role: CharacterClassId | null; step: OpeningStep;
    interactionAvailable: boolean; groundReady: boolean;
    leadDistance: number; lastDialogue: string; stage: string;
  } {
    return {
      role: this.selectedRole, step: this.stepValue,
      interactionAvailable: this.canInteract,
      groundReady: this.groundReady,
      leadDistance: this.nearest, lastDialogue: this.lastLine,
      stage: this.stepValue === 'arrival' ? 'playable' : 'awaiting-restage',
    };
  }

  private get canInteract(): boolean {
    return !!this.selectedRole && this.stepValue === 'arrival' &&
      this.groundReady && this.nearest <= 2.5;
  }

  private render(): void {
    const role = this.selectedRole;
    if (!role) return;
    const beat = OPENING_BEAT_TEXT[this.stepValue];
    const number = OPENING_STEPS.indexOf(this.stepValue) + 1;
    this.objective.textContent = `Step ${number}/${OPENING_STEPS.length} · ${beat.title}`;
    if (this.stepValue === 'arrival') {
      this.hint.textContent = OPENING_LEADS[role].hint + ' Move toward the gold marker, then press F.';
      this.action.textContent = this.canInteract
        ? 'Investigate (F)' : 'Approach the lead (F)';
      this.action.disabled = !this.canInteract;
    } else {
      this.hint.textContent = 'The arrival lead is recorded in this session. ' +
        'The gatekeeper, next NPC interactions, companions’ full AI, combat and later quests ' +
        'are not yet ported to World V2. You can return to the existing game to play them.';
      this.action.textContent = 'Next objective awaiting Phase 3 integration';
      this.action.disabled = true;
    }
    this.dialogue.textContent = this.lastLine;
  }
}
