import * as THREE from 'three';
import { bakePieces, loft, panel, piece } from './ArtMesh';
import { createIllustratedCelMaterial, createSilhouetteInk, inkMesh } from './AnimeMaterials';

type Point = [number, number];
const point = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const forward = point(0, 0, 1);
const UPPER = 6.05;
const LOWER = 6.85;
const REST = point(4.25, 3.48, 3.35);
const RAISED = point(4.76, 10.14, 4.58);
const CONTACT = point(1.50, 1.34, 10.98);
const HOT_CORE = new THREE.Color(0xffc781);
const ease = (value: number, start: number, end: number) => THREE.MathUtils.smoothstep(value, start, end);

/** Rig coordinates are relative to the planted feet. The striking arm uses a fixed-length elbow solve. */
export class HearthmereGiant {
  readonly root = new THREE.Group();
  private readonly chest = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly jaw = new THREE.Group();
  private readonly guard = new THREE.Group();
  private readonly shoulder = new THREE.Group();
  private readonly upper = new THREE.Group();
  private readonly lower = new THREE.Group();
  private readonly fist = new THREE.Group();
  private readonly wrist = new THREE.Vector3();
  private readonly origin = new THREE.Vector3();
  private readonly axis = new THREE.Vector3();
  private readonly elbow = new THREE.Vector3();
  private readonly bend = new THREE.Vector3();
  private readonly core = new THREE.MeshBasicMaterial({ color: 0xf98b51 });
  private clock = 0;

  constructor() {
    this.root.name = 'Hearthmere colossus';
    this.fist.name = 'Colossus striking fist';
    const stone = createIllustratedCelMaterial({ color: 0x555969 });
    const slag = createIllustratedCelMaterial({ color: 0x333647 });
    const basalt = createIllustratedCelMaterial({ color: 0x262737 });
    const ash = createIllustratedCelMaterial({ color: 0x868889 });
    const bronze = createIllustratedCelMaterial({ color: 0x83604b });
    const edge = createIllustratedCelMaterial({ color: 0xada8a2 });
    const spark = new THREE.MeshBasicMaterial({ color: 0xffdf94 });
    const chassis = new THREE.Group();
    chassis.position.y = -.42;
    this.root.add(chassis, this.chest, this.upper, this.lower, this.fist);
    this.chest.add(this.head, this.guard, this.shoulder);
    this.head.add(this.jaw);
    this.chest.position.y = 5.10;
    this.head.position.set(-.19, 3.19, .58);
    this.jaw.position.set(0, -.53, .27);
    this.shoulder.position.set(2.65, 1.76, .41);
    this.guard.position.set(-2.62, 1.71, -.04);

    const plate = (parent: THREE.Group, outline: Point[], depth: number, bevel: number,
      material: THREE.Material, x: number, y: number, z: number) => {
      const shape = new THREE.Shape(outline.map(([u, v]) => new THREE.Vector2(u, v)));
      const mesh = piece(parent, new THREE.ExtrudeGeometry(shape, {
        depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, steps: 1,
      }), material, x, y, z);
      mesh.castShadow = true;
      return mesh;
    };
    const crack = (parent: THREE.Group, path: Point[], depth: number, width: number, material: THREE.Material) => {
      const bevels = path.map(([x, y], i): Point => [x + width * (i % 2 ? .30 : 1), y - width * .42]);
      return piece(parent, panel([...path, ...bevels.reverse()], .009), material, 0, 0, depth);
    };

    // The broad pieces of the shell fracture along angular veins. Smaller
    // stones and dark joints stay tucked beneath the edge of each plate.
    piece(chassis, loft([[2.52,1.33,1.03],[3.32,2.10,1.56],[4.47,2.13,1.53],[5.26,1.72,1.26]], 10, true), basalt);
    for (const side of [-1, 1]) {
      const x = side * 1.55;
      const leg = piece(chassis, loft([[.24,1.12,1.24,.39],[.62,1.27,1.27,.29],
        [1.54,.90,1.14,.04],[2.18,1.12,1.14,-.06],[3.77,1.12,1.15,-.08]], 9, true),
      slag, x, 0, 0);
      leg.rotation.z = side * -.11;
      const shin = plate(chassis, [[-.91,.49],[-.70,1.81],[-.16,2.36],[.65,2.24],[.93,1.23],[.51,.51]],
        .45, .16, stone, x, 0, .59);
      shin.rotation.y = side * .12;
      plate(chassis, [[-.91,.03],[-1.03,.38],[-.62,.73],[.60,.68],[1.05,.31],[.94,.03]],
        .82, .12, basalt, x, .065, .53);
      plate(chassis, [[-.83,3.03],[-1.08,4.09],[-.67,4.62],[.58,4.64],[.91,3.82],[.47,2.94]],
        .37, .11, ash, x * 1.04, 0, .87).rotation.y = side * .13;
    }

    piece(this.chest, loft([[-1.24,1.68,1.16],[-.44,2.05,1.57],[.91,2.72,1.80],
      [2.13,2.57,1.53],[2.81,1.25,1.18]], 10, true), basalt);
    for (const side of [-1, 1]) {
      const mirror = (outline: Point[]) => outline.map(([x, y]): Point => [side * x, y]);
      const chest = plate(this.chest, mirror([[.29,.12],[.40,1.50],[1.18,2.28],[2.51,1.93],
        [2.83,1.41],[2.30,.42],[1.33,-.33],[.77,-.45]]), .41, .18, side < 0 ? ash : stone, 0, 0, 1.37);
      chest.rotation.y = side * .08;
      plate(this.chest, mirror([[.16,-.32],[.61,-.52],[1.59,-.18],[1.96,-.61],[1.45,-1.10],
        [.58,-1.24],[.19,-.86]]), .31, .12, slag, 0, 0, 1.34);
      crack(this.chest, mirror([[.69,1.96],[1.11,1.54],[.94,1.14],[1.38,.91],[1.61,.31]]),
        1.87 + side * -.08, .09, basalt);
      crack(this.chest, mirror([[.88,1.28],[1.24,1.19],[1.61,1.37]]),
        1.88 + side * -.08, .041, this.core);
      for (const [x, y, tilt] of [[1.65, .50, .56], [1.97, .76, .62], [2.13, 1.12, .71]]) {
        piece(this.chest, new THREE.BoxGeometry(.19, .43, .17), bronze,
          side * x, y, 1.91 + side * -.09).rotation.z = side * tilt;
      }
    }
    plate(this.chest, [[-.34,1.45],[.12,1.62],[.36,1.19],[.29,.63],[.42,.29],[.05,-.24],
      [-.31,.19],[-.27,.71],[-.41,1.02]], .33, .06, slag, 0, 0, 1.47);
    plate(this.chest, [[-.21,1.42],[.18,1.16],[-.027,.85],[.23,.57],[.12,.29],[.10,-.12],
      [-.13,.31],[-.09,.54],[-.27,.84],[-.09,1.15]], .018, .011, this.core, 0, 0, 1.848);
    crack(this.chest, [[-.14,1.38],[.087,1.13],[-.14,.84],[.096,.55],[.033,.25]], 1.881, .072, spark);

    for (const [side, pauldron] of [[-1, this.guard], [1, this.shoulder]] as const) {
      const mirror = (outline: Point[]) => outline.map(([x, y]): Point => [side * x, y]);
      plate(pauldron, mirror([[-.90,-.98],[-1.04,.32],[-.53,1.25],[.38,1.59],[1.31,1.13],
        [1.97,1.42],[1.70,.48],[1.99,-.13],[1.25,-.83],[.18,-1.27]]),
      1.76, .19, side < 0 ? stone : slag, 0, 0, -.94);
      plate(pauldron, mirror([[-.58,.48],[-.29,1.19],[.43,1.35],[.81,.99],[1.46,1.18],
        [1.19,.56],[.54,.21],[-.30,.09]]), .27, .12, ash, 0, 0, .83);
      plate(pauldron, mirror([[.20,-.74],[.63,-.41],[1.33,-.19],[1.60,-.43],[1.30,-.91],[.67,-1.17]]),
        .16, .09, basalt, 0, 0, .67);
      crack(pauldron, mirror([[.48,1.28],[.43,.91],[.74,.66],[.67,.38]]), 1.22, .08, basalt);
    }
    const guardLimb = new THREE.Group();
    guardLimb.rotation.z = -.21;
    this.guard.add(guardLimb);
    piece(guardLimb, loft([[-4.75,.74,.79,.51],[-4.22,.98,.94,.48],[-3.17,1.01,1.03,.29],
      [-2.51,.77,.82,.13],[-1.22,1.0,.94],[-.40,.91,.89]], 9, true), slag).castShadow = true;
    plate(guardLimb, [[-.89,-4.12],[-1.04,-3.44],[-.70,-2.83],[.71,-2.77],[.94,-3.35],[.61,-4.15]],
      .42, .14, stone, 0, 0, .64);
    plate(guardLimb, [[-.72,-4.99],[-.80,-4.47],[-.39,-4.13],[.69,-4.19],[.82,-4.67],[.47,-5.10]],
      .89, .15, basalt, 0, 0, .14);

    // Split crown and the narrow eye sockets are readable in the long shot.
    plate(this.head, [[-1.06,-.49],[-1.29,.17],[-.99,.97],[-.58,1.38],[.54,1.40],
      [1.05,.96],[1.17,.18],[.91,-.61],[.24,-.96],[-.66,-.85]], 1.44, .17, slag, 0, 0, -.89);
    const horns: Point[][] = [
      [[-.98,.38],[-1.34,.72],[-1.37,1.38],[-1.83,2.22],[-1.78,1.28],[-1.94,.86],[-1.51,.27]],
      [[.89,.43],[1.20,.82],[1.38,1.38],[1.62,1.61],[1.66,1.06],[1.49,.63],[1.30,.34]],
    ];
    for (const horn of horns) plate(this.head, horn, .47, .10, stone, 0, 0, -.57);
    plate(this.head, [[-1.02,.40],[-.76,1.08],[-.39,1.29],[.19,1.15],[.69,1.07],[1.02,.58],
      [.82,.29],[.37,.34],[.12,.13],[-.23,.30],[-.77,.18]], .37, .12, edge, 0, 0, .52);
    crack(this.head, [[-.47,1.28],[-.24,1.02],[-.36,.76],[-.09,.61],[-.21,.33]], 1.016, .073, basalt);
    plate(this.head, [[-.97,.29],[-.74,.35],[-.22,.17],[.11,.12],[.38,.22],[.90,.42],[1.04,.25],
      [.84,-.26],[-.76,-.22]], .19, .04, basalt, 0, 0, .74);
    for (const side of [-1, 1]) {
      const eye = piece(this.head, panel([[.12,.087],[.78,.27],[.61,.079],[.30,.012]]
        .map(([x, y]) => [x * side, y - (side < 0 ? .032 : 0)]), .022), this.core, 0, 0, .974);
      eye.scale.x = side < 0 ? .94 : 1;
      plate(this.head, [[.68,-.22],[1.06,-.10],[.96,-.64],[.55,-.81],[.36,-.56]]
        .map(([x, y]) => [side * x, y]), .28, .075, stone, 0, 0, .57);
    }
    plate(this.head, [[-.18,.24],[.12,.31],[.31,-.21],[.13,-.45],[-.24,-.36]],
      .23, .06, ash, 0, 0, .81);
    plate(this.jaw, [[-.70,-.08],[-.49,.16],[.51,.12],[.71,-.09],[.43,-.46],[-.34,-.52]],
      .40, .08, stone, 0, 0, .32);
    crack(this.jaw, [[-.53,-.05],[-.29,-.12],[-.17,-.061],[.18,-.15],[.44,-.074]], .817, .085, basalt);

    const shell = (parent: THREE.Group, rings: Parameters<typeof loft>[0], paint: THREE.Material) => {
      const shape = loft(rings, 9, true);
      shape.rotateX(Math.PI / 2);
      const mesh = piece(parent, shape, paint);
      mesh.castShadow = true;
      return mesh;
    };
    shell(this.upper, [[-.42,1.23,1.13],[.48,1.42,1.25],[1.84,1.34,1.14],
      [3.49,1.14,1.08],[5.12,1.04,.98],[6.07,.91,.95]], slag);
    const upperPlate = plate(this.upper, [[-.95,.36],[-1.22,1.52],[-.82,2.61],[-.93,3.39],
      [-.38,3.97],[.60,3.46],[.95,2.41],[.84,1.10],[.56,.59]], .16, .13, stone, 0, 1.26, 0);
    upperPlate.rotation.x = Math.PI / 2;
    const upperSeam = crack(this.upper, [[-.60,1.11],[-.22,1.74],[-.47,2.09],[-.24,2.76],[.33,3.12]],
      0, .12, basalt);
    upperSeam.rotation.x = Math.PI / 2;
    upperSeam.position.y = 1.287;
    shell(this.lower, [[-.47,1.02,1.11],[.55,1.09,1.04],[1.39,1.28,1.17],
      [3.01,1.49,1.19],[4.87,1.38,1.05],[6.83,1.02,.86]], stone);
    const forePlate = plate(this.lower, [[-.83,.46],[-1.29,1.50],[-1.39,3.26],[-1.10,4.74],[-.70,5.83],
      [.91,5.64],[1.33,4.42],[1.14,2.58],[.72,.73]], .18, .11, ash, 0, 1.23, 0);
    forePlate.rotation.x = Math.PI / 2;
    for (const z of [4.93, 5.74]) {
      shell(this.lower, [[z-.11,1.27,1.05],[z,1.37,1.15],[z+.20,1.31,1.08]], basalt);
      const link = plate(this.lower, [[-.64,-.15],[.61,-.15],[.79,.07],[.58,.26],[-.56,.22],[-.75,.061]],
        .19, .06, bronze, 0, .99, z);
      link.rotation.x = -Math.PI / 2;
    }
    const seam = crack(this.lower, [[-.41,.95],[.24,1.83],[-.18,2.77],[.53,3.69],[.09,4.83]], .0, .116, this.core);
    seam.rotation.x = Math.PI / 2;
    seam.position.y = 1.274;
    shell(this.fist, [[-.54,.98,.82],[.13,1.47,.91],[.63,1.62,1.03],[1.29,1.49,.81]], basalt);
    for (let i = 0; i < 4; i++) {
      const x = (i - 1.5) * .70;
      const z = 1.21 + Math.sin((i + .3) * .9) * .22;
      const finger = plate(this.fist, [[-.29,-.45],[-.35,-.06],[-.22,.44],[.12,.52],[.31,.19],[.29,-.34]],
        .51, .085, i % 2 ? stone : slag, x, -.17, z);
      finger.rotation.x = .24;
    }
    plate(this.fist, [[-.35,-.50],[-.49,-.05],[-.28,.46],[.18,.45],[.45,-.04],[.22,-.42]],
      .58, .13, stone, -1.19, -.42, .25).rotation.y = -.47;

    const palette = createIllustratedCelMaterial({ color: 0xffffff });
    palette.vertexColors = true;
    const ink = createSilhouetteInk(.026, 0x241f2c);
    for (const part of [chassis, this.chest, this.head, this.jaw, this.shoulder, this.guard, this.upper, this.lower, this.fist]) {
      const movable = part.children.filter(child => child instanceof THREE.Group && child !== guardLimb);
      // Keep independent pivots out of the joint's merged art.
      movable.forEach(child => part.remove(child));
      bakePieces(part, palette);
      movable.forEach(child => part.add(child));
      for (const mesh of part.children) if (mesh instanceof THREE.Mesh && mesh.material === palette) inkMesh(mesh, ink);
    }
    this.pose(0);
  }

  pose(dt: number, windup?: number, recovery = 0): void {
    this.clock += dt;
    const loaded = windup === undefined ? 0 : ease(windup, 0, .76);
    const swing = windup === undefined ? 0 : ease(windup, .77, 1);
    const settle = ease(recovery, .04, .78);
    const weight = loaded * (1 - swing);
    const landing = swing * (1 - settle);
    const rebound = Math.sin(ease(recovery, 0, .35) * Math.PI) * landing;
    this.chest.rotation.set(-.18 * weight + .24 * landing - .058 * rebound,
      .27 * weight - .13 * landing, -.083 * weight + .115 * landing);
    this.chest.position.y = 5.10 + .18 * weight - .36 * landing + Math.sin(this.clock * 1.25) * .051;
    this.head.rotation.set(.18 * weight + .14 * landing, -.17 * weight - .16 - landing * .15, -.10 + .075 * weight);
    this.jaw.rotation.x = .045 + .27 * weight + .11 * rebound;
    this.guard.rotation.set(-.22 * weight + .25 * landing, -.11 * landing, -.12 * weight);
    this.shoulder.rotation.set(-.38 * weight + .21 * landing, -.17 * weight, -.17 * weight);
    this.core.color.set(0xf68452).lerp(HOT_CORE, Math.min(1, .94 * weight + .54 * landing));

    this.wrist.copy(REST).lerp(RAISED, loaded).lerp(CONTACT, swing).lerp(REST, settle);
    this.wrist.y += 1.68 * rebound + Math.sin(this.clock * 1.25) * .09 * (1 - landing);
    this.origin.copy(this.shoulder.position).applyQuaternion(this.chest.quaternion).add(this.chest.position);
    this.axis.copy(this.wrist).sub(this.origin);
    const distance = this.axis.length();
    this.axis.normalize();
    const reach = Math.min(distance, UPPER + LOWER - .05);
    const along = (UPPER ** 2 - LOWER ** 2 + reach ** 2) / (2 * reach);
    this.bend.set(1, -.57 + weight * .87, -.23);
    this.bend.addScaledVector(this.axis, -this.bend.dot(this.axis)).normalize();
    this.elbow.copy(this.origin).addScaledVector(this.axis, along)
      .addScaledVector(this.bend, Math.sqrt(UPPER ** 2 - along ** 2));
    this.wrist.copy(this.origin).addScaledVector(this.axis, reach);
    this.upper.position.copy(this.origin);
    this.upper.quaternion.setFromUnitVectors(forward, this.axis.copy(this.elbow).sub(this.origin).normalize());
    this.lower.position.copy(this.elbow);
    this.lower.quaternion.setFromUnitVectors(forward, this.axis.copy(this.wrist).sub(this.elbow).normalize());
    this.fist.position.copy(this.wrist);
    this.fist.rotation.set(.12 - .63 * weight + .52 * landing, -.18 + .34 * weight, .18 + .31 * weight - .25 * landing);
  }
}
