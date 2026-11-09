import * as THREE from 'three';
import { piece } from './ArtMesh';

/**
 * Astral Chronicles' ORIGINAL painted world treatment, extracted verbatim
 * from HearthmereScenery so the procedural atlas uses the same material
 * brush/grain, sky color bands, and scenery focus cutaway.
 *
 * A stable global-origin uniform is optional and defaults to zero for
 * original Hearthmere. Streamed chunks set it to world origin on camera
 * rebase, preventing the brush wash from swimming at cell boundaries.
 */
export function addSceneryCutaway(
  shader: THREE.WebGLProgramParametersWithUniforms,
  focus: THREE.IUniform<THREE.Vector4>,
  worldOrigin?: THREE.IUniform<THREE.Vector3>,
): void {
  shader.uniforms.sceneryFocus = focus;
  shader.uniforms.paintWorldOrigin = worldOrigin ?? { value: new THREE.Vector3() };
  const varyings = 'varying vec3 paintPosition;\nvarying vec3 paintView;\n';
  shader.vertexShader = 'uniform vec3 paintWorldOrigin;\n' + varyings + shader.vertexShader.replace('#include <project_vertex>', `
    #include <project_vertex>
    paintPosition = (modelMatrix * vec4(transformed, 1.0)).xyz + paintWorldOrigin;
    paintView = mvPosition.xyz;
  `);
  shader.fragmentShader = varyings + 'uniform vec4 sceneryFocus;\n' +
    shader.fragmentShader.replace('#include <clipping_planes_fragment>', `
      #include <clipping_planes_fragment>
      if (sceneryFocus.w > 0.5 && paintPosition.y > 0.15 && paintView.z > sceneryFocus.z + 0.12) {
        // Compare scenery and hero at the same distance from the eye.
        vec2 offset = paintView.xy * (sceneryFocus.z / paintView.z) - sceneryFocus.xy;
        float silhouette = length(offset / vec2(1.10, 1.43));
        float cutaway = (1.0 - smoothstep(0.71, 1.16, silhouette))
          * smoothstep(0.12, 0.40, paintView.z - sceneryFocus.z)
          * smoothstep(0.15, 0.39, paintPosition.y);
        float grain = fract(0.5 + dot(floor(gl_FragCoord.xy), vec2(0.75487766, 0.56984029)));
        if (cutaway > grain) discard;
      }
    `);
}

export function paintedPalette(
  focus: THREE.IUniform<THREE.Vector4>,
  options: { worldOrigin?: THREE.IUniform<THREE.Vector3>; vertexColors?: boolean; side?: THREE.Side } = {},
): THREE.MeshLambertMaterial {
  const material = new THREE.MeshLambertMaterial({
    vertexColors: options.vertexColors ?? true,
    side: options.side ?? THREE.FrontSide,
  });
  material.onBeforeCompile = shader => {
    addSceneryCutaway(shader, focus, options.worldOrigin);
    shader.fragmentShader = `
      float paperHash(vec2 p) {
        vec3 n = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
        n += dot(n, n.yzx + 33.33);
        return fract((n.x + n.y) * n.z);
      }
      float wash(vec2 p) {
        vec2 cell = floor(p);
        vec2 u = fract(p);
        u = u*u*(3.0 - 2.0*u);
        return mix(mix(paperHash(cell), paperHash(cell + vec2(1.0, 0.0)), u.x),
          mix(paperHash(cell + vec2(0.0, 1.0)), paperHash(cell + vec2(1.0)), u.x), u.y);
      }
    ` + shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      vec2 brush = vec2(paintPosition.x * 0.72 + paintPosition.y * 0.47,
        paintPosition.z * 1.12 - paintPosition.y * 0.68);
      float broadWash = wash(brush * 1.33);
      float fineWash = wash(brush * vec2(5.0, 9.0));
      float fleck = smoothstep(0.57, 0.8, broadWash + (fineWash - 0.5) * 0.31);
      diffuseColor.rgb *= mix(vec3(0.91, 0.93, 1.0), vec3(1.11, 1.07, 0.92), broadWash);
      diffuseColor.rgb += vec3(0.041, 0.037, 0.021) * fleck;
      diffuseColor.rgb *= 0.93 + fineWash * 0.13;
    `);
  };
  return material;
}

export function addPaintedSky(parent: THREE.Group, radius = 92): void {
  const material = new THREE.ShaderMaterial({
    depthWrite: false, side: THREE.BackSide,
    uniforms: {
      horizon: { value: new THREE.Color(0xf1ddba) },
      middle: { value: new THREE.Color(0xa5ccdc) },
      zenith: { value: new THREE.Color(0x658ac0) },
      cloud: { value: new THREE.Color(0xf6ede0) },
    },
    vertexShader: `
      varying vec3 skyPosition;
      void main() {
        skyPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 skyPosition;
      uniform vec3 horizon;
      uniform vec3 middle;
      uniform vec3 zenith;
      uniform vec3 cloud;
      void main() {
        vec3 p = normalize(skyPosition);
        float height = max(0.0, p.y);
        vec3 color = mix(horizon, middle, smoothstep(0.0, 0.33, height));
        color = mix(color, zenith, smoothstep(0.28, 0.91, height));
        float smear = sin(p.x * 16.0 + p.z * 7.0) * 0.035 + sin(p.x * 34.0 - p.z * 18.0) * 0.008;
        float cloudBand = 1.0 - smoothstep(0.012, 0.053, abs(p.y + smear - 0.22));
        float upperBand = 1.0 - smoothstep(0.006, 0.033, abs(p.y + smear * 0.66 - 0.43));
        color = mix(color, cloud, (cloudBand * 0.71 + upperBand * 0.47) * (0.69 + 0.31 * sin(p.x * 7.0 + p.z * 4.1)));
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const sky = piece(parent, new THREE.SphereGeometry(radius, 28, 14), material, 3, 0, 0);
  sky.renderOrder = -20;
}

