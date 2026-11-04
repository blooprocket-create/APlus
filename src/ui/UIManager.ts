import {
  CHARACTER_CLASSES,
  CHARACTER_CLASS_LIST,
  computeEffectiveStats,
  computePowerRating,
} from '../data/classes';
import { CHRONICLE_CHAPTERS, REGION_NAMES } from '../data/chronicle';
import { chapterUnlocked, endingText, ensureCampaign } from '../game/CampaignEngine';
import { ChronicleInteraction } from '../types/campaign';
import { FinisherFrame } from '../game/FinisherTimeline';
import { icon, CLASS_ICONS } from './icons';
import { drawMinimap } from './Minimap';
import { GameEngine, HudTelemetry, ExpeditionReport } from '../game/GameEngine';
import {
  CANONICAL_HERO_NAMES,
  getCompanionClassesForPlayer,
} from '../game/QuestEngine';
import {
  COMPANION_STANCE_INFO,
  ensureCompanionConfigs,
  ensureSkillRunes,
  ManagementSystem,
  SKILL_RUNE_CATALOG,
} from '../game/ManagementSystem';
import { ActionId } from '../input/InputManager';
import { PersistenceManager } from '../persistence/PersistenceManager';
import {
  AccountProfile,
  BasicRuneId,
  CharacterClassId,
  CharacterSlotIndex,
  CharacterSaveData,
  CompanionTacticalStance,
  CutsceneId,
  Skill1RuneId,
  Skill2RuneId,
  UltimateRuneId,
  ZoneId,
} from '../types/game';
import {
  buildCutsceneScript,
  CUTSCENE_CATALOG_META,
  CutsceneDirector,
} from './CutsceneDirector';

export type CommandDeckTab = 'inventory' | 'companions' | 'abilities' | 'cutscenes';

const DEFAULT_NAMES: Record<CharacterClassId, string> = {
  warrior: 'Brynhildr',
  mage: 'Celestia',
  assassin: 'Akatsuki',
};

const ZONE_LABELS: Record<ZoneId, string> = {
  starting_town: 'Aetherhaven',
  stomping_grounds: 'Stomping Grounds',
  market_crossing: 'Market Crossing',
  sunken_ruins: 'Sunken Astral Ruins',
  abyssal_sanctum: 'Abyssal Sanctum',
  ...REGION_NAMES,
};

export class UIManager {
  private root: HTMLElement;
  private persistence: PersistenceManager;
  private engine: GameEngine;

  private activeAccount: AccountProfile | null = null;
  private slots: [CharacterSaveData | null, CharacterSaveData | null, CharacterSaveData | null] = [
    null,
    null,
    null,
  ];
  private selectedSlotIndex: CharacterSlotIndex = 0;
  private creationClassId: CharacterClassId = 'warrior';
  private creationNameDraft = DEFAULT_NAMES.warrior;
  private errorMessage: string | null = null;
  private cutsceneDirector = new CutsceneDirector();

  // Command Deck Modal State
  private deckTab: CommandDeckTab = 'inventory';
  private invFilter: 'all' | 'weapon' | 'charm' = 'all';
  private invSort: 'power' | 'rarity' | 'attack' = 'power';
  private inspectedItemId: string | null = null;
  private deckFeedbackMsg: string | null = null;

  // Live HUD DOM elements for fast 60fps updates without full DOM rebuilds
  private hudRefs: {
    hpFill: HTMLElement;
    hpLabel: HTMLElement;
    xpFill: HTMLElement;
    xpLabel: HTMLElement;
    lvPill: HTMLElement;
    goldSpan: HTMLElement;
    crystalSpan: HTMLElement;
    saveBadge: HTMLElement;
    waveTitle: HTMLElement;
    waveSub: HTMLElement;
    stepTown: HTMLElement;
    stepStomping: HTMLElement;
    stepMarket: HTMLElement;
    stepRuins: HTMLElement;
    stepSanctum: HTMLElement;
    pathProgressWrap: HTMLElement;
    pathProgressFill: HTMLElement;
    portalBtn: HTMLButtonElement;
    npcBox: HTMLElement;
    npcTitle: HTMLElement;
    npcText: HTMLElement;
    questActionBtn: HTMLButtonElement;
    questChapterSpan: HTMLElement;
    questStepPill: HTMLElement;
    questObjTitle: HTMLElement;
    questObjHint: HTMLElement;
    questObjProgress: HTMLElement;
    questBanterDiv: HTMLElement;
    companionListDiv: HTMLElement;
    comboBox: HTMLElement;
    comboRank: HTMLElement;
    comboHits: HTMLElement;
    ultBtn: HTMLElement;
    ultLabel: HTMLElement;
    cdOverlays: Record<ActionId, HTMLElement>;
    centerBanner: HTMLElement;
    centerBannerTitle: HTMLElement;
    centerBannerSub: HTMLElement;
    ultCutin: HTMLElement;
    ultCutinTitle: HTMLElement;
    ultCutinSub: HTMLElement;
  } | null = null;

  private bannerTimeout: number | null = null;
  private cutinTimeout: number | null = null;
  private previousFocus: HTMLElement | null = null;
  private lastCompanionMarkup = '';
  private shakeEnabled = true;
  private atlasTab: 'world' | 'journal' | 'codex' = 'world';

  constructor(root: HTMLElement, persistence: PersistenceManager, engine: GameEngine) {
    this.root = root;
    this.persistence = persistence;
    this.engine = engine;
    try { const saved = localStorage.getItem('astral-screen-shake'); this.shakeEnabled = saved === null ? !window.matchMedia('(prefers-reduced-motion: reduce)').matches : saved !== 'false'; } catch { /* optional preference */ }
    this.engine.setScreenShake(this.shakeEnabled);
    window.addEventListener('keydown', this.handleMenuKey);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.hudRefs && !this.engine.isPaused) this.openPauseMenu();
    });
  }

  public async bootstrap(): Promise<void> {
    await this.persistence.init();
    let account = await this.persistence.getActiveAccount();
    if (!account) {
      account = await this.persistence.loginOrCreateAccount('astral_pioneer', 'Astral Pioneer');
      // Seed 1 starter character in Slot 1 in Starting Town
      await this.persistence.createCharacter({
        accountId: account.id,
        slotIndex: 0,
        name: 'Brynhildr',
        classId: 'warrior',
      });
    }
    this.activeAccount = account;
    await this.showCharacterSelectScreen();
  }

  public async showCharacterSelectScreen(): Promise<void> {
    if (!this.activeAccount) return;
    this.hudRefs = null;
    this.root.querySelector('#game-menu')?.remove();
    this.engine.setPaused('menu', false);
    this.engine.setPaused('deck', false);
    this.slots = await this.persistence.getCharacterSlots(this.activeAccount.id);

    // Pick last selected character's slot if available, otherwise slot 0
    const lastId = this.activeAccount.lastSelectedCharacterId;
    const foundIdx = this.slots.findIndex((s) => s && s.id === lastId);
    if (foundIdx >= 0) {
      this.selectedSlotIndex = foundIdx as CharacterSlotIndex;
    }

    this.renderLobbyDOM();
    this.syncPedestalPreview();
  }

  private syncPedestalPreview(): void {
    const slotChar = this.slots[this.selectedSlotIndex];
    if (slotChar) {
      this.engine.setPreviewCharacter(slotChar.classId);
    } else {
      this.engine.setPreviewCharacter(this.creationClassId);
    }
  }

  private renderLobbyDOM(): void {
    if (!this.activeAccount) return;
    const occupiedCount = this.slots.filter(Boolean).length;
    const selectedChar = this.slots[this.selectedSlotIndex];
    const cDef = CHARACTER_CLASSES[selectedChar?.classId ?? this.creationClassId];
    const eff = selectedChar ? computeEffectiveStats(selectedChar) : cDef.baseStats;
    const classTabs = CHARACTER_CLASS_LIST.map(cls => `
      <button class="class-tab ${cls.id === this.creationClassId ? 'active' : ''}" data-class="${cls.id}">
        ${icon(CLASS_ICONS[cls.id])}<span>${cls.archetypeLabel}</span>
      </button>`).join('');
    const slotCards = this.slots.map((char, i) => `
      <button class="char-slot-card ${this.selectedSlotIndex === i ? 'selected' : ''}" data-slot="${i}" aria-pressed="${this.selectedSlotIndex === i}">
        <span class="roster-number">0${i + 1}</span>
        <span class="slot-badge">${icon(char ? CLASS_ICONS[char.classId] : 'plus', 26)}</span>
        <span class="slot-info"><strong>${char ? this.escapeHtml(char.name) : 'Awaken a hero'}</strong><small>${char ? CHARACTER_CLASSES[char.classId].archetypeLabel : 'Choose your calling'}</small></span>
        ${char ? `<span class="slot-lv">LV ${char.level}</span>` : ''}
      </button>`).join('');
    const zone = selectedChar?.currentZone ?? 'starting_town';
    const route = (['whispering_woods', 'ember_coast', 'glass_desert', 'frostmarch', 'crown_of_night', 'world_heart'] as ZoneId[]).map((z, i) => `
      <span class="journey-stop ${z === zone ? 'current' : ''}" title="${ZONE_LABELS[z]}"><i>${i + 1}</i><span>${ZONE_LABELS[z]}</span></span>`).join('');
    this.root.innerHTML = `
      <div class="lobby-screen">
        <header class="lobby-topbar">
          <div class="wordmark">${icon('star', 34)}<div>ASTRAL<span>CHRONICLES</span></div></div>
          <span class="edition-label">THE LONG DAWN <i></i> SIX ACTS</span>
          <div class="lobby-tools interactive">
            <button id="btn-world-atlas" class="lobby-atlas-button">${icon('map', 17)} THE LONG DAWN</button>
            <button id="btn-lobby-help" class="quiet-button" aria-label="How to play">?</button>
            <button id="btn-lobby-audio" class="quiet-button" aria-label="Toggle sound">${icon(this.engine.audio.muted ? 'mute' : 'sound', 19)}</button>
            <button id="btn-switch-account" class="profile-button"><span class="profile-avatar">${this.escapeHtml(this.activeAccount.displayName.slice(0, 1))}</span><span>${this.escapeHtml(this.activeAccount.displayName)}<small>LOCAL PROFILE</small></span></button>
          </div>
        </header>
        <main class="lobby-stage">
          <div class="lobby-intro"><div class="eyebrow"><span></span> THREE FATES. ONE WORLD.</div><h1>The eclipse<br>is <em>rising.</em></h1><p>Gather your triad. Cross the fractured wilds.<br>Bring the light back home.</p></div>
          <section class="details-panel interactive" style="--hero-color:${cDef.elementColor}">
            <div class="hero-panel-heading"><span class="eyebrow">${selectedChar ? 'YOUR CHOSEN HERO' : 'A NEW AWAKENING'}</span><span class="hero-element">${icon(CLASS_ICONS[cDef.id], 17)} ${cDef.element.split('-')[0]}</span></div>
            <div class="hero-class-name">${cDef.archetypeLabel}</div>
            <h2>${this.escapeHtml(selectedChar?.name ?? this.creationNameDraft)}</h2>
            <p class="hero-lore">${cDef.playstyle}</p>
            ${!selectedChar ? `<div class="class-tabs">${classTabs}</div>` : ''}
            <div class="hero-stats"><div><small>VITALITY</small><strong>${eff.maxHp}</strong></div><div><small>ATTACK</small><strong>${eff.attack}</strong></div><div><small>CRITICAL</small><strong>${Math.round(eff.critRate * 100)}<span>%</span></strong></div></div>
            <div class="hero-abilities">${(['basic', 'dash', 'skill1', 'skill2', 'ultimate'] as ActionId[]).map((key, i) => `<div class="ability-preview" title="${this.escapeHtml(cDef.skills[key].name + ': ' + cDef.skills[key].description)}">${icon(['spear', 'dash', 'flame', 'shield', 'burst'][i], 23)}<small>${['J', 'SHIFT', 'Q', 'E', 'R'][i]}</small></div>`).join('')}</div>
            ${selectedChar ? `<div class="journey-resume"><span class="status-dot"></span><div><small>CONTINUE YOUR JOURNEY</small><strong>${ZONE_LABELS[zone]} <span>· Level ${selectedChar.level}</span></strong></div>${icon('map', 22)}</div>
              <button id="btn-enter-world" class="btn-anime btn-primary journey-button">${selectedChar.campaign?.started ? 'Continue journey' : 'Begin The Long Dawn'} ${icon('arrow', 22)}</button>
              <div class="hero-panel-foot"><span>POWER ${computePowerRating(selectedChar)} · ${selectedChar.enemiesDefeated} FIENDS SLAIN</span><button id="btn-delete-char" class="text-button" aria-label="Delete selected hero">Delete hero</button></div>` : `
              <label class="eyebrow name-label" for="input-char-name">NAME YOUR HERO</label><input id="input-char-name" class="input-field" maxlength="18" value="${this.escapeHtml(this.creationNameDraft)}" placeholder="Enter a name">
              ${this.errorMessage ? `<p class="form-error" role="alert">${this.escapeHtml(this.errorMessage)}</p>` : ''}
              <button id="btn-create-char" class="btn-anime btn-primary journey-button">Awaken your hero ${icon('arrow', 22)}</button>`}
            <button id="btn-finisher-preview" class="finisher-preview-button">${icon('burst', 17)} Watch a guardian finisher <span>12 SEC</span></button>
          </section>
          <section class="hero-roster interactive"><div class="roster-caption"><span class="eyebrow">SELECT YOUR HERO</span><span>${occupiedCount} / 3 AWAKENED</span></div><div class="slot-list">${slotCards}</div></section>
          <div class="preview-caption"><span class="preview-rule"></span>THE ECLIPSE TRIAD<span class="preview-rule"></span></div>
        </main>
        <footer class="lobby-footer"><div class="journey-route">${route}</div><span class="local-save"><span class="status-dot"></span> PROGRESS SAVED ON THIS DEVICE</span></footer>
      </div>`;
    this.root.querySelector('#btn-world-atlas')?.addEventListener('click', () => this.openAtlas());
    this.root.querySelector('#btn-finisher-preview')?.addEventListener('click', () => this.engine.previewBossFinisher(cDef.id));
    this.root.querySelector('#btn-lobby-help')?.addEventListener('click', () => this.openHelp());
    this.root.querySelector('#btn-lobby-audio')?.addEventListener('click', () => { this.engine.audio.toggle(); this.renderLobbyDOM(); });

    // Bind events
    this.root.querySelectorAll<HTMLElement>('.char-slot-card').forEach((card) => {
      card.addEventListener('click', () => {
        const idx = Number(card.dataset.slot) as CharacterSlotIndex;
        this.selectedSlotIndex = idx;
        this.errorMessage = null;
        this.renderLobbyDOM();
        this.syncPedestalPreview();
      });
    });

    this.root.querySelectorAll<HTMLElement>('.class-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const clsId = tab.dataset.class as CharacterClassId;
        this.creationClassId = clsId;
        this.creationNameDraft = DEFAULT_NAMES[clsId];
        this.errorMessage = null;
        this.renderLobbyDOM();
        this.syncPedestalPreview();
      });
    });

    const nameInput = this.root.querySelector<HTMLInputElement>('#input-char-name');
    if (nameInput) {
      nameInput.addEventListener('input', () => {
        this.creationNameDraft = nameInput.value;
      });
    }

    const createBtn = this.root.querySelector<HTMLButtonElement>('#btn-create-char');
    if (createBtn) {
      createBtn.addEventListener('click', async () => {
        if (!this.activeAccount) return;
        try {
          this.errorMessage = null;
          const created = await this.persistence.createCharacter({
            accountId: this.activeAccount.id,
            slotIndex: this.selectedSlotIndex,
            name: this.creationNameDraft,
            classId: this.creationClassId,
          });
          this.startHudAndGameplay(created);
          this.engine.setPaused('travel', true);
          await this.engine.travelToChapter(0);
          this.engine.setPaused('travel', false);
        } catch (err) {
          this.errorMessage = err instanceof Error ? err.message : String(err);
          this.renderLobbyDOM();
        }
      });
    }

    const enterBtn = this.root.querySelector<HTMLButtonElement>('#btn-enter-world');
    if (enterBtn && selectedChar) {
      enterBtn.addEventListener('click', async () => {
        this.startHudAndGameplay(selectedChar);
        if (!selectedChar.campaign?.started) {
          this.engine.setPaused('travel', true);
          await this.engine.travelToChapter(0);
          this.engine.setPaused('travel', false);
        }
      });
    }

    const deleteBtn = this.root.querySelector<HTMLButtonElement>('#btn-delete-char');
    if (deleteBtn && selectedChar) {
      deleteBtn.addEventListener('click', async () => {
        if (!this.activeAccount) return;
        this.openOverlay('Release this hero?', `<p>Delete ${this.escapeHtml(selectedChar.name)} and their saved progress? Your other heroes will remain.</p>`, [
          { label: 'Keep hero', action: () => this.closeOverlay() },
          { label: 'Delete hero', action: async () => {
            if (!this.activeAccount) return;
            await this.persistence.deleteCharacter(this.activeAccount.id, selectedChar.id);
            this.closeOverlay();
            await this.showCharacterSelectScreen();
          } },
        ]);
      });
    }

    const switchAccBtn = this.root.querySelector<HTMLButtonElement>('#btn-switch-account');
    if (switchAccBtn) {
      switchAccBtn.addEventListener('click', () => {
        void this.openAccountModal();
      });
    }
  }

  private async openAccountModal(): Promise<void> {
    const accounts = await this.persistence.listAccounts();
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Local profiles');

    const existingListHtml = accounts
      .map(
        (acc) => `
        <div class="char-slot-card ${acc.id === this.activeAccount?.id ? 'selected' : ''}" data-acc-id="${acc.id}">
          <div class="slot-left">
            <div class="slot-badge">👤</div>
            <div class="slot-info">
              <h4>@${this.escapeHtml(acc.username)}</h4>
              <p>${this.escapeHtml(acc.displayName)}</p>
            </div>
          </div>
          <div class="slot-lv">${acc.id === this.activeAccount?.id ? 'ACTIVE' : 'SWITCH'}</div>
        </div>
      `
      )
      .join('');

    modal.innerHTML = `
      <div class="modal-card">
        <div class="panel-header">
          <span class="panel-title">Local profiles</span>
          <button id="btn-close-acc-modal" class="btn-anime" style="padding:4px 9px;">✕</button>
        </div>
        <p style="font-size:0.76rem;color:var(--text-muted);margin-bottom:10px;">
          Profiles keep separate rosters of up to three heroes on this device.
        </p>
        <div class="slot-list" style="margin-bottom:14px;">
          ${existingListHtml}
        </div>
        <div style="border-top:1px solid rgba(255,255,255,0.12);padding-top:12px;">
          <label style="font-size:0.74rem;color:var(--text-muted);display:block;margin-bottom:6px;">
            PROFILE NAME
          </label>
          <input id="input-new-acc" class="input-field" type="text" placeholder="e.g. kirito_02" />
          <button id="btn-login-new-acc" class="btn-anime btn-primary" style="width:100%;">
            Open / Create profile
          </button>
        </div>
      </div>
    `;

    this.root.appendChild(modal);

    modal.querySelector('#btn-close-acc-modal')?.addEventListener('click', () => {
      modal.remove();
    });

    modal.querySelectorAll<HTMLElement>('[data-acc-id]').forEach((row) => {
      row.addEventListener('click', async () => {
        const id = row.dataset.accId!;
        this.activeAccount = await this.persistence.switchAccount(id);
        this.selectedSlotIndex = 0;
        modal.remove();
        await this.showCharacterSelectScreen();
      });
    });

    modal.querySelector('#btn-login-new-acc')?.addEventListener('click', async () => {
      const input = modal.querySelector<HTMLInputElement>('#input-new-acc');
      const val = input?.value.trim() ?? '';
      if (val.length >= 2) {
        this.activeAccount = await this.persistence.loginOrCreateAccount(val);
        this.selectedSlotIndex = 0;
        modal.remove();
        await this.showCharacterSelectScreen();
      }
    });
  }

  public startHudAndGameplay(character: CharacterSaveData): void {
    const cDef = CHARACTER_CLASSES[character.classId];
    this.lastCompanionMarkup = '';

    this.root.innerHTML = `
      <div class="hud-screen">
        <div id="damage-vignette" aria-hidden="true"></div>
        <div class="boss-hud hidden" id="boss-hud"><div class="eyebrow" id="boss-state">RIFT GUARDIAN</div><strong id="boss-name"></strong><div class="boss-track"><div id="boss-fill"></div></div><span id="boss-health"></span></div>
        <div class="hud-top">
          <div>
            <div class="hero-status-card">
              <div class="hero-status-top">
                <div class="hero-name-row">
                  <span class="hud-hero-name">${icon(CLASS_ICONS[character.classId], 22)} ${this.escapeHtml(character.name)}</span>
                  <span id="hud-lv" class="lv-pill">LV.${character.level}</span>
                </div>
                <span id="hud-save-badge" class="save-badge">✓ Saved</span>
              </div>
              <div class="bar-track">
                <div id="hud-hp-fill" class="bar-fill-hp" style="width: 100%"></div>
                <div id="hud-hp-label" class="bar-label">${character.currentHp} HP</div>
              </div>
              <div class="bar-track" style="height: 8px">
                <div id="hud-xp-fill" class="bar-fill-xp" style="width: 0%"></div>
                <div id="hud-xp-label" class="bar-label" style="font-size:0.55rem">XP</div>
              </div>
              <div class="currency-row">
                <span id="hud-gold">🪙 ${character.gold}G</span>
                <span id="hud-crystals" style="color:#4cc9f0">✦ ${character.aetherCrystals}</span>
                <span class="hero-class-label">${cDef.archetypeLabel}</span>
              </div>
            </div>

            <div id="hud-quest-tracker" class="quest-tracker-card">
              <div class="quest-tracker-header">
                <span id="hud-quest-chapter">📜 ACT I // THE RIFTSCAR CYCLE</span>
                <span id="hud-quest-step" class="quest-step-pill">STEP 1/9</span>
              </div>
              <div id="hud-quest-title" class="quest-obj-title">Speak with Commander Vael</div>
              <div id="hud-quest-hint" class="quest-obj-hint">Walk north toward Commander Vael in Starting Town.</div>
              <div id="hud-quest-progress" class="quest-obj-progress">0 / 1 Spoken</div>
              <div id="hud-quest-banter" class="companion-banter-quote"></div>
            </div>

            <div class="companion-party-card">
              <div style="font-size:0.62rem;font-weight:900;color:var(--accent-cyan);letter-spacing:0.08em;margin-bottom:3px;">
                THE ECLIPSE TRIAD
              </div>
              <div id="hud-companion-list"></div>
            </div>
          </div>

          <div class="wave-card">
            <div class="zone-route-steps">
              <span id="step-town" class="zone-step active">Town</span>
              <span>➔</span>
              <span id="step-stomping" class="zone-step">Wilds</span>
              <span>➔</span>
              <span id="step-market" class="zone-step">Market</span>
              <span>➔</span>
              <span id="step-ruins" class="zone-step">Ruins</span>
              <span>➔</span>
              <span id="step-sanctum" class="zone-step">Sanctum</span>
            </div>
            <div id="hud-wave-title" class="wave-title">STARTING TOWN</div>
            <div id="hud-wave-sub" class="wave-sub">Safe Zone • Walk North to Portal</div>
            <div id="hud-path-progress-wrap" class="path-progress-wrap" style="display:none;">
              <div id="hud-path-progress-fill" class="path-progress-fill" style="width:0%"></div>
            </div>
          </div>

          <div class="hud-top-right">
            <div class="minimap-wrap"><span class="map-north">N</span><canvas id="hud-minimap" width="220" height="220" aria-label="Local map: red fiends, gold allies, green portals"></canvas><div class="map-legend"><i></i> FIENDS <i></i> PORTALS</div></div>
            <div class="hud-btn-group">
              <button id="btn-hero-sheet" class="btn-anime btn-cyan" style="padding:6px 10px;font-size:0.7rem;">
                ${icon('bag', 16)} Gear <kbd>I</kbd>
              </button>
              <button id="btn-comp-sheet" class="btn-anime secondary-hud-action" style="padding:6px 10px;font-size:0.7rem;">
                Triad
              </button>
              <button id="btn-ability-sheet" class="btn-anime secondary-hud-action" style="padding:6px 10px;font-size:0.7rem;">
                Skills
              </button>
              <button id="btn-cutscenes-sheet" class="btn-anime secondary-hud-action" style="padding:6px 10px;font-size:0.7rem;">
                Story
              </button>
              <button id="btn-char-select" class="btn-anime secondary-hud-action" style="padding:6px 10px;font-size:0.7rem;">
                Heroes
              </button>
            </div>
            <button id="btn-world-atlas" class="hud-atlas-button interactive">${icon('map', 16)} WORLD ATLAS <kbd>M</kbd></button>
            <div class="hud-utilities interactive"><button id="btn-hud-help" class="quiet-button" aria-label="How to play">?</button><button id="btn-pause" class="quiet-button" aria-label="Pause game">${icon('pause', 18)}</button></div>
            <div id="hud-combo-box" class="combo-box hidden">
              <div id="hud-combo-rank" class="combo-rank">S</div>
              <div id="hud-combo-hits" class="combo-hits">12 HITS</div>
            </div>
          </div>
        </div>

        <div id="hud-center-banner" class="center-banner hidden">
          <div id="hud-banner-title" style="font-weight:900;font-size:1.1rem;color:var(--accent-gold);letter-spacing:0.12em;"></div>
          <div id="hud-banner-sub" style="font-size:0.78rem;color:#fff;margin-top:2px;"></div>
        </div>

        <div id="hud-ult-cutin" class="ultimate-cutin hidden">
          <div id="hud-ult-sub" style="font-size:0.78rem;font-weight:800;letter-spacing:0.15em;color:var(--accent-gold);"></div>
          <div id="hud-ult-title" style="font-size:1.65rem;font-weight:900;font-style:italic;text-transform:uppercase;color:#fff;"></div>
        </div>

        <div class="portal-prompt-wrap">
          <div id="hud-npc-box" class="npc-dialogue-box hidden">
            <div id="hud-npc-title" style="font-weight:900;color:var(--accent-gold);margin-bottom:2px;"></div>
            <div id="hud-npc-text" style="color:#f8f9fa;"></div>
            <button id="hud-quest-action-btn" class="quest-action-btn hidden">
              ✦ Accept Quest
            </button>
          </div>
          <button id="hud-portal-btn" class="portal-prompt-btn hidden">
            🌀 ENTER PORTAL [F / TAP]
          </button>
        </div>

        <div class="hud-bottom">
          <div class="desktop-move-hint"><div class="key-wasd"><kbd>W</kbd><div><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></div></div><span>MOVE<br><small>F to interact</small></span></div>
          <div class="expedition-meter" id="expedition-meter"><span class="eyebrow">SANCTUARY</span><strong id="expedition-count">A moment of respite</strong><small id="expedition-time">Flasks replenished · Vitality restored</small></div>
          <button id="btn-flask" class="flask-button interactive" aria-label="Use healing flask">${icon('flask', 24)}<span>MENDING FLASK<small id="flask-charges">3 / 3 charges</small></span><kbd>H</kbd></button>
          <div id="joystick-zone" class="joystick-zone" aria-label="Movement Thumbstick">
            <div id="joystick-knob" class="joystick-knob"></div>
          </div>

          <div class="action-cluster">
            <button id="act-ultimate" class="action-btn action-btn-ultimate" aria-label="Ultimate Skill">
              <span class="skill-icon">${icon('burst', 28)}</span><span class="btn-title">ECLIPSE</span>
              <span id="ult-pct-label" class="btn-key">0%</span>
              <div id="cd-ultimate" class="cd-overlay hidden"></div>
            </button>

            <button id="act-skill1" class="action-btn action-btn-skill1" aria-label="Skill 1">
              <span class="skill-icon">${icon('flame', 25)}</span><span class="btn-title">${cDef.skills.skill1.name.split(' ')[0]}</span>
              <span class="btn-key">Q / 1</span>
              <div id="cd-skill1" class="cd-overlay hidden"></div>
            </button>

            <button id="act-skill2" class="action-btn action-btn-skill2" aria-label="Skill 2">
              <span class="skill-icon">${icon('shield', 25)}</span><span class="btn-title">${cDef.skills.skill2.name.split(' ')[0]}</span>
              <span class="btn-key">E / 2</span>
              <div id="cd-skill2" class="cd-overlay hidden"></div>
            </button>

            <button id="act-dash" class="action-btn action-btn-dash" aria-label="Dash">
              <span class="skill-icon">${icon('dash', 25)}</span><span class="btn-title">EVADE</span>
              <span class="btn-key">SHIFT</span>
              <div id="cd-dash" class="cd-overlay hidden"></div>
            </button>

            <button id="act-basic" class="action-btn action-btn-basic" aria-label="Primary Attack">
              <span class="skill-icon">${icon(CLASS_ICONS[character.classId], 28)}</span><span class="btn-title">ATTACK</span>
              <span class="btn-key">LMB / J</span>
              <div id="cd-basic" class="cd-overlay hidden"></div>
            </button>
          </div>
        </div>
      </div>
    `;

    this.hudRefs = {
      hpFill: this.root.querySelector('#hud-hp-fill')!,
      hpLabel: this.root.querySelector('#hud-hp-label')!,
      xpFill: this.root.querySelector('#hud-xp-fill')!,
      xpLabel: this.root.querySelector('#hud-xp-label')!,
      lvPill: this.root.querySelector('#hud-lv')!,
      goldSpan: this.root.querySelector('#hud-gold')!,
      crystalSpan: this.root.querySelector('#hud-crystals')!,
      saveBadge: this.root.querySelector('#hud-save-badge')!,
      waveTitle: this.root.querySelector('#hud-wave-title')!,
      waveSub: this.root.querySelector('#hud-wave-sub')!,
      stepTown: this.root.querySelector('#step-town')!,
      stepStomping: this.root.querySelector('#step-stomping')!,
      stepMarket: this.root.querySelector('#step-market')!,
      stepRuins: this.root.querySelector('#step-ruins')!,
      stepSanctum: this.root.querySelector('#step-sanctum')!,
      pathProgressWrap: this.root.querySelector('#hud-path-progress-wrap')!,
      pathProgressFill: this.root.querySelector('#hud-path-progress-fill')!,
      portalBtn: this.root.querySelector('#hud-portal-btn')!,
      npcBox: this.root.querySelector('#hud-npc-box')!,
      npcTitle: this.root.querySelector('#hud-npc-title')!,
      npcText: this.root.querySelector('#hud-npc-text')!,
      questActionBtn: this.root.querySelector('#hud-quest-action-btn')!,
      questChapterSpan: this.root.querySelector('#hud-quest-chapter')!,
      questStepPill: this.root.querySelector('#hud-quest-step')!,
      questObjTitle: this.root.querySelector('#hud-quest-title')!,
      questObjHint: this.root.querySelector('#hud-quest-hint')!,
      questObjProgress: this.root.querySelector('#hud-quest-progress')!,
      questBanterDiv: this.root.querySelector('#hud-quest-banter')!,
      companionListDiv: this.root.querySelector('#hud-companion-list')!,
      comboBox: this.root.querySelector('#hud-combo-box')!,
      comboRank: this.root.querySelector('#hud-combo-rank')!,
      comboHits: this.root.querySelector('#hud-combo-hits')!,
      ultBtn: this.root.querySelector('#act-ultimate')!,
      ultLabel: this.root.querySelector('#ult-pct-label')!,
      cdOverlays: {
        basic: this.root.querySelector('#cd-basic')!,
        dash: this.root.querySelector('#cd-dash')!,
        skill1: this.root.querySelector('#cd-skill1')!,
        skill2: this.root.querySelector('#cd-skill2')!,
        ultimate: this.root.querySelector('#cd-ultimate')!,
      },
      centerBanner: this.root.querySelector('#hud-center-banner')!,
      centerBannerTitle: this.root.querySelector('#hud-banner-title')!,
      centerBannerSub: this.root.querySelector('#hud-banner-sub')!,
      ultCutin: this.root.querySelector('#hud-ult-cutin')!,
      ultCutinTitle: this.root.querySelector('#hud-ult-title')!,
      ultCutinSub: this.root.querySelector('#hud-ult-sub')!,
    };

    // Bind virtual thumbstick & skill buttons
    const joystickZone = this.root.querySelector<HTMLElement>('#joystick-zone')!;
    const joystickKnob = this.root.querySelector<HTMLElement>('#joystick-knob')!;
    const actionMap = new Map<ActionId, HTMLElement>([
      ['basic', this.root.querySelector('#act-basic')!],
      ['dash', this.root.querySelector('#act-dash')!],
      ['skill1', this.root.querySelector('#act-skill1')!],
      ['skill2', this.root.querySelector('#act-skill2')!],
      ['ultimate', this.root.querySelector('#act-ultimate')!],
    ]);

    this.engine.input.bindVirtualControls(joystickZone, joystickKnob, actionMap);

    this.root.querySelector('#btn-world-atlas')?.addEventListener('click', () => this.openAtlas());
    this.root.querySelector('#btn-pause')?.addEventListener('click', () => this.openPauseMenu());
    this.root.querySelector('#btn-hud-help')?.addEventListener('click', () => this.openHelp());
    this.root.querySelector('#btn-flask')?.addEventListener('click', () => this.engine.useFlask());

    // Top-right HUD buttons
    this.root.querySelector('#btn-char-select')?.addEventListener('click', async () => {
      this.cutsceneDirector.stop();
      this.engine.setCutsceneCameraShot(null);
      if (!await this.engine.saveActiveCharacterNow()) return;
      await this.showCharacterSelectScreen();
    });

    this.root.querySelector('#btn-hero-sheet')?.addEventListener('click', () => {
      this.openCommandDeckModal('inventory');
    });
    this.root.querySelector('#btn-comp-sheet')?.addEventListener('click', () => {
      this.openCommandDeckModal('companions');
    });
    this.root.querySelector('#btn-ability-sheet')?.addEventListener('click', () => {
      this.openCommandDeckModal('abilities');
    });
    this.root.querySelector('#btn-cutscenes-sheet')?.addEventListener('click', () => {
      this.openCommandDeckModal('cutscenes');
    });

    this.hudRefs.portalBtn.addEventListener('click', () => {
      this.engine.tryTraverseNearbyPortal();
    });

    this.hudRefs.questActionBtn.addEventListener('click', () => {
      this.engine.interactWithNearbyQuestNpc();
    });

    const accountRoster = this.slots.filter((s): s is CharacterSaveData => s !== null);
    this.engine.startGameplayWithCharacter(character, accountRoster);
  }

  public playCutscene(cutsceneId: CutsceneId): void {
    const char = this.engine.getActiveCharacter();
    if (!char) return;

    this.engine.setPaused('cutscene', true);
    const script = buildCutsceneScript(char ? cutsceneId : 'prologue_triad_awakening', char);
    this.cutsceneDirector.play(
      this.root,
      script,
      (frame) => {
        this.engine.setCutsceneCameraShot(
          {
            cameraOffset: frame.cameraOffset,
            lookAtOffset: frame.lookAtOffset,
          },
          frame.vfxBurst
        );
      },
      () => {
        this.engine.setCutsceneCameraShot(null);
        this.engine.setPaused('cutscene', false);
      }
    );
  }

  public openCommandDeckModal(initialTab?: CommandDeckTab): void {
    if (initialTab) {
      this.deckTab = initialTab;
      this.deckFeedbackMsg = null;
    }

    const existing = this.root.querySelector('#command-deck-modal');
    if (existing) existing.remove();

    const char = this.engine.getActiveCharacter();
    if (!char) return;
    this.engine.setPaused('deck', true);
    const stats = computeEffectiveStats(char);
    const pwr = computePowerRating(char);
    const cDef = CHARACTER_CLASSES[char.classId];
    const [comp1Class, comp2Class] = getCompanionClassesForPlayer(char.classId);

    const modal = document.createElement('div');
    modal.id = 'command-deck-modal';
    modal.className = 'modal-backdrop';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Command deck');

    let tabBodyHtml = '';

    if (this.deckTab === 'inventory') {
      const sortedItems = ManagementSystem.sortAndFilterInventory(
        char.inventory,
        this.invFilter,
        this.invSort
      );
      if (!this.inspectedItemId || !char.inventory.some((i) => i.id === this.inspectedItemId)) {
        this.inspectedItemId = sortedItems[0]?.id ?? null;
      }
      const inspected = char.inventory.find((i) => i.id === this.inspectedItemId) ?? null;

      let inspectorHtml = '';
      if (inspected) {
        const currentEquippedInSlot =
          inspected.slot === 'weapon' ? char.equipped.weapon : char.equipped.charm;
        const delta = ManagementSystem.compareWithEquipped(inspected, currentEquippedInSlot);
        const upgLv = inspected.upgradeLevel ?? 0;
        const goldCost = 80 + upgLv * 65;
        const crystalCost = 8 + upgLv * 5;
        const fmtDelta = (val: number, suffix = '') =>
          val > 0
            ? `<span style="color:#80ed99">(+${val}${suffix})</span>`
            : val < 0
              ? `<span style="color:#ff4d6d">(${val}${suffix})</span>`
              : `<span style="color:#9aa5ce">(0${suffix})</span>`;

        inspectorHtml = `
          <div class="inspector-card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <div style="font-weight:900;font-size:0.88rem;" class="rarity-${inspected.rarity}">
                ${inspected.icon} ${this.escapeHtml(inspected.name)} ${upgLv > 0 ? `[+${upgLv}]` : ''}
                ${inspected.locked ? '🔒' : ''}
              </div>
              <span class="slot-counter">${inspected.rarity.toUpperCase()} ${inspected.slot.toUpperCase()}</span>
            </div>
            <div style="font-size:0.74rem;color:#fff;margin-bottom:8px;">
              ATK: <strong>+${inspected.attackBonus}</strong> ${fmtDelta(delta.attackDelta)} •
              HP: <strong>+${inspected.maxHpBonus}</strong> ${fmtDelta(delta.hpDelta)} •
              CRIT: <strong>+${Math.round(inspected.critRateBonus * 100)}%</strong>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;">
              <button id="act-equip-hero" class="btn-anime btn-primary" style="padding:6px 10px;font-size:0.7rem;">
                ★ Equip on ${this.escapeHtml(char.name)}
              </button>
              <button id="act-equip-comp1" class="btn-anime btn-cyan" style="padding:6px 10px;font-size:0.7rem;">
                🤝 Give to ${CANONICAL_HERO_NAMES[comp1Class]}
              </button>
              <button id="act-equip-comp2" class="btn-anime btn-cyan" style="padding:6px 10px;font-size:0.7rem;">
                🤝 Give to ${CANONICAL_HERO_NAMES[comp2Class]}
              </button>
              <button id="act-starforge" class="btn-anime" style="padding:6px 10px;font-size:0.7rem;border-color:var(--accent-gold);">
                🔨 Starforge +${upgLv + 1} (${goldCost}G / ${crystalCost}✦)
              </button>
              <button id="act-lock-item" class="btn-anime" style="padding:6px 10px;font-size:0.7rem;">
                ${inspected.locked ? '🔓 Unlock' : '🔒 Lock'}
              </button>
              <button id="act-salvage-item" class="btn-anime btn-danger" style="padding:6px 10px;font-size:0.7rem;">
                ♻️ Salvage
              </button>
            </div>
          </div>
        `;
      }

      const compConfigs = ensureCompanionConfigs(char);
      const itemsGridHtml = sortedItems
        .map((item) => {
          const isHeroEq =
            char.equipped.weapon?.id === item.id || char.equipped.charm?.id === item.id;
          const isComp1Eq =
            compConfigs[comp1Class].equipped.weapon?.id === item.id ||
            compConfigs[comp1Class].equipped.charm?.id === item.id;
          const isComp2Eq =
            compConfigs[comp2Class].equipped.weapon?.id === item.id ||
            compConfigs[comp2Class].equipped.charm?.id === item.id;
          const isSelected = item.id === this.inspectedItemId;
          const upg = item.upgradeLevel ? ` +${item.upgradeLevel}` : '';
          let badge = 'Tap to Inspect';
          if (isHeroEq) badge = `★ EQUIPPED (${char.name})`;
          else if (isComp1Eq) badge = `🤝 EQUIPPED (${CANONICAL_HERO_NAMES[comp1Class]})`;
          else if (isComp2Eq) badge = `🤝 EQUIPPED (${CANONICAL_HERO_NAMES[comp2Class]})`;

          return `
            <div class="inv-item ${isHeroEq || isComp1Eq || isComp2Eq ? 'equipped' : ''}"
                 style="${isSelected ? 'outline:2px solid #4cc9f0;' : ''}"
                 data-item-id="${item.id}">
              <div style="font-weight:800;" class="rarity-${item.rarity}">
                ${item.icon} ${this.escapeHtml(item.name)}${upg} ${item.locked ? '🔒' : ''}
              </div>
              <div style="color:var(--text-muted);font-size:0.68rem;">
                ${item.slot.toUpperCase()} • +${item.attackBonus} ATK • +${item.maxHpBonus} HP
              </div>
              <div style="font-size:0.65rem;color:var(--accent-gold);margin-top:2px;">
                ${badge}
              </div>
            </div>
          `;
        })
        .join('');

      tabBodyHtml = `
        <div class="stat-grid">
          <div class="stat-box"><span>Max HP / DEF</span><span>${stats.maxHp} / ${stats.defense}</span></div>
          <div class="stat-box"><span>Attack / Crit</span><span>${stats.attack} / ${Math.round(stats.critRate * 100)}%</span></div>
          <div class="stat-box"><span>Equipped Weapon</span><span>${char.equipped.weapon?.name ?? 'None'}</span></div>
          <div class="stat-box"><span>Equipped Charm</span><span>${char.equipped.charm?.name ?? 'None'}</span></div>
        </div>
        ${inspectorHtml}
        <div class="filter-bar">
          <div style="display:flex;gap:4px;">
            <button class="pill-btn ${this.invFilter === 'all' ? 'active' : ''}" data-filter="all">All (${char.inventory.length})</button>
            <button class="pill-btn ${this.invFilter === 'weapon' ? 'active' : ''}" data-filter="weapon">Weapons</button>
            <button class="pill-btn ${this.invFilter === 'charm' ? 'active' : ''}" data-filter="charm">Charms</button>
          </div>
          <div style="display:flex;gap:4px;">
            <button class="pill-btn ${this.invSort === 'power' ? 'active' : ''}" data-sort="power">Sort: Power</button>
            <button class="pill-btn ${this.invSort === 'rarity' ? 'active' : ''}" data-sort="rarity">Rarity</button>
            <button id="btn-bulk-salvage" class="pill-btn" style="border-color:#ff4d6d;color:#ffb3c1;">
              ♻️ Salvage Unwanted
            </button>
          </div>
        </div>
        <div class="inv-grid">${itemsGridHtml}</div>
      `;
    } else if (this.deckTab === 'companions') {
      const compConfigs = ensureCompanionConfigs(char);
      const companionCardsHtml = ([comp1Class, comp2Class] as CharacterClassId[])
        .map((cClass) => {
          const compDef = CHARACTER_CLASSES[cClass];
          const cfg = compConfigs[cClass];
          const cName = CANONICAL_HERO_NAMES[cClass];
          const bondBonusPct = (cfg.bondLevel - 1) * 12;
          const goldCost = 100 * cfg.bondLevel;
          const crystalCost = 12 * cfg.bondLevel;

          const stancesHtml = (['aggressive', 'balanced', 'support'] as CompanionTacticalStance[])
            .map((st) => {
              const info = COMPANION_STANCE_INFO[st];
              return `
                <div class="choice-card ${cfg.stance === st ? 'active' : ''}"
                     data-comp-stance="${cClass}:${st}">
                  <div style="font-weight:800;color:#fff;margin-bottom:2px;">${info.label}</div>
                  <div style="color:var(--text-muted);font-size:0.63rem;">${info.description}</div>
                </div>
              `;
            })
            .join('');

          return `
            <div class="companion-mgmt-card" style="border-left:4px solid ${compDef.elementColor}">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <div>
                  <span style="font-weight:900;font-size:0.9rem;color:${compDef.elementColor}">
                    ${compDef.starterWeapon.icon} ${cName} — ${compDef.archetypeLabel}
                  </span>
                  <div style="font-size:0.68rem;color:var(--text-muted);">
                    Bond Rank <strong>Lv.${cfg.bondLevel}/10</strong> (+${bondBonusPct}% Companion Damage) •
                    Weapon: <strong>${cfg.equipped.weapon?.name ?? compDef.starterWeapon.name}</strong> •
                    Charm: <strong>${cfg.equipped.charm?.name ?? 'None'}</strong>
                  </div>
                </div>
                <button class="btn-anime btn-cyan" data-train-comp="${cClass}" style="padding:6px 10px;font-size:0.68rem;">
                  ⬆️ Train Bond (${goldCost}G / ${crystalCost}✦)
                </button>
              </div>
              <div style="font-size:0.68rem;color:var(--accent-gold);font-weight:800;">
                AI TACTICAL STANCE:
              </div>
              <div class="stance-row">${stancesHtml}</div>
            </div>
          `;
        })
        .join('');

      tabBodyHtml = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <p style="font-size:0.75rem;color:var(--text-muted);">
            Configure your two active Eclipse Triad companions' AI combat stances, bond ranks, and synchronized bursts.
          </p>
          <button id="btn-trigger-synergy" class="btn-anime btn-primary" style="padding:8px 14px;font-size:0.72rem;">
            ⚡ Trigger Triad Synergy Burst
          </button>
        </div>
        ${companionCardsHtml}
      `;
    } else if (this.deckTab === 'abilities') {
      const runes = ensureSkillRunes(char);
      const skillEntries: Array<{
        key: 'basic' | 'skill1' | 'skill2' | 'ultimate';
        runeMap: Record<string, { id: string; name: string; effectSummary: string }>;
        selectedRune: string;
      }> = [
        { key: 'basic', runeMap: SKILL_RUNE_CATALOG.basic, selectedRune: runes.basic },
        { key: 'skill1', runeMap: SKILL_RUNE_CATALOG.skill1, selectedRune: runes.skill1 },
        { key: 'skill2', runeMap: SKILL_RUNE_CATALOG.skill2, selectedRune: runes.skill2 },
        { key: 'ultimate', runeMap: SKILL_RUNE_CATALOG.ultimate, selectedRune: runes.ultimate },
      ];

      tabBodyHtml = skillEntries
        .map(({ key, runeMap, selectedRune }) => {
          const sk = cDef.skills[key];
          const lv = char.skillLevels[key];
          const goldCost = 90 * lv;
          const crystalCost = 10 * lv;

          const runeCards = Object.values(runeMap)
            .map(
              (r) => `
              <div class="choice-card ${r.id === selectedRune ? 'active' : ''}"
                   data-skill-rune="${key}:${r.id}">
                <div style="font-weight:800;color:var(--accent-gold);margin-bottom:2px;">
                  ✦ ${r.name} ${r.id === selectedRune ? '(ACTIVE)' : ''}
                </div>
                <div style="color:#f8f9fa;font-size:0.65rem;">${r.effectSummary}</div>
              </div>
            `
            )
            .join('');

          return `
            <div class="ability-mgmt-card">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <div>
                  <span style="font-weight:900;font-size:0.86rem;color:#fff;">
                    ${sk.name} <span style="color:var(--accent-cyan)">[Rank Lv.${lv}]</span>
                  </span>
                  <div style="font-size:0.68rem;color:var(--text-muted);">${sk.description}</div>
                </div>
                <button class="btn-anime btn-primary" data-upgrade-skill="${key}" style="padding:6px 10px;font-size:0.68rem;">
                  ⬆️ Rank Up (${goldCost}G / ${crystalCost}✦)
                </button>
              </div>
              <div class="rune-row">${runeCards}</div>
            </div>
          `;
        })
        .join('');
    } else {
      // Cutscenes Theatre Tab
      const seenSet = new Set(char.seenCutscenes ?? []);
      tabBodyHtml = `
        <p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:10px;">
          Watch or replay full widescreen 3D Anime Story Cinematics starring ${this.escapeHtml(char.name)} and the Eclipse Triad companions:
        </p>
        <div class="slot-list">
          ${CUTSCENE_CATALOG_META.map(
            (ep) => `
            <div class="char-slot-card" data-play-cutscene="${ep.id}">
              <div class="slot-left">
                <div class="slot-badge">🎬</div>
                <div class="slot-info">
                  <h4>${ep.episodeLabel} — ${ep.title}</h4>
                  <p>${ep.zoneLabel} • ${seenSet.has(ep.id) ? '✓ Viewed' : 'Unlocked'}</p>
                </div>
              </div>
              <button class="btn-anime btn-primary" style="padding:6px 12px;font-size:0.72rem;">
                ▶ PLAY CINEMATIC
              </button>
            </div>
          `
          ).join('')}
        </div>
      `;
    }

    modal.innerHTML = `
      <div class="modal-card">
        <div class="panel-header">
          <span class="panel-title">
            ${cDef.starterWeapon.icon} ${this.escapeHtml(char.name)} // Lv.${char.level} (⚡ ${pwr} • 🪙 ${char.gold}G • ✦ ${char.aetherCrystals})
          </span>
          <button id="btn-close-inv" class="btn-anime" style="padding:4px 9px;">✕</button>
        </div>

        <div class="deck-tabs">
          <div class="deck-tab ${this.deckTab === 'inventory' ? 'active' : ''}" data-deck-tab="inventory">
            🎒 Inventory (${char.inventory.length} items)
          </div>
          <div class="deck-tab ${this.deckTab === 'companions' ? 'active' : ''}" data-deck-tab="companions">
            🤝 Companions (2)
          </div>
          <div class="deck-tab ${this.deckTab === 'abilities' ? 'active' : ''}" data-deck-tab="abilities">
            ⚡ Abilities &amp; Runes
          </div>
          <div class="deck-tab ${this.deckTab === 'cutscenes' ? 'active' : ''}" data-deck-tab="cutscenes">
            🎬 Story Cutscenes
          </div>
        </div>

        ${
          this.deckFeedbackMsg
            ? `<div style="background:rgba(76,201,240,0.16);border:1px solid var(--accent-cyan);padding:6px 10px;border-radius:7px;font-size:0.74rem;color:#fff;margin-bottom:8px;font-weight:700;">✦ ${this.escapeHtml(this.deckFeedbackMsg)}</div>`
            : ''
        }

        ${tabBodyHtml}
      </div>
    `;

    this.root.appendChild(modal);

    modal.querySelector('#btn-close-inv')?.addEventListener('click', () => this.closeDeck());
    modal.querySelector<HTMLButtonElement>('#btn-close-inv')?.focus();

    modal.querySelectorAll<HTMLElement>('[data-deck-tab]').forEach((tabEl) => {
      tabEl.addEventListener('click', () => {
        this.deckTab = tabEl.dataset.deckTab as CommandDeckTab;
        this.deckFeedbackMsg = null;
        this.openCommandDeckModal();
      });
    });

    // Inventory Tab bindings
    modal.querySelectorAll<HTMLElement>('[data-item-id]').forEach((el) => {
      el.addEventListener('click', () => {
        this.inspectedItemId = el.dataset.itemId!;
        this.deckFeedbackMsg = null;
        this.openCommandDeckModal();
      });
    });

    modal.querySelectorAll<HTMLElement>('[data-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.invFilter = btn.dataset.filter as 'all' | 'weapon' | 'charm';
        this.openCommandDeckModal();
      });
    });

    modal.querySelectorAll<HTMLElement>('[data-sort]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.invSort = btn.dataset.sort as 'power' | 'rarity' | 'attack';
        this.openCommandDeckModal();
      });
    });

    modal.querySelector('#act-equip-hero')?.addEventListener('click', async () => {
      if (!this.inspectedItemId) return;
      await this.engine.equipInventoryItem(this.inspectedItemId);
      this.deckFeedbackMsg = 'Equipped item on active Hero!';
      this.openCommandDeckModal();
    });

    modal.querySelector('#act-equip-comp1')?.addEventListener('click', async () => {
      if (!this.inspectedItemId) return;
      await this.engine.mutateActiveCharacter((c) => {
        const res = ManagementSystem.equipItemOnCompanion(c, comp1Class, this.inspectedItemId!);
        this.deckFeedbackMsg = res.message;
      });
      this.openCommandDeckModal();
    });

    modal.querySelector('#act-equip-comp2')?.addEventListener('click', async () => {
      if (!this.inspectedItemId) return;
      await this.engine.mutateActiveCharacter((c) => {
        const res = ManagementSystem.equipItemOnCompanion(c, comp2Class, this.inspectedItemId!);
        this.deckFeedbackMsg = res.message;
      });
      this.openCommandDeckModal();
    });

    modal.querySelector('#act-starforge')?.addEventListener('click', async () => {
      if (!this.inspectedItemId) return;
      await this.engine.mutateActiveCharacter((c) => {
        const res = ManagementSystem.upgradeItemStarforge(c, this.inspectedItemId!);
        this.deckFeedbackMsg = res.message;
      });
      this.openCommandDeckModal();
    });

    modal.querySelector('#act-lock-item')?.addEventListener('click', async () => {
      if (!this.inspectedItemId) return;
      await this.engine.mutateActiveCharacter((c) => {
        const locked = ManagementSystem.toggleLockItem(c, this.inspectedItemId!);
        this.deckFeedbackMsg = locked ? 'Item locked.' : 'Item unlocked.';
      });
      this.openCommandDeckModal();
    });

    modal.querySelector('#act-salvage-item')?.addEventListener('click', async () => {
      if (!this.inspectedItemId) return;
      await this.engine.mutateActiveCharacter((c) => {
        const res = ManagementSystem.salvageItem(c, this.inspectedItemId!);
        this.deckFeedbackMsg = res.message;
      });
      this.openCommandDeckModal();
    });

    modal.querySelector('#btn-bulk-salvage')?.addEventListener('click', async () => {
      await this.engine.mutateActiveCharacter((c) => {
        const res = ManagementSystem.salvageBulkByRarity(c, 'rare');
        this.deckFeedbackMsg =
          res.count > 0
            ? `Bulk salvaged ${res.count} items for +${res.goldGained}G & +${res.crystalsGained}✦!`
            : 'No unequipped, unlocked Common/Rare items to salvage.';
      });
      this.openCommandDeckModal();
    });

    // Companions Tab bindings
    modal.querySelectorAll<HTMLElement>('[data-comp-stance]').forEach((card) => {
      card.addEventListener('click', async () => {
        const [cClass, stance] = card.dataset.compStance!.split(':') as [
          CharacterClassId,
          CompanionTacticalStance,
        ];
        await this.engine.mutateActiveCharacter((c) => {
          ManagementSystem.setCompanionStance(c, cClass, stance);
          this.deckFeedbackMsg = `Updated ${CANONICAL_HERO_NAMES[cClass]}'s stance to ${COMPANION_STANCE_INFO[stance].label}!`;
        });
        this.openCommandDeckModal();
      });
    });

    modal.querySelectorAll<HTMLElement>('[data-train-comp]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const cClass = btn.dataset.trainComp as CharacterClassId;
        await this.engine.mutateActiveCharacter((c) => {
          const res = ManagementSystem.trainCompanionBond(c, cClass);
          this.deckFeedbackMsg = res.message;
        });
        this.openCommandDeckModal();
      });
    });

    modal.querySelector('#btn-trigger-synergy')?.addEventListener('click', () => {
      this.engine.triggerCompanionSynergyBurst();
      modal.remove();
    });

    // Abilities Tab bindings
    modal.querySelectorAll<HTMLElement>('[data-upgrade-skill]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const key = btn.dataset.upgradeSkill as 'basic' | 'skill1' | 'skill2' | 'ultimate';
        await this.engine.mutateActiveCharacter((c) => {
          const res = ManagementSystem.upgradeAbilityRank(c, key);
          this.deckFeedbackMsg = res.message;
        });
        this.openCommandDeckModal();
      });
    });

    modal.querySelectorAll<HTMLElement>('[data-skill-rune]').forEach((card) => {
      card.addEventListener('click', async () => {
        const [skillKey, runeId] = card.dataset.skillRune!.split(':');
        await this.engine.mutateActiveCharacter((c) => {
          const r = ensureSkillRunes(c);
          if (skillKey === 'basic') r.basic = runeId as BasicRuneId;
          else if (skillKey === 'skill1') r.skill1 = runeId as Skill1RuneId;
          else if (skillKey === 'skill2') r.skill2 = runeId as Skill2RuneId;
          else if (skillKey === 'ultimate') r.ultimate = runeId as UltimateRuneId;
          this.deckFeedbackMsg = `Activated Mastery Rune: ${runeId.toUpperCase()}!`;
        });
        this.openCommandDeckModal();
      });
    });

    // Cutscenes Tab bindings
    modal.querySelectorAll<HTMLElement>('[data-play-cutscene]').forEach((row) => {
      row.addEventListener('click', () => {
        const cId = row.dataset.playCutscene as CutsceneId;
        this.closeDeck();
        this.engine.triggerCutscene(cId);
      });
    });
  }

  private closeDeck(): void {
    this.root.querySelector('#command-deck-modal')?.remove();
    this.engine.setPaused('deck', false);
    this.root.querySelector<HTMLButtonElement>('#btn-hero-sheet')?.focus();
  }

  private closeOverlay(): void {
    this.root.querySelector('#game-menu')?.remove();
    this.engine.setPaused('menu', false);
    this.previousFocus?.focus();
  }

  private openOverlay(title: string, content: string, actions: { label: string; action: () => void | Promise<void> }[], eyebrow = 'ASTRAL CHRONICLES'): void {
    if (!this.root.querySelector('#game-menu')) this.previousFocus = document.activeElement as HTMLElement;
    this.root.querySelector('#game-menu')?.remove();
    this.engine.setPaused('menu', true);
    const overlay = document.createElement('div');
    overlay.id = 'game-menu';
    overlay.className = 'game-menu modal-backdrop';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'menu-title');
    overlay.innerHTML = `<section class="game-menu-card"><div class="menu-emblem">${icon('star', 36)}</div><span class="eyebrow">${eyebrow}</span><h2 id="menu-title">${title}</h2><div class="menu-content">${content}</div><div class="menu-actions">${actions.map((action, i) => `<button class="btn-anime ${i === 0 ? 'btn-primary' : ''}" data-menu-action="${i}">${action.label}</button>`).join('')}</div></section>`;
    actions.forEach((action, i) => overlay.querySelector(`[data-menu-action="${i}"]`)?.addEventListener('click', async () => {
      const button = overlay.querySelector<HTMLButtonElement>(`[data-menu-action="${i}"]`)!;
      button.disabled = true;
      try { await action.action(); } finally { button.disabled = false; }
    }));
    this.root.appendChild(overlay);
    overlay.querySelector<HTMLButtonElement>('button')?.focus();
  }

  public openPauseMenu(): void {
    if (!this.hudRefs || this.cutsceneDirector.isPlaying()) return;
    this.openOverlay('Take a breath.', `<p>Your triad will wait. The world is paused.</p><div class="pause-settings"><button id="toggle-audio" class="setting-row">Sound effects <span>${this.engine.audio.muted ? 'OFF' : 'ON'}</span></button><button id="toggle-shake" class="setting-row">Camera shake <span>${this.shakeEnabled ? 'ON' : 'OFF'}</span></button></div>`, [
      { label: 'Return to the journey', action: () => this.closeOverlay() },
      { label: 'World atlas & journal', action: () => this.openAtlas() },
      { label: 'How to play', action: () => this.openHelp() },
      { label: 'Save & return to heroes', action: async () => {
        if (!await this.engine.saveActiveCharacterNow()) {
          const message = this.root.querySelector('#game-menu .menu-content p');
          if (message) message.textContent = 'Saving failed. Check browser storage, then try again. Your session is still active.';
          return;
        }
        this.closeOverlay();
        await this.showCharacterSelectScreen();
      } },
    ], 'JOURNEY PAUSED');
    this.root.querySelector('#toggle-audio')?.addEventListener('click', () => { this.engine.audio.toggle(); this.openPauseMenu(); });
    this.root.querySelector('#toggle-shake')?.addEventListener('click', () => {
      this.shakeEnabled = !this.shakeEnabled;
      this.engine.setScreenShake(this.shakeEnabled);
      try { localStorage.setItem('astral-screen-shake', String(this.shakeEnabled)); } catch { /* optional preference */ }
      this.openPauseMenu();
    });
  }

  private openHelp(): void {
    this.openOverlay('Every legend starts here.', `<p>Follow the gold compass to memory stones, sealed shrines, and guardians. The Long Dawn spans twelve chapters in six belllands. Press M for the world atlas, journal, and recovered histories.</p><div class="controls-guide"><span>Move</span><kbd>W A S D / Arrows</kbd><span>Attack · hold to chain</span><kbd>Left mouse / J / Space</kbd><span>Evade · brief invulnerability</span><kbd>Shift / K</kbd><span>Abilities / Ultimate</span><kbd>Q · E / R</kbd><span>Heal · 40% vitality</span><kbd>H</kbd><span>Talk / Enter portal</span><kbd>F / Enter</kbd><span>World atlas / journal</span><kbd>M</kbd><span>Gear / Pause</span><kbd>I / Esc</kbd></div><p class="help-tip">Leave red circles before they fill. Some guardian rings have a safe center. Dash through a strike to gain 12 Eclipse energy. Your three flask charges refill in sanctuaries. On touchscreens, use the thumbstick and ability buttons.</p>`, [
      { label: this.hudRefs ? 'Ready to venture forth' : 'Choose your hero', action: () => this.closeOverlay() },
    ], 'FIELD GUIDE');
  }

  public showDefeat(): void {
    this.openOverlay('Even stars fall.', '<p>The rift claimed this battle. Your gold, equipment, and experience are safe.</p><p class="help-tip">Keep moving when an enemy marks the ground. Your dash can carry you through a strike, and a mending flask restores 40% of your vitality.</p>', [
      { label: 'Rise at Aetherhaven', action: () => { this.closeOverlay(); this.engine.reviveAtSanctuary(); } },
    ], 'TRIAD DEFEATED');
    this.root.querySelector('#game-menu')?.setAttribute('data-locked', 'true');
  }

  public showExpeditionReport(report: ExpeditionReport): void {
    const minutes = Math.floor(report.seconds / 60);
    const seconds = Math.floor(report.seconds % 60).toString().padStart(2, '0');
    this.openOverlay('The path is yours.', `<p>${ZONE_LABELS[report.zone]} is clear. All spoils have been collected.</p><div class="report-stats"><div><strong>${report.kills}</strong><small>FIENDS SLAIN</small></div><div><strong>${minutes}:${seconds}</strong><small>TIME</small></div><div><strong>${report.gold}</strong><small>GOLD EARNED</small></div></div><div class="report-distinction">${report.damageTaken === 0 ? '✧ UNTOUCHED · A flawless expedition' : `${report.damageTaken} damage endured · The triad stands together`}</div><p class="help-tip">Follow the compass to the far portal to continue your journey.</p>`, [
      { label: 'Onward, together', action: () => this.closeOverlay() },
    ], 'EXPEDITION COMPLETE');
  }

  public showLootToast(name: string, rarity: string): void {
    const old = this.root.querySelector('.loot-toast');
    old?.remove();
    const toast = document.createElement('div');
    toast.className = `loot-toast rarity-${rarity}`;
    toast.setAttribute('role', 'status');
    toast.innerHTML = `${icon('bag', 22)}<span><small>${this.escapeHtml(rarity.toUpperCase())} ITEM ACQUIRED</small><strong>${this.escapeHtml(name)}</strong></span><kbd>I</kbd>`;
    this.root.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3800);
  }

  private handleMenuKey = (event: KeyboardEvent): void => {
    if (event.target instanceof HTMLElement && (event.target.matches('input, textarea, select') || event.target.isContentEditable)) return;
    const modal = this.root.querySelector<HTMLElement>('[role="dialog"]');
    if (event.code === 'Tab' && modal) {
      const buttons = Array.from(modal.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, [tabindex="0"]'));
      if (buttons.length) {
        const first = buttons[0]; const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
    if (this.engine.isFinishing) { if (event.code === 'Escape') { event.preventDefault(); this.engine.skipBossFinisher(); } return; }
    if (event.repeat || this.cutsceneDirector.isPlaying() || this.root.querySelector('#game-menu[data-locked]')) return;
    if (event.code === 'Escape') {
      event.preventDefault();
      if (this.root.querySelector('#game-menu[data-locked]')) return;
      if (this.root.querySelector('#game-menu')) this.closeOverlay();
      else if (this.root.querySelector('#command-deck-modal')) this.closeDeck();
      else this.openPauseMenu();
    } else if (event.code === 'KeyM' && !this.root.querySelector('#game-menu[data-locked]')) {
      if (this.root.querySelector('#command-deck-modal')) this.closeDeck();
      this.openAtlas();
    } else if (event.code === 'KeyI' && this.hudRefs && !this.root.querySelector('#game-menu')) {
      if (this.root.querySelector('#command-deck-modal')) this.closeDeck();
      else this.openCommandDeckModal('inventory');
    } else if (event.code === 'Slash' && event.shiftKey) this.openHelp();
  };

  public openAtlas(): void {
    if (this.engine.isFinishing) return;
    const character = this.hudRefs ? this.engine.getActiveCharacter() : this.slots[this.selectedSlotIndex];
    if (!character) { this.openHelp(); return; }
    const state = ensureCampaign(character);
    let content = '';
    const nav = `<nav class="atlas-tabs">${(['world', 'journal', 'codex'] as const).map(tab => `<button data-atlas-tab="${tab}" class="${tab === this.atlasTab ? 'active' : ''}">${tab === 'world' ? 'The six belllands' : tab === 'journal' ? 'Your journal' : 'World codex'}</button>`).join('')}</nav>`;
    if (this.atlasTab === 'world') {
      content = `<p class="atlas-intro">The kingdom bought its morning with people. Follow the stolen names through six belllands and decide what the next dawn will carry.</p><div class="atlas-grid">${CHRONICLE_CHAPTERS.map((chapter, i) => {
        const unlocked = chapterUnlocked(state, i); const complete = state.completedChapterIds.includes(chapter.id);
        return `<article class="atlas-chapter ${unlocked ? 'unlocked' : 'locked'} ${complete ? 'completed' : ''}" style="--region-glow:#${chapter.palette.glow.toString(16).padStart(6, '0')}"><span class="atlas-chapter-number">${String(i + 1).padStart(2, '0')}</span><span class="eyebrow">${REGION_NAMES[chapter.region]}</span><h3>${chapter.title}</h3><p>${chapter.subtitle}</p><div class="atlas-guardian">${chapter.guardian.name}</div><button class="btn-anime ${unlocked && !complete ? 'btn-primary' : ''}" data-travel-chapter="${i}" ${unlocked ? '' : 'disabled'}>${complete ? 'Revisit the bellland' : !unlocked ? 'Complete the previous chapter' : state.started && state.chapterIndex === i ? 'Continue this chapter' : 'Begin chapter'}</button></article>`;
      }).join('')}</div>`;
    } else if (this.atlasTab === 'journal') {
      content = `<p class="atlas-intro">${state.completedChapterIds.length} / 12 chapters complete · ${state.discoveries.length} discoveries · ${Object.keys(state.choices).length} choices made</p><div class="journal-entries">${state.journal.length ? [...state.journal].reverse().map((entry, i) => `<article><span class="eyebrow">ENTRY ${state.journal.length - i}</span><p>${this.escapeHtml(entry)}</p></article>`).join('') : '<p>Your journal is empty. Begin The Names in the Bark to follow the first stolen name.</p>'}</div>`;
      if (state.completedChapterIds.length === CHRONICLE_CHAPTERS.length) content += `<div class="ending-letter"><span class="eyebrow">THE WORLD YOU LEFT BEHIND</span><p>${this.escapeHtml(endingText(state))}</p></div>`;
    } else {
      content = `<p class="atlas-intro">History belongs to the people who remember it. Complete chapters to recover their accounts.</p><div class="codex-grid">${CHRONICLE_CHAPTERS.map(chapter => `<article><span class="eyebrow">${REGION_NAMES[chapter.region]}</span><h3>${chapter.codex.title}</h3><p>${state.codexEntries.includes(chapter.id) ? chapter.codex.text : 'This history has not yet been recovered.'}</p></article>`).join('')}</div>`;
    }
    this.openOverlay('The Long Dawn', `${nav}${content}`, [
      { label: this.hudRefs ? 'Return to the world' : 'Return to heroes', action: () => this.closeOverlay() },
      ...(this.hudRefs ? [{ label: 'Rest at Aetherhaven', action: async () => {
        if (!await this.engine.saveActiveCharacterNow()) return;
        this.engine.enterZone('starting_town'); this.closeOverlay();
      } }] : []),
    ], 'WORLD ATLAS · A CHRONICLE IN SIX ACTS');
    this.root.querySelector('#game-menu')?.classList.add('atlas-overlay');
    this.root.querySelectorAll<HTMLElement>('[data-atlas-tab]').forEach(button => button.addEventListener('click', () => {
      this.atlasTab = button.dataset.atlasTab as typeof this.atlasTab; this.openAtlas();
    }));
    this.root.querySelectorAll<HTMLButtonElement>('[data-travel-chapter]').forEach(button => button.addEventListener('click', async () => {
      button.disabled = true;
      if (!this.hudRefs) {
        this.closeOverlay(); this.startHudAndGameplay(character); this.engine.setPaused('menu', true);
      }
      const travelled = await this.engine.travelToChapter(Number(button.dataset.travelChapter));
      if (travelled) this.closeOverlay(); else { button.disabled = false; this.showBanner('THE ROAD IS CLOSED', 'Complete the previous chapter or check your save storage.'); }
    }));
  }

  public showChronicleInteraction(interaction: ChronicleInteraction): void {
    let page = 0; let feedback = '';
    const objective = interaction.objective;
    const render = () => {
      const lastPage = page >= objective.text.length - 1;
      const finish = (option?: number) => {
        const result = this.engine.resolveChronicleInteraction(interaction.siteId, option);
        if (result.advanced) this.closeOverlay(); else { feedback = result.message; render(); }
      };
      const actions = !lastPage ? [{ label: 'Listen', action: () => { page += 1; render(); } }] : objective.options ? objective.options.map((label, i) => ({ label, action: () => finish(i) })) : [{ label: interaction.optional ? 'Remember this echo' : 'Carry this memory onward', action: () => finish() }];
      actions.push({ label: 'Leave for now', action: () => this.closeOverlay() });
      this.openOverlay(objective.title, `<div class="chronicle-speaker">${this.escapeHtml(objective.speaker)}</div><p class="chronicle-dialogue">${this.escapeHtml(objective.text[page] ?? '')}</p>${lastPage && objective.clue ? `<blockquote class="chronicle-inscription">${this.escapeHtml(objective.clue)}</blockquote>` : ''}${feedback ? `<p role="status" class="chronicle-feedback">${this.escapeHtml(feedback)}</p>` : ''}<div class="chronicle-page">${page + 1} / ${objective.text.length}</div>`, actions, interaction.chapterTitle);
      this.root.querySelector('#game-menu')?.classList.add('chronicle-conversation');
    };
    render();
  }

  public showFinisherFrame(frame: FinisherFrame): void {
    let overlay = this.root.querySelector<HTMLElement>('#boss-finisher-overlay');
    if (!overlay) {
      overlay = document.createElement('div'); overlay.id = 'boss-finisher-overlay'; overlay.className = 'boss-finisher-overlay';
      overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-label', 'Guardian finishing blow');
      overlay.innerHTML = `<div class="finisher-flash"></div><div class="finisher-letterbox top"><span>ASTRAL CHRONICLES / RESONANCE FRACTURE</span><button id="skip-finisher">Skip cinematic <kbd>ESC</kbd></button></div><div class="finisher-title"><span class="finisher-subtitle"></span><h1></h1></div><div class="finisher-verdict"><span>OATH</span><strong>SEVERED</strong></div><div class="finisher-letterbox bottom"><div class="finisher-boss-name"></div><div class="finisher-last-words"></div><div class="finisher-progress"><i></i></div></div>`;
      this.root.appendChild(overlay); this.root.classList.add('cinema-active');
      overlay.querySelector('#skip-finisher')?.addEventListener('click', () => this.engine.skipBossFinisher());
      overlay.querySelector<HTMLButtonElement>('button')?.focus();
    }
    overlay.dataset.phase = frame.phase;
    overlay.style.setProperty('--impact-flash', String(frame.flash * 0.8));
    overlay.querySelector('h1')!.textContent = frame.title;
    overlay.querySelector('.finisher-subtitle')!.textContent = frame.subtitle;
    overlay.querySelector('.finisher-boss-name')!.textContent = frame.bossName;
    overlay.querySelector('.finisher-last-words')!.textContent = frame.phase === 'requiem' ? `“${frame.lastWords}”` : frame.phase === 'silence' ? 'A lifetime held in a single breath.' : '';
    (overlay.querySelector('.finisher-progress i') as HTMLElement).style.width = `${frame.progress * 100}%`;
  }

  public endFinisher(): void {
    this.root.querySelector('#boss-finisher-overlay')?.remove();
    this.root.classList.remove('cinema-active');
    this.root.querySelector<HTMLButtonElement>('#btn-finisher-preview')?.focus();
  }

  public updateHud(t: HudTelemetry): void {
    if (!this.hudRefs) return;

    const hpPct = Math.max(0, Math.min(100, (t.hp / Math.max(1, t.maxHp)) * 100));
    this.hudRefs.hpFill.style.width = `${hpPct.toFixed(1)}%`;
    this.hudRefs.hpLabel.textContent = `${Math.ceil(t.hp)} / ${t.maxHp} HP`;

    const xpPct = Math.max(0, Math.min(100, (t.xp / Math.max(1, t.xpToNextLevel)) * 100));
    this.hudRefs.xpFill.style.width = `${xpPct.toFixed(1)}%`;
    this.hudRefs.xpLabel.textContent = `XP ${t.xp}/${t.xpToNextLevel}`;

    this.hudRefs.lvPill.textContent = `LV.${t.level}`;
    this.hudRefs.goldSpan.textContent = `◈ ${t.gold.toLocaleString()}`;
    this.hudRefs.crystalSpan.textContent = `✦ ${t.aetherCrystals}`;
    this.hudRefs.saveBadge.textContent = `✓ ${t.lastSavedText}`;

    this.hudRefs.waveTitle.textContent = t.zoneTitle;
    this.hudRefs.waveSub.textContent = t.zoneSubtitle;

    this.hudRefs.stepTown.classList.toggle('active', t.zoneId === 'starting_town');
    this.hudRefs.stepStomping.classList.toggle('active', t.zoneId === 'stomping_grounds');
    this.hudRefs.stepMarket.classList.toggle('active', t.zoneId === 'market_crossing');
    this.hudRefs.stepRuins.classList.toggle('active', t.zoneId === 'sunken_ruins');
    this.hudRefs.stepSanctum.classList.toggle('active', t.zoneId === 'abyssal_sanctum');

    if (t.map.path.length > 0) {
      this.hudRefs.pathProgressWrap.style.display = 'block';
      this.hudRefs.pathProgressFill.style.width = `${Math.round(t.pathProgress * 100)}%`;
    } else {
      this.hudRefs.pathProgressWrap.style.display = 'none';
    }

    if (t.nearbyPortal) {
      this.hudRefs.portalBtn.classList.remove('hidden');
      this.hudRefs.portalBtn.textContent = t.portalLocked ? 'RIFT SEALED · DEFEAT ALL FIENDS' : `${t.nearbyPortal.label.toUpperCase()} [F / TAP]`;
    } else {
      this.hudRefs.portalBtn.classList.add('hidden');
    }

    // Update Quest Tracker HUD
    const qv = t.questView;
    const route = this.root.querySelector<HTMLElement>('.zone-route-steps');
    if (route) { if (qv.stage === 'chronicle') route.style.display = 'none'; else route.style.removeProperty('display'); }
    this.hudRefs.questChapterSpan.textContent = qv.chapterTitle;
    this.hudRefs.questStepPill.textContent = qv.isComplete
      ? '★ COMPLETED'
      : `STEP ${qv.stepNumber}/${qv.totalSteps}`;
    this.hudRefs.questObjTitle.textContent = qv.objectiveTitle;
    this.hudRefs.questObjHint.textContent = qv.objectiveHint;
    this.hudRefs.questObjProgress.textContent = qv.progressText;
    if (qv.companionBanter) {
      this.hudRefs.questBanterDiv.textContent = `${qv.companionBanter.speakerName}: "${qv.companionBanter.text}"`;
    }

    // Update Companion Party Roster
    const companionMarkup = t.companions
      .map(
        (c) => `
        <div class="companion-row">
          <span><strong style="color:${c.elementColor}">${icon(CLASS_ICONS[c.classId], 15)} ${this.escapeHtml(c.name)}</strong> <span style="color:#9aa5ce">(${c.archetypeLabel})</span></span>
          <span style="color:#ffd166;font-weight:700;">${this.escapeHtml(c.actionText)}</span>
        </div>
      `
      )
      .join('');
    if (companionMarkup !== this.lastCompanionMarkup) {
      this.hudRefs.companionListDiv.innerHTML = companionMarkup;
      this.lastCompanionMarkup = companionMarkup;
    }

    if (t.nearbyChronicle) {
      this.hudRefs.npcBox.classList.remove('hidden');
      this.hudRefs.npcTitle.textContent = t.nearbyChronicle.title;
      this.hudRefs.npcText.textContent = 'A fragment of Elarion is waiting to be heard.';
      this.hudRefs.questActionBtn.classList.remove('hidden');
      this.hudRefs.questActionBtn.textContent = 'Listen / Interact [F]';
    } else if (t.nearbyNpc) {
      this.hudRefs.npcBox.classList.remove('hidden');
      this.hudRefs.npcTitle.textContent = `💬 ${t.nearbyNpc.name} • ${t.nearbyNpc.role}`;
      this.hudRefs.npcText.textContent = `"${t.nearbyNpc.dialogue}"`;
      if (qv.actionButtonLabel) {
        this.hudRefs.questActionBtn.classList.remove('hidden');
        this.hudRefs.questActionBtn.textContent = qv.actionButtonLabel;
      } else {
        this.hudRefs.questActionBtn.classList.add('hidden');
      }
    } else {
      this.hudRefs.npcBox.classList.add('hidden');
      this.hudRefs.questActionBtn.classList.add('hidden');
    }

    if (t.comboCount >= 2) {
      this.hudRefs.comboBox.classList.remove('hidden');
      this.hudRefs.comboRank.textContent = t.comboRank;
      this.hudRefs.comboHits.textContent = `${t.comboCount} HIT COMBO`;
    } else {
      this.hudRefs.comboBox.classList.add('hidden');
    }

    const minimap = this.root.querySelector<HTMLCanvasElement>('#hud-minimap');
    if (minimap) drawMinimap(minimap, t.map);
    const bossHud = this.root.querySelector<HTMLElement>('#boss-hud')!;
    bossHud.classList.toggle('hidden', !t.boss);
    if (t.boss) {
      this.root.querySelector('#boss-name')!.textContent = t.boss.name;
      this.root.querySelector('#boss-state')!.textContent = t.boss.enraged ? 'ENRAGED · FASTER STRIKES' : 'RIFT GUARDIAN';
      (this.root.querySelector('#boss-fill') as HTMLElement).style.width = `${100 * t.boss.hp / t.boss.maxHp}%`;
      this.root.querySelector('#boss-health')!.textContent = `${t.boss.hp} / ${t.boss.maxHp}`;
    }
    this.root.querySelector('#flask-charges')!.textContent = `${t.flaskCharges} / 3 charges`;
    (this.root.querySelector('#btn-flask') as HTMLButtonElement).disabled = t.flaskCharges === 0 || t.hp >= t.maxHp;
    const meter = this.root.querySelector('#expedition-meter')!;
    meter.querySelector('.eyebrow')!.textContent = t.isSafeZone ? 'SANCTUARY' : 'EXPEDITION';
    this.root.querySelector('#expedition-count')!.textContent = t.isSafeZone ? 'A moment of respite' : `${t.expedition.defeated} / ${t.expedition.total} fiends defeated`;
    this.root.querySelector('#expedition-time')!.textContent = t.isSafeZone ? 'Flasks replenished · Vitality restored' : `${Math.floor(t.expedition.seconds / 60)}:${Math.floor(t.expedition.seconds % 60).toString().padStart(2, '0')} · ${Math.round(t.pathProgress * 100)}% explored`;
    if (qv.stage === 'chronicle' && !t.isSafeZone) {
      meter.querySelector('.eyebrow')!.textContent = 'THE LONG DAWN';
      this.root.querySelector('#expedition-count')!.textContent = qv.progressText;
    }
    this.root.querySelector('#damage-vignette')!.classList.toggle('hurt', t.damageFlash);
    this.root.querySelector('#damage-vignette')!.classList.toggle('low-health', t.hp / t.maxHp < 0.3);

    // Ultimate gauge
    const ultReady = t.ultimateEnergy >= 100 && t.cooldowns.ultimate.remaining <= 0;
    this.hudRefs.ultLabel.textContent = `${Math.floor(t.ultimateEnergy)}%`;
    this.hudRefs.ultBtn.classList.toggle('ready', ultReady);

    // Cooldown overlays
    for (const key of ['basic', 'dash', 'skill1', 'skill2', 'ultimate'] as ActionId[]) {
      const cd = t.cooldowns[key];
      const overlay = this.hudRefs.cdOverlays[key];
      if (cd.remaining > 0.08 && key !== 'basic') {
        overlay.classList.remove('hidden');
        overlay.textContent = `${cd.remaining.toFixed(1)}s`;
      } else {
        overlay.classList.add('hidden');
      }
    }
  }

  public showBanner(title: string, subtitle: string): void {
    if (!this.hudRefs) return;
    this.hudRefs.centerBannerTitle.textContent = title;
    this.hudRefs.centerBannerSub.textContent = subtitle;
    this.hudRefs.centerBanner.classList.remove('hidden');

    if (this.bannerTimeout) window.clearTimeout(this.bannerTimeout);
    this.bannerTimeout = window.setTimeout(() => {
      this.hudRefs?.centerBanner.classList.add('hidden');
    }, 2400);
  }

  public showUltimateCutIn(className: string, skillName: string, colorCss: string): void {
    if (!this.hudRefs) return;
    this.hudRefs.ultCutinSub.textContent = `${className} // SECRET ART`;
    this.hudRefs.ultCutinTitle.textContent = `✦ ${skillName} ✦`;
    this.hudRefs.ultCutin.style.borderTopColor = colorCss;
    this.hudRefs.ultCutin.classList.remove('hidden');

    if (this.cutinTimeout) window.clearTimeout(this.cutinTimeout);
    this.cutinTimeout = window.setTimeout(() => {
      this.hudRefs?.ultCutin.classList.add('hidden');
    }, 1500);
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
