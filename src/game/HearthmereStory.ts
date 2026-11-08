/** Story progression contract only: no Three.js, scene, or world-coordinate dependency. */
export const OPENING_STEPS = [
  'arrival', 'market', 'mara', 'rowan', 'cart_test', 'shipment',
  'square', 'yard_gate', 'load_cart', 'far_hold', 'escort', 'refuge', 'complete',
] as const;

export type OpeningStep = (typeof OPENING_STEPS)[number];

/** Legacy v1 snapshots use these 2D positions. V2 migrates them via named anchors. */
export interface OpeningPoint { x: number; z: number }
