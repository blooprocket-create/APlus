import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {AtelierWeaponTrail} from '../src/rendering/AtelierWeaponTrail';

describe('instrument motion exposure',()=>{
  it('follows the real joint in world space and freezes with the shared pause owner',()=>{
    const scene=new THREE.Scene(),actor=new THREE.Group(),instrument=new THREE.Object3D(),artRoot=new THREE.Group();
    actor.position.set(9,2,-7);actor.add(instrument);scene.add(actor,artRoot);artRoot.position.set(-3,0,4);
    const texture=new THREE.Texture(),trail=new AtelierWeaponTrail(instrument,texture);artRoot.add(trail.mesh);
    trail.update(0,.05,true);expect(trail.mesh.visible).toBe(false);
    instrument.rotation.y=.4;trail.update(.05,.05,true);expect(trail.mesh.visible).toBe(true);
    const position=trail.mesh.geometry.getAttribute('position');
    const tip=new THREE.Vector3().fromBufferAttribute(position,3);trail.mesh.localToWorld(tip);
    const expected=new THREE.Vector3(.01,0,1.59);instrument.localToWorld(expected);
    expect(tip.distanceTo(expected)).toBeLessThan(.00001);
    const frozen=Array.from(position.array);instrument.rotation.y=.7;trail.update(.05,0,true);
    expect(Array.from(position.array)).toEqual(frozen);
    trail.update(.31,.05,false);expect(trail.mesh.visible).toBe(false);expect(trail.mesh.geometry.drawRange.count).toBe(0);
    trail.dispose();texture.dispose();
  });

  it('does not draw stationary energy or bridge an actor teleport',()=>{
    const instrument=new THREE.Object3D(),texture=new THREE.Texture(),trail=new AtelierWeaponTrail(instrument,texture);
    for(let i=0;i<5;i++)trail.update(i*.02,.02,true);
    expect(trail.mesh.visible).toBe(false);
    instrument.rotation.x=.5;trail.update(.10,.02,true);expect(trail.mesh.visible).toBe(true);
    instrument.position.x=10;trail.update(.12,.02,true);
    expect(trail.mesh.visible).toBe(false);expect(trail.mesh.geometry.drawRange.count).toBe(0);
    trail.dispose();texture.dispose();
  });
});
