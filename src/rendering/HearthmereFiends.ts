import * as THREE from 'three';
import { bakePieces, hairLock, panel, piece, smoothLoft } from './ArtMesh';
import { createIllustratedCelMaterial, createSilhouetteInk, inkMesh } from './AnimeMaterials';

export interface FiendPose {
  windup: number | null;
  released: boolean;
  moving: number;
  stagger: number;
}

interface FiendRig {
  facing: THREE.Group;
  update: (dt: number, pose: FiendPose) => void;
  emitter?: THREE.Object3D;
}

const toon = (color: number) => createIllustratedCelMaterial({ color });
const HOT = new THREE.Color(0xffa260);
const COLD = new THREE.Color(0x8af4e3);
const EMBER = new THREE.Color(0xf27a69);
const ease = THREE.MathUtils.smoothstep;

function armor(
  group: THREE.Group, outline: [number, number][], depth: number, bevel: number,
  paint: THREE.Material, x = 0, y = 0, z = 0,
): THREE.Mesh {
  const shape = new THREE.Shape(outline.map(([u, v]) => new THREE.Vector2(u, v)));
  const mesh = piece(group, new THREE.ExtrudeGeometry(shape, {
    depth, steps: 1, bevelEnabled: true, bevelSegments: 1, bevelThickness: bevel, bevelSize: bevel,
  }), paint, x, y, z);
  mesh.castShadow = true;
  return mesh;
}

function finish(palette: THREE.MeshToonMaterial, parts: THREE.Group[], width: number): void {
  palette.vertexColors = true;
  const ink = createSilhouetteInk(width, 0x261c30);
  for (const part of parts) {
    bakePieces(part, palette);
    for (const mesh of part.children) {
      if (mesh instanceof THREE.Mesh && mesh.material === palette) inkMesh(mesh, ink);
    }
  }
}

export function buildSlime(palette: THREE.MeshToonMaterial): FiendRig {
  const facing = new THREE.Group();
  const hull = new THREE.Group();
  const face = new THREE.Group();
  const spines = new THREE.Group();
  const feelers = [new THREE.Group(), new THREE.Group()];
  const glaze = toon(0x63334d);
  const violet = toon(0x81445c);
  const slag = toon(0x382a3e);
  const glass = toon(0x674251);
  const edge = toon(0xb96873);
  const signal = new THREE.MeshBasicMaterial({ color: EMBER });
  const body = piece(hull, smoothLoft([[.012,.39,.39,.07], [.09,.65,.56,.08], [.24,.72,.61,.06],
    [.43,.60,.57,.02], [.65,.47,.44,-.085], [.88,.23,.26,-.22], [1.02,.067,.09,-.36]], 22), glaze);
  body.castShadow = true;

  for (const side of [-1, 1]) {
    const mirror = (shape: [number, number][]) => shape.map(([x, y]): [number, number] => [side * x, y]);
    const cheek = armor(face, mirror([[.06,.46],[.15,.64],[.43,.70],[.59,.54],[.49,.32],[.36,.19],[.12,.28]]),
      .105, .043, slag, 0, 0, .405);
    cheek.rotation.y = side * .22;
    const brow = armor(face, mirror([[.11,.55],[.22,.68],[.53,.66],[.57,.58],[.44,.50],[.20,.48]]),
      .061, .021, glass, 0, 0, .536);
    brow.rotation.y = side * .16;
    piece(face, panel(mirror([[.13,.46],[.47,.55],[.38,.42],[.21,.40]]), .013),
      signal, 0, 0, .607).rotation.x = -.13;
    const claw = feelers[side > 0 ? 1 : 0];
    claw.position.set(side * .44, .10, .23);
    const pad = piece(claw, smoothLoft([[0,.15,.24,.07],[.08,.26,.39,.16],[.18,.25,.31,.17],
      [.30,.13,.21,.07],[.36,.053,.08,.023]], 12), violet);
    pad.castShadow = true;
    armor(claw, mirror([[.01,.07],[.09,.21],[.20,.24],[.27,.13],[.25,.039],[.13,.014]]),
      .115, .029, slag, 0, 0, .37).rotation.y = side * -.24;
  }
  armor(face, [[-.23,.26],[.21,.26],[.28,.17],[.13,.12],[-.20,.13],[-.29,.18]],
    .062, .028, slag, 0, 0, .55);
  piece(face, panel([[-.14,.191],[-.02,.215],[.071,.189],[.16,.197],[.098,.161],[-.097,.171]], .011),
    signal, 0, 0, .647);
  for (const [i, [x, y, z, tilt]] of [[-.32,.49,-.18,-.51], [.29,.57,-.23,.57], [-.13,.66,-.38,-.31],
    [.12,.79,-.44,.34], [0,.49,-.57,-.15]].entries()) {
    const shard = armor(spines, [[-.12,0],[-.19,.18],[-.09,.36],[-.025,.50 + i * .038],[.092,.32],
      [.16,.13],[.13,0]], .105, .027, i % 2 ? glass : slag, x, y, z);
    shard.rotation.set(-.68 - i * .035, 0, tilt);
    const ridge = piece(spines, hairLock([[x + .026,y+.10,z+.116],[x + .042,y+.26,z-.004],
      [x - .022,y+.39,z-.164]], .020, .018), edge);
    ridge.castShadow = true;
  }
  finish(palette, [hull, face, spines, ...feelers], .013);
  hull.add(face, spines, ...feelers);
  facing.add(hull);

  let clock = 0, recoil = 1;
  const update = (dt: number, { windup, released, moving, stagger }: FiendPose) => {
    clock += dt * (2 + moving * 8.5);
    recoil = released ? 0 : Math.min(1, recoil + dt);
    const launch = windup === null ? 1 - ease(recoil, 0, .19) : ease(windup, .78, 1);
    const coil = windup === null ? 0 : ease(windup, 0, .67) * (1 - launch);
    const drop = (1 - ease(recoil, .16, .46)) * ease(recoil, .11, .23);
    const tread = Math.sin(clock) * moving * (windup === null ? 1 : 0);
    const idle = Math.sin(clock * .56) * (1 - moving) * .032;
    const height = 1 + idle + Math.max(0, tread) * .16 - .39 * coil + .20 * launch - .29 * drop - .12 * stagger;
    hull.scale.set(1 / Math.sqrt(height), height, (1 / Math.sqrt(height)) * (1 + .24 * launch));
    hull.position.set(tread * .044, Math.max(0, tread) * .135, .44 * launch - .12 * coil - .11 * stagger);
    hull.rotation.x = -.27 * launch + .20 * drop + .10 * stagger;
    face.rotation.x = .23 * coil - .20 * launch;
    spines.rotation.x = -.22 * coil + .31 * launch - tread * .12;
    feelers.forEach((claw, i) => {
      const side = i ? 1 : -1;
      claw.position.z = .23 + tread * side * .16 + .19 * launch;
      claw.rotation.y = side * (.12 + .29 * coil - .20 * launch);
      claw.rotation.x = tread * side * .19 + .22 * coil;
    });
    signal.color.copy(EMBER).lerp(HOT, Math.max(coil, launch));
  };
  return { facing, update };
}

export function buildSentinel(palette: THREE.MeshToonMaterial): FiendRig {
  const facing = new THREE.Group();
  const hull = new THREE.Group();
  const body = new THREE.Group();
  const ring = new THREE.Group();
  const sails = [new THREE.Group(), new THREE.Group()];
  const iris = new THREE.Group();
  const enamel = toon(0x457674), jade = toon(0x75aca0), shadow = toon(0x293a47);
  const bronze = toon(0xad8461), ivory = toon(0xd4cdb3);
  const signal = new THREE.MeshBasicMaterial({ color: COLD });
  hull.position.y = 1.14;
  iris.position.set(0, .087, .36);
  const chassis = piece(body, smoothLoft([[-.61,.082,.099],[-.43,.22,.20],[-.18,.33,.26],
    [.17,.34,.26],[.43,.24,.205],[.59,.08,.09]], 10), shadow);
  chassis.castShadow = true;
  const mask = armor(body, [[-.32,.16],[-.24,.37],[0,.51],[.22,.39],[.32,.14],[.25,-.21],
    [.07,-.41],[-.14,-.34],[-.30,-.12]], .108, .041, enamel, 0, 0, .19);
  mask.rotation.x = -.09;
  armor(body, [[-.29,.23],[-.15,.415],[0,.48],[.151,.40],[.29,.23],[.17,.19],[0,.288],[-.17,.19]],
    .049, .020, ivory, 0, 0, .295);
  armor(body, [[-.236,.109],[-.104,.26],[.104,.26],[.236,.109],[.138,-.067],[-.126,-.067]],
    .041, .019, bronze, 0, .01, .301);
  armor(body, [[-.161,.083],[-.080,.185],[.080,.185],[.161,.083],[.087,-.031],[-.087,-.031]],
    .023, .012, shadow, 0, 0, .361);
  const gem = piece(iris, new THREE.OctahedronGeometry(.141), signal, 0, 0, .066);
  gem.scale.set(1.16,.68,.72);
  const collar = piece(ring, new THREE.TorusGeometry(.53,.023,7,28), bronze, 0, -.012, 0);
  collar.rotation.x = Math.PI * .43;
  for (const [i, sail] of sails.entries()) {
    const side = i ? 1 : -1;
    sail.position.set(side * .29, 0, .012);
    const mirror = (shape: [number, number][]) => shape.map(([x, y]): [number, number] => [side * x, y]);
    armor(sail, mirror([[.0,-.35],[.14,-.13],[.12,.25],[.41,.61],[.66,.76],[.49,.38],
      [.59,.11],[.34,-.23],[.30,-.52],[.13,-.42]]), .12, .034, shadow, 0, 0, -.04);
    armor(sail, mirror([[.13,.17],[.40,.49],[.56,.64],[.37,.30],[.43,.11],[.24,-.19],[.19,-.39],
      [.10,-.21]]), .035, .023, enamel, 0, 0, .096);
    armor(sail, mirror([[.22,.15],[.47,.49],[.34,.18],[.35,.10],[.19,-.09]]),
      .019, .009, jade, 0, 0, .15);
    piece(sail, panel(mirror([[.30,-.05],[.39,.09],[.34,-.082],[.20,-.21]]), .012),
      signal, 0, 0, .143);
  }
  finish(palette, [body, ring, iris, ...sails], .011);
  const emitter = new THREE.Group();
  emitter.position.z = .066;
  iris.add(emitter);
  const glintPaint = new THREE.MeshBasicMaterial({
    color: 0xffd194, side: THREE.DoubleSide, transparent: true, depthWrite: false,
  });
  const glint = piece(emitter, panel([[0,.32], [.045,.052], [.30,0], [.043,-.047],
    [0,-.32], [-.045,-.049], [-.30,0], [-.045,.052]], .005), glintPaint, 0, 0, .13);
  glint.visible = false;
  hull.add(body, ring, iris, ...sails);
  facing.add(hull);

  let clock = 0, recoil = 1;
  const update = (dt: number, { windup, released, moving, stagger }: FiendPose) => {
    clock += dt;
    recoil = released ? 0 : Math.min(1, recoil + dt);
    const charge = windup === null ? 0 : ease(windup, 0, .75);
    const snap = 1 - ease(recoil, 0, .30);
    const spin = Math.sin(clock * 3.9);
    hull.position.set(0, 1.14 + spin * .098 + charge * .19 - snap * .23, -.16 * snap);
    hull.rotation.x = .20 * moving - .19 * charge + .31 * snap + .14 * stagger;
    hull.rotation.z = spin * .041 + .19 * stagger;
    ring.rotation.set(.02, clock * (1.3 + .25 * moving), .29 * charge + spin * .12);
    ring.scale.setScalar(1 + charge * .26 - snap * .14);
    for (const [i, sail] of sails.entries()) {
      const side = i ? 1 : -1;
      sail.position.x = side * (.29 + .22 * charge + .12 * snap);
      sail.rotation.set(-.31 * charge + .21 * snap, side * (.45 * charge - .27 * snap),
        side * (-.18 - .61 * charge + .39 * snap + spin * .046));
    }
    iris.scale.setScalar(1 + charge * (.6 + Math.sin(clock * 29) * .075) - snap * .49);
    signal.color.copy(COLD).lerp(HOT, Math.max(charge, snap * .73));
    const flash = ease(charge, .39, 1);
    glint.visible = flash > 0;
    glint.scale.setScalar(.47 + flash * (.62 + Math.sin(clock * 24) * .07));
    glint.rotation.z = .32 + clock * .61;
    glintPaint.opacity = flash * .88;
  };
  return { facing, update, emitter };
}
