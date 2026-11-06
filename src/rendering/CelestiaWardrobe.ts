import * as THREE from 'three';
import { hairLock, loft, panel, piece, smoothLoft, type Section } from './ArtMesh';

type Paint = (color: number) => THREE.MeshToonMaterial;

export function tailorCelestiaWardrobe(toon: Paint) {
  const midnight = toon(0x283457);
  const lapis = toon(0x465e88);
  const seaGlass = toon(0x88ced1);
  const pearl = toon(0xe5eff3);
  const silver = toon(0xc0c9da);
  const lining = toon(0x685a90);

  // Paint the binding onto the same continuous surface as the fabric.
  const boundFabric = (
    parent: THREE.Object3D, rings: Section[], fabric: THREE.Color,
    binding: THREE.Color, edge: THREE.Color, start: number, end: number,
  ) => {
    const geometry = smoothLoft(rings, 24);
    const positions = geometry.getAttribute('position');
    const colors = new Float32Array(positions.count * 3);
    const tint = new THREE.Color();
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const hem = THREE.MathUtils.smoothstep(y, start - .002, start + .002)
        * (1 - THREE.MathUtils.smoothstep(y, end - .002, end + .002));
      const welt = 1 - THREE.MathUtils.smoothstep(Math.abs(y - (start + .005)), .001, .005);
      tint.copy(fabric).lerp(binding, hem).lerp(edge, welt * hem * .80).toArray(colors, i * 3);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    piece(parent, geometry, midnight);
  };

  return {
    hair(head: THREE.Object3D, tail: THREE.Object3D) {
      const silverBlue = new THREE.Color(0xc7daf4);
      const moonlight = new THREE.Color(0xfff7f2);
      const shade = new THREE.Color(0x7891bd);
      const tint = new THREE.Color();
      const painted = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, bias: number, loose = false) => {
        const positions = geometry.getAttribute('position');
        const colors = new Float32Array(positions.count * 3);
        for (let i = 0; i < positions.count; i++) {
          const y = positions.getY(i), x = positions.getX(i), z = positions.getZ(i);
          const slope = y + x * .30 + z * .20;
          const shine = loose
            ? THREE.MathUtils.smoothstep(slope, -.38, -.14) * (1 - THREE.MathUtils.smoothstep(slope, -.10, -.015))
            : THREE.MathUtils.smoothstep(slope, .078, .114) * (1 - THREE.MathUtils.smoothstep(slope, .136, .176));
          const underside = 1 - THREE.MathUtils.smoothstep(z, loose ? -.18 : -.06, loose ? -.08 : .09);
          tint.copy(silverBlue).lerp(shade, .12 + underside * .37 + bias)
            .lerp(moonlight, shine * .65).toArray(colors, i * 3);
        }
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        piece(parent, geometry, pearl);
      };
      const scalp = smoothLoft([[-.122,.066,.044,-.091],[-.087,.123,.066,-.078],
        [-.041,.147,.097,-.046],[.027,.158,.124,-.023],[.084,.163,.144,-.017],
        [.141,.157,.137,-.02],[.194,.122,.106,-.017],[.221,.072,.059,-.016],
        [.229,.028,.028,-.019]], 32);
      const scalpPoints = scalp.getAttribute('position');
      for (let i = 0; i < scalpPoints.count; i++) {
        const z = scalpPoints.getZ(i);
        const brow = 1 - THREE.MathUtils.smoothstep(scalpPoints.getY(i), .112, .166);
        const forehead = 1 - THREE.MathUtils.smoothstep(Math.abs(scalpPoints.getX(i)), .046, .123);
        scalpPoints.setZ(i, z - brow * forehead * THREE.MathUtils.smoothstep(z, .038, .113) * .029);
      }
      scalp.computeVertexNormals();
      painted(head, scalp, .07);
      painted(head, hairLock([[.044,.212,.062],[.012,.185,.126],[-.059,.125,.153],
        [-.091,.069,.145],[-.107,.019,.116]], .057,.020), -.07);
      painted(head, hairLock([[.015,.217,.054],[-.063,.171,.120],[-.117,.127,.128],
        [-.147,.055,.102],[-.163,-.043,.068]], .042,.022), .04);
      painted(head, hairLock([[.064,.204,.038],[.106,.177,.099],[.137,.114,.113],
        [.154,.029,.076],[.141,-.134,.019]], .043,.026), -.02);
      painted(head, hairLock([[.109,.162,.008],[.153,.105,.032],[.168,.014,.015],
        [.154,-.099,-.007],[.133,-.160,-.033]], .035,.023), .08);
      painted(head, hairLock([[-.100,.160,.045],[-.145,.098,.069],[-.164,.011,.072],
        [-.155,-.083,.058],[-.115,-.171,.050]], .038,.023), .05);
      // The long sections follow the hair joint and leave the collar visible.
      painted(tail, hairLock([[-.070,.064,.019],[-.136,-.125,-.081],[-.165,-.366,-.105],
        [-.131,-.576,-.191]], .078,.053), .05, true);
      painted(tail, hairLock([[.017,.058,.008],[-.014,-.118,-.105],[-.039,-.391,-.147],
        [-.091,-.649,-.238]], .092,.055), -.04, true);
      painted(tail, hairLock([[.072,.061,.010],[.108,-.106,-.086],[.137,-.292,-.111],
        [.165,-.492,-.186]], .077,.048), .01, true);
    },

    bodice(parent: THREE.Object3D, light: THREE.Material) {
      const jacket = smoothLoft([[-.112,.178,.117],[-.051,.190,.132],[.025,.181,.130],
        [.101,.164,.125],[.202,.144,.122],[.31,.189,.162,.013],
        [.426,.223,.147],[.493,.145,.111]], 24);
      piece(parent, jacket, midnight);
      // Draw each lapel against the actual jacket surface.
      const dressForm = new THREE.Mesh(jacket, midnight);
      const projection = new THREE.Raycaster();
      projection.ray.direction.set(0, 0, -1);
      const hits: THREE.Intersection[] = [];
      const tint = new THREE.Color();
      for (const side of [-1,1]) {
        const positions: number[] = [], colors: number[] = [], index: number[] = [];
        const paint = side < 0 ? pearl.color : lapis.color;
        const edges = [-1, -.92, -.70, .72, .93, 1];
        for (let row = 0; row <= 20; row++) {
          const t = row / 20;
          const y = .447 - t * .316;
          const center = side * (.161 - .213 * t ** 1.22);
          const width = .032 * (1 - .70 * t ** 2);
          for (const [column, edge] of edges.entries()) {
            const x = center + edge * width;
            projection.ray.origin.set(x, y, 1);
            hits.length = 0;
            projection.intersectObject(dressForm, false, hits);
            const z = hits[0]?.point.z ?? .06;
            const fold = (1 - edge * edge) * .006;
            positions.push(x, y, z + (side < 0 ? .019 : .008) + fold);
            tint.copy(paint).lerp(seaGlass.color, column === 1 || column === 4 ? .78 : 0);
            if (column === 0 || column === 5) tint.multiplyScalar(.72);
            colors.push(tint.r, tint.g, tint.b);
            if (!row || !column) continue;
            const d = row * edges.length + column;
            const a = d - edges.length - 1;
            index.push(a, d - 1, a + 1, a + 1, d - 1, d);
          }
        }
        const lapel = new THREE.BufferGeometry()
          .setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
          .setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
          .setIndex(index);
        lapel.computeVertexNormals();
        piece(parent, lapel, midnight);
      }
      boundFabric(parent, [[.467,.126,.112],[.53,.109,.101],[.581,.099,.091],
        [.586,.102,.095],[.591,.102,.095],[.608,.099,.093],[.614,.095,.089]],
      midnight.color, silver.color, pearl.color, .586, .618);
      piece(parent, loft([[-.052,.204,.154],[-.011,.209,.149],[.056,.182,.141],[.087,.171,.137]], 18), lapis);
      const clasp = piece(parent, new THREE.TorusGeometry(.046,.008,6,16), silver, 0,.04,.153);
      clasp.scale.y = 1.20;
      piece(parent, new THREE.OctahedronGeometry(.034, 0), light, 0,.04,.161).scale.set(.72,1.26,.57);
    },

    shoulder(parent: THREE.Object3D, side: number) {
      const crown = side > 0 ? .111 : .129;
      boundFabric(parent, [[-.151,.082,.087,0,side*.013],[-.139,.091,.097,0,side*.017],
        [-.134,.094,.100,-.001,side*.019],[-.121,.097,.102,-.002,side*.019],
        [-.109,.100,.104,-.003,side*.019],[-.104,.100,.104,-.003,side*.019],
        [-.098,.099,.103,-.003,side*.019],[-.038,crown,.115,-.004,side*.020],
        [.030,.098,.097,-.006,side*.012],[.076,.046,.055,-.008]],
      side < 0 ? pearl.color : lapis.color, side < 0 ? lapis.color : seaGlass.color,
      side < 0 ? silver.color : pearl.color, -.139, -.104);
    },

    sleeve(parent: THREE.Object3D) {
      boundFabric(parent, [[-.263,.063,.067],[-.258,.069,.073],[-.251,.072,.076],
        [-.231,.081,.083],[-.208,.081,.084],[-.201,.079,.084],[-.150,.085,.091],
        [-.073,.075,.077],[-.023,.061,.059]],
      midnight.color, pearl.color, seaGlass.color, -.258, -.209);
    },

    boots(shin: THREE.Object3D, foot: THREE.Object3D) {
      piece(shin, smoothLoft([[-.366,.056,.059],[-.268,.066,.066],[-.166,.081,.088],
        [-.082,.074,.079],[-.046,.071,.072],[.027,.064,.067]], 14), midnight);
      piece(shin, loft([[-.082,.078,.083],[-.056,.077,.083],[-.034,.073,.076]], 14), silver);
      piece(shin, panel([[0,.008],[.026,-.042],[.015,-.213],[0,-.269],[-.015,-.213],[-.026,-.042]],
        .012), seaGlass, 0,-.055,.077);
      piece(foot, smoothLoft([[-.067,.066,.106,.061],[-.044,.076,.117,.062],[-.011,.067,.106,.057],
        [.02,.047,.055,.026]], 15), midnight);
    },

    jewelry(head: THREE.Object3D, light: THREE.Material) {
      piece(head, panel([[-.070,.120],[-.044,.099],[0,.081],[.040,.096],[.077,.129],
        [.044,.113],[0,.096],[-.046,.110]], .005), silver,0,0,.128);
      piece(head, panel([[0,.024],[.015,0],[0,-.027],[-.015,0]], .008), silver, 0,.097,.136);
      const jewel = piece(head, new THREE.OctahedronGeometry(.018), light, 0,.097,.149);
      jewel.scale.set(.56,1.13,.42);
      for (const side of [-1,1]) {
        piece(head, new THREE.TorusGeometry(.025,.005,6,14), silver,side*.163,-.058,.014)
          .rotation.y = side*.30;
        piece(head, new THREE.OctahedronGeometry(.021, 0), seaGlass, side*.164,-.095,.02)
          .scale.set(.54,1.37,.62);
      }
    },

    coatTails(parent: THREE.Object3D) {
      for (const side of [-1,1]) {
        const sample = (u: number, v: number) => new THREE.Vector3(
          side * (.107 + .090*v + u*(.082+.055*v)),
          .047 - v*(side < 0 ? .78 : .85) + .083*u*u*v**4,
          -.022 - .13*v - .039*Math.cos((u+.20*v)*Math.PI*1.4)*(.52+v*.48),
        );
        const surface = (u0: number, u1: number, offset: number, back: boolean, material: THREE.Material) => {
          const pos: number[] = [], indices: number[] = [];
          const columns = 12;
          for (let r = 0; r <= 12; r++) {
            for (let c = 0; c <= columns; c++) {
              const point = sample(THREE.MathUtils.lerp(u0,u1,c/columns),r/12);
              pos.push(point.x,point.y,point.z+offset);
              if (!r || !c) continue;
              const d = r*(columns+1)+c, a = d-columns-2, b = a+1, t = d-1;
              indices.push(...(back === (side > 0) ? [a,b,t,b,d,t] : [a,t,b,b,t,d]));
            }
          }
          const mesh = new THREE.BufferGeometry();
          mesh.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
          mesh.setIndex(indices);
          mesh.computeVertexNormals();
          piece(parent, mesh, material);
        };
        surface(-1,1,-.004,true,midnight);
        surface(-1,1,.004,false,lining);
        surface(.60,.80,-.006,true,seaGlass);
        surface(-.93,-.83,-.006,true,silver);
        surface(.60,.80,.006,false,pearl);
      }
    },

    staff(parent: THREE.Object3D, light: THREE.Material) {
      const socket = 1.15;
      const sleeve = (radius: number, length: number, z: number, paint: THREE.Material) => {
        piece(parent, new THREE.CylinderGeometry(radius,radius*.91,length,10),paint,0,0,z)
          .rotation.x = Math.PI/2;
      };
      sleeve(.025,1.48,.32,midnight);
      sleeve(.032,.25,.045,lapis);
      for (const z of [-.392,-.084,.177,.81,.883]) sleeve(.039,.032,z,silver);
      sleeve(.055,.11,.92,pearl);
      const ecliptic = piece(parent, new THREE.TorusGeometry(.228,.020,7,24), silver, 0,0,socket);
      ecliptic.rotation.set(.80,.18,-.35);
      const meridian = piece(parent, new THREE.TorusGeometry(.181,.013,6,20), pearl, 0,0,socket);
      meridian.rotation.set(-.31,1.04,.10);
      const prism = piece(parent,new THREE.OctahedronGeometry(.108),light,0,0,socket);
      prism.scale.set(.76,.79,1.57);
      for (const [x,y,z] of [[.20,.025,1.25],[-.17,-.015,1.025],[.022,.132,1.13]]) {
        piece(parent,new THREE.OctahedronGeometry(.033),seaGlass,x,y,z);
      }
    },
  };
}
