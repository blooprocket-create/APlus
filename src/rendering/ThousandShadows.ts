import * as THREE from 'three';

const ribbonVertex = `
  varying vec2 stroke;
  void main() {
    stroke = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export type ShadowBlades = readonly [THREE.Vector3, THREE.Vector3];
const SAMPLES = 14;

export function buildShadowBladeTrails(color: number, accent: number) {
  const mesh = new THREE.Group();
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: {
      dye: { value: new THREE.Color(color) },
      light: { value: new THREE.Color(accent) },
      opacity: { value: 0 },
    },
    vertexShader: ribbonVertex,
    fragmentShader: `
      varying vec2 stroke;
      uniform vec3 dye;
      uniform vec3 light;
      uniform float opacity;
      void main() {
        float edge = smoothstep(.71, .90, stroke.y) * (1.0 - smoothstep(.95, 1.0, stroke.y));
        float body = smoothstep(.10, .56, stroke.y);
        vec3 color = mix(vec3(.038, .009, .065), dye, body * .69);
        color = mix(color, light, edge * .91);
        gl_FragColor = vec4(color, stroke.x * body * opacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const paths = [-1, 1].map(() => {
    const history: { inner: THREE.Vector3; outer: THREE.Vector3 }[] = [];
    const positions = new THREE.BufferAttribute(new Float32Array(SAMPLES * 6), 3).setUsage(THREE.DynamicDrawUsage);
    const uv = new THREE.BufferAttribute(new Float32Array(SAMPLES * 4), 2).setUsage(THREE.DynamicDrawUsage);
    const index: number[] = [];
    for (let row = 0; row < SAMPLES - 1; row++) {
      const a = row * 2;
      index.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
    }
    const geometry = new THREE.BufferGeometry().setAttribute('position', positions).setAttribute('uv', uv).setIndex(index);
    geometry.setDrawRange(0, 0);
    const strip = new THREE.Mesh(geometry, material);
    strip.frustumCulled = false;
    mesh.add(strip);
    return { history, positions, uv, geometry };
  });
  let lastPhase = -1;
  const pose = (age: number, sample?: { phase: number; blades: ShadowBlades; center: THREE.Vector3 }) => {
    material.uniforms.opacity.value = 1 - THREE.MathUtils.smoothstep(age, .62, 1);
    if (!sample || sample.phase < .06 || sample.phase === lastPhase) return;
    lastPhase = sample.phase;
    paths.forEach(({ history, positions, uv, geometry }, blade) => {
      const tip = sample.blades[blade];
      const outward = new THREE.Vector3(tip.x - sample.center.x, .09, tip.z - sample.center.z).normalize();
      history.push({ inner: tip.clone().addScaledVector(outward, -.12), outer: tip.clone().addScaledVector(outward, .76) });
      if (history.length > SAMPLES) history.shift();
      history.forEach(({ inner, outer }, row) => {
        const weight = (row + 1) / history.length;
        const a = row * 2;
        positions.setXYZ(a, inner.x, inner.y, inner.z);
        positions.setXYZ(a + 1,
          THREE.MathUtils.lerp(inner.x, outer.x, weight),
          THREE.MathUtils.lerp(inner.y, outer.y, weight),
          THREE.MathUtils.lerp(inner.z, outer.z, weight));
        uv.setXY(a, weight, 0);
        uv.setXY(a + 1, weight, 1);
      });
      geometry.setDrawRange(0, (history.length - 1) * 6);
      positions.needsUpdate = uv.needsUpdate = true;
    });
  };
  return { mesh, pose };
}

export function buildThousandShadows(center: THREE.Vector3, yaw: number, radius: number, color: number, accent: number) {
  const mesh = new THREE.Group();
  mesh.position.copy(center);
  mesh.rotation.y = yaw;
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: {
      dye: { value: new THREE.Color(color) },
      light: { value: new THREE.Color(accent).lerp(new THREE.Color(0xffe8ff), .38) },
      age: { value: 0 },
    },
    vertexShader: 'attribute float delay; varying float beat;\n' + ribbonVertex.replace(
      'stroke = uv;', 'stroke = uv; beat = delay;'),
    fragmentShader: `
      varying vec2 stroke;
      varying float beat;
      uniform vec3 dye;
      uniform vec3 light;
      uniform float age;
      void main() {
        float elapsed = (age - beat) / .65;
        float reach = 1.10 * (1.0 - pow(1.0 - clamp(elapsed * 3.0, 0.0, 1.0), 3.0));
        float head = 1.0 - smoothstep(reach - .15, reach, stroke.x);
        float dry = sin(stroke.x * 57.0 + beat * 31.0) * .017 + sin(stroke.x * 129.0) * .009;
        float edge = smoothstep(.73, .86, stroke.y + dry) * (1.0 - smoothstep(.93, 1.0, stroke.y + dry));
        float grain = .84 + .16 * sin(stroke.y * 35.0 + sin(stroke.x * 38.0) * 1.2);
        float ink = smoothstep(.04, .36, stroke.y + dry) * (1.0 - smoothstep(.93, 1.0, stroke.y));
        vec3 color = mix(vec3(.033, .006, .053), dye, smoothstep(.43, .85, stroke.y + dry) * .87);
        color = mix(color, light, edge);
        float tail = 1.0 - smoothstep(.22 + stroke.x * .15, .79 + stroke.x * .12, elapsed);
        gl_FragColor = vec4(color, step(0.0, elapsed) * head * tail * max(ink * grain, edge * .95));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const positions: number[] = [];
  const uvs: number[] = [];
  const delays: number[] = [];
  const index: number[] = [];
  // Broad diagonals alternate with finer strokes at different heights.
  const strokes = [
    [.54, .92, .14, .18, .00], [3.66, .90, .15, .23, .01],
    [-.81, .88, -.20, .12, .10], [2.29, .96, -.18, .17, .13],
    [.10, 1, .23, .07, .22], [3.02, .83, .25, .10, .24],
    [1.57, .77, -.22, .045, .27], [-1.66, .76, -.27, .06, .29],
  ];
  for (const [angle, reach, turn, thickness, delay] of strokes) {
    for (let row = 0; row <= 24; row++) {
      const t = row / 24;
      const base = positions.length / 3;
      const r = radius * (.12 + reach * .88 * t);
      const bend = angle + turn * Math.sin(t * 2.8) + turn * .24 * t;
      const width = thickness * radius * Math.sin(t * Math.PI) ** .69;
      const height = .70 + Math.sin(Math.PI * t) * (.31 + delay * 1.3) + turn * t;
      for (const edge of [-.75, .38]) {
        positions.push(Math.sin(bend) * r + Math.cos(bend) * width * edge,
          height + edge * width * .35, Math.cos(bend) * r - Math.sin(bend) * width * edge);
        uvs.push(t, edge < 0 ? 0 : 1);
        delays.push(delay);
      }
      if (row > 0) index.push(base - 2, base - 1, base, base, base - 1, base + 1);
    }
  }
  const geometry = new THREE.BufferGeometry()
    .setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    .setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    .setAttribute('delay', new THREE.Float32BufferAttribute(delays, 1))
    .setIndex(index);
  const cuts = new THREE.Mesh(geometry, material);
  cuts.renderOrder = 2;
  mesh.add(cuts);
  return { mesh, pose: (age: number) => { material.uniforms.age.value = age; } };
}
