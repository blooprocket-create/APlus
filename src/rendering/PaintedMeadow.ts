import * as THREE from 'three';
import { MEADOW_ACTORS, type SceneryMotion } from './SceneryMotion';

export interface MeadowPlant {
  x: number;
  z: number;
  scale: number;
  angle: number;
  tint?: number;
}

function meadowGeometry(flowering: boolean): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const vertex = (x: number, y: number, z: number, color: THREE.Color) => {
    positions.push(x, y, z);
    colors.push(color.r, color.g, color.b);
  };
  const root = new THREE.Color(0x47694a);
  const middle = new THREE.Color(0x8a9b58);
  const tip = new THREE.Color(0xc4be75);

  // Tapered ribbons with a ridge catch the warm light on one face.
  function blade(x: number, z: number, height: number, width: number, lean: number, angle: number): void {
    const rows = [0, .39, .72, 1];
    const point = (row: number, edge: number) => {
      const t = rows[row];
      const across = edge * width * (1 - t) * (.64 + t);
      const forward = lean * t * t + (1 - Math.abs(edge)) * width * (1 - t) * .35;
      const color = root.clone().lerp(middle, Math.min(1, t * 1.6)).lerp(tip, t ** 3 * .82);
      if (edge > 0) color.multiplyScalar(.81);
      vertex(x + across * Math.cos(angle) + forward * Math.sin(angle), height * t,
        z - across * Math.sin(angle) + forward * Math.cos(angle), color);
    };
    for (let row = 0; row < 3; row++) {
      for (const edge of [-1, 0]) {
        point(row, edge); point(row, edge + 1); point(row + 1, edge);
        if (row === 2) continue;
        point(row, edge + 1); point(row + 1, edge + 1); point(row + 1, edge);
      }
    }
  }

  if (flowering) {
    const flowers = [
      [-.13, -.09, .40, .096, 0xc0a6e3],
      [.15, .04, .33, .085, 0xe6c2d6],
      [-.01, .12, .26, .072, 0xf4da93],
    ];
    const center = new THREE.Color(0xf6c15c);
    for (const [x, z, height, size, hex] of flowers) {
      blade(x, z, height, .019, 0, x * 16);
      blade(x, z, height * .48, .05, .10, z * 16 + 1);
      const petal = new THREE.Color(hex);
      const shade = petal.clone().multiplyScalar(.72);
      for (let index = 0; index < 5; index++) {
        const angle = index * Math.PI * .4 + x * 9;
        const point = (radius: number, spread: number, lift: number, color: THREE.Color) => {
          vertex(x + Math.cos(angle + spread) * size * radius,
            height + size * lift, z + Math.sin(angle + spread) * size * radius, color);
        };
        point(.16, -.57, 0, shade); point(.77, -.39, .24, petal); point(1, 0, .39, petal);
        point(.16, -.57, 0, shade); point(1, 0, .39, petal); point(.77, .39, .22, petal);
        point(0, 0, .15, center); point(.25, .62, .12, center); point(.25, -.64, .12, center);
      }
    }
  } else {
    blade(-.15, -.04, .24, .073, .18, 4.6);
    blade(.04, -.11, .39, .063, .20, 2.9);
    blade(.13, .07, .29, .060, .19, 1.3);
    blade(-.07, .12, .33, .071, .21, 5.3);
    blade(.05, .03, .45, .065, .15, .6);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function addPaintedMeadow(
  parent: THREE.Group, time: THREE.IUniform<number>, motion: SceneryMotion,
  grasses: MeadowPlant[], flowers: MeadowPlant[],
): void {
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  material.onBeforeCompile = shader => {
    shader.uniforms.meadowTime = time;
    shader.uniforms.meadowActors = motion.actors;
    shader.vertexShader = `uniform float meadowTime; uniform vec4 meadowActors[${MEADOW_ACTORS}];\n` + shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vec2 rootXZ = (modelMatrix * instanceMatrix[3]).xz;
      vec2 wind = normalize(vec2(1.0, -.52));
      float gust = sin(dot(rootXZ, wind) * .63 - meadowTime * 2.1 + sin(rootXZ.y * .21));
      float shimmer = sin(dot(rootXZ, vec2(.96, 1.2)) - meadowTime * 3.4) * .12;
      float bend = position.y * position.y * (.48 + .78 * smoothstep(-.55, .95, gust) + shimmer);
      vec2 sweep = vec2(0.0);
      float press = 0.0;
      for (int i = 0; i < ${MEADOW_ACTORS}; i++) {
        vec4 actor = meadowActors[i];
        vec2 away = rootXZ - actor.xy;
        float reach = actor.z * actor.z;
        float range = dot(away, away);
        if (actor.w <= 0.0 || range >= reach) continue;
        float contact = (1.0 - smoothstep(.04 * reach, reach, range)) * actor.w;
        sweep += away * inversesqrt(max(.06, range)) * contact;
        press = max(press, contact);
      }
      vec2 push = wind * bend + clamp(sweep, vec2(-1.3), vec2(1.3)) * position.y * position.y * 2.1;
      transformed.xz += vec2(dot(normalize(instanceMatrix[0].xz), push),
                            dot(normalize(instanceMatrix[2].xz), push));
      transformed.y -= bend * .16 + min(.65, press * .54) * position.y;
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `
      #include <emissivemap_fragment>
      totalEmissiveRadiance += diffuseColor.rgb * .23;
    `);
  };

  for (const [flowering, plants] of [[false, grasses], [true, flowers]] as const) {
    const mesh = new THREE.InstancedMesh(meadowGeometry(flowering), material, plants.length);
    mesh.name = flowering ? 'Windblown wildflowers' : 'Windblown meadow grass';
    mesh.receiveShadow = true;
    const plant = new THREE.Object3D();
    const tint = new THREE.Color();
    plants.forEach(({ x, z, scale, angle, tint: color }, index) => {
      plant.position.set(x, -.009, z);
      plant.rotation.y = angle;
      plant.scale.setScalar(scale);
      plant.updateMatrix();
      mesh.setMatrixAt(index, plant.matrix);
      tint.setHex(color ?? 0xffffff);
      mesh.setColorAt(index, tint);
    });
    mesh.computeBoundingSphere();
    // The static instance bounds need room for the shader's gust.
    if (mesh.boundingSphere) mesh.boundingSphere.radius += 1.4;
    parent.add(mesh);
  }
}
