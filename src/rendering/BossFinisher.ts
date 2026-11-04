import * as THREE from 'three';
import { getViewportProfile } from '../platform/Viewport';
import { CharacterClassId } from '../types/game';
import { FINISHER_DURATION, FINISHER_SIGNATURES, FinisherFrame, sampleFinisher } from '../game/FinisherTimeline';
import { CharacterRig } from './CharacterMeshBuilder';
import { EnemyMeshBundle } from './EnemyMeshBuilder';
import { disposeObject } from './SceneResources';

export interface FinisherActors {
  hero: CharacterRig;
  boss: EnemyMeshBundle;
  classId: CharacterClassId;
  bossName: string;
  lastWords: string;
}

/** An owned, real-time sequence. No wall-clock timers or combat callbacks inside the effects. */
export class BossFinisher {
  private time = 0;
  private completed = false;
  private group = new THREE.Group();
  private center: THREE.Vector3;
  private heroStart: THREE.Vector3;
  private bossStart: THREE.Vector3;
  private heroRotation: THREE.Euler;
  private bossRotation: THREE.Euler;
  private originalFov: number;
  private lighting: Array<{ light: THREE.Light; intensity: number }> = [];
  private rings: THREE.Mesh[] = [];
  private blades: THREE.Mesh[] = [];
  private shards: THREE.Mesh[] = [];
  private beam: THREE.Mesh;
  private light: THREE.PointLight;
  private particles: THREE.Points;
  private lastPhase = '';

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
    private actors: FinisherActors,
    private onFrame: (frame: FinisherFrame) => void,
    private onCue: (cue: 'charge' | 'strike' | 'requiem') => void,
    private onComplete: () => void,
    private shakeEnabled = true,
  ) {
    this.center = actors.boss.root.position.clone();
    this.heroStart = actors.hero.root.position.clone();
    this.bossStart = actors.boss.root.position.clone();
    this.heroRotation = actors.hero.root.rotation.clone();
    this.bossRotation = actors.boss.root.rotation.clone();
    this.originalFov = camera.fov;
    actors.boss.hpBarGroup.visible = false;
    scene.traverse(object => { if (object instanceof THREE.Light) { this.lighting.push({ light: object, intensity: object.intensity }); object.intensity *= 0.18; } });
    this.group.position.copy(this.center);
    scene.add(this.group);
    const color = FINISHER_SIGNATURES[actors.classId].color;
    const energy = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
    for (let i = 0; i < 6; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5 + i * 0.55, 0.025 + i * 0.008, 6, 96), energy);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.08 + i * 0.15;
      this.group.add(ring); this.rings.push(ring);
    }
    const beamGeometry = new THREE.CylinderGeometry(0.04, 0.65, 18, 12, 1, true);
    this.beam = new THREE.Mesh(beamGeometry, new THREE.MeshBasicMaterial({ color: 0xfff5df, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    this.beam.position.y = 9; this.beam.visible = false; this.group.add(this.beam);
    const bladeGeometry = new THREE.ConeGeometry(0.16, 2.3, 4);
    for (let i = 0; i < 24; i++) {
      const blade = new THREE.Mesh(bladeGeometry, energy);
      this.group.add(blade); this.blades.push(blade);
    }
    const shardGeometry = new THREE.TetrahedronGeometry(0.15);
    const shardMaterial = new THREE.MeshStandardMaterial({ color: 0x384356, emissive: color, emissiveIntensity: 0.4, metalness: 0.6, roughness: 0.4 });
    for (let i = 0; i < 64; i++) {
      const shard = new THREE.Mesh(shardGeometry, shardMaterial);
      shard.visible = false; this.group.add(shard); this.shards.push(shard);
    }
    const positions = new Float32Array(300 * 3);
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({ color, size: 0.075, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.group.add(this.particles);
    this.light = new THREE.PointLight(color, 30, 28, 1.5);
    this.light.position.y = 4; this.group.add(this.light);
    this.update(0);
  }

  public update(dt: number): void {
    if (this.completed) return;
    this.time = Math.min(FINISHER_DURATION, this.time + dt);
    const frame = sampleFinisher(this.time, this.actors.classId, this.actors.bossName, this.actors.lastWords);
    const p = frame.phaseProgress;
    const hero = this.actors.hero.root;
    const boss = this.actors.boss.root;
    const type = this.actors.classId;
    const smooth = (x: number) => x * x * (3 - 2 * x);
    let offset = new THREE.Vector3();
    let look = this.center.clone().add(new THREE.Vector3(0, 1.4, 1));
    let fov = 42;
    if (frame.phase !== this.lastPhase) {
      if (frame.phase === 'awakening') this.onCue('charge');
      if (frame.phase === 'impact') this.onCue('strike');
      if (frame.phase === 'requiem') this.onCue('requiem');
    }
    if (frame.phase === 'silence') {
      const direction = this.heroStart.clone().sub(this.center).setY(0).normalize();
      if (direction.lengthSq() === 0) direction.set(0, 0, 1);
      hero.position.copy(this.center).addScaledVector(direction, 3.5);
      hero.rotation.y = Math.atan2(-direction.x, -direction.z);
      offset.set(2.8, 1.4 + p * 0.3, 4.5 - p);
      fov = 42 - p * 8;
    } else if (frame.phase === 'awakening') {
      const angle = p * Math.PI * 1.2;
      offset.set(Math.sin(angle) * 6, 2 + p * 2, Math.cos(angle) * 6);
      hero.position.copy(this.center).add(new THREE.Vector3(type === 'assassin' ? Math.sin(angle * 3) * 4 : 0, type === 'warrior' ? 1 + smooth(p) * 6 : type === 'mage' ? 0.8 + p * 2 : 0.4, 3.5));
      if (type === 'warrior') look.y += p * 2.8;
      fov = 45 + p * 10;
    } else if (frame.phase === 'execution') {
      if (type === 'warrior') {
        hero.position.copy(this.center).add(new THREE.Vector3(0, 7 - smooth(p) * 5.5, 2.5 - p * 2));
        hero.rotation.x = -p * 0.8;
        offset.set(5 - p * 3, 4.5 - p * 3, 6 - p * 2);
        look.y += 2.8 * (1 - p);
      } else if (type === 'mage') {
        hero.position.copy(this.center).add(new THREE.Vector3(0, 2.5 + Math.sin(p * Math.PI) * 0.6, 4));
        offset.set(-4 + p * 2, 2.5 + p, 7 - p * 2);
      } else {
        const angle = p * Math.PI * 8;
        hero.position.copy(this.center).add(new THREE.Vector3(Math.sin(angle) * 3, 0.5 + Math.sin(p * Math.PI) * 2, Math.cos(angle) * 3));
        hero.rotation.y = -angle;
        offset.set(5, 5 - p * 2, 5);
      }
      this.actors.hero.updateAnimation(dt, { isMoving: false, moveSpeedRatio: 0, isDashing: type === 'assassin', attackComboStep: 5, attackSwingProgress: p, hitFlashTimer: 0 });
      boss.position.y = this.bossStart.y + (type === 'mage' ? Math.sin(p * Math.PI / 2) * 1.8 : 0);
      fov = 55 - p * 20;
    } else if (frame.phase === 'impact') {
      hero.position.copy(this.center).add(new THREE.Vector3(0, 0.2, type === 'mage' ? 4 : 1.1));
      hero.rotation.x = 0;
      offset.set(2, 1.8 + p * 3.5, 5 + p * 6);
      boss.scale.setScalar(Math.max(0.01, 1 - smooth(p)));
      boss.rotation.z = p * 1.6;
      fov = 40 + p * 22;
      this.beam.visible = true;
      this.beam.scale.set(1 + p * 12, 1, 1 + p * 12);
      (this.beam.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - p);
      this.light.intensity = 80 * (1 - p) + 8;
    } else {
      boss.visible = false;
      hero.position.copy(this.center).add(new THREE.Vector3(0, 0, 2.5));
      hero.rotation.set(0, 0.25, 0);
      offset.set(-3 + p * 1.5, 2.5, 8 + p * 2);
      look = hero.position.clone().add(new THREE.Vector3(0, 1, 0));
      fov = 38;
      this.light.intensity = 8 * (1 - p) + 2;
    }
    if (frame.phase === 'impact' || frame.phase === 'requiem') {
      this.actors.hero.updateAnimation(dt, { isMoving: false, moveSpeedRatio: 0, isDashing: false, attackComboStep: 0, attackSwingProgress: 0, hitFlashTimer: 0 });
    }
    this.rings.forEach((ring, i) => {
      const active = frame.phase !== 'silence';
      ring.visible = active;
      const radius = frame.phase === 'impact' ? 1 + p * (8 + i) : frame.phase === 'requiem' ? 9 + p * 3 : 0.4 + Math.min(1, (this.time - 1.6) / 4) * (1 + i * 0.12);
      ring.scale.setScalar(radius);
      ring.rotation.z = this.time * (i % 2 ? -1 : 1) * 0.5;
      if (type === 'mage' && frame.phase === 'execution') { ring.rotation.x = i * 0.6 + this.time * 0.3; ring.position.y = 1.8; }
    });
    this.blades.forEach((blade, i) => {
      const angle = i / this.blades.length * Math.PI * 2 + this.time * (type === 'assassin' ? 3 : 0.45);
      const inward = frame.phase === 'execution' ? 1 - p * 0.85 : 1;
      const radius = (type === 'assassin' ? 5 : 3.8) * inward;
      blade.visible = frame.phase === 'awakening' || frame.phase === 'execution';
      blade.position.set(Math.sin(angle) * radius, 2 + Math.cos(angle * 2) * (type === 'mage' ? 1.5 : 0.3), Math.cos(angle) * radius);
      blade.lookAt(this.center.x, this.center.y + 1.2, this.center.z);
      blade.rotateX(Math.PI / 2);
      blade.scale.setScalar(type === 'warrior' ? 0.4 : 1);
    });
    const explosion = Math.max(0, this.time - 7.2);
    this.shards.forEach((shard, i) => {
      const angle = i * 2.39996;
      const distance = explosion * (2 + (i % 7) * 0.6);
      shard.visible = explosion > 0;
      shard.position.set(Math.sin(angle) * distance, 1.6 + Math.sin(i * 13) * distance * 0.5 - explosion * explosion * 0.25, Math.cos(angle) * distance);
      shard.rotation.set(this.time * (i % 3), this.time + i, i + explosion);
      shard.scale.setScalar(Math.max(0, 1 - explosion / 5));
    });
    const points = this.particles.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < points.count; i++) {
      const angle = i * 2.39996 + this.time * 0.5;
      const radius = frame.phase === 'requiem' ? 2 + explosion * (i % 5) : 1 + (i % 23) * 0.19;
      points.setXYZ(i, Math.cos(angle) * radius, (i * 0.137 + this.time * 0.8) % 10, Math.sin(angle) * radius);
    }
    points.needsUpdate = true;
    const desired = this.center.clone().add(offset);
    if (frame.phase === 'impact' && this.shakeEnabled) { desired.x += Math.sin(this.time * 125) * (1 - p) * 0.4; desired.y += Math.cos(this.time * 140) * (1 - p) * 0.25; }
    if (this.lastPhase !== frame.phase) this.camera.position.copy(desired);
    else this.camera.position.lerp(desired, 1 - Math.exp(-dt * 12));
    // Compose for the visible cinema aperture, including portrait displays.
    const viewport = getViewportProfile();
    const height = viewport.height;
    const minBar = viewport.touchUI && viewport.landscape ? Math.min(56, height * 0.15) : 70;
    const bar = Math.min(height * 0.28, Math.max(minBar, (height - viewport.width / 2.39) / 2));
    const aperture = Math.max(0.3, (height - 2 * bar) / height);
    this.camera.fov = Math.min(110, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(fov) / 2) / aperture)));
    this.camera.updateProjectionMatrix(); this.camera.lookAt(look);
    this.lastPhase = frame.phase;
    this.onFrame(frame);
    if (this.time >= FINISHER_DURATION) this.finish();
  }

  /** Idempotent: skip, natural end, and a scene transition can never grant rewards twice. */
  public finish(): void {
    if (this.completed) return;
    this.completed = true;
    this.scene.remove(this.group); disposeObject(this.group);
    this.lighting.forEach(({ light, intensity }) => { light.intensity = intensity; });
    this.actors.hero.root.position.copy(this.heroStart); this.actors.hero.root.rotation.copy(this.heroRotation);
    this.actors.boss.root.position.copy(this.bossStart); this.actors.boss.root.rotation.copy(this.bossRotation);
    this.actors.boss.hpBarGroup.visible = true;
    this.actors.boss.root.scale.setScalar(1); this.actors.boss.root.visible = true;
    this.camera.fov = this.originalFov; this.camera.updateProjectionMatrix();
    this.onComplete();
  }
}
