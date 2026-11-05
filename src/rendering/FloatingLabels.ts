export interface LabelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const LANES = [
  [0, 0], [-1, 0], [1, 0], [-1.5, 0], [1.5, 0], [0, 1], [-1, 1], [1, 1],
  [0, 2], [-1, 2], [1, 2], [-2, 0], [2, 0], [0, 3],
];
const GUTTER = 4;
const EDGE = 8;

/** Keep labels above the point of impact and reuse their lane as they rise. */
export function placeFloatingLabel(
  anchorX: number,
  anchorY: number,
  width: number,
  height: number,
  viewport: { width: number; height: number },
  occupied: readonly LabelRect[],
  preferred: number,
): (LabelRect & { lane: number }) | undefined {
  if (width <= 0 || height <= 0 || width > viewport.width - EDGE * 2) return undefined;
  const clamped = (value: number, limit: number) => Math.max(EDGE, Math.min(value, limit - EDGE));
  for (let attempt = -1; attempt < LANES.length; attempt++) {
    const lane = attempt < 0 ? preferred : attempt;
    if (lane < 0 || (attempt >= 0 && lane === preferred)) continue;
    const [column, row] = LANES[lane];
    const x = clamped(anchorX - width * .5 + column * (Math.max(42, width) + GUTTER), viewport.width - width);
    const y = Math.max(EDGE, anchorY - height - GUTTER - row * (height + 8));
    if (y + height > viewport.height - EDGE || y + height > anchorY) continue;
    const overlaps = occupied.some(other => x < other.x + other.width + GUTTER && x + width + GUTTER > other.x
      && y < other.y + other.height + GUTTER && y + height + GUTTER > other.y);
    if (!overlaps) return { x, y, width, height, lane };
  }
  return undefined;
}
