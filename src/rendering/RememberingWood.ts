import * as THREE from 'three';
import type { ProceduralPathLayout } from '../types/world';
import { smoothLoft } from './ArtMesh';
import { addPaintedMeadow, type MeadowPlant } from './PaintedMeadow';
import { SceneryMotion } from './SceneryMotion';

const noise = (seed: number) => {
  const value = Math.sin(seed * 127.1 + 3.71) * 43758.5453;
  return value - Math.floor(value);
};

export function buildRememberingWood(group: THREE.Group, layout: ProceduralPathLayout) {
  const time = { value: 0 };
  const motion = new SceneryMotion(() => undefined);
  const points = layout.waypoints;
  const roads = (layout.connections ?? []).map(([from, to]) => {
    const a = points[from], b = points[to];
    const x = b.x - a.x, z = b.z - a.z;
    return { a, x, z, length: Math.hypot(x, z) };
  });
  const distanceToTrail = (x: number, z: number) => {
    let best = Infinity;
    for (const road of roads) {
      const dx = x - road.a.x, dz = z - road.a.z;
      const t = THREE.MathUtils.clamp((dx * road.x + dz * road.z) / road.length ** 2, 0, 1);
      best = Math.min(best, Math.hypot(dx - t * road.x, dz - t * road.z));
    }
    return best;
  };
  const xs = points.map(p => p.x), zs = points.map(p => p.z);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
  const width = maxX - minX + 56, depth = maxZ - minZ + 56;
  const ground = new THREE.PlaneGeometry(width, depth, Math.ceil(width / .84), Math.ceil(depth / .84));
  ground.rotateX(-Math.PI / 2);
  ground.translate((minX + maxX) / 2, -.025, (minZ + maxZ) / 2);
  const floorPoints = ground.getAttribute('position');
  const floorColors = new Float32Array(floorPoints.count * 3);
  const cool = new THREE.Color(0x3b625a), fern = new THREE.Color(0x849a61);
  const clay = new THREE.Color(0xa18665), stone = new THREE.Color(0x8b9477);
  const tint = new THREE.Color();
  for (let i = 0; i < floorPoints.count; i++) {
    const x = floorPoints.getX(i), z = floorPoints.getZ(i);
    const brush = Math.sin(x * .28 + z * .42) + .55 * Math.cos(z * .91 - x * .23);
    const wear = 1 - THREE.MathUtils.smoothstep(distanceToTrail(x, z) + brush * .72, 1.25, 4.2);
    const glade = points.some(p => Math.abs(p.x - x) < 9 && Math.abs(p.z - z) < 9 &&
      Math.hypot(p.x - x, p.z - z) < (p.index === 11 ? 9 : 4));
    tint.copy(cool).lerp(fern, .37 + brush * .16).lerp(glade ? stone : clay, Math.max(wear * .93, glade ? .51 : 0))
      .toArray(floorColors, i * 3);
  }
  ground.setAttribute('color', new THREE.BufferAttribute(floorColors, 3));
  const soil = new THREE.MeshLambertMaterial({ vertexColors: true });
  soil.onBeforeCompile = shader => {
    shader.uniforms.woodTime = time;
    shader.vertexShader = 'varying vec2 forestFloor;\n' + shader.vertexShader.replace('#include <project_vertex>',
      '#include <project_vertex>\nforestFloor = position.xz;');
    shader.fragmentShader = 'uniform float woodTime; varying vec2 forestFloor;\n' +
      shader.fragmentShader.replace('#include <emissivemap_fragment>', `
        #include <emissivemap_fragment>
        vec2 p = forestFloor;
        float flecks = sin(p.x * 1.1 + sin(p.y * .73)) * sin(p.y * 1.9 - p.x * .34);
        float shafts = sin(p.x * .25 + p.y * .47 + sin(p.y * .12) * 1.7);
        float sun = smoothstep(.36,.96,shafts + .17 * sin(woodTime * .64 + p.x * .29));
        float gap = smoothstep(.04,.86, flecks + .49 * sin(p.x * .66 - p.y * .44));
        float dapple = sun * (.18 + gap * .82);
        diffuseColor.rgb *= .82 + dapple * .28;
        totalEmissiveRadiance += diffuseColor.rgb * vec3(1.35, 1.20, .69) * (.11 + dapple * .26);
      `);
  };
  const floor = new THREE.Mesh(ground, soil);
  floor.receiveShadow = true;
  group.add(floor);

  const trunk = smoothLoft([[0,.78,.62,0,0],[.23,.61,.51,0,-.02],[.8,.42,.40,-.08,.06],
    [1.9,.36,.34,-.06,.18],[3.3,.28,.31,.09,.15],[4.8,.22,.23,.16,.28],
    [6.1,.13,.17,.28,.49],[6.75,.06,.081,.51,.79]], 14);
  const crown = smoothLoft([[-.8,.20,.25],[-.63,.65,.68],[-.31,.91,.97,.07],
    [.06,1.04,.94,.02],[.43,.78,.73,-.04],[.67,.45,.41,-.16],[.76,.16,.18,-.18]], 16);
  const barkColor = new THREE.Color(0x765d52), furrow = new THREE.Color(0x393d3e), lichen = new THREE.Color(0x9da16c);
  const canopyShade = new THREE.Color(0x264d46), leaf = new THREE.Color(0x659158), sunLeaf = new THREE.Color(0xb4bb69);
  for (const [geometry, canopy] of [[trunk, false], [crown, true]] as const) {
    const vertices = geometry.getAttribute('position');
    const colors = new Float32Array(vertices.count * 3);
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i);
      const angle = Math.atan2(z, x);
      if (canopy) {
        const scallop = 1 + .11 * Math.sin(angle * 6 + y) + .06 * Math.cos(angle * 9 - 3 * y);
        vertices.setXYZ(i, x * scallop, y + .09 * Math.sin(x * 7 + z * 8), z * scallop);
        tint.copy(canopyShade).lerp(leaf, THREE.MathUtils.smoothstep(y - x * .22, -.65, .29))
          .lerp(sunLeaf, THREE.MathUtils.smoothstep(y + z * .32, .19, .74) * .8);
      } else {
        const ridges = .5 + .5 * Math.sin(angle * 6 + y * .58);
        vertices.setXYZ(i, x + x * ridges * .09, y, z + z * ridges * .09);
        tint.copy(furrow).lerp(barkColor, ridges).lerp(lichen, (1 - THREE.MathUtils.smoothstep(y, .1, 1.7)) * ridges * .5);
      }
      tint.toArray(colors, i * 3);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
  }
  const boughMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
  const crownMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
  crownMaterial.onBeforeCompile = shader => {
    shader.uniforms.woodTime = time;
    shader.uniforms.woodHero = { value: motion.actors.value[0] };
    shader.vertexShader = 'uniform float woodTime; varying vec3 canopyWorld;\n' +
      shader.vertexShader.replace('#include <project_vertex>', `
        vec3 anchor = instanceMatrix[3].xyz;
        float wind = sin(anchor.x * .31 + anchor.z * .19 - woodTime * 1.7);
        transformed.x += wind * (.04 + max(0.0, position.y) * .05);
        transformed.z += wind * .018;
        canopyWorld = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
        #include <project_vertex>
      `);
    shader.fragmentShader = 'uniform vec4 woodHero; varying vec3 canopyWorld;\n' +
      shader.fragmentShader.replace('#include <alphatest_fragment>', `
        #include <alphatest_fragment>
        vec2 viewFoot = canopyWorld.xz - vec2(0.0, max(0.0, canopyWorld.y - .9) * .93);
        float cutaway = smoothstep(1.6,3.5,length(viewFoot - woodHero.xy));
        float grain = fract(dot(floor(gl_FragCoord.xy), vec2(.75487766,.5698403)));
        if (woodHero.w > 0.0 && grain > cutaway) discard;
      `);
  };
  const trees: { x: number; z: number; size: number; yaw: number; tint: number }[] = [];
  const shrubs: MeadowPlant[] = [], blooms: MeadowPlant[] = [];
  const plantTree = (x: number, z: number, seed: number, size: number) => {
    if (distanceToTrail(x, z) < 3.65 || points.some(p => Math.hypot(p.x - x, p.z - z) <
        (p.index === 11 ? 12.5 : p.index === 12 ? 10.0 : 3.8))) return;
    if (trees.some(tree => Math.hypot(tree.x - x, tree.z - z) < 2.9)) return;
    trees.push({ x, z, size, yaw: noise(seed) * Math.PI * 2, tint: seed % 3 ? 0xe4f1ca : 0xa3cdc2 });
  };
  for (const [index, road] of roads.entries()) {
    const steps = Math.max(2, Math.round(road.length / 3.7));
    for (const side of [-1, 1]) {
      for (let i = 0; i < steps; i++) {
        const seed = index * 97 + i * 11 + side;
        const t = (i + .35 + noise(seed) * .42) / steps;
        const x = road.a.x + road.x * t, z = road.a.z + road.z * t;
        const nx = -road.z / road.length * side, nz = road.x / road.length * side;
        const setback = 4.35 + noise(seed + 8) * 2.9;
        plantTree(x + nx * setback, z + nz * setback, seed, .91 + noise(seed + 2) * .35);
        if (i % 2 === 0) plantTree(x + nx * (setback + 6.5), z + nz * (setback + 6.5), seed + 11, 1.04 + noise(seed + 6) * .54);
        for (let j = 0; j < 7; j++) {
          const drift = 2.7 + noise(seed + 7 + j) * 2.6;
          const spread = (noise(seed * 3 + j) - .5) * 3.9;
          const plant = { x: x + nx * drift + nz * spread, z: z + nz * drift - nx * spread,
            scale: .66 + noise(seed + j * 7) * .58, angle: noise(seed + j * 3) * 6.28 };
          if (distanceToTrail(plant.x, plant.z) < 1.7) continue;
          if (j === 3 && i % 2 === 0) blooms.push(plant);
          else shrubs.push({ ...plant, tint: j % 2 ? 0xbce1ac : 0xd6e8ae });
        }
      }
    }
  }
  const barkMesh = new THREE.InstancedMesh(trunk, boughMaterial, trees.length);
  barkMesh.name = 'Sculpted woodland trunks';
  const leaves = new THREE.InstancedMesh(crown, crownMaterial, trees.length * 4);
  leaves.name = 'Windblown woodland canopy';
  const branchMaterial = new THREE.MeshLambertMaterial({ color: 0x6c574b });
  const branches = new THREE.InstancedMesh(new THREE.CylinderGeometry(.07, .21, 1, 7), branchMaterial, trees.length * 3);
  const object = new THREE.Object3D();
  const obstacles: THREE.Mesh[] = [];
  const lobe = new THREE.Vector3();
  const base = new THREE.Vector3(), tip = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  trees.forEach(({ x, z, size, yaw, tint: color }, i) => {
    object.position.set(x, -.025, z);
    object.rotation.set(0, yaw, 0);
    object.scale.setScalar(size);
    object.updateMatrix();
    barkMesh.setMatrixAt(i, object.matrix);
    const tree = new THREE.Mesh(trunk, boughMaterial);
    tree.position.copy(object.position);
    tree.rotation.copy(object.rotation);
    tree.scale.copy(object.scale);
    obstacles.push(tree);
    for (let k = 0; k < 4; k++) {
      const a = yaw + k * 2.39996;
      lobe.set(x + Math.cos(a) * size * (k === 0 ? .40 : 1.25),
        (5.40 + noise(i * 12 + k) * 1.65) * size, z + Math.sin(a) * size * (k === 0 ? .40 : 1.32));
      if (k) {
        base.set(x + Math.cos(yaw) * size * .19, (3.15 + k * .36) * size, z - Math.sin(yaw) * size * .19);
        tip.copy(lobe);
        tip.y -= .36 * size;
        object.position.copy(base).lerp(tip, .5);
        object.scale.set(size, base.distanceTo(tip), size);
        object.quaternion.setFromUnitVectors(up, tip.sub(base).normalize());
        object.updateMatrix();
        branches.setMatrixAt(i * 3 + k - 1, object.matrix);
      }
      object.position.copy(lobe);
      object.rotation.set(0, a, 0);
      object.scale.set((2 + noise(i + k) * .75) * size, (.88 + noise(i * 4 + k) * .42) * size, (1.65 + .37 * (k % 3)) * size);
      object.updateMatrix();
      leaves.setMatrixAt(i * 4 + k, object.matrix);
      leaves.setColorAt(i * 4 + k, tint.setHex(color));
    }
  });
  barkMesh.castShadow = barkMesh.receiveShadow = true;
  group.add(barkMesh, branches, leaves);
  addPaintedMeadow(group, time, motion, shrubs, blooms);
  return { time, motion, obstacles, distanceToTrail };
}
