import * as THREE from 'three';

/**
 * Continuous, camera-centered ocean demonstration. Unlike the old per-cell
 * translucent planes, it cannot expose square gaps when stream rings unload.
 * Wave shading is world-space: origin rebasing and camera motion do not change
 * its pattern. Actual ocean physics and ship wake come in Phase 4.
 */
export function createOceanPreview(): {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  update: (worldX: number, worldZ: number, localX: number, localZ: number, seconds: number) => void;
} {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uWorldCenter: { value: new THREE.Vector2() },
      uTime: { value: 0 },
    },
    vertexShader: `
      uniform vec2 uWorldCenter;
      varying vec2 vOceanXZ;
      void main() {
        // A rotated plane maps local +Y to world -Z.
        vOceanXZ = vec2(position.x, -position.y) + uWorldCenter;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision mediump float;
      varying vec2 vOceanXZ;
      uniform float uTime;
      void main() {
        vec2 p = vOceanXZ;
        float a = sin(p.x * 0.047 + sin(p.y * 0.029) * 1.2 + uTime * 0.65);
        float b = sin(p.y * 0.095 - p.x * 0.024 - uTime * 0.45);
        float c = sin((p.x + p.y) * 0.034 + uTime * 0.26);
        float shading = 0.5 + 0.18 * a + 0.14 * b + 0.12 * c;
        vec3 sea = mix(vec3(0.085, 0.40, 0.53), vec3(0.13, 0.59, 0.67), clamp(shading, 0.0, 1.0));
        float crest = smoothstep(0.81, 0.96, 0.5 + 0.27 * a + 0.17 * b);
        sea = mix(sea, vec3(0.45, 0.79, 0.78), crest * 0.16);
        gl_FragColor = vec4(sea, 1.0);
      }
    `,
    side: THREE.DoubleSide,
    depthWrite: true,
    transparent: false,
  });
  const geometry = new THREE.PlaneGeometry(2600, 2600, 1, 1);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.05;
  mesh.renderOrder = 0;
  return {
    mesh,
    update: (worldX, worldZ, localX, localZ, seconds) => {
      mesh.position.x = localX;
      mesh.position.z = localZ;
      material.uniforms.uWorldCenter.value.set(worldX, worldZ);
      material.uniforms.uTime.value = seconds;
    },
  };
}
