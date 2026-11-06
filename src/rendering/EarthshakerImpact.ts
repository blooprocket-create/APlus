import * as THREE from 'three';

function risingShard(stone: THREE.Color, amber: THREE.Color, hot: THREE.Color): THREE.BufferGeometry {
  const sides = 6;
  const profiles = [[.37, 0, 0], [.33, .31, -.05], [.19, .69, .068]];
  const rings = profiles.map(([radius, height, lean], tier) => Array.from({ length: sides }, (_, side) => {
    const angle = side * Math.PI / 3 + tier * .13;
    const edge = radius * (1 + Math.sin(side * 4.17 + tier * 5.2) * .32);
    return new THREE.Vector3(Math.cos(angle) * edge + lean,
      height + (tier ? .15 * Math.sin(side * 5.4 + tier) : 0), Math.sin(angle) * edge);
  }));
  const peak = new THREE.Vector3(.19, 1.12, -.095);
  const positions: number[] = [], colors: number[] = [];
  const face = new THREE.Color(), vein = amber.clone().lerp(hot, .64);
  const triangle = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, color: THREE.Color) => {
    for (const p of [a, b, c]) {
      positions.push(p.x, p.y, p.z);
      colors.push(color.r, color.g, color.b);
    }
  };
  for (let side = 0; side < sides; side++) {
    const next = (side + 1) % sides;
    const shade = .16 + (1 + Math.sin(side * .97 + .3)) * .19;
    for (let level = 0; level < 2; level++) {
      const [a, b, c, d] = [rings[level][side], rings[level][next], rings[level + 1][next], rings[level + 1][side]];
      triangle(a, d, c, face.copy(stone).lerp(amber, shade + level * .06));
      triangle(a, c, b, face.copy(stone).lerp(amber, shade * .72 + level * .11));
      if (side % 2 === level) {
        const normal = d.clone().sub(a).cross(c.clone().sub(a)).normalize().multiplyScalar(.006);
        const base = a.clone().lerp(d, .19).lerp(c, .18).add(normal);
        const edge = a.clone().lerp(d, .29).lerp(c, .30).add(normal);
        triangle(base, d.clone().lerp(c, .72).add(normal), edge, vein);
      }
    }
    triangle(rings[2][side], peak, rings[2][next], face.copy(stone).lerp(amber, shade + .28));
  }
  const mesh = new THREE.BufferGeometry();
  mesh.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  mesh.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return mesh;
}

export function buildEarthshakerImpact(
  center: THREE.Vector3, contact: THREE.Vector3, radius: number, color: number, accent: number,
) {
  const mesh = new THREE.Group();
  mesh.position.set(center.x, .055, center.z);
  const hot = new THREE.Color(accent);
  const amber = new THREE.Color(color);
  const stone = new THREE.Color(0x473330);
  const ringMaterial = new THREE.MeshBasicMaterial({ color: accent, transparent: true, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(.959, 1, 48), ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = .009;
  mesh.add(ring);

  const cracks: number[] = [], pigments: number[] = [];
  const crackMaterial = new THREE.MeshBasicMaterial({
    vertexColors: true, side: THREE.DoubleSide, transparent: true, depthWrite: false,
  });
  const fissures = new THREE.BufferGeometry();
  const fault = (x: number, z: number, endX: number, endZ: number, width: number) => {
    const angle = Math.atan2(endZ - z, endX - x);
    const sideX = -Math.sin(angle) * width, sideZ = Math.cos(angle) * width;
    cracks.push(x + sideX, 0, z + sideZ, x, 0, z, endX, 0, endZ,
      x, 0, z, x - sideX, 0, z - sideZ, endX, 0, endZ);
    for (const tint of [stone, hot, amber, hot, stone, amber]) pigments.push(tint.r, tint.g, tint.b);
  };
  const dx = contact.x - center.x, dz = contact.z - center.z;
  const spikes: Array<{ x: number; z: number; height: number; yaw: number }> = [];
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4 + Math.sin(i * 5.19) * .18;
    const x = Math.cos(angle), z = Math.sin(angle);
    const length = radius * (.66 + .19 * Math.sin(i * 6.7 + 1));
    const splitX = x * length * .38 - z * .18;
    const splitZ = z * length * .38 + x * .18;
    fault(0, 0, splitX, splitZ, .115);
    fault(splitX, splitZ, x * length, z * length, .078);
    fault(splitX, splitZ, x * length * .71 + z * .43, z * length * .71 - x * .43, .051);
    spikes.push({ x: dx + x * length * .74, z: dz + z * length * .74,
      height: .58 + .71 * (.5 + .5 * Math.sin(i * 4.1)), yaw: angle + i * .23 });
  }
  fissures.setAttribute('position', new THREE.Float32BufferAttribute(cracks, 3));
  fissures.setAttribute('color', new THREE.Float32BufferAttribute(pigments, 3));
  const fracture = new THREE.Mesh(fissures, crackMaterial);
  fracture.position.set(dx, .018, dz);
  mesh.add(fracture);

  const pillarMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false });
  const pillars = new THREE.InstancedMesh(risingShard(stone, amber, hot), pillarMaterial, spikes.length);
  pillars.frustumCulled = false;
  mesh.add(pillars);
  const transform = new THREE.Object3D();
  const pose = (p: number) => {
    ring.scale.setScalar(radius * (.19 + .81 * (1 - (1 - p) ** 3)));
    ringMaterial.opacity = .84 * (1 - p) ** 1.6;
    fracture.scale.set(.31 + .69 * (1 - (1 - p) ** 3), 1, .31 + .69 * (1 - (1 - p) ** 3));
    crackMaterial.opacity = .92 * (1 - THREE.MathUtils.smoothstep(p, .26, .93));
    pillarMaterial.opacity = 1 - THREE.MathUtils.smoothstep(p, .61, 1);
    for (const [i, spike] of spikes.entries()) {
      const launch = (i % 3) * .035 + .07;
      const rise = THREE.MathUtils.smoothstep(p, launch, launch + .15);
      const fall = 1 - THREE.MathUtils.smoothstep(p, .42, .96);
      transform.position.set(spike.x, -.04, spike.z);
      transform.rotation.set(.23 * Math.sin(i * 3.7), spike.yaw, .19 * Math.cos(i * 1.8));
      transform.scale.set(.54 + .35 * rise, Math.max(.001, spike.height * rise * fall), .81);
      transform.updateMatrix();
      pillars.setMatrixAt(i, transform.matrix);
    }
    pillars.instanceMatrix.needsUpdate = true;
  };
  pose(0);
  return { mesh, pose };
}
