import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { MinimapTerrainCapture } from '../src/rendering/MinimapTerrainCapture';

afterEach(() => vi.unstubAllGlobals());

function setup() {
  const image = {
    width: 320, height: 320, data: new Uint8ClampedArray(320 * 320 * 4),
  } as ImageData;
  const context = {
    createImageData: vi.fn(() => image), putImageData: vi.fn(),
  };
  vi.stubGlobal('document', {
    createElement: vi.fn(() => ({
      width: 0, height: 0, getContext: () => context,
    })),
  });
  const scene = new THREE.Scene();
  const fog = new THREE.Fog(0xffffff, 10, 20);
  scene.fog = fog;
  const environment = new THREE.Group();
  const actor = new THREE.Group();
  const light = new THREE.DirectionalLight(0xffffff, 1);
  scene.add(environment, actor, light);
  const getRenderTarget = vi.fn(() => null);
  const setRenderTarget = vi.fn();
  const render = vi.fn((_scene: THREE.Scene, _camera: THREE.Camera) => {
    expect(actor.visible).toBe(false);
    expect(environment.visible).toBe(true);
    expect(light.visible).toBe(true);
    expect(scene.fog).not.toBeNull();
    expect((scene.fog as THREE.Fog).far).toBe(100000);
  });
  const readRenderTargetPixels = vi.fn((
    _target: unknown, _x: number, _y: number, _width: number, _height: number, pixels: Uint8Array,
  ) => {
    pixels[(320 - 1) * 320 * 4] = 77;
  });
  const renderer = {
    shadowMap: { autoUpdate: true },
    getRenderTarget, setRenderTarget, render, readRenderTargetPixels,
  } as unknown as THREE.WebGLRenderer;
  return { scene, fog, actor, light, environment, context, image, renderer, render, setRenderTarget };
}

describe('top-down world capture', () => {
  it('renders the actual environment, not actors or effects, and restores the main renderer', () => {
    const t = setup();
    const capture = new MinimapTerrainCapture();
    capture.update(t.renderer, t.scene, t.environment, { x: 10, z: -8 }, 1000);
    expect(t.render).toHaveBeenCalledOnce();
    expect(t.actor.visible).toBe(true);
    expect(t.scene.fog).toBe(t.fog);
    expect(t.fog.far).toBe(20);
    expect(t.renderer.shadowMap.autoUpdate).toBe(true);
    expect(t.setRenderTarget).toHaveBeenLastCalledWith(null);
    expect(t.image.data[0]).toBe(77); // WebGL's bottom-left origin was flipped.
    expect(t.context.putImageData).toHaveBeenCalledOnce();
    const snapshot = capture.snapshot(t.environment);
    expect(snapshot).toMatchObject({ x: 10, z: -8, radius: 38 });
    expect(snapshot?.canvas.width).toBe(320);
    const camera = t.render.mock.calls[0][1] as THREE.OrthographicCamera;
    expect(camera.up.toArray()).toEqual([0, 0, -1]);
    capture.dispose();
  });

  it('throttles readbacks but updates while moving and invalidates an old zone', () => {
    const t = setup();
    const capture = new MinimapTerrainCapture();
    capture.update(t.renderer, t.scene, t.environment, { x: 0, z: 0 }, 1000);
    capture.update(t.renderer, t.scene, t.environment, { x: 1, z: 0 }, 1500);
    expect(t.render).toHaveBeenCalledTimes(1);
    capture.update(t.renderer, t.scene, t.environment, { x: 3, z: 0 }, 1550);
    expect(t.render).toHaveBeenCalledTimes(2);
    const secondZone = new THREE.Group();
    t.scene.add(secondZone);
    expect(capture.snapshot(secondZone)).toBeUndefined();
    capture.update(t.renderer, t.scene, secondZone, { x: 12, z: 4 }, 1650);
    expect(t.render).toHaveBeenCalledTimes(3);
    expect(capture.snapshot(secondZone)).toMatchObject({ x: 12, z: 4 });
    capture.dispose();
  });

  it('fails safely if GPU readback is unavailable', () => {
    const t = setup();
    const renderer = t.renderer as THREE.WebGLRenderer & { readRenderTargetPixels: ReturnType<typeof vi.fn> };
    renderer.readRenderTargetPixels.mockImplementation(() => { throw new Error('WebGL context lost'); });
    const capture = new MinimapTerrainCapture();
    expect(() => capture.update(renderer, t.scene, t.environment, { x: 0, z: 0 }, 1000)).not.toThrow();
    expect(capture.snapshot(t.environment)).toBeUndefined();
    expect(t.actor.visible).toBe(true);
    expect(t.scene.fog).toBe(t.fog);
    expect(t.setRenderTarget).toHaveBeenLastCalledWith(null);
    capture.dispose();
  });
});
