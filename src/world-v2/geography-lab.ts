import * as THREE from 'three';
import { sampleCellHeight, type TerrainCell } from './WorldTerrain';
import { createGeography, BIOME_LABELS } from './WorldGeography';
import { renderOriginFor, worldToCell, type WorldPosition } from './WorldCoordinates';
import { HttpWorldArtifactTransport, WorldV2ArtifactSource, WorldV2GameplayBridge } from './WorldV2GameplayBridge';
import { createOceanPreview } from './WorldOceanPreview';
import { createSceneryMeshes } from './WorldSceneryRender';
import { planCells } from './WorldCellStreamer';

/**
 * Standalone QA-only sandbox: does NOT use Hearthmere's old path generator,
 * move the existing opening, or define the final canonical atlas.
 */
const source = await WorldV2ArtifactSource.open(new HttpWorldArtifactTransport('/world-v2/geography'));
if (source.catalog.profile !== 'geography-stage-v1' || !source.catalog.geography) {
  throw new Error('Expected compiled Phase 2 geography atlas');
}
const geoWorld = createGeography(source.catalog.atlas, source.catalog.geography);
const atlas = source.catalog.atlas;
const anchors = source.anchors;
const canvas = document.querySelector<HTMLCanvasElement>('#lab');
const status = document.querySelector<HTMLElement>('#status');
if (!canvas || !status) throw new Error('World V2 lab UI is missing');

const reviewMode = new URLSearchParams(location.search).get('visualReview') === '1';
const debugGrid = new URLSearchParams(location.search).get('debugGrid') === '1';
if (reviewMode) document.documentElement.classList.add('visual-review');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x91c6d2);
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x91c6d2, 160, 400);
const ocean = createOceanPreview();
scene.add(ocean.mesh);
scene.add(new THREE.HemisphereLight(0xf7f5e6, 0x37544a, 2.4));
const sun = new THREE.DirectionalLight(0xfff1d1, 2);
sun.position.set(28, 62, 17);
scene.add(sun);
const camera = new THREE.OrthographicCamera(-65, 65, 44, -44, 0.1, 400);
const playerMesh = new THREE.Mesh(
  new THREE.ConeGeometry(1.5, 4, 7),
  new THREE.MeshStandardMaterial({ color: 0xf2a64a, roughness: 0.7 }),
);
scene.add(playerMesh);
playerMesh.visible = !reviewMode;
const anchorMeshes: Array<{ mesh: THREE.Mesh; pos: WorldPosition }> = [];
for (const anchor of anchors.list()) {
  const marker = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 5, 12),
    new THREE.MeshBasicMaterial({ color: anchor.id.includes('hearthmere') ? 0xf8d37a : 0xe2aed4 }),
  );
  marker.visible = !reviewMode;
  scene.add(marker);
  anchorMeshes.push({ mesh: marker, pos: anchor.position });
}
type SurfaceResource = { readonly cell: TerrainCell; readonly mesh: THREE.Group; readonly sceneryCount: number };
const biomeColors = [0x163e5e, 0x368aa7, 0xe6d5a1, 0xa3c87d,
  0x3f9465, 0x777f71, 0xe8f5fa, 0xd7bc75];
const riverMeshes: Array<{ mesh: THREE.Mesh; originX: number; originZ: number }> = [];
for (const river of geoWorld.rivers) {
  const first = river.points[0];
  const curve = new THREE.CatmullRomCurve3(river.points.map(p =>
    new THREE.Vector3(p.x - first.x, p.waterLevel + 0.45, p.z - first.z)));
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, river.points.length * 3, Math.max(1.2, river.halfWidth * 0.45), 6, false),
    new THREE.MeshBasicMaterial({ color: 0x66cad5, transparent: true, opacity: 0.8 }),
  );
  scene.add(mesh);
  riverMeshes.push({ mesh, originX: first.x, originZ: first.z });
}

let loadingErrors = 0;
const gameplay = new WorldV2GameplayBridge<SurfaceResource>(source, {
  load: async (coordinate, signal) => {
    const cell = await source.loadTerrainCell(coordinate, signal);
    const geometry = new THREE.PlaneGeometry(cell.cellSize, cell.cellSize, cell.segments, cell.segments);
    const position = geometry.getAttribute('position') as THREE.BufferAttribute;
    const colors: number[] = [];
    const g = cell.geography;
    if (!g) throw new Error('Geography artifact missing biome/water attributes');
    for (let index = 0; index < position.count; index++) {
      const terrainY = cell.heights[index];
      position.setZ(index, terrainY);
      const biome = g.biomes[index];
      const color = new THREE.Color(biomeColors[biome]);
      if (g.roads[index] > 10) color.lerp(new THREE.Color(0xd9bca0), g.roads[index] / 255 * 0.85);
      colors.push(color.r, color.g, color.b);
    }
    position.needsUpdate = true;
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.rotateX(-Math.PI / 2);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    mesh.receiveShadow = false;
    const group = new THREE.Group();
    group.add(mesh);
    const scenery = createSceneryMeshes(cell, atlas.worldSeed);
    group.add(scenery.group);
    if (debugGrid) {
      const border = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.PlaneGeometry(cell.cellSize, cell.cellSize), 1),
        new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.18, transparent: true }),
      );
      border.rotation.x = -Math.PI / 2;
      border.position.y = 0.06;
      group.add(border);
    }
    scene.add(group);
    return { cell, mesh: group, sceneryCount: scenery.count };
  },
  unload: resource => {
    scene.remove(resource.mesh);
    resource.mesh.traverse(node => {
      if (!(node instanceof THREE.Mesh) && !(node instanceof THREE.LineSegments)) return;
      node.geometry.dispose();
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      for (const material of materials) material.dispose();
    });
  },
  onError: (error) => { loadingErrors++; console.error('World V2 cell load failed', error); },
}, {
  activeRadius: 1, warmRadius: 2, lookAheadDistance: 80,
  maxConcurrentLoads: 4, maxLoadsPerUpdate: 4,
});
const streamer = gameplay.streamer;
function height(x: number, z: number): number {
  const cell = worldToCell({ x, z }, atlas.cellSize);
  const resident = streamer.loaded().find(entry =>
    entry.resource.cell.coordinate.x === cell.x && entry.resource.cell.coordinate.z === cell.z);
  if (!resident) return 0; // No fake collision outside the finite baked preview.
  return sampleCellHeight(resident.resource.cell, x, z);
}

const movement = new Set<string>();
for (const [direction, key] of [
  ['up', 'w'], ['left', 'a'], ['down', 's'], ['right', 'd'],
] as const) {
  const button = document.querySelector<HTMLButtonElement>(`[data-direction="${direction}"]`);
  const release = () => movement.delete(key);
  button?.addEventListener('pointerdown', e => {
    e.preventDefault(); movement.add(key); button.setPointerCapture(e.pointerId);
  });
  button?.addEventListener('pointerup', release);
  button?.addEventListener('pointercancel', release);
  button?.addEventListener('lostpointercapture', release);
}
window.addEventListener('keydown', event => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Shift'].includes(event.key)) event.preventDefault();
  movement.add(event.key.toLowerCase());
});
window.addEventListener('keyup', event => movement.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => movement.clear());

const player = { x: 0, y: 0, z: 0 };
const jumps: Record<string, { x: number; z: number }> = {
  heart: { x: 0, z: 0 }, coast: { x: 505, z: 8 },
  island: { x: 1350, z: 540 }, continent: { x: 2700, z: 250 },
  sea: { x: 1330, z: 760 },
};
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-jump]')) {
  button.addEventListener('click', () => {
    const target = jumps[button.dataset.jump ?? ''];
    if (!target) return;
    player.x = target.x; player.z = target.z;
    lastStream = -Infinity;
    streamer.update(player);
  });
}
let previous = performance.now();
let lastStream = -Infinity;
let active = true;
let framesRendered = 0;
let reviewAngle = 0;
let reviewZoom = 1;
const streamOptions = { worldId: atlas.worldId, cellSize: atlas.cellSize,
  activeRadius: 1, warmRadius: 2, lookAheadDistance: 0 };
function resize() {
  const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
  renderer.setSize(w, h, false);
  const halfH = 44 * reviewZoom;
  camera.left = -halfH * (w / h);
  camera.right = halfH * (w / h);
  camera.top = halfH; camera.bottom = -halfH;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

function tick(now: number) {
  if (!active) return;
  const dt = Math.min(0.05, (now - previous) / 1000);
  previous = now;
  const left = movement.has('a') || movement.has('arrowleft');
  const right = movement.has('d') || movement.has('arrowright');
  const up = movement.has('w') || movement.has('arrowup');
  const down = movement.has('s') || movement.has('arrowdown');
  let dx = Number(right) - Number(left);
  let dz = Number(down) - Number(up);
  const len = Math.hypot(dx, dz);
  if (len > 0) { dx /= len; dz /= len; }
  const speed = movement.has('shift') ? 40 : 20;
  player.x += dx * dt * speed;
  player.z += dz * dt * speed;
  player.y = height(player.x, player.z);

  if (now - lastStream > 120) {
    gameplay.update(player, { x: dx, z: dz });
    lastStream = now;
  }
  const origin = renderOriginFor(player, atlas.cellSize);
  const local = { x: player.x - origin.x, y: player.y, z: player.z - origin.z };
  playerMesh.position.set(local.x, local.y + 2.6, local.z);
  for (const { mesh, pos } of anchorMeshes) {
    mesh.position.set(pos.x - origin.x, height(pos.x, pos.z) + 2.5, pos.z - origin.z);
  }
  for (const river of riverMeshes) {
    river.mesh.position.set(river.originX - origin.x, 0, river.originZ - origin.z);
  }
  for (const { resource } of streamer.loaded()) {
    const cell = resource.cell;
    resource.mesh.position.set(
      cell.corner.x + cell.cellSize / 2 - origin.x, 0,
      cell.corner.z + cell.cellSize / 2 - origin.z,
    );
  }
  const camX = 35 * Math.cos(reviewAngle) - 48 * Math.sin(reviewAngle);
  const camZ = 35 * Math.sin(reviewAngle) + 48 * Math.cos(reviewAngle);
  camera.position.set(local.x + camX, local.y + 54, local.z + camZ);
  camera.lookAt(local.x, local.y, local.z);
  ocean.update(player.x, player.z, local.x, local.z, reviewMode ? 0 : now * 0.001);
  renderer.render(scene, camera);
  framesRendered++;

  const at = Math.floor(now / 200);
  if (at !== Math.floor((now - dt * 1000) / 200)) {
    const address = worldToCell(player, atlas.cellSize);
    const cell = streamer.loaded().find(entry =>
      entry.resource.cell.coordinate.x === address.x && entry.resource.cell.coordinate.z === address.z)?.resource.cell;
    const fx = (player.x - address.x * atlas.cellSize) / atlas.cellSize;
    const fz = (player.z - address.z * atlas.cellSize) / atlas.cellSize;
    const column = Math.min(16, Math.max(0, Math.round(fx * 16)));
    const row = Math.min(16, Math.max(0, Math.round(fz * 16)));
    const vertexIndex = row * 17 + column;
    const g = cell?.geography;
    const biome = g ? BIOME_LABELS[g.biomes[vertexIndex]] : 'loading';
    const waterKind = g ? (g.waterKinds[vertexIndex] === 1 ? 'ocean' :
      g.waterKinds[vertexIndex] === 2 ? 'river' : 'land') : 'loading';
    status!.textContent = `World X/Z: ${player.x.toFixed(1)} / ${player.z.toFixed(1)}
Cell: ${address.x}, ${address.z} · ${biome} · ${waterKind}
Resident cells: ${streamer.loaded().length} · failures: ${loadingErrors}
Geography: ${source.catalog.atlas.landmasses.length} landmasses, ${geoWorld.rivers.length} rivers
Atlas hash: ${atlas.contentHash} · baked geography tiles: ${source.catalog.cells.length}`;
  }
  requestAnimationFrame(tick);
}
/**
 * Stable screenshot harness contract. Screenshots are only accepted when
 * every catalogued desired cell is resident, the shot has rendered several
 * frames, and no streaming error has been observed. No gameplay saves touched.
 */
declare global {
  interface Window {
    __worldV2Review?: {
      setView: (view: { x: number; z: number; zoom?: number; angle?: number }) => void;
      snapshot: () => {
        ready: boolean; frame: number; expected: number; resident: number;
        loadingErrors: number; scenery: number; worldX: number; worldZ: number;
        atlasHash: string; currentBiome: string; water: string; cellId: string;
      };
    };
  }
}
if (reviewMode) {
  window.__worldV2Review = {
    setView(view) {
      if (![view.x, view.z].every(Number.isFinite)) throw new RangeError('Invalid review camera position');
      movement.clear();
      player.x = view.x;
      player.z = view.z;
      reviewAngle = Number.isFinite(view.angle) ? (view.angle ?? 0) : 0;
      reviewZoom = Number.isFinite(view.zoom) ? Math.max(0.5, Math.min(3.5, view.zoom ?? 1)) : 1;
      resize();
      lastStream = -Infinity;
      gameplay.update(player, { x: 0, z: 0 });
    },
    snapshot() {
      const resident = streamer.loaded();
      const expected = planCells(player, { x: 0, z: 0 }, streamOptions)
        .filter(item => source.hasCell(item.address)).length;
      const address = worldToCell(player, atlas.cellSize);
      const home = resident.find(entry =>
        entry.resource.cell.coordinate.x === address.x &&
        entry.resource.cell.coordinate.z === address.z);
      const biome = geoWorld.sample(player.x, player.z);
      const scenery = resident.reduce((sum, entry) => sum + entry.resource.sceneryCount, 0);
      return {
        ready: expected > 0 && resident.length >= expected &&
          home !== undefined && loadingErrors === 0 && framesRendered > 5,
        frame: framesRendered, expected, resident: resident.length,
        loadingErrors, scenery, worldX: player.x, worldZ: player.z,
        atlasHash: atlas.contentHash,
        currentBiome: BIOME_LABELS[biome.biome],
        water: biome.waterKind === 0 ? 'land' : biome.waterKind === 1 ? 'ocean' : 'river',
        cellId: home?.id ?? 'unloaded',
      };
    },
  };
}
requestAnimationFrame(tick);
window.addEventListener('pagehide', () => {
  active = false;
  gameplay.dispose();
  scene.remove(ocean.mesh);
  ocean.mesh.geometry.dispose();
  ocean.mesh.material.dispose();
  for (const river of riverMeshes) {
    scene.remove(river.mesh);
    river.mesh.geometry.dispose();
    const material = river.mesh.material;
    if (material instanceof THREE.Material) material.dispose();
  }
  renderer.dispose();
});
