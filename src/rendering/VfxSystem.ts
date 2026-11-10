import * as THREE from 'three';
import { getViewportProfile } from '../platform/Viewport';
import { disposeObject } from './SceneResources';
import { buildMeteorFlight, buildMeteorImpact } from './CelestialMeteor';
import { buildEarthshakerImpact } from './EarthshakerImpact';
import { buildDeathmarkCast } from './Deathmark';
import { buildHeavensfallDescent, buildHeavensfallImpact } from './Heavensfall';
import { buildShadowBladeTrails, buildThousandShadows } from './ThousandShadows';
import { buildGenesisCharge, buildGenesisImpact, type GenesisChargeSample } from './CelestialGenesis';
import { buildNovaBurst } from './StarlightProjectile';
import { placeFloatingLabel, type LabelRect } from './FloatingLabels';

interface ActiveVfxMesh {
  mesh: THREE.Object3D;
  age: number;
  duration: number;
  onUpdate: (progress: number, dt: number) => void;
  materials: THREE.Material[];
  dispose?: () => void;
}

interface FloatingDamageEntry {
  element: HTMLDivElement;
  worldPos: THREE.Vector3;
  age: number;
  duration: number;
  velocityY: number;
  width: number;
  height: number;
  lane: number;
}

function slashStroke(radius: number, range: number, inner: number, thickness: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const samples = 28;
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const angle = (t - 0.5) * range;
    const edge = radius * (0.94 + t * 0.07);
    const taper = Math.pow(Math.sin(t * Math.PI), 0.58) * (0.73 + t * 0.27);
    for (const r of [edge - radius * inner * taper, edge - radius * (inner + thickness) * taper]) {
      positions.push(Math.sin(angle) * r, 0, Math.cos(angle) * r);
    }
    if (i > 0) {
      const a = (i - 1) * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  return geometry;
}

export class VfxSystem {
  private scene: THREE.Scene;
  private damageLayer: HTMLElement;
  private activeMeshes: ActiveVfxMesh[] = [];
  private damageNumbers: FloatingDamageEntry[] = [];
  private readonly projection = new THREE.Vector3();

  constructor(scene: THREE.Scene, damageLayer: HTMLElement) {
    this.scene = scene;
    this.damageLayer = damageLayer;
  }

  /**
   * Spawns a stylized Anime Crescent Slash wave along the character's facing angle.
   */
  public spawnSlashArc(
    origin: THREE.Vector3,
    facingYaw: number,
    radius: number,
    colorHex: number,
    accentHex: number,
    tiltAngle = 0,
    lift = 0.95,
  ): void {
    const group = new THREE.Group();
    group.position.copy(origin);
    group.position.y += lift;
    group.rotation.y = facingYaw;
    group.rotation.z = tiltAngle;

    const outerGeo = slashStroke(radius, Math.PI * 1.35, 0, 0.29);
    const outerMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);

    const innerGeo = slashStroke(radius, Math.PI * 1.24, 0.026, 0.094);
    const innerMat = new THREE.MeshBasicMaterial({
      color: accentHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    innerMesh.position.y = 0.02;

    group.add(outerMesh, innerMesh);
    this.scene.add(group);

    this.activeMeshes.push({
      mesh: group,
      age: 0,
      duration: 0.24,
      materials: [outerMat, innerMat],
      onUpdate: (p, dt) => {
        const scale = 0.75 + p * 0.45;
        group.scale.set(scale, 1, scale);
        group.rotation.y += dt * 4.5;
        outerMat.opacity = (1 - p) * 0.9;
        innerMat.opacity = (1 - p) * 0.95;
      },
    });
  }

  public spawnNightbladeRelease(
    left: THREE.Vector3,
    right: THREE.Vector3,
    yaw: number,
    colorHex: number,
    accentHex: number,
    scale = 1,
  ): void {
    const group = new THREE.Group();
    group.rotation.y = yaw;
    group.position.copy(left).lerp(right, .5);

    const ink = new THREE.MeshBasicMaterial({
      color: new THREE.Color(colorHex).lerp(new THREE.Color(0x22112e), .8),
      side: THREE.DoubleSide, transparent: true, depthWrite: false,
    });
    const edge = new THREE.MeshBasicMaterial({
      color: accentHex, side: THREE.DoubleSide, transparent: true, depthWrite: false,
    });
    for (const side of [-1, 1]) {
      const stroke = new THREE.Group();
      stroke.rotation.set(side * .28, side * .73, side * .30, 'YXZ');
      const radius = side < 0 ? 1.92 : 1.66;
      const body = new THREE.Mesh(slashStroke(radius, 1.56, 0, .24), ink);
      const rim = new THREE.Mesh(slashStroke(radius, 1.47, .01, .054), edge);
      rim.position.y = .026;
      rim.renderOrder = body.renderOrder + 1;
      stroke.add(body, rim);
      group.add(stroke);
    }
    group.scale.setScalar(.64 * scale);
    this.scene.add(group);
    this.activeMeshes.push({
      mesh: group,
      age: 0,
      duration: .12 + .10 * scale,
      materials: [ink, edge],
      onUpdate: p => {
        group.scale.setScalar(scale * (.64 + .56 * (1 - (1 - p) ** 3)));
        const fade = 1 - THREE.MathUtils.smoothstep(p, .12, 1);
        ink.opacity = .91 * fade;
        edge.opacity = fade;
      },
    });
  }

  public spawnCastingFlash(origin: THREE.Vector3, yaw: number, colorHex: number, accentHex: number, size = 1): void {
    const group = new THREE.Group();
    group.position.copy(origin);
    group.rotation.y = yaw;
    const halo = new THREE.MeshBasicMaterial({
      color: colorHex, side: THREE.DoubleSide, transparent: true, depthWrite: false,
    });
    const white = new THREE.MeshBasicMaterial({
      color: accentHex, side: THREE.DoubleSide, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const star = new THREE.Shape();
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      const radius = i % 2 ? .061 : i % 4 ? .24 : .39;
      const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
      if (i === 0) star.moveTo(x, y);
      else star.lineTo(x, y);
    }
    star.closePath();
    const flare = new THREE.Mesh(new THREE.ShapeGeometry(star), white);
    flare.rotation.set(-.79, 0, -.35);
    const outer = new THREE.Mesh(slashStroke(.65, 2.45, 0, .13), halo);
    const inner = new THREE.Mesh(slashStroke(.49, 2.18, 0, .10), white);
    outer.rotation.set(.29, 0, -.40);
    inner.rotation.set(-.48, 0, .34);
    group.add(outer, inner, flare);
    group.scale.setScalar(.62 * size);
    this.scene.add(group);
    this.activeMeshes.push({
      mesh: group,
      age: 0,
      duration: .20,
      materials: [halo, white],
      onUpdate: p => {
        group.scale.setScalar(size * (.62 + .58 * (1 - (1 - p) ** 3)));
        flare.scale.setScalar(1 - .55 * p);
        const fade = 1 - THREE.MathUtils.smoothstep(p, .12, 1);
        halo.opacity = .76 * fade;
        white.opacity = fade;
      },
    });
  }

  public spawnGravityCast(
    palm: THREE.Vector3, target: THREE.Vector3, yaw: number, color: number, accent: number,
  ): void {
    this.spawnCastingFlash(palm, yaw, color, accent);
    const direction = new THREE.Vector3(target.x - palm.x, .91 - palm.y, target.z - palm.z);
    const distance = direction.length();
    if (distance < .25) return;
    const side = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const points: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i <= 18; i++) {
      const t = i / 18;
      const arch = Math.sin(t * Math.PI);
      const width = .13 * arch * (1 - .65 * t);
      const x = direction.x * t + side.x * arch * .24;
      const y = direction.y * t + arch * Math.min(.68, distance * .15);
      const z = direction.z * t + side.z * arch * .24;
      points.push(x - side.x * width, y - width * .48, z - side.z * width,
        x + side.x * width, y + width * .48, z + side.z * width);
      if (i > 0) {
        const a = (i - 1) * 2;
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    geometry.setIndex(indices);
    const mat = new THREE.MeshBasicMaterial({
      color: accent, side: THREE.DoubleSide, transparent: true, depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.copy(palm);
    geometry.setDrawRange(0, 12);
    this.scene.add(mesh);
    this.activeMeshes.push({
      mesh,
      age: 0,
      duration: .24,
      materials: [mat],
      onUpdate: p => {
        const front = Math.ceil(18 * THREE.MathUtils.smoothstep(p, 0, .42));
        const tail = Math.floor(18 * THREE.MathUtils.smoothstep(p, .22, 1));
        geometry.setDrawRange(tail * 6, Math.max(0, front - tail) * 6);
        mat.opacity = 1 - THREE.MathUtils.smoothstep(p, .48, 1);
      },
    });
  }

  public spawnSentinelDischarge(origin: THREE.Vector3, target: THREE.Vector3, radius: number): void {
    this.spawnShockwaveRing(target, radius, 0xe46e54, 0xffb98b, .30);
    const group = new THREE.Group();
    group.position.copy(origin);
    const reach = target.clone().sub(origin);
    const lateral = new THREE.Vector3(-reach.z, 0, reach.x).normalize();
    const spine = [[0,0,0],[.18,-.13,.081],[.32,.20,.145],[.51,-.20,.078],[.68,.17,.11],[.81,-.13,.064],[1,0,0]];
    const trace = (width: number, color: number) => {
      const verts: number[] = [];
      for (const [t, offset, rise] of spine) {
        const center = reach.clone().multiplyScalar(t).addScaledVector(lateral, offset);
        center.y += rise;
        const thickness = width * (.68 + Math.sin(t * Math.PI) * .55);
        for (const side of [-1, 1]) {
          const p = center.clone().addScaledVector(lateral, side * thickness);
          verts.push(p.x, p.y, p.z);
        }
      }
      const indices = spine.slice(1).flatMap((_, i) => {
        const a = i * 2;
        return [a, a + 1, a + 2, a + 2, a + 1, a + 3];
      });
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      geometry.setIndex(indices);
      return new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
        color, side: THREE.DoubleSide, transparent: true, depthWrite: false,
      }));
    };
    const contour = trace(.102, 0x842d4b);
    const light = trace(.043, 0xffe2a2);
    light.position.y = .015;
    light.renderOrder = 1;
    group.add(contour, light);
    this.scene.add(group);
    this.activeMeshes.push({
      mesh: group, age: 0, duration: .19, materials: [contour.material, light.material],
      onUpdate: p => {
        contour.material.opacity = .95 * (1 - p);
        light.material.opacity = 1 - p * p;
      },
    });
  }

  public spawnFiendCollapse(body: THREE.Object3D, origin: THREE.Vector3, flying: boolean): void {
    const group = new THREE.Group();
    group.position.copy(origin);
    this.scene.add(group);
    // Combat relinquishes the model immediately. The effect owns and disposes it.
    group.attach(body);
    const pose = body.rotation.clone();
    const size = body.scale.clone();
    const positions = new Float32Array(9 * 9);
    const colors = new Float32Array(positions.length);
    const geometry = new THREE.BufferGeometry();
    const vertices = new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', vertices);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.MeshBasicMaterial({
      vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    const fragments = new THREE.Mesh(geometry, material);
    fragments.frustumCulled = false;
    group.add(fragments);
    const palette = (flying ? [0x7dc2b5, 0x426e74, 0xc19d71] : [0x8b425f, 0x56334d, 0xe38b6b])
      .map(color => new THREE.Color(color));
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 3; j++) palette[(i * 5) % palette.length].toArray(colors, i * 9 + j * 3);
    }
    this.activeMeshes.push({
      mesh: group, age: 0, duration: flying ? .51 : .37, materials: [material],
      onUpdate: p => {
        const crush = THREE.MathUtils.smoothstep(p, .06, .72);
        const dissipate = 1 - THREE.MathUtils.smoothstep(p, .41, .92);
        const squash = (1 - crush * .94) * dissipate;
        const spread = (1 + crush * (flying ? .14 : .65)) * dissipate;
        body.scale.set(size.x * spread, size.y * squash, size.z * spread);
        body.rotation.z = pose.z + (flying ? .70 : .23) * crush;
        body.visible = p < .92;
        material.opacity = 1 - THREE.MathUtils.smoothstep(p, .31, 1);
        for (let i = 0; i < 9; i++) {
          const angle = i * 2.39996 + p * (i % 2 ? -.71 : .81);
          const travel = .23 + p * (.68 + i % 4 * .24);
          const x = Math.sin(angle) * travel;
          const z = Math.cos(angle) * travel;
          const start = flying ? 1.08 : .35;
          const y = Math.max(.061, start + p * (.46 + i % 3 * .71) - p * p * 2.62);
          const shard = (.058 + i % 3 * .021) * (1 - p * .58);
          vertices.setXYZ(i * 3, x - shard, y, z + shard * .66);
          vertices.setXYZ(i * 3 + 1, x + shard * .58, y + shard * 2.23, z);
          vertices.setXYZ(i * 3 + 2, x + shard, y - shard * .60, z - shard);
        }
        vertices.needsUpdate = true;
      },
    });
  }

  /**
   * Spawns an expanding AoE shockwave / elemental circle on the ground.
   */
  public spawnShockwaveRing(
    center: THREE.Vector3,
    maxRadius: number,
    colorHex: number,
    accentHex: number,
    duration = 0.42,
    strength = 1,
  ): void {
    const group = new THREE.Group();
    group.position.set(center.x, center.y + 0.05, center.z);

    const ringGeo = new THREE.RingGeometry(0.7, 1.0, 36);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9 * strength,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);

    const discGeo = new THREE.CircleGeometry(0.95, 32);
    discGeo.rotateX(-Math.PI / 2);
    const discMat = new THREE.MeshBasicMaterial({
      color: accentHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35 * strength,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const discMesh = new THREE.Mesh(discGeo, discMat);

    group.add(ringMesh, discMesh);
    this.scene.add(group);

    this.activeMeshes.push({
      mesh: group,
      age: 0,
      duration,
      materials: [ringMat, discMat],
      onUpdate: (p) => {
        const currentR = THREE.MathUtils.lerp(0.3, maxRadius, 1 - Math.pow(1 - p, 2));
        group.scale.set(currentR, 1, currentR);
        ringMat.opacity = (1 - p) * 0.95 * strength;
        discMat.opacity = (1 - p) * 0.35 * strength;
      },
    });
  }

  public spawnGenesisCharge(
    duration: number, color: number, accent: number, sample: () => GenesisChargeSample | undefined,
  ): void {
    const charge = buildGenesisCharge(color, accent);
    this.scene.add(charge.mesh);
    this.activeMeshes.push({
      mesh: charge.mesh, age: 0, duration, materials: [],
      onUpdate: progress => charge.pose(progress, sample()),
    });
  }

  public spawnGenesisImpact(
    center: THREE.Vector3, staff: THREE.Vector3, radius: number, color: number, accent: number,
  ): void {
    const impact = buildGenesisImpact(center, staff, radius, color, accent);
    this.scene.add(impact.mesh);
    this.activeMeshes.push({
      mesh: impact.mesh, age: 0, duration: 1.04, materials: [], onUpdate: impact.pose,
    });
  }

  public spawnSpearThrustBeam(
    origin: THREE.Vector3,
    facingYaw: number,
    length: number,
    colorHex: number,
    accentHex: number,
    tip?: THREE.Vector3,
    force = 1,
  ): void {
    const group = new THREE.Group();
    group.position.copy(origin);
    group.position.y += 0.95;
    group.rotation.y = facingYaw;
    if (tip) {
      const forward = new THREE.Vector3(Math.sin(facingYaw), 0, Math.cos(facingYaw));
      length = Math.max(.8, length - tip.clone().sub(origin).dot(forward));
      group.position.copy(tip);
    }

    const inkMat = new THREE.MeshBasicMaterial({
      color: colorHex, side: THREE.DoubleSide, transparent: true, opacity: .88, depthWrite: false,
    });
    const coreMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(accentHex).lerp(new THREE.Color(0xffffff), .54),
      side: THREE.DoubleSide, transparent: true, depthWrite: false,
    });
    const stroke = (width: number, material: THREE.Material) => {
      const geometry = new THREE.BufferGeometry();
      // Paired slivers stay readable looking down on the horizontal spear.
      geometry.setAttribute('position', new THREE.Float32BufferAttribute([
        0, 0, -.32, width, 0, length*.17, 0, 0, length,
        0, 0, -.32, 0, 0, length, -width*.68, 0, length*.32,
        0, 0, -.32, 0, width*.66, length*.18, 0, 0, length,
        0, 0, -.32, 0, 0, length, 0, -width*.58, length*.36,
      ], 3));
      return new THREE.Mesh(geometry, material);
    };
    const ink = stroke(.22 * force, inkMat);
    const core = stroke(.063 * force, coreMat);
    core.position.y = .011;
    core.renderOrder = 1;
    group.add(ink, core);
    if (force > 1) {
      const splinters: number[] = [];
      for (let i = 0; i < 5; i++) {
        const angle = i * Math.PI * .4;
        const x = Math.cos(angle), y = Math.sin(angle);
        const spread = .48 + .18 * (i % 2);
        const start = length * (.045 + .065 * i);
        splinters.push(x * spread, y * spread, start,
          x * (spread + .12), y * (spread + .12), start + length * .12,
          x * .27, y * .27, start + length * .52);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(splinters, 3));
      group.add(new THREE.Mesh(geometry, inkMat));
    }
    group.scale.set(.96, .96, .83);
    this.scene.add(group);

    this.activeMeshes.push({
      mesh: group,
      age: 0,
      duration: 0.15 + (force - 1) * .04,
      materials: [inkMat, coreMat],
      onUpdate: (p) => {
        group.scale.set(1 - p*.78, 1 - p*.78, .83 + .17 * (1 - (1 - p)**3));
        inkMat.opacity = .88 * (1 - p)**1.8;
        coreMat.opacity = 1 - p*p;
      },
    });
  }

  public spawnFallingMeteor(
    target: THREE.Vector3, radius: number, duration: number, color: number, accent: number,
    onImpact: () => void,
  ): void {
    const flight = buildMeteorFlight(target, radius, duration, color, accent);
    this.scene.add(flight.mesh);
    const impactProgress = .92;
    this.activeMeshes.push({
      mesh: flight.mesh,
      age: 0,
      duration,
      materials: [],
      onUpdate: p => {
        if (p < impactProgress) {
          flight.pose(p * duration, impactProgress * duration);
        } else if (flight.mesh.visible) {
          flight.mesh.visible = false;
          onImpact();
        }
      },
    });
  }

  public spawnMeteorImpact(target: THREE.Vector3, radius: number, color: number, accent: number): void {
    const impact = buildMeteorImpact(target, radius, color, accent);
    this.scene.add(impact.mesh);
    this.activeMeshes.push({
      mesh: impact.mesh, age: 0, duration: .36, materials: [], onUpdate: impact.pose,
    });
  }

  public spawnNovaBurst(target: THREE.Vector3, radius: number, color: number, accent: number): void {
    const burst = buildNovaBurst(target, radius, color, accent);
    this.scene.add(burst.mesh);
    this.activeMeshes.push({
      mesh: burst.mesh, age: 0, duration: .39, materials: [], onUpdate: burst.pose,
    });
  }

  public spawnEarthshaker(center: THREE.Vector3, contact: THREE.Vector3, radius: number, color: number, accent: number): void {
    const impact = buildEarthshakerImpact(center, contact, radius, color, accent);
    this.scene.add(impact.mesh);
    this.activeMeshes.push({
      mesh: impact.mesh, age: 0, duration: .53, materials: [], onUpdate: impact.pose,
    });
  }

  public spawnDeathmarkCast(origin: THREE.Vector3, targets: readonly THREE.Vector3[], color: number, accent: number): void {
    const cast = buildDeathmarkCast(origin, targets, color, accent);
    this.scene.add(cast.mesh);
    this.activeMeshes.push({
      mesh: cast.mesh, age: 0, duration: .115, materials: [], onUpdate: cast.pose,
    });
  }

  public spawnHeavensfallDescent(
    duration: number, color: number, accent: number,
    sample: () => { tip: THREE.Vector3; phase: number } | undefined,
  ): void {
    const trail = buildHeavensfallDescent(color, accent);
    this.scene.add(trail.mesh);
    this.activeMeshes.push({
      mesh: trail.mesh, age: 0, duration, materials: [], onUpdate: () => trail.pose(sample()),
    });
  }

  public spawnHeavensfallImpact(
    center: THREE.Vector3, tip: THREE.Vector3, radius: number, color: number, accent: number,
  ): void {
    const impact = buildHeavensfallImpact(center, tip, radius, color, accent);
    this.scene.add(impact.mesh);
    this.activeMeshes.push({
      mesh: impact.mesh, age: 0, duration: .62, materials: [], onUpdate: impact.pose,
    });
  }

  public spawnShadowBladeTrails(
    duration: number, color: number, accent: number,
    sample: () => Parameters<ReturnType<typeof buildShadowBladeTrails>['pose']>[1],
  ): void {
    const trail = buildShadowBladeTrails(color, accent);
    this.scene.add(trail.mesh);
    this.activeMeshes.push({
      mesh: trail.mesh, age: 0, duration, materials: [], onUpdate: progress => trail.pose(progress, sample()),
    });
  }

  public spawnThousandShadows(center: THREE.Vector3, yaw: number, radius: number, color: number, accent: number): void {
    const impact = buildThousandShadows(center, yaw, radius, color, accent);
    const duration = .9;
    this.scene.add(impact.mesh);
    this.activeMeshes.push({
      mesh: impact.mesh, age: 0, duration, materials: [], onUpdate: progress => impact.pose(progress * duration),
    });
  }

  /**
   * Spawns a dash afterimage silhouette at the given position.
   */
  public spawnDashAfterimage(position: THREE.Vector3, colorHex: number): void {
    const geo = new THREE.CylinderGeometry(0.28, 0.35, 1.35, 10);
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.58,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ghost = new THREE.Mesh(geo, mat);
    ghost.position.set(position.x, position.y + 0.75, position.z);
    this.scene.add(ghost);

    this.activeMeshes.push({
      mesh: ghost,
      age: 0,
      duration: 0.28,
      materials: [mat],
      onUpdate: (p) => {
        mat.opacity = (1 - p) * 0.58;
        ghost.scale.setScalar(1 - p * 0.25);
      },
    });
  }

  public spawnMirageAfterimage(source: THREE.Object3D, colorHex: number): void {
    source.updateWorldMatrix(true, false);
    source.updateMatrixWorld(true);
    const shadow = new THREE.Group();
    const posedGeometry: THREE.BufferGeometry[] = [];
    const vertex = new THREE.Vector3();
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(colorHex).lerp(new THREE.Color(0x21112e), .54),
      transparent: true,
      depthWrite: false,
      opacity: .53,
    });
    source.traverse(part => {
      if (!(part instanceof THREE.Mesh) || !part.castShadow) return;
      let geometry = part.geometry;
      // Rigid pieces can borrow their buffers. Bake the sleeve and cloth positions
      // once so those pieces also keep the departure pose as the hero moves away.
      if (part instanceof THREE.SkinnedMesh) {
        geometry = new THREE.BufferGeometry();
        const count = part.geometry.getAttribute('position').count;
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) part.getVertexPosition(i, vertex).toArray(positions, i * 3);
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const index = part.geometry.getIndex();
        if (index) geometry.setIndex(index.clone());
        posedGeometry.push(geometry);
      }
      const frozen = new THREE.Mesh(geometry, material);
      frozen.matrixAutoUpdate = false;
      frozen.matrix.copy(part.matrixWorld);
      shadow.add(frozen);
    });
    this.scene.add(shadow);
    this.activeMeshes.push({
      mesh: shadow,
      age: 0,
      duration: .32,
      materials: [material],
      onUpdate: p => { material.opacity = .53 * (1 - THREE.MathUtils.smoothstep(p, .18, 1)); },
      dispose: () => {
        for (const geometry of posedGeometry) geometry.dispose();
        material.dispose();
      },
    });
  }

  /**
   * Spawns a floating anime damage number projected into screen coordinates.
   */
  public spawnDamageNumber(
    worldPos: THREE.Vector3,
    amount: number,
    isCrit: boolean,
    colorCss = '#ffffff',
    customLabel?: string,
    anchorHeight = 1.4,
  ): void {
    const el = document.createElement('div');
    el.className = `dmg-number ${isCrit ? 'dmg-crit' : ''}`;
    el.style.color = isCrit ? '#ffea00' : colorCss;
    el.textContent = customLabel ?? (isCrit ? `✦ ${amount}!` : `${amount}`);
    el.style.opacity = '0';
    this.damageLayer.appendChild(el);

    this.damageNumbers.push({
      element: el,
      worldPos: worldPos.clone().add(new THREE.Vector3(0, anchorHeight, 0)),
      age: 0,
      duration: isCrit ? 0.9 : 0.7,
      velocityY: isCrit ? 1.95 : 1.48,
      width: 0, height: 0, lane: -1,
    });
  }

  public update(dt: number, camera: THREE.Camera): void {
    // Update 3D VFX meshes
    for (let i = this.activeMeshes.length - 1; i >= 0; i--) {
      const item = this.activeMeshes[i];
      item.age += dt;
      const p = Math.min(1, item.age / item.duration);
      item.onUpdate(p, dt);

      if (item.age >= item.duration) {
        this.scene.remove(item.mesh);
        if (item.dispose) item.dispose();
        else disposeObject(item.mesh);
        this.activeMeshes.splice(i, 1);
      }
    }

    // Update 2D projected floating damage numbers
    if (this.damageNumbers.length === 0) return;
    const viewport = getViewportProfile();
    const widthHalf = viewport.width / 2;
    const heightHalf = viewport.height / 2;
    const occupied: LabelRect[] = [];

    // Read new label sizes together, before writing any transforms.
    for (const d of this.damageNumbers) {
      if (!d.width) {
        d.width = d.element.offsetWidth;
        d.height = d.element.offsetHeight;
      }
    }
    let active = 0;
    for (const d of this.damageNumbers) {
      d.age += dt;
      d.worldPos.y += d.velocityY * dt;
      if (d.age >= d.duration) {
        d.element.remove();
        continue;
      }
      this.damageNumbers[active++] = d;
      const p = d.age / d.duration;
      const projected = this.projection.copy(d.worldPos).project(camera);
      const x = (projected.x + 1) * widthHalf;
      const y = (1 - projected.y) * heightHalf;
      const peakScale = Math.min(1.18, Math.max(0, viewport.width - 18) / Math.max(1, d.width));
      const pop = p < .15 ? .76 + p / .15 * .42
        : THREE.MathUtils.lerp(1.18, 1, THREE.MathUtils.smoothstep(p, .15, .32));
      // Reserve the label's peak size so the pop never overlaps its neighbor.
      const box = Math.abs(projected.x) <= 1 && Math.abs(projected.z) <= 1 && y <= viewport.height
        ? placeFloatingLabel(x, y, d.width * peakScale, d.height * peakScale, viewport, occupied, d.lane)
        : undefined;
      if (!box) {
        d.element.style.opacity = '0';
        continue;
      }
      d.lane = box.lane;
      occupied.push(box);
      const left = box.x + (box.width - d.width) * .5;
      const top = box.y + (box.height - d.height) * .5;
      d.element.style.transform = `translate3d(${left.toFixed(1)}px, ${top.toFixed(1)}px, 0) scale(${(pop * peakScale / 1.18).toFixed(2)})`;
      d.element.style.opacity = (1 - THREE.MathUtils.smoothstep(p, .63, 1)).toFixed(2);
    }
    this.damageNumbers.length = active;
  }

  public clearAll(): void {
    for (const item of this.activeMeshes) {
      this.scene.remove(item.mesh);
      if (item.dispose) item.dispose();
      else disposeObject(item.mesh);
    }
    this.activeMeshes = [];
    for (const d of this.damageNumbers) {
      d.element.remove();
    }
    this.damageNumbers = [];
  }
}
