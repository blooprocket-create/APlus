import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InputManager, type ActionId } from '../src/input/InputManager';
import { getViewportProfile, toggleGameFullscreen, viewportProfile } from '../src/platform/Viewport';

class Control extends EventTarget {
  tagName = 'BUTTON';
  disabled = false;
  isContentEditable = false;
  style = { transform: '' };
  classes = new Set<string>();
  classList = { add: (name: string) => this.classes.add(name), remove: (name: string) => this.classes.delete(name) };
  captures = new Set<number>();
  getBoundingClientRect() { return { left: 0, top: 0, width: 124, height: 124 }; }
  setPointerCapture(id: number) { this.captures.add(id); }
  hasPointerCapture(id: number) { return this.captures.has(id); }
  releasePointerCapture(id: number) { this.captures.delete(id); }
}
function pointer(target: EventTarget, type: string, id: number, x = 62, y = 62) {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, { pointerId: id, pointerType: 'touch', button: 0, clientX: x, clientY: y });
  target.dispatchEvent(event);
}

afterEach(() => vi.unstubAllGlobals());

describe('mobile viewport and fullscreen', () => {
  it('keeps touch controls enabled after rotating a wide phone', () => {
    for (const [w, h] of [[390, 844], [844, 390], [932, 430], [640, 320]]) {
      expect(viewportProfile(w, h, false, 3).touchUI).toBe(true);
      expect(viewportProfile(w, h, false, 3).pixelRatio).toBe(1.5);
    }
    expect(viewportProfile(1366, 1024, true).touchUI).toBe(true);
    expect(viewportProfile(1440, 900, false).touchUI).toBe(false);
  });
  it('budgets render density and uses the visible browser area', () => {
    expect(viewportProfile(1920, 1080, false, 3).pixelRatio).toBeCloseTo(Math.sqrt(3_000_000 / (1920 * 1080)));
    expect(viewportProfile(NaN, -2, false, NaN)).toMatchObject({ width: 1, height: 1, pixelRatio: 1 });
    vi.stubGlobal('window', { innerWidth: 932, innerHeight: 430, visualViewport: { width: 844, height: 320 }, matchMedia: () => ({ matches: true }), devicePixelRatio: 3 });
    expect(getViewportProfile()).toMatchObject({ width: 844, height: 320, touchUI: true });
  });
  it('preserves ordinary play when fullscreen or orientation lock is refused', async () => {
    vi.stubGlobal('document', { documentElement: {} });
    expect(await toggleGameFullscreen()).toBe(false);
    const requestFullscreen = vi.fn().mockRejectedValue(new Error('denied'));
    vi.stubGlobal('document', { documentElement: { requestFullscreen } });
    expect(await toggleGameFullscreen()).toBe(false);
    requestFullscreen.mockResolvedValue(undefined);
    vi.stubGlobal('screen', { orientation: { lock: vi.fn().mockRejectedValue(new Error('unsupported')) } });
    expect(await toggleGameFullscreen()).toBe(true);
  });
});

describe('independent touch pointers', () => {
  let win: EventTarget;
  let input: InputManager;
  let zone: Control;
  let knob: Control;
  let basic: Control;
  let skill: Control;
  beforeEach(() => {
    win = new EventTarget();
    vi.stubGlobal('window', win);
    vi.stubGlobal('document', new EventTarget());
    vi.stubGlobal('HTMLElement', Control);
    vi.stubGlobal('HTMLButtonElement', Control);
    input = new InputManager();
    zone = new Control(); knob = new Control(); basic = new Control(); skill = new Control();
    input.bindVirtualControls(zone as unknown as HTMLElement, knob as unknown as HTMLElement,
      new Map<ActionId, HTMLElement>([['basic', basic as unknown as HTMLElement], ['skill1', skill as unknown as HTMLElement]]));
  });
  it('allows movement, held attacks, and a one-shot skill simultaneously', () => {
    pointer(zone, 'pointerdown', 1, 105, 62);
    pointer(basic, 'pointerdown', 2);
    pointer(skill, 'pointerdown', 3);
    input.update();
    expect(input.moveVector.x).toBe(1);
    expect(input.consumeAction('basic')).toBe(true);
    expect(input.consumeAction('skill1')).toBe(true);
    expect(input.consumeAction('skill1')).toBe(false);
    pointer(win, 'pointerup', 3);
    expect(input.consumeAction('basic')).toBe(true);
    pointer(win, 'pointerup', 1);
    input.update();
    expect(input.moveVector.length()).toBe(0);
    expect(input.consumeAction('basic')).toBe(true);
    pointer(win, 'pointerup', 2);
    expect(input.consumeAction('basic')).toBe(false);
  });
  it('rejects a second joystick finger and releases only its owner', () => {
    pointer(zone, 'pointerdown', 1, 105, 62);
    pointer(zone, 'pointerdown', 2, 20, 62);
    pointer(zone, 'pointermove', 2, 20, 62);
    pointer(win, 'pointerup', 2);
    input.update();
    expect(input.moveVector.x).toBe(1);
    pointer(zone, 'lostpointercapture', 1);
    input.update();
    expect(input.moveVector.length()).toBe(0);
  });
  it('clears cancelled actions but retains a quick completed tap', () => {
    pointer(basic, 'pointerdown', 1);
    pointer(win, 'pointercancel', 1);
    expect(input.consumeAction('basic')).toBe(false);
    expect(basic.classes.has('pressed')).toBe(false);
    pointer(skill, 'pointerdown', 2);
    pointer(win, 'pointerup', 2);
    pointer(skill, 'lostpointercapture', 2);
    expect(input.consumeAction('skill1')).toBe(true);
    expect(input.consumeAction('skill1')).toBe(false);
  });
  it('resets all fingers on interruption and removes old listeners when HUD rebinds', () => {
    pointer(zone, 'pointerdown', 1, 105, 62);
    pointer(basic, 'pointerdown', 2);
    win.dispatchEvent(new Event('blur'));
    input.update();
    expect(input.moveVector.length()).toBe(0);
    expect(input.consumeAction('basic')).toBe(false);
    expect(basic.captures.size).toBe(0);
    input.bindVirtualControls(new Control() as unknown as HTMLElement, new Control() as unknown as HTMLElement, new Map());
    pointer(basic, 'pointerdown', 3);
    expect(input.consumeAction('basic')).toBe(false);
  });
});
