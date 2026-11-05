import * as THREE from 'three';
import { piece, smoothLoft } from './ArtMesh';
import type { CharacterClassId } from '../types/game';

type Point = [number, number, number];
type Paint = (color: number) => THREE.Material;
const DIGITS = ['Index', 'Middle', 'Ring', 'Little', 'Thumb'] as const;
export const CASTING_JOINTS = DIGITS.flatMap(digit => [`${digit}.L`, `${digit}.Tip.L`]);
const DIGIT_SIDES = 10;

// The curve lies in a plane. Keep the cross-section oriented to that plane
// through each knuckle so the finger flattens at its pad instead of twisting.
function finger(points: Point[], axis: THREE.Vector3, width: number, depth: number): THREE.BufferGeometry {
  const path = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
  const positions: number[] = [], indices: number[] = [];
  const sides = DIGIT_SIDES, rings = 10;
  for (let ring = 0; ring <= rings; ring++) {
    const t = ring / rings;
    const center = path.getPoint(t);
    const normal = path.getTangent(t).cross(axis).normalize();
    const taper = (1 - .25 * t) * (ring === rings ? .38 : 1);
    for (let side = 0; side < sides; side++) {
      const angle = side * Math.PI * 2 / sides;
      const p = center.clone().addScaledVector(axis, Math.cos(angle) * width * taper)
        .addScaledVector(normal, Math.sin(angle) * depth * taper);
      positions.push(p.x, p.y, p.z);
      if (!ring) continue;
      const a = (ring - 1) * sides + side;
      const b = (ring - 1) * sides + (side + 1) % sides;
      indices.push(a, b, b + sides, a, b + sides, a + sides);
    }
  }
  for (let i = 1; i < sides - 1; i++) {
    const end = rings * sides;
    indices.push(0, i + 1, i, end, end + i, end + i + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function buildClosedGrip(
  art: THREE.Group, role: CharacterClassId, side: number, radius: number, paint: Paint,
): void {
  const [leather, pads, plates] = {
    warrior: [0x252c40, 0x45526b, 0xe1bd75],
    mage: [0x354774, 0x738eb1, 0xdde9f2],
    assassin: [0x282138, 0x563c58, 0x986a79],
  }[role].map(paint);
  const spread = role === 'warrior' ? .025 : role === 'mage' ? .023 : .022;
  const pad = spread * .47;
  const wrap = radius + pad * .85;
  const gripCenter = role === 'warrior' ? 0 : role === 'mage' ? .028 : .019;
  const axis = new THREE.Vector3(0, 0, 1);

  // The flattened palm connects to the wrist on the outside of the handle.
  piece(art, smoothLoft([
    [-.036, .021, spread * 1.50, -.007, -side * (wrap + .010)],
    [-.020, .027, spread * 1.92, -.006, -side * (wrap + .006)],
    [.008, .026, spread * 1.94, -.002, -side * (wrap + .004)],
    [.028, .017, spread * 1.65, .003, -side * (wrap + .003)],
  ], 12), leather, 0, 0, gripCenter);
  piece(art, smoothLoft([
    [-.025,.027,.029,0,-side*.016], [.001,.034,.032,0,-side*.016], [.030,.026,.028,0,-side*.010],
  ], 12), leather);

  for (let i = 0; i < 4; i++) {
    const z = gripCenter + (.5 - i) * spread;
    const r = wrap + [.001, .004, .002, -.001][i];
    const bend = [2.53, 2.43, 2.36, 2.30][i];
    const points: Point[] = Array.from({ length: 5 }, (_, step) => {
      const t = step / 4;
      const angle = Math.PI - .13 - t * bend;
      return [side * Math.cos(angle) * r, Math.sin(angle) * r, z + .007 * t];
    });
    const middle = points[1];
    piece(art, finger(points, axis, pad, pad * 1.09), pads);
    const cap = piece(art, new THREE.SphereGeometry(pad, 9, 5), i < 3 ? plates : pads,
      middle[0] - side * pad * .52, middle[1] + pad * .42, middle[2]);
    cap.scale.set(.60, .67, .84);
  }
  const thumb: Point[] = [
    [-side * (wrap + .007), -.020, spread * 1.01],
    [-side * wrap * .57, -.034, spread * 1.56],
    [side * wrap * .40, -.039, spread * 1.34],
    [side * wrap * .91, -.021, spread * .88],
    [side * wrap * 1.03, .006, spread * .42],
  ];
  piece(art, finger(thumb, axis, pad * 1.11, pad * 1.14), pads, 0, 0, gripCenter);
}

export function buildCastingHand(
  root: THREE.Group, art: THREE.Group, wrist: THREE.Bone, material: THREE.Material,
): THREE.SkinnedMesh {
  const bones = [wrist];
  const positions: number[] = [], normals: number[] = [], faces: number[] = [], colors: number[] = [];
  const indices: number[] = [], weights: number[] = [];
  const glove = new THREE.Color(0x455984);
  const append = (geometry: THREE.BufferGeometry, color: number, base = 0, tip = 0) => {
    const start = positions.length / 3;
    const rgb = new THREE.Color(color);
    const dye = new THREE.Color();
    const points = geometry.getAttribute('position');
    const sourceNormals = geometry.getAttribute('normal');
    for (let i = 0; i < points.count; i++) {
      positions.push(points.getX(i), points.getY(i), points.getZ(i));
      normals.push(sourceNormals.getX(i), sourceNormals.getY(i), sourceNormals.getZ(i));
      const row = Math.floor(i / DIGIT_SIDES);
      dye.copy(glove).lerp(rgb, base === 0 ? 1 : THREE.MathUtils.smoothstep(row, 1, 6));
      colors.push(dye.r, dye.g, dye.b);
      // Blend across the web and the second knuckle, keeping the soft pad round.
      if (base === 0 || row < 4) {
        const mix = base === 0 ? 0 : THREE.MathUtils.smoothstep(row, 0, 3);
        indices.push(0, base, 0, 0);
        weights.push(1 - mix, mix, 0, 0);
      } else {
        const mix = THREE.MathUtils.smoothstep(row, 4, 7);
        indices.push(base, tip, 0, 0);
        weights.push(1 - mix, mix, 0, 0);
      }
    }
    for (const index of geometry.index!.array) faces.push(index + start);
    geometry.dispose();
  };
  append(smoothLoft([
    [-.076,.030,.013,.009,.004],[-.061,.043,.019,.008,.002],[-.034,.041,.021,.005],
    [-.011,.033,.023],[.024,.031,.028,-.005],
  ], 16), 0x455984);
  for (let i = 0; i < DIGITS.length; i++) {
    const x = .030 - i * .021;
    const length = [.067,.077,.070,.056][i];
    const thumb = i === 4;
    const points: Point[] = thumb ? [
      [.026,-.022,.001],[.045,-.039,.004],[.056,-.050,.015],[.067,-.062,.021],[.070,-.074,.023],
    ] : [
      [x,-.058,.008],[x,-.072,.008],[x * 1.14,-.073-length*.36,.012],
      [x * 1.27,-.073-length*.70,.018],[x * 1.34,-.073-length,.021],
    ];
    const base = new THREE.Bone();
    base.name = CASTING_JOINTS[2 * i];
    base.position.set(...points[1]);
    wrist.add(base);
    const tip = new THREE.Bone();
    tip.name = CASTING_JOINTS[2 * i + 1];
    tip.position.set(...points[2]).sub(base.position);
    base.add(tip);
    bones.push(base, tip);
    append(finger(points, new THREE.Vector3(1, 0, 0), thumb ? .013 : .011,
      thumb ? .013 : .010), 0xb9cedf, bones.length - 2, bones.length - 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
  geometry.setIndex(faces);
  const hand = new THREE.SkinnedMesh(geometry, material);
  hand.name = 'Celestia’s casting glove';
  hand.castShadow = true;
  hand.frustumCulled = false;
  art.add(hand);
  root.updateMatrixWorld(true);
  hand.bind(new THREE.Skeleton(bones), hand.matrixWorld);
  return hand;
}
