import * as THREE from 'three';
import { sampleCellHeight, type TerrainCell } from './WorldTerrain';
import { createGeography, BIOME_LABELS } from './WorldGeography';
import { renderOriginFor, worldToCell, type WorldPosition } from './WorldCoordinates';
import { HttpWorldArtifactTransport, WorldV2ArtifactSource, WorldV2GameplayBridge } from './WorldV2GameplayBridge';
import { createOceanPreview } from './WorldOceanPreview';
import { createSceneryMeshes } from './WorldSceneryRender';
import { planCells } from './WorldCellStreamer';
import { addOriginalWorldLighting, addPaintedSky, paintedPalette } from '../rendering/PaintedWorldStyle';
import { CharacterRig } from '../rendering/CharacterMeshBuilder';
import { GAMEPLAY_CAMERA_OFFSET, IsometricCameraController } from '../rendering/IsometricCamera';
import { surfaceAt, traverseTerrain, type TerrainCellStore, type TraversalBlock } from './WorldSurface';
import { findTerrainPath, type NavigationResult } from './WorldNavigation';
import { WorldV2ArrivalSession } from './WorldV2ArrivalSession';
import { getCompanionClassesForPlayer } from '../game/CompanionRoster';
import { disposeObject } from '../rendering/SceneResources';
import type { CharacterClassId } from '../types/game';

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

const storyMode = location.pathname.endsWith('/world-v2-story.html');
const reviewMode = !storyMode && new URLSearchParams(location.search).get('visualReview') === '1';
const debugGrid = new URLSearchParams(location.search).get('debugGrid') === '1';
if (reviewMode) document.documentElement.classList.add('visual-review');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
// Original Hearthmere palette and real paper-wash sky instead of flat teal.
scene.fog = new THREE.Fog(0xa5ccdc, 180, 395);
const paintedSky = new THREE.Group();
addPaintedSky(paintedSky, 360);
scene.add(paintedSky);
addOriginalWorldLighting(scene, { touchUI: window.innerWidth < 760, preservePaintedSky: true });
const rim = new THREE.DirectionalLight(0xffc79b, 0.58);
rim.position.set(-14, 16, -22);
scene.add(rim);
const originUniform: THREE.IUniform<THREE.Vector3> = { value: new THREE.Vector3() };
const disabledSceneryCutaway = { value: new THREE.Vector4(0, 0, 0, 0) };
const ocean = createOceanPreview();
scene.add(ocean.mesh);
const cameraController = new IsometricCameraController();
const camera = cameraController.camera;
camera.far = 500;
camera.updateProjectionMatrix();
// The actual existing hero rig (not the lab's previous orange cone).
let playerRig = new CharacterRig('warrior');
scene.add(playerRig.root);
playerRig.root.visible = !reviewMode && !storyMode;
const anchorMeshes: Array<{ mesh: THREE.Mesh; pos: WorldPosition }> = [];
for (const anchor of anchors.list()) {
  const marker = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 5, 12),
    new THREE.MeshBasicMaterial({ color: anchor.id.includes('hearthmere') ? 0xf8d37a : 0xe2aed4 }),
  );
  marker.visible = !reviewMode && !storyMode;
  scene.add(marker);
  anchorMeshes.push({ mesh: marker, pos: anchor.position });
}
type SurfaceResource = {
  readonly cell: TerrainCell;
  readonly mesh: THREE.Group;
  readonly sceneryCount: number;
  readonly sceneryTime: THREE.IUniform<number>;
};
// Colors are selected from HearthmereScenery's painted foliage, stone,
// plaster, road and river palette, not arbitrary RGB debug colors.
const biomeColors = [0x254f71, 0x4386a0, 0xd7bf97, 0x7b965c,
  0x49665d, 0x898e88, 0xf1ddba, 0xaa8b6d];
const biomeHighlights = [0x4386a0, 0x80b7a2, 0xe0cda9, 0xa5ab70,
  0x879a62, 0xb2ac9e, 0xf6ede0, 0xbda887];
const riverMeshes: Array<{ mesh: THREE.Mesh; originX: number; originZ: number }> = [];
for (const river of geoWorld.rivers) {
  const first = river.points[0];
  // Water ribbon has feathered banks and a tapered headwater source; the
  // previous hard-edged cyan plane read as a floating road above the hills.
  const vertices: number[] = [];
  const alpha: number[] = [];
  const triangles: number[] = [];
  const points = river.points;
  const sections = [-1, -0.58, 0, 0.58, 1];
  const edges = [0, 0.52, 0.84, 0.52, 0];
  for (let i = 0; i < points.length; i++) {
    const center = points[i];
    const previous = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const dx = next.x - previous.x, dz = next.z - previous.z;
    const length = Math.max(0.0001, Math.hypot(dx, dz));
    const normalX = dz / length, normalZ = -dx / length;
    const headwaterTaper = Math.min(1, 0.15 + i / 5);
    const halfWidth = river.halfWidth * 0.54 * headwaterTaper;
    for (let j = 0; j < sections.length; j++) {
      const across = sections[j];
      vertices.push(center.x - first.x + normalX * halfWidth * across,
        center.waterLevel + 0.038,
        center.z - first.z + normalZ * halfWidth * across);
      alpha.push(edges[j]);
    }
    if (i > 0) {
      const prevBase = (i - 1) * sections.length;
      const currentBase = i * sections.length;
      for (let j = 0; j < sections.length - 1; j++) {
        triangles.push(prevBase + j, prevBase + j + 1, currentBase + j);
        triangles.push(prevBase + j + 1, currentBase + j + 1, currentBase + j);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('aWaterAlpha', new THREE.Float32BufferAttribute(alpha, 1));
  geometry.setIndex(triangles);
  const mesh = new THREE.Mesh(geometry, new THREE.ShaderMaterial({
    vertexShader: `
      attribute float aWaterAlpha;
      varying float vWaterAlpha;
      void main() {
        vWaterAlpha = aWaterAlpha;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision mediump float;
      varying float vWaterAlpha;
      void main() {
        gl_FragColor = vec4(0.35, 0.72, 0.81, vWaterAlpha);
      }
    `,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  }));
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
    const color = new THREE.Color(), base = new THREE.Color(), highlight = new THREE.Color();
    const roadColor = new THREE.Color(0xb4a184);
    for (let index = 0; index < position.count; index++) {
      const terrainY = cell.heights[index];
      position.setZ(index, terrainY);
      const biome = g.biomes[index];
      const col = index % (cell.segments + 1);
      const row = Math.floor(index / (cell.segments + 1));
      const wx = (cell.coordinate.x + col / cell.segments) * atlas.cellSize;
      const wz = (cell.coordinate.z + row / cell.segments) * atlas.cellSize;
      const wash = Math.sin(wx * .28 + wz * .44) +
        Math.sin(wz * .68 - wx * .21) * .64 +
        Math.sin(wx * 1.33 + wz * .91) * .26;
      base.setHex(biomeColors[biome]); highlight.setHex(biomeHighlights[biome]);
      color.copy(base).lerp(highlight, THREE.MathUtils.clamp(.24 + wash * .13, .07, .48));
      if (g.roads[index] > 10) color.lerp(roadColor, g.roads[index] / 255 * .89);
      colors.push(color.r, color.g, color.b);
    }
    position.needsUpdate = true;
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.rotateX(-Math.PI / 2);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, paintedPalette(disabledSceneryCutaway, {
      worldOrigin: originUniform, side: THREE.DoubleSide,
    }));
    mesh.receiveShadow = true;
    const group = new THREE.Group();
    group.add(mesh);
    const scenery = createSceneryMeshes(cell, atlas.worldSeed, atlas.anchors, originUniform);
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
    return { cell, mesh: group, sceneryCount: scenery.count, sceneryTime: scenery.time };
  },
  unload: resource => {
    scene.remove(resource.mesh);
    resource.mesh.traverse(node => {
      if (!(node instanceof THREE.Mesh) && !(node instanceof THREE.LineSegments)) return;
      // InstancedMesh owns GPU instance buffers beyond shared geometry.
      if (node instanceof THREE.InstancedMesh) node.dispose();
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

// Right-click an available terrain surface to inspect cross-cell A* routes.
// Uses the same baked navigation and slope/water rules as character movement.
const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
const pathLineMaterial = new THREE.LineBasicMaterial({ color: 0xffd475 });
let pathLine: THREE.Line | null = null;
canvas.addEventListener('contextmenu', event => event.preventDefault());
canvas.addEventListener('pointerdown', event => {
  if (event.button !== 2 || reviewMode) return;
  pointer.set((event.clientX / Math.max(1, canvas.clientWidth)) * 2 - 1,
    -(event.clientY / Math.max(1, canvas.clientHeight)) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const groundMeshes = streamer.loaded().map(entry => entry.resource.mesh.children[0])
    .filter(mesh => mesh instanceof THREE.Mesh);
  const hit = raycaster.intersectObjects(groundMeshes, false)[0];
  if (!hit) return;
  const origin = renderOriginFor(player, atlas.cellSize);
  pathResult = findTerrainPath(tileStore, player,
    { x: hit.point.x + origin.x, z: hit.point.z + origin.z });
  if (pathLine) { scene.remove(pathLine); pathLine.geometry.dispose(); pathLine = null; }
  if (pathResult.status !== 'complete') return;
  const vertices = pathResult.waypoints.map(p =>
    new THREE.Vector3(p.x, p.y + 0.45, p.z));
  if (vertices.length < 2) return;
  pathLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(vertices), pathLineMaterial);
  pathLine.position.set(-origin.x, 0, -origin.z);
  scene.add(pathLine);
});
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
const storyCompanions: Array<{ rig: CharacterRig; world: WorldPosition }> = [];
const tileStore: TerrainCellStore = {
  cellSize: atlas.cellSize,
  getCell(address) {
    return streamer.loaded().find(entry =>
      entry.resource.cell.coordinate.x === address.x &&
      entry.resource.cell.coordinate.z === address.z)?.resource.cell;
  },
};
let movementBlocked: TraversalBlock | null = null;
let pathResult: NavigationResult | null = null;
let previewWarp = false;
let lastStream = -Infinity;
const storyLeadMarker = storyMode ? new THREE.Mesh(
  new THREE.RingGeometry(0.85, 1.12, 32),
  new THREE.MeshBasicMaterial({ color: 0xffd475, side: THREE.DoubleSide, depthWrite: false }),
) : null;
if (storyLeadMarker) {
  storyLeadMarker.rotation.x = -Math.PI / 2;
  storyLeadMarker.visible = false;
  scene.add(storyLeadMarker);
}
const storySession = storyMode ? new WorldV2ArrivalSession(
  anchors,
  (role: CharacterClassId) => {
    scene.remove(playerRig.root);
    disposeObject(playerRig.root);
    playerRig = new CharacterRig(role);
    scene.add(playerRig.root);
    playerRig.root.visible = true;
    const arrival = source.resolveAnchor('hearthmere.arrival');
    player.x = arrival.position.x - 3.5;
    player.z = arrival.position.z;
    player.y = arrival.position.y; // re-sampled when compiled ground is resident
    for (const companionClass of getCompanionClassesForPlayer(role)) {
      const rig = new CharacterRig(companionClass);
      scene.add(rig.root);
      storyCompanions.push({ rig, world: { ...player } });
    }
    movement.clear();
    lastStream = -Infinity;
    gameplay.update(player, { x: 0, z: 0 });
  },
  (x, z) => !!surfaceAt(tileStore, x, z)?.walkable,
  () => player,
) : null;
if (storySession) {
  window.addEventListener('keydown', event => {
    if (event.code === 'KeyF' && !event.repeat &&
        !(event.target instanceof HTMLElement && event.target.matches('input, textarea, select'))) {
      storySession.interact();
    }
  });
}
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
    previewWarp = button.dataset.jump === 'sea';
    movementBlocked = null;
    pathResult = null;
    lastStream = -Infinity;
    streamer.update(player);
  });
}
let previous = performance.now();
let active = true;
let framesRendered = 0;
let reviewAngle = 0;
let reviewZoom = 1;
const streamOptions = { worldId: atlas.worldId, cellSize: atlas.cellSize,
  activeRadius: 1, warmRadius: 2, lookAheadDistance: 0 };
function resize() {
  const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
  renderer.setSize(w, h, false);
  cameraController.updateAspect();
  camera.aspect = w / h;
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
  const speed = movement.has('shift') ? 13 : 7;
  const oldX = player.x, oldZ = player.z;
  if (!reviewMode && !previewWarp && (!storyMode || !!storySession?.role) && len > 0) {
    const moved = traverseTerrain(tileStore, player, dx * dt * speed, dz * dt * speed);
    if (moved.moved) {
      player.x = moved.position.x; player.y = moved.position.y;
      player.z = moved.position.z;
      movementBlocked = null;
    } else movementBlocked = moved.blockedBy;
  }
  // Only sample resident, actual generated ground. Do not teleport a player to
  // Y=0 while waiting for a streamed collision cell to arrive.
  const ground = surfaceAt(tileStore, player.x, player.z);
  if (ground && (!previewWarp || reviewMode)) player.y = ground.y;
  const actualDx = player.x - oldX, actualDz = player.z - oldZ;

  if (now - lastStream > 120) {
    gameplay.update(player, { x: actualDx || dx, z: actualDz || dz });
    lastStream = now;
  }
  const origin = renderOriginFor(player, atlas.cellSize);
  const local = { x: player.x - origin.x, y: player.y, z: player.z - origin.z };
  originUniform.value.set(origin.x, origin.y, origin.z);
  playerRig.root.position.set(local.x, local.y + .15, local.z);
  playerRig.updateAnimation(dt, {
    isMoving: len > 0 && (!storyMode || !!storySession?.role),
    moveSpeedRatio: len > 0 && (!storyMode || !!storySession?.role) ? 1 : 0,
    attackComboStep: 0, attackSwingProgress: 0,
    isDashing: false, hitFlashTimer: 0,
  });
  for (const { mesh, pos } of anchorMeshes) {
    mesh.position.set(pos.x - origin.x, height(pos.x, pos.z) + 2.5, pos.z - origin.z);
  }
  for (const river of riverMeshes) {
    river.mesh.position.set(river.originX - origin.x, 0, river.originZ - origin.z);
  }
  if (pathLine && pathResult?.status === 'complete') {
    pathLine.position.set(-origin.x, 0, -origin.z);
  }
  for (const { resource } of streamer.loaded()) {
    resource.sceneryTime.value = reviewMode ? 0 : now * .001;
    const cell = resource.cell;
    resource.mesh.position.set(
      cell.corner.x + cell.cellSize / 2 - origin.x, 0,
      cell.corner.z + cell.cellSize / 2 - origin.z,
    );
  }
  // Same perspective, height, pitch and distance as the playable game.
  // Review zoom scales around the *native* offset, not the old 54-unit aerial
  // inspection camera. At sea, a later ship view can widen deliberately.
  const offset = GAMEPLAY_CAMERA_OFFSET;
  const camX = -offset.z * Math.sin(reviewAngle) * reviewZoom;
  const camZ = offset.z * Math.cos(reviewAngle) * reviewZoom;
  camera.position.set(local.x + camX, local.y + .8 + offset.y * reviewZoom, local.z + camZ);
  camera.lookAt(local.x, local.y + .8, local.z);
  paintedSky.position.copy(camera.position);
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
Collision: ${previewWarp ? 'spectator over water' : movementBlocked ?? 'grounded'} · Navigation: ${pathResult?.status ?? 'idle'}
Resident cells: ${streamer.loaded().length} · failures: ${loadingErrors}
Geography: ${source.catalog.atlas.landmasses.length} landmasses, ${geoWorld.rivers.length} rivers
Atlas hash: ${atlas.contentHash} · baked geography tiles: ${source.catalog.cells.length +
  (source.catalog.pages ?? []).reduce((sum, page) => sum + page.cellCount, 0)}`;
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
    __worldV2FunctionalQA?: {
      snapshot: () => {
        camera: string; cameraDistance: number; cameraFov: number;
        x: number; y: number; z: number; groundY: number | null;
        walkable: boolean; collision: TraversalBlock | null;
        resident: number; frame: number; atlasPages: number; fetchedPages: number;
      };
      pathTo: (x: number, z: number) => NavigationResult;
    };
    __worldV2Review?: {
      setView: (view: { x: number; z: number; zoom?: number; angle?: number }) => void;
      snapshot: () => {
        ready: boolean; frame: number; expected: number; resident: number;
        loadingErrors: number; scenery: number; worldX: number; worldZ: number;
        atlasHash: string; currentBiome: string; water: string; cellId: string;
        artPipeline: 'hearthmere-painted-v1'; cameraMode: 'native-perspective';
      };
    };
  }
}
if (new URLSearchParams(location.search).get('functionalQA') === '1') {
  window.__worldV2FunctionalQA = {
    snapshot() {
      const ground = surfaceAt(tileStore, player.x, player.z);
      return {
        camera: camera.type,
        cameraDistance: camera.position.distanceTo(playerRig.root.position),
        cameraFov: camera.fov,
        x: player.x, y: player.y, z: player.z,
        groundY: ground?.y ?? null, walkable: ground?.walkable ?? false,
        collision: movementBlocked,
        resident: streamer.loaded().length, frame: framesRendered,
        atlasPages: source.catalog.pages?.length ?? 0,
        fetchedPages: performance.getEntriesByType('resource')
          .filter(item => item.name.includes('/world-v2/geography/pages/')).length,
      };
    },
    pathTo(x, z) {
      if (![x, z].every(Number.isFinite)) throw new RangeError('Invalid QA navigation goal');
      return findTerrainPath(tileStore, player, { x, z });
    },
  };
}
if (reviewMode) {
  window.__worldV2Review = {
    setView(view) {
      if (![view.x, view.z].every(Number.isFinite)) throw new RangeError('Invalid review camera position');
      movement.clear();
      player.x = view.x;
      player.z = view.z;
      previewWarp = true;
      reviewAngle = Number.isFinite(view.angle) ? (view.angle ?? 0) : 0;
      reviewZoom = Number.isFinite(view.zoom) ? Math.max(0.5, Math.min(3.5, view.zoom ?? 1)) : 1;
      resize();
      lastStream = -Infinity;
      gameplay.update(player, { x: 0, z: 0 });
    },
    snapshot() {
      const resident = streamer.loaded();
      const desired = planCells(player, { x: 0, z: 0 }, streamOptions)
        .filter(item => source.hasCell(item.address));
      const residentIds = new Set(resident.map(item => item.id));
      const expected = desired.length;
      const address = worldToCell(player, atlas.cellSize);
      const home = resident.find(entry =>
        entry.resource.cell.coordinate.x === address.x &&
        entry.resource.cell.coordinate.z === address.z);
      const biome = geoWorld.sample(player.x, player.z);
      const scenery = resident.reduce((sum, entry) => sum + entry.resource.sceneryCount, 0);
      return {
        ready: expected > 0 && desired.every(item => residentIds.has(item.id)) &&
          home !== undefined && loadingErrors === 0 && framesRendered > 5,
        frame: framesRendered, expected, resident: resident.length,
        loadingErrors, scenery, worldX: player.x, worldZ: player.z,
        atlasHash: atlas.contentHash,
        artPipeline: 'hearthmere-painted-v1',
        cameraMode: 'native-perspective',
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
  if (storyLeadMarker) {
    scene.remove(storyLeadMarker);
    storyLeadMarker.geometry.dispose();
    storyLeadMarker.material.dispose();
  }
  for (const actor of storyCompanions) {
    scene.remove(actor.rig.root);
    disposeObject(actor.rig.root);
  }
  if (pathLine) { scene.remove(pathLine); pathLine.geometry.dispose(); }
  pathLineMaterial.dispose();
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
