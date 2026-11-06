import * as THREE from 'three';

function paintedStroke(points: readonly (readonly [number, number])[], material: THREE.Material): THREE.Mesh {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  return new THREE.Mesh(new THREE.ShapeGeometry(shape), material);
}

export function buildHeavensfallDescent(color: number, accent: number) {
  const mesh = new THREE.Group();
  const gold = new THREE.MeshBasicMaterial({
    color, side: THREE.DoubleSide, transparent: true, depthWrite: false,
  });
  const light = new THREE.MeshBasicMaterial({
    color: new THREE.Color(accent).lerp(new THREE.Color(0xffdfa4), .38),
    side: THREE.DoubleSide, transparent: true, depthWrite: false,
  });
  const dragon = paintedStroke([[0, -.11], [-.47, .38], [-.39, .67], [-.82, 1.19], [-.24, .99],
    [-.43, 1.71], [.02, 1.46], [.28, 2.10], [.19, 1.16], [.66, 1.52], [.41, .79], [.48, .45]], gold);
  const blaze = paintedStroke([[0, -.12], [-.24, .49], [-.13, .66], [-.40, 1.06], [0, .88],
    [.18, 1.46], [.15, .69], [.31, .49]], light);
  blaze.position.z = .025;
  const wake = paintedStroke([[-.10, .72], [-.51, 1.47], [-.84, 2.60], [-.29, 1.84],
    [.09, 1.72], [.46, 2.72], [.30, 1.43], [.54, .94]], gold);
  wake.rotation.y = Math.PI / 3;
  mesh.add(dragon, wake, blaze);
  mesh.visible = false;

  const pose = (sample?: { tip: THREE.Vector3; phase: number }) => {
    mesh.visible = Boolean(sample && sample.phase > .55);
    if (!sample || !mesh.visible) return;
    const fall = THREE.MathUtils.smoothstep(sample.phase, .55, .82);
    mesh.position.copy(sample.tip);
    mesh.scale.set(.70 + fall * .43, .45 + fall * .83, 1);
    gold.opacity = fall * .81;
    light.opacity = fall;
  };
  return { mesh, pose };
}

export function buildHeavensfallImpact(
  center: THREE.Vector3, tip: THREE.Vector3, radius: number, color: number, accent: number,
) {
  const mesh = new THREE.Group();
  mesh.position.set(center.x, .065, center.z);
  const amber = new THREE.Color(color).lerp(new THREE.Color(0xee8b15), .48);
  const light = new THREE.Color(accent).lerp(new THREE.Color(0xffd079), .22);
  const seal = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { amber: { value: amber }, lightColor: { value: light }, progress: { value: 0 } },
    vertexShader: `
      varying vec2 disc;
      void main() {
        disc = uv * 2.0 - 1.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 amber;
      uniform vec3 lightColor;
      uniform float progress;
      varying vec2 disc;
      void main() {
        float r = length(disc);
        float angle = atan(disc.y, disc.x);
        float tooth = cos(angle * 12.0 + 0.4);
        float reach = .12 + .85 * (1.0 - pow(1.0 - progress, 3.0));
        float rim = 1.0 - smoothstep(.012, .029, abs(r - reach));
        float inner = 1.0 - smoothstep(.007, .019, abs(r - reach * .78));
        float rays = smoothstep(.67, .96, tooth) * smoothstep(reach * .69, reach * .79, r)
          * (1.0 - smoothstep(reach * .97, reach, r));
        float alpha = (1.0 - smoothstep(.28, 1.0, progress)) * max(rim, max(inner * .67, rays * .76));
        gl_FragColor = vec4(mix(amber, lightColor, max(rim, rays) * .73), alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), seal);
  ground.rotation.x = -Math.PI / 2;
  mesh.add(ground);

  const pillar = new THREE.Group();
  pillar.position.set(tip.x - center.x, 0, tip.z - center.z);
  const gold = new THREE.MeshBasicMaterial({
    color: amber, side: THREE.DoubleSide, transparent: true, depthWrite: false,
  });
  const core = new THREE.MeshBasicMaterial({
    color: light, side: THREE.DoubleSide, transparent: true, depthWrite: false,
  });
  const fragments: number[] = [];
  const pillars: number[] = [];
  for (let i = 0; i < 9; i++) {
    const angle = i * Math.PI * 2 / 9;
    const x = Math.cos(angle), z = Math.sin(angle);
    const reach = radius * (.52 + .31 * (.5 + .5 * Math.sin(i * 9.3)));
    fragments.push(x * .38 - z * .31, .12, z * .38 + x * .31,
      x * .71 + z * .26, .20, z * .71 - x * .26,
      x * reach, .43 + i % 3 * .44, z * reach);
    if (i % 3 === 0) {
      pillars.push(-x * .31, .03, -z * .31, x * .38, .14, z * .38,
        x * .27, 5.6 + (i % 2) * 1.28, z * .27);
    }
  }
  const stroke = (vertices: number[], material: THREE.Material) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    return new THREE.Mesh(geometry, material);
  };
  const rays = stroke(fragments, gold);
  const column = stroke(pillars, core);
  pillar.add(rays, column);
  mesh.add(pillar);

  const pose = (p: number) => {
    seal.uniforms.progress.value = p;
    const burst = 1 - (1 - p) ** 4;
    rays.scale.set(.26 + .91 * burst, .71 + .71 * burst, .26 + .91 * burst);
    column.scale.set(1 - p * .89, .37 + .63 * burst, 1 - p * .89);
    gold.opacity = .94 * (1 - THREE.MathUtils.smoothstep(p, .13, .72));
    core.opacity = 1 - THREE.MathUtils.smoothstep(p, .18, .57);
  };
  pose(0);
  return { mesh, pose };
}
