import { getViewportProfile, toggleGameFullscreen } from './Viewport';

export class MobileDisplay {
  private allowPortrait = false;
  private blocked = false;
  private scheduled = false;
  private rotatePrompt: HTMLElement;
  private lastSize = '';
  private previousFocus: HTMLElement | null = null;

  constructor(
    app: HTMLElement,
    private onResize: () => void,
    private onOrientationBlocked: (blocked: boolean) => void,
  ) {
    this.rotatePrompt = document.createElement('section');
    this.rotatePrompt.id = 'rotate-prompt';
    this.rotatePrompt.className = 'rotate-prompt';
    this.rotatePrompt.hidden = true;
    this.rotatePrompt.setAttribute('role', 'dialog');
    this.rotatePrompt.setAttribute('aria-modal', 'true');
    this.rotatePrompt.setAttribute('aria-labelledby', 'rotate-title');
    this.rotatePrompt.innerHTML = `<div class="rotate-card"><div class="rotate-phone" aria-hidden="true">↻</div><span class="eyebrow">ASTRAL CHRONICLES</span><h1 id="rotate-title">A wider horizon.</h1><p>Turn your phone sideways for the best view and room for both thumbs. Your journey is paused while you rotate.</p><button id="rotate-fullscreen" class="btn-anime btn-primary">Play fullscreen</button><button id="rotate-continue" class="text-button">Continue in portrait</button><p id="rotate-status" role="status"></p></div>`;
    app.appendChild(this.rotatePrompt);
    this.rotatePrompt.querySelector('#rotate-continue')?.addEventListener('click', () => { this.allowPortrait = true; this.refresh(); });
    const fullscreen = this.rotatePrompt.querySelector<HTMLButtonElement>('#rotate-fullscreen')!;
    fullscreen.hidden = !document.documentElement.requestFullscreen;
    fullscreen.addEventListener('click', async () => {
      if (!await toggleGameFullscreen()) this.rotatePrompt.querySelector('#rotate-status')!.textContent = 'You can play in this browser. Rotate your device, or continue in portrait.';
      this.refresh();
    });
    this.rotatePrompt.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const buttons = Array.from(this.rotatePrompt.querySelectorAll<HTMLButtonElement>('button:not([hidden])'));
      const first = buttons[0]; const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    window.addEventListener('resize', this.schedule);
    window.addEventListener('orientationchange', this.schedule);
    window.visualViewport?.addEventListener('resize', this.schedule);
    window.visualViewport?.addEventListener('scroll', this.schedule);
    window.matchMedia('(any-pointer: coarse)').addEventListener('change', this.schedule);
    document.addEventListener('fullscreenchange', this.schedule);
    this.refresh();
  }

  private schedule = (): void => {
    if (this.scheduled) return;
    this.scheduled = true;
    requestAnimationFrame(() => { this.scheduled = false; this.refresh(); });
  };

  public refresh(force = false): void {
    const profile = getViewportProfile();
    const root = document.documentElement;
    root.style.setProperty('--game-width', `${profile.width}px`);
    root.style.setProperty('--game-height', `${profile.height}px`);
    root.style.setProperty('--viewport-left', `${window.visualViewport?.offsetLeft ?? 0}px`);
    root.style.setProperty('--viewport-top', `${window.visualViewport?.offsetTop ?? 0}px`);
    root.classList.toggle('touch-ui', profile.touchUI);
    root.classList.toggle('landscape-ui', profile.landscape);
    const size = `${profile.width}:${profile.height}:${profile.pixelRatio}`;
    if (size !== this.lastSize) { this.lastSize = size; this.onResize(); }
    // Use the layout orientation so opening a portrait keyboard cannot masquerade as rotating the phone.
    const portrait = window.matchMedia('(orientation: portrait)').matches;
    const blocked = profile.touchUI && portrait && !this.allowPortrait;
    const changed = blocked !== this.blocked;
    this.blocked = blocked;
    this.rotatePrompt.hidden = !blocked;
    root.classList.toggle('rotation-blocked', blocked);
    const ui = document.getElementById('ui-root');
    if (ui) ui.inert = blocked;
    if (changed || force) this.onOrientationBlocked(blocked);
    if (changed && blocked) {
      this.previousFocus = document.activeElement as HTMLElement;
      this.rotatePrompt.querySelector<HTMLButtonElement>('button:not([hidden])')?.focus({ preventScroll: true });
    } else if (changed) this.previousFocus?.focus({ preventScroll: true });
  }
}
