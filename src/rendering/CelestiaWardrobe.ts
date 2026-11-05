import * as THREE from 'three';
import { hairLock, loft, panel, piece, smoothLoft } from './ArtMesh';

type Paint = (color: number) => THREE.MeshToonMaterial;

export function tailorCelestiaWardrobe(toon: Paint) {
  const midnight = toon(0x283457);
  const lapis = toon(0x465e88);
  const seaGlass = toon(0x88ced1);
  const pearl = toon(0xe5eff3);
  const silver = toon(0xc0c9da);
  const lining = toon(0x685a90);

  return {
    bodice(parent: THREE.Object3D, light: THREE.Material) {
      piece(parent, smoothLoft([[-.112,.178,.117],[-.051,.190,.132],[.025,.181,.130],
        [.101,.164,.125],[.202,.144,.122],[.31,.189,.162,.013],
        [.426,.223,.147],[.493,.145,.111]], 20), midnight);
      // Crossed lapels follow the curved jacket and meet at the waist.
      for (const side of [-1,1]) {
        piece(parent, hairLock([[side*.183,.458,.073],[side*.148,.386,.129],
          [side*.071,.250,.159],[-side*.065,.135,.149]], .051,.019), side < 0 ? pearl : lapis);
        piece(parent, hairLock([[side*.204,.447,.071],[side*.163,.374,.124],
          [side*.092,.237,.156],[-side*.052,.115,.15]], .012,.01), seaGlass);
      }
      piece(parent, loft([[.467,.126,.112],[.53,.109,.101],[.607,.098,.090]], 18), midnight);
      piece(parent, loft([[.586,.102,.096],[.607,.099,.093],[.613,.096,.091]], 18), silver);
      piece(parent, loft([[-.052,.204,.154],[-.011,.209,.149],[.056,.182,.141],[.087,.171,.137]], 18), lapis);
      const clasp = piece(parent, new THREE.TorusGeometry(.046,.008,6,16), silver, 0,.04,.153);
      clasp.scale.y = 1.20;
      piece(parent, new THREE.OctahedronGeometry(.034, 0), light, 0,.04,.161).scale.set(.72,1.26,.57);
    },

    shoulder(parent: THREE.Object3D, side: number) {
      const rim = side > 0 ? .111 : .129;
      piece(parent, smoothLoft([[-.099,.098,.101,-.002,side*.018],
        [-.041,rim,.112,-.005,side*.019],[.032,.097,.095,-.008,side*.012],
        [.073,.046,.055,-.008]], 15), side < 0 ? pearl : lapis);
      piece(parent, loft([[-.137,.083,.088,0,side*.012],[-.114,.095,.099,-.002,side*.017],
        [-.098,.098,.101,-.002,side*.018]], 15), side < 0 ? lapis : seaGlass);
    },

    sleeve(parent: THREE.Object3D) {
      piece(parent, smoothLoft([[-.252,.065,.068],[-.226,.074,.077],[-.150,.085,.091],
        [-.073,.075,.077],[-.023,.061,.059]], 14), midnight);
      piece(parent, loft([[-.259,.070,.071],[-.224,.082,.082],[-.204,.074,.076]], 15), pearl);
      piece(parent, loft([[-.263,.064,.065],[-.249,.072,.074]], 15), silver);
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
      piece(head, panel([[-.112,.140],[-.067,.103],[0,.085],[.067,.103],[.112,.140],
        [.064,.117],[0,.104],[-.064,.117]], .008), silver,0,0,.130);
      const jewel = piece(head, new THREE.OctahedronGeometry(.025), light, 0,.104,.149);
      jewel.scale.set(.72,1.28,.50);
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
