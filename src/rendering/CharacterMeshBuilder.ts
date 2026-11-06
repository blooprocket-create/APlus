import * as THREE from 'three';
import { type CharacterClassId } from '../types/game';
import { CHARACTER_CLASSES } from '../data/classes';
import { createIllustratedCelMaterial, createSilhouetteInk, inkMesh } from './AnimeMaterials';
import { bakePieces, hairLock, loft, panel, piece, smoothLoft } from './ArtMesh';
import { animateHero, createHeroMotion, type HeroMotion } from './HeroMotion';
import { forgeBrynhildrWardrobe } from './BrynhildrWardrobe';
import { tailorCelestiaWardrobe } from './CelestiaWardrobe';
import { tailorAkatsukiWardrobe } from './AkatsukiWardrobe';
import { heroSkin, HeroFace, type FacePerformance } from './HeroFace';
import { createHeroUnderlayer, type HeroLimb } from './HeroUnderlayer';
import { buildCastingHand, buildClosedGrip } from './HeroHands';

export interface CharacterAnimationState {
  lobbyPhase?: number;
  isMoving: boolean;
  moveSpeedRatio: number;
  attackComboStep: number;
  attackSwingProgress: number;
  isDashing: boolean;
  hitFlashTimer: number;
  charging?: boolean;
  skillSlot?: 'skill1' | 'skill2';
}

const WARDROBE: Record<CharacterClassId, { textile: number; trim: number; hair: number; skin: number }> = {
  warrior: { textile: 0x9c3437, trim: 0xe4b56a, hair: 0xefc37a, skin: 0xf2b992 },
  mage: { textile: 0x303c61, trim: 0xc0d8e7, hair: 0xc8dff4, skin: 0xf1c1aa },
  assassin: { textile: 0x493147, trim: 0xd89491, hair: 0x3e314e, skin: 0xdca382 },
};

function joint(parent: THREE.Object3D, x = 0, y = 0, z = 0): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  parent.add(group);
  return group;
}

function skinCoat(art: THREE.Group, coat: THREE.Bone, hem: THREE.Bone): void {
  coat.updateWorldMatrix(true, true);
  const skeleton = new THREE.Skeleton([coat, hem]);
  for (const mesh of [...art.children]) {
    if (!(mesh instanceof THREE.Mesh)) continue;
    const geometry = mesh.geometry;
    const positions = geometry.getAttribute('position');
    const indices = new Uint16Array(positions.count * 4);
    const weights = new Float32Array(positions.count * 4);
    for (let vertex = 0; vertex < positions.count; vertex++) {
      const bend = THREE.MathUtils.smoothstep(-positions.getY(vertex), .17, .63);
      const i = vertex * 4;
      indices[i + 1] = 1;
      weights[i] = 1 - bend;
      weights[i + 1] = bend;
    }
    geometry.setAttribute('skinIndex', new THREE.BufferAttribute(indices, 4));
    geometry.setAttribute('skinWeight', new THREE.BufferAttribute(weights, 4));
    const cloth = new THREE.SkinnedMesh(geometry, mesh.material);
    cloth.name = 'Weighted coat';
    cloth.castShadow = mesh.castShadow;
    cloth.receiveShadow = mesh.receiveShadow;
    // The folded hem can travel outside the bind-pose bounds.
    cloth.frustumCulled = false;
    art.remove(mesh);
    art.add(cloth);
    cloth.updateWorldMatrix(true, false);
    cloth.bind(skeleton, cloth.matrixWorld);
  }
}

export class CharacterRig {
  readonly root = new THREE.Group();
  readonly classId: CharacterClassId;
  private readonly motion: HeroMotion | null;
  private readonly armor: THREE.MeshToonMaterial;
  private readonly auraRing: THREE.Mesh;
  private readonly spearTip: THREE.Object3D | null;
  private readonly spearButt: THREE.Object3D | null;
  private readonly spellEmitters: readonly [THREE.Object3D, THREE.Object3D] | null;
  private readonly bladeEmitters: readonly [THREE.Object3D, THREE.Object3D] | null;
  private readonly face: HeroFace;
  private readonly followers: readonly { bone: THREE.Bone; source: THREE.Bone; amount: number }[];

  constructor(classId: CharacterClassId, { animate = true } = {}) {
    this.classId = classId;
    this.root.name = `character_${classId}`;
    const palette = WARDROBE[classId];
    const accent = CHARACTER_CLASSES[classId].primaryColorHex;
    const toon = (color: number) => createIllustratedCelMaterial({ color });
    const cloth = toon(palette.textile);
    this.armor = createIllustratedCelMaterial({ color: 0xffffff, emissive: 0xa94c43, emissiveIntensity: 0 });
    this.armor.vertexColors = true;
    const trim = toon(palette.trim);
    const leather = toon(0x32272d);
    const hair = toon(palette.hair);
    const skin = toon(palette.skin);
    const hairLight = toon(new THREE.Color(palette.hair).lerp(new THREE.Color(0xfff3ec), 0.22).getHex());
    const silhouetteInk = createSilhouetteInk(0.0115);
    const faceInk = classId === 'mage' ? createSilhouetteInk(.0048, 0x35354f) : createSilhouetteInk(.0078);
    const light = new THREE.MeshBasicMaterial({ color: accent });
    const warrior = classId === 'warrior';
    const mage = classId === 'mage';
    const forge = warrior ? forgeBrynhildrWardrobe(toon) : null;
    const tailor = mage ? tailorCelestiaWardrobe(toon) : null;
    const shade = classId === 'assassin' ? tailorAkatsukiWardrobe(toon) : null;
    const shoulder = warrior ? .297 : mage ? .252 : .234;
    const parts: THREE.Group[] = [];
    const limbs: HeroLimb[] = [];
    const followers: { bone: THREE.Bone; source: THREE.Bone; amount: number }[] = [];
    const makePart = (name: string, parent: THREE.Object3D, x = 0, y = 0, z = 0) => {
      const node = new THREE.Bone();
      node.position.set(x, y, z);
      node.name = name;
      parent.add(node);
      const art = joint(node);
      parts.push(art);
      return { node, art };
    };
    const hinge = (name: string, parent: THREE.Bone, counterpart: THREE.Bone): THREE.Bone => {
      const fold = new THREE.Bone();
      fold.name = name;
      fold.position.copy(counterpart.position);
      parent.add(fold);
      followers.push({ bone: fold, source: counterpart, amount: .5 });
      return fold;
    };

    const torso = makePart('Hips', this.root, 0, 0.87);
    if (forge) {
      piece(torso.art, smoothLoft([[-0.12, 0.19, 0.13], [0.01, 0.215, 0.132], [0.17, 0.161, 0.117],
        [0.33, shoulder, 0.155, 0.015], [0.47, shoulder - 0.02, 0.135], [0.52, 0.11, 0.095]], 14), cloth);
      piece(torso.art, loft([[-0.045, 0.217, 0.141], [0.035, 0.215, 0.14]], 14), leather);
      piece(torso.art, panel([[-0.068, 0], [0, 0.066], [0.068, 0], [0, -0.045]], 0.024), trim, 0, 0.008, 0.14);
      piece(torso.art, loft([[0.50, 0.115, 0.094], [0.60, 0.093, 0.085]], 12), leather);
    }
    if (forge) {
      forge.cuirass(torso.art);
    } else if (tailor) {
      tailor.bodice(torso.art, light);
    } else shade?.jacket(torso.art);
    piece(torso.art, loft([[0.55, 0.07, 0.066], [0.67, 0.072, 0.067]], 10), skin);

    const head = makePart('Head', torso.node, 0, 0.744);
    head.node.scale.setScalar(warrior ? .93 : mage ? .96 : .94);
    piece(head.art, heroSkin(classId), skin);
    if (!mage) {
      piece(head.art, smoothLoft([[0.018, 0.146, 0.14, -0.026], [0.089, 0.165, 0.146, -0.017],
        [0.151, 0.158, 0.138, -0.02], [0.204, 0.111, 0.103, -0.019], [0.228, 0.036, 0.04, -0.023]], 24), hair);
    }
    for (const side of [-1, 1]) {
      piece(head.art, smoothLoft([[-0.047, 0.018, 0.015], [-0.019, 0.029, 0.027], [0.035, 0.025, 0.024]], 12),
        skin, side * 0.149, 0, -0.006);
      if (!mage) {
        piece(head.art, hairLock([[side * 0.121, 0.148, 0.076], [side * 0.153, 0.068, 0.104],
          [side * 0.147, -0.036, 0.107], [side * 0.111, -0.13, 0.131]], 0.046, 0.028), hair);
      }
    }
    if (shade) {
      piece(head.art, hairLock([[-.11,.207,.049],[-.043,.187,.133],[.058,.119,.160],[.116,.045,.130]],
        .063,.031), hair);
      piece(head.art, hairLock([[-.117,.193,.039],[-.039,.189,.117],[.037,.139,.155],[.094,.092,.157]],
        .035,.022), hairLight);
      piece(head.art, hairLock([[-.092,.181,.083],[-.130,.122,.125],[-.149,.043,.124],[-.142,-.068,.115]],
        .046,.029), hair);
      piece(head.art, panel([[-.034,-.004],[-.028,.009],[.036,.013],[.040,-.003]],.008),
        trim,-.123,.103,.146).rotation.z = -.60;
    } else if (forge) {
      piece(head.art, hairLock([[-0.101, 0.182, 0.098], [-0.056, 0.145, 0.147], [0.017, 0.112, 0.16], [0.052, 0.051, 0.151]], 0.067, 0.029), hair);
      piece(head.art, hairLock([[-0.062, 0.196, 0.093], [0.005, 0.171, 0.145], [0.077, 0.13, 0.154], [0.12, 0.071, 0.116]], 0.054, 0.023), hairLight);
      piece(head.art, hairLock([[-0.081, 0.168, 0.102], [-0.103, 0.133, 0.145], [-0.113, 0.081, 0.143], [-0.128, 0.039, 0.115]], 0.047, 0.022), hair);
    }
    const hairTail = makePart('Hair', head.node, 0, 0.09, -0.108);
    if (forge) {
      forge.circlet(head.art);
    } else if (tailor) {
      tailor.hair(head.art, hairTail.art);
      tailor.jewelry(head.art, light);
    } else shade?.mask(head.art);
    if (!mage) {
      const length = warrior ? .47 : .32;
      piece(hairTail.art, hairLock([[0, .038, -.016], [-.026, -length * .22, -.095],
        [-.012, -length * .64, -.137], [.018, -length, -.23]], .074, .061), hair);
      piece(hairTail.art, hairLock([[.043, .012, -.031], [.068, -length * .26, -.111],
        [.064, -length * .59, -.142], [.025, -length * .92, -.213]], .033, .035), hairLight);
    }
    if (forge) {
      // A broad sweep over the ear breaks the shared head silhouette in close shots.
      piece(head.art, hairLock([[.037,.192,.02],[.119,.157,.067],[.157,.080,.087],[.142,-.061,.103]],
        .053,.032), hairLight);
      piece(hairTail.art, loft([[-.34,.041,.036,-.188,-.022],[-.316,.047,.038,-.177,-.027]], 12), trim);
    }

    const coat = makePart('Coat', torso.node, 0, warrior ? .418 : .04, -.133);
    const hem = makePart('Coat.Hem', coat.node, 0, -.37);
    if (forge) {
      forge.mantle(coat.art);
    } else if (tailor) {
      tailor.coatTails(coat.art);
    } else shade?.sash(coat.art);

    const arms = [-1, 1].map(side => {
      const suffix = side < 0 ? 'L' : 'R';
      const upper = makePart(`UpperArm.${suffix}`, torso.node, side * shoulder, 0.418);
      const plate = makePart(`ShoulderPlate.${suffix}`, torso.node, side * shoulder, .418);
      const follow = { warrior: .78, mage: .83, assassin: .87 }[classId];
      followers.push({ bone: plate.node, source: upper.node, amount: follow });
      if (forge) forge.pauldron(plate.art, side);
      else if (tailor) tailor.shoulder(plate.art, side);
      else shade?.shoulder(plate.art, side);
      const lower = makePart(`Forearm.${suffix}`, upper.node, 0, -0.292);
      const fold = hinge(`Elbow.${suffix}`, upper.node, lower.node);
      limbs.push({ upper: upper.node, lower: lower.node, fold });
      if (forge) forge.vambrace(lower.art, side);
      else if (tailor) tailor.sleeve(lower.art);
      else shade?.bracer(lower.art);
      return { upper, lower };
    });

    [-1, 1].forEach(side => {
      const suffix = side < 0 ? 'L' : 'R';
      const upper = makePart(`Thigh.${suffix}`, torso.node, side * 0.105, -0.068);
      const lower = makePart(`Shin.${suffix}`, upper.node, 0, -0.37);
      if (forge) piece(lower.art, loft([[-0.388, 0.058, 0.057], [-0.275, 0.065, 0.068],
        [-0.145, 0.088, 0.085], [0.026, 0.068, 0.072]], 10), leather);
      if (forge) forge.greave(lower.art);
      const foot = makePart(`Foot.${suffix}`, lower.node, 0, -0.37);
      const fold = hinge(`Knee.${suffix}`, upper.node, lower.node);
      limbs.push({ upper: upper.node, lower: lower.node, fold, foot: foot.node });
      if (forge) forge.boot(foot.art);
      else if (tailor) tailor.boots(lower.art, foot.art);
      else shade?.boots(lower.art, foot.art);
    });

    const weapon = makePart('Weapon', arms[1].lower.node, 0, -0.29, 0.018);
    const offhand = makePart('Weapon.L', arms[0].lower.node, 0, -.29, .018);
    const weaponBody = weapon.art;
    this.spearTip = forge ? joint(weaponBody, 0, 0, 1.89) : null;
    this.spearButt = forge ? joint(weaponBody, 0, 0, -.61) : null;
    this.spellEmitters = tailor ? [joint(offhand.art, 0, -.106, .036), joint(weaponBody, 0, 0, 1.15)] : null;
    this.bladeEmitters = shade ? [joint(offhand.art, 0, 0, .18), joint(weaponBody, 0, 0, .18)] : null;
    if (forge) {
      forge.spear(weaponBody, light);
      forge.shield(arms[0].lower.art, light);
      buildClosedGrip(weaponBody, classId, 1, .036, toon);
      buildClosedGrip(offhand.art, classId, -1, .026, toon);
    } else if (tailor) {
      tailor.staff(weaponBody, light);
      buildClosedGrip(weaponBody, classId, 1, .032, toon);
    } else if (shade) {
      shade.blade(weaponBody, 1);
      shade.blade(offhand.art, -1);
      buildClosedGrip(weaponBody, classId, 1, .022, toon);
      buildClosedGrip(offhand.art, classId, -1, .022, toon);
    }

    for (const art of parts) {
      art.traverse(object => { if (object instanceof THREE.Mesh) object.castShadow = true; });
      bakePieces(art, this.armor);
      if (art === coat.art) skinCoat(art, coat.node, hem.node);
      for (const mesh of art.children) {
        if (mesh instanceof THREE.Mesh && mesh.material === this.armor) {
          inkMesh(mesh, art === head.art || art === hairTail.art ? faceInk : silhouetteInk);
        }
      }
    }
    this.followers = followers;
    inkMesh(createHeroUnderlayer(this.root, torso.art, torso.node, limbs, classId, this.armor), silhouetteInk);
    if (tailor) inkMesh(buildCastingHand(this.root, offhand.art, offhand.node, this.armor), createSilhouetteInk(.003));
    this.face = new HeroFace(classId, this.armor);
    head.art.add(this.face.mesh);
    const ring = new THREE.RingGeometry(0.54, 0.605, 40);
    ring.rotateX(-Math.PI / 2);
    this.auraRing = piece(this.root, ring, new THREE.MeshBasicMaterial({
      color: accent, transparent: true, opacity: 0.64, depthWrite: false,
    }), 0, 0.035);
    this.motion = animate ? createHeroMotion(classId, this.root) : null;
    this.updateAnimation(1 / 30, { isMoving: false, moveSpeedRatio: 0, attackComboStep: 0,
      attackSwingProgress: 0, isDashing: false, hitFlashTimer: 0 });
  }

  public updateAnimation(dt: number, state: CharacterAnimationState): void {
    if (this.motion) animateHero(this.motion, dt, state);
    for (const { bone, source, amount } of this.followers) bone.quaternion.identity().slerp(source.quaternion, amount);
    if (this.motion) this.face.update(dt, Math.min(1, state.hitFlashTimer / .13),
      state.charging ? .75 : state.attackComboStep > 0 ? 1 : 0);
    this.armor.emissiveIntensity = state.hitFlashTimer > 0 ? Math.min(0.72, state.hitFlashTimer * 4) : 0;
    this.auraRing.scale.setScalar(state.isDashing ? 0.85 : 1);
  }

  public updateFace(dt: number, performance: FacePerformance): void {
    this.face.update(dt, 0, 0, performance);
  }

  public getSpearTip(): THREE.Vector3 | undefined {
    return this.spearTip?.getWorldPosition(new THREE.Vector3());
  }

  public getSpearButt(): THREE.Vector3 | undefined {
    return this.spearButt?.getWorldPosition(new THREE.Vector3());
  }

  public getSpellEmitter(fromStaff: boolean): THREE.Vector3 | undefined {
    return this.spellEmitters?.[fromStaff ? 1 : 0].getWorldPosition(new THREE.Vector3());
  }

  public getBladeEmitter(side: -1 | 1): THREE.Vector3 | undefined {
    return this.bladeEmitters?.[side === -1 ? 0 : 1].getWorldPosition(new THREE.Vector3());
  }
}
