import * as THREE from 'three';
import { makeSceneryPlacements, type SceneryPlacement, type SceneryKind } from './WorldScenery';
import type { TerrainCell } from './WorldTerrain';

/**
 * Reusable disposable preview visuals; no downloaded stock assets.
 * Batches similarly shaped props per cell with InstancedMesh to bound drawcalls.
 */
export function createSceneryMeshes(
  cell: TerrainCell, seed: string,
  protectedSites: readonly { position: { x: number; z: number }; clearanceRadius: number }[] = [],
): { group: THREE.Group; count: number } {
  const placements = makeSceneryPlacements(cell, seed, protectedSites);
  const group = new THREE.Group();
  const centerX = cell.corner.x + cell.cellSize / 2;
  const centerZ = cell.corner.z + cell.cellSize / 2;
  const tmp = new THREE.Object3D();

  function addInstances(
    items: readonly SceneryPlacement[], geometry: THREE.BufferGeometry,
    material: THREE.Material, kind: 'foliage' | 'trunk' | 'rock',
    yOffset: number, baseScale: THREE.Vector3, tint: THREE.Color,
  ) {
    if (!items.length) { geometry.dispose(); material.dispose(); return; }
    const mesh = new THREE.InstancedMesh(geometry, material, items.length);
    mesh.frustumCulled = false; // deterministic across origin rebasing and cell streaming
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const s = item.scale;
      tmp.position.set(item.x - centerX, item.y + yOffset * s, item.z - centerZ);
      tmp.rotation.set(0, item.rotation, 0);
      tmp.scale.set(s * baseScale.x, s * baseScale.y, s * baseScale.z);
      tmp.updateMatrix();
      mesh.setMatrixAt(index, tmp.matrix);
      const brighten = kind === 'rock' ? 0.91 + item.tint * 0.17 : 0.80 + item.tint * 0.37;
      mesh.setColorAt(index, tint.clone().multiplyScalar(brighten));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    group.add(mesh);
  }

  function collect(type: SceneryKind) { return placements.filter(item => item.kind === type); }
  const pine = collect('pine');
  const leafy = collect('round-tree');
  const rocks = collect('boulder');
  const shrubs = collect('shrub');

  // Two-tier needles, visible trunks and varied heights: recognizable stylized
  // tree silhouettes instead of a uniformly flat terrain texture.
  addInstances(pine, new THREE.CylinderGeometry(0.38, 0.52, 3.0, 5),
    new THREE.MeshLambertMaterial({ color: 0xffffff }), 'trunk', 1.6,
    new THREE.Vector3(1, 1, 1), new THREE.Color(0x79533c));
  addInstances(pine, new THREE.ConeGeometry(2.7, 7, 6, 1),
    new THREE.MeshLambertMaterial({ color: 0xffffff }), 'foliage', 5.4,
    new THREE.Vector3(1, 1, 1), new THREE.Color(0x2c8c65));
  addInstances(pine, new THREE.ConeGeometry(2.05, 6, 6, 1),
    new THREE.MeshLambertMaterial({ color: 0xffffff }), 'foliage', 8.3,
    new THREE.Vector3(1, 1, 1), new THREE.Color(0x44ad7b));
  addInstances(leafy, new THREE.CylinderGeometry(0.48, 0.7, 4.5, 6),
    new THREE.MeshLambertMaterial({ color: 0xffffff }), 'trunk', 2.2,
    new THREE.Vector3(1, 1, 1), new THREE.Color(0x865b41));
  addInstances(leafy, new THREE.IcosahedronGeometry(3.0, 0),
    new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), 'foliage', 6.7,
    new THREE.Vector3(1.28, 0.93, 1.22), new THREE.Color(0x7cb05e));
  addInstances(rocks, new THREE.DodecahedronGeometry(1.65, 0),
    new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), 'rock', 0.9,
    new THREE.Vector3(1.3, 0.85, 1.04), new THREE.Color(0x938a78));
  addInstances(shrubs, new THREE.IcosahedronGeometry(1.15, 0),
    new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), 'foliage', 1.15,
    new THREE.Vector3(1.5, 0.85, 1.4), new THREE.Color(0x78ba67));
  return { group, count: placements.length };
}
