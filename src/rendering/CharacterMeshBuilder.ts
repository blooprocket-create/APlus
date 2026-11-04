import * as THREE from 'three';
import { CHARACTER_CLASSES } from '../data/classes';
import { CharacterClassId } from '../types/game';
import { attachAnimeOutline, createAnimeToonMaterial } from './AnimeMaterials';

export interface CharacterAnimationState {
  isMoving: boolean;
  moveSpeedRatio: number;
  attackComboStep: number; // 0 = none, 1..3 = combo step, 4 = skill, 5 = ultimate
  attackSwingProgress: number; // 0..1
  isDashing: boolean;
  hitFlashTimer: number;
}

export class CharacterRig {
  public readonly root: THREE.Group;
  public readonly bodyPivot: THREE.Group;
  public readonly headGroup: THREE.Group;
  public readonly hairBackGroup: THREE.Group;
  public readonly capeMesh: THREE.Mesh;
  public readonly leftArmPivot: THREE.Group;
  public readonly rightArmPivot: THREE.Group;
  public readonly leftLegPivot: THREE.Group;
  public readonly rightLegPivot: THREE.Group;
  public readonly weaponGroup: THREE.Group;
  public readonly auraRing: THREE.Mesh;
  public readonly classId: CharacterClassId;

  private clock = 0;
  private emissiveMaterials: THREE.MeshToonMaterial[] = [];

  constructor(classId: CharacterClassId) {
    this.classId = classId;
    const def = CHARACTER_CLASSES[classId];

    this.root = new THREE.Group();
    this.root.name = `character_${classId}`;

    // Ground elemental aura ring
    const ringGeo = new THREE.RingGeometry(0.68, 0.86, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: def.primaryColorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
    });
    this.auraRing = new THREE.Mesh(ringGeo, ringMat);
    this.auraRing.position.y = 0.03;
    this.root.add(this.auraRing);

    this.bodyPivot = new THREE.Group();
    this.bodyPivot.position.y = 0.85;
    this.root.add(this.bodyPivot);

    // Torso (stylized anime coat / armor)
    const torsoGeo = new THREE.CylinderGeometry(0.24, 0.31, 0.72, 12);
    const torsoMat = createAnimeToonMaterial({
      color: def.secondaryColorHex,
      emissive: def.primaryColorHex,
      emissiveIntensity: 0.12,
    });
    this.emissiveMaterials.push(torsoMat);
    const torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
    torsoMesh.castShadow = true;
    attachAnimeOutline(torsoMesh, 1.07);
    this.bodyPivot.add(torsoMesh);

    // Glowing chest crystal / trim
    const coreGeo = new THREE.OctahedronGeometry(0.11, 0);
    const coreMat = createAnimeToonMaterial({
      color: def.primaryColorHex,
      emissive: def.primaryColorHex,
      emissiveIntensity: 0.75,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.set(0, 0.12, 0.25);
    this.bodyPivot.add(coreMesh);

    // Flowing Anime Scarf / Cape
    const capeGeo = new THREE.BoxGeometry(0.48, 0.78, 0.05);
    capeGeo.translate(0, -0.35, 0);
    const capeMat = createAnimeToonMaterial({
      color: def.primaryColorHex,
      emissive: def.primaryColorHex,
      emissiveIntensity: 0.2,
    });
    this.capeMesh = new THREE.Mesh(capeGeo, capeMat);
    this.capeMesh.position.set(0, 0.28, -0.22);
    this.capeMesh.rotation.x = 0.22;
    attachAnimeOutline(this.capeMesh, 1.05);
    this.bodyPivot.add(this.capeMesh);

    // Head Group
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.62, 0);
    this.bodyPivot.add(this.headGroup);

    const headGeo = new THREE.SphereGeometry(0.28, 16, 16);
    const skinMat = createAnimeToonMaterial({ color: 0xffe5d9 });
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.castShadow = true;
    attachAnimeOutline(headMesh, 1.06);
    this.headGroup.add(headMesh);

    // Anime Eyes
    const eyeGeo = new THREE.BoxGeometry(0.065, 0.08, 0.03);
    const eyeMat = new THREE.MeshBasicMaterial({ color: def.primaryColorHex });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.09, -0.02, 0.255);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.09, -0.02, 0.255);
    this.headGroup.add(leftEye, rightEye);

    // Stylized Anime Hair Cap + Spikes
    const hairMat = createAnimeToonMaterial({
      color: def.hairColorHex,
      emissive: def.primaryColorHex,
      emissiveIntensity: 0.08,
    });
    const hairDomeGeo = new THREE.SphereGeometry(0.31, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.62);
    const hairDome = new THREE.Mesh(hairDomeGeo, hairMat);
    hairDome.position.y = 0.03;
    hairDome.rotation.x = -0.15;
    attachAnimeOutline(hairDome, 1.05);
    this.headGroup.add(hairDome);

    // Side bangs
    const bangGeo = new THREE.ConeGeometry(0.08, 0.32, 6);
    const leftBang = new THREE.Mesh(bangGeo, hairMat);
    leftBang.position.set(-0.22, -0.05, 0.16);
    leftBang.rotation.set(Math.PI, 0, -0.2);
    const rightBang = new THREE.Mesh(bangGeo, hairMat);
    rightBang.position.set(0.22, -0.05, 0.16);
    rightBang.rotation.set(Math.PI, 0, 0.2);
    this.headGroup.add(leftBang, rightBang);

    // Back hair / class ornament
    this.hairBackGroup = new THREE.Group();
    this.hairBackGroup.position.set(0, 0.05, -0.25);
    this.headGroup.add(this.hairBackGroup);

    if (classId === 'bladedancer') {
      // High flowing ponytail + crimson ribbon
      const tailGeo = new THREE.ConeGeometry(0.14, 0.65, 8);
      tailGeo.translate(0, -0.28, 0);
      const tail = new THREE.Mesh(tailGeo, hairMat);
      tail.rotation.x = 0.65;
      attachAnimeOutline(tail, 1.06);
      this.hairBackGroup.add(tail);
    } else if (classId === 'astral_weaver') {
      // Twin astral tails + star halo
      for (const dir of [-1, 1]) {
        const twinGeo = new THREE.ConeGeometry(0.1, 0.62, 8);
        twinGeo.translate(0, -0.26, 0);
        const twin = new THREE.Mesh(twinGeo, hairMat);
        twin.position.x = dir * 0.2;
        twin.rotation.set(0.45, 0, dir * 0.25);
        attachAnimeOutline(twin, 1.06);
        this.hairBackGroup.add(twin);
      }
    } else {
      // Valkyrie winged crown diadem
      for (const dir of [-1, 1]) {
        const wingGeo = new THREE.BoxGeometry(0.05, 0.34, 0.16);
        const wingMat = createAnimeToonMaterial({
          color: 0xffd166,
          emissive: 0xffbe0b,
          emissiveIntensity: 0.45,
        });
        const wing = new THREE.Mesh(wingGeo, wingMat);
        wing.position.set(dir * 0.29, 0.16, 0.08);
        wing.rotation.set(-0.3, 0, dir * -0.35);
        this.headGroup.add(wing);
      }
    }

    // Arms
    const limbMat = createAnimeToonMaterial({ color: def.secondaryColorHex });
    const armGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.52, 8);
    armGeo.translate(0, -0.22, 0);

    this.leftArmPivot = new THREE.Group();
    this.leftArmPivot.position.set(-0.34, 0.26, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, limbMat);
    attachAnimeOutline(leftArmMesh, 1.08);
    this.leftArmPivot.add(leftArmMesh);
    this.bodyPivot.add(this.leftArmPivot);

    this.rightArmPivot = new THREE.Group();
    this.rightArmPivot.position.set(0.34, 0.26, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, limbMat);
    attachAnimeOutline(rightArmMesh, 1.08);
    this.rightArmPivot.add(rightArmMesh);
    this.bodyPivot.add(this.rightArmPivot);

    // Weapon attached to Right Arm
    this.weaponGroup = new THREE.Group();
    this.weaponGroup.position.set(0, -0.44, 0.08);
    this.rightArmPivot.add(this.weaponGroup);
    this.buildClassWeapon(classId, def.weaponColorHex, def.primaryColorHex);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.095, 0.075, 0.56, 8);
    legGeo.translate(0, -0.26, 0);

    this.leftLegPivot = new THREE.Group();
    this.leftLegPivot.position.set(-0.14, -0.32, 0);
    const leftLegMesh = new THREE.Mesh(legGeo, limbMat);
    attachAnimeOutline(leftLegMesh, 1.08);
    this.leftLegPivot.add(leftLegMesh);
    this.bodyPivot.add(this.leftLegPivot);

    this.rightLegPivot = new THREE.Group();
    this.rightLegPivot.position.set(0.14, -0.32, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, limbMat);
    attachAnimeOutline(rightLegMesh, 1.08);
    this.rightLegPivot.add(rightLegMesh);
    this.bodyPivot.add(this.rightLegPivot);
  }

  private buildClassWeapon(
    classId: CharacterClassId,
    weaponColor: number,
    primaryColor: number
  ): void {
    const bladeMat = createAnimeToonMaterial({
      color: weaponColor,
      emissive: primaryColor,
      emissiveIntensity: 0.65,
    });
    const hiltMat = createAnimeToonMaterial({ color: 0x22223b });

    if (classId === 'bladedancer') {
      // Odachi Katana
      const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.35, 8), hiltMat);
      hilt.rotation.x = Math.PI / 2;
      const tsuba = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 12), bladeMat);
      tsuba.rotation.x = Math.PI / 2;
      tsuba.position.z = 0.16;

      const bladeGeo = new THREE.BoxGeometry(0.035, 0.09, 1.45);
      bladeGeo.translate(0, 0, 0.88);
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      attachAnimeOutline(blade, 1.08);
      this.weaponGroup.add(hilt, tsuba, blade);
    } else if (classId === 'astral_weaver') {
      // Floating Arcane Catalyst + Orbiting Rings
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), bladeMat);
      core.position.set(0, 0.15, 0.45);
      const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.025, 8, 24), bladeMat);
      ring1.position.copy(core.position);
      ring1.rotation.x = Math.PI / 3;
      this.weaponGroup.add(core, ring1);
    } else {
      // Valkyrie Thunder Halberd + Offhand Shield
      const shaftGeo = new THREE.CylinderGeometry(0.038, 0.038, 1.85, 8);
      shaftGeo.rotateX(Math.PI / 2);
      shaftGeo.translate(0, 0, 0.55);
      const shaft = new THREE.Mesh(shaftGeo, hiltMat);

      const spearTipGeo = new THREE.ConeGeometry(0.14, 0.55, 6);
      spearTipGeo.rotateX(Math.PI / 2);
      spearTipGeo.translate(0, 0, 1.65);
      const spearTip = new THREE.Mesh(spearTipGeo, bladeMat);
      attachAnimeOutline(spearTip, 1.08);

      const axeWingGeo = new THREE.BoxGeometry(0.04, 0.44, 0.32);
      axeWingGeo.translate(0, 0.12, 1.32);
      const axeWing = new THREE.Mesh(axeWingGeo, bladeMat);

      this.weaponGroup.add(shaft, spearTip, axeWing);

      // Shield on Left Arm
      const shieldGeo = new THREE.OctahedronGeometry(0.32, 0);
      shieldGeo.scale(0.35, 1.15, 0.85);
      const shield = new THREE.Mesh(shieldGeo, bladeMat);
      shield.position.set(-0.12, -0.32, 0.12);
      this.leftArmPivot.add(shield);
    }
  }

  public updateAnimation(dt: number, state: CharacterAnimationState): void {
    this.clock += dt;
    this.auraRing.rotation.y += dt * 1.4;

    if (state.isDashing) {
      // Forward anime dash pose
      this.bodyPivot.rotation.x = 0.55;
      this.bodyPivot.position.y = 0.82;
      this.leftArmPivot.rotation.x = 0.8;
      this.rightArmPivot.rotation.x = 0.9;
      this.capeMesh.rotation.x = 0.95;
      return;
    }

    if (state.isMoving) {
      const runFreq = 13.5 * Math.max(0.6, state.moveSpeedRatio);
      const swing = Math.sin(this.clock * runFreq);
      this.bodyPivot.position.y = 0.85 + Math.abs(Math.cos(this.clock * runFreq)) * 0.08;
      this.bodyPivot.rotation.x = 0.22; // Anime ninja/action lean
      this.leftLegPivot.rotation.x = swing * 0.78;
      this.rightLegPivot.rotation.x = -swing * 0.78;
      this.leftArmPivot.rotation.x = -swing * 0.55;
      this.capeMesh.rotation.x = 0.55 + Math.abs(swing) * 0.25;
      this.hairBackGroup.rotation.x = 0.35 + Math.abs(swing) * 0.2;
    } else {
      // Idle breathing
      const breath = Math.sin(this.clock * 2.8);
      this.bodyPivot.position.y = 0.85 + breath * 0.03;
      this.bodyPivot.rotation.x = THREE.MathUtils.lerp(this.bodyPivot.rotation.x, 0, dt * 10);
      this.leftLegPivot.rotation.x = THREE.MathUtils.lerp(this.leftLegPivot.rotation.x, 0, dt * 10);
      this.rightLegPivot.rotation.x = THREE.MathUtils.lerp(this.rightLegPivot.rotation.x, 0, dt * 10);
      this.leftArmPivot.rotation.x = breath * 0.08;
      this.capeMesh.rotation.x = 0.22 + breath * 0.06;
      this.hairBackGroup.rotation.x = 0.12 + breath * 0.05;
    }

    // Combat Attack Swing Animation
    if (state.attackComboStep > 0) {
      const p = state.attackSwingProgress; // 0 -> 1
      const arc = Math.sin(p * Math.PI);
      if (state.attackComboStep === 1) {
        // Horizontal cleave right-to-left
        this.rightArmPivot.rotation.x = -0.9;
        this.rightArmPivot.rotation.y = THREE.MathUtils.lerp(-1.2, 1.3, p);
        this.bodyPivot.rotation.y = THREE.MathUtils.lerp(-0.35, 0.4, p);
      } else if (state.attackComboStep === 2) {
        // Reverse upward diagonal slash
        this.rightArmPivot.rotation.x = THREE.MathUtils.lerp(-0.4, -1.6, p);
        this.rightArmPivot.rotation.y = THREE.MathUtils.lerp(1.2, -1.1, p);
        this.bodyPivot.rotation.y = THREE.MathUtils.lerp(0.35, -0.35, p);
      } else if (state.attackComboStep === 3) {
        // 360 spinning finisher
        this.rightArmPivot.rotation.x = -1.1;
        this.bodyPivot.rotation.y = p * Math.PI * 2;
      } else {
        // Skill / Ultimate cast pose
        this.rightArmPivot.rotation.x = -1.45 * arc;
        this.rightArmPivot.rotation.y = 0;
        this.leftArmPivot.rotation.x = -1.2 * arc;
        this.bodyPivot.rotation.y = 0;
      }
    } else {
      this.bodyPivot.rotation.y = THREE.MathUtils.lerp(this.bodyPivot.rotation.y, 0, dt * 12);
      if (!state.isMoving) {
        this.rightArmPivot.rotation.x = THREE.MathUtils.lerp(
          this.rightArmPivot.rotation.x,
          -0.25,
          dt * 10
        );
      } else {
        this.rightArmPivot.rotation.x = -0.45;
      }
      this.rightArmPivot.rotation.y = THREE.MathUtils.lerp(
        this.rightArmPivot.rotation.y,
        0,
        dt * 10
      );
    }

    // Hit flash feedback
    for (const mat of this.emissiveMaterials) {
      mat.emissiveIntensity = state.hitFlashTimer > 0 ? 1.2 : 0.12;
    }
  }
}
