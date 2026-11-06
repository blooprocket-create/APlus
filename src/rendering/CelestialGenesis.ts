import * as THREE from 'three';

const strokeVertex = `
  varying vec2 paint;
  void main() {
    paint = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export interface GenesisChargeSample {
  staff: THREE.Vector3;
  palm: THREE.Vector3;
  strength: number;
}

export function buildGenesisCharge(color: number, accent: number) {
  const mesh = new THREE.Group();
  const orbit = new THREE.Group();
  const material = new THREE.ShaderMaterial({
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
    uniforms: {
      indigo: { value: new THREE.Color(color) },
      light: { value: new THREE.Color(accent) },
      phase: { value: 0 },
      opacity: { value: 0 },
    },
    vertexShader: strokeVertex,
    fragmentShader: `
      varying vec2 paint;
      uniform vec3 indigo;
      uniform vec3 light;
      uniform float phase;
      uniform float opacity;
      void main() {
        float chase = fract(paint.x * 2.0 - phase * 2.0);
        float tail = smoothstep(.08, .48, chase) * (1.0 - smoothstep(.79, .97, chase));
        float thin = 1.0 - smoothstep(.08, .46, abs(paint.y - .5));
        vec3 color = mix(indigo, light, thin * (.34 + tail * .6));
        gl_FragColor = vec4(color, opacity * thin * tail);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  for (const [index, tilt] of [.34, -.80, 1.20].entries()) {
    const hoop = new THREE.Mesh(new THREE.RingGeometry(.82 + index * .09, .90 + index * .09, 48), material);
    // Encode the angular sweep and stroke width on the annulus.
    const vertices = hoop.geometry.getAttribute('position');
    const uv = hoop.geometry.getAttribute('uv');
    for (let i = 0; i < vertices.count; i++) {
      uv.setXY(i, (i % 49) / 48, Math.floor(i / 49));
    }
    hoop.rotation.set(Math.PI / 2 + tilt, index * 1.02, index * .33);
    orbit.add(hoop);
  }
  const starMaterial = new THREE.MeshBasicMaterial({ color: accent, transparent: true, depthWrite: false });
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(.20), starMaterial);
  star.scale.set(.65, 1.55, .65);
  const sparks = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1), starMaterial, 5);
  sparks.frustumCulled = false;
  const spark = new THREE.Object3D();
  mesh.add(orbit, star, sparks);
  mesh.visible = false;

  return { mesh, pose(age: number, sample?: GenesisChargeSample): void {
    mesh.visible = Boolean(sample);
    if (!sample) return;
    const { staff, palm, strength } = sample;
    orbit.position.copy(staff);
    orbit.rotation.set(age * 2.2, age * 3.1, -.35);
    orbit.scale.setScalar(.24 + strength * .57);
    material.uniforms.opacity.value = strength;
    material.uniforms.phase.value = age;
    star.position.copy(staff);
    star.rotation.y = age * 7;
    starMaterial.opacity = strength * .91;
    for (let i = 0; i < sparks.count; i++) {
      const flight = (age * 3.6 + i / sparks.count) % 1;
      spark.position.copy(palm).lerp(staff, flight);
      spark.position.y += Math.sin(flight * Math.PI) * (.14 + i * .026);
      spark.scale.setScalar(.052 * Math.sin(flight * Math.PI) * strength);
      spark.updateMatrix();
      sparks.setMatrixAt(i, spark.matrix);
    }
    sparks.instanceMatrix.needsUpdate = true;
  } };
}

export function buildGenesisImpact(
  center: THREE.Vector3, staff: THREE.Vector3, radius: number, color: number, accent: number,
) {
  const mesh = new THREE.Group();
  mesh.position.set(center.x, .035, center.z);
  const time = { value: 0 };
  const frost = new THREE.Color(accent).lerp(new THREE.Color(0x89f4ff), .38);
  const blue = new THREE.Color(color);
  const sealMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { time, frost: { value: frost }, blue: { value: blue } },
    vertexShader: strokeVertex,
    fragmentShader: `
      varying vec2 paint;
      uniform float time;
      uniform vec3 frost;
      uniform vec3 blue;
      float line(float distance, float width) {
        return 1.0 - smoothstep(width * .35, width, abs(distance));
      }
      void main() {
        vec2 xy = paint * 2.0 - 1.0;
        float r = length(xy);
        float a = atan(xy.y, xy.x);
        float visible = 1.0 - smoothstep(.50, .98, time);
        float front = .11 + .87 * (1.0 - pow(1.0 - min(1.0, time * 2.8), 3.0));
        float shock = line(r - front, .023) * (1.0 - smoothstep(.30, .65, time));
        float circle = max(line(r - .95, .009), line(r - .82, .009) * .7);
        float wheel = line(r - .66 - cos(a * 8.0) * .13, .009);
        float ticks = smoothstep(.91, .999, cos(a * 32.0)) * step(.85, r) * (1.0 - step(.94, r));
        float star = line(r - .52 - cos(a * 4.0) * .18, .011) * .65;
        float revealed = 1.0 - smoothstep(front - .12, front, r);
        float ink = max(max(wheel, star), max(ticks * .75, circle)) * revealed;
        float wash = (1.0 - smoothstep(.0, .82, r)) * revealed * .23;
        vec3 color = mix(blue * .44, frost, max(ink * .79, shock));
        gl_FragColor = vec4(color, visible * max(wash, max(shock, ink * .86)));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const seal = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), sealMaterial);
  seal.rotation.x = -Math.PI / 2;
  mesh.add(seal);

  const pillarMaterial = new THREE.ShaderMaterial({
    transparent: true, side: THREE.DoubleSide, depthWrite: false, forceSinglePass: true,
    uniforms: { time, frost: { value: frost }, blue: { value: blue }, core: { value: 0 } },
    vertexShader: strokeVertex,
    fragmentShader: `
      varying vec2 paint;
      uniform float time;
      uniform vec3 frost;
      uniform vec3 blue;
      uniform float core;
      void main() {
        float taper = smoothstep(.015, .24, paint.y) * (1.0 - smoothstep(.80, 1.0, paint.y));
        float column = cos(paint.x * 75.4 + sin(paint.y * 9.0 + time * 29.0) * .19);
        float descent = fract(paint.y * 2.7 + paint.x * 7.0 + time * 9.0);
        float streaks = smoothstep(.46, .86, column) * (.66 + .34 * smoothstep(.22, .78, descent));
        float facet = step(0.0, cos(paint.x * 18.85 + .6));
        float pulse = (1.0 - smoothstep(.17, .76, time)) * smoothstep(0.0, .11, time);
        vec3 color = mix(blue * .60, frost, mix(streaks * .81, .60 + facet * .37, core));
        gl_FragColor = vec4(color, pulse * taper * mix(.10 + streaks * .62, .65 + facet * .19, core));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const pillar = new THREE.Group();
  const offset = new THREE.Vector2(staff.x - center.x, staff.z - center.z).clampLength(0, 1.15);
  pillar.position.set(offset.x, .12, offset.y);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.86, 1.42, 6.8, 18, 1, true), pillarMaterial);
  const coreMaterial = pillarMaterial.clone();
  coreMaterial.uniforms.time = time;
  coreMaterial.uniforms.core.value = 1;
  const core = new THREE.Mesh(new THREE.CylinderGeometry(.25, .45, 6.7, 12, 1, true), coreMaterial);
  beam.position.y = core.position.y = 3.38;
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(4.1, 4.1), sealMaterial);
  halo.rotation.x = -Math.PI / 2 + .16;
  halo.position.y = 2.85;
  pillar.add(beam, core, halo);
  mesh.add(pillar);

  const shards = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1),
    new THREE.MeshBasicMaterial({ color: frost, transparent: true, depthWrite: false }), 18);
  shards.frustumCulled = false;
  const shard = new THREE.Object3D();
  mesh.add(shards);
  const pose = (p: number) => {
    time.value = p;
    const swell = THREE.MathUtils.smoothstep(p, 0, .14);
    const fade = 1 - THREE.MathUtils.smoothstep(p, .28, .92);
    pillar.scale.set(.36 + swell * 1.08 - p * .32, .82 + swell * .18, .36 + swell * 1.08 - p * .32);
    pillar.rotation.y = p * 1.2;
    halo.scale.setScalar(.78 + swell * .22 + .44 * p);
    shards.material.opacity = fade * swell;
    for (let i = 0; i < shards.count; i++) {
      const angle = i * 2.39996 + .67 * p;
      const orbit = radius * (.23 + p * (.31 + i % 3 * .11));
      shard.position.set(Math.cos(angle) * orbit, .42 + (i % 5) * .28 + p * 1.3, Math.sin(angle) * orbit);
      shard.rotation.set(angle, p * 4 + i, i * .67);
      shard.scale.set(.095 * fade, (.25 + i % 4 * .09) * fade, .095 * fade);
      shard.updateMatrix();
      shards.setMatrixAt(i, shard.matrix);
    }
    shards.instanceMatrix.needsUpdate = true;
  };
  pose(0);
  return { mesh, pose };
}
