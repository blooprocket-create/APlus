import * as THREE from 'three';

export class IsometricCameraController {
  public readonly camera: THREE.PerspectiveCamera;
  private currentFocus = new THREE.Vector3(0, 0, 0);
  public shakeEnabled = true;
  private shakeTimer = 0;
  private shakeIntensity = 0;
  private zoomPunch = 0;

  // Isometric offset angle (45 deg yaw, ~42 deg pitch)
  private readonly baseOffset = new THREE.Vector3(0, 14.5, 13.5);
  private readonly previewPosition = new THREE.Vector3(2.8, 3.3, 8.7);
  private readonly previewLookAt = new THREE.Vector3(1.7, 1.0, 0);
  private cutsceneShot: {
    cameraOffset: THREE.Vector3;
    lookAtOffset: THREE.Vector3;
  } | null = null;

  public setCutsceneShot(
    shot: {
      cameraOffset: { x: number; y: number; z: number };
      lookAtOffset: { x: number; y: number; z: number };
    } | null
  ): void {
    if (!shot) {
      this.cutsceneShot = null;
    } else {
      this.cutsceneShot = {
        cameraOffset: new THREE.Vector3(
          shot.cameraOffset.x,
          shot.cameraOffset.y,
          shot.cameraOffset.z
        ),
        lookAtOffset: new THREE.Vector3(
          shot.lookAtOffset.x,
          shot.lookAtOffset.y,
          shot.lookAtOffset.z
        ),
      };
    }
  }

  constructor() {
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / Math.max(1, window.innerHeight),
      0.1,
      150
    );
    this.updateAspect();
  }

  public updateAspect(): void {
    const w = window.innerWidth;
    const h = Math.max(1, window.innerHeight);
    const aspect = w / h;
    this.camera.aspect = aspect;

    // On narrow portrait mobile screens, widen FOV slightly so horizontal arena visibility stays generous
    if (aspect < 0.85) {
      this.camera.fov = 56;
    } else if (aspect < 1.2) {
      this.camera.fov = 50;
    } else {
      this.camera.fov = 44;
    }
    this.camera.updateProjectionMatrix();
  }

  public triggerShake(intensity = 0.35, duration = 0.2): void {
    if (!this.shakeEnabled) return;
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTimer = Math.max(this.shakeTimer, duration);
  }

  public triggerUltimateZoom(): void {
    this.zoomPunch = 0.24;
  }

  public snapToPedestalPreview(): void {
    this.camera.position.copy(this.previewPosition);
    this.currentFocus.copy(this.previewLookAt);
    this.camera.lookAt(this.currentFocus);
  }

  public snapToIsometricFollow(targetPos: THREE.Vector3): void {
    this.currentFocus.set(targetPos.x, 0.8, targetPos.z);
    this.camera.position.set(
      this.currentFocus.x + this.baseOffset.x,
      this.currentFocus.y + this.baseOffset.y,
      this.currentFocus.z + this.baseOffset.z
    );
    this.camera.lookAt(this.currentFocus);
  }

  /**
   * Positions the camera in front of the character pedestal during Character Select / Creation.
   */
  public updatePedestalPreview(dt: number): void {
    this.camera.position.lerp(this.previewPosition, Math.min(1, dt * 8));
    this.currentFocus.lerp(this.previewLookAt, Math.min(1, dt * 8));
    this.camera.lookAt(this.currentFocus);
  }

  /**
   * Smoothly tracks the active character in Isometric ARPG mode with subtle look-ahead.
   */
  public updateIsometricFollow(
    dt: number,
    targetPos: THREE.Vector3,
    moveDir: THREE.Vector2
  ): void {
    if (this.cutsceneShot) {
      const desiredFocus = targetPos.clone().add(this.cutsceneShot.lookAtOffset);
      const desiredPos = targetPos.clone().add(this.cutsceneShot.cameraOffset);
      this.currentFocus.lerp(desiredFocus, Math.min(1, dt * 6.5));
      this.camera.position.lerp(desiredPos, Math.min(1, dt * 6.5));
      this.camera.lookAt(this.currentFocus);
      return;
    }

    const lookAheadX = moveDir.x * 1.45;
    const lookAheadZ = moveDir.y * 1.45;

    const desiredFocus = new THREE.Vector3(
      targetPos.x + lookAheadX,
      0.8,
      targetPos.z + lookAheadZ
    );
    this.currentFocus.lerp(desiredFocus, Math.min(1, dt * 7.5));

    this.zoomPunch = THREE.MathUtils.lerp(this.zoomPunch, 0, Math.min(1, dt * 4.5));
    const zoomScale = 1 - this.zoomPunch;

    const desiredPos = new THREE.Vector3(
      this.currentFocus.x + this.baseOffset.x * zoomScale,
      this.currentFocus.y + this.baseOffset.y * zoomScale,
      this.currentFocus.z + this.baseOffset.z * zoomScale
    );

    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      desiredPos.x += (Math.random() - 0.5) * 2 * this.shakeIntensity;
      desiredPos.y += (Math.random() - 0.5) * 2 * this.shakeIntensity;
      if (this.shakeTimer <= 0) {
        this.shakeIntensity = 0;
      }
    }

    this.camera.position.lerp(desiredPos, Math.min(1, dt * 10));
    this.camera.lookAt(this.currentFocus);
  }
}
