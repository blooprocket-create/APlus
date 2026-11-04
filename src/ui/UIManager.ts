import {
  CHARACTER_CLASSES,
  CHARACTER_CLASS_LIST,
  computeEffectiveStats,
  computePowerRating,
} from '../data/classes';
import { GameEngine, HudTelemetry } from '../game/GameEngine';
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
  MAX_CHARACTERS_PER_ACCOUNT,
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
  starting_town: 'Starting Town (Safe)',
  stomping_grounds: 'Stomping Grounds',
  market_crossing: 'Market Crossing (Safe)',
  sunken_ruins: 'Sunken Astral Ruins',
  abyssal_sanctum: 'Abyssal Sanctum',
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

  constructor(root: HTMLElement, persistence: PersistenceManager, engine: GameEngine) {
    this.root = root;
    this.persistence = persistence;
    this.engine = engine;
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

    const slotCardsHtml = ([0, 1, 2] as CharacterSlotIndex[])
      .map((slotIdx) => {
        const char = this.slots[slotIdx];
        const isSelected = slotIdx === this.selectedSlotIndex;
        if (char) {
          const cDef = CHARACTER_CLASSES[char.classId];
          const pwr = computePowerRating(char);
          const zoneLabel = ZONE_LABELS[char.currentZone ?? 'starting_town'];
          return `
            <div class="char-slot-card ${isSelected ? 'selected' : ''}" data-slot="${slotIdx}">
              <div class="slot-left">
                <div class="slot-badge" style="border-color: ${cDef.elementColor}">
                  ${cDef.starterWeapon.icon}
                </div>
                <div class="slot-info">
                  <h4>${this.escapeHtml(char.name)}</h4>
                  <p>${cDef.archetypeLabel} • ${zoneLabel}</p>
                </div>
              </div>
              <div class="slot-lv">
                <div>LV.${char.level}</div>
                <div style="font-size:0.68rem;color:#9aa5ce">⚡ ${pwr}</div>
              </div>
            </div>
          `;
        } else {
          return `
            <div class="char-slot-card ${isSelected ? 'selected' : ''}" data-slot="${slotIdx}">
              <div class="slot-left">
                <div class="slot-badge">＋</div>
                <div class="slot-info">
                  <h4>Empty Vessel // Slot ${slotIdx + 1}</h4>
                  <p>Tap to awaken a new Hero</p>
                </div>
              </div>
              <div class="slot-lv" style="color:#4cc9f0">CREATE</div>
            </div>
          `;
        }
      })
      .join('');

    let rightPanelHtml = '';
    if (selectedChar) {
      const cDef = CHARACTER_CLASSES[selectedChar.classId];
      const eff = computeEffectiveStats(selectedChar);
      const pwr = computePowerRating(selectedChar);
      const mins = Math.floor(selectedChar.playTimeSeconds / 60);
      const secs = Math.floor(selectedChar.playTimeSeconds % 60);
      const zoneName = ZONE_LABELS[selectedChar.currentZone ?? 'starting_town'];
      const [compA, compB] = getCompanionClassesForPlayer(selectedChar.classId);
      const compSummary = `${CHARACTER_CLASSES[compA].starterWeapon.icon} ${CANONICAL_HERO_NAMES[compA]} (${CHARACTER_CLASSES[compA].archetypeLabel}) & ${CHARACTER_CLASSES[compB].starterWeapon.icon} ${CANONICAL_HERO_NAMES[compB]} (${CHARACTER_CLASSES[compB].archetypeLabel})`;

      rightPanelHtml = `
        <div class="panel-header">
          <span class="panel-title">${this.escapeHtml(selectedChar.name)} // SLOT ${selectedChar.slotIndex + 1}</span>
          <span class="slot-counter">⚡ PWR ${pwr}</span>
        </div>
        <p style="font-size:0.78rem;color:${cDef.elementColor};font-weight:800;margin-bottom:4px;">
          ${cDef.archetypeLabel} (${cDef.name}) — ${cDef.title}
        </p>
        <p style="font-size:0.72rem;color:#ffd166;margin-bottom:4px;">
          ✦ ${cDef.cadenceDescription}
        </p>
        <p style="font-size:0.71rem;color:#4cc9f0;margin-bottom:6px;font-weight:700;">
          🤝 Party Companions: ${compSummary}
        </p>
        <div class="stat-grid">
          <div class="stat-box"><span>Level</span><span>${selectedChar.level} (${selectedChar.xp}/${selectedChar.xpToNextLevel} XP)</span></div>
          <div class="stat-box"><span>Location</span><span>${zoneName}</span></div>
          <div class="stat-box"><span>Max HP</span><span>${eff.maxHp}</span></div>
          <div class="stat-box"><span>Attack / Spd</span><span>${eff.attack} (${eff.attackSpeed}x)</span></div>
          <div class="stat-box"><span>Crit Rate / Dmg</span><span>${Math.round(eff.critRate * 100)}% / ${Math.round(eff.critDamage * 100)}%</span></div>
          <div class="stat-box"><span>Gold / Crystals</span><span>${selectedChar.gold}G / ${selectedChar.aetherCrystals}✦</span></div>
          <div class="stat-box"><span>Weapon</span><span>${selectedChar.equipped.weapon?.name ?? 'None'}</span></div>
          <div class="stat-box"><span>Wilds / Kills</span><span>${selectedChar.stompingGroundsClears ?? 0} • ${selectedChar.enemiesDefeated} (${mins}m ${secs}s)</span></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px;">
          <button id="btn-enter-world" class="btn-anime btn-primary" style="flex:1;padding:12px;">
            ▶ ENTER WORLD (${zoneName.split(' ')[0].toUpperCase()})
          </button>
          <button id="btn-delete-char" class="btn-anime btn-danger" title="Delete Character">
            🗑
          </button>
        </div>
      `;
    } else {
      const cDef = CHARACTER_CLASSES[this.creationClassId];
      const classTabs = CHARACTER_CLASS_LIST.map(
        (cls) => `
          <div class="class-tab ${cls.id === this.creationClassId ? 'active' : ''}" data-class="${cls.id}">
            <div>${cls.starterWeapon.icon}</div>
            <div>${cls.archetypeLabel}</div>
          </div>
        `
      ).join('');

      const skillsHtml = Object.values(cDef.skills)
        .map(
          (sk) => `
          <div class="skill-chip">
            <strong>${sk.name}</strong> (${sk.subtitle}): ${sk.description}
          </div>
        `
        )
        .join('');

      const [compA, compB] = getCompanionClassesForPlayer(this.creationClassId);
      const compSummary = `${CHARACTER_CLASSES[compA].starterWeapon.icon} ${CANONICAL_HERO_NAMES[compA]} (${CHARACTER_CLASSES[compA].archetypeLabel}) & ${CHARACTER_CLASSES[compB].starterWeapon.icon} ${CANONICAL_HERO_NAMES[compB]} (${CHARACTER_CLASSES[compB].archetypeLabel})`;

      rightPanelHtml = `
        <div class="panel-header">
          <span class="panel-title">AWAKEN HERO // SLOT ${this.selectedSlotIndex + 1}</span>
          <span class="slot-counter">${cDef.archetypeLabel}</span>
        </div>
        <div class="class-tabs">${classTabs}</div>
        <p style="font-size:0.78rem;color:${cDef.elementColor};font-weight:800;margin-bottom:3px;">
          ${cDef.name} — ${cDef.title}
        </p>
        <p style="font-size:0.72rem;color:#ffd166;margin-bottom:4px;">
          ✦ ${cDef.cadenceDescription}
        </p>
        <p style="font-size:0.71rem;color:#4cc9f0;margin-bottom:6px;font-weight:700;">
          🤝 Active Companions: ${compSummary}
        </p>
        <div class="skill-preview-list">${skillsHtml}</div>
        <label style="font-size:0.72rem;color:var(--text-muted);display:block;margin-bottom:4px;">
          CHARACTER NAME (Starts in Starting Town Safe Zone)
        </label>
        <input
          id="input-char-name"
          class="input-field"
          type="text"
          maxlength="18"
          value="${this.escapeHtml(this.creationNameDraft)}"
          placeholder="Enter hero name..."
        />
        ${
          this.errorMessage
            ? `<p style="color:#ff4d6d;font-size:0.75rem;margin-bottom:8px;font-weight:700;">⚠ ${this.escapeHtml(this.errorMessage)}</p>`
            : ''
        }
        <button id="btn-create-char" class="btn-anime btn-primary" style="width:100%;padding:12px;">
          ✦ AWAKEN IN STARTING TOWN
        </button>
      `;
    }

    this.root.innerHTML = `
      <div class="lobby-screen">
        <div class="lobby-topbar">
          <div class="brand-badge">
            <div class="brand-title">ASTRAL CHRONICLES</div>
            <div class="brand-subtitle">3D Anime Action RPG • Mobile &amp; Desktop Web</div>
          </div>
          <div class="account-pill interactive">
            <span>Account: <strong>@${this.escapeHtml(this.activeAccount.username)}</strong> (${occupiedCount}/${MAX_CHARACTERS_PER_ACCOUNT} Heroes)</span>
            <button id="btn-switch-account" class="btn-anime btn-cyan" style="padding:5px 10px;font-size:0.72rem;">
              Switch Account
            </button>
          </div>
        </div>

        <div class="lobby-main">
          <div class="slots-panel">
            <div class="panel-header">
              <span class="panel-title">Character Vessels</span>
              <span class="slot-counter">${occupiedCount} / ${MAX_CHARACTERS_PER_ACCOUNT} MAX</span>
            </div>
            <div class="slot-list">
              ${slotCardsHtml}
            </div>
          </div>

          <div style="text-align:center;pointer-events:none;padding-bottom:8px;">
            <span style="background:rgba(9,11,22,0.75);border:1px solid rgba(255,255,255,0.15);padding:4px 12px;border-radius:99px;font-size:0.72rem;color:var(--text-muted);">
              3D Live Cel-Shaded Pedestal Preview
            </span>
          </div>

          <div class="details-panel">
            ${rightPanelHtml}
          </div>
        </div>
      </div>
    `;

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
        } catch (err) {
          this.errorMessage = err instanceof Error ? err.message : String(err);
          this.renderLobbyDOM();
        }
      });
    }

    const enterBtn = this.root.querySelector<HTMLButtonElement>('#btn-enter-world');
    if (enterBtn && selectedChar) {
      enterBtn.addEventListener('click', () => {
        this.startHudAndGameplay(selectedChar);
      });
    }

    const deleteBtn = this.root.querySelector<HTMLButtonElement>('#btn-delete-char');
    if (deleteBtn && selectedChar) {
      deleteBtn.addEventListener('click', async () => {
        if (!this.activeAccount) return;
        await this.persistence.deleteCharacter(this.activeAccount.id, selectedChar.id);
        await this.showCharacterSelectScreen();
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
          <span class="panel-title">Account Management (Max 3 Heroes / Account)</span>
          <button id="btn-close-acc-modal" class="btn-anime" style="padding:4px 9px;">✕</button>
        </div>
        <p style="font-size:0.76rem;color:var(--text-muted);margin-bottom:10px;">
          Each account persists its own independent roster of up to 3 characters.
        </p>
        <div class="slot-list" style="margin-bottom:14px;">
          ${existingListHtml}
        </div>
        <div style="border-top:1px solid rgba(255,255,255,0.12);padding-top:12px;">
          <label style="font-size:0.74rem;color:var(--text-muted);display:block;margin-bottom:6px;">
            CREATE OR SIGN IN TO ANOTHER ACCOUNT USERNAME
          </label>
          <input id="input-new-acc" class="input-field" type="text" placeholder="e.g. kirito_02" />
          <button id="btn-login-new-acc" class="btn-anime btn-primary" style="width:100%;">
            Sign In / Create Account
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

    this.root.innerHTML = `
      <div class="hud-screen">
        <div class="hud-top">
          <div>
            <div class="hero-status-card">
              <div class="hero-status-top">
                <div class="hero-name-row">
                  <span>${cDef.starterWeapon.icon} ${this.escapeHtml(character.name)}</span>
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
                <span style="color:#9aa5ce">Slot ${character.slotIndex + 1}/3</span>
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
                🤝 ECLIPSE TRIAD COMPANIONS
              </div>
              <div id="hud-companion-list"></div>
            </div>
          </div>

          <div class="wave-card">
            <div class="zone-route-steps">
              <span id="step-town" class="zone-step active">🏰 Town</span>
              <span>➔</span>
              <span id="step-stomping" class="zone-step">⚔️ Stomping</span>
              <span>➔</span>
              <span id="step-market" class="zone-step">🏮 Market</span>
              <span>➔</span>
              <span id="step-ruins" class="zone-step">🏛️ Ruins</span>
              <span>➔</span>
              <span id="step-sanctum" class="zone-step">👑 Sanctum</span>
            </div>
            <div id="hud-wave-title" class="wave-title">STARTING TOWN</div>
            <div id="hud-wave-sub" class="wave-sub">Safe Zone • Walk North to Portal</div>
            <div id="hud-path-progress-wrap" class="path-progress-wrap" style="display:none;">
              <div id="hud-path-progress-fill" class="path-progress-fill" style="width:0%"></div>
            </div>
          </div>

          <div class="hud-top-right">
            <div class="hud-btn-group">
              <button id="btn-hero-sheet" class="btn-anime btn-cyan" style="padding:6px 10px;font-size:0.7rem;">
                🎒 Inventory
              </button>
              <button id="btn-comp-sheet" class="btn-anime" style="padding:6px 10px;font-size:0.7rem;">
                🤝 Companions
              </button>
              <button id="btn-ability-sheet" class="btn-anime" style="padding:6px 10px;font-size:0.7rem;">
                ⚡ Abilities
              </button>
              <button id="btn-cutscenes-sheet" class="btn-anime" style="padding:6px 10px;font-size:0.7rem;">
                🎬 Story
              </button>
              <button id="btn-char-select" class="btn-anime" style="padding:6px 10px;font-size:0.7rem;">
                ⇄ Heroes
              </button>
            </div>
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
          <div id="joystick-zone" class="joystick-zone" aria-label="Movement Thumbstick">
            <div id="joystick-knob" class="joystick-knob"></div>
          </div>

          <div class="action-cluster">
            <button id="act-ultimate" class="action-btn action-btn-ultimate" aria-label="Ultimate Skill">
              <span class="btn-title">ULT</span>
              <span id="ult-pct-label" class="btn-key">0%</span>
              <div id="cd-ultimate" class="cd-overlay hidden"></div>
            </button>

            <button id="act-skill1" class="action-btn action-btn-skill1" aria-label="Skill 1">
              <span class="btn-title">${cDef.skills.skill1.name.split(' ')[0]}</span>
              <span class="btn-key">Q / 1</span>
              <div id="cd-skill1" class="cd-overlay hidden"></div>
            </button>

            <button id="act-skill2" class="action-btn action-btn-skill2" aria-label="Skill 2">
              <span class="btn-title">${cDef.skills.skill2.name.split(' ')[0]}</span>
              <span class="btn-key">E / 2</span>
              <div id="cd-skill2" class="cd-overlay hidden"></div>
            </button>

            <button id="act-dash" class="action-btn action-btn-dash" aria-label="Dash">
              <span class="btn-title">DASH</span>
              <span class="btn-key">SHIFT</span>
              <div id="cd-dash" class="cd-overlay hidden"></div>
            </button>

            <button id="act-basic" class="action-btn action-btn-basic" aria-label="Primary Attack">
              <span class="btn-title" style="font-size:0.82rem">ATTACK</span>
              <span class="btn-key">SPACE / J</span>
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

    // Top-right HUD buttons
    this.root.querySelector('#btn-char-select')?.addEventListener('click', async () => {
      this.cutsceneDirector.stop();
      this.engine.setCutsceneCameraShot(null);
      await this.engine.saveActiveCharacterNow();
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
    const stats = computeEffectiveStats(char);
    const pwr = computePowerRating(char);
    const cDef = CHARACTER_CLASSES[char.classId];
    const [comp1Class, comp2Class] = getCompanionClassesForPlayer(char.classId);

    const modal = document.createElement('div');
    modal.id = 'command-deck-modal';
    modal.className = 'modal-backdrop';

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
            🎒 Inventory (${char.inventory.length}/24)
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

    modal.querySelector('#btn-close-inv')?.addEventListener('click', () => modal.remove());

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
        modal.remove();
        this.engine.triggerCutscene(cId);
      });
    });
  }

  public updateHud(t: HudTelemetry): void {
    if (!this.hudRefs) return;

    const hpPct = Math.max(0, Math.min(100, (t.hp / Math.max(1, t.maxHp)) * 100));
    this.hudRefs.hpFill.style.width = `${hpPct.toFixed(1)}%`;
    this.hudRefs.hpLabel.textContent = `${t.hp} / ${t.maxHp} HP`;

    const xpPct = Math.max(0, Math.min(100, (t.xp / Math.max(1, t.xpToNextLevel)) * 100));
    this.hudRefs.xpFill.style.width = `${xpPct.toFixed(1)}%`;
    this.hudRefs.xpLabel.textContent = `XP ${t.xp}/${t.xpToNextLevel}`;

    this.hudRefs.lvPill.textContent = `LV.${t.level}`;
    this.hudRefs.goldSpan.textContent = `🪙 ${t.gold}G`;
    this.hudRefs.crystalSpan.textContent = `✦ ${t.aetherCrystals}`;
    this.hudRefs.saveBadge.textContent = `✓ ${t.lastSavedText}`;

    this.hudRefs.waveTitle.textContent = t.zoneTitle;
    this.hudRefs.waveSub.textContent = t.zoneSubtitle;

    this.hudRefs.stepTown.classList.toggle('active', t.zoneId === 'starting_town');
    this.hudRefs.stepStomping.classList.toggle('active', t.zoneId === 'stomping_grounds');
    this.hudRefs.stepMarket.classList.toggle('active', t.zoneId === 'market_crossing');
    this.hudRefs.stepRuins.classList.toggle('active', t.zoneId === 'sunken_ruins');
    this.hudRefs.stepSanctum.classList.toggle('active', t.zoneId === 'abyssal_sanctum');

    if (t.zoneId === 'stomping_grounds' || t.zoneId === 'sunken_ruins') {
      this.hudRefs.pathProgressWrap.style.display = 'block';
      this.hudRefs.pathProgressFill.style.width = `${Math.round(t.pathProgress * 100)}%`;
    } else {
      this.hudRefs.pathProgressWrap.style.display = 'none';
    }

    if (t.nearbyPortal) {
      this.hudRefs.portalBtn.classList.remove('hidden');
      this.hudRefs.portalBtn.textContent = `🌀 ${t.nearbyPortal.label.toUpperCase()} [F / TAP]`;
    } else {
      this.hudRefs.portalBtn.classList.add('hidden');
    }

    // Update Quest Tracker HUD
    const qv = t.questView;
    this.hudRefs.questChapterSpan.textContent = `📜 ${qv.chapterTitle}`;
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
    this.hudRefs.companionListDiv.innerHTML = t.companions
      .map(
        (c) => `
        <div class="companion-row">
          <span><strong style="color:${c.elementColor}">${c.icon} ${this.escapeHtml(c.name)}</strong> <span style="color:#9aa5ce">(${c.archetypeLabel})</span></span>
          <span style="color:#ffd166;font-weight:700;">${this.escapeHtml(c.actionText)}</span>
        </div>
      `
      )
      .join('');

    if (t.nearbyNpc) {
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
