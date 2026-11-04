import * as THREE from 'three';

export type ActionId = 'basic' | 'dash' | 'skill1' | 'skill2' | 'ultimate';

export class InputManager {
  public readonly moveVector = new THREE.Vector2(0, 0);

  private keysDown = new Set<string>();
  private heldActions = new Set<ActionId>();
  private queuedActions = new Set<ActionId>();

  // Virtual Joystick state
  private joystickZone: HTMLElement | null = null;
  private joystickKnob: HTMLElement | null = null;
  private joystickTouchId: number | null = null;
  private joystickPointerDown = false;
  private joystickOrigin = new THREE.Vector2(0, 0);
  private joystickInput = new THREE.Vector2(0, 0);
  private readonly maxRadius = 48;

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.resetAll);
  }

  public bindVirtualControls(
    joystickZone: HTMLElement,
    joystickKnob: HTMLElement,
    actionButtons: Map<ActionId, HTMLElement>
  ): void {
    this.joystickZone = joystickZone;
    this.joystickKnob = joystickKnob;

    // Touch events for mobile multi-touch
    joystickZone.addEventListener(
      'touchstart',
      (e: TouchEvent) => {
        e.preventDefault();
        if (this.joystickTouchId !== null) return;
        const touch = e.changedTouches[0];
        this.joystickTouchId = touch.identifier;
        const rect = joystickZone.getBoundingClientRect();
        this.joystickOrigin.set(rect.left + rect.width / 2, rect.top + rect.height / 2);
        this.updateJoystickFromPoint(touch.clientX, touch.clientY);
        joystickZone.classList.add('active');
      },
      { passive: false }
    );

    window.addEventListener(
      'touchmove',
      (e: TouchEvent) => {
        if (this.joystickTouchId === null) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === this.joystickTouchId) {
            this.updateJoystickFromPoint(t.clientX, t.clientY);
            break;
          }
        }
      },
      { passive: false }
    );

    const endTouch = (e: TouchEvent) => {
      if (this.joystickTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.joystickTouchId) {
          this.joystickTouchId = null;
          this.joystickInput.set(0, 0);
          if (this.joystickKnob) {
            this.joystickKnob.style.transform = 'translate3d(0px, 0px, 0)';
          }
          this.joystickZone?.classList.remove('active');
          break;
        }
      }
    };
    window.addEventListener('touchend', endTouch);
    window.addEventListener('touchcancel', endTouch);

    // Mouse fallback on the virtual joystick for desktop testing
    joystickZone.addEventListener('pointerdown', (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      e.preventDefault();
      this.joystickPointerDown = true;
      const rect = joystickZone.getBoundingClientRect();
      this.joystickOrigin.set(rect.left + rect.width / 2, rect.top + rect.height / 2);
      this.updateJoystickFromPoint(e.clientX, e.clientY);
      joystickZone.classList.add('active');
    });

    window.addEventListener('pointermove', (e: PointerEvent) => {
      if (!this.joystickPointerDown || e.pointerType === 'touch') return;
      this.updateJoystickFromPoint(e.clientX, e.clientY);
    });

    window.addEventListener('pointerup', (e: PointerEvent) => {
      if (!this.joystickPointerDown || e.pointerType === 'touch') return;
      this.joystickPointerDown = false;
      this.joystickInput.set(0, 0);
      if (this.joystickKnob) {
        this.joystickKnob.style.transform = 'translate3d(0px, 0px, 0)';
      }
      this.joystickZone?.classList.remove('active');
    });

    // Bind Action Buttons (both Touch and Pointer/Click)
    for (const [actionId, btn] of actionButtons.entries()) {
      btn.addEventListener(
        'touchstart',
        (e: TouchEvent) => {
          e.preventDefault();
          e.stopPropagation();
          this.triggerAction(actionId, true);
          btn.classList.add('pressed');
        },
        { passive: false }
      );

      btn.addEventListener('touchend', (e: TouchEvent) => {
        e.preventDefault();
        this.heldActions.delete(actionId);
        btn.classList.remove('pressed');
      });

      btn.addEventListener('pointerdown', (e: PointerEvent) => {
        if (e.pointerType === 'touch') return;
        e.preventDefault();
        e.stopPropagation();
        this.triggerAction(actionId, true);
        btn.classList.add('pressed');
      });

      btn.addEventListener('pointerup', (e: PointerEvent) => {
        if (e.pointerType === 'touch') return;
        this.heldActions.delete(actionId);
        btn.classList.remove('pressed');
      });

      btn.addEventListener('pointerleave', () => {
        this.heldActions.delete(actionId);
        btn.classList.remove('pressed');
      });
    }
  }

  private updateJoystickFromPoint(clientX: number, clientY: number): void {
    const dx = clientX - this.joystickOrigin.x;
    const dy = clientY - this.joystickOrigin.y;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, this.maxRadius);
    const angle = Math.atan2(dy, dx);

    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;

    if (this.joystickKnob) {
      this.joystickKnob.style.transform = `translate3d(${knobX.toFixed(1)}px, ${knobY.toFixed(1)}px, 0)`;
    }

    if (clampedDist < 6) {
      this.joystickInput.set(0, 0);
    } else {
      this.joystickInput.set(knobX / this.maxRadius, knobY / this.maxRadius);
    }
  }

  public triggerAction(action: ActionId, hold = false): void {
    this.queuedActions.add(action);
    if (hold) {
      this.heldActions.add(action);
    }
  }

  public consumeAction(action: ActionId): boolean {
    if (this.queuedActions.has(action)) {
      this.queuedActions.delete(action);
      return true;
    }
    return this.heldActions.has(action);
  }

  public update(): void {
    // Combine keyboard WASD/Arrows with Virtual Joystick
    let kx = 0;
    let ky = 0;
    if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) kx -= 1;
    if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) kx += 1;
    if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp')) ky -= 1;
    if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown')) ky += 1;

    if (kx !== 0 || ky !== 0) {
      this.moveVector.set(kx, ky).normalize();
    } else {
      this.moveVector.copy(this.joystickInput);
      if (this.moveVector.lengthSq() > 1) {
        this.moveVector.normalize();
      }
    }
  }

  private isTypingInInput(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (this.isTypingInInput(e.target)) return;
    this.keysDown.add(e.code);

    switch (e.code) {
      case 'KeyJ':
      case 'Space':
        this.triggerAction('basic', true);
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
      case 'KeyK':
        this.triggerAction('dash', false);
        break;
      case 'KeyQ':
      case 'Digit1':
        this.triggerAction('skill1', false);
        break;
      case 'KeyE':
      case 'Digit2':
        this.triggerAction('skill2', false);
        break;
      case 'KeyR':
      case 'Digit3':
        this.triggerAction('ultimate', false);
        break;
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keysDown.delete(e.code);
    if (e.code === 'KeyJ' || e.code === 'Space') {
      this.heldActions.delete('basic');
    }
  };

  public resetAll = (): void => {
    this.keysDown.clear();
    this.heldActions.clear();
    this.queuedActions.clear();
    this.joystickInput.set(0, 0);
    this.moveVector.set(0, 0);
  };
}
