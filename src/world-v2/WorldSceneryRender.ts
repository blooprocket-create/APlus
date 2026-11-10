import * as THREE from 'three';
import { bakePieces, loft, piece, smoothLoft } from '../rendering/ArtMesh';
import { buildStorybookTree, buildStorybookPine } from '../rendering/StorybookNature';
import { paintedPalette } from '../rendering/PaintedWorldStyle';
import { addPaintedMeadow, type MeadowPlant } from '../rendering/PaintedMeadow';
import { SceneryMotion } from '../rendering/SceneryMotion';
import { deriveSeed } from './WorldIdentity';
import { makeSceneryPlacements, type SceneryPlacement, type SceneryKind } from './WorldScenery';
import { sampleCellHeight, type TerrainCell } from './WorldTerrain';

type ProtectedSite = { position: { x: number; z: number }; clearanceRadius: number };
type PaintedMesh = { geometry: THREE.BufferGeometry; material: THREE.MeshLambertMaterial };

/**
 * These are the *same* geometry builders and painter material used by original
 * Hearthmere scenery and its refuge grove, not cone/icosahedron placeholders.
 * One painted, baked loft per family is instanced across the whole cell.
 */
function makePaintedTemplate(
  kind: SceneryKind,
  origin: THREE.IUniform<THREE.Vector3>,
  focus: THREE.IUniform<THREE.Vector4>,
): PaintedMesh {
  const paint = paintedPalette(focus, { worldOrigin: origin });
  const temporary = new THREE.Group();
  const colors = new Map<number, THREE.MeshLambertMaterial>();
  function color(hex: number) {
    let material = colors.get(hex);
    if (!material) { material = new THREE.MeshLambertMaterial({ color: hex }); colors.set(hex, material); }
    return material;
  }
  function shape(geometry: THREE.BufferGeometry, hex: number, x = 0, y = 0, z = 0,
    scale: [number, number, number] = [1, 1, 1], rotation = 0) {
    const mesh = piece(temporary, geometry, color(hex), x, y, z);
    mesh.scale.set(...scale);
    mesh.rotation.y = rotation;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  if (kind === 'round-tree') {
    buildStorybookTree(temporary, color);
  } else if (kind === 'pine') {
    buildStorybookPine(temporary,color);
  } else if (kind === 'shrub') {
    const crown = smoothLoft([[-.60,.12,.16],[-.36,.63,.54],
      [-.05,1,.88],[.27,.86,.80],[.68,.36,.42],[.78,.08,.12]], 14);
    shape(crown, 0x658354, 0, 1.13, 0, [1.35,1.05,1.15]);
    shape(smoothLoft([[-.55,.13,.15],[-.24,.65,.63],
      [.17,1,.91],[.51,.64,.61],[.71,.10,.11]], 12),
    0x879a62, 1.05, 1.16, .22, [.95,.82,1.02], -.25);
    shape(smoothLoft([[-.52,.14,.15],[-.22,.64,.55],
      [.1,.88,.83],[.46,.59,.53],[.68,.09,.1]], 12),
    0x49665d, -.91, 1.05, -.16, [.92,.82,1.04], .4);
  } else {
    // Native loft-rock clusters rather than low-poly spheres.
    shape(loft([[0,.62,.74,.03],[.38,.94,.80],[1.08,1.08,.84,-.1],
      [1.56,.75,.64,-.08],[1.88,.19,.24,-.14]], 11, true),
    0x898e88,0,0,0,[1.1,1.3,1.1]);
    shape(loft([[0,.4,.47],[.25,.61,.58],[.78,.51,.42,-.11],
      [1.12,.10,.16,-.15]], 9, true),
    0xb2ac9e,1.26,0,-.2,[.86,.88,.94],.58);
  }

  // Hearthmere's existing batching routine merges multiple sculpted pieces
  // and their painted palette into one draw per scenery family.
  bakePieces(temporary, paint);
  colors.forEach(material => material.dispose());
  const merged = temporary.children.find(child => child instanceof THREE.Mesh);
  if (!(merged instanceof THREE.Mesh)) throw new Error('Failed to bake storybook scenery family ' + kind);
  return { geometry: merged.geometry, material: paint };
}

function meadowForCell(
  cell: TerrainCell, seed: string, protectedSites: readonly ProtectedSite[],
): { grasses: MeadowPlant[]; flowers: MeadowPlant[] } {
  const grasses: MeadowPlant[] = [], flowers: MeadowPlant[] = [];
  const g = cell.geography;
  if (!g) return { grasses, flowers };
  let state = deriveSeed(seed, 'hearthmere-meadow-v2', cell.id) || 1;
  const next = () => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
  const centerX = cell.corner.x + cell.cellSize / 2, centerZ = cell.corner.z + cell.cellSize / 2;
  for (let i = 0; i < 94; i++) {
    const x = cell.corner.x + 3 + next() * (cell.cellSize - 6);
    const z = cell.corner.z + 3 + next() * (cell.cellSize - 6);
    const col = Math.min(cell.segments, Math.floor((x - cell.corner.x) / cell.cellSize * cell.segments));
    const row = Math.min(cell.segments, Math.floor((z - cell.corner.z) / cell.cellSize * cell.segments));
    const index = row * (cell.segments + 1) + col;
    const biome = g.biomes[index];
    if (g.waterKinds[index] !== 0 || g.roads[index] > 25 ||
      (biome !== 3 && biome !== 4 && biome !== 2)) continue;
    if (protectedSites.some(site => Math.hypot(site.position.x-x,site.position.z-z) < site.clearanceRadius+2)) continue;
    const sparse = Math.sin(x * .22 + z * .08) * Math.sin(z * .19 - x * .06);
    if (next() > .65 + .22 * sparse) continue;
    const plant: MeadowPlant = {
      x: x - centerX, y: sampleCellHeight(cell, x, z) + .035,
      z: z - centerZ, scale: .65 + next() * 1.2,
      angle: next() * Math.PI * 2,
      tint: biome === 2 ? 0xe2eac2 : biome === 4 ? 0xc3dcab : 0xdbeccb,
    };
    if (next() < .11) flowers.push(plant);
    else grasses.push(plant);
  }
  return { grasses, flowers };
}

export interface PaintedCellScenery {
  readonly group: THREE.Group;
  readonly count: number;
  readonly time: THREE.IUniform<number>;
}

/** Sculpted Hearthmere geometry + its actual animated painted meadow system. */
export function createSceneryMeshes(
  cell: TerrainCell, seed: string,
  protectedSites: readonly ProtectedSite[] = [],
  worldOrigin: THREE.IUniform<THREE.Vector3> = { value: new THREE.Vector3() },
  focus: THREE.IUniform<THREE.Vector4> = { value:new THREE.Vector4() },
): PaintedCellScenery {
  const placements = makeSceneryPlacements(cell, seed, protectedSites);
  const group = new THREE.Group();
  const centerX = cell.corner.x + cell.cellSize / 2;
  const centerZ = cell.corner.z + cell.cellSize / 2;
  const dummy = new THREE.Object3D();
  for (const kind of ['pine','round-tree','boulder','shrub'] as const) {
    const items = placements.filter(item => item.kind === kind);
    if (!items.length) continue;
    const template = makePaintedTemplate(kind, worldOrigin, focus);
    const instances = new THREE.InstancedMesh(template.geometry, template.material, items.length);
    instances.name = 'Painted ' + kind + ' / original Hearthmere art grammar';
    instances.castShadow = true;
    instances.receiveShadow = true;
    instances.frustumCulled = false;
    for (let index = 0; index < items.length; index++) {
      const item: SceneryPlacement = items[index];
      dummy.position.set(item.x - centerX, item.y, item.z - centerZ);
      dummy.rotation.set(0, item.rotation, 0);
      dummy.scale.setScalar(item.scale);
      dummy.updateMatrix();
      instances.setMatrixAt(index, dummy.matrix);
      instances.setColorAt(index, new THREE.Color().setRGB(
        .88 + item.tint*.18, .88 + item.tint*.15, .88 + item.tint*.13));
    }
    instances.instanceMatrix.needsUpdate = true;
    if (instances.instanceColor) instances.instanceColor.needsUpdate = true;
    group.add(instances);
  }

  // Reuse the ACTUAL original painted flower/grass blade shader, not invented
  // particle cards or primitive balls. It handles sampled terrain heights.
  const time: THREE.IUniform<number> = { value: 0 };
  const meadow = meadowForCell(cell, seed, protectedSites);
  if (meadow.grasses.length || meadow.flowers.length) {
    addPaintedMeadow(group, time, new SceneryMotion(), meadow.grasses, meadow.flowers);
  }
  return { group, count: placements.length + meadow.grasses.length + meadow.flowers.length, time };
}
