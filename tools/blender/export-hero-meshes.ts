import { writeFileSync } from 'node:fs';
import * as THREE from 'three';
import { CharacterRig } from '../../src/rendering/CharacterMeshBuilder';
import { CASTING_JOINTS } from '../../src/rendering/HeroHands';

const output = process.env.ASTRAL_HERO_MESH_DUMP;
if (!output) throw new Error('Set ASTRAL_HERO_MESH_DUMP to the destination JSON path.');

const jointNames = [
  'Hips', 'Head', 'Hair', 'Coat', 'Weapon',
  'UpperArm.L', 'UpperArm.R', 'Forearm.L', 'Forearm.R',
  'Thigh.L', 'Thigh.R', 'Shin.L', 'Shin.R',
  'Foot.L', 'Foot.R',
  'Coat.Hem', 'Weapon.L',
  'Elbow.L', 'Elbow.R', 'Knee.L', 'Knee.R',
  'ShoulderPlate.L', 'ShoulderPlate.R',
];
const vertex = new THREE.Vector3();
const normalMatrix = new THREE.Matrix3();
const worldLinear = new THREE.Matrix3();

const heroes = (['warrior', 'mage', 'assassin'] as const).map(role => {
  const { root } = new CharacterRig(role, { animate: false });
  const names = role === 'mage' ? [...jointNames, ...CASTING_JOINTS] : jointNames;
  const joints = names.map(name => {
    const joint = root.getObjectByName(name);
    if (!joint) throw new Error(`Missing ${role} joint ${name}`);
    joint.rotation.set(0, 0, 0);
    if (name === 'Hips') joint.position.set(0, 0.87, 0);
    return joint;
  });
  root.updateMatrixWorld(true);
  return {
    role,
    bones: joints.map(joint => {
      const parent = joint.parent && joints.includes(joint.parent) ? joint.parent.name : null;
      const meshes = joint.children.filter(child => !joints.includes(child)).flatMap(art =>
        art.children.filter(child => child instanceof THREE.Mesh).map(mesh => {
          const material = mesh.material as THREE.MeshBasicMaterial;
          const { geometry } = mesh;
          const attributes = geometry.getAttribute('position');
          const sourceNormals = geometry.getAttribute('normal');
          const vertexColors = geometry.getAttribute('color');
          const skinIndices = geometry.getAttribute('skinIndex');
          const skinWeights = geometry.getAttribute('skinWeight');
          const skin = mesh instanceof THREE.SkinnedMesh
            ? { bones: mesh.skeleton.bones.map(bone => bone.name), weights: [] as number[] }
            : undefined;
          const positions: number[] = [];
          const normals: number[] = [];
          const colors: number[] = [];
          normalMatrix.getNormalMatrix(mesh.matrixWorld);
          for (let i = 0; i < attributes.count; i++) {
            vertex.fromBufferAttribute(attributes, i).applyMatrix4(mesh.matrixWorld);
            positions.push(vertex.x, vertex.y, vertex.z);
            vertex.fromBufferAttribute(sourceNormals, i).applyNormalMatrix(normalMatrix);
            normals.push(vertex.x, vertex.y, vertex.z);
            const { r, g, b } = material.color;
            colors.push(vertexColors?.getX(i) ?? r, vertexColors?.getY(i) ?? g, vertexColors?.getZ(i) ?? b);
            if (skin) {
              // The weighted hero meshes use at most two joints per vertex.
              skin.weights.push(skinIndices.getX(i), skinWeights.getX(i), skinIndices.getY(i), skinWeights.getY(i));
            }
          }
          const indices = geometry.index ? Array.from(geometry.index.array) : null;
          worldLinear.setFromMatrix4(mesh.matrixWorld);
          const morphs = geometry.morphAttributes.position?.map(attribute => {
            const deltas: number[] = [];
            for (let i = 0; i < attribute.count; i++) {
              vertex.fromBufferAttribute(attribute, i).applyMatrix3(worldLinear);
              deltas.push(vertex.x, vertex.y, vertex.z);
            }
            return { name: attribute.name, deltas };
          });
          return { positions, normals, colors, indices, skin, morphs };
        })
      );
      return { name: joint.name, parent, head: joint.getWorldPosition(vertex).toArray(), meshes };
    }),
  };
});

writeFileSync(output, JSON.stringify(heroes));
