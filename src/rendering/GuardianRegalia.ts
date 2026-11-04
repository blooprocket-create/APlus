import * as THREE from 'three';
import { ChronicleRegion } from '../types/campaign';
import { EnemyMeshBundle } from './EnemyMeshBuilder';

export function dressGuardian(bundle: EnemyMeshBundle, region: ChronicleRegion, color: number): void {
  bundle.mainMaterial.color.setHex(region === 'frostmarch' ? 0x8da8bd : region === 'ember_coast' ? 0x795140 : 0x394654);
  bundle.mainMaterial.emissive.setHex(color); bundle.mainMaterial.emissiveIntensity = 0.18;
  bundle.baseEmissiveHex = color;
  const regalia = new THREE.Group(); regalia.position.y = 1.8;
  const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4, metalness: 0.6, roughness: 0.4 });
  if (region === 'whispering_woods') {
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.07, 1.2, 5), material);
        branch.position.set(side * (0.35 + i * 0.2), 1 + i * 0.15, 0); branch.rotation.z = side * (0.2 + i * 0.35); regalia.add(branch);
      }
    }
  } else if (region === 'glass_desert' || region === 'frostmarch') {
    for (let i = 0; i < 8; i++) {
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.25), material);
      const angle = i / 8 * Math.PI * 2;
      shard.position.set(Math.sin(angle) * 1.3, Math.cos(angle) * 0.6 + 0.4, Math.cos(angle) * 1.3); shard.scale.y = 2; regalia.add(shard);
    }
  } else {
    for (let i = 0; i < 3; i++) {
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.9 + i * 0.25, 0.035, 6, 48), material);
      halo.position.y = 0.8; halo.rotation.set(i * 0.7, i * 0.8, 0); regalia.add(halo);
    }
  }
  bundle.bodyMesh.add(regalia);
}
