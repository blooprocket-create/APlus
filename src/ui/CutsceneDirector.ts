import { CHARACTER_CLASSES } from '../data/classes';
import { CANONICAL_HERO_NAMES, getCompanionClassesForPlayer } from '../game/CompanionRoster';
import { CharacterClassId, CharacterSaveData, CutsceneId } from '../types/game';
import { OPENING_LEADS } from '../game/HearthmereOpening';
import type { HeroExpression } from '../game/HeroSpeech';

export interface CutsceneFrame {
  speakerName: string;
  speakerTitle: string;
  speakerIcon: string;
  accentColor: string;
  dialogue: string;
  cameraOffset: { x: number; y: number; z: number };
  lookAtOffset: { x: number; y: number; z: number };
  vfxBurst?: boolean;
  audio?: { pitch?: number; cue?: 'charge' | 'strike' | 'requiem' };
  openingPhase?: 'seal' | 'impact' | 'response';
  hero?: { role: CharacterClassId; tone: HeroExpression; closeup?: boolean };
}

export interface CutsceneScript {
  id: CutsceneId;
  episodeLabel: string;
  title: string;
  subtitle: string;
  frames: CutsceneFrame[];
}

export const CUTSCENE_CATALOG_META: Array<{
  id: CutsceneId;
  episodeLabel: string;
  title: string;
  zoneLabel: string;
}> = [
  {
    id: 'prologue_triad_awakening',
    episodeLabel: 'EPISODE I',
    title: 'Awakening of the Eclipse Triad',
    zoneLabel: 'Starting Town',
  },
  {
    id: 'act1_market_twist',
    episodeLabel: 'EPISODE II',
    title: 'The Riftscar Paradox ("They\'re Back!")',
    zoneLabel: 'Market Crossing',
  },
  {
    id: 'act2_ruins_unsealed',
    episodeLabel: 'EPISODE III',
    title: 'Gates of the Sunken Spire',
    zoneLabel: 'Market Crossing North Gate',
  },
  {
    id: 'act3_boss_intro',
    episodeLabel: 'EPISODE IV',
    title: 'Sovereign of the Blood Eclipse',
    zoneLabel: 'Abyssal Sanctum',
  },
  {
    id: 'act3_eclipse_sealed',
    episodeLabel: 'FINALE',
    title: 'Resonance of the Three Vessels',
    zoneLabel: 'Abyssal Sanctum Altar',
  },
];

export function buildCutsceneScript(
  id: CutsceneId,
  player: CharacterSaveData,
  companionNames?: Partial<Record<CharacterClassId, string>>
): CutsceneScript {
  const pDef = CHARACTER_CLASSES[player.classId];
  const [comp1Class, comp2Class] = getCompanionClassesForPlayer(player.classId);
  const c1Def = CHARACTER_CLASSES[comp1Class];
  const c2Def = CHARACTER_CLASSES[comp2Class];
  const c1Name = companionNames?.[comp1Class] ?? CANONICAL_HERO_NAMES[comp1Class];
  const c2Name = companionNames?.[comp2Class] ?? CANONICAL_HERO_NAMES[comp2Class];

  switch (id) {
    case 'hearthmere_shipment':
      return {
        id, episodeLabel: 'THE STARFORGED CROWN', title: 'The seal breaks', subtitle: 'Hearthmere',
        frames: [
          {
            speakerName: 'Shipment crew', speakerTitle: 'Royal square', speakerIcon: '◆', accentColor: '#d5bd88',
            dialogue: OPENING_LEADS[player.classId].shipment,
            cameraOffset: { x: -2.7, y: 2.8, z: 2.8 }, lookAtOffset: { x: 0.3, y: 1, z: -4.7 },
            audio: { pitch: 172, cue: 'charge' },
            openingPhase: 'seal',
          },
          {
            speakerName: 'The giant', speakerTitle: 'The eastern road', speakerIcon: '✦', accentColor: '#ef8075',
            dialogue: 'The crane snaps as a black forelimb comes down across the road.',
            cameraOffset: { x: 10, y: 2.8, z: 23.9 }, lookAtOffset: { x: 11.6, y: 3.55, z: 3.7 },
            audio: { cue: 'charge' },
            openingPhase: 'impact',
          },
          {
            speakerName: 'Mara', speakerTitle: 'At the low wall', speakerIcon: '◇', accentColor: '#ffd18a',
            dialogue: 'The work yard. Get them behind the wall.',
            cameraOffset: { x: -1.7, y: 3, z: 4.2 }, lookAtOffset: { x: 4.5, y: 0.75, z: -0.9 },
            audio: { pitch: 196 },
            openingPhase: 'response',
          },
          {
            speakerName: CANONICAL_HERO_NAMES[player.classId], speakerTitle: pDef.archetypeLabel,
            speakerIcon: pDef.starterWeapon.icon, accentColor: pDef.elementColor,
            dialogue: {
              warrior: 'I’ll cover you. Get them clear.',
              mage: 'Stay close. I can find us a way through.',
              assassin: 'I see a way out. Follow me.',
            }[player.classId],
            cameraOffset: { x: .7, y: 1.8, z: 2.3 }, lookAtOffset: { x: 0, y: 1.45, z: 0 },
            hero: { role: player.classId, tone: player.classId === 'mage' ? 'concern' : 'resolve', closeup: true },
          },
        ],
      };
    case 'slice_moat_plan': {
      const frame = (role: CharacterClassId, dialogue: string, x: number, y: number, z: number): CutsceneFrame => {
        const definition = CHARACTER_CLASSES[role];
        return {
          speakerName: CANONICAL_HERO_NAMES[role], speakerTitle: definition.archetypeLabel,
          speakerIcon: definition.starterWeapon.icon, accentColor: definition.elementColor, dialogue,
          cameraOffset: { x, y, z }, lookAtOffset: { x: 4, y: 0.9, z: -1 },
          hero: { role, tone: 'resolve' },
        };
      };
      return {
        id, episodeLabel: 'HEARTHMERE OUTSKIRTS', title: 'The ruined crossing', subtitle: 'Three parts to one plan',
        frames: [
          frame('warrior', 'I can spear-vault across the moat and break open the container on the far bank. That will expose the bridge key.', -3, 4.1, 6),
          frame('mage', 'I’ll move the key back to this bank. Wait for it to appear beside the crossing.', -1.5, 4.4, 6.2),
          frame('assassin', 'I’ll take the key, veil myself, and circle the guard by the blue lights. Once I reach the lever, I’ll lower the bridge. We cross and take the east bank back to camp.', -3.8, 3.3, 4.5),
        ],
      };
    }
    case 'prologue_triad_awakening':
      return {
        id,
        episodeLabel: 'EPISODE I // STARTING TOWN',
        title: 'AWAKENING OF THE ECLIPSE TRIAD',
        subtitle: 'Three Fates Bound at Aetherhaven Outpost',
        frames: [
          {
            speakerName: 'Commander Vael',
            speakerTitle: 'Outpost Quest Giver',
            speakerIcon: '🛡️',
            accentColor: '#ffd166',
            dialogue: `${player.name}, ${c1Name}, and ${c2Name}—the Spear, the Grimoire, and the Shadow-Blade stand united at last! The Stomping Grounds to the north are overflowing with Rift fiends.`,
            cameraOffset: { x: -2.4, y: 2.3, z: 4.4 },
            lookAtOffset: { x: -0.5, y: 1.1, z: -0.8 },
            vfxBurst: true,
          },
          {
            speakerName: c1Name,
            speakerTitle: `${c1Def.archetypeLabel} Companion`,
            speakerIcon: c1Def.starterWeapon.icon,
            accentColor: c1Def.elementColor,
            dialogue: `Leave the vanguard flank to me, ${player.name}! With the three of us fighting in formation, no monster in the Stomping Grounds will stand in our way.`,
            cameraOffset: { x: -2.8, y: 1.9, z: 3.4 },
            lookAtOffset: { x: -0.9, y: 1.0, z: 0.5 },
          },
          {
            speakerName: c2Name,
            speakerTitle: `${c2Def.archetypeLabel} Companion`,
            speakerIcon: c2Def.starterWeapon.icon,
            accentColor: c2Def.elementColor,
            dialogue: `Once we purge every enemy in the Stomping Grounds, we'll cross through the far portal into Market Crossing and let Grand Merchant Lyra know the trade road is open.`,
            cameraOffset: { x: 2.8, y: 1.9, z: 3.4 },
            lookAtOffset: { x: 0.9, y: 1.0, z: 0.5 },
          },
          {
            speakerName: player.name,
            speakerTitle: `${pDef.archetypeLabel} // Triad Leader`,
            speakerIcon: pDef.starterWeapon.icon,
            accentColor: pDef.elementColor,
            dialogue: `Then our mission is clear. Triad—move out! To the North Rift Portal!`,
            cameraOffset: { x: 0, y: 2.2, z: 3.8 },
            lookAtOffset: { x: 0, y: 1.1, z: 0 },
            vfxBurst: true,
          },
        ],
      };

    case 'act1_market_twist':
      return {
        id,
        episodeLabel: 'EPISODE II // MARKET CROSSING',
        title: 'THE RIFTSCAR PARADOX',
        subtitle: '"No It\'s Not Clear—Look Behind You!"',
        frames: [
          {
            speakerName: player.name,
            speakerTitle: `${pDef.archetypeLabel} // Triad Leader`,
            speakerIcon: pDef.starterWeapon.icon,
            accentColor: pDef.elementColor,
            dialogue: `Grand Merchant Lyra! We just fought our way through the Stomping Grounds from Starting Town. Every last monster on the path has been purged!`,
            cameraOffset: { x: 2.2, y: 2.1, z: 4.2 },
            lookAtOffset: { x: -0.6, y: 1.1, z: 0 },
          },
          {
            speakerName: 'Grand Merchant Lyra',
            speakerTitle: 'Market Quest Envoy',
            speakerIcon: '🏮',
            accentColor: '#ff3e6c',
            dialogue: `Clear?! NO IT'S NOT! Look at my Starlight Astrolabe—the Riftscar just pulsed crimson! Go back toward Starting Town right now—you'll see the monsters are ALREADY BACK!`,
            cameraOffset: { x: -2.5, y: 1.8, z: 3.2 },
            lookAtOffset: { x: -0.8, y: 1.1, z: -0.5 },
            vfxBurst: true,
          },
          {
            speakerName: c2Name,
            speakerTitle: `${c2Def.archetypeLabel} Companion`,
            speakerIcon: c2Def.starterWeapon.icon,
            accentColor: c2Def.elementColor,
            dialogue: `Impossible... we didn't miss a single one! Wait—the entire Stomping Grounds corridor is reconstructing its terrain and monsters in a temporal loop!`,
            cameraOffset: { x: 2.6, y: 1.9, z: 3.5 },
            lookAtOffset: { x: 0.6, y: 1.0, z: 0.4 },
          },
          {
            speakerName: c1Name,
            speakerTitle: `${c1Def.archetypeLabel} Companion`,
            speakerIcon: c1Def.starterWeapon.icon,
            accentColor: c1Def.elementColor,
            dialogue: `Then we turn right back around, carve through the respawned horde in the Stomping Grounds a second time, and warn Commander Vael in Starting Town!`,
            cameraOffset: { x: 0, y: 2.4, z: 4.5 },
            lookAtOffset: { x: 0, y: 1.0, z: 0 },
            vfxBurst: true,
          },
        ],
      };

    case 'act2_ruins_unsealed':
      return {
        id,
        episodeLabel: 'EPISODE III // SUNKEN ASTRAL RUINS',
        title: 'GATES OF THE SUNKEN SPIRE',
        subtitle: 'Unsealing the Ancient Causeway North of Market Crossing',
        frames: [
          {
            speakerName: 'Artificer Sol',
            speakerTitle: 'Sunken Ruins Gatekeeper',
            speakerIcon: '🔮',
            accentColor: '#00f5d4',
            dialogue: `So you three proved the Riftscar loop! The Stomping Grounds keep regenerating because an Eclipse Anchor is drawing power from the Sunken Astral Ruins to the north.`,
            cameraOffset: { x: 2.4, y: 2.2, z: 4.2 },
            lookAtOffset: { x: 0.5, y: 1.1, z: -0.5 },
          },
          {
            speakerName: 'Artificer Sol',
            speakerTitle: 'Sunken Ruins Gatekeeper',
            speakerIcon: '🔮',
            accentColor: '#00f5d4',
            dialogue: `Stand back, Heroes of the Triad! By the Starforge Seal—I open the North Waygate into the Sunken Astral Ruins!`,
            cameraOffset: { x: -2.2, y: 2.5, z: 4.6 },
            lookAtOffset: { x: 0, y: 1.2, z: -2.0 },
            vfxBurst: true,
          },
          {
            speakerName: player.name,
            speakerTitle: `${pDef.archetypeLabel} // Triad Leader`,
            speakerIcon: pDef.starterWeapon.icon,
            accentColor: pDef.elementColor,
            dialogue: `The bioluminescent causeway is open! ${c1Name}, ${c2Name}—let's purge the Sunken Ruins and break through to the Abyssal Sanctum!`,
            cameraOffset: { x: 0, y: 2.1, z: 3.9 },
            lookAtOffset: { x: 0, y: 1.1, z: 0 },
          },
        ],
      };

    case 'act3_boss_intro':
      return {
        id,
        episodeLabel: 'EPISODE IV // ABYSSAL SANCTUM',
        title: 'SOVEREIGN OF THE BLOOD ECLIPSE',
        subtitle: 'The Final Confrontation at the Citadel Summit',
        frames: [
          {
            speakerName: 'Eclipse Sovereign',
            speakerTitle: 'Lord of the Riftscar Loop',
            speakerIcon: '👑',
            accentColor: '#ff0054',
            dialogue: `Foolish mortals... Every time you clear the wilds, my Eclipse Heart reweaves the path anew! Even three vessels together cannot sever eternity!`,
            cameraOffset: { x: -3.2, y: 2.6, z: 5.2 },
            lookAtOffset: { x: 0, y: 1.4, z: -4.0 },
            vfxBurst: true,
          },
          {
            speakerName: c1Name,
            speakerTitle: `${c1Def.archetypeLabel} Companion`,
            speakerIcon: c1Def.starterWeapon.icon,
            accentColor: c1Def.elementColor,
            dialogue: `We've fought across every shifting road you threw at us! Today your endless loop ends!`,
            cameraOffset: { x: -2.4, y: 1.9, z: 3.6 },
            lookAtOffset: { x: -0.8, y: 1.0, z: 0.5 },
          },
          {
            speakerName: player.name,
            speakerTitle: `${pDef.archetypeLabel} // Triad Leader`,
            speakerIcon: pDef.starterWeapon.icon,
            accentColor: pDef.elementColor,
            dialogue: `Spear, Grimoire, and Shadow-Blade—unleash everything! Bring down the Eclipse Sovereign!`,
            cameraOffset: { x: 0, y: 2.2, z: 4.0 },
            lookAtOffset: { x: 0, y: 1.1, z: -1.0 },
            vfxBurst: true,
          },
        ],
      };

    case 'act3_eclipse_sealed':
      return {
        id,
        episodeLabel: 'FINALE // THE ECLIPSE ALTAR',
        title: 'RESONANCE OF THE THREE VESSELS',
        subtitle: 'Dawn Returns to Aethelgard',
        frames: [
          {
            speakerName: 'High Sage Orin',
            speakerTitle: 'Keeper of the Eclipse Seal',
            speakerIcon: '✨',
            accentColor: '#ffd166',
            dialogue: `The Sovereign's core is shattered! Quickly—raise your three weapons together above the Sanctum Altar!`,
            cameraOffset: { x: 2.5, y: 2.3, z: 4.4 },
            lookAtOffset: { x: 0, y: 1.2, z: -0.8 },
            vfxBurst: true,
          },
          {
            speakerName: `${player.name}, ${c1Name} & ${c2Name}`,
            speakerTitle: 'The Eclipse Triad',
            speakerIcon: '🌟',
            accentColor: '#4cc9f0',
            dialogue: `"BY SPEAR OF DAWN, GRIMOIRE OF STARS, AND BLADE OF ECLIPSE—SEAL THE RIFT!"`,
            cameraOffset: { x: 0, y: 2.8, z: 5.2 },
            lookAtOffset: { x: 0, y: 1.3, z: 0 },
            vfxBurst: true,
          },
          {
            speakerName: 'High Sage Orin',
            speakerTitle: 'Keeper of the Eclipse Seal',
            speakerIcon: '✨',
            accentColor: '#ffd166',
            dialogue: `It is done! Peace returns to Starting Town and Market Crossing, though echoes of the wilds remain for your future expeditions. Claim the Sovereign's Mythic Treasury, Heroes!`,
            cameraOffset: { x: -2.0, y: 2.1, z: 4.0 },
            lookAtOffset: { x: 0, y: 1.1, z: 0 },
          },
        ],
      };
  }
}

export class CutsceneDirector {
  private container: HTMLElement | null = null;
  private activeScript: CutsceneScript | null = null;
  private currentFrameIndex = 0;
  private onFrameChange: ((frame: CutsceneFrame) => void) | null = null;
  private onComplete: (() => void) | null = null;
  private onHold: ((paused: boolean) => void) | null = null;
  private paused = false;

  public isPlaying(): boolean {
    return this.activeScript !== null;
  }

  public play(
    root: HTMLElement,
    script: CutsceneScript,
    onFrameChange: (frame: CutsceneFrame) => void,
    onComplete: () => void,
    onHold?: (paused: boolean) => void
  ): void {
    this.stop();
    this.activeScript = script;
    this.currentFrameIndex = 0;
    this.onFrameChange = onFrameChange;
    this.onComplete = onComplete;
    this.onHold = onHold ?? null;

    const el = document.createElement('div');
    el.id = 'cutscene-overlay';
    el.className = 'cutscene-overlay';
    root.appendChild(el);
    this.container = el;

    window.addEventListener('keydown', this.handleKeyDown);
    this.renderCurrentFrame();
  }

  private renderCurrentFrame(): void {
    if (!this.container || !this.activeScript) return;
    const frame = this.activeScript.frames[this.currentFrameIndex];
    if (!frame) {
      this.finish();
      return;
    }

    this.onFrameChange?.(frame);

    const total = this.activeScript.frames.length;
    const isLast = this.currentFrameIndex >= total - 1;

    this.container.innerHTML = `
      <div class="cinematic-bar-top">
        <div>
          <div class="cinematic-ep-badge">${this.activeScript.episodeLabel}</div>
          <div class="cinematic-ep-title">${this.activeScript.title}</div>
        </div>
        <div class="cinematic-tools">
          ${this.onHold ? '<button id="btn-hold-cutscene" class="btn-anime">Pause scene</button>' : ''}
          <button id="btn-skip-cutscene" class="btn-anime btn-danger" style="padding:7px 14px;font-size:0.74rem;">
            ⏭ SKIP CUTSCENE [ESC]
          </button>
        </div>
      </div>

      <div class="cinematic-speedlines"></div>

      <div class="cinematic-bar-bottom">
        <div class="cinematic-dialogue-card" style="border-left-color:${frame.accentColor}">
          <div class="cinematic-portrait" style="border-color:${frame.accentColor};box-shadow:0 0 18px ${frame.accentColor}55">
            <span>${frame.speakerIcon}</span>
          </div>
          <div class="cinematic-text-col">
            <div class="cinematic-speaker-row">
              <span class="cinematic-speaker-name" style="color:${frame.accentColor}">${frame.speakerName}</span>
              <span class="cinematic-speaker-title">${frame.speakerTitle}</span>
              <span class="cinematic-frame-counter">${this.currentFrameIndex + 1} / ${total}</span>
            </div>
            <div class="cinematic-dialogue-text">"${frame.dialogue}"</div>
          </div>
          <button id="btn-next-cutscene" class="btn-anime btn-primary" style="padding:12px 20px;min-width:135px;">
            ${isLast ? '✦ FINISH ▶' : 'NEXT ▶'}
          </button>
        </div>
      </div>
    `;

    this.container
      .querySelector('#btn-next-cutscene')
      ?.addEventListener('click', () => this.advance());
    this.container
      .querySelector('#btn-skip-cutscene')
      ?.addEventListener('click', () => this.finish());
    this.container.querySelector<HTMLButtonElement>('#btn-hold-cutscene')?.addEventListener('click', event => {
      this.paused = !this.paused;
      (event.currentTarget as HTMLButtonElement).textContent = this.paused ? 'Resume scene' : 'Pause scene';
      this.container!.querySelector<HTMLButtonElement>('#btn-next-cutscene')!.disabled = this.paused;
      this.onHold?.(this.paused);
    });
  }

  public advance(): void {
    if (!this.activeScript || this.paused) return;
    this.currentFrameIndex += 1;
    if (this.currentFrameIndex >= this.activeScript.frames.length) {
      this.finish();
    } else {
      this.renderCurrentFrame();
    }
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.activeScript) return;
    if (e.code === 'Escape') {
      e.preventDefault();
      this.finish();
    } else if (e.code === 'Space' || e.code === 'Enter') {
      if (e.target instanceof HTMLElement && e.target.closest('button')) return;
      e.preventDefault();
      this.advance();
    }
  };

  public finish(): void {
    const cb = this.onComplete;
    this.stop();
    cb?.();
  }

  public stop(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    this.activeScript = null;
    this.onFrameChange = null;
    this.onComplete = null;
    if (this.paused) this.onHold?.(false);
    this.paused = false;
    this.onHold = null;
  }
}
