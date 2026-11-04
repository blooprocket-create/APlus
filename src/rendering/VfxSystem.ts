import * as THREE from 'three';

interface ActiveVfxMesh {
  mesh: THREE.Object3D;
  age: number;
  duration: number;
  onUpdate: (progress: number, dt: number) => void;
  materials: THREE.Material[];
}

interface FloatingDamageEntry {
  element: HTMLDivElement;
  worldPos: THREE.Vector3;
  age: number;
  duration: number;
  velocityY: number;
  offsetX: number;
}

export class VfxSystem {
  private scene: THREE.Scene;
  private damageLayer: HTMLElement;
  private activeMeshes: ActiveVfxMesh[] = [];
  private damageNumbers: FloatingDamageEntry[] = [];

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
    tiltAngle = 0
  ): void {
    const group = new THREE.Group();
    group.position.copy(origin);
    group.position.y += 0.95;
    group.rotation.y = facingYaw;
    group.rotation.z = tiltAngle;

    const outerGeo = new THREE.RingGeometry(
      radius * 0.52,
      radius,
      24,
      1,
      -Math.PI * 0.65,
      Math.PI * 1.3
    );
    outerGeo.rotateX(-Math.PI / 2);
    const outerMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);

    const innerGeo = new THREE.RingGeometry(
      radius * 0.72,
      radius * 0.96,
      24,
      1,
      -Math.PI * 0.58,
      Math.PI * 1.16
    );
    innerGeo.rotateX(-Math.PI / 2);
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

  /**
   * Spawns an expanding AoE shockwave / elemental circle on the ground.
   */
  public spawnShockwaveRing(
    center: THREE.Vector3,
    maxRadius: number,
    colorHex: number,
    accentHex: number,
    duration = 0.42
  ): void {
    const group = new THREE.Group();
    group.position.set(center.x, 0.05, center.z);

    const ringGeo = new THREE.RingGeometry(0.7, 1.0, 36);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
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
      opacity: 0.35,
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
        ringMat.opacity = (1 - p) * 0.95;
        discMat.opacity = (1 - p) * 0.35;
      },
    });
  }

  /**
   * Spawns a dramatic Anime Ultimate Domain / Celestial Pillar burst.
   */
  public spawnUltimateBurst(
    center: THREE.Vector3,
    radius: number,
    colorHex: number,
    accentHex: number
  ): void {
    this.spawnShockwaveRing(center, radius, colorHex, accentHex, 0.65);

    const group = new THREE.Group();
    group.position.copy(center);

    // Tall celestial pillar beam
    const pillarGeo = new THREE.CylinderGeometry(radius * 0.42, radius * 0.55, 18, 24, 1, true);
    pillarGeo.translate(0, 9, 0);
    const pillarMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const pillarMesh = new THREE.Mesh(pillarGeo, pillarMat);

    // Dome shell
    const domeGeo = new THREE.SphereGeometry(radius * 0.85, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshBasicMaterial({
      color: accentHex,
      wireframe: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const domeMesh = new THREE.Mesh(domeGeo, domeMat);

    group.add(pillarMesh, domeMesh);
    this.scene.add(group);

    this.activeMeshes.push({
      mesh: group,
      age: 0,
      duration: 0.75,
      materials: [pillarMat, domeMat],
      onUpdate: (p, dt) => {
        const s = 0.5 + Math.sin(p * Math.PI * 0.5) * 0.65;
        domeMesh.scale.setScalar(s);
        domeMesh.rotation.y += dt * 5;
        pillarMesh.rotation.y -= dt * 4;
        pillarMat.opacity = (1 - p) * 0.75;
        domeMat.opacity = (1 - p) * 0.68;
      },
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
    ghost.position.set(position.x, 0.75, position.z);
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

  /**
   * Spawns a floating anime damage number projected into screen coordinates.
   */
  public spawnDamageNumber(
    worldPos: THREE.Vector3,
    amount: number,
    isCrit: boolean,
    colorCss = '#ffffff',
    customLabel?: string
  ): void {
    const el = document.createElement('div');
    el.className = `dmg-number ${isCrit ? 'dmg-crit' : ''}`;
    el.style.color = isCrit ? '#ffea00' : colorCss;
    el.textContent = customLabel ?? (isCrit ? `✦ ${amount}!` : `${amount}`);
    this.damageLayer.appendChild(el);

    this.damageNumbers.push({
      element: el,
      worldPos: worldPos.clone().add(new THREE.Vector3(0, 1.4, 0)),
      age: 0,
      duration: isCrit ? 0.9 : 0.7,
      velocityY: isCrit ? 2.4 : 1.8,
      offsetX: (Math.random() - 0.5) * 34,
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
        for (const m of item.materials) {
          m.dispose();
        }
        this.activeMeshes.splice(i, 1);
      }
    }

    // Update 2D projected floating damage numbers
    const widthHalf = window.innerWidth / 2;
    const heightHalf = window.innerHeight / 2;

    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const d = this.damageNumbers[i];
      d.age += dt;
      d.worldPos.y += d.velocityY * dt;

      const p = Math.min(1, d.age / d.duration);
      const projected = d.worldPos.clone().project(camera);
      const x = projected.x * widthHalf + widthHalf + d.offsetX;
      const y = -(projected.y * heightHalf) + heightHalf;

      const opacity = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
      const scale = p < 0.15 ? 0.6 + (p / 0.15) * 0.65 : 1.05;
      d.element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(2)})`;
      d.element.style.opacity = opacity.toFixed(2);

      if (d.age >= d.duration) {
        d.element.remove();
        this.damageNumbers.splice(i, 1);
      }
    }
  }

  public clearAll(): void {
    for (const item of this.activeMeshes) {
      this.scene.remove(item.mesh);
    }
    this.activeMeshes = [];
    for (const d of this.damageNumbers) {
      d.element.remove();
    }
    this.damageNumbers = [];
  }
}
