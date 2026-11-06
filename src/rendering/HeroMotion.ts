import * as THREE from 'three';
import type { CharacterClassId } from '../types/game';
import type { CharacterAnimationState } from './CharacterMeshBuilder';
import animation from '../data/heroAnimationClips.json';
import { CASTING_JOINTS } from './HeroHands';
import { applyFootPlants, createFootPlant, type PlantWindows } from './HeroFootPlants';

const JOINTS = [
  'Hips', 'Head', 'Hair', 'Coat', 'Weapon',
  'UpperArm.L', 'UpperArm.R', 'Forearm.L', 'Forearm.R',
  'Thigh.L', 'Thigh.R', 'Shin.L', 'Shin.R',
  'Foot.L', 'Foot.R',
  'Coat.Hem', 'Weapon.L',
] as const;
type ClipName = 'idle' | 'lobby' | 'run' | 'evade' | 'hit' | 'thrust' | 'reverse' | 'sweep' | 'skill1' | 'skill2' | 'charge' | 'eclipse';
type Action = ClipName | 'locomotion';
interface AttackRetreat { distance: number; landAt: number }
interface PackedClip {
  seconds: number; samples: string; release?: number; advance?: number; plants?: PlantWindows; retreat?: AttackRetreat;
  heightScale?: number;
}
interface Clip { seconds: number; samples: Int16Array; frames: number; frameSize: number; heightScale: number }

const PACKED_CLIPS: Record<CharacterClassId, Record<ClipName, PackedClip>> = animation.roles;
const CLIPS: Record<CharacterClassId, Partial<Record<ClipName, Clip>>> = { warrior: {}, mage: {}, assassin: {} };
const QUANTIZATION = 1 / 32767;
const RUN_CADENCE = { warrior: 2.46, mage: 2.62, assassin: 2.92 };
const IDLE_PLAYBACK = { warrior: .52, mage: .46, assassin: .55 };
const EVADE_LENGTH = { warrior: 0.31, mage: 0.27, assassin: 0.31 };
const BASE_HIP_HEIGHT = 0.87;

export interface HeroMotion {
  role: CharacterClassId;
  bones: THREE.Object3D[];
  clock: number;
  stride: number;
  locomotion: number;
  evadeElapsed: number;
  wasDashing: boolean;
  action: Action;
  transition: number;
  fromRotations: THREE.Quaternion[];
  fromPosition: THREE.Vector3;
  primary: THREE.Quaternion;
  secondary: THREE.Quaternion;
  next: THREE.Quaternion;
  hipsOffset: THREE.Vector3;
  blendOffset: THREE.Vector3;
  feet?: readonly ReturnType<typeof createFootPlant>[];
}

export function createHeroMotion(role: CharacterClassId, root: THREE.Group): HeroMotion {
  if (animation.joints.some((joint, i) => joint !== JOINTS[i]) || animation.joints.length !== JOINTS.length) {
    throw new Error('The Blender clip joint order does not match the game rig.');
  }
  const jointNames = role === 'mage' ? [...JOINTS, ...CASTING_JOINTS] : JOINTS;
  if (role === 'mage' && (animation.castingJoints.length !== CASTING_JOINTS.length
    || animation.castingJoints.some((joint, i) => joint !== CASTING_JOINTS[i]))) {
    throw new Error('The Blender finger joint order does not match Celestia’s casting hand.');
  }
  const bones = jointNames.map(name => {
    const bone = root.getObjectByName(name);
    if (!bone) throw new Error(`Missing animation joint ${name} on ${role}`);
    return bone;
  });
  return {
    role, bones, clock: 0, stride: 0, locomotion: 0, evadeElapsed: Number.POSITIVE_INFINITY, wasDashing: false,
    action: 'locomotion', transition: 1,
    fromRotations: bones.map(() => new THREE.Quaternion()), fromPosition: new THREE.Vector3(),
    primary: new THREE.Quaternion(), secondary: new THREE.Quaternion(), next: new THREE.Quaternion(),
    hipsOffset: new THREE.Vector3(), blendOffset: new THREE.Vector3(),
    feet: role !== 'mage' ? ['Foot.L', 'Foot.R'].map(name => createFootPlant(root.getObjectByName(name)!)) : undefined,
  };
}

function getClip(role: CharacterClassId, name: ClipName): Clip {
  const cached = CLIPS[role][name];
  if (cached) return cached;
  const packed = PACKED_CLIPS[role][name];
  const binary = atob(packed.samples);
  const samples = new Int16Array(binary.length / 2);
  for (let index = 0; index < samples.length; index++) {
    samples[index] = binary.charCodeAt(index * 2) | binary.charCodeAt(index * 2 + 1) << 8;
  }
  const frameSize = 3 + 4 * (JOINTS.length + (role === 'mage' ? CASTING_JOINTS.length : 0));
  const clip = { seconds: packed.seconds, samples, frames: samples.length / frameSize, frameSize,
    heightScale: packed.heightScale ?? 1 };
  CLIPS[role][name] = clip;
  return clip;
}

interface Sample { data: Int16Array; before: number; after: number; mix: number }

function clipSample(clip: Clip, normalized: number): Sample {
  const frame = THREE.MathUtils.clamp(normalized, 0, 1) * (clip.frames - 1);
  const index = Math.floor(frame);
  return { data: clip.samples, before: index * clip.frameSize,
    after: Math.min(index + 1, clip.frames - 1) * clip.frameSize, mix: frame - index };
}

function readRotation(data: Int16Array, offset: number, target: THREE.Quaternion): THREE.Quaternion {
  return target.set(data[offset] * QUANTIZATION, data[offset + 1] * QUANTIZATION,
    data[offset + 2] * QUANTIZATION, data[offset + 3] * QUANTIZATION).normalize();
}

function sampleRotation(sample: Sample, joint: number, target: THREE.Quaternion, next: THREE.Quaternion): void {
  const offset = 3 + joint * 4;
  readRotation(sample.data, sample.before + offset, target);
  if (sample.mix > 0) target.slerp(readRotation(sample.data, sample.after + offset, next), sample.mix);
}

function sampleOffset(sample: Sample, target: THREE.Vector3, heightScale: number): void {
  const { data, before, after, mix } = sample;
  target.set(
    THREE.MathUtils.lerp(data[before], data[after], mix) * QUANTIZATION,
    THREE.MathUtils.lerp(data[before + 1], data[after + 1], mix) * QUANTIZATION * heightScale + BASE_HIP_HEIGHT,
    THREE.MathUtils.lerp(data[before + 2], data[after + 2], mix) * QUANTIZATION,
  );
}

function strikeClip(state: CharacterAnimationState): ClipName | null {
  switch (state.attackComboStep) {
    case 1: return 'thrust';
    case 2: return 'reverse';
    case 3: return 'sweep';
    case 4: return state.skillSlot ?? 'skill1';
    case 5: return 'eclipse';
    default: return null;
  }
}

export function heroReleaseProgress(role: CharacterClassId, state: CharacterAnimationState): number {
  const clip = strikeClip(state);
  const release = clip && PACKED_CLIPS[role][clip].release;
  if (typeof release !== 'number') throw new Error(`Missing release marker for ${role} ${clip}`);
  return release;
}

export function heroAttackAdvance(role: CharacterClassId, state: CharacterAnimationState): number {
  const clip = strikeClip(state);
  return clip ? PACKED_CLIPS[role][clip].advance ?? 0 : 0;
}

export function heroAttackRetreat(role: CharacterClassId, state: CharacterAnimationState): AttackRetreat | undefined {
  const clip = strikeClip(state);
  return clip ? PACKED_CLIPS[role][clip].retreat : undefined;
}

export function animateHero(rig: HeroMotion, dt: number, state: CharacterAnimationState): void {
  const { bones, role } = rig;
  rig.clock += dt;
  rig.locomotion = THREE.MathUtils.lerp(rig.locomotion, state.isMoving ? Math.max(0.28, state.moveSpeedRatio) : 0,
    1 - Math.exp(-dt * 15));
  rig.stride = (rig.stride + dt * RUN_CADENCE[role] * (0.5 + rig.locomotion * 0.5)) % 1;
  if (state.isDashing && !rig.wasDashing) rig.evadeElapsed = 0;
  rig.wasDashing = state.isDashing;

  const combat = state.charging ? 'charge' : strikeClip(state);
  if (combat && !state.isDashing) rig.evadeElapsed = Number.POSITIVE_INFINITY;
  const action: Action = (state.isDashing || rig.evadeElapsed < EVADE_LENGTH[role]) ? 'evade'
    : combat ?? (state.hitFlashTimer > 0 ? 'hit' : state.lobbyPhase === undefined ? 'locomotion' : 'lobby');

  const actionChanged = action !== rig.action;
  if (actionChanged) {
    bones.forEach((bone, index) => rig.fromRotations[index].copy(bone.quaternion));
    rig.fromPosition.copy(bones[0].position);
    rig.action = action;
    rig.transition = 0;
  }
  const blendDuration = action === 'locomotion' ? 0.095 : action === 'charge' ? 0.062 : 0.023;
  rig.transition = Math.min(1, rig.transition + dt / blendDuration);
  const transition = THREE.MathUtils.smoothstep(rig.transition, 0, 1);
  const clip = getClip(role, action === 'locomotion' ? 'idle' : action);
  const time = action === 'lobby' || action === 'locomotion'
    ? (rig.clock * IDLE_PLAYBACK[role] / clip.seconds + (state.lobbyPhase ?? 0)) % 1
    : action === 'evade' ? rig.evadeElapsed / EVADE_LENGTH[role]
    : action === 'hit' ? 1 - state.hitFlashTimer / 0.22
    : state.attackSwingProgress;
  const sample = clipSample(clip, time);
  const run = action === 'locomotion' && rig.locomotion > 0.003 ? clipSample(getClip(role, 'run'), rig.stride) : null;

  bones.forEach((bone, joint) => {
    sampleRotation(sample, joint, rig.primary, rig.next);
    if (run) {
      sampleRotation(run, joint, rig.secondary, rig.next);
      rig.primary.slerp(rig.secondary, rig.locomotion);
    }
    if (transition < 1) bone.quaternion.copy(rig.fromRotations[joint]).slerp(rig.primary, transition);
    else bone.quaternion.copy(rig.primary);
  });
  sampleOffset(sample, rig.hipsOffset, clip.heightScale);
  if (run) {
    sampleOffset(run, rig.blendOffset, 1);
    rig.hipsOffset.lerp(rig.blendOffset, rig.locomotion);
  }
  if (transition < 1) bones[0].position.copy(rig.fromPosition).lerp(rig.hipsOffset, transition);
  else bones[0].position.copy(rig.hipsOffset);
  if (rig.feet) applyFootPlants(bones[0], rig.feet,
    action === 'locomotion' ? undefined : PACKED_CLIPS[role][action].plants, time, actionChanged, state.isMoving);
  rig.evadeElapsed += dt;
}
