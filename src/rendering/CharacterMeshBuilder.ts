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

    if (classId === 'assassin') {
      // High flowing shinobi ponytail + shadow mask
      const tailGeo = new THREE.ConeGeometry(0.14, 0.65, 8);
      tailGeo.translate(0, -0.28, 0);
      const tail = new THREE.Mesh(tailGeo, hairMat);
      tail.rotation.x = 0.65;
      attachAnimeOutline(tail, 1.06);
      this.hairBackGroup.add(tail);
    } else if (classId === 'mage') {
      // Twin astral tails + floating witch/archon halo
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
      // Spear Warrior Dragoon winged crest diadem
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

    if (classId === 'assassin') {
      // Dual Ranged Kunai + Shadow Chakram Ring
      const kunaiRing = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 8, 18), bladeMat);
      kunaiRing.position.set(0, 0, 0.08);
      const kunaiBladeGeo = new THREE.ConeGeometry(0.09, 0.52, 4);
      kunaiBladeGeo.rotateX(Math.PI / 2);
      kunaiBladeGeo.translate(0, 0, 0.44);
      const kunaiBlade = new THREE.Mesh(kunaiBladeGeo, bladeMat);
      attachAnimeOutline(kunaiBlade, 1.08);
      this.weaponGroup.add(kunaiRing, kunaiBlade);

      // Off-hand Shadow Chakram on Left Arm
      const chakram = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.035, 8, 24), bladeMat);
      chakram.position.set(-0.08, -0.42, 0.22);
      chakram.rotation.y = Math.PI / 2;
      attachAnimeOutline(chakram, 1.06);
      this.leftArmPivot.add(chakram);
    } else if (classId === 'mage') {
      // Arcane Staff + Floating Orbiting Catalyst Rings
      const staffShaftGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.45, 8);
      staffShaftGeo.rotateX(Math.PI / 2);
      staffShaftGeo.translate(0, 0, 0.35);
      const staffShaft = new THREE.Mesh(staffShaftGeo, hiltMat);

      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), bladeMat);
      core.position.set(0, 0.08, 1.15);
      const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.025, 8, 24), bladeMat);
      ring1.position.copy(core.position);
      ring1.rotation.x = Math.PI / 3;
      this.weaponGroup.add(staffShaft, core, ring1);
    } else {
      // Spear Warrior Long Dragon-Lance + Offhand Crest Shield
      const shaftGeo = new THREE.CylinderGeometry(0.038, 0.038, 2.05, 8);
      shaftGeo.rotateX(Math.PI / 2);
      shaftGeo.translate(0, 0, 0.65);
      const shaft = new THREE.Mesh(shaftGeo, hiltMat);

      const spearTipGeo = new THREE.ConeGeometry(0.14, 0.68, 6);
      spearTipGeo.rotateX(Math.PI / 2);
      spearTipGeo.translate(0, 0, 1.88);
      const spearTip = new THREE.Mesh(spearTipGeo, bladeMat);
      attachAnimeOutline(spearTip, 1.08);

      const crossGuardGeo = new THREE.BoxGeometry(0.36, 0.06, 0.12);
      crossGuardGeo.translate(0, 0, 1.52);
      const crossGuard = new THREE.Mesh(crossGuardGeo, bladeMat);

      this.weaponGroup.add(shaft, spearTip, crossGuard);

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

    // Combat Attack Swing Animation — tailored per class cadence & style!
    if (state.attackComboStep > 0) {
      const p = state.attackSwingProgress; // 0 -> 1
      const arc = Math.sin(p * Math.PI);

      if (this.classId === 'warrior') {
        if (state.attackComboStep === 1 || state.attackComboStep === 2) {
          // Piercing forward spear thrust!
          this.rightArmPivot.rotation.x = -1.35;
          this.rightArmPivot.rotation.y = state.attackComboStep === 1 ? -0.1 : 0.12;
          this.weaponGroup.position.z = 0.08 + arc * 0.85;
          this.bodyPivot.rotation.y = THREE.MathUtils.lerp(-0.25, 0.25, p);
          this.bodyPivot.rotation.x = 0.28 * arc;
        } else if (state.attackComboStep === 3) {
          // 360° Heavy Dragon-Halberd Sweep
          this.rightArmPivot.rotation.x = -1.1;
          this.weaponGroup.position.z = 0.25;
          this.bodyPivot.rotation.y = p * Math.PI * 2;
        } else {
          this.rightArmPivot.rotation.x = -1.55 * arc;
          this.weaponGroup.position.z = 0.08 + arc * 0.7;
        }
      } else if (this.classId === 'mage') {
        // Rhythmic ranged spellcasting gestures
        this.weaponGroup.position.z = 0.08;
        if (state.attackComboStep === 1) {
          this.rightArmPivot.rotation.x = -1.45 * arc;
          this.leftArmPivot.rotation.x = -0.6 * arc;
        } else if (state.attackComboStep === 2) {
          this.leftArmPivot.rotation.x = -1.5 * arc;
          this.rightArmPivot.rotation.x = -1.1 * arc;
        } else {
          // Two-handed Nova Comet / Skill invocation + slight levitation
          this.rightArmPivot.rotation.x = -1.65 * arc;
          this.leftArmPivot.rotation.x = -1.65 * arc;
          this.bodyPivot.position.y = 0.85 + arc * 0.28;
        }
      } else {
        // Ranged Assassin: rapid-fire alternating kunai throws + chakram spin
        this.weaponGroup.position.z = 0.08;
        if (state.attackComboStep === 1) {
          this.rightArmPivot.rotation.x = -1.55 * arc;
          this.bodyPivot.rotation.y = THREE.MathUtils.lerp(-0.4, 0.35, p);
        } else if (state.attackComboStep === 2) {
          this.leftArmPivot.rotation.x = -1.55 * arc;
          this.rightArmPivot.rotation.x = -1.35 * arc;
          this.bodyPivot.rotation.y = THREE.MathUtils.lerp(0.4, -0.35, p);
        } else {
          // Acrobatic spin while hurling Chakram & backstepping
          this.rightArmPivot.rotation.x = -1.3;
          this.leftArmPivot.rotation.x = -1.3;
          this.bodyPivot.rotation.y = -p * Math.PI * 2;
          this.bodyPivot.position.y = 0.85 + arc * 0.36;
        }
      }
    } else {
      this.weaponGroup.position.z = THREE.MathUtils.lerp(this.weaponGroup.position.z, 0.08, dt * 12);
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
