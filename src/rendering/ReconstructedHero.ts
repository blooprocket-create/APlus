import * as THREE from 'three';
import type {CharacterRig} from './CharacterMeshBuilder';
import {disposeObject} from './SceneResources';
import {AtelierSecondaryMotion} from './AtelierSecondaryMotion';

export interface ReconstructedHeroFit {
  schemaVersion:number;
  restOffsets:Record<string,[number,number,number]>;
  bindQuaternions:Record<string,[number,number,number,number]>;
  sourceProjection:number[];
  face:{eyeL:[number,number,number];eyeR:[number,number,number]};
}
/** Original reconstructed art, rebound to the existing canonical joint objects.
 * No actor transform, simulation, input, save or independent animation owner. */
export class ReconstructedHero {
  private readonly meshes:THREE.SkinnedMesh[]=[];
  private readonly textures=new Set<THREE.Texture>();
  private readonly hairFollowers:AtelierSecondaryMotion[]=[];
  private readonly weapon=new THREE.Group();
  private readonly visibility=new Map<THREE.Object3D,boolean>();
  private readonly materials=new Map<THREE.Mesh,THREE.Material|THREE.Material[]>();
  private readonly restore:()=>void;
  private readonly headScale:THREE.Vector3;
  private readonly driver:THREE.Mesh;
  private readonly blink={value:0};private readonly gaze={value:0};
  constructor(private hero:CharacterRig,scene:THREE.Group,fit:ReconstructedHeroFit,couture:THREE.Group,
    private sourcePaint:THREE.Texture,paint:(mesh:THREE.Mesh)=>void){
    if(fit.schemaVersion!==1)throw Error('Unsupported visual rig fit');
    const canonical=new Map<string,THREE.Object3D>();hero.root.traverse(o=>{if(o instanceof THREE.Bone)canonical.set(o.name.replaceAll('.',''),o);});
    const skins:THREE.SkinnedMesh[]=[];scene.traverse(o=>{if(o instanceof THREE.SkinnedMesh)skins.push(o);});
    if(!skins.length)throw Error('Reconstructed hero has no weighted surfaces');
    for(const source of skins)for(const b of source.skeleton.bones)if(!canonical.has(b.name.replaceAll('.','')))throw Error('Unknown reconstructed joint '+b.name);
    if(!couture.children.some(o=>o.name==='attach__Weapon'))throw Error('Missing original crescent instrument');
    this.driver=hero.root.getObjectByName('Hero expression controls') as THREE.Mesh;
    // Keep the canonical casting hand and player marker; hide replaced artwork.
    hero.root.traverse(o=>{if(!(o instanceof THREE.Mesh))return;
      if(o.name==='Celestia’s casting glove'||o.parent===hero.root)return;
      this.visibility.set(o,o.visible);o.visible=false;
    });
    const head=hero.root.getObjectByName('Head')!;this.headScale=head.scale.clone();head.scale.setScalar(1);
    this.restore=hero.fitVisualRestPose(fit.restOffsets);
    const rotations=new Map<THREE.Object3D,THREE.Quaternion>();
    canonical.forEach(b=>{rotations.set(b,b.quaternion.clone());b.quaternion.identity();});
    for(const [name,q] of Object.entries(fit.bindQuaternions)){const bone=hero.root.getObjectByName(name);if(!bone)throw Error('Missing bind joint '+name);bone.quaternion.fromArray(q);}
    hero.root.updateMatrixWorld(true);scene.updateMatrixWorld(true);
    const sources:THREE.SkinnedMesh[]=[];scene.traverse(o=>{if(o instanceof THREE.SkinnedMesh)sources.push(o);});
    if(!sources.length)throw Error('Reconstructed hero has no weighted surfaces');
    for(const source of sources){
      const bones=source.skeleton.bones.map(b=>{const bone=canonical.get(b.name.replaceAll('.',''));if(!bone)throw Error('Unknown reconstructed skin joint '+b.name);return bone as THREE.Bone;});
      const oldSkeleton=source.skeleton;
      // Exported mesh objects are identity transforms; bake any handoff transform.
      const transform=source.matrixWorld.clone();source.geometry.applyMatrix4(transform);
      const linear=new THREE.Matrix3().setFromMatrix4(transform);
      for(const attr of source.geometry.morphAttributes.position??[])for(let i=0;i<attr.count;i++){
        const p=new THREE.Vector3().fromBufferAttribute(attr,i).applyMatrix3(linear);attr.setXYZ(i,p.x,p.y,p.z);
      }
      source.removeFromParent();source.position.set(0,0,0);source.quaternion.identity();source.scale.setScalar(1);hero.root.add(source);source.updateWorldMatrix(true,false);
      const skeleton=new THREE.Skeleton(bones);source.bind(skeleton,source.matrixWorld);oldSkeleton.dispose();
      source.frustumCulled=false;source.castShadow=true;source.receiveShadow=true;paint(source);
      for(const value of Object.values(source.material))if(value instanceof THREE.Texture)this.textures.add(value);
      this.decorateFace(source.material as THREE.MeshStandardMaterial,fit);this.meshes.push(source);
      const hair=hero.root.getObjectByName('Hair') as THREE.Bone,hairIndex=source.skeleton.bones.indexOf(hair);
      const skinIndices=source.geometry.getAttribute('skinIndex'),skinWeights=source.geometry.getAttribute('skinWeight');
      let weightedHair=false;
      if(hairIndex>=0)for(let i=0;i<skinIndices.count&&!weightedHair;i++)for(let c=0;c<4;c++)if(skinIndices.getComponent(i,c)===hairIndex&&skinWeights.getComponent(i,c)>.20){weightedHair=true;break;}
      if(weightedHair)this.hairFollowers.push(new AtelierSecondaryMotion(hero.root,hair,source));
    }
    rotations.forEach((q,b)=>b.quaternion.copy(q));hero.root.updateMatrixWorld(true);
    const anchor=couture.children.find(o=>o.name==='attach__Weapon');
    if(!anchor)throw Error('Missing original crescent instrument');
    for(const child of [...anchor.children])this.weapon.add(child);hero.root.getObjectByName('Weapon')!.add(this.weapon);
    this.weapon.traverse(o=>{if(o instanceof THREE.Mesh){o.material=(o.material as THREE.MeshStandardMaterial).clone();o.castShadow=true;paint(o);}});
    const hand=hero.root.getObjectByName('Celestia’s casting glove') as THREE.SkinnedMesh;
    if(hand){this.materials.set(hand,hand.material);hand.material=new THREE.MeshStandardMaterial({name:'Couture • leather',color:0x26333b,roughness:.65});paint(hand);}
    // All remaining imported rig objects are offscreen carriers, not another rig.
    disposeObject(scene);disposeObject(couture);
  }
  private decorateFace(material:THREE.MeshStandardMaterial,fit:ReconstructedHeroFit):void{
    const previous=material.onBeforeCompile,oldKey=material.customProgramCacheKey();
    const projection=new THREE.Matrix4().fromArray(fit.sourceProjection);
    const left=new THREE.Vector3(...fit.face.eyeL).applyMatrix4(projection),right=new THREE.Vector3(...fit.face.eyeR).applyMatrix4(projection);
    const gazeScale=THREE.MathUtils.clamp(left.distanceTo(right)*.05,.001,.02);
    material.onBeforeCompile=(shader,renderer)=>{
      previous(shader,renderer);shader.uniforms.heroBlink=this.blink;shader.uniforms.heroGaze=this.gaze;
      shader.uniforms.heroSource={value:this.sourcePaint};shader.uniforms.heroProjection={value:new THREE.Matrix4().fromArray(fit.sourceProjection)};
      shader.uniforms.heroEyeL={value:new THREE.Vector3(...fit.face.eyeL)};shader.uniforms.heroEyeR={value:new THREE.Vector3(...fit.face.eyeR)};
      shader.uniforms.heroGazeScale={value:gazeScale};
      shader.uniforms.heroSkin={value:new THREE.Color(0xe0b39d)};
      shader.vertexShader='varying vec3 heroRest;varying vec2 heroPaintUv;uniform mat4 heroProjection;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        heroRest=position;vec4 paintPoint=heroProjection*vec4(position,1.);heroPaintUv=paintPoint.xy/paintPoint.w;`);
      shader.fragmentShader='varying vec3 heroRest;varying vec2 heroPaintUv;uniform sampler2D heroSource;uniform float heroBlink;uniform float heroGaze;uniform float heroGazeScale;uniform vec3 heroEyeL;uniform vec3 heroEyeR;uniform vec3 heroSkin;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        for(int eye=0;eye<2;eye++){
          vec3 center=eye==0?heroEyeL:heroEyeR;vec2 p=heroRest.xy-center.xy;
          float mask=exp(-pow(p.x/.038,4.)-pow(p.y/.017,4.))*smoothstep(center.z-.040,center.z-.005,heroRest.z);
          vec3 gazePaint=texture2D(heroSource,heroPaintUv+vec2(heroGaze*heroGazeScale,0.)).rgb;
          diffuseColor.rgb=mix(diffuseColor.rgb,gazePaint,mask*(1.-heroBlink));
          diffuseColor.rgb=mix(diffuseColor.rgb,heroSkin,mask*heroBlink);
          float lash=exp(-pow((p.y-abs(p.x)*.10)/.0018,2.))*(1.-smoothstep(.020,.037,abs(p.x)));
          diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.025,.018,.032),lash*mask*heroBlink*.9);
        }`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
        for(int eye=0;eye<2;eye++){
          vec3 center=eye==0?heroEyeL:heroEyeR;vec2 p=heroRest.xy-center.xy;
          float lid=exp(-pow(p.x/.038,4.)-pow(p.y/.017,4.))*smoothstep(center.z-.040,center.z-.005,heroRest.z);
          roughnessFactor=mix(roughnessFactor,.82,lid*heroBlink);
        }`);
    };
    material.customProgramCacheKey=()=>oldKey+'-original-sculpt-face';
  }
  update(dt:number,time:number):void{
    for(const follower of this.hairFollowers)follower.update(dt,time);
    const dictionary=this.driver.morphTargetDictionary??{},values=this.driver.morphTargetInfluences??[];
    for(const mesh of this.meshes)for(const [name,index] of Object.entries(mesh.morphTargetDictionary??{}))mesh.morphTargetInfluences![index]=values[dictionary[name]]??0;
    this.blink.value=values[dictionary.Blink]??0;this.gaze.value=values[dictionary.Gaze]??0;
  }
  /** Explicit review probe; never evaluated in the animation/render loop. */
  inspect(){
    const visible:string[]=[],feet:number[]=[];const point=new THREE.Vector3();
    this.hero.root.updateMatrixWorld(true);
    this.hero.root.traverse(o=>{if(!(o instanceof THREE.Mesh))return;let shown=true;for(let p:THREE.Object3D|null=o;p;p=p.parent)shown&&=p.visible;if(shown)visible.push(o.name);});
    for(const mesh of this.meshes){mesh.skeleton.update();const p=mesh.geometry.getAttribute('position');
      for(let i=0;i<p.count;i++)if(p.getY(i)<.20){mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld);feet.push(point.y-this.hero.root.position.y);}}
    return {visible,soleHeight:feet.length?Math.min(...feet):null};
  }
  dispose():void{
    for(const follower of this.hairFollowers)follower.dispose();
    this.restore();this.hero.root.getObjectByName('Head')!.scale.copy(this.headScale);
    this.visibility.forEach((visible,o)=>{o.visible=visible;});
    this.materials.forEach((material,mesh)=>{const current=Array.isArray(mesh.material)?mesh.material:[mesh.material];current.forEach(m=>m.dispose());mesh.material=material;});
    for(const mesh of this.meshes){mesh.removeFromParent();disposeObject(mesh);}this.weapon.removeFromParent();disposeObject(this.weapon);this.sourcePaint.dispose();this.textures.forEach(t=>t.dispose());
  }
}
