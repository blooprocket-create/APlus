import * as THREE from 'three';

export type ActionId = 'basic' | 'dash' | 'skill1' | 'skill2' | 'ultimate';

export class InputManager {
  public readonly moveVector = new THREE.Vector2();
  private controlsAbort: AbortController | null = null;
  private keysDown = new Set<string>();
  private heldActions = new Set<ActionId>();
  private queuedActions = new Set<ActionId>();
  private actionPointers = new Map<number, { action: ActionId; button: HTMLElement }>();
  private canvasPointers = new Set<number>();
  private joystickZone: HTMLElement | null = null;
  private joystickKnob: HTMLElement | null = null;
  private joystickPointerId: number | null = null;
  private joystickOrigin = new THREE.Vector2();
  private joystickInput = new THREE.Vector2();
  private maxRadius = 40;

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.resetAll);
    window.addEventListener('pointerup', this.releasePointer);
    window.addEventListener('pointercancel', this.releasePointer);
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.resetAll(); });
  }

  public bindVirtualControls(joystickZone: HTMLElement, joystickKnob: HTMLElement, actionButtons: Map<ActionId, HTMLElement>): void {
    this.resetAll();
    this.controlsAbort?.abort();
    this.controlsAbort = new AbortController();
    const signal = this.controlsAbort.signal;
    this.joystickZone = joystickZone;
    this.joystickKnob = joystickKnob;
    joystickZone.addEventListener('pointerdown', event => {
      if (this.joystickPointerId !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
      event.preventDefault();
      this.joystickPointerId = event.pointerId;
      const rect = joystickZone.getBoundingClientRect();
      this.joystickOrigin.set(rect.left + rect.width / 2, rect.top + rect.height / 2);
      this.maxRadius = Math.max(24, Math.min(rect.width, rect.height) * 0.32);
      this.capture(joystickZone, event.pointerId);
      this.updateJoystick(event.clientX, event.clientY);
      joystickZone.classList.add('active');
    }, { signal });
    joystickZone.addEventListener('pointermove', event => {
      if (event.pointerId !== this.joystickPointerId) return;
      event.preventDefault();
      this.updateJoystick(event.clientX, event.clientY);
    }, { signal });
    joystickZone.addEventListener('lostpointercapture', this.releasePointer, { signal });

    for (const [action, button] of actionButtons) {
      button.addEventListener('pointerdown', event => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        if (button instanceof HTMLButtonElement && button.disabled) return;
        event.preventDefault(); event.stopPropagation();
        this.actionPointers.set(event.pointerId, { action, button });
        this.queuedActions.add(action);
        this.capture(button, event.pointerId);
        button.classList.add('pressed');
      }, { signal });
      button.addEventListener('lostpointercapture', this.releasePointer, { signal });
      // Keyboard / assistive activation has no pointerdown. Native taps are handled above.
      button.addEventListener('click', event => {
        if (event.detail === 0 && !(button instanceof HTMLButtonElement && button.disabled)) this.triggerAction(action);
      }, { signal });
    }
  }

  private capture(element: HTMLElement, pointerId: number): void {
    try { element.setPointerCapture(pointerId); } catch { /* A cancelled pointer may already have ended. */ }
  }

  private releasePointer = (event: PointerEvent): void => {
    const wasCanvas = this.canvasPointers.delete(event.pointerId);
    const released = this.actionPointers.get(event.pointerId);
    this.actionPointers.delete(event.pointerId);
    // A browser gesture or interrupted capture must not leave an unconsumed attack behind.
    if (event.type !== 'pointerup') {
      const action = released?.action ?? (wasCanvas ? 'basic' : null);
      if (action && ![...this.actionPointers.values()].some(pointer => pointer.action === action) && !(action === 'basic' && this.canvasPointers.size)) this.queuedActions.delete(action);
    }
    if (released && ![...this.actionPointers.values()].some(pointer => pointer.button === released.button)) released.button.classList.remove('pressed');
    if (event.pointerId === this.joystickPointerId) {
      this.joystickPointerId = null;
      this.joystickInput.set(0, 0);
      this.moveVector.set(0, 0);
      this.joystickZone?.classList.remove('active');
      if (this.joystickKnob) this.joystickKnob.style.transform = 'translate3d(0,0,0)';
    }
  };

  public bindCanvas(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('pointerdown', event => {
      if (event.button === 0 && event.pointerType !== 'touch') {
        this.canvasPointers.add(event.pointerId);
        this.queuedActions.add('basic');
        this.capture(canvas, event.pointerId);
      }
    });
    canvas.addEventListener('lostpointercapture', this.releasePointer);
    canvas.addEventListener('contextmenu', event => event.preventDefault());
  }

  private updateJoystick(clientX: number, clientY: number): void {
    const dx = clientX - this.joystickOrigin.x; const dy = clientY - this.joystickOrigin.y;
    const distance = Math.hypot(dx, dy);
    const strength = Math.min(distance, this.maxRadius);
    const x = distance > 0 ? dx / distance * strength : 0;
    const y = distance > 0 ? dy / distance * strength : 0;
    if (this.joystickKnob) this.joystickKnob.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
    if (strength < this.maxRadius * 0.12) this.joystickInput.set(0, 0);
    else this.joystickInput.set(x / this.maxRadius, y / this.maxRadius);
  }

  public triggerAction(action: ActionId, hold = false): void {
    this.queuedActions.add(action);
    if (hold) this.heldActions.add(action);
  }

  public consumeAction(action: ActionId): boolean {
    if (this.queuedActions.delete(action)) return true;
    return this.heldActions.has(action) || (action === 'basic' && (this.canvasPointers.size > 0 || [...this.actionPointers.values()].some(pointer => pointer.action === 'basic')));
  }

  public update(): void {
    let x = 0; let y = 0;
    if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) x -= 1;
    if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) x += 1;
    if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp')) y -= 1;
    if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown')) y += 1;
    if (x || y) this.moveVector.set(x, y).normalize();
    else this.moveVector.copy(this.joystickInput).clampLength(0, 1);
  }

  private isTyping(target: EventTarget | null): boolean {
    return target instanceof HTMLElement && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable);
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (this.isTyping(event.target)) return;
    if (event.code === 'Space' && event.target instanceof HTMLElement && event.target.tagName === 'BUTTON') return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
    this.keysDown.add(event.code);
    if (event.repeat) return;
    switch (event.code) {
      case 'KeyJ': case 'Space': this.triggerAction('basic', true); break;
      case 'ShiftLeft': case 'ShiftRight': case 'KeyK': this.triggerAction('dash'); break;
      case 'KeyQ': case 'Digit1': this.triggerAction('skill1'); break;
      case 'KeyE': case 'Digit2': this.triggerAction('skill2'); break;
      case 'KeyR': case 'Digit3': this.triggerAction('ultimate'); break;
    }
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keysDown.delete(event.code);
    if ((event.code === 'KeyJ' || event.code === 'Space') && !this.keysDown.has('KeyJ') && !this.keysDown.has('Space')) this.heldActions.delete('basic');
  };

  public resetAll = (): void => {
    const captures: Array<[HTMLElement, number]> = [...this.actionPointers].map(([id, pointer]) => [pointer.button, id]);
    if (this.joystickZone && this.joystickPointerId !== null) captures.push([this.joystickZone, this.joystickPointerId]);
    this.actionPointers.forEach(pointer => pointer.button.classList.remove('pressed'));
    this.actionPointers.clear(); this.canvasPointers.clear(); this.joystickPointerId = null;
    this.joystickZone?.classList.remove('active');
    if (this.joystickKnob) this.joystickKnob.style.transform = 'translate3d(0,0,0)';
    this.keysDown.clear(); this.heldActions.clear(); this.queuedActions.clear();
    this.joystickInput.set(0, 0); this.moveVector.set(0, 0);
    for (const [element, id] of captures) { try { if (element.hasPointerCapture(id)) element.releasePointerCapture(id); } catch { /* Already cancelled. */ } }
  };
}
