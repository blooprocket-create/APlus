import * as THREE from 'three';

export function buildStarlightProjectile(
  nova: boolean, core: THREE.MeshBasicMaterial, wake: THREE.MeshBasicMaterial,
): THREE.Group {
  const palette = [wake.color.clone().lerp(new THREE.Color(0x241755), .53),
    wake.color.clone(), core.color.clone().lerp(new THREE.Color(0xf7ffff), .38)];
  const size = nova ? .49 : .245;
  const star = new THREE.OctahedronGeometry(size);
  star.scale(nova ? 1.04 : .71, nova ? .73 : .63, nova ? 1.32 : 1.57);
  const normal = star.attributes.normal;
  const tint = new THREE.Color();
  const facets: number[] = [];
  for (let i = 0; i < normal.count; i++) {
    const facing = normal.getX(i) * -.4 + normal.getY(i) * .76 + normal.getZ(i) * .39;
    tint.copy(palette[1]).lerp(palette[2], facing > .25 ? 1 : facing > -.26 ? .61 : .31);
    facets.push(tint.r, tint.g, tint.b);
  }
  star.setAttribute('color', new THREE.Float32BufferAttribute(facets, 3));
  core.vertexColors = true;
  core.color.setHex(0xffffff);

  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  const length = nova ? 2.28 : .91;
  const samples = 9;
  for (const [wing, angle] of (nova ? [-.25, 1.45, 2.85] : [-.20, 1.53]).entries()) {
    const start = positions.length / 3;
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const width = size * (.24 + Math.sin(t * Math.PI) * .9) * (1 - t);
      const twist = angle + (nova ? t * 1.1 : t * .52);
      const curve = (nova ? .55 : .22) * Math.sin(t * Math.PI * .92) * (wing % 2 ? -1 : 1);
      for (const [edge, offset] of [-width, -width * .37, width].entries()) {
        positions.push(Math.cos(twist) * (curve + offset),
          Math.sin(twist) * (curve + offset), .12 - t * length);
        const paint = palette[edge === 1 ? 2 : wing === 1 ? 1 : 0];
        colors.push(paint.r, paint.g, paint.b, (1 - t) ** .78 * (edge === 1 ? .98 : .71));
      }
      if (i > 0) {
        const a = start + (i - 1) * 3;
        indices.push(a, a + 3, a + 1, a + 1, a + 3, a + 4,
          a + 1, a + 4, a + 2, a + 2, a + 4, a + 5);
      }
    }
  }
  const tails = new THREE.BufferGeometry();
  tails.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  tails.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
  tails.setIndex(indices);
  wake.color.setHex(0xffffff);
  wake.vertexColors = true;
  wake.side = THREE.DoubleSide;
  wake.depthWrite = false;
  wake.blending = THREE.NormalBlending;
  const group = new THREE.Group();
  group.add(new THREE.Mesh(star, core), new THREE.Mesh(tails, wake));
  return group;
}

export function buildNovaBurst(
  position: THREE.Vector3, radius: number, color: number, accent: number,
) {
  const mesh = new THREE.Group();
  mesh.position.set(position.x, .06, position.z);
  const edge = new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const light = new THREE.MeshBasicMaterial({
    color: accent, transparent: true, depthWrite: false, side: THREE.DoubleSide, vertexColors: true,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(.927, 1, 40), edge);
  ring.rotation.x = -Math.PI / 2;
  const rays: number[] = [], raysColor: number[] = [];
  const blue = new THREE.Color(0xb6abff), white = new THREE.Color(0xffffff), purple = new THREE.Color(0x8b45d7);
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6 + .09;
    const x = Math.sin(angle), z = Math.cos(angle);
    const width = i % 3 === 0 ? .27 : .13;
    const reach = radius * (i % 3 === 0 ? 1 : i % 2 ? .55 : .78);
    rays.push(x * .16 + z * width, .10, z * .16 - x * width,
      x * .45 - z * width, .21, z * .45 + x * width,
      x * reach, i % 3 === 0 ? .52 : .24, z * reach);
    for (const tint of [purple, white, blue]) raysColor.push(tint.r, tint.g, tint.b);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(rays, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(raysColor, 3));
  const flare = new THREE.Mesh(geometry, light);
  mesh.add(ring, flare);
  const pose = (p: number) => {
    const spread = .15 + .85 * (1 - (1 - p) ** 3);
    ring.scale.setScalar(radius * spread);
    flare.scale.set(spread, .62 + Math.sin(p * Math.PI) * 1.15, spread);
    edge.opacity = .88 * (1 - p) ** 1.45;
    light.opacity = 1 - THREE.MathUtils.smoothstep(p, .10, .89);
  };
  pose(0);
  return { mesh, pose };
}
