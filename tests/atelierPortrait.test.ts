import {describe,it,expect} from 'vitest';
import surfaceData from '../public/art/observatory/portrait.json';
import * as THREE from 'three';
import {AtelierPortrait,type PortraitSurface} from '../src/rendering/AtelierPortrait';
import {CharacterRig,type CharacterAnimationState} from '../src/rendering/CharacterMeshBuilder';
import {heroReleaseProgress} from '../src/rendering/HeroMotion';
import ability from '../src/data/observatoryAbility.json';
import {AtelierSecondaryMotion} from '../src/rendering/AtelierSecondaryMotion';

const surface:PortraitSurface={...surfaceData,bounds:surfaceData.bounds as [number,number,number,number]};
describe('Atelier art fitting contract',()=>{
  it('keeps the optional performance damage marker aligned and leaves normal mage motion unchanged',()=>{
    const state:CharacterAnimationState={isMoving:false,moveSpeedRatio:0,isDashing:false,hitFlashTimer:0,attackComboStep:4,attackSwingProgress:ability.clip.release,skillSlot:'skill1'};
    const normal=heroReleaseProgress('mage',state),stage=heroReleaseProgress('mage',{...state,motionProfile:'observatory'});
    expect(stage).toBeCloseTo(28/48,5);expect(normal).not.toBe(stage);
    const original=new CharacterRig('mage'),atelier=new CharacterRig('mage');
    original.root.position.set(3,0,9);atelier.root.position.copy(original.root.position);
    original.updateAnimation(.05,state);atelier.updateAnimation(.05,{...state,motionProfile:'observatory'});
    expect(atelier.root.position.equals(original.root.position)).toBe(true);
    expect(atelier.root.getObjectByName('UpperArm.L')!.quaternion.angleTo(original.root.getObjectByName('UpperArm.L')!.quaternion)).toBeGreaterThan(.1);
    atelier.root.traverse(o=>expect([o.quaternion.x,o.quaternion.y,o.quaternion.z,o.quaternion.w].every(Number.isFinite)).toBe(true));
  });
  it('retargets new visual leg proportions to the existing foot path and restores the default rest pose',()=>{
    const original=new CharacterRig('mage'),fitted=new CharacterRig('mage');
    const restore=fitted.fitVisualRestPose({Hips:[0,1.05,0],'Thigh.L':[-.11,-.05,0],'Thigh.R':[.11,-.05,0],'Shin.L':[0,-.50,0],'Shin.R':[0,-.50,0],'Foot.L':[0,-.43,0],'Foot.R':[0,-.43,0]});
    for(const progress of [.12,.38,.59,.86]){
      const state:CharacterAnimationState={isMoving:false,moveSpeedRatio:0,isDashing:false,hitFlashTimer:0,attackComboStep:4,attackSwingProgress:progress,skillSlot:'skill1',motionProfile:'observatory'};
      original.updateAnimation(.05,state);fitted.updateAnimation(.05,state);original.root.updateMatrixWorld(true);fitted.root.updateMatrixWorld(true);
      for(const side of ['L','R']){const a=original.root.getObjectByName('Foot.'+side)!.getWorldPosition(new THREE.Vector3()),b=fitted.root.getObjectByName('Foot.'+side)!.getWorldPosition(new THREE.Vector3());expect(Math.abs(a.y+.008-b.y)).toBeLessThan(.025);expect(Math.abs(a.z-b.z)).toBeLessThan(.035);}
      expect(fitted.root.position.length()).toBe(0);
    }
    restore();expect(fitted.root.getObjectByName('Shin.L')!.position.y).toBe(-.37);
  });
  it('keeps every sculpt-fitted expression finite through blink, focus and speech extremes',()=>{
    const driver=new THREE.Mesh();driver.morphTargetDictionary={Blink:0,Focus:1,Concern:2,Gaze:3,SpeakOpen:4,SpeakWide:5,SpeakRound:6};driver.morphTargetInfluences=[1,.8,.2,.5,.7,.3,.4];
    const portrait=new AtelierPortrait(surface,driver);portrait.update();let count=0;
    portrait.root.traverse(o=>{if(!(o instanceof THREE.Mesh))return;count++;
      for(const name of ['Blink','Focus','SpeakOpen'])expect(o.morphTargetInfluences![o.morphTargetDictionary![name]]).toBe(driver.morphTargetInfluences![driver.morphTargetDictionary![name]]);
      for(const attr of [o.geometry.getAttribute('position'),...o.geometry.morphAttributes.position])expect(Array.from(attr.array).every(Number.isFinite)).toBe(true);
    });expect(count).toBeGreaterThan(10);
    driver.morphTargetInfluences.fill(0);portrait.update();portrait.root.traverse(o=>{if(o instanceof THREE.Mesh)expect(o.morphTargetInfluences?.every(v=>v===0)).toBe(true);});
  });
  it('fits secondary hair weights without changing authoritative actor transforms and freezes when paused',()=>{
    const actor=new THREE.Group(),hair=new THREE.Bone(),art=new THREE.Group();actor.add(hair);hair.add(art);
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([-.02,-.05,0,.02,-.30,-.05,0,-.72,-.2],3));
    art.add(new THREE.Mesh(geometry,new THREE.MeshStandardMaterial()));
    const follower=new AtelierSecondaryMotion(actor,hair,art);const mesh=art.children[0] as THREE.SkinnedMesh;
    expect(mesh.isSkinnedMesh).toBe(true);const weights=mesh.geometry.getAttribute('skinWeight');
    for(let i=0;i<weights.count;i++)expect(weights.getX(i)+weights.getY(i)+weights.getZ(i)+weights.getW(i)).toBeCloseTo(1);
    for(let i=0;i<60;i++){actor.position.z=i*.05;actor.rotation.y=i*.01;const position=actor.position.clone(),rotation=actor.quaternion.clone();follower.update(1/60,i/60);expect(actor.position.equals(position)).toBe(true);expect(actor.quaternion.equals(rotation)).toBe(true);}
    const before=mesh.skeleton.bones.map(b=>b.quaternion.clone());follower.update(0,99);
    expect(mesh.skeleton.bones.every((b,i)=>b.quaternion.equals(before[i]))).toBe(true);
    expect(mesh.skeleton.bones.every(b=>Math.abs(b.rotation.x)<=.19)).toBe(true);follower.dispose();
  });
  it('extends the reviewed body skin with hair followers while preserving torso binding',()=>{
    const actor=new THREE.Group(),hips=new THREE.Bone(),hair=new THREE.Bone();hips.position.y=.9;hair.position.y=.9;actor.add(hips);hips.add(hair);actor.updateMatrixWorld(true);
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,.8,0,0,1.25,-.16],3));geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute([0,0,0,0,1,0,0,0],4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute([1,0,0,0,1,0,0,0],4));
    const mesh=new THREE.SkinnedMesh(geometry,new THREE.MeshStandardMaterial());actor.add(mesh);mesh.updateWorldMatrix(true,false);mesh.bind(new THREE.Skeleton([hips,hair]),mesh.matrixWorld);
    const body=new THREE.Vector3(),tip=new THREE.Vector3();mesh.skeleton.update();mesh.getVertexPosition(0,body);mesh.getVertexPosition(1,tip);
    const follower=new AtelierSecondaryMotion(actor,hair,mesh);for(let i=0;i<60;i++)follower.update(1/60,i/60);actor.updateMatrixWorld(true);mesh.skeleton.update();
    expect(mesh.getVertexPosition(0,new THREE.Vector3()).distanceTo(body)).toBeLessThan(.00001);expect(mesh.getVertexPosition(1,new THREE.Vector3()).distanceTo(tip)).toBeGreaterThan(.003);
    const weights=geometry.getAttribute('skinWeight');expect(weights.getX(1)+weights.getY(1)+weights.getZ(1)+weights.getW(1)).toBeCloseTo(1);expect(actor.position.length()).toBe(0);follower.dispose();
  });
});
