import * as THREE from 'three';
import { loft, piece, smoothLoft } from './ArtMesh';

type Point = [number, number];
type Paint = (color: number) => THREE.MeshToonMaterial;
const ivory = 0xf3e4cc;
const bevelGold = 0xc59554;
const brightGold = 0xffd897;
const steel = 0x34445e;
const darkSteel = 0x20293d;
const scarlet = 0xa73540;
const oxblood = 0x561e32;

function plate(
  parent: THREE.Object3D, outline: Point[], paint: THREE.Material, depth: number,
  z: number, curve = 0, bevel = 0.008,
): THREE.Mesh {
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1, steps: 1,
  });
  const positions = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');
  const normal = new THREE.Vector3();
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    positions.setZ(i, positions.getZ(i) - curve * x ** 2);
    normal.fromBufferAttribute(normals, i);
    normal.x += 2 * curve * x * normal.z;
    normal.normalize();
    normals.setXYZ(i, normal.x, normal.y, normal.z);
  }
  return piece(parent, geometry, paint, 0, 0, z);
}

function cord(parent: THREE.Object3D, points: THREE.Vector3[], radius: number, paint: THREE.Material): void {
  piece(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 14, radius, 5), paint);
}

export function forgeBrynhildrWardrobe(toon: Paint) {
  const enamel = toon(ivory);
  const gold = toon(bevelGold);
  const gilt = toon(brightGold);
  const shadow = toon(darkSteel);
  const blue = toon(steel);
  const red = toon(scarlet);
  const lining = toon(oxblood);

  return {
    cuirass(parent: THREE.Object3D) {
      const outline: Point[] = [[-.233,.425],[-.134,.468],[-.064,.421],[0,.403],[.064,.421],
        [.134,.468],[.233,.425],[.214,.285],[.159,.196],[.082,.143],[0,.122],[-.082,.143],
        [-.159,.196],[-.214,.285]];
      plate(parent, outline, shadow, .027, .148, 1.62, .012);
      plate(parent, outline.map(([x,y]) => [x * .93, .316 + (y - .316) * .90]), gold, .014, .185, 1.56);
      plate(parent, outline.map(([x,y]) => [x * .85, .317 + (y - .317) * .80]), enamel, .018, .207, 1.64);
      // Raised central keel and two overlapping abdominal lames.
      plate(parent, [[0,.406],[.025,.312],[.019,.236],[0,.195],[-.019,.236],[-.025,.312]],
        gilt, .01, .228, 0, .004);
      for (const [y, width, z] of [[.100,.176,.164],[.054,.162,.156]]) {
        plate(parent, [[-width,y+.024],[0,y+.003],[width,y+.024],[width*.82,y-.017],
          [0,y-.024],[-width*.82,y-.017]], blue, .017, z, 1.0, .006);
      }
      for (const side of [-1, 1]) {
        const x = side * .142;
        const clasp = piece(parent, new THREE.OctahedronGeometry(.039, 0), gilt, x, .458, .156);
        clasp.scale.set(1, 1, .62);
        cord(parent, [new THREE.Vector3(x,.453,.163), new THREE.Vector3(side*.205,.43,.123),
          new THREE.Vector3(side*.244,.40,.055)], .012, lining);
        // Split tassets leave room for the forward thigh in lunges.
        const tassetOutline: Point[] = [[-.064,.051],[.066,.051],[.079,-.026],[.037,-.105],[-.053,-.073]];
        const tasset = plate(parent, tassetOutline.map(([px, py]) => [side * px, py]),
          blue, .018, .149, 1.0, .008);
        tasset.position.x = side * .144;
        tasset.position.y = -.049;
        tasset.rotation.z = side * .20;
      }
    },

    pauldron(parent: THREE.Object3D, side: number) {
      const shieldArm = side < 0;
      const outer = shieldArm ? .170 : .132;
      const offset = side * (shieldArm ? .040 : .024);
      piece(parent, loft([[-.17,.088,.09,0,offset*.6],[-.124,outer*.77,.111,0,offset*.75],
        [-.097,outer*.91,.124,0,offset],[-.064,outer*.94,.118,0,offset]], 12), shadow);
      piece(parent, loft([[-.126,outer*.77,.111,0,offset*.75],[-.111,outer*.86,.119,0,offset*.87],
        [-.096,outer*.91,.126,0,offset]], 12), gold);
      piece(parent, loft([[-.096,outer*.91,.126,0,offset],[-.069,outer,.138,0,offset],
        [-.019,outer,.132,-.004,offset],[.039,outer*.84,.116,-.01,offset*.8],
        [.083,outer*.63,.091,-.016,offset*.45],[.111,outer*.24,.044,-.02,0]], 12), enamel);
      const crest = plate(parent, [[-.049,-.04],[0,.028],[.057,-.046],[.014,-.073],[-.015,-.075]],
        blue, .012, .133, 1.75, .006);
      crest.position.x = offset;
      piece(parent, new THREE.OctahedronGeometry(.016, 0), gilt, offset,.002,.15);
    },

    vambrace(parent: THREE.Object3D, side: number) {
      plate(parent, [[-.069,-.032],[0,.011],[.069,-.032],[.073,-.170],[.047,-.244],
        [0,-.262],[-.047,-.244],[-.073,-.170]], shadow, .021, .065, 1.38);
      plate(parent, [[-.051,-.063],[0,-.032],[.051,-.063],[.044,-.182],[0,-.226],[-.044,-.182]],
        side > 0 ? enamel : blue, .017, .095, 1.38, .006);
      if (side < 0) {
        plate(parent, [[-.035,-.294],[.035,-.294],[.041,-.27],[0,-.251],[-.041,-.27]],
          gold, .012, .049, 1.2, .005);
      }
    },

    greave(parent: THREE.Object3D) {
      plate(parent, [[-.074,-.09],[-.058,-.004],[0,.048],[.058,-.004],[.074,-.09],
        [.063,-.184],[.042,-.304],[0,-.337],[-.042,-.304],[-.063,-.184]], shadow, .021, .068, 1.3);
      plate(parent, [[-.06,-.076],[0,-.02],[.06,-.076],[.043,-.208],[0,-.293],[-.043,-.208]],
        enamel, .020, .099, 1.43, .007);
      plate(parent, [[-.059,-.023],[0,.030],[.059,-.023],[.042,-.066],[0,-.092],[-.042,-.066]],
        gold, .019, .109, 1.42, .007);
      plate(parent, [[0,-.100],[.017,-.152],[.008,-.247],[0,-.270],[-.008,-.247],[-.017,-.152]],
        gilt, .008, .127, 0, .003);
    },

    boot(parent: THREE.Object3D) {
      piece(parent, loft([[-.065,.068,.108,.066],[-.048,.072,.115,.064],[-.017,.071,.112,.062],
        [.014,.057,.054,.02]], 14), shadow);
      piece(parent, smoothLoft([[-.046,.067,.080,.10],[-.015,.070,.081,.096],[.01,.051,.056,.077],
        [.025,.024,.027,.048]], 14), blue);
    },

    circlet(parent: THREE.Object3D) {
      for (const side of [-1, 1]) {
        const mirror = (points: Point[]): Point[] => points.map(([x,y]) => [x*side,y]);
        plate(parent, mirror([[.108,.069],[.123,.161],[.165,.197],[.222,.231],
          [.205,.173],[.179,.14],[.166,.084],[.139,.043]]), shadow, .018, .008, .52, .006);
        plate(parent, mirror([[.124,.087],[.137,.157],[.162,.183],[.206,.215],
          [.183,.165],[.158,.145],[.148,.084]]), gold, .011, .035, .54, .004);
        plate(parent, mirror([[.141,.143],[.168,.184],[.198,.207],[.177,.17],[.152,.152]]),
          gilt, .008, .049, .54, .003);
      }
    },

    mantle(parent: THREE.Object3D) {
      const sample = (u: number, v: number) => new THREE.Vector3(
        u * (.188 + v*.131) - .041 * v*v,
        .018 - .81*v + v**4 * (.115*Math.abs(u) + .075*(1-Math.abs(u))),
        -.009 - .161*v - .044*Math.cos(u*3*Math.PI+v*.72)*(.21+v*.79),
      );
      const clothSurface = (back: boolean) => {
        const vertices: number[] = [];
        const indices: number[] = [];
        const columns = 20;
        for (let row = 0; row <= 12; row++) {
          for (let col = 0; col <= columns; col++) {
            const point = sample(2*col/columns-1, row/12);
            vertices.push(point.x, point.y, point.z + (back ? -.005 : .005));
            if (row && col) {
              const d = row*(columns+1)+col, c = d-1, b = d-columns-1, a = b-1;
              indices.push(...(back ? [a,b,c,b,d,c] : [a,c,b,b,c,d]));
            }
          }
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        piece(parent, geometry, back ? red : lining);
      };
      clothSurface(false);
      clothSurface(true);
      for (const side of [-1, 1]) {
        cord(parent, Array.from({length: 13}, (_,i) => sample(side*.95, i/12)), .011, gold);
        cord(parent, Array.from({length: 9}, (_,i) => sample(side*.47, .08+i*.072)), .007, lining);
      }
      cord(parent, Array.from({length: 15}, (_,i) => sample(i/7-1, .984)), .013, gold);
    },

    spear(parent: THREE.Object3D, glow: THREE.Material) {
      const collar = (radius: number, length: number, z: number, paint: THREE.Material) => {
        const mesh = piece(parent, new THREE.CylinderGeometry(radius, radius*.90, length, 10), paint, 0, 0, z);
        mesh.rotation.x = Math.PI/2;
      };
      collar(.026, 1.79, .373, shadow);
      collar(.036, .33, -.065, lining);
      for (const z of [-.246,.095,1.04,1.143]) collar(.041, .036, z, gold);
      collar(.039, .14, -.54, gold);
      collar(.065, .13, 1.24, blue);
      // Forged blade with a raised spine and real edge bevels on both sides.
      const ring: Array<[number,number]> = [[0,1.22],[.094,1.35],[.103,1.49],[.058,1.69],
        [0,1.94],[-.058,1.69],[-.103,1.49],[-.094,1.35]];
      const blade = plate(parent, ring, enamel, .030, 0, 0, .009);
      blade.position.y = .015;
      blade.rotation.x = Math.PI/2;
      for (const sign of [-1, 1]) {
        const keel = plate(parent, [[0,1.28*sign],[.043,1.46*sign],[0,1.86*sign],[-.043,1.46*sign]],
          sign > 0 ? blue : gold, .012, .014, 0, .006);
        keel.rotation.x = sign*Math.PI/2;
        keel.position.set(0,-sign*.016,0);
      }
      piece(parent, new THREE.OctahedronGeometry(.062), glow, 0, 0, 1.325).scale.set(.71,.63,1.35);
    },

    shield(parent: THREE.Object3D, glow: THREE.Material) {
      const shield = new THREE.Group();
      shield.position.set(-.052,-.136,.113);
      shield.rotation.z = -.11;
      parent.add(shield);
      const shape: Point[] = [[0,.23],[.156,.169],[.188,.105],[.162,-.064],[.091,-.177],
        [0,-.249],[-.091,-.177],[-.162,-.064],[-.188,.105],[-.156,.169]];
      plate(shield, shape, shadow, .037, 0, 1.25, .012);
      plate(shield, shape.map(([x,y]) => [x*.92,y*.92]), gold, .020, .043, 1.24);
      plate(shield, shape.map(([x,y]) => [x*.80,y*.80]), blue, .017, .067, 1.24);
      for (const side of [-1,1]) {
        plate(shield, [[0,.037],[side*.105,.089],[side*.089,.018],[side*.038,-.058],[0,-.111]],
          enamel, .010, .087, 1.15, .004);
      }
      piece(shield, new THREE.OctahedronGeometry(.049), glow, 0,.04,.117).scale.set(.71,1,.49);
      const handle = piece(parent, new THREE.CylinderGeometry(.026, .026, .134, 10), lining, 0, -.29, .013);
      handle.rotation.x = Math.PI / 2;
      piece(parent, new THREE.CylinderGeometry(.031, .031, .046, 10), gold, 0, -.29, .084)
        .rotation.x = Math.PI / 2;
      piece(parent, loft([[-.158,.076,.080,.007],[-.154,.080,.084,.007],
        [-.123,.082,.085,.007],[-.119,.078,.081,.007]], 14), lining);
      plate(parent, [[-.031,-.156],[.031,-.156],[.031,-.121],[-.031,-.121]],
        gold, .012, -.077, 0, .003).rotation.y = Math.PI;
    },
  };
}
