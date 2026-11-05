import './ui/styles.css';
import './ui/chronicle.css';
import './ui/chronicle-story.css';
import './ui/mobile.css';
import { MobileDisplay } from './platform/MobileDisplay';
import { GameEngine } from './game/GameEngine';
import { PersistenceManager } from './persistence/PersistenceManager';
import { UIManager } from './ui/UIManager';

async function main(): Promise<void> {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const damageLayer = document.getElementById('damage-layer') as HTMLElement;
  const uiRoot = document.getElementById('ui-root') as HTMLElement;

  const persistence = new PersistenceManager();
  let ui: UIManager | null = null;

  let engine: GameEngine | null = null;
  const display = new MobileDisplay(document.getElementById('app')!, () => engine?.resizeToViewport(), blocked => engine?.setPaused('orientation', blocked));
  engine = new GameEngine(canvas, damageLayer, persistence, {
    onHudUpdate: (telemetry) => ui?.updateHud(telemetry),
    onBannerNotification: (title, subtitle) => ui?.showBanner(title, subtitle),
    onUltimateCutIn: (className, skillName, colorCss) =>
      ui?.showUltimateCutIn(className, skillName, colorCss),
    onLootObtained: (item) => ui?.showLootToast(item.name, item.rarity),
    onFinisherFrame: (frame) => ui?.showFinisherFrame(frame),
    onFinisherEnd: () => ui?.endFinisher(),
    onChronicleInteraction: (interaction) => ui?.showChronicleInteraction(interaction),
    onDefeated: () => ui?.showDefeat(),
    onZoneCleared: (report) => ui?.showExpeditionReport(report),
    onCharacterSaved: () => {},
    onTriggerCutscene: (cutsceneId) => ui?.playCutscene(cutsceneId),
  });

  ui = new UIManager(uiRoot, engine);
  ui.showCharacterSelectScreen();
  display.refresh(true);
}

void main().catch(() => {
  const root = document.getElementById('ui-root');
  if (!root) return;
  root.innerHTML = `<div class="boot-failure"><div class="eyebrow">ASTRAL CHRONICLES</div><h1>The stars need a moment.</h1><p>The game could not start. Use a browser with WebGL enabled and allow local storage for your saves.</p><button class="btn-anime btn-primary" id="retry-game">Try again</button></div>`;
  root.querySelector('#retry-game')?.addEventListener('click', () => window.location.reload());
});
