import * as THREE from 'three';
import { attachAnimeOutline, createAnimeToonMaterial } from './AnimeMaterials';

export type EnemyKind = 'slime' | 'sentinel' | 'boss_knight';

export interface EnemyMeshBundle {
  root: THREE.Group;
  bodyMesh: THREE.Object3D;
  hpBarFill: THREE.Mesh;
  hpBarGroup: THREE.Group;
  mainMaterial: THREE.MeshToonMaterial;
  baseEmissiveHex: number;
}

export function buildEnemyMesh(kind: EnemyKind): EnemyMeshBundle {
  const root = new THREE.Group();

  let mainMaterial: THREE.MeshToonMaterial;
  let bodyMesh: THREE.Object3D;
  let hpHeight = 1.6;
  let baseEmissiveHex = 0x110022;

  if (kind === 'slime') {
    baseEmissiveHex = 0x240046;
    mainMaterial = createAnimeToonMaterial({
      color: 0x9d4edd,
      emissive: baseEmissiveHex,
      emissiveIntensity: 0.35,
    });
    const slimeGeo = new THREE.SphereGeometry(0.55, 16, 14);
    slimeGeo.scale(1.12, 0.82, 1.12);
    const mesh = new THREE.Mesh(slimeGeo, mainMaterial);
    mesh.position.y = 0.45;
    mesh.castShadow = true;
    attachAnimeOutline(mesh, 1.07);

    // Angry anime eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
    const eyeGeo = new THREE.BoxGeometry(0.12, 0.06, 0.05);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.18, 0.08, 0.56);
    leftEye.rotation.z = -0.25;
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.18, 0.08, 0.56);
    rightEye.rotation.z = 0.25;
    mesh.add(leftEye, rightEye);

    root.add(mesh);
    bodyMesh = mesh;
    hpHeight = 1.35;
  } else if (kind === 'sentinel') {
    baseEmissiveHex = 0x0077b6;
    mainMaterial = createAnimeToonMaterial({
      color: 0x00b4d8,
      emissive: baseEmissiveHex,
      emissiveIntensity: 0.45,
    });
    const group = new THREE.Group();
    group.position.y = 1.05;

    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.46, 0), mainMaterial);
    core.castShadow = true;
    attachAnimeOutline(core, 1.08);
    group.add(core);

    const ringMat = createAnimeToonMaterial({
      color: 0x1d3557,
      emissive: 0x48cae4,
      emissiveIntensity: 0.4,
    });
    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.06, 8, 24), ringMat);
    outerRing.rotation.x = Math.PI / 3;
    attachAnimeOutline(outerRing, 1.06);
    group.add(outerRing);

    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xff0055 })
    );
    eye.position.z = 0.4;
    group.add(eye);

    root.add(group);
    bodyMesh = group;
    hpHeight = 2.05;
  } else {
    // Abyssal Boss Knight
    baseEmissiveHex = 0x6a040f;
    mainMaterial = createAnimeToonMaterial({
      color: 0x2b2d42,
      emissive: baseEmissiveHex,
      emissiveIntensity: 0.5,
    });
    const group = new THREE.Group();
    group.position.y = 1.1;

    const armor = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.62, 1.45, 10), mainMaterial);
    armor.castShadow = true;
    attachAnimeOutline(armor, 1.07);
    group.add(armor);

    const helm = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 0), mainMaterial);
    helm.position.y = 0.98;
    attachAnimeOutline(helm, 1.07);
    group.add(helm);

    // Horns
    const hornMat = createAnimeToonMaterial({
      color: 0xff0054,
      emissive: 0xff0054,
      emissiveIntensity: 0.7,
    });
    for (const dir of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.58, 6), hornMat);
      horn.position.set(dir * 0.36, 1.28, 0.08);
      horn.rotation.z = dir * -0.45;
      group.add(horn);
    }

    // Giant Corrupted Greatsword
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.9, 0.32), hornMat);
    blade.position.set(0.72, 0.2, 0.48);
    blade.rotation.x = 0.55;
    attachAnimeOutline(blade, 1.06);
    group.add(blade);

    root.add(group);
    bodyMesh = group;
    hpHeight = 2.95;
  }

  // World-space floating HP Bar
  const hpBarGroup = new THREE.Group();
  hpBarGroup.position.y = hpHeight;
  const width = kind === 'boss_knight' ? 1.8 : 1.05;
  const height = kind === 'boss_knight' ? 0.16 : 0.11;

  const bgGeo = new THREE.PlaneGeometry(width + 0.06, height + 0.05);
  const bgMat = new THREE.MeshBasicMaterial({
    color: 0x090a12,
    side: THREE.DoubleSide,
  });
  const bgMesh = new THREE.Mesh(bgGeo, bgMat);
  hpBarGroup.add(bgMesh);

  const fillGeo = new THREE.PlaneGeometry(width, height);
  fillGeo.translate(width / 2, 0, 0);
  const fillMat = new THREE.MeshBasicMaterial({
    color: kind === 'boss_knight' ? 0xffbe0b : 0xff2a6d,
    side: THREE.DoubleSide,
  });
  const hpBarFill = new THREE.Mesh(fillGeo, fillMat);
  hpBarFill.position.set(-width / 2, 0, 0.01);
  hpBarGroup.add(hpBarFill);

  root.add(hpBarGroup);

  return {
    root,
    bodyMesh,
    hpBarFill,
    hpBarGroup,
    mainMaterial,
    baseEmissiveHex,
  };
}
