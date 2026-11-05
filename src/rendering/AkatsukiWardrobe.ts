import * as THREE from 'three';
import { hairLock, loft, panel, piece, smoothLoft } from './ArtMesh';

type Paint = (color: number) => THREE.MeshToonMaterial;
type Point = [number, number];

export function tailorAkatsukiWardrobe(toon: Paint) {
  const ink = toon(0x30263f);
  const plum = toon(0x513858);
  const wine = toon(0x903c51);
  const vermilion = toon(0xd66769);
  const steel = toon(0xaab3c8);
  const brass = toon(0xc8a27a);

  return {
    jacket(parent: THREE.Object3D) {
      piece(parent, smoothLoft([[-.115,.172,.112],[-.024,.181,.133],[.108,.149,.116],
        [.221,.163,.121],[.344,.214,.155,.013],[.438,.222,.137],[.509,.120,.087]], 18), ink);
      piece(parent, loft([[.485,.111,.094],[.558,.099,.096],[.603,.087,.089]], 17), plum);
      // The collar wraps from the raised left shoulder to a clasp at the hip.
      piece(parent, hairLock([[-.193,.437,.089],[-.147,.357,.134],[.008,.261,.169],
        [.133,.149,.127],[.163,.074,.089]], .069,.027), wine);
      piece(parent, hairLock([[-.209,.445,.087],[-.161,.364,.149],[.001,.282,.180],
        [.124,.169,.145],[.168,.090,.095]], .016,.012), vermilion);
      piece(parent, hairLock([[-.192,.437,-.096],[-.106,.358,-.131],[.055,.230,-.135],
        [.142,.129,-.110],[.168,.072,-.088]], .045,.019), wine);
      piece(parent, hairLock([[-.174,.448,-.100],[-.094,.365,-.144],[.064,.240,-.142],
        [.145,.136,-.115],[.167,.081,-.092]], .011,.009), vermilion);
      piece(parent, loft([[-.049,.182,.143],[.018,.200,.148],[.067,.170,.137]], 18), wine);
      piece(parent, loft([[-.020,.191,.153],[.013,.207,.157],[.035,.196,.149]], 18), plum);
      const clasp = piece(parent, new THREE.TorusGeometry(.036,.009,6,14), brass,.107,.012,.147);
      clasp.rotation.y = .26;
      piece(parent,new THREE.OctahedronGeometry(.025),vermilion,.106,.013,.154).scale.set(.75,1.15,.44);
      for (const offset of [-.032,.032]) {
        const cord = piece(parent,new THREE.CapsuleGeometry(.008,.044,3,7),brass,.108+offset,.042,.148);
        cord.rotation.z = -.53;
      }
    },

    shoulder(parent: THREE.Object3D, side: number) {
      if (side < 0) {
        piece(parent, loft([[-.14,.084,.074],[-.103,.105,.103,-.008,-.015],
          [-.075,.121,.111,-.009,-.021]], 14), plum);
        piece(parent, loft([[-.075,.121,.111,-.009,-.021],
          [-.054,.128,.115,-.010,-.025]], 14), vermilion);
        piece(parent, loft([[-.054,.128,.115,-.010,-.025],
          [-.029,.126,.115,-.010,-.028],[.03,.097,.087,-.011,-.025],
          [.079,.051,.052,-.01]], 14), wine);
      } else {
        piece(parent, smoothLoft([[-.116,.078,.079],[-.073,.090,.090],
          [.008,.097,.097],[.058,.064,.064]], 13), plum);
      }
    },

    bracer(parent: THREE.Object3D) {
      piece(parent, loft([[-.260,.054,.061],[-.239,.064,.070],[-.136,.075,.081],
        [-.069,.079,.082],[-.040,.067,.064]], 13), ink);
      piece(parent, panel([[0,-.052],[.045,-.094],[.046,-.154],[.029,-.224],
        [-.029,-.224],[-.046,-.154],[-.045,-.094]],.019),plum,0,0,.066);
      for (const y of [-.146,-.198,-.241]) {
        piece(parent, loft([[y-.017,.069,.073],[y+.001,.072,.078],[y+.008,.068,.076]], 13), wine);
      }
    },

    boots(shin: THREE.Object3D, foot: THREE.Object3D) {
      piece(shin,smoothLoft([[-.373,.057,.057],[-.299,.065,.067],[-.168,.075,.074],
        [-.083,.070,.071],[.016,.065,.068]],14),ink);
      piece(shin, panel([[0,.017],[.049,-.044],[.038,-.194],[.010,-.248],[-.032,-.216],[-.046,-.054]],
        .016),plum,0,0,.069);
      for (const y of [-.231,-.274]) {
        piece(shin,loft([[y-.015,.064,.074],[y+.007,.071,.076],[y+.017,.070,.074]],14),wine);
      }
      piece(foot,smoothLoft([[-.067,.072,.109,.058],[-.044,.076,.119,.064],
        [-.013,.065,.095,.052],[.022,.054,.059,.021]],14),ink);
      piece(foot,loft([[-.056,.076,.111,.061],[-.039,.077,.114,.063]],14),plum);
    },

    mask(parent: THREE.Object3D) {
      const patch = (bottom: number, top: number, rise: number, offset: number, material: THREE.Material) => {
        const positions: number[] = [], indices: number[] = [];
        const steps = 20;
        for (let i=0; i<=steps; i++) {
          const a = (i/steps-.5)*2.9;
          const cheek = Math.sin(a)**2;
          for (const y of [bottom+cheek*rise,top+cheek*rise*.59]) {
            const height = THREE.MathUtils.clamp((y+.13)/.12,0,1);
            const x = Math.sin(a)*(.086+.068*height+offset);
            const z = Math.cos(a)*(.103+.042*height+offset)+.025;
            positions.push(x,y,z);
          }
          if (i) {
            const j = 2*i;
            indices.push(j-2,j,j-1,j-1,j,j+1);
          }
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        piece(parent,geometry,material);
      };
      patch(-.144,-.028,.030,0,wine);
      patch(-.078,-.059,.017,.004,plum);
      patch(-.041,-.030,.019,.004,vermilion);
      const pin = piece(parent,new THREE.OctahedronGeometry(.013),brass,.143,-.044,.056);
      pin.scale.set(.48,1,.8);
    },

    sash(parent: THREE.Object3D) {
      for (const side of [-1,1]) {
        const columns = 10;
        const sample = (u: number, v: number) => new THREE.Vector3(
          side*(.09 + .12*v + u*(.077 + .026*v)) - .055*v*v,
          .037 - v*(side < 0 ? .72 : .57) + .092*u*u*v*v,
          -.013 - .174*v + .034*Math.cos((u+.35*v)*Math.PI*1.3),
        );
        for (const {offset,inside,u0,u1,material} of [
          {offset:-.004,inside:false,u0:-1,u1:1,material:wine},
          {offset:.004,inside:true,u0:-1,u1:1,material:plum},
          {offset:-.006,inside:false,u0:.72,u1:.89,material:vermilion},
        ]) {
          const xyz: number[] = [], indices: number[] = [];
          for (let row=0; row<=10; row++) {
            for (let col=0; col<=columns; col++) {
              const p = sample(THREE.MathUtils.lerp(u0,u1,col/columns),row/10);
              xyz.push(p.x,p.y,p.z+offset);
              if (!row || !col) continue;
              const d = row*(columns+1)+col, a = d-columns-2, b = a+1, c = d-1;
              indices.push(...(inside === (side < 0) ? [a,b,c,b,d,c] : [a,c,b,b,c,d]));
            }
          }
          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position',new THREE.Float32BufferAttribute(xyz,3));
          geo.setIndex(indices);
          geo.computeVertexNormals();
          piece(parent,geo,material);
        }
      }
    },

    blade(parent: THREE.Object3D, side: number) {
      const body: Point[] = [[-.035,.065],[.049,.083],[.086,.154],[.071,.239],
        [.014,.342],[-.021,.407],[-.049,.291],[-.065,.177]];
      const mirrored = (points: Point[]): Point[] => points.map(([x,y]) => [side*x,y]);
      const shape = new THREE.Shape(mirrored(body).map(([x,y]) => new THREE.Vector2(x,y)));
      const blade = piece(parent,new THREE.ExtrudeGeometry(shape,{
        depth:.023,bevelEnabled:true,bevelSegments:1,bevelThickness:.006,bevelSize:.008,steps:1,
      }),steel,0,.012,0);
      blade.rotation.x = Math.PI/2;
      for (const face of [-1,1]) {
        const fuller = piece(parent,panel(mirrored([[-.022,.091],[.051,.117],[.060,.166],[.014,.302],
          [-.018,.34],[-.041,.17]]).map(([x,z]) => [x,z*face]),.007),wine,0,-face*.012,0);
        fuller.rotation.x = face*Math.PI/2;
      }
      const handle = piece(parent,new THREE.CylinderGeometry(.021,.022,.143,10),ink,0,0,.015);
      handle.rotation.x = Math.PI/2;
      const pommel = piece(parent,new THREE.TorusGeometry(.034,.010,6,14),brass,0,0,-.079);
      pommel.rotation.x = Math.PI/2;
      const guard = piece(parent,new THREE.OctahedronGeometry(.059),brass,0,0,.085);
      guard.scale.set(1,.38,.54);
    },
  };
}
