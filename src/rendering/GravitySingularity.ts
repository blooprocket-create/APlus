import * as THREE from 'three';

function spiralBands(radius: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const coordinates: number[] = [];
  const indices: number[] = [];
  const samples = 24;
  for (let arm = 0; arm < 3; arm++) {
    const start = positions.length / 3;
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const angle = arm * Math.PI * 2 / 3 + t * 3.65;
      const distance = radius * (.14 + .86 * (1 - t) ** 1.28);
      const width = radius * Math.sin(Math.PI * t) ** .82 * (.12 - t * .065);
      for (const side of [-1, 1]) {
        const offset = side * width;
        const r = distance + offset;
        const height = .06 + .84 * t ** 2 + Math.sin(angle + .45) * .25 * t;
        positions.push(Math.sin(angle) * r, height + offset * .44, Math.cos(angle) * r);
        coordinates.push(t, (side + 1) / 2);
      }
      if (i > 0) {
        const a = start + (i - 1) * 2;
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(coordinates, 2));
  geometry.setIndex(indices);
  return geometry;
}

export function buildGravitySingularity(radius: number, color: number, accent: number) {
  const mesh = new THREE.Group();
  const ribbonMaterial = new THREE.ShaderMaterial({
    side: THREE.DoubleSide, transparent: true, depthWrite: false,
    uniforms: {
      ink: { value: new THREE.Color(0x261044) },
      bodyColor: { value: new THREE.Color(color) },
      edgeColor: { value: new THREE.Color(accent) },
      strength: { value: 0 },
      time: { value: 0 },
    },
    vertexShader: `
      varying vec2 stroke;
      void main() {
        stroke = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 ink;
      uniform vec3 bodyColor;
      uniform vec3 edgeColor;
      uniform float strength;
      uniform float time;
      varying vec2 stroke;
      void main() {
        float ridge = smoothstep(0.12, 0.22, stroke.y) * (1.0 - smoothstep(0.32, 0.50, stroke.y));
        float current = smoothstep(0.45, 0.83, fract(stroke.x * 4.5 - time * 2.6));
        float outerShade = smoothstep(0.30, 0.88, stroke.y);
        vec3 paint = mix(bodyColor, ink, outerShade);
        paint = mix(paint, edgeColor, ridge * (0.26 + current * 0.68));
        float opacity = strength * smoothstep(0.0, 0.23, stroke.x) * (1.0 - 0.57 * outerShade);
        gl_FragColor = vec4(paint, opacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const spiral = new THREE.Mesh(spiralBands(radius), ribbonMaterial);

  const coreMaterial = new THREE.ShaderMaterial({
    uniforms: {
      voidColor: { value: new THREE.Color(0x100621) },
      shadowColor: { value: new THREE.Color(color) },
      rimColor: { value: new THREE.Color(accent) },
      time: { value: 0 },
    },
    vertexShader: `
      varying vec3 viewNormal;
      varying vec3 viewDirection;
      varying vec3 localDirection;
      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        viewNormal = normalMatrix * normal;
        viewDirection = -viewPosition.xyz;
        localDirection = normal;
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 voidColor;
      uniform vec3 shadowColor;
      uniform vec3 rimColor;
      uniform float time;
      varying vec3 viewNormal;
      varying vec3 viewDirection;
      varying vec3 localDirection;
      void main() {
        float rim = 1.0 - max(0.0, dot(normalize(viewNormal), normalize(viewDirection)));
        float crease = sin(18.0 * localDirection.y + 4.0 * localDirection.x - time * 8.0);
        vec3 shade = mix(voidColor, shadowColor, smoothstep(0.4, 0.45, rim + 0.05 * crease));
        shade = mix(shade, rimColor, smoothstep(0.71, 0.76, rim + 0.085 * crease));
        gl_FragColor = vec4(shade, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const core = new THREE.Mesh(new THREE.SphereGeometry(.53, 20, 14), coreMaterial);
  core.position.y = .87;
  mesh.add(spiral, core);

  const pose = (age: number, duration: number, sincePull: number) => {
    const gather = THREE.MathUtils.smoothstep(age, 0, .18);
    const collapse = 1 - THREE.MathUtils.smoothstep(age, duration - .23, duration);
    const pulse = 1 - THREE.MathUtils.smoothstep(sincePull, 0, .23);
    coreMaterial.uniforms.time.value = age;
    ribbonMaterial.uniforms.time.value = age;
    spiral.rotation.y = -age * 3.6;
    const reach = (.42 + .58 * gather) * (.76 + .24 * collapse) * (1 - .13 * pulse);
    spiral.scale.set(reach, .4 + .6 * gather * collapse, reach);
    core.scale.setScalar((.22 + .78 * gather) * collapse * (1 + .13 * pulse));
    ribbonMaterial.uniforms.strength.value = (.82 + .18 * pulse) * gather * collapse;
  };
  pose(0, 1, .24);
  return { mesh, pose };
}
