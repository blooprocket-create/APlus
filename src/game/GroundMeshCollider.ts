import { Vector3, type Mesh } from 'three';

type GroundPoint = { x: number; z: number };
type Triangle = [GroundPoint, GroundPoint, GroundPoint];

export function sweepGroundMovement(
  position: Vector3, x: number, z: number, walkable: (point: GroundPoint) => boolean,
): void {
  const dx = position.x - x;
  const dz = position.z - z;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .22));
  for (let i = 0; i < steps; i++) {
    const nextX = x + dx / steps;
    const nextZ = z + dz / steps;
    if (dx && walkable({ x: nextX, z })) x = nextX;
    if (dz && walkable({ x, z: nextZ })) z = nextZ;
  }
  position.set(x, 0, z);
}

function cross(a: GroundPoint, b: GroundPoint, p: GroundPoint): number {
  return (b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x);
}

function withinEdge(p: GroundPoint, a: GroundPoint, b: GroundPoint, radiusSq: number): boolean {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz)));
  return (p.x - a.x - t * dx) ** 2 + (p.z - a.z - t * dz) ** 2 <= radiusSq;
}

/** Static collision from selected mesh faces, projected onto the game's movement plane. */
export class GroundMeshCollider {
  private readonly parts: {
    minX: number; maxX: number; minZ: number; maxZ: number; triangles: Triangle[];
  }[];

  constructor(meshes: readonly Mesh[]) {
    this.parts = meshes.map(mesh => {
      mesh.updateWorldMatrix(true, false);
      const positions = mesh.geometry.getAttribute('position');
      const index = mesh.geometry.getIndex();
      let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
      const vertices = Array.from({ length: positions.count }, (_, i) => {
        const { x, z } = new Vector3().fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
        return { x, z };
      });
      const triangles: Triangle[] = [];
      for (let i = 0; i < (index?.count ?? vertices.length); i += 3) {
        const a = vertices[index ? index.getX(i) : i];
        const b = vertices[index ? index.getX(i + 1) : i + 1];
        const c = vertices[index ? index.getX(i + 2) : i + 2];
        const winding = cross(a, b, c);
        if (Math.abs(winding) > 1e-8) triangles.push(winding > 0 ? [a, b, c] : [a, c, b]);
      }
      return { minX, minZ, maxX, maxZ, triangles };
    });
  }

  overlaps(point: GroundPoint, radius = 0): boolean {
    const radiusSq = radius * radius;
    return this.parts.some(({ minX, minZ, maxX, maxZ, triangles }) => {
      if (point.x < minX - radius || point.x > maxX + radius ||
          point.z < minZ - radius || point.z > maxZ + radius) return false;
      return triangles.some(([a, b, c]) => {
        if (cross(a, b, point) >= 0 && cross(b, c, point) >= 0 && cross(c, a, point) >= 0) return true;
        return radius > 0 && (withinEdge(point, a, b, radiusSq) ||
          withinEdge(point, b, c, radiusSq) || withinEdge(point, c, a, radiusSq));
      });
    });
  }
}
