import * as THREE from 'three';
import { beam, loft, panel, piece, smoothLoft } from './ArtMesh';

const point = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export function buildRefugeLodge(
  parent: THREE.Group,
  x: number,
  z: number,
  w: number,
  d: number,
  paint: (color: number) => THREE.Material,
): void {
  const lodge = new THREE.Group();
  lodge.position.set(x, 0, z);
  parent.add(lodge);
  const wood = paint(0x624235), cutWood = paint(0x966747), darkness = paint(0x433430);
  const mortar = paint(0x746c64), lime = paint(0xd5ba92);
  const stone = [paint(0x9e998b), paint(0x7f8c89), paint(0xb3a38d), paint(0x8e8078)];
  const slate = [paint(0x3e555d), paint(0x546d71), paint(0x657e7b), paint(0x778b82)];
  const canvas = [paint(0xc17b63), paint(0x9b564b), paint(0xe0ac82)];
  const bronze = paint(0xc29961), light = new THREE.MeshBasicMaterial({ color: 0xf9c981 });
  const box = (mat: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number, group = lodge) => {
    const block = piece(group, new THREE.BoxGeometry(w, h, d), mat, x, y, z);
    block.castShadow = true;
    block.receiveShadow = true;
    return block;
  };
  const eave = 2.26, pitch = .53, length = w * .61;
  box(mortar, w, .72, d, 0, .36, 0);
  box(lime, w - .04, eave - .69, d - .04, 0, (eave + .69) / 2, 0);
  box(wood, w + .15, .15, d + .14, 0, .72, 0);
  box(wood, w + .17, .18, d + .16, 0, eave - .04, 0);

  for (const side of [-1, 1]) {
    const gable = piece(lodge, panel([[-w / 2, 0], [w / 2, 0], [0, 1.23]], .10), lime,
      0, eave - .08, side * d / 2 - .05);
    gable.castShadow = gable.receiveShadow = true;
    for (const corner of [-1, 1]) {
      box(wood, .16, eave, .17, corner * (w / 2 - .045), eave / 2, side * (d / 2 - .036));
      const frame = beam(lodge, cutWood, point(0, eave + 1.19, side * (d / 2 + .07)),
        point(corner * (w / 2 + .12), eave - .02, side * (d / 2 + .07)), .14, .12);
      frame.castShadow = true;
      beam(lodge, wood, point(corner * (w / 2 - .13), .84, side * (d / 2 + .026)),
        point(corner * (w / 2 - .75), 1.55, side * (d / 2 + .026)), .087);
    }
    box(wood, .13, 1.12, .11, 0, eave + .48, side * (d / 2 + .049));
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 8; col++) {
        const offset = (row % 2) * .13;
        const sx = -w * .46 + col * w * .118 + offset;
        const sy = .15 + row * .26;
        const block = piece(lodge, panel([[-.21,-.073],[-.14,-.12],[.13,-.117],[.215,-.06],
          [.189,.092],[-.135,.11],[-.22,.064]], .055),
        stone[(row * 3 + col * 5 + side + 4) % 4], sx, sy, side * (d / 2 + .012));
        block.rotation.y = side > 0 ? 0 : Math.PI;
        block.rotation.z = Math.sin(col * 9.3 + row * 3.2) * .10;
        block.receiveShadow = true;
      }
    }
    for (const windowX of side > 0 ? [-.96, .96] : [-1.18, 1.18]) {
      const face = side * (d / 2 + .09);
      box(wood, .78, .76, .15, windowX, 1.53, face);
      box(light, .59, .54, .035, windowX, 1.54, face + side * .083);
      box(darkness, .055, .55, .066, windowX, 1.54, face + side * .105);
      box(darkness, .60, .055, .068, windowX, 1.56, face + side * .105);
      box(cutWood, .90, .09, .24, windowX, 1.15, face + side * .06);
    }
  }
  const entry = -d / 2;
  box(wood, 1.08, 1.91, .20, 0, .99, entry);
  box(darkness, .87, 1.68, .15, 0, .92, entry - .10);
  for (let i = 0; i < 5; i++) box(i % 2 ? wood : cutWood, .16, 1.61, .055, (i - 2) * .17, .93, entry - .188);
  for (const height of [.48, 1.46]) box(wood, .84, .10, .081, 0, height, entry - .206);
  box(bronze, .08, .086, .07, .29, .89, entry - .257);
  box(stone[2], 1.16, .16, .41, 0, .08, entry - .20);

  for (const side of [-1, 1]) {
    const roof = new THREE.Group();
    roof.position.y = eave + 1.25;
    roof.rotation.z = -side * pitch;
    lodge.add(roof);
    box(slate[0], length + .14, .13, d + .48, side * length / 2, -.035, 0, roof);
    for (let row = 0; row < 7; row++) {
      const tileWidth = length / 7 + .125;
      const rowX = side * (length - (row + .5) * length / 7);
      for (let col = 0; col < 10; col++) {
        const z = (col - 4.5) * (d + .40) / 10 + (row % 2 ? .095 : -.095);
        const a = tileWidth * .5, b = (d + .36) * .051;
        const edge = .024 + (col * 17 % 7) * .006;
        const tile = piece(roof, panel([[-a,-b + edge],[-a + edge,-b],[a - edge,-b + .009],
          [a,-b + edge],[a - .014,b - edge],[a - edge,b],[-a + edge,b - .004],[-a,b - edge]], .047),
        slate[(row * 9 + col * 7 + Math.floor(col / 4)) % slate.length], rowX, .035 + row * .008, z);
        tile.rotation.set(-Math.PI / 2, 0, Math.sin(row * 7 + col * 17) * .024);
        tile.receiveShadow = true;
      }
    }
    box(cutWood, .17, .16, d + .60, side * (length + .035), -.04, 0, roof);
    if (side < 0) {
      // A salvaged canvas patch is stretched over the roof beside the chimney.
      const sample = (u: number, v: number) => point(-.61 - v * 1.64, .129 + (1 - v) * .033 +
        Math.sin(u * 9.8 + v) * .016 * Math.sin(v * Math.PI), .42 + u * 1.25 + Math.sin(v * 2.3) * .13);
      for (const [stripe, [lo, hi]] of [[0, .13], [.13, .82], [.82, 1]].entries()) {
        const positions: number[] = [], indices: number[] = [];
        const span = 10;
        for (let row = 0; row <= 9; row++) {
          for (let col = 0; col <= span; col++) {
            const p = sample(THREE.MathUtils.lerp(lo, hi, col / span), row / 9);
            positions.push(p.x, p.y, p.z);
            if (row && col) {
              const i = row * (span + 1) + col;
              indices.push(i - span - 2, i - 1, i - span - 1, i - span - 1, i - 1, i);
            }
          }
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        piece(roof, geometry, canvas[stripe === 1 ? 0 : stripe === 0 ? 2 : 1]).receiveShadow = true;
      }
      for (const u of [0, 1]) {
        const cord = new THREE.CatmullRomCurve3(Array.from({ length: 7 }, (_, i) => {
          const p = sample(u, i / 6);
          return p.add(point(0, .025, 0));
        }));
        piece(roof, new THREE.TubeGeometry(cord, 10, .018, 5), canvas[2]);
      }
    }
  }
  for (let i = 0; i < 11; i++) {
    const cap = piece(lodge, new THREE.CylinderGeometry(.125, .145, .33, 7),
      slate[(i + 1) % 4], 0, eave + 1.37, (i - 5) * .37);
    cap.rotation.x = Math.PI / 2;
    cap.castShadow = true;
  }
  box(mortar, .57, 1.73, .64, .98, 2.90, .70);
  for (let i = 0; i < 6; i++) box(stone[(i + 1) % 4], .59, .19, .66, .98, 2.50 + i * .226, .70);
  box(stone[0], .77, .15, .81, .98, 3.78, .70);
  box(darkness, .45, .028, .49, .98, 3.862, .70);
}

export function buildRefugeFire(
  scenery: THREE.Group,
  parent: THREE.Group,
  time: THREE.IUniform<number>,
  paint: (color: number) => THREE.Material,
): void {
  const x = 28, z = 8;
  const char = paint(0x473933), bark = paint(0x70513e);
  const stone = [paint(0x847c70), paint(0x9a8875), paint(0x6f7873)];
  piece(scenery, loft([[.013,.60,.53],[.036,.59,.52],[.044,.46,.44]], 15), char, x, 0, z).receiveShadow = true;
  for (let i = 0; i < 10; i++) {
    const angle = i * Math.PI / 5 + Math.sin(i * 13) * .10;
    const rock = piece(scenery, new THREE.DodecahedronGeometry(.25, 0), stone[i % 3],
      x + Math.cos(angle) * .59, .123, z + Math.sin(angle) * .53);
    rock.scale.set(1.0 + Math.sin(i * 13) * .19, .57 + (i % 3) * .13, .79);
    rock.rotation.set(.15 + i * .28, i * .51, .17);
    rock.receiveShadow = true;
    rock.castShadow = true;
  }
  for (const [i, angle] of [.41, 2.03, 3.59, 5.21].entries()) {
    const start = point(x + Math.sin(angle) * .42, .13, z + Math.cos(angle) * .38);
    const end = point(x - Math.sin(angle) * .15, .30 + i * .045, z - Math.cos(angle) * .16);
    const log = piece(scenery, new THREE.CylinderGeometry(.071, .102, start.distanceTo(end), 7), i % 2 ? char : bark);
    log.position.copy(start).lerp(end, .5);
    log.quaternion.setFromUnitVectors(point(0, 1, 0), end.sub(start).normalize());
    log.castShadow = true;
  }
  const flame = new THREE.ShaderMaterial({
    uniforms: { time },
    side: THREE.DoubleSide,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec2 vUv;
      float tongue(vec2 p, float offset, float height, float width, float phase) {
        float h = p.y / height;
        float bend = sin(h * 5.9 - time * 5.4 + phase) * (.045 + .23 * h);
        float edge = width * max(.0, 1.0 - h) * (.51 + sin(clamp(h, 0.0, 1.0) * 3.14));
        return edge - abs(p.x - offset - bend);
      }
      void main() {
        vec2 p = vec2(vUv.x * 2.0 - 1.0, vUv.y);
        float height = .82 + sin(time * 6.7) * .12 + sin(time * 13.1) * .044;
        float form = max(tongue(p, -.12, height, .52, .41),
          max(tongue(p, .30, height * .69, .38, 1.9), tongue(p, -.39, height * .52, .25, 4.1)));
        if (form < .0) discard;
        float heat = form * 1.14 - p.y * .32;
        vec3 color = mix(vec3(.83,.12,.034), vec3(1.0,.45,.086), step(.025, heat));
        color = mix(color, vec3(1.0,.83,.39), step(.19, heat));
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const shape = new THREE.PlaneGeometry(1.18, 1.18);
  for (const angle of [.31, 1.91]) piece(parent, shape, flame, x, .80, z).rotation.y = angle;
}

export function buildRefugeBridge(parent: THREE.Group, paint: (color: number) => THREE.Material): void {
  const bridge = new THREE.Group();
  bridge.position.set(16.04, 0, 5);
  parent.add(bridge);
  const oak = paint(0x614638), trim = paint(0x977357), grain = paint(0x684d42);
  const boards = [0x8f6b50, 0x9e7959, 0x8c6550, 0xa58463, 0x765a49].map(paint);
  const stone = [0x807e78, 0xa19985, 0x8f8b7e].map(paint);
  const iron = paint(0x434c4b), rope = paint(0xa69271);
  const block = (mat: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number) => {
    const mesh = piece(bridge, new THREE.BoxGeometry(w, h, d), mat, x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    return mesh;
  };
  for (const side of [-1, 1]) {
    for (let row = 0; row < 2; row++) {
      for (let j = 0; j < 7; j++) {
        const pier = block(stone[(j + row + 1) % 3], .88 - row * .16, .26, .58,
          side * (3.89 + (j % 3) * .036), -.46 + row * .243, (j - 3) * .59 + (row % 2) * .11);
        pier.rotation.y = Math.sin(j * 16.2 + side) * .09;
      }
    }
    block(oak, 8.46, .29, .22, 0, -.14, side * 1.77);
    const handrail = block(oak, 8.42, .16, .18, 0, .65, side * 2.12);
    handrail.rotation.y = side * .003;
    block(trim, 8.45, .043, .205, 0, .751, side * 2.12);
    for (let bay = 0; bay < 6; bay++) {
      const x = (bay - 2.5) * 1.60;
      const post = block(oak, .20, .91, .22, x, .32, side * 2.12);
      post.rotation.z = Math.sin(bay * 13.1) * .026;
      block(trim, .233, .057, .255, x, .791, side * 2.12);
      for (const y of [.13, .189]) block(rope, .228, .031, .248, x, y, side * 2.12);
      if (bay < 5) {
        const brace = beam(bridge, oak, point(x + .056, .19, side * 2.12),
          point(x + 1.53, .61, side * 2.12), .075, .080);
        brace.receiveShadow = true;
      }
    }
  }
  for (let i = 0; i < 20; i++) {
    const x = (i - 9.5) * .412;
    const half = .197, span = 2.077 + Math.sin(i * 3.4) * .041;
    const board = piece(bridge, panel([[-half,-span + .062],[-half + .044,-span],
      [half - .025,-span + .012],[half,-span + .046],[half - .006,span - .071],
      [half - .038,span],[-half + .025,span - .02],[-half,span - .083]], .158),
    boards[(i * 3 + Math.floor(i / 3)) % boards.length], x, -.12, 0);
    board.rotation.set(-Math.PI / 2, 0, Math.sin(i * 31.1) * .008);
    board.castShadow = board.receiveShadow = true;
    for (const side of [-1, 1]) {
      const nail = piece(bridge, new THREE.CylinderGeometry(.029, .031, .012, 7),
        iron, x + .048, .042, side * (1.79 + Math.cos(i) * .042));
      nail.receiveShadow = true;
    }
    if (i % 3 !== 1) {
      const streak = piece(bridge, panel([[-.014,-.32],[.013,-.18],[.021,.15],[.002,.58],
        [-.008,.23],[-.018,-.079]], .001), grain, x + Math.sin(i * 2) * .093, .039, Math.cos(i * 7.1) * 1.08);
      streak.rotation.x = -Math.PI / 2;
      streak.receiveShadow = true;
    }
  }
}

export function buildRefugeGrove(parent: THREE.Group, paint: (color: number) => THREE.Material): void {
  const bark = paint(0x675444);
  const barkLight = paint(0x8d7050);
  const leafMaterial = paint(0xffffff);
  const palettes = [
    [0x416454, 0x648762, 0x94a870],
    [0x4d664e, 0x768c58, 0xa9ad71],
    [0x446555, 0x6f8f70, 0x94ad81],
  ].map(colors => colors.map(color => new THREE.Color(color)));
  const trees = [
    [21.05, -6.25, 1.22, .23, 0], [24, 10, .96, -1.2, 1], [28.2, -4.0, 1.34, .8, 2],
    [34, 2, .81, 2.51, 1], [36.6, 10.3, 1.04, -1.8, 2], [36, -7, 1.22, 1.98, 0],
  ];
  const clump = (tree: THREE.Group, x: number, y: number, z: number, width: number,
    height: number, depth: number, rotation: number, palette: THREE.Color[]) => {
    const geometry = smoothLoft([[-.72,.16,.16,.04],[-.57,.62,.61,.10],[-.30,.91,.87,.10],[-.03,1,.96,.056],
      [.23,.92,.83,-.04],[.47,.71,.64,-.10],[.65,.43,.39,-.16],[.72,.12,.12,-.21]], 22);
    const points = geometry.getAttribute('position');
    const colors = new Float32Array(points.count * 3);
    const color = new THREE.Color();
    const [shade, leaf, sun] = palette;
    for (let i = 0; i < points.count; i++) {
      const px = points.getX(i), py = points.getY(i), pz = points.getZ(i);
      const angle = Math.atan2(px, pz);
      const scallop = 1 + .081 * Math.sin(angle * 5.0 + py * 2.4) + .064 * Math.cos(angle * 3.0 - py * 4.0);
      const daub = Math.sin(px * 5.0 + pz * 3.3) * Math.cos(pz * 5.8 - px * 2.3);
      const lighting = py - px * .15 - pz * .08 + daub * .22;
      color.copy(shade).lerp(leaf, THREE.MathUtils.smoothstep(lighting, -.44, .16))
        .lerp(sun, THREE.MathUtils.smoothstep(lighting, .24, .68) * .80)
        .toArray(colors, i * 3);
      points.setXYZ(i, px * scallop - .11 * py, py + .073 * daub, pz * scallop);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    const crown = piece(tree, geometry, leafMaterial, x, y, z);
    crown.scale.set(width, height, depth);
    crown.rotation.y = rotation;
    crown.castShadow = crown.receiveShadow = true;
  };
  const branch = (tree: THREE.Group, start: THREE.Vector3, end: THREE.Vector3, radius: number) => {
    const length = start.distanceTo(end);
    const bough = piece(tree, loft([[0, radius, radius*.84], [length*.51,radius*.79,radius*.66,.036],
      [length,radius*.33,radius*.36,.06]], 8), bark);
    bough.position.copy(start);
    bough.quaternion.setFromUnitVectors(point(0, 1, 0), end.clone().sub(start).normalize());
    bough.castShadow = bough.receiveShadow = true;
  };
  for (const [index, [x, z, scale, rotation, family]] of trees.entries()) {
    const tree = new THREE.Group();
    tree.position.set(x, 0, z);
    tree.scale.setScalar(scale);
    tree.rotation.y = rotation;
    parent.add(tree);
    const trunk = piece(tree, smoothLoft([[0,.32,.28,.014], [.18,.26,.23], [.62,.16,.18,.022],
      [1.5,.14,.15,.081,-.079], [2.1,.13,.13,.13,-.057], [2.73,.078,.084,.22,.11], [3.15,.042,.045,.29,.22]],
    12), bark);
    trunk.castShadow = trunk.receiveShadow = true;
    for (const angle of [-.39, 1.16, 2.72, 4.21]) {
      const root = point(Math.cos(angle) * .64, .035, Math.sin(angle) * .55);
      branch(tree, point(0, .43, 0), root, .106);
    }
    for (const [i, [dx, y, dz, width]] of [
      [-.89,2.72,-.46,.93], [.80,2.99,-.42,1.07], [-.71,3.20,.45,1.07], [.65,3.22,.43,.91],
      [.05,3.61,-.20,1.21],
    ].entries()) {
      const rise = Math.sin(i * 4 + index) * .23;
      branch(tree, point(-.08, 1.44 + (i % 3) * .26, .11), point(dx, y + rise, dz), .12 + (i % 2) * .016);
      clump(tree, dx, y + rise, dz, width * 1.11, .57 + i * .035, width * .92, i * 1.7, palettes[family]);
      if (i < 4) {
        const reach = i % 2 ? .31 : -.37;
        clump(tree, dx + reach * 1.5, y + rise + .18, dz + Math.sign(dz) * .35, width * .57,
          .35 + (i % 2) * .10, width * .63, i * .7, palettes[family]);
      }
    }
    const barkSplit = piece(tree, panel([[-.041,.10], [.004,.41], [-.031,.90], [-.087,1.32],
      [-.046,.89], [.035,.44], [.016,.18]], .004), barkLight, 0, 0, .174);
    barkSplit.receiveShadow = true;
  }
}
