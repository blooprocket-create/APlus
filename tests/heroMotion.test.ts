import { describe, expect, it, vi } from 'vitest';
import { BoxGeometry, Group, MathUtils, Mesh, MeshBasicMaterial, Scene, SkinnedMesh, Vector3 } from 'three';
import { CharacterRig, type CharacterAnimationState } from '../src/rendering/CharacterMeshBuilder';
import { VfxSystem } from '../src/rendering/VfxSystem';
import { heroSyllables } from '../src/game/HeroSpeech';
import clips from '../src/data/heroAnimationClips.json';

const BASE: CharacterAnimationState = {
  isMoving: false, moveSpeedRatio: 0, isDashing: false,
  attackComboStep: 0, attackSwingProgress: 0, hitFlashTimer: 0,
};
const ROLES = ['warrior', 'mage', 'assassin'] as const;

describe('Blender-authored hero motion', () => {
  it('plays a speaker’s vowel shape while listeners hold a closed mouth', () => {
    const speaker = new CharacterRig('mage');
    const listener = new CharacterRig('warrior');
    const cues = heroSyllables('Go.');
    expect(cues).toEqual([{ at: 0, mouth: 'SpeakRound' }]);
    const beat = { tone: 'concern' as const, cues, elapsed: .07, gaze: .4 };
    speaker.updateFace(.08, { ...beat, speaking: true });
    listener.updateFace(.08, { ...beat, speaking: false });
    const weight = (rig: CharacterRig, shape: string) => {
      const face = rig.root.getObjectByName('Hero expression controls') as Mesh;
      return face.morphTargetInfluences![face.morphTargetDictionary![shape]];
    };
    expect(weight(speaker, 'SpeakRound')).toBeGreaterThan(.65);
    expect(weight(listener, 'SpeakRound')).toBe(0);
    expect(weight(listener, 'Concern')).toBeGreaterThan(.65);
    speaker.updateFace(.15, { ...beat, elapsed: .5, speaking: true });
    expect(weight(speaker, 'SpeakRound')).toBeLessThan(.05);
  });

  it('freezes a mirage in its departure pose without disposing the hero geometry', () => {
    const scene = new Scene();
    const actor = new Group();
    const body = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
    body.castShadow = true;
    actor.add(body);
    actor.position.x = 2;
    const disposeGeometry = vi.spyOn(body.geometry, 'dispose');
    const vfx = new VfxSystem(scene, {} as HTMLElement);

    vfx.spawnMirageAfterimage(actor, 0x974065);
    actor.position.x = 7;
    const mirage = scene.children[0];
    expect(mirage.children[0].getWorldPosition(new Vector3()).x).toBe(2);
    vfx.clearAll();
    expect(scene.children).toHaveLength(0);
    expect(disposeGeometry).not.toHaveBeenCalled();
  });

  it('bends the coat hem and keeps its shoulder anchor stable as the actor moves', () => {
    const rig = new CharacterRig('warrior', { animate: false });
    const cloth = rig.root.getObjectByName('Weighted coat') as SkinnedMesh;
    const weights = cloth.geometry.getAttribute('skinWeight');
    const positions = cloth.geometry.getAttribute('position');
    const vertices = Array.from({ length: weights.count }, (_, i) => i);
    const anchor = vertices.find(i => weights.getY(i) === 0)!;
    const hem = vertices.find(i => weights.getY(i) === 1)!;
    const sample = (index: number) => cloth.applyBoneTransform(index, new Vector3().fromBufferAttribute(positions, index));

    rig.root.updateMatrixWorld(true);
    const bindAnchor = sample(anchor);
    const bindHem = sample(hem);
    rig.root.position.set(5, 0, -8);
    rig.root.rotation.y = 1.1;
    rig.root.getObjectByName('Coat.Hem')!.rotation.x = 0.5;
    rig.root.updateMatrixWorld(true);
    expect(sample(anchor).distanceTo(bindAnchor)).toBeLessThan(1e-5);
    expect(sample(hem).distanceTo(bindHem)).toBeGreaterThan(0.1);
  });

  it('preserves the sleeve cross-section through a deep elbow bend', () => {
    const rig = new CharacterRig('mage', { animate: false });
    const sleeve = rig.root.getObjectByName('Weighted sleeves and trousers') as SkinnedMesh;
    const points = sleeve.geometry.getAttribute('position');
    const indices = sleeve.geometry.getAttribute('skinIndex');
    const weights = sleeve.geometry.getAttribute('skinWeight');
    const fold = sleeve.skeleton.bones.findIndex(bone => bone.name === 'Elbow.L');
    const ring = Array.from({ length: points.count }, (_, i) => i)
      .filter(i => (indices.getX(i) === fold && weights.getX(i) > .999)
        || (indices.getY(i) === fold && weights.getY(i) > .999));
    expect(ring.length).toBeGreaterThan(4);
    const distanceAcross = () => {
      const a = sleeve.getVertexPosition(ring[0], new Vector3());
      const b = sleeve.getVertexPosition(ring[Math.floor(ring.length / 2)], new Vector3());
      return a.distanceTo(b);
    };
    rig.root.updateMatrixWorld(true);
    const neutral = distanceAcross();
    rig.root.getObjectByName('Forearm.L')!.rotation.x = -1.9;
    rig.updateAnimation(1 / 60, BASE);
    rig.root.updateMatrixWorld(true);
    expect(distanceAcross()).toBeCloseTo(neutral, 4);
    expect(rig.root.getObjectByName('Elbow.L')!.rotation.x).toBeCloseTo(-.95);
  });

  it.each(ROLES)('loads complete and distinct action samples for %s', role => {
    const library = clips.roles[role];
    expect(Object.keys(library)).toHaveLength(11);
    for (const clip of Object.values(library)) {
      expect(clip.seconds).toBeGreaterThan(0);
      const jointCount = clips.joints.length + (role === 'mage' ? clips.castingJoints.length : 0);
      const bytesPerFrame = (3 + 4 * jointCount) * 2;
      const bytes = atob(clip.samples).length;
      expect(bytes % bytesPerFrame).toBe(0);
      expect(bytes / bytesPerFrame).toBeGreaterThan(1);
    }
    const rig = new CharacterRig(role);
    const weapon = rig.root.getObjectByName('Weapon')!;
    rig.updateAnimation(0.1, { ...BASE, attackComboStep: 4, skillSlot: 'skill1', attackSwingProgress: 0.33 });
    const first = weapon.quaternion.clone();
    rig.updateAnimation(0.1, { ...BASE, attackComboStep: 4, skillSlot: 'skill2', attackSwingProgress: 0.33 });
    expect(weapon.quaternion.angleTo(first)).toBeGreaterThan(0.15);
    rig.updateAnimation(0.1, { ...BASE, isDashing: true });
    const evade = rig.root.getObjectByName('Hips')!.quaternion.clone();
    rig.updateAnimation(0.1, { ...BASE, attackComboStep: 5, charging: true, attackSwingProgress: 0.85 });
    expect(rig.root.getObjectByName('Hips')!.quaternion.angleTo(evade)).toBeGreaterThan(0.1);
  });

  it('opens Celestia’s fingertips on the same frame as the spell release', () => {
    const rig = new CharacterRig('mage');
    const hand = rig.root.getObjectByName('Celestia’s casting glove') as SkinnedMesh;
    const index = hand.skeleton.bones.findIndex(bone => bone.name === 'Middle.Tip.L');
    const weights = hand.geometry.getAttribute('skinWeight');
    const indices = hand.geometry.getAttribute('skinIndex');
    const fingertip = Array.from({ length: weights.count }, (_, i) => i)
      .find(i => weights.getY(i) === 1 && indices.getY(i) === index)!;
    const pose = (attackSwingProgress: number) => {
      rig.updateAnimation(.05, { ...BASE, attackComboStep: 1, attackSwingProgress });
      rig.root.updateMatrixWorld(true);
      return hand.getVertexPosition(fingertip, new Vector3());
    };
    const windup = pose(0);
    const open = pose(clips.roles.mage.thrust.release);
    expect(open.y).toBeLessThan(windup.y - .025);
    expect(open.z).toBeLessThan(windup.z - .025);
  });

  it.each([['thrust', 1, 'Foot.R'], ['reverse', 2, 'Foot.L']] as const)(
    'plants the rear foot through Brynhildr’s %s',
    (name, attackComboStep, footName) => {
      const rig = new CharacterRig('warrior');
      const foot = rig.root.getObjectByName(footName)!;
      const clip = clips.roles.warrior[name];
      const sample = (progress: number) => {
        rig.updateAnimation(.06, { ...BASE, attackComboStep, attackSwingProgress: progress });
        rig.root.position.z = clip.advance * MathUtils.smoothstep(progress, clip.release * .20, clip.release);
        return foot.getWorldPosition(new Vector3());
      };
      const anchor = sample(0);
      expect(sample(clip.release * .67).distanceTo(anchor)).toBeLessThan(.045);
      expect(sample(clip.release).distanceTo(anchor)).toBeLessThan(.045);
    },
  );

  it('holds the thrust support foot against lateral steering and releases it for the next step', () => {
    const rig = new CharacterRig('warrior');
    const foot = rig.root.getObjectByName('Foot.R')!;
    const clip = clips.roles.warrior.thrust;
    const sample = (progress: number, drift: number, moving: boolean) => {
      rig.root.position.set(drift, 0, clip.advance * MathUtils.smoothstep(progress, clip.release * .20, clip.release));
      rig.updateAnimation(.03, { ...BASE, attackComboStep: 1, attackSwingProgress: progress,
        isMoving: moving, moveSpeedRatio: moving ? 1 : 0 });
      return foot.getWorldPosition(new Vector3());
    };
    const anchor = sample(0, 0, true);
    const steering = sample(.15, .08, true);
    const stopped = sample(clip.release, .11, false);
    expect(Math.hypot(steering.x - anchor.x, steering.z - anchor.z)).toBeLessThan(.018);
    expect(Math.hypot(stopped.x - anchor.x, stopped.z - anchor.z)).toBeLessThan(.018);
    expect(sample(.65, .21, true).distanceTo(anchor)).toBeGreaterThan(.22);
  });

  it.each(['warrior', 'assassin'] as const)('plays the %s Eclipse turn through its authored rotation', role => {
    const rig = new CharacterRig(role);
    const hips = rig.root.getObjectByName('Hips')!;
    let totalTurn = 0;
    let previous = hips.quaternion.clone();
    for (let frame = 0; frame <= 30; frame++) {
      rig.updateAnimation(1 / 60, { ...BASE, attackComboStep: 5, attackSwingProgress: frame / 30 });
      totalTurn += previous.angleTo(hips.quaternion);
      previous = hips.quaternion.clone();
    }
    expect(totalTurn).toBeGreaterThan(Math.PI * 1.65);
  });
});
