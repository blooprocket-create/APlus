export interface MinimapTerrain {
  /** Top-down image of actual zone meshes, not a procedural navigation graph. */
  canvas: HTMLCanvasElement;
  /** World center and half-size of the captured square. */
  x: number;
  z: number;
  radius: number;
}

export interface MapSnapshot {
  player: { x: number; z: number; yaw: number };
  enemies: { x: number; z: number; boss: boolean }[];
  portals: { x: number; z: number }[];
  npcs: { x: number; z: number }[];
  terrain?: MinimapTerrain;
}

type MapPoint = { x: number; z: number };

const MAP_RADIUS_WORLD = 26;
const validPoint = (point: MapPoint | undefined): point is MapPoint =>
  !!point && Number.isFinite(point.x) && Number.isFinite(point.z);

/** North-up local map, with a world-accurate background and stable HUD markers. */
export function drawMinimap(canvas: HTMLCanvasElement, map: MapSnapshot): void {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  if (!ctx || width <= 0 || height <= 0 || !validPoint(map.player)) return;

  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.max(1, Math.min(width, height) / 2 - 3);
  const scale = radius / MAP_RADIUS_WORLD;
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

  const terrain = map.terrain;
  if (terrain && terrain.radius > 0 && validPoint(terrain)) {
    const pixelsPerWorld = terrain.canvas.width / (terrain.radius * 2);
    const sourceWidth = width / scale * pixelsPerWorld;
    const sourceHeight = height / scale * pixelsPerWorld;
    const sourceX = terrain.canvas.width / 2
      + (map.player.x - terrain.x) * pixelsPerWorld - sourceWidth / 2;
    const sourceY = terrain.canvas.height / 2
      + (map.player.z - terrain.z) * pixelsPerWorld - sourceHeight / 2;
    // The capture is deliberately wider than the display, allowing smooth
    // world-aligned panning between expensive GPU captures.
    ctx.drawImage(terrain.canvas, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
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
