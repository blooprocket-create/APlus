import * as THREE from 'three';

/** Four-joint, damped presentation follower for the original hair asset.
 * Reads actor travel/yaw, never writes actor position or combat state.
 * The canonical Hair joint still supplies authored performance motion.
 */
export class AtelierSecondaryMotion {
  private readonly joints:THREE.Bone[]=[];
  private readonly angles=new Float64Array(4);
  private readonly velocity=new Float64Array(4);
  private readonly lastPosition=new THREE.Vector3();
  private lastYaw:number;
  constructor(private actor:THREE.Object3D,canonicalHair:THREE.Object3D,art:THREE.Group|THREE.SkinnedMesh){
    this.lastPosition.copy(actor.position);this.lastYaw=actor.rotation.y;
    for(let i=0;i<4;i++){
      const bone=new THREE.Bone();bone.name='atelier_hair_follow_'+i;
      if(i){bone.position.set(0,-.21,-.055);this.joints[i-1].add(bone);}else canonicalHair.add(bone);
      this.joints.push(bone);
    }
    canonicalHair.updateWorldMatrix(true,true);
    const skeleton=new THREE.Skeleton(this.joints);
    if(art instanceof THREE.SkinnedMesh){
      // Extend a reviewed whole-body skin instead of discarding its weights.
      // Only its existing Hair influence is distributed down the follower.
      const old=art.skeleton,hairIndex=old.bones.indexOf(canonicalHair as THREE.Bone);
      if(hairIndex<0)throw Error('Weighted hair has no canonical Hair joint');
      const p=art.geometry.getAttribute('position'),indices=art.geometry.getAttribute('skinIndex'),weights=art.geometry.getAttribute('skinWeight');
      const toHair=new THREE.Matrix4().copy(canonicalHair.matrixWorld).invert().multiply(art.bindMatrix),point=new THREE.Vector3();
      for(let i=0;i<p.count;i++){
        const pairs=Array.from({length:4},(_,c)=>({index:indices.getComponent(i,c),weight:weights.getComponent(i,c)}));
        const influence=pairs.find(pair=>pair.index===hairIndex&&pair.weight>.20);if(!influence)continue;
        point.fromBufferAttribute(p,i).applyMatrix4(toHair);const along=THREE.MathUtils.clamp(-point.y/.21,0,2.999),a=Math.floor(along),f=along-a;
        const combined=pairs.filter(pair=>pair!==influence);combined.push({index:old.bones.length+a,weight:influence.weight*(1-f)},{index:old.bones.length+a+1,weight:influence.weight*f});
        combined.sort((a,b)=>b.weight-a.weight);const top=combined.slice(0,4),sum=top.reduce((s,p)=>s+p.weight,0);
        for(let c=0;c<4;c++){indices.setComponent(i,c,top[c].index);weights.setComponent(i,c,top[c].weight/sum);}
      }
      const extended=new THREE.Skeleton([...old.bones,...this.joints],[...old.boneInverses,...skeleton.boneInverses]);
      art.bind(extended,art.bindMatrix);indices.needsUpdate=true;weights.needsUpdate=true;old.dispose();skeleton.dispose();return;
    }
    for(const source of [...art.children]){
      if(!(source instanceof THREE.Mesh))continue;
      source.updateMatrix();const geometry=source.geometry.clone().applyMatrix4(source.matrix);
      const p=geometry.getAttribute('position'),indices=new Uint16Array(p.count*4),weights=new Float32Array(p.count*4);
      for(let i=0;i<p.count;i++){
        const along=THREE.MathUtils.clamp(-p.getY(i)/.21,0,2.999),a=Math.floor(along),f=along-a;
        indices[i*4]=a;indices[i*4+1]=a+1;weights[i*4]=1-f;weights[i*4+1]=f;
      }
      geometry.setAttribute('skinIndex',new THREE.BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new THREE.BufferAttribute(weights,4));
      const mesh=new THREE.SkinnedMesh(geometry,source.material);mesh.castShadow=true;mesh.frustumCulled=false;
      source.removeFromParent();source.geometry.dispose();art.add(mesh);mesh.updateWorldMatrix(true,false);mesh.bind(skeleton,mesh.matrixWorld);
    }
  }
  update(dt:number,time:number):void{
    if(dt<=0)return;
    const speed=Math.min(8,this.actor.position.distanceTo(this.lastPosition)/dt);
    const delta=this.actor.rotation.y-this.lastYaw,turn=Math.atan2(Math.sin(delta),Math.cos(delta))/dt;
    this.lastPosition.copy(this.actor.position);this.lastYaw=this.actor.rotation.y;
    for(let i=0;i<4;i++){
      const wind=Math.sin(time*1.7-i*.65)*.025+Math.sin(time*.64+i)*.015;
      const target=wind+Math.min(.09,speed*.012)-THREE.MathUtils.clamp(turn*.018,-.12,.12);
      const stiffness=42-i*5,damping=10-i*.8;
      this.velocity[i]+=(target-this.angles[i])*stiffness*dt-this.velocity[i]*damping*dt;
      this.angles[i]=THREE.MathUtils.clamp(this.angles[i]+this.velocity[i]*dt,-.19,.19);
      this.joints[i].rotation.x=this.angles[i];
      this.joints[i].rotation.z=Math.sin(time*1.35-i*.6)*.018;
    }
  }
  dispose():void{this.joints[0]?.removeFromParent();}
}
