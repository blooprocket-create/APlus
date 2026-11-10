import * as THREE from 'three';

export type PlantWindows = readonly (readonly { start: number; end: number }[])[];

interface FootPlant {
  thigh: THREE.Object3D;
  shin: THREE.Object3D;
  foot: THREE.Object3D;
  anchor: THREE.Vector3;
  window: number;
  steering: boolean;
}

export function createFootPlant(foot: THREE.Object3D): FootPlant {
  return { thigh: foot.parent!.parent!, shin: foot.parent!, foot,
    anchor: new THREE.Vector3(), window: -1, steering: false };
}

const inverseHips = new THREE.Matrix4();
const knee = new THREE.Vector3();
const ankle = new THREE.Vector3();
const target = new THREE.Vector3();
const direction = new THREE.Vector3();
const bend = new THREE.Vector3();
const oldDirection = new THREE.Vector3();
const newDirection = new THREE.Vector3();
const shinRotation = new THREE.Quaternion();
const footRotation = new THREE.Quaternion();
const adjustment = new THREE.Quaternion();

/** Repose two links toward a hip-space target, retaining knee plane and boot pitch.
 * Shared by ordinary foot plants and optional visual-proportion retargeting. */
export function solveFootTarget(thigh:THREE.Object3D,shin:THREE.Object3D,foot:THREE.Object3D,desired:THREE.Vector3):void {
  const upperLength=shin.position.length(),lowerLength=foot.position.length();
  shinRotation.copy(thigh.quaternion).multiply(shin.quaternion);footRotation.copy(shinRotation).multiply(foot.quaternion);
  knee.copy(shin.position).applyQuaternion(thigh.quaternion).add(thigh.position);
  ankle.copy(foot.position).applyQuaternion(shinRotation).add(knee);
  direction.copy(desired).sub(thigh.position);const distance=direction.length();if(distance<.001)return;
  direction.multiplyScalar(1/distance);const reach=Math.min(distance,upperLength+lowerLength-.001);
  const along=(upperLength**2-lowerLength**2+reach**2)/(2*reach);
  bend.copy(knee).sub(thigh.position);bend.addScaledVector(direction,-bend.dot(direction));if(bend.lengthSq()<.000001)return;bend.normalize();
  newDirection.copy(direction).multiplyScalar(along).addScaledVector(bend,Math.sqrt(Math.max(0,upperLength**2-along**2)));
  target.copy(direction).multiplyScalar(reach).sub(newDirection);
  oldDirection.copy(ankle).sub(knee).normalize();adjustment.setFromUnitVectors(oldDirection,target.normalize());shinRotation.premultiply(adjustment);
  oldDirection.copy(knee).sub(thigh.position).normalize();adjustment.setFromUnitVectors(oldDirection,newDirection.normalize());thigh.quaternion.premultiply(adjustment);
  shin.quaternion.copy(thigh.quaternion).invert().multiply(shinRotation);foot.quaternion.copy(shinRotation).invert().multiply(footRotation);
}

function solvePlant(plant:FootPlant,hips:THREE.Object3D,weight:number):void {
  const {thigh,shin,foot}=plant;
  shinRotation.copy(thigh.quaternion).multiply(shin.quaternion);
  knee.copy(shin.position).applyQuaternion(thigh.quaternion).add(thigh.position);
  ankle.copy(foot.position).applyQuaternion(shinRotation).add(knee);
  const height=target.copy(ankle).applyMatrix4(hips.matrixWorld).y;
  target.set(plant.anchor.x,height,plant.anchor.z).applyMatrix4(inverseHips);
  target.sub(ankle).clampLength(0,.25).multiplyScalar(weight).add(ankle);
  solveFootTarget(thigh,shin,foot,target);
}

export function applyFootPlants(
  hips: THREE.Object3D,
  feet: readonly FootPlant[],
  windows: PlantWindows | undefined,
  progress: number,
  reset: boolean,
  steering: boolean,
): void {
  if (windows) {
    hips.updateWorldMatrix(true, false);
    inverseHips.copy(hips.matrixWorld).invert();
  }
  for (const [side, plant] of feet.entries()) {
    const window = windows?.[side]?.find(({ start, end }) => progress >= start && progress <= end);
    if (!window) {
      plant.window = -1;
      continue;
    }
    const { start, end } = window;
    if (reset || plant.window !== start) {
      plant.foot.getWorldPosition(plant.anchor);
      plant.window = start;
      plant.steering = false;
    }
    // Keep the anchor when input stops mid-stance. The authored lift releases it.
    plant.steering ||= steering;
    if (!plant.steering) continue;
    const ramp = Math.min(.07, (end - start) * .32);
    const enter = start === 0 ? 1 : THREE.MathUtils.smoothstep(progress, start, start + ramp);
    const exit = 1 - THREE.MathUtils.smoothstep(progress, end - ramp, end);
    if (enter * exit > 0) solvePlant(plant, hips, enter * exit);
  }
}
