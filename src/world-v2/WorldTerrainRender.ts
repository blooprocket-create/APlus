import * as THREE from 'three';
import type { TerrainCell } from './WorldTerrain';
import { createSceneryMeshes } from './WorldSceneryRender';
import { paintedPalette } from '../rendering/PaintedWorldStyle';
import type { StoryAnchorDeclaration } from './WorldAtlas';

// Colors are selected from HearthmereScenery's painted foliage, stone,
// plaster, road and river palette, not arbitrary RGB debug colors.
const biomeColors = [
  0x254f71, 0x4386a0, 0xd7bf97, 0x7b965c, 0x49665d, 0x898e88, 0xf1ddba,
  0xaa8b6d,
];
const biomeHighlights = [
  0x4386a0, 0x80b7a2, 0xe0cda9, 0xa5ab70, 0x879a62, 0xb2ac9e, 0xf6ede0,
  0xbda887,
];

/** One shared rendered cell for the QA lab and the real GameEngine session. */
export function createWorldTerrainVisual(
  cell: TerrainCell,
  seed: string,
  anchors: readonly StoryAnchorDeclaration[],
  originUniform: THREE.IUniform<THREE.Vector3>,
  focus: THREE.IUniform<THREE.Vector4>,
  debugGrid = false,
) {
  const geometry = new THREE.PlaneGeometry(
    cell.cellSize,
    cell.cellSize,
    cell.segments,
    cell.segments,
  );
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const colors: number[] = [];
  const g = cell.geography;
  if (!g) throw new Error('Geography artifact missing biome/water attributes');
  const color = new THREE.Color(),
    base = new THREE.Color(),
    highlight = new THREE.Color();
  const roadColor = new THREE.Color(0xb4a184);
  for (let index = 0; index < position.count; index++) {
    const terrainY = cell.heights[index];
    position.setZ(index, terrainY);
    const biome = g.biomes[index];
    const col = index % (cell.segments + 1);
    const row = Math.floor(index / (cell.segments + 1));
    const wx = (cell.coordinate.x + col / cell.segments) * cell.cellSize;
    const wz = (cell.coordinate.z + row / cell.segments) * cell.cellSize;
    const wash =
      Math.sin(wx * 0.28 + wz * 0.44) +
      Math.sin(wz * 0.68 - wx * 0.21) * 0.64 +
      Math.sin(wx * 1.33 + wz * 0.91) * 0.26;
    base.setHex(biomeColors[biome]);
    highlight.setHex(biomeHighlights[biome]);
    color
      .copy(base)
      .lerp(highlight, THREE.MathUtils.clamp(0.24 + wash * 0.13, 0.07, 0.48));
    if (g.roads[index] > 10)
      color.lerp(roadColor, (g.roads[index] / 255) * 0.89);
    colors.push(color.r, color.g, color.b);
  }
  position.needsUpdate = true;
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geometry,
    paintedPalette(focus, {
      worldOrigin: originUniform,
      side: THREE.DoubleSide,
    }),
  );
  mesh.receiveShadow = true;
  const group = new THREE.Group();
  group.add(mesh);
  const scenery = createSceneryMeshes(
    cell,
    seed,
    anchors,
    originUniform,
    focus,
  );
  group.add(scenery.group);
  if (debugGrid) {
    const border = new THREE.LineSegments(
      new THREE.EdgesGeometry(
        new THREE.PlaneGeometry(cell.cellSize, cell.cellSize),
        1,
      ),
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        opacity: 0.18,
        transparent: true,
      }),
    );
    border.rotation.x = -Math.PI / 2;
    border.position.y = 0.06;
    group.add(border);
  }

  group.position.set(
    cell.corner.x + cell.cellSize / 2,
    0,
    cell.corner.z + cell.cellSize / 2,
  );
  return {
    cell,
    mesh: group,
    sceneryCount: scenery.count,
    sceneryTime: scenery.time,
  };
}
