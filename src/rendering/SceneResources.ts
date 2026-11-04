import * as THREE from 'three';

/** Dispose an owned object tree once, including geometries shared by outline meshes. */
export function disposeObject(object: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  object.traverse(child => {
    if (child instanceof THREE.InstancedMesh) child.dispose();
    if (child instanceof THREE.Mesh || child instanceof THREE.Points) {
      geometries.add(child.geometry);
      const list = Array.isArray(child.material) ? child.material : [child.material];
      list.forEach(material => materials.add(material));
    }
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
}
