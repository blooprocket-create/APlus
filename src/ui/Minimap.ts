export interface MapSnapshot {
  player: { x: number; z: number; yaw: number };
  enemies: { x: number; z: number; boss: boolean }[];
  portals: { x: number; z: number }[];
  npcs: { x: number; z: number }[];
  path: { x: number; z: number }[];
  connections?: [number, number][];
}

type MapPoint = { x: number; z: number };

const MAP_RADIUS_WORLD = 26;
const GRID_SPACING_WORLD = 8;
const validPoint = (point: MapPoint | undefined): point is MapPoint =>
  !!point && Number.isFinite(point.x) && Number.isFinite(point.z);

/** North-up, player-centered local map. Off-map points of interest show a bearing at the rim. */
export function drawMinimap(canvas: HTMLCanvasElement, map: MapSnapshot): void {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  if (!ctx || width <= 0 || height <= 0 || !validPoint(map.player)) return;

  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.max(1, Math.min(width, height) / 2 - 3);
  const scale = radius / MAP_RADIUS_WORLD;
  // The backing canvas is 220px but CSS can shrink it to 68px on phones.
  // Keep the player arrow and POI markers legible at their actual display size.
  const displayedWidth = canvas.getBoundingClientRect?.().width || canvas.clientWidth || width;
  const markerScale = Math.min(2.4, Math.max(1, 158 / displayedWidth));
  const project = (point: MapPoint): [number, number] => [
    centerX + (point.x - map.player.x) * scale,
    centerY + (point.z - map.player.z) * scale,
  ];

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#0c171cf2';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#25403f';
  ctx.lineWidth = 0.6;
  const worldLeft = map.player.x - radius / scale;
  const worldTop = map.player.z - radius / scale;
  for (let x = Math.ceil(worldLeft / GRID_SPACING_WORLD) * GRID_SPACING_WORLD;
    x <= map.player.x + radius / scale; x += GRID_SPACING_WORLD) {
    const screenX = centerX + (x - map.player.x) * scale;
    ctx.beginPath(); ctx.moveTo(screenX, 0); ctx.lineTo(screenX, height); ctx.stroke();
  }
  for (let z = Math.ceil(worldTop / GRID_SPACING_WORLD) * GRID_SPACING_WORLD;
    z <= map.player.z + radius / scale; z += GRID_SPACING_WORLD) {
    const screenY = centerY + (z - map.player.z) * scale;
    ctx.beginPath(); ctx.moveTo(0, screenY); ctx.lineTo(width, screenY); ctx.stroke();
  }

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  let hasRoad = false;
  ctx.beginPath();
  if (map.connections) {
    for (const [from, to] of map.connections) {
      const a = map.path[from];
      const b = map.path[to];
      // A stale/partial saved route must never break the HUD render loop.
      if (!validPoint(a) || !validPoint(b)) continue;
      const [ax, ay] = project(a);
      const [bx, by] = project(b);
      ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
      hasRoad = true;
    }
  } else {
    map.path.forEach((point, index) => {
      if (!validPoint(point)) return;
      const [x, y] = project(point);
      if (index === 0 || !validPoint(map.path[index - 1])) ctx.moveTo(x, y);
      else { ctx.lineTo(x, y); hasRoad = true; }
    });
  }
  if (hasRoad) {
    ctx.strokeStyle = '#304b49'; ctx.lineWidth = 8.4 * scale; ctx.stroke();
    ctx.strokeStyle = '#58736a'; ctx.lineWidth = Math.max(1, markerScale); ctx.stroke();
  } else if (!map.path.length) {
    const [x, y] = project({ x: 0, z: 0 });
    ctx.beginPath(); ctx.arc(x, y, 18.5 * scale, 0, Math.PI * 2);
    ctx.strokeStyle = '#58736a'; ctx.lineWidth = 1.5; ctx.stroke();
  }

  const marker = (point: MapPoint, color: string, size: number, pointOfInterest = false) => {
    if (!validPoint(point)) return;
    const [x, y] = project(point);
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.hypot(dx, dy);
    const markerRadius = size * markerScale;
    const limit = Math.max(0, radius - markerRadius - 3);
    if (distance > limit && !pointOfInterest) return;

    ctx.fillStyle = color;
    if (distance > limit) {
      // Show the direction to distant portals and objectives rather than silently hiding them.
      const angle = Math.atan2(dy, dx);
      ctx.save();
      ctx.translate(centerX + Math.cos(angle) * limit, centerY + Math.sin(angle) * limit);
      ctx.rotate(angle + Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, -markerRadius * 1.25);
      ctx.lineTo(-markerRadius * 0.8, markerRadius * 0.7);
      ctx.lineTo(markerRadius * 0.8, markerRadius * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else {
      ctx.beginPath(); ctx.arc(x, y, markerRadius, 0, Math.PI * 2); ctx.fill();
    }
  };

  map.enemies.forEach(point => marker(point, point.boss ? '#edac69' : '#ed7685', point.boss ? 4 : 2.5));
  map.portals.forEach(point => marker(point, '#a9ded6', 4, true));
  map.npcs.forEach(point => marker(point, '#d8b97d', 3.5, true));

  ctx.translate(centerX, centerY);
  ctx.rotate(Math.PI - (Number.isFinite(map.player.yaw) ? map.player.yaw : 0));
  ctx.beginPath();
  const arrowSize = markerScale;
  ctx.moveTo(0, -7 * arrowSize);
  ctx.lineTo(5 * arrowSize, 5 * arrowSize);
  ctx.lineTo(0, 2 * arrowSize);
  ctx.lineTo(-5 * arrowSize, 5 * arrowSize);
  ctx.closePath();
  ctx.fillStyle = '#f7eedb';
  ctx.fill();
  ctx.restore();
}
