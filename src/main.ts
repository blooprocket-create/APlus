import './ui/styles.css';
import { GameEngine } from './game/GameEngine';
import { PersistenceManager } from './persistence/PersistenceManager';
import { UIManager } from './ui/UIManager';

async function main(): Promise<void> {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const damageLayer = document.getElementById('damage-layer') as HTMLElement;
  const uiRoot = document.getElementById('ui-root') as HTMLElement;

  const persistence = new PersistenceManager();
  let ui: UIManager | null = null;

  const engine = new GameEngine(canvas, damageLayer, persistence, {
    onHudUpdate: (telemetry) => ui?.updateHud(telemetry),
    onBannerNotification: (title, subtitle) => ui?.showBanner(title, subtitle),
    onUltimateCutIn: (className, skillName, colorCss) =>
      ui?.showUltimateCutIn(className, skillName, colorCss),
    onLootObtained: () => {},
    onCharacterSaved: () => {},
  });

  ui = new UIManager(uiRoot, persistence, engine);
  await ui.bootstrap();
}

void main();
