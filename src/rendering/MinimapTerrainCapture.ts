import * as THREE from 'three';
import type { MinimapTerrain } from '../ui/Minimap';

/**
 * Small, throttled orthographic capture of the *real* zone geometry. The regular
 * renderer is reused: there is no second WebGL context or procedural road sketch.
 *
 * A wider source image allows the HUD to pan smoothly between captures without
 * displacing landmarks relative to the player.
 */
export class MinimapTerrainCapture {
  private static readonly SIZE = 320;
  private static readonly RADIUS = 38;
  private readonly camera = new THREE.OrthographicCamera(-38, 38, 38, -38, 0.1, 350);
  private readonly target = new THREE.WebGLRenderTarget(
    MinimapTerrainCapture.SIZE, MinimapTerrainCapture.SIZE, { depthBuffer: true, stencilBuffer: false },
  );
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly pixels = new Uint8Array(MinimapTerrainCapture.SIZE * MinimapTerrainCapture.SIZE * 4);
  private readonly image: ImageData;
  private center: { x: number; z: number } | null = null;
  private root: THREE.Object3D | null = null;
  private lastCaptureAt = -Infinity;
  private disabled = false;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = MinimapTerrainCapture.SIZE;
    const context = this.canvas.getContext('2d');
    if (!context) throw new Error('Minimap 2D canvas is unavailable');
    this.context = context;
    this.image = context.createImageData(MinimapTerrainCapture.SIZE, MinimapTerrainCapture.SIZE);
    this.camera.up.set(0, 0, -1); // +X to the right, -Z toward the top: north stays up.
    this.target.texture.colorSpace = THREE.SRGBColorSpace;
  }

  /** World-root identity prevents a previous zone's image appearing after travel. */
  public snapshot(root: THREE.Object3D | null): MinimapTerrain | undefined {
    if (!root || root !== this.root || !this.center) return undefined;
    return { canvas: this.canvas, x: this.center.x, z: this.center.z, radius: MinimapTerrainCapture.RADIUS };
  }

  public update(
    renderer: THREE.WebGLRenderer, scene: THREE.Scene, worldRoot: THREE.Object3D | null,
    player: { x: number; z: number }, now: number,
  ): void {
    if (this.disabled || !worldRoot || !Number.isFinite(player.x) || !Number.isFinite(player.z)) return;
    const sameRoot = worldRoot === this.root;
    if (!sameRoot) {
      this.root = worldRoot;
      this.center = null;
      this.lastCaptureAt = -Infinity;
    }
    const elapsed = now - this.lastCaptureAt;
    const moved = this.center ? Math.hypot(player.x - this.center.x, player.z - this.center.z) : Infinity;
    // About 2 captures/sec while moving; static scenes can wait a few seconds.
    if (elapsed < 450 || (moved < 1.5 && elapsed < 2500)) return;

    this.camera.position.set(player.x, 150, player.z);
    this.camera.lookAt(player.x, 0, player.z);
    this.camera.updateProjectionMatrix();

    const oldTarget = renderer.getRenderTarget();
    const oldFog = scene.fog;
    const hidden: THREE.Object3D[] = [];
    // The scene contains the hero, fiends, projectiles and VFX as independent
    // children. Capture only the authored/generated environment and lighting;
    // dynamic markers remain sharp, separately updated HUD icons.
    for (const child of scene.children) {
      if (child !== worldRoot && !(child instanceof THREE.Light) && child.visible) {
        child.visible = false;
        hidden.push(child);
      }
    }
    scene.fog = null; // The high camera must not turn all terrain into fog.
    try {
      renderer.setRenderTarget(this.target);
      renderer.render(scene, this.camera);
      renderer.readRenderTargetPixels(
        this.target, 0, 0, MinimapTerrainCapture.SIZE, MinimapTerrainCapture.SIZE, this.pixels,
      );
      // WebGL reads from bottom to top; canvas ImageData expects top to bottom.
      const stride = MinimapTerrainCapture.SIZE * 4;
      for (let row = 0; row < MinimapTerrainCapture.SIZE; row++) {
        const from = (MinimapTerrainCapture.SIZE - row - 1) * stride;
        this.image.data.set(this.pixels.subarray(from, from + stride), row * stride);
      }
      this.context.putImageData(this.image, 0, 0);
      this.center = { x: player.x, z: player.z };
      this.lastCaptureAt = now;
    } catch {
      // A lost or unsupported WebGL readback must not break the main game render.
      this.disabled = true;
      this.center = null;
    } finally {
      renderer.setRenderTarget(oldTarget);
      scene.fog = oldFog;
      for (const child of hidden) child.visible = true;
    }
  }

  public dispose(): void {
    this.target.dispose();
  }
}
