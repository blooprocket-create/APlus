import * as THREE from 'three';
import { buildEnemyMesh } from '../rendering/EnemyMeshBuilder';
import { CharacterClassId } from '../types/game';

type Step = 'road' | 'approach' | 'vault' | 'crate' | 'transfer' | 'stealth' | 'bridge' | 'complete';

export const SLICE_CAMP = new THREE.Vector3(-9, 0, 11);
const VAULT_START = new THREE.Vector3(1.3, 0, -25);
const VAULT_END = new THREE.Vector3(12.6, 0, -25);
const CRATE = new THREE.Vector3(14.1, 0, -25);
const KEY_LANDING = new THREE.Vector3(0.4, 0, -25);
const LEVER = new THREE.Vector3(-1, 0, -34);
const STEALTH_PATH = [new THREE.Vector3(-6.5, 0, -26), new THREE.Vector3(-6.5, 0, -34), LEVER];
const STEALTH_DURATION = 5.5;
const VAULT_DURATION = 0.65;

export const SLICE_UTILITIES: Record<CharacterClassId, string> = {
  warrior: 'Spear vault', mage: 'Transfer item', assassin: 'Veil',
};

export interface SliceActors {
  playerClass: CharacterClassId;
  position(role: CharacterClassId): THREE.Vector3;
  pose(role: CharacterClassId, yaw: number, moving: boolean): void;
}

export class MoatSlice {
  public readonly group = new THREE.Group();
  public step: Step = 'road';
  public stealthTime = 0;
  public message = '';
  private messageTime = 0;
  private vaultTime = 0;
  private guardTime = 0;
  private pathIndex = 0;
  private hasKey = false;
  private returningViaShortcut = false;
  private usedShortcut = false;
  private readonly guard = buildEnemyMesh('sentinel').root;
  private readonly raisedBridge = new THREE.Group();
  private readonly roadGate = new THREE.Group();
  private readonly shortcutGate = new THREE.Group();
  private readonly crate: THREE.Mesh;
  private readonly key: THREE.Mesh;
  private readonly marker: THREE.Mesh;
  private readonly routeLights = new THREE.Group();
  private readonly safePosition = SLICE_CAMP.clone();

  constructor() {
    this.group.name = 'hearthmere-playable-slice';
    const stone = new THREE.MeshStandardMaterial({ color: 0x687888, roughness: 0.92 });
    const grass = new THREE.MeshStandardMaterial({ color: 0x334b47, roughness: 1 });
    const road = new THREE.MeshStandardMaterial({ color: 0x7f7360, roughness: 1 });
    const timber = new THREE.MeshStandardMaterial({ color: 0x59432e, roughness: 0.85 });
    const steel = new THREE.MeshStandardMaterial({ color: 0x637f86, metalness: 0.42 });
    const water = new THREE.MeshStandardMaterial({ color: 0x163b52, emissive: 0x0a1e29, roughness: 0.28 });
    const light = new THREE.MeshBasicMaterial({ color: 0x7be6ec });
    const amber = new THREE.MeshBasicMaterial({ color: 0xffbb65 });
    const box = (w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material, parent: THREE.Object3D = this.group) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      mesh.position.set(x, y, z);
      mesh.receiveShadow = true;
      mesh.castShadow = h > 0.4 && w < 12;
      parent.add(mesh);
      return mesh;
    };
    box(23, 2.2, 56, -8.5, -1.1, -10, grass);
    box(12, 2.2, 56, 17, -1.1, -10, grass);
    box(8, 0.12, 56, 7, -1.12, -10, water);
    box(5.4, 0.04, 34, -8, 0.01, -7, road);
    box(13, 0.04, 4, -2, 0.02, -25, road);
    box(3.4, 0.04, 35, 14.6, 0.02, -8, road);
    box(13, 0.04, 3.6, -2, 0.02, 9, road);
    for (let z = -35; z <= 16; z += 3.2) {
      box(0.7, 0.22, 2.5, 3.15, -0.22, z, stone);
      box(0.7, 0.22, 2.5, 10.85, -0.22, z, stone);
      if (Math.abs(z + 25) > 3 && Math.abs(z - 9) > 3) box(0.1, 0.03, 1.7, 6.4 + Math.sin(z), -1.03, z, steel);
    }
    for (let z = -17; z <= 14; z += 5) {
      box(0.18, 1.55, 0.18, -11.4, 0.77, z, timber);
      box(0.37, 0.33, 0.37, -11.4, 1.55, z, amber);
    }
    const tent = box(3.2, 2.1, 3.5, -14.2, 1.03, 11.5, timber);
    const canvas = new THREE.Mesh(new THREE.ConeGeometry(2.45, 2.15, 4), new THREE.MeshStandardMaterial({ color: 0x9b624b }));
    canvas.rotation.y = Math.PI / 4;
    canvas.position.set(tent.position.x, 2.9, tent.position.z);
    this.group.add(canvas);
    box(0.62, 0.55, 0.62, -12.4, 0.28, 7.8, amber);
    for (let i = 0; i < 12; i++) {
      const east = i % 2 === 0;
      const x = east ? 19 + (i % 3) : -16 - (i % 3);
      const z = -32 + i * 4.2;
      box(0.43, 2.2, 0.43, x, 1.1, z, timber);
      const crown = new THREE.Mesh(new THREE.ConeGeometry(1.45, 3.8, 6), grass);
      crown.position.set(x, 3.12, z);
      crown.castShadow = true;
      this.group.add(crown);
    }
    for (const x of [-4.7, 0.4, 12, 16.5]) {
      box(0.7, 3.1, 0.8, x, 1.55, -23.5, stone);
      box(0.98, 0.3, 1.04, x, 3.12, -23.5, steel);
    }
    for (let x = -19; x < 3; x += 2.1) box(1.8, 0.85, 0.42, x, 0.43, -20, timber, this.roadGate);
    box(0.36, 1.35, 4.05, 2.9, 0.67, 9, timber, this.shortcutGate);
    this.group.add(this.roadGate, this.shortcutGate);
    for (let x = 3.22; x < 11; x += 0.45) box(0.4, 0.22, 3.6, x, -0.1, 9, timber);

    this.raisedBridge.position.set(11, 0, -25);
    for (let x = -7.78; x < 0; x += 0.45) box(0.4, 0.2, 3.7, x, -0.1, 0, timber, this.raisedBridge);
    for (const z of [-1.75, 1.75]) box(8, 0.18, 0.16, -4, 0.33, z, steel, this.raisedBridge);
    this.raisedBridge.rotation.z = -Math.PI * 0.42;
    this.group.add(this.raisedBridge);

    this.crate = box(1.1, 0.92, 1.1, CRATE.x, 0.46, CRATE.z, timber);
    this.crate.rotation.y = 0.18;
    this.key = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.065, 6, 14), amber);
    this.key.visible = false;
    this.group.add(this.key);
    box(0.65, 0.9, 0.65, LEVER.x, 0.45, LEVER.z, stone);
    box(0.15, 0.49, 0.16, LEVER.x, 1, LEVER.z, amber).rotation.z = -0.35;
    for (const p of STEALTH_PATH) box(0.42, 0.07, 0.42, p.x, 0.035, p.z, light, this.routeLights);
    this.routeLights.visible = false;
    this.group.add(this.routeLights);
    this.guard.scale.setScalar(0.8);
    this.guard.position.set(-3, 0, -29.6);
    this.guard.visible = false;
    this.group.add(this.guard);

    this.marker = new THREE.Mesh(new THREE.RingGeometry(0.57, 0.72, 32), new THREE.MeshBasicMaterial({ color: 0xffc269, side: THREE.DoubleSide }));
    this.marker.rotation.x = -Math.PI / 2;
    this.group.add(this.marker);
  }

  public get atCamp(): boolean { return this.safePosition.distanceToSquared(SLICE_CAMP) < 25; }
  public get vaulting(): boolean { return this.vaultTime > 0; }
  public get bridgeOpen(): boolean { return this.step === 'bridge' || this.step === 'complete'; }
  public get inPuzzle(): boolean { return ['vault', 'crate', 'transfer', 'stealth'].includes(this.step); }

  public resetToCamp(): void {
    this.safePosition.copy(SLICE_CAMP);
    this.returningViaShortcut = false;
  }

  public walkable(x: number, z: number): boolean {
    if (x < -19.7 || x > 22.7 || z < -37.7 || z > 17.7) return false;
    if (this.step === 'road' && z < -19.65) return false;
    if (x <= 2.9 || x >= 11.1) return true;
    return this.bridgeOpen && (Math.abs(z - 9) < 1.65 ||
      (Math.abs(z + 25) < 1.68 && this.raisedBridge.rotation.z >= -0.04));
  }

  public constrainPlayer(position: THREE.Vector3): void {
    const dx = position.x - this.safePosition.x;
    const dz = position.z - this.safePosition.z;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.35));
    for (let i = 0; i < steps; i++) {
      const nextX = this.safePosition.x + dx / steps;
      if (this.walkable(nextX, this.safePosition.z)) {
        if (this.bridgeOpen && Math.abs(this.safePosition.z - 9) < 1.65) {
          if (this.safePosition.x >= 11.1 && nextX < 11.1) this.returningViaShortcut = true;
          if (this.returningViaShortcut && nextX <= 2.9) this.usedShortcut = true;
        }
        this.safePosition.x = nextX;
      }
      if (this.walkable(this.safePosition.x, this.safePosition.z + dz / steps)) this.safePosition.z += dz / steps;
    }
    position.copy(this.safePosition);
  }

  public companionRoute(position: THREE.Vector3, desired: THREE.Vector3, player: THREE.Vector3): THREE.Vector3 {
    if (!this.walkable(desired.x, desired.z) || (desired.x > 2.9 && desired.x < 11.1)) desired = player;
    if (!this.bridgeOpen) return this.walkable(desired.x, desired.z) ? desired : position;
    const side = position.x <= 2.9 ? -1 : position.x >= 11.1 ? 1 : 0;
    const goalSide = desired.x <= 2.9 ? -1 : desired.x >= 11.1 ? 1 : 0;
    if (side === goalSide && this.walkable(desired.x, desired.z)) return desired;
    const north = Math.abs(position.z + 25) + Math.abs(desired.z + 25) <= Math.abs(position.z - 9) + Math.abs(desired.z - 9);
    const crossingZ = (goalSide === 0 ? desired.z < -8 : north) ? -25 : 9;
    if (side === 0) {
      const currentZ = position.z < -8 ? -25 : 9;
      if (goalSide === 0 && currentZ === crossingZ) return desired;
      return new THREE.Vector3(goalSide > 0 ? 11.6 : 2.4, 0, currentZ);
    }
    if (Math.abs(position.z - crossingZ) > 0.45) return new THREE.Vector3(side < 0 ? 2.4 : 11.6, 0, crossingZ);
    if (goalSide === 0) return desired;
    return new THREE.Vector3(side < 0 ? 11.6 : 2.4, 0, crossingZ);
  }

  public routeCleared(): void {
    if (this.step !== 'road') return;
    this.step = 'approach';
    this.roadGate.visible = false;
  }

  public startIfNear(player: THREE.Vector3): boolean {
    if (this.step !== 'approach' || player.z > -22 || player.distanceToSquared(VAULT_START) > 70) return false;
    this.step = 'vault';
    return true;
  }

  public useUtility(actors: SliceActors): boolean {
    const role = actors.playerClass;
    const position = actors.position(role);
    if (role === 'warrior' && this.step === 'vault' && !this.vaulting && position.distanceToSquared(VAULT_START) < 4) {
      this.vaultTime = 0.001;
      position.copy(VAULT_START);
      return true;
    }
    if (role === 'mage' && this.step === 'transfer' && position.distanceToSquared(KEY_LANDING) < 13) {
      this.transferKey();
      return true;
    }
    if (role === 'assassin' && this.step === 'stealth' && !this.hasKey && position.distanceToSquared(KEY_LANDING) < 6) {
      this.startStealth();
      return true;
    }
    this.notify(this.objective(role).hint);
    return false;
  }

  public breakCrate(actors: SliceActors): boolean {
    if (actors.playerClass !== 'warrior' || this.step !== 'crate' || actors.position('warrior').distanceToSquared(CRATE) > 6.25) return false;
    this.openCrate();
    return true;
  }

  public canLowerBridge(actors: SliceActors): boolean {
    return actors.playerClass === 'assassin' && this.step === 'stealth' && this.hasKey && actors.position('assassin').distanceToSquared(LEVER) < 3.24;
  }

  public lowerBridge(): void {
    this.step = 'bridge';
    this.stealthTime = 0;
    this.guard.visible = false;
    this.routeLights.visible = false;
    this.shortcutGate.visible = false;
    this.notify('The bridge is down. Cross and take the east bank back to camp.');
  }

  private openCrate(): void {
    this.crate.scale.y = 0.22;
    this.crate.position.y = 0.1;
    this.key.visible = true;
    this.key.position.set(CRATE.x, 0.85, CRATE.z);
    this.step = 'transfer';
  }

  private transferKey(): void {
    this.key.position.set(KEY_LANDING.x, 0.85, KEY_LANDING.z);
    this.step = 'stealth';
    this.guard.visible = true;
    this.routeLights.visible = true;
    this.notify('The key is across. Keep clear of the guard.');
  }

  private startStealth(): void {
    this.hasKey = true;
    this.key.visible = false;
    this.stealthTime = STEALTH_DURATION;
    this.pathIndex = 0;
  }

  private notify(message: string): void { this.message = message; this.messageTime = 3.6; }

  private walk(role: CharacterClassId, target: THREE.Vector3, dt: number, actors: SliceActors): boolean {
    const position = actors.position(role);
    const dx = target.x - position.x, dz = target.z - position.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= 0.12) return true;
    const step = Math.min(distance, 7.1 * dt);
    position.x += dx / distance * step;
    position.z += dz / distance * step;
    actors.pose(role, Math.atan2(dx, dz), true);
    return step >= distance;
  }

  public update(dt: number, actors: SliceActors): void {
    this.messageTime = Math.max(0, this.messageTime - dt);
    if (!this.messageTime) this.message = '';
    this.key.rotation.y += dt * 2;
    if (this.inPuzzle) {
      for (const role of ['warrior', 'mage', 'assassin'] as const) {
        if (role !== actors.playerClass) actors.pose(role, 0, false);
      }
    }
    if (this.step === 'vault') {
      const warrior = actors.position('warrior');
      if (!this.vaulting && actors.playerClass !== 'warrior' && this.walk('warrior', VAULT_START, dt, actors)) this.vaultTime = 0.001;
      if (this.vaulting) {
        this.vaultTime += dt;
        const t = Math.min(1, this.vaultTime / VAULT_DURATION);
        warrior.lerpVectors(VAULT_START, VAULT_END, t);
        warrior.y = Math.sin(Math.PI * t) * 2.2;
        actors.pose('warrior', Math.PI / 2, true);
        if (t >= 1) {
          this.vaultTime = 0;
          warrior.copy(VAULT_END);
          if (actors.playerClass === 'warrior') this.safePosition.copy(warrior);
          this.step = 'crate';
        }
      }
    } else if (this.step === 'crate' && actors.playerClass !== 'warrior') {
      if (this.walk('warrior', CRATE, dt, actors)) this.openCrate();
    } else if (this.step === 'transfer' && actors.playerClass !== 'mage') {
      if (this.walk('mage', KEY_LANDING, dt, actors)) this.transferKey();
    } else if (this.step === 'stealth') {
      this.updateStealth(dt, actors);
    } else if (this.bridgeOpen) {
      this.raisedBridge.rotation.z = Math.min(0, this.raisedBridge.rotation.z + dt * 2.4);
      if (this.step === 'bridge' && this.usedShortcut && this.atCamp) {
        this.step = 'complete';
        this.notify('Loop complete. The crossing stays open for this run.');
      }
    }
    const homeward = this.usedShortcut ? SLICE_CAMP
      : this.safePosition.x > 2.9 ? new THREE.Vector3(11.8, 0, 9) : VAULT_START;
    const target = this.step === 'road' ? new THREE.Vector3(-8, 0, -9)
      : this.step === 'crate' ? CRATE : this.step === 'transfer' || (this.step === 'stealth' && !this.hasKey) ? KEY_LANDING
      : this.step === 'stealth' ? LEVER : this.bridgeOpen ? homeward : VAULT_START;
    this.marker.position.set(target.x, 0.065, target.z);
    this.marker.visible = this.step !== 'complete';
    this.marker.scale.setScalar(1 + 0.14 * Math.sin(performance.now() * 0.004));
  }

  private updateStealth(dt: number, actors: SliceActors): void {
    this.guardTime += dt;
    this.guard.position.x = -2.3 + Math.sin(this.guardTime * 1.5) * 1.8;
    this.stealthTime = Math.max(0, this.stealthTime - dt);
    if (actors.playerClass !== 'assassin') {
      if (!this.hasKey && this.walk('assassin', KEY_LANDING, dt, actors)) this.startStealth();
      else if (this.hasKey && this.walk('assassin', STEALTH_PATH[this.pathIndex], dt, actors)) this.pathIndex++;
    }
    if (!this.hasKey) return;
    const assassin = actors.position('assassin');
    const dx = assassin.x - this.guard.position.x, dz = assassin.z - this.guard.position.z;
    const distance = Math.hypot(dx, dz);
    const visible = distance < 1.15 || (this.stealthTime <= 0 && distance < 6.2 && dz > Math.abs(dx) * 0.6);
    if (visible) {
      assassin.copy(KEY_LANDING);
      if (actors.playerClass === 'assassin') this.safePosition.copy(assassin);
      this.guardTime = 0;
      this.hasKey = false;
      this.stealthTime = 0;
      this.key.visible = true;
      this.notify('Spotted. The key is back at the approach. Try the lit route around the guard.');
      return;
    }
    if (actors.playerClass !== 'assassin' && this.pathIndex === STEALTH_PATH.length) this.lowerBridge();
  }

  public objective(role: CharacterClassId): { title: string; hint: string; step: number } {
    switch (this.step) {
      case 'road': return { title: 'Clear the old road', hint: 'Follow the lanterns north. Read the guardian’s windup and evade the strike.', step: 1 };
      case 'approach': return { title: 'Reach the ruined crossing', hint: 'Follow the road to the raised bridge.', step: 2 };
      case 'vault': return { title: 'Reach the far bank', hint: role === 'warrior' ? 'At the gold ring, use Spear vault [U].' : 'Brynhildr is vaulting to the key container.', step: 2 };
      case 'crate': return { title: 'Expose the key', hint: role === 'warrior' ? 'Approach the container and attack to break it open.' : 'Brynhildr is opening the key container.', step: 2 };
      case 'transfer': return { title: 'Bring the key across', hint: role === 'mage' ? 'At the gold ring, use Transfer item [U].' : 'Celestia is bringing the key to the near bank.', step: 2 };
      case 'stealth': return { title: 'Slip past the guard', hint: role === 'assassin' ? (this.hasKey ? 'Follow the blue lights around the guard. Use the bridge lever [F].' : 'At the key, use Veil [U] to take it and begin your approach.') : 'Akatsuki is taking the key to the bridge lever.', step: 2 };
      case 'bridge': return { title: 'Return to camp', hint: 'Cross the lowered bridge and follow the east bank south to the footbridge.', step: 3 };
      case 'complete': return { title: 'The crossing is open', hint: 'Return to Heroes to try the loop as another class.', step: 3 };
    }
  }
}
