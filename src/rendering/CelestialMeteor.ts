import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);

function starSeal(radius: number, color: number, accent: number) {
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: {
      ink: { value: new THREE.Color(color) },
      lightColor: { value: new THREE.Color(accent) },
      progress: { value: 0 },
      imminence: { value: 0 },
    },
    vertexShader: `
      varying vec2 mark;
      void main() {
        mark = uv * 2.0 - 1.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 ink;
      uniform vec3 lightColor;
      uniform float progress;
      uniform float imminence;
      varying vec2 mark;
      void main() {
        float r = length(mark);
        float sector = abs(fract(atan(mark.y, mark.x) * 1.27324 + 0.5) - 0.5);
        float outline = 1.0 - smoothstep(0.012, 0.028, abs(r - 0.95));
        float tick = (1.0 - smoothstep(0.032, 0.057, sector))
          * smoothstep(0.77, 0.81, r) * (1.0 - smoothstep(0.92, 0.95, r));
        float diamond = 1.0 - smoothstep(0.014, 0.035, abs(abs(mark.x) + abs(mark.y) - 0.17));
        float fill = 0.06 * (1.0 - smoothstep(0.92, 0.96, r));
        float signet = max(tick, diamond);
        float open = smoothstep(0.0, 0.24, progress);
        float priority = smoothstep(0.06, 0.86, imminence);
        float alpha = max(fill, max(outline * 0.65, signet)) * open * mix(0.32, 0.94, priority);
        float highlight = max(signet, outline * priority) * mix(0.56, 1.0, priority);
        gl_FragColor = vec4(mix(ink, lightColor, highlight), alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), material);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

function cometWake(color: number, accent: number): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(.012, .53, 3.45, 10, 5, true);
  geometry.translate(0, 1.84, 0);
  const points = geometry.attributes.position;
  for (let i = 0; i < points.count; i++) {
    const height = points.getY(i);
    const x = points.getX(i);
    const z = points.getZ(i);
    const rib = 1 + .22 * Math.cos(Math.atan2(z, x) * 5 + height * 2.8);
    points.setXYZ(i, x * rib + .18 * (height / 3.6) ** 2, height, z * rib);
  }
  geometry.computeVertexNormals();
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { ink: { value: new THREE.Color(color) }, lightColor: { value: new THREE.Color(accent) } },
    vertexShader: `
      varying vec2 wakeUv;
      varying float facing;
      void main() {
        wakeUv = uv;
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        facing = dot(normalize(normalMatrix * normal), normalize(-viewPosition.xyz));
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 ink;
      uniform vec3 lightColor;
      varying vec2 wakeUv;
      varying float facing;
      void main() {
        float streak = sin(wakeUv.x * 31.416 + wakeUv.y * 5.0);
        float heat = smoothstep(0.30, 0.68, facing + streak * 0.18 - wakeUv.y * 0.40);
        float fade = 1.0 - smoothstep(0.36, 1.0, wakeUv.y);
        gl_FragColor = vec4(mix(ink, lightColor, heat), fade * (0.61 + 0.35 * heat));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  return new THREE.Mesh(geometry, material);
}

export function buildMeteorFlight(
  target: THREE.Vector3, radius: number, duration: number, color: number, accent: number,
) {
  const mesh = new THREE.Group();
  mesh.position.set(target.x, .045, target.z);
  const seal = starSeal(radius, color, accent);
  const comet = new THREE.Group();
  const stone = new THREE.Mesh(new THREE.IcosahedronGeometry(.51, 0), new THREE.MeshToonMaterial({
    color: 0x283a81, emissive: color, emissiveIntensity: .62,
  }));
  stone.scale.set(.84, 1.1, .91);
  comet.add(stone, cometWake(color, accent));
  mesh.add(seal, comet);
  const launch = new THREE.Vector3(-2.5, 11.5, -1.5);
  const contact = new THREE.Vector3(0, .43, 0);
  comet.quaternion.setFromUnitVectors(UP, launch.clone().sub(contact).normalize());

  const pose = (age: number, impactTime: number) => {
    seal.material.uniforms.progress.value = Math.min(1, age / (duration * .47));
    const descent = THREE.MathUtils.clamp(1 - (impactTime - age) / .24, 0, 1);
    seal.material.uniforms.imminence.value = descent;
    comet.visible = descent > 0;
    comet.position.lerpVectors(launch, contact, descent ** 1.65);
    stone.rotation.set(.6 + descent * 1.4, 1.2 + descent * 2.1, .38);
  };
  pose(0, duration);
  return { mesh, pose };
}

export function buildMeteorImpact(target: THREE.Vector3, radius: number, color: number, accent: number) {
  const mesh = new THREE.Group();
  mesh.position.set(target.x, .075, target.z);
  const ink = new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const light = new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const blue = new THREE.Color(color);
  const cyan = new THREE.Color(accent);
  const waveShape = new THREE.RingGeometry(.91, 1, 48, 2);
  const wavePoints = waveShape.attributes.position;
  const waveColors: number[] = [];
  for (let i = 0; i < wavePoints.count; i++) {
    const x = wavePoints.getX(i);
    const y = wavePoints.getY(i);
    const angle = Math.atan2(y, x);
    const shape = 1 + .023 * Math.sin(angle * 9) + .015 * Math.cos(angle * 17);
    wavePoints.setXY(i, x * shape, y * shape);
    const tint = Math.hypot(x, y) > .97 ? cyan : blue;
    waveColors.push(tint.r, tint.g, tint.b);
  }
  waveShape.setAttribute('color', new THREE.Float32BufferAttribute(waveColors, 3));
  const wave = new THREE.Mesh(waveShape, ink);
  wave.rotation.x = -Math.PI / 2;
  const blades: number[] = [];
  const bladeColors: number[] = [];
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6 + Math.sin(i * 4.1) * .14;
    const reach = radius * (.55 + .27 * (i % 3) / 2);
    const x = Math.cos(angle);
    const z = Math.sin(angle);
    const width = i % 2 ? .12 : .21;
    blades.push(x * .31 + z * width, .1, z * .31 - x * width,
      x * .47 - z * width, .17, z * .47 + x * width,
      x * reach, .24 + .35 * (i % 3), z * reach);
    const facet = i % 3 === 0 ? blue : cyan;
    bladeColors.push(facet.r, facet.g, facet.b, cyan.r, cyan.g, cyan.b, facet.r, facet.g, facet.b);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(blades, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(bladeColors, 3));
  const splinters = new THREE.Mesh(geometry, light);
  const flashShape = new THREE.OctahedronGeometry(.49);
  const normals = flashShape.attributes.normal;
  const flashColors: number[] = [];
  for (let i = 0; i < normals.count; i++) {
    const tint = normals.getX(i) + normals.getZ(i) * .45 > 0 ? cyan : blue;
    flashColors.push(tint.r, tint.g, tint.b);
  }
  flashShape.setAttribute('color', new THREE.Float32BufferAttribute(flashColors, 3));
  const flash = new THREE.Mesh(flashShape, light);
  flash.position.y = .57;
  mesh.add(wave, splinters, flash);

  const pose = (p: number) => {
    const reach = .17 + .83 * (1 - (1 - p) ** 3);
    wave.scale.setScalar(radius * reach);
    splinters.scale.set(reach, 1 + p, reach);
    flash.scale.set(1 - p, .6 + 3.8 * Math.sin(Math.PI * Math.min(1, p * 2.35)), 1 - p);
    flash.visible = p < .42;
    ink.opacity = .92 * (1 - p) ** 1.45;
    light.opacity = 1 - THREE.MathUtils.smoothstep(p, .14, .79);
  };
  pose(0);
  return { mesh, pose };
}
