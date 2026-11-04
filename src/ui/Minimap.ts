export interface MapSnapshot {
  player: { x: number; z: number; yaw: number };
  enemies: { x: number; z: number; boss: boolean }[];
  portals: { x: number; z: number }[];
  npcs: { x: number; z: number }[];
  path: { x: number; z: number }[];
  connections?: [number, number][];
}

export function drawMinimap(canvas: HTMLCanvasElement, map: MapSnapshot): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const size = canvas.width;
  const center = size / 2;
  const scale = size / 52;
  const project = (p: { x: number; z: number }) => [center + (p.x - map.player.x) * scale, center + (p.z - map.player.z) * scale];
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.beginPath(); ctx.arc(center, center, center - 2, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#0c171cf2'; ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#25403f'; ctx.lineWidth = 0.6;
  const grid = 8 * scale;
  for (let i = -8; i < 9; i++) {
    const x = center + i * grid - (map.player.x % 8) * scale;
    const y = center + i * grid - (map.player.z % 8) * scale;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
  }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (map.path.length) {
    ctx.beginPath();
    if (map.connections) map.connections.forEach(([ai, bi]) => {
      const [ax, ay] = project(map.path[ai]); const [bx, by] = project(map.path[bi]);
      ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
    });
    else map.path.forEach((p, i) => { const [x, y] = project(p); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
    ctx.strokeStyle = '#304b49'; ctx.lineWidth = 8.4 * scale; ctx.stroke();
    ctx.strokeStyle = '#58736a'; ctx.lineWidth = 1; ctx.stroke();
  } else {
    const [x, y] = project({ x: 0, z: 0 });
    ctx.beginPath(); ctx.arc(x, y, 18.5 * scale, 0, Math.PI * 2);
    ctx.strokeStyle = '#58736a'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  const dot = (p: { x: number; z: number }, color: string, radius: number) => {
    const [x, y] = project(p); ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
  };
  map.enemies.forEach(p => dot(p, p.boss ? '#edac69' : '#ed7685', p.boss ? 4 : 2.5));
  map.portals.forEach(p => dot(p, '#a9ded6', 4));
  map.npcs.forEach(p => dot(p, '#d8b97d', 3.5));
  ctx.translate(center, center); ctx.rotate(-map.player.yaw + Math.PI);
  ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 5); ctx.lineTo(0, 2); ctx.lineTo(-5, 5); ctx.closePath();
  ctx.fillStyle = '#f7eedb'; ctx.fill(); ctx.restore();
}
