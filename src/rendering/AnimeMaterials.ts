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

/** An illustrated light ramp with a fixed world-space key and colored shadow. */
export function createIllustratedCelMaterial(options: AnimeMaterialOptions): THREE.MeshToonMaterial {
  const material = createAnimeToonMaterial(options);
  material.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace(
      'vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;',
      `
        vec3 artNormal = inverseTransformDirection(normal, viewMatrix);
        float lightFacing = dot(artNormal, normalize(vec3(-0.38, 0.78, 0.50)));
        float blend = clamp(fwidth(lightFacing) * 0.65, 0.008, 0.05);
        float litBand = smoothstep(0.16 - blend, 0.16 + blend, lightFacing);
        float topBand = smoothstep(0.78 - blend, 0.78 + blend, lightFacing);
        vec3 albedo = diffuseColor.rgb;
        vec3 shadow = albedo * vec3(0.50, 0.54, 0.69) + vec3(0.014, 0.010, 0.026);
        vec3 light = albedo * vec3(1.14, 1.075, 0.98) + vec3(0.016, 0.015, 0.014);
        float edge = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
        float rim = smoothstep(0.77, 0.87, edge) * smoothstep(0.21, 0.6, dot(artNormal, vec3(0.67, 0.60, -0.43)));
        vec3 outgoingLight = mix(shadow, light, litBand) + topBand * albedo * 0.095
          + rim * vec3(0.10, 0.14, 0.18) + totalEmissiveRadiance;
      `
    );
  };
  return material;
}

export function createSilhouetteInk(width: number, color = 0x211d31): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      ink: { value: new THREE.Color(color) }, width: { value: width },
    }]),
    vertexShader: `
      uniform float width;
      #include <fog_pars_vertex>
      #include <skinning_pars_vertex>
      void main() {
        #include <skinbase_vertex>
        #include <beginnormal_vertex>
        #include <skinnormal_vertex>
        #include <begin_vertex>
        #include <skinning_vertex>
        vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
        vec3 direction = normalize(normalMatrix * objectNormal);
        float expansion = width * clamp(-mvPosition.z * 0.071, 0.72, 2.0);
        mvPosition.xyz += direction * expansion;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      uniform vec3 ink;
      #include <fog_pars_fragment>
      void main() {
        gl_FragColor = vec4(ink, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  });
}

export function inkMesh(mesh: THREE.Mesh, ink: THREE.ShaderMaterial): void {
  const silhouette = mesh instanceof THREE.SkinnedMesh
    ? new THREE.SkinnedMesh(mesh.geometry, ink) : new THREE.Mesh(mesh.geometry, ink);
  silhouette.name = 'illustrated_ink';
  mesh.add(silhouette);
  if (silhouette instanceof THREE.SkinnedMesh && mesh instanceof THREE.SkinnedMesh) {
    silhouette.bind(mesh.skeleton, mesh.bindMatrix);
    silhouette.frustumCulled = false;
  }
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
