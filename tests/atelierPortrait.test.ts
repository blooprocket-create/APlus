import {describe,it,expect} from 'vitest';
import surfaceData from '../public/art/observatory/portrait.json';
import * as THREE from 'three';
import {AtelierPortrait,type PortraitSurface} from '../src/rendering/AtelierPortrait';
import {AtelierSecondaryMotion} from '../src/rendering/AtelierSecondaryMotion';

const surface:PortraitSurface={...surfaceData,bounds:surfaceData.bounds as [number,number,number,number]};
describe('Atelier art fitting contract',()=>{
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
});
