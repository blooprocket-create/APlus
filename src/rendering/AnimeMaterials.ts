import * as THREE from 'three';

let cachedToonGradient: THREE.DataTexture | null = null;

/**
 * Generates a sharp 4-step cel-shading gradient texture using NearestFilter
 * to give Three.js MeshToonMaterial a crisp anime / cel-shaded look.
 */
export function getAnimeGradientMap(): THREE.DataTexture {
  if (cachedToonGradient) return cachedToonGradient;

  const colors = new Uint8Array([
    68, 68, 82, 255,    // Deep shadow band
    138, 138, 155, 255, // Mid-shadow band
    215, 215, 228, 255, // Lit band
    255, 255, 255, 255, // Crisp highlight band
  ]);

  const texture = new THREE.DataTexture(colors, 4, 1, THREE.RGBAFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  cachedToonGradient = texture;
  return texture;
}

export interface AnimeMaterialOptions {
  color: number;
  emissive?: number;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
}

export function createAnimeToonMaterial(options: AnimeMaterialOptions): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({
    color: options.color,
    gradientMap: getAnimeGradientMap(),
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
  });
}

/**
 * Creates an inverted-hull anime ink outline mesh child for a given mesh.
 */
export function attachAnimeOutline(
  mesh: THREE.Mesh,
  scaleMultiplier = 1.06,
  outlineColor = 0x0d0b18
): THREE.Mesh {
  const outlineMat = new THREE.MeshBasicMaterial({
    color: outlineColor,
    side: THREE.BackSide,
  });
  const outlineMesh = new THREE.Mesh(mesh.geometry, outlineMat);
  outlineMesh.scale.setScalar(scaleMultiplier);
  outlineMesh.name = 'anime_outline';
  mesh.add(outlineMesh);
  return outlineMesh;
}
