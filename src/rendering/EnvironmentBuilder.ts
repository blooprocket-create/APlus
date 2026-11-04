import * as THREE from 'three';
import { attachAnimeOutline, createAnimeToonMaterial } from './AnimeMaterials';

export const ARENA_RADIUS = 22;

export class EnvironmentBuilder {
  private floatingCrystals: THREE.Object3D[] = [];
  private magicRings: THREE.Object3D[] = [];
  private starParticles: THREE.Points | null = null;
  private time = 0;

  public buildArena(scene: THREE.Scene): void {
    // Deep anime twilight-astral sky color & fog
    scene.background = new THREE.Color(0x0b0e1d);
    scene.fog = new THREE.FogExp2(0x0b0e1d, 0.016);

    // Lighting tailored for crisp MeshToonMaterial cel bands
    const ambient = new THREE.AmbientLight(0x8a9ad6, 1.15);
    scene.add(ambient);

    const sunLight = new THREE.DirectionalLight(0xfff1e6, 2.4);
    sunLight.position.set(16, 28, 18);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 5;
    sunLight.shadow.camera.far = 70;
    const d = 26;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    scene.add(sunLight);

    // Main circular sanctuary platform
    const platformGeo = new THREE.CylinderGeometry(ARENA_RADIUS, ARENA_RADIUS * 0.92, 1.6, 48);
    const platformMat = createAnimeToonMaterial({
      color: 0x1e2238,
      emissive: 0x0f1326,
      emissiveIntensity: 0.3,
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.y = -0.8;
    platform.receiveShadow = true;
    attachAnimeOutline(platform, 1.02, 0x070810);
    scene.add(platform);

    // Glowing concentric magic circles on the sanctuary floor
    const ringConfigs = [
      { inner: 3.4, outer: 3.65, color: 0x4cc9f0, opacity: 0.42 },
      { inner: 9.8, outer: 10.1, color: 0x7209b7, opacity: 0.38 },
      { inner: 16.5, outer: 16.85, color: 0xff3e6c, opacity: 0.35 },
      { inner: ARENA_RADIUS - 0.55, outer: ARENA_RADIUS - 0.15, color: 0x4cc9f0, opacity: 0.65 },
    ];

    for (const cfg of ringConfigs) {
      const rGeo = new THREE.RingGeometry(cfg.inner, cfg.outer, 64);
      rGeo.rotateX(-Math.PI / 2);
      const rMat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: cfg.opacity,
      });
      const rMesh = new THREE.Mesh(rGeo, rMat);
      rMesh.position.y = 0.015;
      scene.add(rMesh);
      this.magicRings.push(rMesh);
    }

    // Radial rune spokes
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const spokeGeo = new THREE.PlaneGeometry(0.16, ARENA_RADIUS * 1.85);
      spokeGeo.rotateX(-Math.PI / 2);
      spokeGeo.rotateY(angle);
      const spokeMat = new THREE.MeshBasicMaterial({
        color: 0x3a506b,
        transparent: true,
        opacity: 0.32,
      });
      const spoke = new THREE.Mesh(spokeGeo, spokeMat);
      spoke.position.y = 0.01;
      scene.add(spoke);
    }

    // Perimeter Astral Pillars + Floating Aether Crystals + Anime Blossom Trees
    const pillarCount = 12;
    const pillarMat = createAnimeToonMaterial({ color: 0x2b3152 });
    const crystalMat = createAnimeToonMaterial({
      color: 0x4cc9f0,
      emissive: 0x4cc9f0,
      emissiveIntensity: 0.75,
    });
    const sakuraFoliageMat = createAnimeToonMaterial({
      color: 0xff758f,
      emissive: 0xff2a6d,
      emissiveIntensity: 0.22,
    });
    const trunkMat = createAnimeToonMaterial({ color: 0x3d2645 });

    for (let i = 0; i < pillarCount; i++) {
      const angle = (i / pillarCount) * Math.PI * 2;
      const radius = ARENA_RADIUS - 0.8;
      const px = Math.cos(angle) * radius;
      const pz = Math.sin(angle) * radius;

      if (i % 3 === 0) {
        // Stylized Anime Sakura-Aether Tree on perimeter
        const treeGroup = new THREE.Group();
        treeGroup.position.set(px, 0, pz);

        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.42, 2.6, 8), trunkMat);
        trunk.position.y = 1.3;
        attachAnimeOutline(trunk, 1.06);
        treeGroup.add(trunk);

        const canopyOffsets = [
          { x: 0, y: 3.1, z: 0, r: 1.45 },
          { x: -0.9, y: 2.6, z: 0.4, r: 1.05 },
          { x: 0.85, y: 2.7, z: -0.35, r: 1.1 },
        ];
        for (const c of canopyOffsets) {
          const dome = new THREE.Mesh(new THREE.DodecahedronGeometry(c.r, 1), sakuraFoliageMat);
          dome.position.set(c.x, c.y, c.z);
          attachAnimeOutline(dome, 1.05);
          treeGroup.add(dome);
        }
        scene.add(treeGroup);
      } else {
        // Sanctuary Obelisk Pillar + Floating Crystal
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.85, 3.2, 0.85), pillarMat);
        pillar.position.set(px, 1.6, pz);
        pillar.lookAt(0, 1.6, 0);
        pillar.castShadow = true;
        attachAnimeOutline(pillar, 1.06);
        scene.add(pillar);

        const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), crystalMat);
        crystal.position.set(px, 3.95, pz);
        attachAnimeOutline(crystal, 1.08);
        scene.add(crystal);
        this.floatingCrystals.push(crystal);
      }
    }

    // Ambient floating starlight motes in the sky
    const starCount = 160;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 4 + Math.random() * (ARENA_RADIUS + 10);
      const theta = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(theta) * r;
      positions[i * 3 + 1] = 0.5 + Math.random() * 11;
      positions[i * 3 + 2] = Math.sin(theta) * r;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x90e0ef,
      size: 0.22,
      transparent: true,
      opacity: 0.75,
    });
    this.starParticles = new THREE.Points(particleGeo, particleMat);
    scene.add(this.starParticles);
  }

  public update(dt: number): void {
    this.time += dt;
    for (let i = 0; i < this.floatingCrystals.length; i++) {
      const c = this.floatingCrystals[i];
      c.rotation.y += dt * 1.2;
      c.position.y = 3.95 + Math.sin(this.time * 2.2 + i) * 0.22;
    }
    if (this.starParticles) {
      this.starParticles.rotation.y += dt * 0.04;
    }
  }
}
