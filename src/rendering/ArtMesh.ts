import * as THREE from 'three';

/** Elliptical cross-sections ordered from bottom to top, with an optional swept center. */
export type Section = [y: number, radiusX: number, radiusZ: number, z?: number, x?: number];

export function loft(sections: readonly Section[], sides = 12, faceted = false): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  sections.forEach(([y, width, depth, z = 0, x = 0], row) => {
    for (let side = 0; side < sides; side++) {
      const angle = Math.PI * 2 * side / sides;
      positions.push(x + Math.sin(angle) * width, y, z + Math.cos(angle) * depth);
      if (row > 0) {
        const a = (row - 1) * sides + side;
        const b = (row - 1) * sides + (side + 1) % sides;
        indices.push(a, b, b + sides, a, b + sides, a + sides);
      }
    }
  });
  const top = (sections.length - 1) * sides;
  for (let side = 1; side < sides - 1; side++) indices.push(0, side + 1, side, top, top + side, top + side + 1);
  let geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  if (faceted) geometry = geometry.toNonIndexed();
  geometry.computeVertexNormals();
  return geometry;
}

/** Interpolate the rings without altering the authored silhouette at its control sections. */
export function smoothLoft(sections: readonly Section[], sides = 22): THREE.BufferGeometry {
  const rings: Section[] = [];
  for (let i = 0; i < sections.length - 1; i++) {
    const left = sections[Math.max(0, i - 1)];
    const a = sections[i];
    const b = sections[i + 1];
    const right = sections[Math.min(sections.length - 1, i + 2)];
    rings.push(a);
    const mid = (channel: number) => {
      const p0 = left[channel] ?? 0;
      const p1 = a[channel] ?? 0;
      const p2 = b[channel] ?? 0;
      const p3 = right[channel] ?? 0;
      return (9 * (p1 + p2) - p0 - p3) / 16;
    };
    rings.push([(a[0] + b[0]) * 0.5, Math.max(0.004, mid(1)), Math.max(0.004, mid(2)), mid(3), mid(4)]);
  }
  rings.push(sections[sections.length - 1]);
  return loft(rings, sides);
}

/** A tapered volumetric lock following a curved silhouette. */
export function hairLock(points: readonly [x: number, y: number, z: number][], width: number, depth: number): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
  const positions: number[] = [];
  const indices: number[] = [];
  const sides = 9;
  const rings = 12;
  const forward = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    const p = curve.getPoint(t);
    const tangent = curve.getTangent(t);
    const sideAxis = forward.clone().cross(tangent).normalize();
    const depthAxis = tangent.clone().cross(sideAxis).normalize();
    const taper = Math.max(0.035, (1 - t ** 1.4) * (0.85 + Math.sin(t * Math.PI) * 0.23));
    for (let j = 0; j < sides; j++) {
      const angle = j * Math.PI * 2 / sides;
      const vertex = p.clone().addScaledVector(sideAxis, Math.cos(angle) * width * taper)
        .addScaledVector(depthAxis, Math.sin(angle) * depth * taper);
      positions.push(vertex.x, vertex.y, vertex.z);
      if (i > 0) {
        const a = (i - 1) * sides + j;
        const b = (i - 1) * sides + (j + 1) % sides;
        indices.push(a, b, b + sides, a, b + sides, a + sides);
      }
    }
  }
  for (let i = 1; i < sides - 1; i++) indices.push(0, i + 1, i, rings * sides, rings * sides + i, rings * sides + i + 1);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function panel(points: readonly [number, number][], depth: number): THREE.BufferGeometry {
  const outline = points.map(([x, y]) => new THREE.Vector2(x, y));
  if (THREE.ShapeUtils.isClockWise(outline)) outline.reverse();
  const positions: number[] = [];
  const push = (index: number, z: number) => positions.push(outline[index].x, outline[index].y, z);
  for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(outline, [])) {
    push(a, depth); push(b, depth); push(c, depth);
    push(c, 0); push(b, 0); push(a, 0);
  }
  for (let a = 0; a < outline.length; a++) {
    const b = (a + 1) % outline.length;
    push(a, 0); push(b, 0); push(b, depth);
    push(a, 0); push(b, depth); push(a, depth);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function piece(
  parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material,
  x = 0, y = 0, z = 0
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

export function beam(
  parent: THREE.Object3D, material: THREE.Material, a: THREE.Vector3, b: THREE.Vector3, width: number, depth = width
): THREE.Mesh {
  const mesh = piece(parent, new THREE.BoxGeometry(width, a.distanceTo(b), depth), material);
  mesh.position.copy(a).lerp(b, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return mesh;
}

/** Bake draw groups per joint. A vertex-color material can carry several palette colors in one draw. */
export function bakePieces(parent: THREE.Group, palette?: THREE.MeshLambertMaterial | THREE.MeshToonMaterial): void {
  parent.updateMatrixWorld(true);
  const batches = new Map<string, { material: THREE.Material; cast: boolean; receive: boolean; meshes: THREE.Mesh[] }>();
  const inverse = parent.matrixWorld.clone().invert();
  parent.traverse(child => {
    if (!(child instanceof THREE.Mesh) || Array.isArray(child.material)) return;
    const material = palette?.type === child.material.type ? palette : child.material;
    const key = `${material.uuid}/${child.castShadow}/${child.receiveShadow}`;
    let batch = batches.get(key);
    if (!batch) {
      batch = { material, cast: child.castShadow, receive: child.receiveShadow, meshes: [] };
      batches.set(key, batch);
    }
    batch.meshes.push(child);
  });
  const disposed = new Set<THREE.BufferGeometry>();
  for (const batch of batches.values()) {
    const parts = batch.meshes.map(mesh => {
      const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      const usePalette = palette && batch.material === palette;
      for (const attribute of Object.keys(geometry.attributes)) {
        if (attribute !== 'position' && attribute !== 'normal' && !(attribute === 'color' && usePalette)) {
          geometry.deleteAttribute(attribute);
        }
      }
      geometry.applyMatrix4(inverse.clone().multiply(mesh.matrixWorld));
      if (usePalette && !geometry.hasAttribute('color')) {
        const { color } = mesh.material as THREE.MeshLambertMaterial | THREE.MeshToonMaterial;
        const colors = new Float32Array(geometry.getAttribute('position').count * 3);
        for (let i = 0; i < colors.length; i += 3) {
          colors[i] = color.r;
          colors[i + 1] = color.g;
          colors[i + 2] = color.b;
        }
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      }
      disposed.add(mesh.geometry);
      mesh.removeFromParent();
      return geometry;
    });
    const merged = new THREE.BufferGeometry();
    const vertexCount = parts.reduce((sum, part) => sum + part.getAttribute('position').count, 0);
    for (const attribute of Object.keys(parts[0].attributes)) {
      const data = new Float32Array(vertexCount * 3);
      let offset = 0;
      for (const part of parts) {
        const values = part.getAttribute(attribute).array;
        data.set(values, offset);
        offset += values.length;
      }
      merged.setAttribute(attribute, new THREE.BufferAttribute(data, 3));
    }
    parts.forEach(part => part.dispose());
    const mesh = piece(parent, merged, batch.material);
    mesh.castShadow = batch.cast;
    mesh.receiveShadow = batch.receive;
  }
  disposed.forEach(geometry => geometry.dispose());
}
