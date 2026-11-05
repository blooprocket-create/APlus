import * as THREE from 'three';

/** Dispose an owned object tree once, including geometries shared by outline meshes. */
export function disposeObject(object: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const skeletons = new Set<THREE.Skeleton>();
  object.traverse(child => {
    if (child instanceof THREE.InstancedMesh) child.dispose();
    if (child instanceof THREE.SkinnedMesh) skeletons.add(child.skeleton);
    if (child instanceof THREE.Mesh || child instanceof THREE.Points) {
      geometries.add(child.geometry);
      const list = Array.isArray(child.material) ? child.material : [child.material];
      list.forEach(material => materials.add(material));
    }
    if (child instanceof THREE.Sprite) {
      materials.add(child.material);
      if (child.material.map?.userData.ownedByScene) textures.add(child.material.map);
    }
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
  textures.forEach(texture => texture.dispose());
  skeletons.forEach(skeleton => skeleton.dispose());
}
