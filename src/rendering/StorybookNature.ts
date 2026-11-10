import * as THREE from 'three';
import { loft, piece, smoothLoft } from './ArtMesh';

type Paint = (color: number) => THREE.Material;
const point = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Shared authored tree grammar for Hearthmere and instanced open-world trees.
 * Exposed roots, tapering forked boughs and broken, upright crowns replace the
 * old flattened foliage discs. No changes to character models or materials.
 */
export function buildStorybookTree(
  parent: THREE.Group,
  paint: Paint,
  variation = 0,
): THREE.Mesh {
  const bark = paint(0x67503d),
    warmBark = paint(0x8c6c48);
  const trunk = piece(
    parent,
    smoothLoft(
      [
        [0, 0.37, 0.32],
        [0.16, 0.29, 0.25],
        [0.65, 0.2, 0.19, 0.02],
        [1.5, 0.17, 0.16, 0.09, -0.07],
        [2.25, 0.12, 0.13, 0.17, 0.04],
        [3.1, 0.075, 0.08, 0.32, 0.13],
        [4.0, 0.02, 0.025, 0.45, 0.18],
      ],
      10,
    ),
    bark,
  );
  trunk.name = 'Root-flared tree trunk';
  trunk.castShadow = trunk.receiveShadow = true;
  const branch = (from: THREE.Vector3, to: THREE.Vector3, radius: number) => {
    const length = from.distanceTo(to);
    const mesh = piece(
      parent,
      loft(
        [
          [0, radius, radius * 0.9],
          [length * 0.45, radius * 0.66, radius * 0.63, 0.025],
          [length, radius * 0.18, radius * 0.2],
        ],
        7,
      ),
      bark,
    );
    mesh.position.copy(from);
    mesh.quaternion.setFromUnitVectors(
      point(0, 1, 0),
      to.clone().sub(from).normalize(),
    );
    mesh.castShadow = mesh.receiveShadow = true;
  };
  for (let i = 0; i < 5; i++) {
    const a = i * 1.256 + 0.25;
    branch(
      point(0.03, 0.48, 0),
      point(Math.cos(a) * 0.72, 0.015, Math.sin(a) * 0.63),
      0.12,
    );
  }
  const palettes = [
    [0x345443, 0x668453, 0xa3b66c],
    [0x3d5949, 0x738b56, 0xb1bc78],
    [0x36554b, 0x648a69, 0x9fb77f],
  ];
  const shades = palettes[
    Math.abs(Math.floor(variation)) % palettes.length
  ].map((c) => new THREE.Color(c));
  const leaf = paint(0xffffff);
  const tuft = (
    x: number,
    y: number,
    z: number,
    size: number,
    phase: number,
  ) => {
    const geometry = new THREE.SphereGeometry(1, 10, 7);
    const vertices = geometry.getAttribute('position');
    const colors = new Float32Array(vertices.count * 3),
      tint = new THREE.Color();
    for (let i = 0; i < vertices.count; i++) {
      const px = vertices.getX(i),
        py = vertices.getY(i),
        pz = vertices.getZ(i);
      const angle = Math.atan2(pz, px);
      const lobe =
        1 +
        0.12 * Math.sin(angle * 5 + py * 3 + phase) +
        0.065 * Math.sin(angle * 9 - py * 5);
      vertices.setXYZ(
        i,
        px * lobe,
        py * (1 + 0.075 * Math.sin(angle * 4 + phase)),
        pz * lobe,
      );
      const light =
        py * 0.6 -
        px * 0.24 -
        pz * 0.16 +
        0.13 * Math.sin(px * 9 + pz * 7 + phase);
      tint
        .copy(shades[0])
        .lerp(shades[1], THREE.MathUtils.smoothstep(light, -0.65, 0.12))
        .lerp(shades[2], THREE.MathUtils.smoothstep(light, 0.1, 0.72) * 0.8)
        .toArray(colors, i * 3);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    const mesh = piece(parent, geometry, leaf, x, y, z);
    mesh.scale.set(size, size * (0.82 + 0.12 * Math.sin(phase)), size * 0.91);
    mesh.rotation.y = phase;
    mesh.castShadow = mesh.receiveShadow = true;
  };
  for (let i = 0; i < 7; i++) {
    const angle = i * 2.39996 + variation * 0.37;
    const reach = i < 4 ? 1.15 : 0.73;
    const x = Math.cos(angle) * reach + 0.16,
      z = Math.sin(angle) * reach;
    const y = 2.85 + i * 0.2 + 0.12 * Math.sin(i * 3.1 + variation);
    const fork = point(x * 0.58, y - 0.55, z * 0.58),
      end = point(x, y + 0.12, z);
    branch(point(0.09, 1.55 + i * 0.13, -0.03), fork, 0.115 - i * 0.008);
    branch(fork, end, 0.068);
    branch(
      fork,
      point(
        x + 0.4 * Math.cos(angle + 1),
        y + 0.13,
        z + 0.4 * Math.sin(angle + 1),
      ),
      0.045,
    );
    tuft(x, y + 0.3, z, 0.72 + (i % 3) * 0.095, angle);
    tuft(
      x + 0.45 * Math.cos(angle),
      y + 0.52,
      z + 0.45 * Math.sin(angle),
      0.48,
      angle + 1.4,
    );
    if (i % 2 === 0)
      tuft(
        x - 0.3 * Math.sin(angle),
        y + 0.02,
        z + 0.3 * Math.cos(angle),
        0.44,
        angle + 0.7,
      );
  }
  tuft(0.37, 4.38, 0.12, 0.8, variation + 0.3);
  for (let i = 0; i < 5; i++) {
    const a = i * 1.25;
    const scar = piece(
      parent,
      loft(
        [
          [0, 0.012, 0.01],
          [0.42, 0.018, 0.014],
          [0.95, 0.006, 0.008],
        ],
        4,
      ),
      warmBark,
      Math.cos(a) * 0.16,
      0.35,
      Math.sin(a) * 0.16,
    );
    scar.rotation.z = 0.04 * Math.sin(i);
    scar.castShadow = scar.receiveShadow = true;
  }
  return trunk;
}

/** Stave seams, an inset plank lid, raised iron hoops and a bung make a barrel
 * readable at gameplay distance without texture downloads or extra draw calls
 * after the existing scenery batching pass.
 */
export function buildStorybookBarrel(
  parent: THREE.Group,
  paint: Paint,
  x: number,
  z: number,
): void {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  parent.add(group);
  const wood = [paint(0x805943), paint(0x936b4b), paint(0x6d4b38)];
  const iron = paint(0x4b5251),
    endGrain = paint(0xa58157);
  for (let i = 0; i < 12; i++) {
    const geometry = new THREE.CylinderGeometry(
      0.222,
      0.222,
      0.65,
      1,
      4,
      false,
      (i * Math.PI) / 6 + 0.018,
      Math.PI / 6 - 0.036,
    );
    const positions = geometry.getAttribute('position');
    for (let v = 0; v < positions.count; v++) {
      const y = positions.getY(v),
        bulge = 1 + 0.2 * Math.sin((y / 0.65 + 0.5) * Math.PI);
      positions.setX(v, positions.getX(v) * bulge);
      positions.setZ(v, positions.getZ(v) * bulge);
    }
    geometry.computeVertexNormals();
    const stave = piece(group, geometry, wood[i % 3], 0, 0.335, 0);
    stave.castShadow = stave.receiveShadow = true;
  }
  for (const y of [0.135, 0.52]) {
    const hoop = piece(
      group,
      new THREE.TorusGeometry(0.254, 0.022, 4, 24),
      iron,
      0,
      y,
      0,
    );
    hoop.rotation.x = Math.PI / 2;
    hoop.castShadow = true;
  }
  for (let i = -2; i <= 2; i++) {
    const offset = i * 0.074,
      length = 2 * Math.sqrt(0.207 ** 2 - offset ** 2);
    const plank = piece(
      group,
      new THREE.BoxGeometry(length, 0.018, 0.068),
      i % 2 ? wood[1] : endGrain,
      0,
      0.665,
      offset,
    );
    plank.receiveShadow = true;
  }
  piece(
    group,
    new THREE.CylinderGeometry(0.026, 0.026, 0.018, 8),
    wood[2],
    0.095,
    0.68,
    0,
  );
}

/** Evergreen sprays grow along visible whorled boughs rather than cone tiers. */
export function buildStorybookPine(parent: THREE.Group, paint: Paint): void {
  const bark = paint(0x675444);
  const greens = [paint(0x36574d), paint(0x4f725b), paint(0x81965f)];
  const trunk = piece(
    parent,
    smoothLoft(
      [
        [0, 0.35, 0.3],
        [0.25, 0.27, 0.24],
        [2, 0.17, 0.16],
        [4, 0.11, 0.1, 0.05],
        [6, 0.06, 0.05, 0.12],
        [7.4, 0.01, 0.01, 0.17],
      ],
      9,
    ),
    bark,
  );
  trunk.castShadow = trunk.receiveShadow = true;
  // Wide overlapping boughs form a coherent tapered crown; ragged frond
  // edges and a raised midrib give each spray depth without needle geometry.
  for (let level = 0; level < 6; level++)
    for (let arm = 0; arm < 6; arm++) {
      const angle = (arm * Math.PI) / 3 + level * 1.83;
      const reach = 2.05 - level * 0.28,
        y = 1.65 + level * 0.96;
      const end = point(
        Math.cos(angle) * reach,
        y + 0.12,
        Math.sin(angle) * reach,
      );
      const start = point(0, y + 0.48, 0),
        length = start.distanceTo(end);
      const branch = piece(
        parent,
        new THREE.CylinderGeometry(0.025, 0.08, length, 6),
        bark,
      );
      branch.position.copy(start).lerp(end, 0.5);
      branch.quaternion.setFromUnitVectors(
        point(0, 1, 0),
        end.clone().sub(start).normalize(),
      );
      branch.castShadow = true;
      for (let spray = 0; spray < 3; spray++) {
        const positions = [0, 0.32, 0],
          indices: number[] = [];
        const sides = 24;
        for (let i = 0; i < sides; i++) {
          const a = (i / sides) * Math.PI * 2,
            tooth = i % 2 ? 0.78 : 1;
          positions.push(
            Math.sin(a) * 0.7 * tooth,
            -0.13 + 0.12 * Math.cos(a),
            Math.cos(a) * tooth,
          );
          indices.push(0, i + 1, ((i + 1) % sides) + 1);
        }
        // A matching underside gives the bough volume from cinematic low angles.
        const lower = positions.length / 3;
        positions.push(0, -0.32, 0);
        for (let i = 0; i < sides; i++)
          indices.push(lower, ((i + 1) % sides) + 1, i + 1);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(positions, 3),
        );
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        const f = 0.32 + spray * 0.33;
        const needles = piece(
          parent,
          geometry,
          greens[(level + arm + spray) % 3],
          end.x * f,
          y + 0.26 + spray * 0.08,
          end.z * f,
        );
        needles.scale.set(0.78 - level * 0.055, 1, 1.0 - level * 0.065);
        needles.rotation.set(
          0.07 * Math.cos(angle),
          Math.PI / 2 - angle,
          0.09 * Math.sin(angle),
        );
        needles.castShadow = needles.receiveShadow = true;
      }
    }
  const leader = piece(
    parent,
    smoothLoft(
      [
        [6.1, 0.5, 0.43],
        [6.5, 0.36, 0.32],
        [7.5, 0.01, 0.01, 0.17],
      ],
      9,
    ),
    greens[1],
  );
  leader.castShadow = leader.receiveShadow = true;
}

export function buildStorybookWell(
  parent: THREE.Group,
  paint: Paint,
  x: number,
  z: number,
): THREE.Mesh {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  parent.add(group);
  const stone = [paint(0x7b8981), paint(0x9c9f8e), paint(0xb0ad98)];
  const shape = new THREE.Shape();
  shape.absarc(0, 0, 0.84, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, 0.61, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.76,
    bevelEnabled: false,
    curveSegments: 16,
  });
  geometry.rotateX(-Math.PI / 2);
  const wall = piece(group, geometry, stone[0]);
  wall.castShadow = wall.receiveShadow = true;
  for (let row = 0; row < 3; row++)
    for (let block = 0; block < 12; block++) {
      const angle = (block * Math.PI) / 6 + ((row % 2) * Math.PI) / 12;
      const brick = piece(
        group,
        new THREE.CylinderGeometry(
          row === 2 ? 0.88 : 0.855,
          row === 2 ? 0.88 : 0.855,
          row === 2 ? 0.13 : 0.24,
          2,
          1,
          false,
          angle + 0.018,
          Math.PI / 6 - 0.036,
        ),
        stone[(row + block) % 3],
        0,
        row === 2 ? 0.785 : 0.14 + row * 0.255,
        0,
      );
      // Keep the opening truly hollow: radial cap sections have an inner wall.
      const p = brick.geometry.getAttribute('position');
      for (let i = 0; i < p.count; i++) {
        const r = Math.hypot(p.getX(i), p.getZ(i));
        if (r < 0.01)
          p.setXYZ(
            i,
            Math.sin(angle + Math.PI / 12) * 0.61,
            p.getY(i),
            Math.cos(angle + Math.PI / 12) * 0.61,
          );
      }
      brick.geometry.computeVertexNormals();
      brick.castShadow = brick.receiveShadow = true;
    }
  const water = piece(
    group,
    new THREE.CircleGeometry(0.6, 24),
    paint(0x294c50),
    0,
    0.22,
    0,
  );
  water.rotation.x = -Math.PI / 2;
  const wood = paint(0x614938),
    rope = paint(0xc1a777),
    metal = paint(0x4b5251);
  for (const side of [-1, 1]) {
    const post = piece(
      group,
      new THREE.BoxGeometry(0.14, 2.1, 0.17),
      wood,
      side * 0.78,
      1.05,
      0,
    );
    post.castShadow = true;
    piece(
      group,
      new THREE.BoxGeometry(0.22, 0.13, 0.24),
      wood,
      side * 0.78,
      0.93,
      0,
    );
  }
  const axle = piece(
    group,
    new THREE.CylinderGeometry(0.075, 0.075, 1.85, 10),
    wood,
    0,
    1.82,
    0,
  );
  axle.rotation.z = Math.PI / 2;
  axle.castShadow = true;
  for (let i = 0; i < 8; i++) {
    const coil = piece(
      group,
      new THREE.TorusGeometry(0.098, 0.013, 4, 12),
      rope,
      (i - 3.5) * 0.029,
      1.82,
      0,
    );
    coil.rotation.y = Math.PI / 2;
  }
  piece(
    group,
    new THREE.CylinderGeometry(0.012, 0.012, 1.08, 5),
    rope,
    0,
    1.22,
    0.1,
  );
  const bucket = piece(
    group,
    new THREE.CylinderGeometry(0.13, 0.1, 0.21, 10, 1, true),
    wood,
    0,
    0.64,
    0.1,
  );
  bucket.castShadow = true;
  const handle = piece(
    group,
    new THREE.TorusGeometry(0.12, 0.012, 4, 12, Math.PI),
    metal,
    0,
    0.76,
    0.1,
  );
  handle.castShadow = true;
  return wall;
}
