import * as THREE from 'three';
import type { PathWaypoint, ProceduralPathLayout } from '../types/world';
import { beam, piece } from './ArtMesh';
import { createAnimeToonMaterial } from './AnimeMaterials';
import { addPaintedMeadow, type MeadowPlant } from './PaintedMeadow';
import { RIVER_WAKES, SceneryMotion } from './SceneryMotion';

const SIDES = 48;
const TAU = 2 * Math.PI;
const coastRadius = (island: PathWaypoint, angle: number) => island.radius + 3.2 +
  Math.sin(angle * 3 + island.index * 2.7) * .72 + Math.cos(angle * 7 - island.index) * .34;

function buildCoastalWreck(parent: THREE.Group, island: PathWaypoint, angle: number): THREE.Mesh {
  const wreck = new THREE.Group();
  const radius = coastRadius(island, angle) * .91;
  wreck.position.set(island.x + Math.cos(angle) * radius, -.03, island.z + Math.sin(angle) * radius);
  wreck.rotation.set(.045, -angle + .20, .28);
  parent.add(wreck);
  const wood = createAnimeToonMaterial({ color: 0x71554a });
  const tar = createAnimeToonMaterial({ color: 0x40363d });
  const canvas = createAnimeToonMaterial({ color: 0xb97861 });
  const tint = new THREE.Color();
  const sections = [[-3.0, .10, .84], [-2.22, .69, .59], [-1.1, .98, .59],
    [.42, 1.06, .60], [1.61, .74, .67], [2.70, .13, .98]];
  const profile = [[-.93, 1], [-.83, .50], [-.43, .13], [0, 0], [.43, .13], [.83, .50], [.93, 1]];
  const positions: number[] = [], colors: number[] = [], faces: number[] = [];
  for (const [row, [z, width, rise]] of sections.entries()) {
    for (const [column, [x, y]] of profile.entries()) {
      positions.push(x * width, y * rise - .19, z);
      tint.setHex(column === 0 || column === 6 ? 0xa57656 : column === 1 || column === 5 ? 0x73534c : 0x45363b);
      colors.push(tint.r, tint.g, tint.b);
      if (!row || !column) continue;
      const d = row * profile.length + column;
      const a = d - profile.length - 1;
      faces.push(a, a + 1, d - 1, a + 1, d, d - 1);
    }
  }
  const hullGeometry = new THREE.BufferGeometry()
    .setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    .setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    .setIndex(faces);
  hullGeometry.computeVertexNormals();
  const shell = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const hull = piece(wreck, hullGeometry, shell);
  hull.castShadow = hull.receiveShadow = true;
  for (const [z, width, rise] of sections.slice(1, -1)) {
    const crossbar = piece(wreck, new THREE.BoxGeometry(width * 1.67, .09, .19), wood, 0, rise - .28, z);
    crossbar.receiveShadow = true;
  }
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  beam(wreck, tar, v(0, .20, -.32), v(-.31, 3.67, .15), .18);
  beam(wreck, wood, v(-1.24, 2.86, -.14), v(.90, 3.09, .54), .093);
  const sailGeometry = new THREE.BufferGeometry();
  sailGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -1.17, 2.87, -.10, .44, 3.03, .42, .09, 2.11, .84,
    -.26, 2.34, .76, -.60, 1.88, .63, -.73, 2.45, .39,
  ], 3));
  sailGeometry.setIndex([0, 1, 3, 1, 2, 3, 0, 3, 5, 3, 4, 5]);
  sailGeometry.computeVertexNormals();
  canvas.side = THREE.DoubleSide;
  piece(wreck, sailGeometry, canvas).castShadow = true;
  return hull;
}

function drawSea(group: THREE.Group, points: PathWaypoint[], time: THREE.IUniform<number>, motion: SceneryMotion): void {
  const xs = points.map(point => point.x), zs = points.map(point => point.z);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
  const material = new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog]),
    vertexShader: `
      varying vec2 water;
      #include <fog_pars_vertex>
      void main() {
        water = (modelMatrix * vec4(position, 1.0)).xz;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      varying vec2 water;
      uniform float time;
      uniform vec4 wakes[${RIVER_WAKES}];
      #include <fog_pars_fragment>
      void main() {
        vec2 tide = vec2(dot(water, vec2(.94,.34)), dot(water, vec2(-.34,.94)));
        float swell = tide.y * .67 + sin(tide.x * .24 + time * .44) * 1.04;
        float wave = sin(swell - time * 1.34 + sin(tide.y * .24) * .57);
        float wash = sin(tide.x * .41 - tide.y * .18 + sin(tide.y * .34));
        float brush = sin(tide.x * .81 + tide.y * .21) * sin(tide.y * 1.1 - time * .4);
        float band = smoothstep(-.67,.69,wave) * (.32 + .30 * smoothstep(-.66,.88,wash));
        float crest = smoothstep(.72,.99,wave) * smoothstep(.25,.76,brush);
        float fleck = smoothstep(.93,.994,sin(tide.y * 2.1 + sin(tide.x * .47) * .84 - time * 1.8));
        fleck *= smoothstep(.57,.96,sin(tide.x * .94 + sin(tide.y * .37)));
        vec3 ink = mix(vec3(.026,.080,.118), vec3(.087,.244,.252), band);
        float sun = smoothstep(.05,.93,sin(tide.x * .12 + tide.y * .18)) * .7;
        vec3 reflection = mix(vec3(.36,.64,.62),vec3(.73,.43,.27),sun);
        ink = mix(ink, reflection, crest * .30 + fleck * .23);
        float ripple = 0.0;
        for (int i = 0; i < ${RIVER_WAKES}; i++) {
          vec4 wake = wakes[i];
          vec2 delta = water - wake.xy;
          if (wake.z >= 1.0 || max(abs(delta.x),abs(delta.y)) > 1.8) continue;
          float wavefront = length(delta) - (.15 + wake.z * 1.4);
          float ring = 1.0 - smoothstep(.018,.074,abs(wavefront));
          float echo = 1.0 - smoothstep(.013,.047,abs(wavefront + .17));
          ripple = max(ripple, (ring + echo * .32) * wake.w * (1.0 - smoothstep(.21,1.0,wake.z)));
        }
        ink = mix(ink, vec3(.66,.89,.80), min(.92, ripple));
        gl_FragColor = vec4(ink,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  });
  material.uniforms.time = time;
  material.uniforms.wakes = motion.wakes;
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(maxX - minX + 180, maxZ - minZ + 180), material);
  sea.rotation.x = -Math.PI / 2;
  sea.position.set((minX + maxX) / 2, -.49, (minZ + maxZ) / 2);
  sea.name = 'Ember Coast painted tide';
  group.add(sea);
}

export function buildEmberCoast(group: THREE.Group, layout: ProceduralPathLayout) {
  const points = layout.waypoints;
  const time = { value: 0 };
  const motion = new SceneryMotion(point => {
    let nearest: { x: number; z: number; distance: number } | undefined;
    for (const island of points) {
      const dx = point.x - island.x, dz = point.z - island.z;
      if (Math.abs(dx) > island.radius + 5 || Math.abs(dz) > island.radius + 5) continue;
      const angle = Math.atan2(dz, dx);
      const shore = coastRadius(island, angle);
      const distance = Math.abs(Math.hypot(dx, dz) - shore * .93);
      if (distance > 1.1 || (nearest && distance >= nearest.distance)) continue;
      nearest = { x: island.x + Math.cos(angle) * (shore + .33),
        z: island.z + Math.sin(angle) * (shore + .33), distance };
    }
    return nearest;
  });
  drawSea(group, points, time, motion);
  const earth = new THREE.MeshLambertMaterial({ vertexColors: true });
  const land = new THREE.Color(0x796e51), moss = new THREE.Color(0x8a895b);
  const beach = new THREE.Color(0xc29b79), wetStone = new THREE.Color(0x706365);
  const tint = new THREE.Color();
  const supports: THREE.Mesh[] = [];
  const obstacles: THREE.Mesh[] = [];
  const grasses: MeadowPlant[] = [], flowers: MeadowPlant[] = [];
  const surf: number[] = [], surfUv: number[] = [], surfFaces: number[] = [];
  const roads = (layout.connections ?? []).map(([a, b]) => {
    const start = points[a], end = points[b];
    const x = end.x - start.x, z = end.z - start.z;
    return { start, x, z, lengthSq: x * x + z * z };
  });
  const distanceFromRoad = (x: number, z: number): number => {
    let distance = Infinity;
    for (const road of roads) {
      const dx = x - road.start.x, dz = z - road.start.z;
      const t = THREE.MathUtils.clamp((dx * road.x + dz * road.z) / road.lengthSq, 0, 1);
      distance = Math.min(distance, Math.hypot(dx - t * road.x, dz - t * road.z));
    }
    return distance;
  };

  for (const island of points) {
    if (island.index % 2 === 0) {
      let shoreAngle = 0;
      let clear = 0;
      for (let i = 0; i < 16; i++) {
        const angle = TAU * i / 16 + island.index * .3;
        const r = coastRadius(island, angle) * .91;
        const distance = distanceFromRoad(island.x + Math.cos(angle) * r, island.z + Math.sin(angle) * r);
        if (distance > clear) {
          clear = distance;
          shoreAngle = angle;
        }
      }
      if (clear > layout.corridorHalfWidth + 2.8) obstacles.push(buildCoastalWreck(group, island, shoreAngle));
    }
    const positions: number[] = [island.x, .001, island.z];
    const colors: number[] = [land.r, land.g, land.b];
    const faces: number[] = [];
    const contours = [[.52, .001], [.77, .001], [.92, .001], [1, -.46], [1.026, -.67]];
    const surfStart = surf.length / 3;
    for (let j = 0; j <= SIDES; j++) {
      const angle = j / SIDES * TAU;
      const r = coastRadius(island, angle);
      for (const edge of [0, 1]) {
        const reach = r - .36 + edge * 2.16;
        surf.push(island.x + Math.cos(angle) * reach, -.472, island.z + Math.sin(angle) * reach);
        surfUv.push(j / SIDES, edge);
      }
      if (j > 0) {
        const a = surfStart + (j - 1) * 2;
        surfFaces.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    for (const [row, [scale, y]] of contours.entries()) {
      for (let j = 0; j < SIDES; j++) {
        const angle = j / SIDES * TAU;
        const r = coastRadius(island, angle) * scale;
        const x = island.x + Math.cos(angle) * r;
        const z = island.z + Math.sin(angle) * r;
        const wash = .5 + .5 * Math.sin(angle * 5 + island.index) * Math.cos(angle * 9 - island.index);
        tint.copy(land).lerp(moss, wash * .75);
        if (row === 2) tint.lerp(beach, .58 + wash * .22);
        if (row > 2) tint.copy(wetStone).lerp(beach, wash * .35 + (row === 3 ? .23 : 0));
        positions.push(x, y, z);
        colors.push(tint.r, tint.g, tint.b);
        const a = 1 + row * SIDES + j;
        const b = 1 + row * SIDES + (j + 1) % SIDES;
        if (!row) faces.push(0, b, a);
        else faces.push(a - SIDES, b - SIDES, a, a, b - SIDES, b);
      }
    }
    const geometry = new THREE.BufferGeometry()
      .setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      .setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
      .setIndex(faces);
    geometry.computeVertexNormals();
    const cliff = new THREE.Mesh(geometry, earth);
    cliff.receiveShadow = true;
    group.add(cliff);
    const walkable = new THREE.BufferGeometry().setAttribute('position', geometry.attributes.position)
      .setIndex(faces.slice(0, SIDES * 15));
    supports.push(new THREE.Mesh(walkable, earth));
    for (let i = 0; i < 81; i++) {
      const angle = i * 2.39996 + island.index * .86;
      const scatter = Math.sin(i * 84.7 + island.index * 19.1) * .5 + .5;
      if (Math.sin(angle * 3 + island.index) < -.36) continue;
      const r = coastRadius(island, angle) * (.55 + scatter * .31);
      const plant = { x: island.x + Math.cos(angle) * r, z: island.z + Math.sin(angle) * r,
        scale: .66 + scatter * .64, angle: angle * 3 };
      if (distanceFromRoad(plant.x, plant.z) < layout.corridorHalfWidth + .22) continue;
      if (i % 6 === 0) flowers.push(plant);
      else grasses.push({ ...plant, tint: i % 3 ? 0xdde7b4 : 0xffdfaa });
    }
  }
  const foam = new THREE.Mesh(new THREE.BufferGeometry()
    .setAttribute('position', new THREE.Float32BufferAttribute(surf, 3))
    .setAttribute('uv', new THREE.Float32BufferAttribute(surfUv, 2)).setIndex(surfFaces), new THREE.ShaderMaterial({
    side: THREE.DoubleSide, depthWrite: false, transparent: true,
    uniforms: { time },
    vertexShader: `
      varying vec2 shore;
      void main() { shore = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
    `,
    fragmentShader: `
      varying vec2 shore;
      uniform float time;
      void main() {
        float breakUp = sin(shore.x * 150.8 + time * .68) + .45 * sin(shore.x * 351.8);
        float r = fract(shore.y * 1.34 - time * .46 + breakUp * .067);
        float lip = (1.0 - smoothstep(.017,.090,abs(r - .52))) * smoothstep(-.65,.6,breakUp);
        float tail = (1.0 - smoothstep(.30,1.0,shore.y)) * smoothstep(0.0,.20,shore.y);
        gl_FragColor = vec4(mix(vec3(.23,.55,.54),vec3(.75,.89,.77),lip),tail * (.20 + lip * .69));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  }));
  group.add(foam);
  addPaintedMeadow(group, time, motion, grasses, flowers);
  return { time, motion, supports, obstacles, distanceFromRoad };
}
