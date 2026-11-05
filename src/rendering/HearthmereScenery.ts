import * as THREE from 'three';
import { bakePieces, beam, loft, panel, piece, smoothLoft } from './ArtMesh';
import { buildRefugeBridge, buildRefugeFire, buildRefugeGrove, buildRefugeLodge } from './HearthmereRefuge';

export interface TownBuilding { x: number; z: number; w: number; d: number; refuge?: true }
const vector = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function noise(n: number): number {
  const value = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function paintedPalette(): THREE.MeshLambertMaterial {
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  material.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 paintPosition;\n' + shader.vertexShader.replace('#include <project_vertex>',
      '#include <project_vertex>\npaintPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = `
      varying vec3 paintPosition;
      float paperHash(vec2 p) {
        vec3 n = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
        n += dot(n, n.yzx + 33.33);
        return fract((n.x + n.y) * n.z);
      }
      float wash(vec2 p) {
        vec2 cell = floor(p);
        vec2 u = fract(p);
        u = u*u*(3.0 - 2.0*u);
        return mix(mix(paperHash(cell), paperHash(cell + vec2(1.0, 0.0)), u.x),
          mix(paperHash(cell + vec2(0.0, 1.0)), paperHash(cell + vec2(1.0)), u.x), u.y);
      }
    ` + shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      vec2 brush = vec2(paintPosition.x * 0.72 + paintPosition.y * 0.47,
        paintPosition.z * 1.12 - paintPosition.y * 0.68);
      float broadWash = wash(brush * 1.33);
      float fineWash = wash(brush * vec2(5.0, 9.0));
      float fleck = smoothstep(0.57, 0.8, broadWash + (fineWash - 0.5) * 0.31);
      diffuseColor.rgb *= mix(vec3(0.91, 0.93, 1.0), vec3(1.11, 1.07, 0.92), broadWash);
      diffuseColor.rgb += vec3(0.041, 0.037, 0.021) * fleck;
      diffuseColor.rgb *= 0.93 + fineWash * 0.13;
    `);
  };
  return material;
}

function addPaintedSky(parent: THREE.Group): void {
  const material = new THREE.ShaderMaterial({
    depthWrite: false, side: THREE.BackSide,
    uniforms: {
      horizon: { value: new THREE.Color(0xf1ddba) },
      middle: { value: new THREE.Color(0xa5ccdc) },
      zenith: { value: new THREE.Color(0x658ac0) },
      cloud: { value: new THREE.Color(0xf6ede0) },
    },
    vertexShader: `
      varying vec3 skyPosition;
      void main() {
        skyPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 skyPosition;
      uniform vec3 horizon;
      uniform vec3 middle;
      uniform vec3 zenith;
      uniform vec3 cloud;
      void main() {
        vec3 p = normalize(skyPosition);
        float height = max(0.0, p.y);
        vec3 color = mix(horizon, middle, smoothstep(0.0, 0.33, height));
        color = mix(color, zenith, smoothstep(0.28, 0.91, height));
        float smear = sin(p.x * 16.0 + p.z * 7.0) * 0.035 + sin(p.x * 34.0 - p.z * 18.0) * 0.008;
        float cloudBand = 1.0 - smoothstep(0.012, 0.053, abs(p.y + smear - 0.22));
        float upperBand = 1.0 - smoothstep(0.006, 0.033, abs(p.y + smear * 0.66 - 0.43));
        color = mix(color, cloud, (cloudBand * 0.71 + upperBand * 0.47) * (0.69 + 0.31 * sin(p.x * 7.0 + p.z * 4.1)));
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const sky = piece(parent, new THREE.SphereGeometry(92, 28, 14), material, 3, 0, 0);
  sky.renderOrder = -20;
}

export function buildHearthmereScenery(parent: THREE.Group, buildings: readonly TownBuilding[]): THREE.ShaderMaterial {
  addPaintedSky(parent);
  const town = new THREE.Group();
  parent.add(town);
  const time = { value: 0 };
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
  const foliage = [surface(0x49665d), surface(0x658354), surface(0x879a62)];
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
  cube(grass[0], 44, 0.09, 31, -10, -0.058, -1);
  cube(grass[1], 18, 0.09, 31, 29, -0.058, -1);
  cube(grass[1], 30, 1.6, 60, -45, -1.02, -1);
  cube(grass[1], 24, 1.6, 60, 50, -1.02, -1);
  for (const z of [-24, 22]) {
    cube(grass[1], 44, 1.2, 17, -10, -0.72, z);
    cube(grass[0], 18, 1.2, 17, 29, -0.72, z);
  }

  for (const [lane, [w, d, x, z]] of [[41, 4.3, -8, 5], [26, 5.3, -7, -5.5], [4.8, 12, -16, 0],
    [5.3, 13, 4, -1], [17, 4.1, 29, 6.5], [8.8, 4.2, -23, 1.5]].entries()) {
    if (lane === 4) {
      const positions: number[] = [], colors: number[] = [], indices: number[] = [];
      const color = new THREE.Color();
      for (let i = 0; i <= 35; i++) {
        const span = i / 35;
        const sway = Math.sin(span * 20) * .11 + Math.sin(span * 37) * .08;
        const width = d / 2 + Math.sin(span * 14 + .5) * .14;
        for (const [j, across] of [-1.24, -1.0, -.73, 0, .73, 1.0, 1.24].entries()) {
          const edge = 1 - THREE.MathUtils.smoothstep(Math.abs(across), .69, 1.24);
          const fade = 1 - THREE.MathUtils.smoothstep(span, .91, 1);
          const dust = .85 + noise(i * 11 + j) * .15;
          color.copy(grass[1].color).lerp(path.color, edge * fade * dust);
          colors.push(color.r, color.g, color.b);
          positions.push(x + (span - .5) * w, .016 + edge * .005, z + across * width + sway);
          if (i && j) {
            const k = i * 7 + j;
            indices.push(k - 8, k - 7, k - 1, k - 7, k, k - 1);
          }
        }
      }
      const surface = new THREE.BufferGeometry();
      surface.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      surface.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      surface.setIndex(indices);
      surface.computeVertexNormals();
      piece(town, surface, path).receiveShadow = true;
    } else {
      cube(path, w, 0.027, d, x, 0.006 + lane * 0.0013, z);
    }
    for (let i = 0; i < Math.ceil(w / 1.25); i++) {
      for (let j = 0; j < Math.ceil(d / 1.08); j++) {
        const key = x * 13 + i * 3 + j * 11;
        const px = x - w / 2 + 0.53 + i * 1.25 + (j % 2) * 0.2;
        const pz = z - d / 2 + 0.42 + j * 1.08;
        if (px > x + w / 2 - 0.25 || pz > z + d / 2 - 0.16 || noise(key + 25) < 0.24) continue;
        const mat = stones[Math.floor(noise(key) * stones.length)];
        const width = 0.32 + noise(key + 1) * (lane === 4 ? .25 : .18);
        const height = 0.28 + noise(key + 2) * (lane === 4 ? .23 : .17);
        const cut = 0.048 + noise(key + 4) * 0.105;
        const tile = piece(town, panel([[-width, -height + cut], [-width + cut, -height],
          [width - cut, -height + 0.018], [width, -height + cut * 0.81], [width - 0.019, height - cut],
          [width - cut, height], [-width + cut * 1.24, height - 0.018], [-width + 0.02, height - cut]], 0.018),
          mat, px + (noise(key + 8) - 0.5) * 0.14, 0.021 + lane * 0.002,
          pz + (lane === 4 ? (noise(key + 51) - .5) * .25 : 0));
        tile.rotation.set(-Math.PI / 2, 0, (noise(key + 3) - 0.5) * (lane === 4 ? .53 : .31));
        tile.receiveShadow = true;
      }
    }
  }

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
        for (let blade = 0; blade < 5; blade++) {
          const height = .40 + noise(key + blade * 17) * .72;
          const reed = piece(town, panel([[-.032, 0], [-.048, height * .57], [blade * .040 - .09, height],
            [.027, height * .55], [.047, 0]], .018), foliage[blade % 3],
          x - inward * (.15 + blade * .076), -.029, z + (blade - 2) * .10);
          reed.rotation.y = noise(key + blade * 8) * Math.PI;
          reed.receiveShadow = true;
        }
      }
    }
  }

  buildRefugeBridge(town, surface);
  for (const x of [-25, -18, -10, -3, 4, 11, 23, 29, 35]) {
    cube(timber, 0.18, 1.87, 0.18, x, 0.95, 8.4, true);
    cube(timber, 0.43, 0.09, 0.43, x, 1.88, 8.4, true);
    cube(warm, 0.25, 0.35, 0.25, x, 2.06, 8.4);
    cube(iron, 0.37, 0.085, 0.37, x, 2.28, 8.4, true);
  }

  for (const [index, { x, z, w, d, refuge }] of buildings.entries()) {
    if (refuge) {
      buildRefugeLodge(town, x, z, w, d, surface);
      continue;
    }
    const front = z > 0 ? -1 : 1;
    const height = index === 2 ? 2.48 : 2.65;
    const pitch = 1.18;
    const facade = z + front * (d / 2 + 0.013);
    const facadePlaster = plaster[index % plaster.length];
    cube(masonry, w + 0.14, 0.51, d + 0.14, x, 0.25, z, true);
    cube(facadePlaster, w, height - 0.45, d, x, (height + 0.45) / 2, z, true);
    for (const side of [-1, 1]) {
      const gable = piece(town, panel([[-w / 2, 0], [w / 2, 0], [0, pitch]], 0.13), facadePlaster,
        x, height, z + side * d / 2 - 0.065);
      gable.castShadow = true;
      gable.receiveShadow = true;
      cube(timber, 0.19, height, d + 0.06, x + side * w * 0.475, height / 2, z, true);
      const start = vector(x, height + pitch, z);
      const slope = Math.hypot(w / 2 + 0.24, pitch + 0.17);
      const roof = cube(roofs[index][0], slope + 0.07, 0.14, d + 0.46, x + side * (w / 4 + 0.12), height + pitch / 2, z, true);
      roof.rotation.z = -side * Math.atan2(pitch, w / 2 + 0.24);
      for (let row = 1; row < 7; row++) {
        const t = row / 7;
        cube(roofs[index][row % 3 === 0 ? 1 : 0], 0.07, 0.09, d + 0.49,
          start.x + side * (w / 2 + 0.24) * t, start.y + 0.07 - pitch * t, z, true);
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
    cube(masonry, 1.04, 0.16, 0.48, x, 0.08, facade + front * 0.29);
    if (index === 2 || index === 3) {
      cube(masonry, 0.78, 3.8, 0.78, x - w / 2 + 0.28, 1.91, z + 0.78, true);
      cube(iron, 0.91, 0.22, 0.91, x - w / 2 + 0.28, 3.82, z + 0.78, true);
    }
  }

  for (const [index, x] of [-16, -9.7, -5.6].entries()) {
    const z = index === 0 ? -8.8 : -7.4;
    const canvas = index === 1 ? surface(0x976f56) : index === 0 ? surface(0x4d7473) : straw;
    for (const px of [x - 1.07, x + 1.07]) {
      cube(timber, 0.14, 2.05, 0.14, px, 1.02, z + 0.64, true);
      cube(timber, 0.14, 1.83, 0.14, px, 0.92, z - 0.65, true);
    }
    cube(plank, 2.13, 0.14, 1.09, x, 0.8, z, true);
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
      const barrel = piece(town, loft([[0, 0.205, 0.205], [0.09, 0.237, 0.237], [0.32, 0.272, 0.272],
        [0.62, 0.23, 0.23], [0.67, 0.205, 0.205]], 9, true), plank, x + i * 0.55, 0, z + (i % 2) * 0.34);
      barrel.castShadow = true;
      for (const y of [0.14, 0.52]) {
        piece(town, loft([[y, 0.256, 0.256], [y + 0.048, 0.256, 0.256]], 9), iron, barrel.position.x, 0, barrel.position.z);
      }
    }
  }
  buildRefugeFire(town, parent, time, surface);
  for (const x of [27.2, 28.8]) cube(timber, 0.23, 0.21, 1.45, x, 0.18, 8.96, true);

  buildRefugeGrove(town, surface);
  for (const [i, [x, z]] of [[-28, -8], [-26, 11], [-22, -12], [-17, 12], [-9, 12], [-4, -11], [6, 11],
    [8.9, 12.8]].entries()) {
    const scale = i >= 6 ? .86 + noise(i + 3) * .19 : .88 + noise(i + 3) * .7;
    const trunk = piece(town, loft([[0, 0.27, 0.23], [0.55, 0.18, 0.18], [1.85, 0.13, 0.13, 0.14],
      [2.8, 0.064, 0.064, 0.23]], 8), timber, x, 0, z);
    trunk.scale.setScalar(scale);
    trunk.castShadow = true;
    for (let k = 0; k < 8; k++) {
      const angle = k * 2.39996 + i;
      const distance = (0.54 + (k % 3) * 0.2) * scale;
      const tx = x + Math.cos(angle) * distance;
      const tz = z + Math.sin(angle) * distance;
      const ty = (2.43 + noise(i * 7 + k + 9) * 1.22) * scale;
      const width = (0.68 + noise(k * 3 + i + 15) * 0.32) * scale;
      const tree = piece(town, smoothLoft([[-0.62, 0.39, 0.5], [-0.31, 0.81, 0.87, 0.08],
        [0.11, 1.0, 0.97], [0.48, 0.75, 0.72, -0.08], [0.69, 0.23, 0.28, -0.18]], 14),
        foliage[k % 3], tx, ty, tz);
      tree.rotation.y = angle;
      tree.scale.set(width, scale * (0.46 + (k % 3) * 0.08), width * 0.92);
      tree.castShadow = true;
      if (k < 3) beam(town, timber, vector(x, 1.53 * scale, z),
        vector(tx, ty - 0.22 * scale, tz), 0.16 * scale);
    }
  }
  for (let i = 0; i < 145; i++) {
    const x = -31 + noise(i + 26) * 69;
    const z = -14 + noise(i + 89) * 27;
    if ((x > 11 && x < 21) || Math.abs(z - 5) < 2.35 || Math.abs(z + 5.5) < 2.6 ||
      (Math.abs(x + 16) < 2.8 || Math.abs(x - 4) < 2.8) ||
      buildings.some(b => Math.abs(x - b.x) < b.w / 2 && Math.abs(z - b.z) < b.d / 2)) continue;
    const scale = 0.62 + noise(i + 140) * 0.65;
    const tuft = piece(town, panel([[-0.24, 0], [-0.21, 0.27], [-0.078, 0.13], [0.012, 0.33],
      [0.057, 0.134], [0.2, 0.23], [0.17, 0]], 0.026), grass[i % 3], x, 0.007, z);
    tuft.rotation.y = noise(i + 24) * 6.3;
    tuft.scale.setScalar(scale);
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

  bakePieces(town, paintedPalette());

  const river = new THREE.ShaderMaterial({
    uniforms: {
      time,
      deep: { value: new THREE.Color(0x255d7e) },
      shallows: { value: new THREE.Color(0x65aa9d) },
      glint: { value: new THREE.Color(0xd1ede0) },
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
      uniform vec3 deep;
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
        float along = (q.y - .5) / (.19 + seed * .27);
        float width = .022 + .038 * hash(cell.yx);
        float bend = along * (seed - .5) * .18 + along * along * .086;
        float cross = (q.x - (.26 + seed * .47) - bend) / width;
        return (1.0 - smoothstep(.42, 1.0, cross * cross + along * along)) * smoothstep(.39, .90, seed);
      }
      void main() {
        float edge = min(vUv.x, 1.0 - vUv.x);
        float tide = vUv.y * 47.0 - time * .42;
        float ripple = sin(tide * .83 + sin(vUv.x * 14.0 + tide * .33) * 1.6);
        float bank = 1.0 - smoothstep(.015, .33, edge + sin(tide * 1.13) * .028);
        float foamEdge = .019 + .007 * sin(vUv.y * 189.0) + .008 * sin(vUv.y * 348.0 + time * 1.5);
        float foam = (1.0 - smoothstep(.003, .011, abs(edge - foamEdge))) *
          smoothstep(-.5, .72, sin(tide * 4.2 + ripple));
        vec2 flow = vec2(vUv.x * 6.9 + .19 * sin(tide * .68), vUv.y * 33.0 - time * .37 + vUv.x * 2.2);
        float current = strokes(flow) + strokes(flow * vec2(1.6, 1.52) + vec2(.43, .28)) * .39;
        float pool = smoothstep(-.22, .54, sin(vUv.x * 8.9 + tide * .41) * ripple);
        vec3 color = mix(deep, shallows, bank * .82 + pool * .14);
        color = mix(color, glint, min(1.0, current) * (.27 + bank * .34) + foam * .51);
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  piece(parent, new THREE.PlaneGeometry(8, 61), river, 16, -0.4, -1).rotation.x = -Math.PI / 2;
  return river;
}
