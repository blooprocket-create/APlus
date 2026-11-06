import * as THREE from 'three';

export const MEADOW_ACTORS = 8;
export const RIVER_WAKES = 4;
export const RIVER_CENTER_X = 16;
export const RIVER_WIDTH = 8;

export type ShoreSample = (point: THREE.Vector3) => { x: number; z: number; distance: number } | undefined;

function riverBank(point: THREE.Vector3): ReturnType<ShoreSample> {
  const distance = Math.abs(Math.abs(point.x - RIVER_CENTER_X) - RIVER_WIDTH / 2);
  if (distance > 1.1) return undefined;
  return {
    x: RIVER_CENTER_X + Math.sign(point.x - RIVER_CENTER_X) * (RIVER_WIDTH / 2 - .42),
    z: point.z,
    distance,
  };
}

interface Trace {
  last: THREE.Vector3;
  position: THREE.Vector3;
  stride: number;
  pressure: number;
  radius: number;
  distanceSq: number;
  seen: number;
}

/** Share a bounded set of actor positions with the foliage and water shaders. */
export class SceneryMotion {
  readonly actors = { value: Array.from({ length: MEADOW_ACTORS }, () => new THREE.Vector4()) };
  readonly wakes = { value: Array.from({ length: RIVER_WAKES }, () => new THREE.Vector4(0, 0, 1, 0)) };
  private readonly traces = new Map<THREE.Object3D, Trace>();
  private readonly nearby: Trace[] = [];
  private readonly position = new THREE.Vector3();
  private frame = 0;
  private nextWake = 0;

  constructor(private readonly sampleShore: ShoreSample = riverBank) {}

  update(dt: number, player: THREE.Object3D, companions: readonly THREE.Object3D[],
    enemies: readonly THREE.Object3D[], residents: readonly THREE.Object3D[]): void {
    this.frame++;
    this.nearby.length = 0;
    for (const wake of this.wakes.value) {
      wake.z = Math.min(1, wake.z + dt / .75);
    }
    this.track(player, player.position, dt, 1.05);
    for (const companion of companions) this.track(companion, player.position, dt, .87);
    for (const enemy of enemies) this.track(enemy, player.position, dt, 1.05);
    for (const resident of residents) this.track(resident, player.position, dt, .77);
    for (const [object, trace] of this.traces) {
      if (trace.seen !== this.frame) this.traces.delete(object);
    }
    this.nearby.sort((a, b) => a.distanceSq - b.distanceSq);
    this.actors.value.forEach((actor, index) => {
      const trace = this.nearby[index];
      if (trace) actor.set(trace.position.x, trace.position.z, trace.radius, trace.pressure);
      else actor.set(0, 0, 0, 0);
    });
  }

  private track(object: THREE.Object3D, focus: THREE.Vector3, dt: number, radius: number): void {
    if (!object.visible || object.parent?.visible === false) return;
    const p = object.getWorldPosition(this.position);
    const distanceSq = (p.x - focus.x) ** 2 + (p.z - focus.z) ** 2;
    if (distanceSq > 18 ** 2 || p.y > .6) return;
    let trace = this.traces.get(object);
    if (!trace) {
      trace = { last: p.clone(), position: p.clone(), stride: 0, pressure: .48, distanceSq, radius, seen: 0 };
      this.traces.set(object, trace);
    }
    const travel = Math.hypot(p.x - trace.last.x, p.z - trace.last.z);
    const motion = travel > 2 ? 0 : Math.min(1, travel / Math.max(dt * 6, .001));
    trace.pressure = THREE.MathUtils.lerp(trace.pressure, .46 + motion * .78, 1 - Math.exp(-dt * 12));
    if (travel > 2) trace.position.copy(p);
    else trace.position.lerp(p, 1 - Math.exp(-dt * 17));
    trace.distanceSq = distanceSq;
    trace.seen = this.frame;
    trace.last.copy(p);
    this.nearby.push(trace);

    const bank = motion >= .12 ? this.sampleShore(p) : undefined;
    if (!bank) {
      trace.stride = 0;
      return;
    }
    trace.stride += travel;
    if (trace.stride < .82) return;
    trace.stride %= .82;
    this.wakes.value[this.nextWake].set(bank.x, bank.z, 0, (.36 + motion * .64) * (1 - bank.distance * .62));
    this.nextWake = (this.nextWake + 1) % RIVER_WAKES;
  }
}
