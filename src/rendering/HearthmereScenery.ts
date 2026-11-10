import * as THREE from 'three';
import { bakePieces, beam, loft, panel, piece, smoothLoft } from './ArtMesh';
import { buildRefugeBridge, buildRefugeFire, buildRefugeGrove, buildRefugeLodge } from './HearthmereRefuge';
import { addPaintedMeadow, type MeadowPlant } from './PaintedMeadow';
import { buildStorybookBarrel, buildStorybookTree } from './StorybookNature';
import { GroundMeshCollider } from '../game/GroundMeshCollider';
import { addPaintedSky, paintedPalette, addSceneryCutaway, PAINTED_WATER_PALETTE } from './PaintedWorldStyle';
import { RIVER_CENTER_X, RIVER_WAKES, RIVER_WIDTH, SceneryMotion } from './SceneryMotion';

export interface TownBuilding { x: number; z: number; w: number; d: number; refuge?: true }
const vector = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function noise(n: number): number {
  const value = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

const LANES = [
  [41, 4.3, -8, 5], [26, 5.3, -7, -5.5], [4.8, 12, -16, 0],
  [5.3, 13, 4, -1], [17, 4.1, 29, 6.5], [8.8, 4.2, -23, 1.5],
] as const;

function roadWear(x: number, z: number): number {
  let wear = 0;
  for (const [lane, [width, depth, centerX, centerZ]] of LANES.entries()) {
    const eastWest = width >= depth;
    const along = eastWest ? x - centerX : z - centerZ;
    const across = eastWest ? z - centerZ : x - centerX;
    const extent = (eastWest ? width : depth) / 2;
    const shoulder = (eastWest ? depth : width) / 2;
    if (Math.abs(along) > extent + .9 || Math.abs(across) > shoulder + 1.2) continue;
    const wander = .24 * Math.sin(along * .62 + lane * 1.4) + .19 * Math.sin(along * 1.28 + lane);
    const edge = shoulder + .28 * Math.sin(along * .91 - lane * 2);
    const crossfade = 1 - THREE.MathUtils.smoothstep(Math.abs(across + wander), edge - .64, edge + .67);
    const end = lane === 4 ? 1.9 : .48;
    const endfade = 1 - THREE.MathUtils.smoothstep(Math.abs(along), extent - end, extent + .86);
    wear = Math.max(wear, crossfade * endfade);
  }
  return wear;
}

function paintTownGround(
  town: THREE.Group, centerX: number, width: number, grass: THREE.Color,
  outskirts: THREE.Color, outerGrass: THREE.Color, path: THREE.MeshLambertMaterial,
): void {
  const outerSide = Math.sign(centerX);
  const geometry = new THREE.PlaneGeometry(width + 2, 34.6, Math.ceil((width + 2) / .52), 66);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(outerSide, 0, 0);
  const points = geometry.attributes.position;
  const colors = new Float32Array(points.count * 3);
  const cool = new THREE.Color(0x618a75);
  const meadow = new THREE.Color(0xa5ab70);
  const wornClay = new THREE.Color(0xaa8b6d);
  const dirt = new THREE.Color();
  const tint = new THREE.Color();
  for (let i = 0; i < points.count; i++) {
    const x = points.getX(i) + centerX;
    const z = points.getZ(i) - 1;
    const shoulder = THREE.MathUtils.smoothstep(Math.abs(z + 1), 15.5, 17.3);
    const side = THREE.MathUtils.smoothstep(outerSide * (x - centerX), width / 2, width / 2 + 2);
    const wash = Math.sin(x * .28 + z * .44) + Math.sin(z * .68 - x * .21) * .64
      + Math.sin(x * 1.33 + z * .91) * .26;
    const wet = 1 - THREE.MathUtils.smoothstep(Math.min(Math.abs(x - 12), Math.abs(x - 20)), .25, 4);
    tint.copy(grass).lerp(cool, wet * .51 + (1 - THREE.MathUtils.smoothstep(wash, -1, -.15)) * .38);
    tint.lerp(meadow, THREE.MathUtils.smoothstep(wash, -.05, 1.5) * .57);
    const wear = roadWear(x, z);
    dirt.copy(path.color).lerp(wornClay, .20 + .20 * Math.sin(x * .42 + z * .31));
    tint.lerp(dirt, wear).lerp(outskirts, shoulder).lerp(outerGrass, side).toArray(colors, i * 3);
    points.setY(i, THREE.MathUtils.lerp(-.107 * shoulder, -.206, side));
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  piece(town, geometry, path, centerX, -.012, -1).receiveShadow = true;
}

function buildCoverWall(
  town: THREE.Group, stones: THREE.Material[], x: number, z: number, length: number, height: number, blockers: THREE.Mesh[],
): void {
  for (let row = 0; row < 3; row++) {
    const count = row === 1 ? 5 : 6;
    const course = length / count;
    let left = -length / 2;
    for (let i = 0; i < count; i++) {
      const seed = x * 31 + row * 17 + i * 3;
      const end = i === count - 1 ? length / 2
        : (i + 1) * course - length / 2 + (noise(seed) - .5) * .21;
      const w = end - left - .027;
      const h = (row === 2 ? .25 : .36) * height;
      const cut = .035 + noise(seed + 16) * .043;
      const block = piece(town, panel([[cut, 0], [w - cut, 0], [w, cut], [w, h - cut],
        [w - cut, h], [cut, h - .012], [0, h - cut], [0, cut]], .39 + noise(seed + 27) * .075),
      stones[(row * 3 + i + 1) % stones.length], x + left + .014, height * row * .34, z - .21);
      block.rotation.y = (noise(seed + 35) - .5) * .105;
      block.castShadow = block.receiveShadow = true;
      blockers.push(block);
      left = end;
    }
  }
}

export function buildHearthmereScenery(parent: THREE.Group, buildings: readonly TownBuilding[]) {
  addPaintedSky(parent);
  const town = new THREE.Group();
  parent.add(town);
  const blockers: THREE.Mesh[] = [];
  const time = { value: 0 };
  const motion = new SceneryMotion();
  const focus = { value: new THREE.Vector4(0, 0, 0, 0) };
  const viewCenter = new THREE.Vector3();
  const rim = new THREE.DirectionalLight(0xffc79b, 0.58);
  rim.position.set(-14, 16, -22);
  parent.add(rim);
  const surface = (color: number) => new THREE.MeshLambertMaterial({ color });
  const grass = [surface(0x7b965c), surface(0x6b8b68), surface(0xa6a269)];
  const earth = surface(0x6c554f);
  const path = surface(0xb4a184);
  const stones = [surface(0xa6a294), surface(0x898e88), surface(0x9c9f95), surface(0xb2ac9e)];
  const masonry = surface(0x82786c);
  const plaster = [surface(0xd7bf97), surface(0xbda887), surface(0xc2ad8d)];
  const timber = surface(0x554236);
  const plank = surface(0x805943);
  const iron = surface(0x4b5251);
  const straw = surface(0xa78453);
  const roofs = [
    [surface(0x6f5240), surface(0x896953)],
    [surface(0x76514a), surface(0x995e50)],
    [surface(0x525b60), surface(0x647271)],
    [surface(0x824d42), surface(0xa76c56)],
  ];
  const dark = surface(0x3f4137);
  const warm = new THREE.MeshBasicMaterial({ color: 0xe5ad65 });
  const cube = (mat: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number, shadow = false, group = town) => {
    const mesh = piece(group, new THREE.BoxGeometry(w, h, d), mat, x, y, z);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    return mesh;
  };
  cube(earth, 44, 1.8, 31, -10, -0.92, -1);
  cube(earth, 18, 1.8, 31, 29, -0.92, -1);
  paintTownGround(town, -10, 44, grass[0].color, grass[1].color, grass[1].color, path);
  paintTownGround(town, 29, 18, grass[1].color, grass[0].color, grass[1].color, path);
  cube(grass[1], 30, 1.6, 60, -45, -1.02, -1);
  cube(grass[1], 24, 1.6, 60, 50, -1.02, -1);
  for (const z of [-24, 22]) {
    cube(grass[1], 44, 1.2, 17, -10, -0.72, z);
    cube(grass[0], 18, 1.2, 17, 29, -0.72, z);
  }

  const placedStones: Array<{ x: number; z: number }> = [];
  for (const [lane, [w, d, x, z]] of LANES.entries()) {
    for (let i = 0; i < Math.ceil(w / 1.25); i++) {
      for (let j = 0; j < Math.ceil(d / 1.08); j++) {
        const key = x * 13 + i * 3 + j * 11;
        const px = x - w / 2 + .53 + i * 1.25 + (j % 2) * .31 + (noise(key + 8) - .5) * .48;
        const pz = z - d / 2 + .42 + j * 1.08 + (noise(key + 51) - .5) * .51;
        const coverage = roadWear(px, pz);
        const exposed = .66 + .22 * Math.sin(px * .68 - pz * .48);
        if (coverage < .52 || noise(key + 25) > coverage * exposed || (px > 12 && px < 20)
          || placedStones.some(stone => Math.hypot(px - stone.x, pz - stone.z) < .71)) continue;
        placedStones.push({ x: px, z: pz });
        const mat = stones[Math.floor(noise(key) * stones.length)];
        const width = .25 + noise(key + 1) * .29;
        const height = .22 + noise(key + 2) * .25;
        const cut = .063 + noise(key + 4) * .16;
        const tile = piece(town, panel([[-width, -height + cut], [-width + cut, -height],
          [width - cut, -height + 0.018], [width, -height + cut * 0.81], [width - 0.019, height - cut],
          [width - cut, height], [-width + cut * 1.24, height - 0.034], [-width + 0.02, height - cut]], .025),
          mat, px, -.009 + lane * .0013, pz);
        tile.rotation.set(-Math.PI / 2, 0, (noise(key + 3) - .5) * .75);
        tile.receiveShadow = true;
        if (noise(key + 79) > .46) {
          const side = noise(key + 87) > .5 ? 1 : -1;
          const chip = piece(town, panel([[-.10, -.05], [-.01, -.092], [.11, -.032], [.064, .064], [-.056, .052]], .009),
            stones[(lane + j) % stones.length], px + side * (width + .15), -.01, pz + (noise(key + 97) - .5) * .61);
          chip.rotation.set(-Math.PI / 2, 0, noise(key + 42) * Math.PI);
          chip.scale.setScalar(.50 + noise(key + 64) * .76);
          chip.receiveShadow = true;
        }
      }
    }
  }

  const meadow: MeadowPlant[] = [];
  const blooms: MeadowPlant[] = [];
  for (const [bank, x] of [12, 20].entries()) {
    const inward = bank === 0 ? 1 : -1;
    for (let i = 0; i < 44; i++) {
      const key = bank * 47 + i;
      const z = -15 + i * .69 + (noise(key + 81) - .5) * .88;
      if (z > 2.85 && z < 7.13) continue;
      const size = .27 + noise(key + 36) * .75;
      const rock = piece(town, new THREE.DodecahedronGeometry(size, 0), stones[Math.floor(noise(key + 19) * 4)],
        x + inward * (-.09 + noise(key + 83) * .37), -.31 + (noise(key + 63) - .5) * .28, z);
      rock.scale.set(.70, .47 + noise(key + 5) * .20, .89 + noise(key + 23) * .44);
      rock.rotation.set(noise(key + 53) * .73, noise(key + 44) * Math.PI, noise(key + 87) * .58);
      rock.receiveShadow = true;
      if (i % 4 === 1) {
        meadow.push({ x: x - inward * .33, z, scale: 1.48 + noise(key + 17) * .47,
          angle: noise(key + 8) * Math.PI * 2, tint: 0xc3dcab });
        meadow.push({ x: x - inward * .62, z: z + .38, scale: .82 + noise(key + 29) * .48,
          angle: noise(key + 28) * Math.PI * 2, tint: 0xd6e6b9 });
      }
    }
  }

  const bridge = buildRefugeBridge(town, surface);
  blockers.push(...bridge.rails);
  buildCoverWall(town, stones, 9, 7.6, 3.4, .8, blockers);
  buildCoverWall(town, stones, 8.8, -4.55, 3.1, .65, blockers);
  for (const x of [-25, -18, -10, -3, 4, 11, 23, 29, 35]) {
    blockers.push(cube(timber, 0.18, 1.87, 0.18, x, 0.95, 8.4, true));
    cube(timber, 0.43, 0.09, 0.43, x, 1.88, 8.4, true);
    cube(warm, 0.25, 0.35, 0.25, x, 2.06, 8.4);
    cube(iron, 0.37, 0.085, 0.37, x, 2.28, 8.4, true);
  }

  for (const [index, { x, z, w, d, refuge }] of buildings.entries()) {
    if (refuge) {
      blockers.push(...buildRefugeLodge(town, x, z, w, d, surface));
      continue;
    }
    const front = z > 0 ? -1 : 1;
    const height = index === 2 ? 2.48 : 2.65;
    const pitch = 1.18;
    const facade = z + front * (d / 2 + 0.013);
    const facadePlaster = plaster[index % plaster.length];
    blockers.push(cube(masonry, w + 0.14, 0.51, d + 0.14, x, 0.25, z, true));
    blockers.push(cube(facadePlaster, w, height - 0.45, d, x, (height + 0.45) / 2, z, true));
    for (const side of [-1, 1]) {
      const gable = piece(town, panel([[-w / 2, 0], [w / 2, 0], [0, pitch]], 0.13), facadePlaster,
        x, height, z + side * d / 2 - 0.065);
      gable.castShadow = true;
      gable.receiveShadow = true;
      cube(timber, 0.19, height, d + 0.06, x + side * w * 0.475, height / 2, z, true);
      const slope = Math.hypot(w / 2 + 0.24, pitch + 0.17);
      const roof = cube(roofs[index][0], slope + 0.07, 0.14, d + 0.46, x + side * (w / 4 + 0.12), height + pitch / 2, z, true);
      roof.rotation.z = -side * Math.atan2(pitch, w / 2 + 0.24);
      const tiles=new THREE.Group(); tiles.position.copy(roof.position); tiles.rotation.copy(roof.rotation);
      town.add(tiles);
      for(let row=0;row<7;row++) for(let col=0;col<9;col++) {
        const tw=(slope+.07)/7+.045, td=(d+.46)/9;
        const chipped=.025+noise(row*19+col*3+index)*.025;
        const tile=piece(tiles,panel([[-tw/2,-td/2],[tw/2,-td/2],
          [tw/2,td/2-chipped],[tw/2-chipped,td/2],[-tw/2+chipped,td/2],[-tw/2,td/2-chipped]],.035),
          roofs[index][(row*3+col+index)%4===0?1:0],
          (row-3)*(slope+.07)/7,.088+(side<0?row:6-row)*.006,
          (col-4)*td+(row%2?.018:-.018));
        tile.rotation.x=-Math.PI/2;tile.receiveShadow=true;
      }
      for(const end of [-1,1]) {
        const trim=cube(timber,slope+.22,.16,.13,roof.position.x,roof.position.y,
          z+end*(d/2+.25),true);
        trim.rotation.z=roof.rotation.z;
      }
      for (const frameZ of [z - d / 2 - 0.008, z + d / 2 + 0.008]) {
        beam(town, timber, vector(x + side * 0.2, 0.59, frameZ),
          vector(x + side * (w / 2 - 0.14), height - 0.28, frameZ), 0.13);
      }
      const windowX = x + side * (w * 0.28);
      cube(timber, 0.56, 0.71, 0.095, windowX, 1.56, facade);
      cube(index === 2 ? warm : dark, 0.41, 0.53, 0.026, windowX, 1.57, facade + front * 0.056);
      cube(plank, 0.059, 0.58, 0.04, windowX, 1.57, facade + front * 0.074);
      cube(plank, 0.45, 0.06, 0.04, windowX, 1.56, facade + front * 0.078);
      cube(timber, 0.67, 0.1, 0.18, windowX, 1.19, facade);
    }
    cube(timber, w + 0.12, 0.17, d + 0.06, x, height - 0.17, z, true);
    cube(timber, 0.94, 1.7, 0.16, x, 0.94, facade, true);
    cube(plank, 0.71, 1.48, 0.083, x, 0.88, facade + front * 0.086);
    cube(iron, 0.075, 0.08, 0.065, x + 0.23, 0.85, facade + front * 0.143);
    blockers.push(cube(masonry, 1.04, 0.16, 0.48, x, 0.08, facade + front * 0.29));
    if (index === 2 || index === 3) {
      cube(masonry, 0.78, 3.8, 0.78, x - w / 2 + 0.28, 1.91, z + 0.78, true);
      cube(iron, 0.91, 0.22, 0.91, x - w / 2 + 0.28, 3.82, z + 0.78, true);
    }
  }

  for (const [index, x] of [-16, -9.7, -5.6].entries()) {
    const z = index === 0 ? -8.8 : -7.4;
    const canvas = index === 1 ? surface(0x976f56) : index === 0 ? surface(0x4d7473) : straw;
    for (const px of [x - 1.07, x + 1.07]) {
      blockers.push(cube(timber, 0.14, 2.05, 0.14, px, 1.02, z + 0.64, true));
      blockers.push(cube(timber, 0.14, 1.83, 0.14, px, 0.92, z - 0.65, true));
    }
    blockers.push(cube(plank, 2.13, 0.14, 1.09, x, 0.8, z, true));
    for (let j = 0; j < 7; j++) {
      const stripe = cube(j % 3 === 0 ? straw : canvas, 0.34, 0.04, 1.62, x - 0.99 + j * 0.33, 1.96, z, true);
      stripe.rotation.x = 0.15;
    }
    for (let j = 0; j < 4; j++) {
      piece(town, loft([[0, 0.086, 0.087], [0.06, 0.122, 0.12], [0.18, 0.084, 0.084], [0.22, 0.071, 0.071]], 8),
        j % 2 ? straw : canvas, x - 0.71 + j * 0.47, 0.87, z + 0.15);
    }
  }

  for (const [x, z] of [[-25.6, 3.5], [-11.5, -3.3], [-8.8, 6.7], [2.3, -10.4], [26.4, 9.2]]) {
    for (let i = 0; i < 3; i++) {
      buildStorybookBarrel(town, surface, x + i * .55, z + (i % 2) * .34);
    }
  }
  buildRefugeFire(town, parent, time, surface);
  for (const x of [27.2, 28.8]) cube(timber, 0.23, 0.21, 1.45, x, 0.18, 8.96, true);

  blockers.push(...buildRefugeGrove(town, surface));
  for (const [i, [x, z]] of [[-28, -8], [-26, 11], [-22, -12], [-17, 12], [-9, 12], [-4, -11], [6, 11],
    [8.9, 12.8]].entries()) {
    const scale = i >= 6 ? .86 + noise(i + 3) * .19 : .88 + noise(i + 3) * .7;
    const tree = new THREE.Group();
    tree.position.set(x,0,z); tree.scale.setScalar(scale); tree.rotation.y=i*1.37;
    town.add(tree);
    blockers.push(buildStorybookTree(tree,surface,i));
  }

  const canPlant = (x: number, z: number) =>
    !(x > 11 && x < 21) && roadWear(x, z) < .23 &&
    !buildings.some(b => Math.abs(x - b.x) < b.w / 2 + .53 && Math.abs(z - b.z) < b.d / 2 + .58);
  for (let i = 0; i < 1520; i++) {
    const x = -31 + noise(i + 26) * 69;
    const z = -14 + noise(i + 89) * 27;
    const bed = Math.sin(x * .71 + z * .36) + Math.sin(z * .92 - x * .22) * .68;
    if (bed < -.36 || !canPlant(x, z)) continue;
    const scale = .55 + noise(i + 141) * .63 + Math.max(0, bed) * .11;
    const tint = bed > .71 ? 0xf3f6d5 : 0xdbeccb;
    meadow.push({ x, z, scale, angle: noise(i + 24) * Math.PI * 2, tint });
  }
  for (const [bed, [x, z]] of [[-27.3, -2.8], [-25.2, 1.4], [-18.4, 2.2], [-12.1, -7.4],
    [-8.2, 7.9], [3.2, 8.2], [9.5, 9.2], [10.9, .3], [21.6, -.5], [24.1, 9.5], [30.2, 2.1],
    [33.7, 12.7]].entries()) {
    for (let i = 0; i < 42; i++) {
      const seed = bed * 53 + i;
      const px = x + (noise(seed + 5) - .5) * 2.9;
      const pz = z + (noise(seed + 74) - .5) * 1.9;
      if (!canPlant(px, pz)) continue;
      const scale = .73 + noise(seed + 43) * .50;
      const angle = noise(seed + 83) * Math.PI * 2;
      if (i % 3 === 0) blooms.push({ x: px, z: pz, scale, angle });
      else meadow.push({ x: px, z: pz, scale, angle, tint: 0xe2eac2 });
    }
  }
  for (const [row, z] of [-46, -34, -24, 24, 36].entries()) {
    const haze = surface(row === 0 ? 0x8cabb3 : row === 1 || row === 4 ? 0x789d99 : 0x638e74);
    for (let i = 0; i < 11; i++) {
      const x = -52 + i * 11.4 + noise(row * 11 + i) * 4.4;
      if (x > 3 && x < 29 && Math.abs(z) < 36) continue;
      const hill = piece(town, smoothLoft([[-0.12, 0.96, 0.97], [0.14, 0.86, 0.83], [0.46, 0.62, 0.64, -0.058],
        [0.75, 0.34, 0.42, -0.11, 0.07], [0.91, 0.11, 0.16, -0.12, 0.12]], 16),
        haze, x, -0.89, z);
      hill.scale.set(8.8, 2.4 + row % 3 * 1.9 + noise(i + z) * 5.5, 5.8 + row % 2 * 2);
      hill.rotation.y = noise(i) * Math.PI;
    }
  }

  // Capture the physical surfaces before the renderer merges meshes by material.
  const solids = new GroundMeshCollider(blockers);
  const crossing = new GroundMeshCollider(bridge.deck);
  bakePieces(town, paintedPalette(focus));
  addPaintedMeadow(town, time, motion, meadow, blooms);
  for (const mesh of town.children) {
    if (mesh instanceof THREE.Mesh && mesh.material instanceof THREE.MeshBasicMaterial) {
      mesh.material.onBeforeCompile = shader => addSceneryCutaway(shader, focus);
    }
  }

  const river = new THREE.ShaderMaterial({
    uniforms: {
      time,
      wakes: motion.wakes,
      bridgeWake: { value: new THREE.Vector3(0, 0, -1) },
      deep: { value: new THREE.Color(PAINTED_WATER_PALETTE.deep) },
      channel: { value: new THREE.Color(PAINTED_WATER_PALETTE.channel) },
      shallows: { value: new THREE.Color(PAINTED_WATER_PALETTE.shallows) },
      glint: { value: new THREE.Color(PAINTED_WATER_PALETTE.glint) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float time;
      uniform vec4 wakes[${RIVER_WAKES}];
      uniform vec3 bridgeWake;
      uniform vec3 deep;
      uniform vec3 channel;
      uniform vec3 shallows;
      uniform vec3 glint;
      float hash(vec2 p) {
        p = fract(p * vec2(.1031, .1099));
        p += dot(p, p.yx + 33.33);
        return fract(p.x * p.y * 19.31);
      }
      float strokes(vec2 p) {
        vec2 cell = floor(p);
        vec2 q = fract(p);
        float seed = hash(cell);
        float along = (q.y - .5) / (.19 + seed * .29);
        float width = .023 + .048 * hash(cell.yx);
        float bend = along * (seed - .5) * .31 + along * along * .19;
        float cross = (q.x - (.26 + seed * .47) - bend) / width;
        return (1.0 - smoothstep(.32, 1.0, cross * cross + along * along)) * smoothstep(.53, .91, seed);
      }
      void main() {
        float edge = min(vUv.x, 1.0 - vUv.x);
        float stream = vUv.y * 39.0 - time * .55;
        float sway = sin(vUv.y * 33.0) * .045 + sin(stream * .75) * .026;
        float mainFlow = sin((vUv.x + sway) * 16.0 + sin(stream * .31) * .96);
        float wash = smoothstep(-.66, -.19, mainFlow) * (1.0 - smoothstep(.29, .74, mainFlow));
        float bank = 1.0 - smoothstep(.014, .27, edge + sin(vUv.y * 76.0) * .019);
        float shoal = bank * (.71 + .19 * smoothstep(-.47, .47, sin(vUv.y * 135.0 + edge * 24.0)));
        float backwash = sin(stream * 2.5 + edge * 70.0 + sin(stream * 1.5) * .9);
        float ripple = smoothstep(.67, .96, backwash) * bank;
        float foamEdge = .025 + .010 * sin(vUv.y * 142.0) + .007 * sin(vUv.y * 320.0 + time * 1.4);
        float foam = (1.0 - smoothstep(.002, .009, abs(edge - foamEdge))) *
          smoothstep(-.17, .78, sin(stream * 4.6 + mainFlow));
        vec2 flow = vec2((vUv.x + sway) * 7.6, vUv.y * 22.0 - time * .38 + vUv.x * 1.9);
        float glints = strokes(flow) + strokes(flow * vec2(1.45, 1.8) + vec2(.63, .38)) * .42;
        vec3 color = mix(deep, channel, .28 + wash * .58);
        color = mix(color, shallows, shoal);
        float skyRibbon = smoothstep(.72, .94, mainFlow) *
          smoothstep(-.85, .82, sin(stream * 1.33 + vUv.x * 5.0));
        color = mix(color, glint, min(.84,
          min(1.0, glints) * (.36 + bank * .27) + foam * .64 + ripple * .12 + skyRibbon * .17));
        float riverZ = (.5 - vUv.y) * 61.0 - 1.0;
        vec2 world = vec2(${RIVER_CENTER_X.toFixed(1)} + (vUv.x - .5) * ${RIVER_WIDTH.toFixed(1)}, riverZ);
        float footprint = 0.0;
        for (int i = 0; i < ${RIVER_WAKES}; i++) {
          vec4 wake = wakes[i];
          vec2 delta = world - wake.xy;
          delta.y += wake.z * .34;
          if (wake.z >= 1.0 || max(abs(delta.x), abs(delta.y)) > 1.6) continue;
          float radius = length(delta * vec2(1.0, .84));
          float ring = radius - (.14 + wake.z * 1.20);
          float arc = 1.0 - smoothstep(.023, .070, abs(ring));
          float echo = 1.0 - smoothstep(.008, .038, abs(ring + .15));
          float tail = 1.0 - smoothstep(.26, 1.0, wake.z);
          footprint = max(footprint, (arc + echo * .37) * tail * wake.w);
        }
        color = mix(color, glint, min(1.0, footprint * .97));
        if (bridgeWake.z >= 0.0) {
          vec2 distanceFromStrike = world - bridgeWake.xy;
          float age = bridgeWake.z;
          float distance = length(distanceFromStrike * vec2(.87, 1.0));
          float crest = 1.35 + 7.6 * age;
          float breakup = sin(distanceFromStrike.x * 3.4 + distanceFromStrike.y * 1.9) * .13;
          float front = 1.0 - smoothstep(.06,.29,abs(distance - crest + breakup));
          float echo = 1.0 - smoothstep(.04,.19,abs(distance - crest + .68 + breakup));
          float tail = 1.0 - smoothstep(.27,1.08,age);
          color = mix(color, glint, min(1.0,(front + echo * .40) * tail * .91));
        }
        float deckShade = 1.0 - smoothstep(1.3, 3.1, abs(riverZ - 4.4 + .35 * vUv.x));
        color *= 1.0 - deckShade * .41;
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const water = piece(parent, new THREE.PlaneGeometry(RIVER_WIDTH, 61), river, RIVER_CENTER_X, -0.4, -1);
  water.rotation.x = -Math.PI / 2;
  return {
    river,
    solids,
    crossing,
    water: new GroundMeshCollider([water]),
    motion,
    setFocus(camera: THREE.Camera, player: THREE.Vector3 | null): void {
      if (!player) {
        focus.value.w = 0;
        return;
      }
      camera.updateWorldMatrix(true, false);
      viewCenter.copy(player);
      viewCenter.y += .94;
      viewCenter.applyMatrix4(camera.matrixWorldInverse);
      focus.value.set(viewCenter.x, viewCenter.y, viewCenter.z, 1);
    },
  };
}
