import * as THREE from 'three';
import { bakePieces, beam, hairLock, loft, panel, piece, smoothLoft } from './ArtMesh';
import { createIllustratedCelMaterial, createSilhouetteInk, inkMesh } from './AnimeMaterials';

type Resident = 'mara' | 'rowan' | 'guard' | 'resident';

export class HearthmereResident {
  readonly root = new THREE.Group();
  private readonly torso = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly boots = [new THREE.Group(), new THREE.Group()];
  private clock: number;

  constructor(role: Resident, index = 0) {
    this.clock = index * 0.31;
    this.root.name = role;
    this.root.add(this.torso, ...this.boots);
    this.torso.add(this.head);
    const toon = (color: number) => createIllustratedCelMaterial({ color });
    const cloth = toon(role === 'mara' ? 0x8f4641 : role === 'rowan' ? 0x4e716d : role === 'guard' ? 0x50626a
      : [0x8d7056, 0x6b775e, 0x7a5154, 0x556b75][index % 4]);
    const linen = toon(role === 'mara' ? 0xc88f66 : 0xac9773);
    const dark = toon(0x4b3836);
    const skin = toon(role === 'mara' || role === 'rowan' ? 0xc68968 : 0xd8a17e);
    const hair = toon(role === 'mara' || role === 'rowan' ? 0x503834 : 0x564443);
    const ink = new THREE.MeshBasicMaterial({ color: 0x302529 });
    const brass = toon(0xc3975a);
    const palette = toon(0xffffff);
    palette.vertexColors = true;
    const body = new THREE.Group();
    this.torso.add(body);
    piece(body, loft([[0.55, 0.155, 0.099], [0.75, 0.177, 0.121], [0.91, 0.156, 0.105],
      [1.18, 0.218, 0.122], [1.32, 0.197, 0.116], [1.35, 0.087, 0.077]], 12), cloth);
    piece(body, loft([[0.75, 0.175, 0.127], [0.81, 0.173, 0.126]], 12), dark);
    if (role === 'mara' || role === 'rowan') {
      piece(body, panel([[-0.084, 1.24], [0.095, 1.24], [0.102, 0.85], [0.154, 0.59], [-0.161, 0.59], [-0.103, 0.85]], 0.018),
        role === 'mara' ? dark : linen, 0, 0, 0.123);
      piece(body, panel([[-0.101, 0.91], [0.033, 0.91], [0.021, 0.795], [-0.079, 0.795]], 0.016), cloth, 0, 0, 0.147);
    } else {
      piece(body, panel([[-0.2, 1.32], [0.164, 1.26], [0.112, 1.12], [-0.15, 1.13]], 0.027), linen, 0, 0, 0.11);
    }
    for (const side of [-1, 1]) {
      const sleeve = piece(body, loft([[0.84, 0.053, 0.059], [0.96, 0.069, 0.074], [1.23, 0.08, 0.088], [1.32, 0.059, 0.063]], 9),
        role === 'guard' ? dark : cloth, side * 0.224, 0, 0);
      sleeve.rotation.z = side * 0.09;
      piece(body, loft([[0.73, 0.04, 0.044], [0.84, 0.052, 0.053], [0.91, 0.051, 0.049]], 8), skin, side * 0.255, 0, 0.022);
    }
    this.head.position.y = 1.48;
    piece(this.head, smoothLoft([[-0.13, 0.046, 0.064, 0.025], [-0.09, 0.094, 0.091], [-0.008, 0.131, 0.116],
      [0.08, 0.127, 0.116], [0.143, 0.089, 0.078], [0.155, 0.032, 0.03]], 20), skin);
    piece(this.head, smoothLoft([[0.01, 0.134, 0.122, -0.014], [0.122, 0.139, 0.126, -0.009],
      [0.176, 0.099, 0.087], [0.192, 0.045, 0.048]], 20), role === 'guard' ? cloth : hair);
    for (const side of [-1, 1]) {
      piece(this.head, panel([[-0.033, 0.004], [-0.02, 0.019], [0.018, 0.021], [0.032, 0.008],
        [0.012, -0.008], [-0.02, -0.006]], 0.003), linen, side * 0.053, 0, 0.114).rotation.y = side * 0.19;
      piece(this.head, new THREE.CircleGeometry(0.0105, 12), ink, side * 0.051, 0.006, 0.122);
      if (role === 'mara') piece(this.head, new THREE.OctahedronGeometry(0.026), brass, side * 0.122, -0.057, 0.027);
    }
    if (role === 'mara') {
      piece(this.head, hairLock([[0.034, 0.13, -0.09], [0.058, 0.061, -0.168], [0.071, -0.09, -0.163],
        [0.044, -0.2, -0.139]], 0.067, 0.056), hair);
    } else if (role === 'guard') {
      piece(this.head, panel([[-0.135, 0.025], [0.135, 0.025], [0.105, 0.098], [-0.114, 0.098]], 0.025), dark, 0, 0, 0.116);
      beam(body, dark, new THREE.Vector3(-0.3, 0, 0.12), new THREE.Vector3(-0.3, 1.78, 0.12), 0.049);
      piece(body, new THREE.OctahedronGeometry(0.097), brass, -0.3, 1.86, 0.12).scale.y = 1.7;
    }
    for (const [i, boot] of this.boots.entries()) {
      boot.position.set(i ? 0.089 : -0.089, 0.65, 0);
      piece(boot, loft([[-0.64, 0.061, 0.086, 0.044], [-0.574, 0.062, 0.084, 0.038],
        [-0.39, 0.064, 0.061], [0, 0.079, 0.076]], 9), dark);
      bakePieces(boot, palette);
    }
    bakePieces(body, palette);
    bakePieces(this.head, palette);
    const outline = createSilhouetteInk(0.007);
    for (const part of [body, this.head, ...this.boots]) {
      for (const mesh of part.children) if (mesh instanceof THREE.Mesh && mesh.material === palette) inkMesh(mesh, outline);
    }
  }

  update(dt: number, walking: boolean): void {
    this.clock += dt;
    const swing = Math.sin(this.clock * 11);
    const blend = 1 - Math.exp(-dt * 17);
    this.boots[0].rotation.x = THREE.MathUtils.lerp(this.boots[0].rotation.x, walking ? swing * 0.43 : 0, blend);
    this.boots[1].rotation.x = THREE.MathUtils.lerp(this.boots[1].rotation.x, walking ? -swing * 0.43 : 0, blend);
    this.torso.position.y = walking ? Math.abs(swing) * 0.027 : Math.sin(this.clock * 2.2) * 0.012;
    this.head.rotation.y = Math.sin(this.clock * 0.92) * (walking ? 0.06 : 0.18);
  }
}

export class HearthmereImpact {
  readonly root = new THREE.Group();
  private readonly material: THREE.ShaderMaterial;
  private readonly front = new THREE.Group();
  private readonly ink = new THREE.MeshBasicMaterial({
    color: 0x554047, transparent: true, side: THREE.DoubleSide, depthWrite: false,
  });
  private readonly flare = new THREE.MeshBasicMaterial({
    color: 0xffd49b, transparent: true, side: THREE.DoubleSide, depthWrite: false,
  });
  private readonly span = 0.92;

  constructor() {
    const geometry = new THREE.BufferGeometry();
    const vectors: number[] = [];
    for (let i = 0; i < 82; i++) {
      const angle = i * 2.39996;
      const speed = 1.7 + (i % 9) * .57;
      vectors.push(Math.cos(angle) * speed, 1.2 + (i % 7) * .61, Math.sin(angle) * speed * .66);
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vectors, 3));
    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        age: { value: this.span },
        duration: { value: this.span },
        dust: { value: new THREE.Color(0x96765f) },
        spark: { value: new THREE.Color(0xf6ae70) },
      },
      vertexShader: `
        uniform float age;
        varying float vHeat;
        void main() {
          vec3 spread = position * (age + 0.085);
          spread.y -= age * age * 3.7;
          spread.y = max(0.03, spread.y);
          vec4 view = modelViewMatrix * vec4(spread, 1.0);
          vHeat = fract(position.y * 2.17);
          gl_Position = projectionMatrix * view;
          float size = mix(280.0, 390.0, step(vHeat, 0.67));
          gl_PointSize = clamp(size * (0.71 + age) / max(1.0, -view.z), 2.0, 35.0);
        }
      `,
      fragmentShader: `
        uniform float age;
        uniform float duration;
        uniform vec3 dust;
        uniform vec3 spark;
        varying float vHeat;
        void main() {
          vec2 p = gl_PointCoord * 2.0 - 1.0;
          float edge = length(p);
          float fragment = step(.60, vHeat);
          float shard = max(abs(p.x + p.y * (vHeat - .5)) * 1.7, abs(p.y - p.x * .41) * .87);
          float shape = mix(1.0 - smoothstep(.28, .97, edge), 1.0 - smoothstep(.61, .67, shard), fragment);
          float glow = smoothstep(.74, .99, vHeat) * max(0.0, 1.0 - age * 1.8);
          float alpha = shape * (1.0 - smoothstep(.14, duration, age));
          vec3 color = mix(dust, vec3(.16, .103, .094), fragment * .77);
          gl_FragColor = vec4(mix(color, spark, glow), alpha * mix(.54, .91, fragment));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    });
    const particles = new THREE.Points(geometry, this.material);
    particles.frustumCulled = false;
    this.root.add(particles, this.front);
    for (const [layer, material] of [this.ink, this.flare].entries()) {
      const positions: number[] = [];
      for (let i = 0; i < 20; i++) {
        if (i % 5 === 2) continue;
        const a = (i / 20) * Math.PI * 2;
        const b = a + .26;
        const r = .84 + Math.sin(i * 19) * .15;
        const inside = layer === 0 ? r - .24 : r - .09;
        const y = layer * .018 + .024;
        positions.push(Math.cos(a) * inside, y, Math.sin(a) * inside,
          Math.cos(a + .10) * r, y + .04, Math.sin(a + .10) * r,
          Math.cos(b) * (r + .11), y, Math.sin(b) * (r + .11));
      }
      const flash = new THREE.BufferGeometry();
      flash.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      piece(this.front, flash, material);
    }
    this.root.visible = false;
  }

  release(x: number, z: number): void {
    this.root.position.set(x, 0.07, z);
    this.material.uniforms.age.value = 0;
    this.front.scale.set(.44, 1, .36);
    this.ink.opacity = .94;
    this.flare.opacity = 1;
    this.root.visible = true;
  }

  update(dt: number): void {
    if (!this.root.visible) return;
    const age = this.material.uniforms.age.value += dt;
    const shock = THREE.MathUtils.smoothstep(age, 0, .37);
    this.front.scale.set(.44 + shock * 4.75, 1, .36 + shock * 1.81);
    this.ink.opacity = .87 * (1 - THREE.MathUtils.smoothstep(age, .10, .41));
    this.flare.opacity = 1 - THREE.MathUtils.smoothstep(age, .075, .27);
    this.root.visible = age < this.span;
  }
}
