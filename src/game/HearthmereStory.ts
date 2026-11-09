/** Story progression contract only: no Three.js, scene, or world-coordinate dependency. */
export const OPENING_STEPS = [
  'arrival', 'market', 'mara', 'rowan', 'cart_test', 'shipment',
  'square', 'yard_gate', 'load_cart', 'far_hold', 'escort', 'refuge', 'complete',
] as const;

export type OpeningStep = (typeof OPENING_STEPS)[number];

/** Legacy v1 snapshots only; World V2 does NOT migrate old saves (D165).
 * New V2 sessions use canonical world positions and named story anchors. */
export interface OpeningPoint { x: number; z: number }
