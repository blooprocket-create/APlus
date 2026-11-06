import * as THREE from 'three';
import { buildShadowChakram } from './NightbladeProjectiles';

export function buildDeathmark(radius: number, color: number, accent: number) {
  const mesh = new THREE.Group();
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: {
      ink: { value: new THREE.Color(0x271134) },
      violet: { value: new THREE.Color(color) },
      flare: { value: new THREE.Color(accent) },
      age: { value: 0 }, pulse: { value: 1 }, opacity: { value: 0 },
    },
    vertexShader: `
      varying vec2 seal;
      void main() {
        seal = uv * 2.0 - 1.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 ink;
      uniform vec3 violet;
      uniform vec3 flare;
      uniform float age;
      uniform float pulse;
      uniform float opacity;
      varying vec2 seal;
      void main() {
        float radius = length(seal);
        float angle = atan(seal.y, seal.x);
        float teeth = cos(8.0 * angle + .3);
        float rim = (1.0 - smoothstep(.008, .022, abs(radius - .965)))
          * smoothstep(-.67, -.15, teeth);
        float teethMarks = smoothstep(.87, .99, teeth) * smoothstep(.86, .91, radius)
          * (1.0 - smoothstep(.95, .97, radius));
        float foundation = (1.0 - smoothstep(.13, .51, radius))
          * (.17 + .13 * sin(angle * 6.0 + radius * 13.0 + age * 1.8));
        float front = .22 + .76 * (1.0 - pow(1.0 - pulse, 2.0));
        float curve = sin(angle * 3.0 + age * 10.0 + pulse * 4.7);
        float slash = (1.0 - smoothstep(.014, .07, abs(radius - front + curve * .045)))
          * smoothstep(-.24, .48, curve) * (1.0 - smoothstep(.34, 1.0, pulse));
        float tip = smoothstep(.51, .79, curve) * slash;
        vec3 paint = mix(ink, violet, max(teethMarks, max(rim, slash)));
        paint = mix(paint, flare, tip * .89 + teethMarks * .10);
        float alpha = max(foundation, max(rim * .30 + teethMarks * .14, slash * .91)) * opacity;
        gl_FragColor = vec4(paint, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const seal = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), material);
  seal.rotation.x = -Math.PI / 2;
  const rotor = buildShadowChakram(
    new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false }),
    new THREE.MeshBasicMaterial({ color: accent, transparent: true, depthWrite: false }),
  );
  rotor.rotation.z = 0;
  mesh.add(seal, rotor);

  const pose = (age: number, duration: number, sinceTick: number) => {
    const opening = THREE.MathUtils.smoothstep(age, .018, .12);
    const closing = 1 - THREE.MathUtils.smoothstep(age, duration - .25, duration);
    const pulse = sinceTick < 0 ? 1 : Math.min(1, sinceTick / .22);
    const sweep = Math.sin(Math.PI * pulse) * (1 - pulse);
    material.uniforms.age.value = age;
    material.uniforms.pulse.value = pulse;
    material.uniforms.opacity.value = opening * closing;
    rotor.scale.setScalar(opening * closing * (.73 + sweep * .49));
    rotor.position.y = .075 + .28 * sweep;
    rotor.rotation.y = -age * 5.8 - sweep * 2.1;
  };
  pose(0, 4, -1);
  return { mesh, pose };
}

export function buildDeathmarkCast(origin: THREE.Vector3, targets: readonly THREE.Vector3[], color: number, accent: number) {
  const points: number[] = [], colors: number[] = [], indices: number[] = [];
  const samples = 12;
  const ink = new THREE.Color(color).lerp(new THREE.Color(0x351344), .53);
  const light = new THREE.Color(accent).lerp(new THREE.Color(0xffdcf2), .39);
  for (let step = 0; step <= samples; step++) {
    const t = step / samples;
    for (const [branch, target] of targets.entries()) {
      const dx = target.x - origin.x, dz = target.z - origin.z;
      const inverseLength = 1 / Math.max(.001, Math.hypot(dx, dz));
      const arc = Math.sin(Math.PI * t);
      const bend = arc * (.28 - branch * .24);
      const width = arc * .087;
      for (const [side, offset] of [-width, 0, width].entries()) {
        const slide = (offset + bend) * inverseLength;
        points.push(dx * t + dz * slide, (.14 - origin.y) * t + arc * .28 + offset * .57,
          dz * t - dx * slide);
        const tint = side === 1 ? light : ink;
        colors.push(tint.r, tint.g, tint.b);
      }
      if (step > 0) {
        const a = ((step - 1) * targets.length + branch) * 3;
        const b = a + targets.length * 3;
        indices.push(a, b, a + 1, a + 1, b, b + 1, a + 1, b + 1, a + 2, a + 2, b + 1, b + 2);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  const material = new THREE.MeshBasicMaterial({
    vertexColors: true, side: THREE.DoubleSide, transparent: true, depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(origin);
  const pose = (p: number) => {
    const end = Math.ceil(samples * THREE.MathUtils.smoothstep(p, 0, .44));
    const start = Math.floor(samples * THREE.MathUtils.smoothstep(p, .25, 1));
    geometry.setDrawRange(start * targets.length * 12, Math.max(0, end - start) * targets.length * 12);
    material.opacity = 1 - THREE.MathUtils.smoothstep(p, .45, 1);
  };
  pose(0);
  return { mesh, pose };
}
