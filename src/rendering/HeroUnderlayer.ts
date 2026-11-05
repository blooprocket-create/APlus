import * as THREE from 'three';
import { loft, type Section } from './ArtMesh';
import type { CharacterClassId } from '../types/game';

export interface HeroLimb {
  upper: THREE.Bone;
  lower: THREE.Bone;
  fold: THREE.Bone;
  foot?: THREE.Bone;
}

// Closed rings run the entire sleeve and trouser leg. Narrow rings around the
// hinges give the cloth room to fold while the hard costume rides above it.
const SLEEVE: Section[] = [
  [-.584,.041,.045],[-.543,.056,.059],[-.480,.065,.065],[-.408,.072,.071],
  [-.347,.063,.066],[-.316,.062,.067],[-.292,.067,.072],[-.265,.068,.070],
  [-.230,.071,.068],[-.148,.079,.073],[-.075,.080,.079],[-.015,.076,.077],
  [.018,.065,.067],[.043,.045,.050],
];
const TROUSER: Section[] = [
  [-.747,.052,.055],[-.716,.054,.056],[-.640,.054,.056],[-.530,.060,.061],
  [-.437,.058,.058],[-.400,.061,.065],[-.370,.067,.068],[-.338,.066,.068],
  [-.304,.072,.072],[-.227,.079,.081],[-.142,.086,.088],[-.049,.094,.092],
  [.025,.098,.092],[.058,.085,.082],
];

const fabric = {
  warrior: [0x3e506c, 0x26354d],
  mage: [0x39496c, 0x242e50],
  assassin: [0x43354e, 0x292337],
};

export function createHeroUnderlayer(
  root: THREE.Group,
  art: THREE.Group,
  hips: THREE.Bone,
  limbs: readonly HeroLimb[],
  role: CharacterClassId,
  material: THREE.Material,
): THREE.SkinnedMesh {
  const bones = [hips, ...limbs.flatMap(({upper, lower, fold, foot}) => foot
    ? [upper, fold, lower, foot] : [upper, fold, lower])];
  const positions: number[] = [], normals: number[] = [], colors: number[] = [], faces: number[] = [];
  const indices: number[] = [], weights: number[] = [];
  const vertex = new THREE.Vector3();
  const lit = new THREE.Color(fabric[role][0]);
  const shadow = new THREE.Color(fabric[role][1]);
  const color = new THREE.Color();

  for (const { upper, lower, fold, foot } of limbs) {
    const tube = loft(foot ? TROUSER : SLEEVE, 14);
    const points = tube.getAttribute('position');
    const sourceNormals = tube.getAttribute('normal');
    const upperIndex = bones.indexOf(upper);
    const foldIndex = bones.indexOf(fold);
    const lowerIndex = bones.indexOf(lower);
    const footIndex = foot ? bones.indexOf(foot) : lowerIndex;
    const pivot = -lower.position.y;
    const first = positions.length / 3;
    for (let i = 0; i < points.count; i++) {
      vertex.fromBufferAttribute(points, i);
      const travel = -vertex.y;
      const foldWidth = foot ? .094 : .082;
      let a = lowerIndex, b = lowerIndex, w = 0;
      if (travel < .105) {
        // Hold the cuff of the sleeve inside the torso as the shoulder lifts.
        a = 0;
        b = upperIndex;
        w = THREE.MathUtils.smoothstep(travel, -.035, .105);
      } else if (travel < pivot) {
        a = upperIndex;
        b = foldIndex;
        w = THREE.MathUtils.smoothstep(travel, pivot - foldWidth, pivot);
      } else if (travel < pivot + foldWidth) {
        a = foldIndex;
        b = lowerIndex;
        w = THREE.MathUtils.smoothstep(travel, pivot, pivot + foldWidth);
      } else if (foot && travel > .675) {
        b = footIndex;
        w = THREE.MathUtils.smoothstep(travel, .675, .757);
      }
      const seam = THREE.MathUtils.smoothstep(Math.abs(vertex.x), .024, .092);
      color.copy(lit).lerp(shadow, seam * .42 + (vertex.z < 0 ? .14 : 0));
      colors.push(color.r, color.g, color.b);
      vertex.add(upper.position);
      positions.push(vertex.x, vertex.y, vertex.z);
      normals.push(sourceNormals.getX(i), sourceNormals.getY(i), sourceNormals.getZ(i));
      indices.push(a, b, 0, 0);
      weights.push(1 - w, w, 0, 0);
    }
    for (const index of tube.index!.array) faces.push(first + index);
    tube.dispose();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
  geometry.setIndex(faces);
  const mesh = new THREE.SkinnedMesh(geometry, material);
  mesh.name = 'Weighted sleeves and trousers';
  mesh.castShadow = true;
  mesh.frustumCulled = false;
  art.add(mesh);
  root.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones), mesh.matrixWorld);
  return mesh;
}
