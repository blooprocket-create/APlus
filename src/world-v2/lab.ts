import * as THREE from 'three';
import { sampleCellHeight, type TerrainCell } from './WorldTerrain';
import { renderOriginFor, worldToCell, type WorldPosition } from './WorldCoordinates';
import { HttpWorldArtifactTransport, WorldV2ArtifactSource, WorldV2GameplayBridge } from './WorldV2GameplayBridge';

/**
 * Standalone QA-only sandbox: does NOT use Hearthmere's old path generator,
 * move the existing opening, or define the final canonical atlas.
 */
const source = await WorldV2ArtifactSource.open(new HttpWorldArtifactTransport());
const atlas = source.catalog.atlas;
const anchors = source.anchors;
const canvas = document.querySelector<HTMLCanvasElement>('#lab');
const status = document.querySelector<HTMLElement>('#status');
if (!canvas || !status) throw new Error('World V2 lab UI is missing');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x9dc6c9);
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x9dc6c9, 95, 230);
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
const anchorMeshes: Array<{ mesh: THREE.Mesh; pos: WorldPosition }> = [];
for (const anchor of anchors.list()) {
  const marker = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 5, 12),
    new THREE.MeshBasicMaterial({ color: anchor.id.endsWith('refuge') ? 0xe2aed4 : 0xffd36d }),
  );
  scene.add(marker);
  anchorMeshes.push({ mesh: marker, pos: anchor.position });
}
type SurfaceResource = { readonly cell: TerrainCell; readonly mesh: THREE.Mesh };
let loadingErrors = 0;
const gameplay = new WorldV2GameplayBridge<SurfaceResource>(source, {
  load: async (coordinate, signal) => {
    const cell = await source.loadTerrainCell(coordinate, signal);
    const geometry = new THREE.PlaneGeometry(cell.cellSize, cell.cellSize, cell.segments, cell.segments);
    const position = geometry.getAttribute('position') as THREE.BufferAttribute;
    const colors: number[] = [];
    const cold = new THREE.Color(0x316c66), warm = new THREE.Color(0x9bc88a);
    for (let index = 0; index < position.count; index++) {
      const terrainY = cell.heights[index];
      position.setZ(index, terrainY);
      const color = cold.clone().lerp(warm, THREE.MathUtils.clamp((terrainY + 4) / 9, 0, 1));
      colors.push(color.r, color.g, color.b);
    }
    position.needsUpdate = true;
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.rotateX(-Math.PI / 2);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    mesh.receiveShadow = false;
    const border = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(cell.cellSize, cell.cellSize), 1),
      new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.15, transparent: true }),
    );
    // Edge outline is only visual; it carries no collision or movement rule.
    border.rotation.x = -Math.PI / 2;
    border.position.y = 0.06;
    mesh.add(border);
    scene.add(mesh);
    return { cell, mesh };
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
let previous = performance.now();
let lastStream = -Infinity;
let active = true;
function resize() {
  const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
  renderer.setSize(w, h, false);
  const halfH = 44;
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
  for (const { resource } of streamer.loaded()) {
    const cell = resource.cell;
    resource.mesh.position.set(
      cell.corner.x + cell.cellSize / 2 - origin.x, 0,
      cell.corner.z + cell.cellSize / 2 - origin.z,
    );
  }
  camera.position.set(local.x + 35, local.y + 54, local.z + 48);
  camera.lookAt(local.x, local.y, local.z);
  renderer.render(scene, camera);

  const at = Math.floor(now / 200);
  if (at !== Math.floor((now - dt * 1000) / 200)) {
    status!.textContent = `Player world X/Z: ${player.x.toFixed(2)} / ${player.z.toFixed(2)}
Cell: ${Math.floor(player.x / atlas.cellSize)}, ${Math.floor(player.z / atlas.cellSize)}
Resident cells: ${streamer.loaded().length} · failures: ${loadingErrors}
Atlas hash: ${atlas.contentHash} · baked preview tiles: ${source.catalog.cells.length}`;
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
window.addEventListener('pagehide', () => {
  active = false;
  gameplay.dispose();
  renderer.dispose();
});
