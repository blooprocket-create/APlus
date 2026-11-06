import * as THREE from 'three';
import type { CharacterClassId } from '../types/game';
import { buildHearthmereScenery } from '../rendering/HearthmereScenery';
import { HearthmereImpact, HearthmereResident } from '../rendering/HearthmereCast';
import { HearthmereGiant } from '../rendering/HearthmereGiant';
import { bakePieces, beam, loft, piece } from '../rendering/ArtMesh';
import { GroundMeshCollider, sweepGroundMovement } from './GroundMeshCollider';

export const HEARTHMERE_WAYSTATION = { x: -24, z: 5 };
export const HEARTHMERE_REFUGE = { x: 30, z: 7 };
export const HEARTHMERE_COVER = { x: 4, z: -5 };
const CART_START = { x: -8, z: 3 };
const CART_TEST = { x: -3, z: 5 };
const GATE = { x: 4, z: 5 };
const LOAD_CART = { x: 7, z: 5 };
const HOLD = { x: 10, z: 5 };
const FAR_HOLD = { x: 22, z: 5 };
const ATTACK_START = 12;
const ATTACK_END = 20;
const BRIDGE_Z = 5;
const MARA_ESCORT_OFFSET = new THREE.Vector3(-0.88, 0, 0.31);
const STRIKE_WINDUP = 1.25;
const STRIKE_RECOVERY = 2.1;
const STRIKE_PERIOD = STRIKE_WINDUP + STRIKE_RECOVERY;
const REVEAL_CONTACT = .94;
const BUILDINGS = [
  { x: -24, z: 10, w: 3.6, d: 2.7 }, { x: -12, z: -9, w: 4.7, d: 3 },
  { x: -7, z: 9, w: 4.8, d: 3.4 }, { x: 0, z: 10.5, w: 4.3, d: 3.4 },
  { x: 32, z: 10.5, w: 4, d: 3.4, refuge: true as const },
];

export const OPENING_STEPS = [
  'arrival', 'market', 'mara', 'rowan', 'cart_test', 'shipment',
  'square', 'yard_gate', 'load_cart', 'far_hold', 'escort', 'refuge', 'complete',
] as const;
export type OpeningStep = typeof OPENING_STEPS[number];
export interface OpeningPoint { x: number; z: number }
export interface OpeningObjective {
  beat: number;
  title: string;
  hint: string;
  target: OpeningPoint;
  action?: string;
}
export interface OpeningLine { speaker: string; text: string; pitch: number }
export interface OpeningEnemySeed extends OpeningPoint { kind: 'slime' | 'sentinel'; scale: number }

export const OPENING_LEADS: Record<CharacterClassId, { hint: string; arrival: string; shipment: string }> = {
  warrior: {
    hint: 'Check the Covenant seal on the guard’s cart at the west gate.',
    arrival: 'That is the Covenant’s seal. They changed the escort order after I signed it.',
    shipment: 'The escort order says to clear the square before you open it.',
  },
  mage: {
    hint: 'Inspect the stalled water pump by the west gate.',
    arrival: 'The record says this pump was serviced. The old fitting hasn’t even been touched.',
    shipment: 'That fitting is cracked. Stop before you break the seal.',
  },
  assassin: {
    hint: 'Check the courier’s manifest at the west gate.',
    arrival: 'He left the missing worker’s name off the manifest. He’s heading for the square.',
    shipment: 'The courier left in a hurry. What was he really delivering?',
  },
};

const OPENING_OBJECTIVES: Record<OpeningStep, OpeningObjective> = {
  arrival: { beat: 1, title: 'Find your lead', hint: '', target: { x: -22, z: 0 }, action: 'Investigate' },
  market: { beat: 1, title: 'Ask the gatekeeper', hint: 'Ask where the royal delivery is headed.', target: { x: -19, z: -1 }, action: 'Ask for directions' },
  mara: { beat: 2, title: 'Meet Mara at the well', hint: 'Follow the road to the well. Mara is settling a dispute over repairs.', target: { x: -13, z: -4 }, action: 'Speak to Mara' },
  rowan: { beat: 3, title: 'Help Rowan with the cart', hint: 'Bring Mara’s replacement pin to the forge yard.', target: CART_START, action: 'Brace the cart' },
  cart_test: { beat: 3, title: 'Test the repaired wheel', hint: 'Walk the cart over the forge threshold toward the red roof.', target: CART_TEST },
  shipment: { beat: 4, title: 'Investigate the shipment', hint: 'Follow the road to the crane in the royal square.', target: { x: 3, z: -8 }, action: 'Approach the shipment' },
  square: { beat: 5, title: 'Reach the stranded civilians', hint: 'Clear the creatures in the square, then rally the group behind the low wall.', target: { x: 8, z: -6 }, action: 'Rally the civilians' },
  yard_gate: { beat: 6, title: 'Open the rear gate', hint: 'Lead the group south toward the work yard. Clear the path and move the wreckage.', target: GATE, action: 'Clear the gate' },
  load_cart: { beat: 6, title: 'Help the injured resident', hint: 'Get the resident onto Rowan’s cart on the shelter lane.', target: LOAD_CART, action: 'Help onto the cart' },
  far_hold: { beat: 7, title: 'Cross the exposed mill road', hint: 'Wait behind the stone wall for the giant’s strike, then move to the far hold point.', target: FAR_HOLD, action: 'Signal the group' },
  escort: { beat: 7, title: 'Walk the group to refuge', hint: 'Follow the road past the bend. Stay close enough for the group to follow.', target: HEARTHMERE_REFUGE },
  refuge: { beat: 8, title: 'Account for the survivors', hint: 'Check in with Mara at the fixed camp.', target: HEARTHMERE_REFUGE, action: 'Speak to Mara' },
  complete: { beat: 8, title: 'A foothold outside Hearthmere', hint: 'The road east leads toward Old Harth Mill.', target: { x: 36, z: 7 } },
};

const ENCOUNTERS: Partial<Record<OpeningStep, readonly OpeningEnemySeed[]>> = {
  square: [{ kind: 'slime', x: 5.5, z: -9, scale: 0.65 }, { kind: 'sentinel', x: 9, z: -8, scale: 0.48 }],
  yard_gate: [{ kind: 'slime', x: 4, z: 2, scale: 0.65 }, { kind: 'slime', x: 7, z: 1, scale: 0.65 }],
  far_hold: [{ kind: 'sentinel', x: 22, z: 5, scale: 0.55 }],
};

export const OPENING_PATH: OpeningPoint[] = [
  HEARTHMERE_WAYSTATION, { x: -13, z: -4 }, CART_START, CART_TEST, HEARTHMERE_COVER,
  { x: 8, z: -6 }, GATE, HOLD, FAR_HOLD, HEARTHMERE_REFUGE, { x: 36, z: 7 },
];

function distance(a: OpeningPoint, b: OpeningPoint): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export class HearthmereOpening {
  readonly group = new THREE.Group();
  private readonly damaged = new THREE.Group();
  private readonly occupied = new THREE.Group();
  private readonly gateWreckage = new THREE.Group();
  private readonly craneBeam: THREE.Group;
  private readonly cart = new THREE.Group();
  private readonly civilians = new THREE.Group();
  private readonly rowan = new HearthmereResident('rowan');
  private readonly mara = new HearthmereResident('mara');
  private readonly guard = new HearthmereResident('guard');
  private readonly evacuees: HearthmereResident[] = [];
  private readonly townsfolk: HearthmereResident[] = [];
  private readonly sceneryResidents: readonly THREE.Object3D[];
  private readonly river: THREE.ShaderMaterial;
  private readonly sceneryCollision: ReturnType<typeof buildHearthmereScenery>;
  private readonly fixtures: GroundMeshCollider;
  private readonly wreckageCollider: GroundMeshCollider;
  readonly setSceneryFocus: ReturnType<typeof buildHearthmereScenery>['setFocus'];
  private readonly wheels: THREE.Group[] = [];
  private readonly giant = new HearthmereGiant();
  private readonly impact = new HearthmereImpact();
  private readonly warning = new THREE.Group();
  private readonly warningFill: THREE.Mesh;
  private readonly marker: THREE.Mesh;
  private readonly safePosition = new THREE.Vector3();
  private strikeTime = 0;
  private revealImpact: number | null = null;
  private lineTime = 0;
  private cartPoint: OpeningPoint = CART_START;
  line: OpeningLine | null = null;

  constructor(readonly role: CharacterClassId, public step: OpeningStep) {
    const stone = new THREE.MeshLambertMaterial({ color: 0x677777 });
    const wood = new THREE.MeshLambertMaterial({ color: 0x614938 });
    const linen = new THREE.MeshLambertMaterial({ color: 0xc1a777 });
    const banners = new THREE.MeshLambertMaterial({ color: 0x98554a });
    const steel = new THREE.MeshLambertMaterial({ color: 0x394655 });
    const ember = new THREE.MeshBasicMaterial({ color: 0xffb764 });
    const violet = new THREE.MeshBasicMaterial({ color: 0xcf7197 });
    const box = (parent: THREE.Group, material: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      mesh.position.set(x, y, z);
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const scenery = buildHearthmereScenery(this.group, BUILDINGS);
    this.sceneryCollision = scenery;
    this.river = scenery.river;
    this.setSceneryFocus = scenery.setFocus;
    box(this.group, ember, 1.1, 0.45, 0.65, -8.5, 0.4, 7.5);
    const well = piece(this.group, loft([[0, 0.84, 0.84], [0.16, 0.89, 0.89], [0.72, 0.79, 0.79], [0.81, 0.84, 0.84]], 10, true),
      stone, -13.3, 0, -6.1);
    well.castShadow = true;
    piece(this.group, new THREE.CircleGeometry(0.65, 14), steel, -13.3, 0.816, -6.1).rotation.x = -Math.PI / 2;
    for (const x of [-14.08, -12.53]) box(this.group, wood, 0.15, 2.15, 0.15, x, 1.02, -6.1).castShadow = true;
    box(this.group, wood, 1.93, 0.16, 0.16, -13.3, 2.08, -6.1).castShadow = true;
    const cranePost = box(this.group, wood, 0.5, 5.6, 0.5, 2.5, 2.8, -11);
    cranePost.castShadow = true;
    const crane = new THREE.Group();
    crane.position.set(4.1, 5.5, -11);
    box(crane, wood, 4.2, 0.45, 0.45, 0, 0, 0).castShadow = true;
    box(crane, steel, 0.22, 0.52, 0.52, 0.56, 0, 0).castShadow = true;
    box(crane, wood, 0.045, 2.35, 0.05, 1.81, -1.22, 0);
    box(crane, steel, 0.18, 0.14, 0.18, 1.81, -2.39, 0);
    this.group.add(crane);
    this.craneBeam = crane;
    const shipment = new THREE.Group();
    shipment.position.set(4.2, 0, -9.7);
    const shipmentCrate = box(shipment, steel, 2, 1.31, 1.4, 0, 0.68, 0);
    shipmentCrate.castShadow = true;
    for (const x of [-0.75, 0.75]) {
      box(shipment, wood, 0.1, 1.35, 1.47, x, 0.68, 0).castShadow = true;
      for (const z of [-0.56, 0.56]) box(shipment, stone, 0.19, 0.16, 0.21, x, 1.38, z);
    }
    box(shipment, violet, 0.082, 0.028, 1.26, 0, 1.35, 0);
    piece(shipment, new THREE.OctahedronGeometry(0.125), violet, 0, 1.47, 0).scale.set(1, 0.43, 1);
    this.group.add(shipment);
    this.fixtures = new GroundMeshCollider([well, cranePost, shipmentCrate]);
    bakePieces(shipment);
    box(this.group, wood, 0.93, 0.95, 0.75, -22.55, 0.47, -0.85);
    if (role === 'mage') {
      box(this.group, steel, 0.24, 1.35, 0.25, -22.55, 0.67, -0.85);
      box(this.group, steel, 0.19, 0.19, 0.81, -22.55, 1.24, -0.58);
    } else {
      box(this.group, role === 'warrior' ? violet : linen, 0.43, 0.04, 0.51, -22.55, 0.96, -0.85);
    }
    const cartBed = new THREE.Group();
    this.cart.add(cartBed);
    box(cartBed, wood, 1.13, 0.13, 1.52, 0, 0.48, 0).castShadow = true;
    for (const x of [-0.52, 0.52]) {
      box(cartBed, wood, 0.093, 0.37, 1.42, x, 0.69, 0).castShadow = true;
      box(cartBed, steel, 0.092, 0.045, 1.46, x, 0.9, 0);
      box(cartBed, wood, 0.09, 0.09, 0.85, x * 0.78, 0.61, 1.06).castShadow = true;
    }
    for (const z of [-0.67, 0.67]) box(cartBed, wood, 1.07, 0.23, 0.082, 0, 0.62, z);
    bakePieces(cartBed);
    for (const x of [-0.62, 0.62]) {
      const wheel = new THREE.Group();
      wheel.position.set(x, 0.38, 0);
      this.cart.add(wheel);
      piece(wheel, new THREE.TorusGeometry(0.334, 0.043, 6, 16), steel).rotation.y = Math.PI / 2;
      for (let i = 0; i < 4; i++) {
        const angle = i * Math.PI / 4;
        const y = Math.cos(angle) * 0.34;
        const z = Math.sin(angle) * 0.34;
        beam(wheel, wood, new THREE.Vector3(0, -y, -z), new THREE.Vector3(0, y, z), 0.046);
      }
      bakePieces(wheel);
      this.wheels.push(wheel);
    }
    this.guard.root.position.set(-18.6, 0, -1.3);
    this.group.add(this.guard.root, this.mara.root, this.rowan.root);
    for (let i = 0; i < 4; i++) {
      const person = new HearthmereResident('resident', i);
      person.root.position.set((i % 2) * 0.72, 0, Math.floor(i / 2) * 0.8);
      this.evacuees.push(person);
      this.civilians.add(person.root);
    }
    for (const [i, [x, z, yaw]] of [[-15.6, -6.8, 0.45], [-10.9, -5.8, -0.8], [-5.2, -5.7, 0.2], [2.1, -8.9, 0.7]].entries()) {
      const person = new HearthmereResident(i === 3 ? 'guard' : 'resident', i);
      person.root.position.set(x, 0, z);
      person.root.rotation.y = yaw;
      this.townsfolk.push(person);
      this.group.add(person.root);
    }
    this.sceneryResidents = [this.mara, this.rowan, this.guard, ...this.townsfolk, ...this.evacuees]
      .map(resident => resident.root);
    const wreckageMeshes: THREE.Mesh[] = [];
    for (let i = 0; i < 5; i++) {
      const x = 10.5 + i * .37;
      const z = -9.3 + i * .66;
      const rubble = piece(this.damaged, new THREE.DodecahedronGeometry(.71, 0),
        stone, x, .13 + i * .057, z);
      rubble.scale.set(1.13, .57 + i * .072, 1.04);
      rubble.rotation.set(.4 + i * .63, i * .76, -.17 + i * .24);
      rubble.castShadow = rubble.receiveShadow = true;
      const fragment = piece(this.damaged, new THREE.IcosahedronGeometry(.23 + (i % 3) * .061, 0),
        stone, x - .57 - i * .077, .075, z + .21);
      fragment.scale.set(1.15, .62, .94);
      fragment.rotation.y = i * .91;
      fragment.receiveShadow = true;
      const fallenTimber = box(this.gateWreckage, wood, 0.42, 0.3, 2.8, 3.4 + i * 0.24, 0.45 - i * 0.08, 5);
      fallenTimber.rotation.y = i * 0.4;
      wreckageMeshes.push(fallenTimber);
    }
    for (const z of [-2, 1, 4]) {
      box(this.occupied, steel, 0.2, 2.4, 0.2, -17, 1.2, z);
      box(this.occupied, banners, 0.12, 0.9, 0.62, -17, 1.83, z + 0.3);
    }
    this.giant.root.position.set(15, 0, -7);
    bakePieces(this.damaged);
    this.wreckageCollider = new GroundMeshCollider(wreckageMeshes);
    bakePieces(this.gateWreckage);
    bakePieces(this.occupied);
    this.warning.position.set((ATTACK_START + ATTACK_END) / 2, 0.06, BRIDGE_Z);
    const edge = new THREE.MeshBasicMaterial({ color: 0xff644d, transparent: true, opacity: 0.8 });
    const fill = new THREE.MeshBasicMaterial({ color: 0xff644d, transparent: true, opacity: 0.38, depthWrite: false });
    for (const side of [-1, 1]) {
      box(this.warning, edge, ATTACK_END - ATTACK_START, .012, .1, 0, 0, side * 2);
      box(this.warning, edge, .1, .012, 4, side * (ATTACK_END - ATTACK_START) / 2, 0, 0);
    }
    this.warningFill = box(this.warning, fill, ATTACK_END - ATTACK_START, .012, 4, 0, .005, 0);
    this.marker = new THREE.Mesh(new THREE.RingGeometry(0.65, 0.82, 24), new THREE.MeshBasicMaterial({
      color: 0xffc97a, side: THREE.DoubleSide,
    }));
    this.marker.rotation.x = -Math.PI / 2;
    this.group.add(this.cart, this.civilians, this.damaged, this.occupied, this.gateWreckage, this.giant.root, this.impact.root, this.warning, this.marker);
    this.refresh();
  }

  get index(): number { return OPENING_STEPS.indexOf(this.step); }
  get crisis(): boolean { return this.index >= OPENING_STEPS.indexOf('square'); }
  get hasParty(): boolean { return this.crisis; }
  get safe(): boolean {
    return !this.crisis || this.step === 'complete' ||
      distance(this.safePosition, HEARTHMERE_WAYSTATION) < 3 || distance(this.safePosition, HEARTHMERE_REFUGE) < 3;
  }
  get seeds(): readonly OpeningEnemySeed[] { return ENCOUNTERS[this.step] ?? []; }
  get crossingHint(): string {
    if (this.step !== 'far_hold' || this.safePosition.x >= ATTACK_END || this.safePosition.x < 8) return '';
    return this.warning.visible ? 'Giant winding up · stay behind cover' : 'Giant recovering · cross now';
  }
  get movingGroup(): OpeningPoint | undefined {
    if (this.step === 'escort') return { x: this.civilians.position.x, z: this.civilians.position.z };
    if (this.step === 'cart_test') return this.cartPoint;
    return undefined;
  }

  restoreMovingGroup(point: OpeningPoint): void {
    if (!this.walkable(point)) return;
    if (this.step === 'escort' && point.x >= HOLD.x && point.x <= HEARTHMERE_REFUGE.x) {
      this.civilians.position.set(point.x, 0, point.z);
      this.mara.root.position.copy(this.civilians.position).add(MARA_ESCORT_OFFSET);
      this.cart.position.copy(this.civilians.position).add(new THREE.Vector3(-0.8, 0, 0));
    } else if (this.step === 'cart_test' && point.x >= CART_START.x && point.x <= CART_TEST.x) {
      this.cartPoint = point;
      this.cart.position.set(point.x, 0, point.z);
    }
  }

  stageReveal(phase: 'seal' | 'impact' | 'response'): void {
    this.giant.root.visible = phase !== 'seal';
    this.damaged.visible = phase === 'response';
    this.craneBeam.rotation.z = this.damaged.visible ? -.58 : 0;
    this.craneBeam.position.y = this.damaged.visible ? 4.55 : 5.5;
    this.revealImpact = phase === 'impact' ? 0 : null;
    this.giant.pose(0, phase === 'impact' ? 0 : undefined);
    this.impact.root.visible = false;
  }

  updateReveal(dt: number): boolean {
    this.river.uniforms.time.value += dt;
    this.impact.update(dt);
    if (this.mara.root.visible) this.mara.update(dt, false);
    if (this.revealImpact === null) return false;
    const before = this.revealImpact;
    this.revealImpact = Math.min(REVEAL_CONTACT + STRIKE_RECOVERY, before + dt);
    this.giant.pose(dt, this.revealImpact / REVEAL_CONTACT, (this.revealImpact - REVEAL_CONTACT) / STRIKE_RECOVERY);
    const hit = before < REVEAL_CONTACT && this.revealImpact >= REVEAL_CONTACT;
    if (hit) {
      this.damaged.visible = true;
      this.impact.release(16.5, BRIDGE_Z);
    }
    const collapse = THREE.MathUtils.smoothstep(this.revealImpact, REVEAL_CONTACT, REVEAL_CONTACT + .31);
    this.craneBeam.rotation.z = -.58 * collapse;
    this.craneBeam.position.y = 5.5 - .95 * collapse;
    return hit;
  }

  resetEncounter(): void {
    this.strikeTime = 0;
    this.line = null;
    this.impact.root.visible = false;
    this.refresh();
  }
  get objective(): OpeningObjective {
    const objective = OPENING_OBJECTIVES[this.step];
    return this.step === 'arrival' ? { ...objective, hint: OPENING_LEADS[this.role].hint } : objective;
  }

  walkable(point: OpeningPoint): boolean {
    if (point.x < -30 || point.x > 37 || point.z < -13.7 || point.z > 13.7) return false;
    if (point.x > ATTACK_START && this.index < OPENING_STEPS.indexOf('far_hold')) return false;
    const { solids, crossing, water } = this.sceneryCollision;
    const clearance = .22;
    if (solids.overlaps(point, clearance) || this.fixtures.overlaps(point, clearance) ||
        (this.gateWreckage.visible && this.wreckageCollider.overlaps(point, clearance))) return false;
    // Allow the narrow seams between boards while the rails provide lateral clearance.
    return !water.overlaps(point) || crossing.overlaps(point, .04);
  }

  placePlayer(position: THREE.Vector3, requested: OpeningPoint): void {
    const fallback = this.step === 'square' ? HEARTHMERE_COVER : this.step === 'yard_gate' ? { x: 2.5, z: 5 }
      : this.crisis ? this.objective.target : HEARTHMERE_WAYSTATION;
    const point = this.walkable(requested) ? requested : this.walkable(fallback) ? fallback : HEARTHMERE_WAYSTATION;
    this.safePosition.set(point.x, 0, point.z);
    position.copy(this.safePosition);
  }

  constrainPlayer(position: THREE.Vector3): void {
    this.constrainMovement(position, this.safePosition.x, this.safePosition.z);
    this.safePosition.copy(position);
  }

  constrainMovement(position: THREE.Vector3, x: number, z: number): void {
    sweepGroundMovement(position, x, z, point => this.walkable(point));
  }

  companionDestination(player: OpeningPoint, formation: THREE.Vector3, role: CharacterClassId, position: OpeningPoint): THREE.Vector3 {
    if (this.step === 'yard_gate' && distance(player, GATE) < 5) {
      if (role === 'warrior') return new THREE.Vector3(3, 0, 2);
      if (role === 'mage') return new THREE.Vector3(5, 0, 6);
    }
    if (this.step === 'far_hold' && role === 'assassin' && distance(player, FAR_HOLD) < 4) {
      return new THREE.Vector3(23, 0, 5.7);
    }
    const destination = this.walkable(formation) ? formation : new THREE.Vector3(player.x, 0, player.z);
    const westApproach = ATTACK_START - .55;
    const eastApproach = ATTACK_END + .55;
    const sideOfBridge = ({ x, z }: OpeningPoint) => {
      const outsideDeck = Math.abs(z - BRIDGE_Z) > 1.8;
      if (x <= (outsideDeck ? ATTACK_START : westApproach)) return -1;
      if (x >= (outsideDeck ? ATTACK_END : eastApproach)) return 1;
      return 0;
    };
    const side = sideOfBridge(position);
    const destinationSide = sideOfBridge(destination);
    if (side === destinationSide) return destination;
    // Enter and leave on the centerline so the formation cannot catch the rail ends.
    if (side !== 0 && Math.abs(position.z - BRIDGE_Z) > .5) {
      return new THREE.Vector3(side < 0 ? westApproach : eastApproach, 0, BRIDGE_Z);
    }
    if (destinationSide !== 0) {
      return new THREE.Vector3(destinationSide < 0 ? westApproach - .7 : eastApproach + .7, 0, BRIDGE_Z);
    }
    return new THREE.Vector3(destination.x, 0, BRIDGE_Z);
  }

  actionAt(player: OpeningPoint, enemies: number): string | undefined {
    const objective = this.objective;
    if (distance(player, objective.target) > 2.5 || (this.seeds.length && enemies > 0)) return undefined;
    return objective.action;
  }

  interact(player: OpeningPoint, enemies: number, name: string): boolean {
    if (!this.actionAt(player, enemies)) return false;
    const lead = OPENING_LEADS[this.role];
    const lines: Partial<Record<OpeningStep, OpeningLine>> = {
      arrival: { speaker: name, text: lead.arrival, pitch: 180 },
      market: { speaker: 'Gatekeeper', text: 'Royal square, past the well. Ask Mara. She knows which roads they still let us use.', pitch: 125 },
      mara: { speaker: 'Mara', text: 'The well cart goes first. Rowan’s at the forge with a bad wheel. Take him this pin, will you?', pitch: 196 },
      rowan: { speaker: 'Rowan', text: 'Hold the axle there. Right. Try it over the step. If it holds there, it holds all the way to the well.', pitch: 232 },
      square: { speaker: 'Mara', text: 'I’m here. Keep them behind you. Rowan’s cart should still be by the rear gate.', pitch: 196 },
      yard_gate: { speaker: 'Mara', text: 'That’s it. Bring the cart through before the road gives.', pitch: 196 },
      load_cart: { speaker: 'Resident', text: 'I can sit up. Get us to the wall and I’ll hold on.', pitch: 152 },
      far_hold: { speaker: 'Mara', text: 'Everyone move. Stay together past the bend.', pitch: 196 },
      refuge: { speaker: 'Mara', text: 'They’ve put troops on every way back in. Rowan’s still out there. A carter saw the soldiers take the mill road.', pitch: 196 },
    };
    this.line = lines[this.step] ?? null;
    this.lineTime = 9;
    this.advance();
    return true;
  }

  private advance(): void {
    const next = OPENING_STEPS[this.index + 1];
    if (!next) return;
    this.step = next;
    this.refresh();
  }

  updateSceneryMotion(dt: number, player: THREE.Object3D, companions: THREE.Object3D[], enemies: THREE.Object3D[]): void {
    this.sceneryCollision.motion.update(dt, player, companions, enemies, this.sceneryResidents);
  }

  update(dt: number, player: OpeningPoint): { changed: boolean; tell: boolean; strike: boolean; hit: boolean } {
    const result = { changed: false, tell: false, strike: false, hit: false };
    this.river.uniforms.time.value += dt;
    this.impact.update(dt);
    const previousCartX = this.cart.position.x;
    const previousCartZ = this.cart.position.z;
    const previousGroupX = this.civilians.position.x;
    const previousGroupZ = this.civilians.position.z;
    for (const resident of [this.mara, this.rowan, this.guard]) {
      if (!resident.root.visible) continue;
      if (resident === this.mara && this.step === 'escort') continue;
      const dx = player.x - resident.root.position.x;
      const dz = player.z - resident.root.position.z;
      if (Math.hypot(dx, dz) < 5.3) {
        const delta = Math.atan2(dx, dz) - resident.root.rotation.y;
        resident.root.rotation.y += Math.atan2(Math.sin(delta), Math.cos(delta)) * (1 - Math.exp(-dt * 7));
      }
      resident.update(dt, false);
    }
    for (const resident of this.townsfolk) if (resident.root.visible) resident.update(dt, false);
    this.lineTime -= dt;
    if (this.lineTime <= 0) this.line = null;
    if (this.step === 'cart_test') {
      if (distance(player, this.cartPoint) < 3.1) {
        const progress = THREE.MathUtils.clamp((player.x - CART_START.x + 0.7) / (CART_TEST.x - CART_START.x), 0, 1);
        this.cartPoint = { x: THREE.MathUtils.lerp(CART_START.x, CART_TEST.x, progress), z: THREE.MathUtils.lerp(CART_START.z, CART_TEST.z, progress) };
        this.cart.position.set(this.cartPoint.x, 0, this.cartPoint.z);
      }
      if (distance(player, CART_TEST) < 1.9 && distance(this.cartPoint, CART_TEST) < 1.6) {
        this.advance();
        result.changed = true;
      }
    }
    if (this.step === 'escort') {
      const crossing = this.civilians.position.x < FAR_HOLD.x - 0.05;
      if (crossing || distance(player, this.civilians.position) < 8) {
        const waypoint = crossing ? FAR_HOLD : HEARTHMERE_REFUGE;
        const goal = new THREE.Vector3(waypoint.x, 0, waypoint.z);
        const travel = goal.sub(this.civilians.position);
        this.civilians.position.addScaledVector(travel, Math.min(1, 4.2 * dt / Math.max(travel.length(), 0.01)));
        this.cart.position.copy(this.civilians.position).add(new THREE.Vector3(-0.8, 0, 0.5));
      }
      if (distance(this.civilians.position, HEARTHMERE_REFUGE) < 0.8 && distance(player, HEARTHMERE_REFUGE) < 3) {
        this.advance();
        result.changed = true;
      }
    }
    if (this.step === 'far_hold' && player.x >= 8) {
      const before = this.strikeTime;
      this.strikeTime += dt;
      const windup = this.strikeTime < STRIKE_WINDUP;
      this.warning.visible = windup;
      this.warningFill.scale.x = Math.max(0.025, Math.min(1, this.strikeTime / STRIKE_WINDUP));
      this.giant.pose(dt, this.strikeTime / STRIKE_WINDUP, (this.strikeTime - STRIKE_WINDUP) / STRIKE_RECOVERY);
      result.tell = before === 0;
      result.strike = before < STRIKE_WINDUP && !windup;
      if (result.strike) this.impact.release(16.5, BRIDGE_Z);
      result.hit = result.strike && player.x > ATTACK_START && player.x < ATTACK_END && Math.abs(player.z - BRIDGE_Z) <= 2;
      if (this.strikeTime >= STRIKE_PERIOD) this.strikeTime = 0;
    } else {
      this.strikeTime = 0;
      this.warning.visible = false;
      if (this.giant.root.visible) this.giant.pose(dt);
    }
    if (this.step === 'far_hold') {
      const target = player.x < HOLD.x ? HOLD : FAR_HOLD;
      this.marker.position.set(target.x, 0.06, target.z);
    }
    const cartX = this.cart.position.x - previousCartX;
    const cartZ = this.cart.position.z - previousCartZ;
    if (!result.changed && Math.hypot(cartX, cartZ) > 0.001) {
      this.cart.rotation.y = Math.atan2(cartX, cartZ);
      this.wheels.forEach(wheel => { wheel.rotation.x -= Math.hypot(cartX, cartZ) / 0.38; });
    }
    const evacX = this.civilians.position.x - previousGroupX;
    const evacZ = this.civilians.position.z - previousGroupZ;
    const walking = !result.changed && Math.hypot(evacX, evacZ) > 0.001;
    if (this.civilians.visible) {
      this.evacuees.forEach(person => {
        if (walking) person.root.rotation.y = Math.atan2(evacX, evacZ);
        person.update(dt, walking);
      });
    }
    if (this.step === 'escort') {
      this.mara.root.position.copy(this.civilians.position).add(MARA_ESCORT_OFFSET);
      if (walking) this.mara.root.rotation.y = Math.atan2(evacX, evacZ);
      this.mara.update(dt, walking);
    }
    return result;
  }

  private refresh(): void {
    const { target } = this.objective;
    this.marker.position.set(target.x, 0.06, target.z);
    this.damaged.visible = this.crisis;
    this.occupied.visible = this.step === 'complete';
    this.gateWreckage.visible = this.step === 'square' || this.step === 'yard_gate';
    this.giant.root.visible = this.crisis && this.index < OPENING_STEPS.indexOf('refuge');
    this.craneBeam.rotation.z = this.crisis ? -0.58 : 0;
    this.craneBeam.position.y = this.crisis ? 4.55 : 5.5;
    this.giant.pose(0);
    this.warning.visible = false;
    this.rowan.root.visible = !this.crisis;
    this.rowan.root.position.set(CART_START.x + 0.8, 0, CART_START.z + 0.6);
    this.mara.root.visible = this.step === 'mara' || this.crisis;
    this.mara.root.position.set(-12.5, 0, -4);
    this.civilians.visible = this.crisis;
    this.townsfolk.forEach(person => { person.root.visible = !this.crisis; });
    const groupPoint = this.step === 'square' ? { x: 8.5, z: -5.3 }
      : this.step === 'yard_gate' ? { x: 3, z: 4 }
      : this.step === 'load_cart' || this.step === 'far_hold' ? HOLD
      : this.step === 'escort' ? HOLD : HEARTHMERE_REFUGE;
    this.civilians.position.set(groupPoint.x, 0, groupPoint.z);
    if (this.crisis) {
      this.mara.root.position.copy(this.civilians.position).add(MARA_ESCORT_OFFSET);
      if (this.step === 'square') this.mara.root.rotation.y = -0.79;
    }
    this.cartPoint = this.index <= OPENING_STEPS.indexOf('cart_test') ? CART_START
      : this.index < OPENING_STEPS.indexOf('load_cart') ? CART_TEST : groupPoint;
    this.cart.position.set(this.cartPoint.x - (this.crisis ? 0.8 : 0), 0, this.cartPoint.z);
  }
}
