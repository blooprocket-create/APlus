import * as THREE from 'three';
import { PAINTED_WATER_PALETTE } from '../rendering/PaintedWorldStyle';

/**
 * World V2's continuous ocean now shares the original Hearthmere river
 * pigments and hand-painted stroke language. The ocean remains camera-
 * centered for seamless distant rendering, while its water pattern uses
 * absolute atlas coordinates across cell loads and floating-origin rebases.
 *
 * This is visual water only; navigation/buoyancy remain later-phase systems.
 */
export function createOceanPreview(): {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  update: (worldX: number, worldZ: number, localX: number, localZ: number, seconds: number) => void;
} {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uWorldCenter: { value: new THREE.Vector2() },
      uTime: { value: 0 },
      deep: { value: new THREE.Color(PAINTED_WATER_PALETTE.deep) },
      channel: { value: new THREE.Color(PAINTED_WATER_PALETTE.channel) },
      shallows: { value: new THREE.Color(PAINTED_WATER_PALETTE.shallows) },
      glint: { value: new THREE.Color(PAINTED_WATER_PALETTE.glint) },
    },
    vertexShader: `
      uniform vec2 uWorldCenter;
      varying vec2 vOceanXZ;
      void main() {
        // Rotated plane maps its local +Y to world -Z.
        vOceanXZ = vec2(position.x, -position.y) + uWorldCenter;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision mediump float;
      varying vec2 vOceanXZ;
      uniform float uTime;
      uniform vec3 deep;
      uniform vec3 channel;
      uniform vec3 shallows;
      uniform vec3 glint;

      // The stroke and wash grammar is adapted directly from HearthmereScenery,
      // rather than introducing an unrelated glossy ocean rendering style.
      float hash(vec2 p) {
        p = fract(p * vec2(.1031, .1099));
        p += dot(p, p.yx + 33.33);
        return fract(p.x * p.y * 19.31);
      }
      float strokes(vec2 p) {
        vec2 cell = floor(p);
        vec2 q = fract(p);
        float seed = hash(cell);
        float along = (q.y - .5) / (.19 + seed * .29);
        float width = .023 + .048 * hash(cell.yx);
        float bend = along * (seed - .5) * .31 + along * along * .19;
        float cross = (q.x - (.26 + seed * .47) - bend) / width;
        return (1.0 - smoothstep(.32, 1.0, cross * cross + along * along))
          * smoothstep(.53, .91, seed);
      }
      void main() {
        vec2 p = vOceanXZ;
        float longFlow = sin(p.x * .047 + sin(p.y * .029) * 1.2 + uTime * .65);
        float crossFlow = sin(p.y * .095 - p.x * .024 - uTime * .45);
        float secondary = sin((p.x + p.y) * .034 + uTime * .26);
        float wash = smoothstep(-.7, .75, longFlow * .55 + crossFlow * .24 + secondary * .14);
        float shallowsRibbon = smoothstep(.32, .88, crossFlow * .47 + longFlow * .26);
        vec3 water = mix(deep, channel, .43 + wash * .37);
        water = mix(water, shallows, shallowsRibbon * .20);

        // Little brushed highlights, not metallic specular glints.
        vec2 brush = vec2(p.x * .11 + sin(p.y * .017) * .25,
                          p.y * .10 - uTime * .045);
        float flecks = strokes(brush) +
          strokes(brush * vec2(1.4, 1.8) + vec2(.63, .38)) * .40;
        float ribbon = smoothstep(.76, .97, longFlow * .51 + crossFlow * .41) *
          .19;
        water = mix(water, glint, min(.30, flecks * .19 + ribbon));
        gl_FragColor = vec4(water, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
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
