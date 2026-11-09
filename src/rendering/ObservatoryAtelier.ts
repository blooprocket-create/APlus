import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { CharacterRig, CharacterAnimationState } from './CharacterMeshBuilder';
import type { IsometricCameraController } from './IsometricCamera';
import { disposeObject } from './SceneResources';

/** Opt-in art presentation only. GameEngine owns simulation, hits and animation.
 * Imported couture is fitted to the existing named joints. No new physics,
 * quest, atlas, save or animation clock is introduced here.
 */
export class ObservatoryAtelier {
  readonly root = new THREE.Group();
  readonly ready: Promise<void>;
  private readonly composer: EffectComposer;
  private readonly distortion: ShaderPass;
  private readonly antialias: ShaderPass;
  private readonly charge: THREE.Mesh;
  private readonly uniforms = { time: { value: 0 } };
  private readonly light = new THREE.PointLight(0x8edfff, 0, 11, 2);
  private readonly halo: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private readonly ribbons: THREE.Mesh[] = [];
  private readonly sparks: THREE.Points;
  private readonly cast = new THREE.Group();
  private castAge = 10;
  private clock = 0;
  private view = 0;
  private width = 0;
  private height = 0;
  private disposed=false;
  private keeperArt:THREE.Group|null=null;
  private atlas: THREE.Texture | null = null;
  private frameAt = 0;
  private intervals:number[] = [];
  private frameStats = {calls:0,triangles:0};
  private readonly fitted: THREE.Group[] = [];
  private readonly hidden: THREE.Object3D[] = [];
  private readonly oldLights: THREE.Light[] = [];
  private readonly oldBackground: THREE.Scene['background'];
  private readonly oldFog: THREE.Scene['fog'];
  private readonly oldTone: THREE.ToneMapping;

  constructor(private scene: THREE.Scene, private renderer: THREE.WebGLRenderer,
    private camera: IsometricCameraController, private hero: CharacterRig,
    private origin: THREE.Vector3, private keeper:THREE.Group, readonly baseline = false) {
    this.oldBackground = scene.background; this.oldFog = scene.fog; this.oldTone = renderer.toneMapping;
    scene.traverse(o => { if (o instanceof THREE.Light) this.oldLights.push(o); });
    this.oldLights.forEach(l => { l.visible = false; });
    scene.background = new THREE.Color(0x9bb6af);
    scene.fog = new THREE.FogExp2(0x739a9c, .013);
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.18;
    const hemi = new THREE.HemisphereLight(0xc5e4ec, 0x3f4655, 1.1);
    const sun = new THREE.DirectionalLight(0xffd59a, 3.1);
    sun.position.copy(origin).add(new THREE.Vector3(-12, 12, 6)); sun.target.position.copy(origin);
    sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -19, right: 19, top: 19, bottom: -19, near: .5, far: 60 });
    sun.shadow.bias = -.0003; sun.shadow.normalBias = .035; sun.shadow.radius = 2;
    const rim = new THREE.DirectionalLight(0x96d6eb, .9); rim.position.copy(origin).add(new THREE.Vector3(7,7,-10));
    this.root.add(hemi, sun, sun.target, rim, this.light); scene.add(this.root);
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera.camera));
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(1,1), .24, .55, 1.25));
    this.distortion = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, age: { value: 10 }, center: { value: new THREE.Vector2(.5,.5) } },
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `uniform sampler2D tDiffuse;uniform float age;uniform vec2 center;varying vec2 vUv;
        void main(){vec2 d=vUv-center;float r=length(d);float wave=exp(-pow((r-age*.32)*35.,2.));
        float fade=1.-smoothstep(.25,.7,age);vec2 uv=vUv+normalize(d+.0001)*wave*fade*.0025;
        vec4 c=texture2D(tDiffuse,uv);c.rgb+=wave*fade*vec3(.025,.04,.055);gl_FragColor=c;}` });
    this.composer.addPass(this.distortion);
    this.composer.addPass(new OutputPass());
    this.antialias=new ShaderPass(FXAAShader);this.composer.addPass(this.antialias);
    this.charge=new THREE.Mesh(new THREE.SphereGeometry(.10,24,16),new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
      uniforms:{},vertexShader:'varying vec3 vN;varying vec3 vV;void main(){vN=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position,1.);vV=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',
      fragmentShader:'varying vec3 vN;varying vec3 vV;void main(){float f=pow(1.-abs(dot(vN,vV)),2.);gl_FragColor=vec4(.55,1.4,1.6,.15+f*.8);}'}));
    this.charge.visible=false;this.root.add(this.charge);
    const disc = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, uniforms: { age: { value: 10 } },
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `varying vec2 vUv; uniform float age;
        float line(float d,float w){return 1.-smoothstep(w,w+.004,abs(d));}
        void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float a=atan(p.y,p.x);
          float ring=line(r-.82,.005)+line(r-.72,.002)*.7+line(r-.39,.004)*.7;
          float glyph=line(r-.64,.023)*step(.75,sin(a*24.+age*.6));
          float star=line(abs(p.x*.866+p.y*.5)-.29,.003)*step(r,.59)
            +line(abs(p.x*.866-p.y*.5)-.29,.003)*step(r,.59)
            +line(abs(p.y)-.29,.003)*step(r,.59);
          float sweep=exp(-abs(r-fract(age*.48)) * 75.)*.25;
          float fade=smoothstep(0.,.25,age)*(1.-smoothstep(1.9,2.6,age));
          gl_FragColor=vec4(mix(vec3(.32,.72,1.1),vec3(1.5,1.2,.65),glyph),min(1.,ring+glyph+star*.48+sweep)*fade);
        }` });
    this.halo = new THREE.Mesh(new THREE.PlaneGeometry(6.5,6.5), disc);this.halo.rotation.x=-Math.PI/2;this.halo.position.y=.055;
    this.cast.add(this.halo);
    // Curved energy sheets with an authored profile and travelling calligraphic crest.
    for (let i=0;i<7;i++) {
      const geo=new THREE.PlaneGeometry(1,1,80,6); const pos=geo.getAttribute('position');
      for (let v=0;v<pos.count;v++) {
        const t=pos.getX(v)+.5, w=pos.getY(v);
        const a=t*Math.PI*1.65+i*Math.PI*2/7, r=1.25+t*1.3;
        pos.setXYZ(v,Math.cos(a)*r, .2+Math.sin(t*Math.PI)*2.6+w*(.04+Math.sin(t*Math.PI)*.24),Math.sin(a)*r);
      }geo.computeVertexNormals();
      const m=new THREE.ShaderMaterial({side:THREE.DoubleSide,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
        uniforms:{age:{value:10},offset:{value:i*.11}},
        vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader:`varying vec2 vUv;uniform float age;uniform float offset;
          void main(){float crest=fract(age*.78+offset);float d=mod(crest-vUv.x+1.,1.);
          float tip=exp(-d*16.);float body=exp(-d*5.)*.25;
          float edge=pow(1.-abs(vUv.y-.5)*2.,2.);
          float fade=smoothstep(.1,.35,age)*(1.-smoothstep(1.7,2.45,age));
          gl_FragColor=vec4(mix(vec3(.12,.5,1.3),vec3(1.6,1.6,1.3),tip), (tip+body)*edge*fade);}`});
      const ribbon=new THREE.Mesh(geo,m);this.ribbons.push(ribbon);this.cast.add(ribbon);
    }
    const pts=new Float32Array(130*3); for(let i=0;i<130;i++){const a=i*2.39996,r=.4+2.5*((i*37%131)/131);pts.set([Math.cos(a)*r,(i%19)*.16,Math.sin(a)*r],i*3);}
    const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pts,3));
    this.sparks=new THREE.Points(pg,new THREE.PointsMaterial({color:0xbff6ff,size:.035,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));this.cast.add(this.sparks);this.root.add(this.cast);this.cast.visible=false;
    this.ready = this.load().catch(error=>{this.dispose();throw error;});
  }

  private async load(): Promise<void> {
    const loader=new GLTFLoader();
    this.atlas=await new THREE.TextureLoader().loadAsync('/art/observatory/pigments.png');
    this.atlas.colorSpace=THREE.SRGBColorSpace;this.atlas.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());
    const [garden,couture,keeper]=await Promise.all([loader.loadAsync('/art/observatory/garden.glb'),
      this.baseline ? Promise.resolve(null) : loader.loadAsync('/art/observatory/celestia.glb'),loader.loadAsync('/art/observatory/keeper.glb')]);
    if(this.disposed){disposeObject(garden.scene);if(couture)disposeObject(couture.scene);disposeObject(keeper.scene);this.atlas?.dispose();return;}
    garden.scene.position.copy(this.origin);this.root.add(garden.scene);
    garden.scene.traverse(o=>{
      if(!(o instanceof THREE.Mesh))return;o.castShadow=true;o.receiveShadow=true;
      const m=o.material as THREE.MeshStandardMaterial;
      if(m.name.startsWith('Valley')) {o.castShadow=false;o.receiveShadow=false;o.material=new THREE.MeshBasicMaterial({color:m.color,side:THREE.DoubleSide});return;}
      m.roughness=Math.max(.45,m.roughness);
      if(m.name.startsWith('Heartwood')) m.color.multiplyScalar(.82);
      const foliage=m.name.startsWith('Foliage');m.side=foliage||m.name.startsWith('Valley')?THREE.DoubleSide:THREE.FrontSide;
      if(foliage){m.emissive.copy(m.color);m.emissiveIntensity=.18;}
      this.paintMaterial(m,foliage,false);
    });
    for(const child of this.keeper.children){child.visible=false;this.hidden.push(child);}
    this.keeperArt=keeper.scene;this.keeper.add(keeper.scene);
    keeper.scene.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;const m=o.material as THREE.MeshStandardMaterial;this.paintMaterial(m,false,true);
      if(m.name.startsWith('Opal')){m.emissive.set(0x58c3da);m.emissiveIntensity=.65;}}});
    if(couture){
      this.hero.root.scale.set(1,1.08,1);
      // Preserve every joint and the existing facial morph mesh. Replace art only.
      for(const anchor of [...couture.scene.children]) {
        if(!anchor.name.startsWith('attach__'))continue;
        const name=anchor.name.slice(8).replace(/(ShoulderPlate|UpperArm|Forearm|Shin)([LR])$/, '$1.$2');const bone=this.hero.root.getObjectByName(name);if(!bone)throw new Error('Missing couture joint '+name);
        for(const art of [...bone.children]) {
          if(art instanceof THREE.Bone)continue;
          art.traverse(o=>{if(o instanceof THREE.Mesh && o.geometry.morphAttributes.position?.length) {o.scale.set(.91,.90,1.01);o.material=new THREE.MeshBasicMaterial({vertexColors:true});}
            if(o instanceof THREE.SkinnedMesh && o.name === 'Weighted sleeves and trousers'){const cloth=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85});this.paintMaterial(cloth,false,true);o.material=cloth;}
            if(o instanceof THREE.Mesh && !o.geometry.morphAttributes.position?.length && o.name !== 'Weighted sleeves and trousers'){o.visible=false;this.hidden.push(o);}});
        }
        const group=new THREE.Group();group.name='atelier_'+name;bone.add(group);this.fitted.push(group);
        for(const child of [...anchor.children])group.add(child);
        group.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;const m=o.material as THREE.MeshStandardMaterial;m.side=THREE.DoubleSide;this.paintMaterial(m,false,true);}});
        if(name==='Coat') {
          const hem=this.hero.root.getObjectByName('Coat.Hem') as THREE.Bone;
          const skeleton=new THREE.Skeleton([bone as THREE.Bone,hem]);
          group.updateWorldMatrix(true,true);
          for(const source of [...group.children]){
            if(!(source instanceof THREE.Mesh))continue;
            const geometry=source.geometry,points=geometry.getAttribute('position');
            const indices=new Uint16Array(points.count*4),weights=new Float32Array(points.count*4);
            for(let i=0;i<points.count;i++) {const bend=THREE.MathUtils.smoothstep(-points.getY(i)-source.position.y,.22,.74);indices[i*4+1]=1;weights[i*4]=1-bend;weights[i*4+1]=bend;}
            geometry.setAttribute('skinIndex',new THREE.BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new THREE.BufferAttribute(weights,4));
            const cloth=new THREE.SkinnedMesh(geometry,source.material);cloth.position.copy(source.position);cloth.quaternion.copy(source.quaternion);cloth.scale.copy(source.scale);
            source.removeFromParent();group.add(cloth);cloth.updateWorldMatrix(true,false);cloth.bind(skeleton,cloth.matrixWorld);cloth.frustumCulled=false;cloth.castShadow=true;
          }
        }
      }
    }
    // Windborne leaves: individually curved silhouettes, sparse enough to read combat.
    const motes=new THREE.BufferGeometry();const p=new Float32Array(70*3);
    for(let i=0;i<70;i++)p.set([Math.sin(i*32)*13,1+(i%17)*.43,Math.cos(i*51)*12],i*3);
    motes.setAttribute('position',new THREE.BufferAttribute(p,3));
    const mm=new THREE.PointsMaterial({color:0xffe6a9,size:.035,transparent:true,opacity:.55,depthWrite:false});
    const pollen=new THREE.Points(motes,mm);pollen.name='atelier_pollen';pollen.position.copy(this.origin);this.root.add(pollen);
    this.addAtmosphere();
    this.setView(0);
  }

  private addAtmosphere():void {
    const sky=new THREE.Mesh(new THREE.SphereGeometry(120,32,24),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,
      uniforms:{},vertexShader:'varying vec3 skyDir; void main(){skyDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`varying vec3 skyDir;void main(){float h=normalize(skyDir).y;
        vec3 c=mix(vec3(.64,.77,.69),vec3(.14,.38,.46),smoothstep(-.05,.8,h));
        float cloud=sin(skyDir.x*.045+sin(skyDir.z*.033))*sin(skyDir.z*.08+skyDir.y*.1);
        c+=smoothstep(.40,.8,cloud)*.12*smoothstep(.1,.5,h);
        gl_FragColor=vec4(c,1.);#include <tonemapping_fragment>
        #include <colorspace_fragment>}`.replace(';#include',';\n#include') }));
    sky.position.copy(this.origin);this.root.add(sky);
    const shore=new THREE.Shape();
    for(let i=0;i<=80;i++) {const a=i*Math.PI*2/80;const r=1+.08*Math.sin(a*5)+.035*Math.cos(a*9);
      const x=7.7+Math.sin(a)*2.9*r,z=1.2+Math.cos(a)*4*r;i===0?shore.moveTo(x,-z):shore.lineTo(x,-z);}
    const waterGeo=new THREE.ShapeGeometry(shore);waterGeo.rotateX(-Math.PI/2);
    const water=new THREE.Mesh(waterGeo,new THREE.ShaderMaterial({transparent:true,depthWrite:false,
      uniforms:{time:this.uniforms.time},vertexShader:'varying vec3 wp;void main(){wp=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`varying vec3 wp;uniform float time;
        void main(){vec2 p=wp.xz;float r=length((p-vec2(7.7,1.2))/vec2(2.9,4.));
          float ripple=sin(p.x*9.+sin(p.y*4.+time*.8)+time)*sin(p.y*7.-time*.6);
          float caustic=pow(max(0.,1.-abs(ripple)*5.),7.);
          vec3 c=mix(vec3(.018,.10,.12),vec3(.13,.34,.29),smoothstep(.25,1.,r));
          c+=vec3(.17,.24,.13)*caustic*.28;
          float glint=pow(max(0.,sin(p.x*2.+p.y*5.+sin(p.x*3.-time*.7))-.94)*16.,2.);
          c+=vec3(.55,.62,.42)*glint*.25;
          c+=smoothstep(.94,1.,r)*vec3(.16,.22,.11);
          gl_FragColor=vec4(c,.94);
#include <tonemapping_fragment>
#include <colorspace_fragment>
        }` }));
    water.position.copy(this.origin).add(new THREE.Vector3(0,.14,0));this.root.add(water);
    // Broad shafts have feathered edges and depth fade, never opaque cones.
    for(let i=0;i<4;i++){
      const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
        uniforms:{},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader:'varying vec2 vUv;void main(){float edge=pow(sin(vUv.x*3.14159),3.);float fade=sin(vUv.y*3.14159);gl_FragColor=vec4(.8,.73,.44,edge*fade*.028);}'});
      const ray=new THREE.Mesh(new THREE.PlaneGeometry(.65+i*.16,13),m);ray.position.copy(this.origin).add(new THREE.Vector3(-6+i*1.8,6,-4-i*.4));ray.rotation.z=-.42;this.root.add(ray);
    }
  }

  private paintMaterial(m:THREE.MeshStandardMaterial,wind:boolean,hero:boolean):void {
    const wood=m.name.startsWith('Heartwood'), stone=m.name.startsWith('Limestone'), skin=m.name.startsWith('Skin');
    const moss=m.name.startsWith('Moss')||m.name.startsWith('Earth'), slate=m.name.startsWith('Carved');
    const textured=wood||stone||moss||slate;
    m.onBeforeCompile=s=>{
      s.uniforms.atelierTime=this.uniforms.time;
      s.uniforms.pigmentAtlas={value:this.atlas};
      s.vertexShader='varying vec3 atelierPosition; uniform float atelierTime;\n'+s.vertexShader;
      s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        ${wind?'transformed.x += sin(position.x*.7+position.z*.8+atelierTime*.9)*.055; transformed.y += sin(position.x*1.8+atelierTime*1.4)*.025;':''}
        atelierPosition=transformed;`);
      s.fragmentShader=`varying vec3 atelierPosition; uniform sampler2D pigmentAtlas;
        vec3 pigment(vec2 p,vec2 quadrant){return texture2D(pigmentAtlas,(fract(p)*.982+.009)*.5+quadrant).rgb;}
        vec3 triPigment(vec3 p,vec3 n,vec2 quadrant){vec3 w=pow(abs(n),vec3(5.));w/=max(.0001,w.x+w.y+w.z);
          return pigment(p.yz,quadrant)*w.x+pigment(p.xz,quadrant)*w.y+pigment(p.xy,quadrant)*w.z;}
        `+s.fragmentShader;
      s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        float wash=sin(atelierPosition.x*5.7+sin(atelierPosition.z*4.))*sin(atelierPosition.y*8.3+atelierPosition.z*6.1);
        diffuseColor.rgb *= 1. + wash * ${hero?'.015':'.065'};
        ${textured?`vec3 localN=normalize(cross(dFdx(atelierPosition),dFdy(atelierPosition)));
          vec3 tex=triPigment(atelierPosition*${wood?'vec3(.38,.20,.38)':'vec3(.36)'},localN,vec2(${wood?'0.,.5':stone?'.5,.5':moss?'0.,0.':'.5,0.'}));
          diffuseColor.rgb=${moss?'mix(diffuseColor.rgb,tex*vec3(.65,.76,.62),.38)':'tex*'+(wood?'vec3(.92,.82,.86)':stone?'vec3(.88,.94,.91)':'vec3(.9)')};`:''}
        ${skin?`float blush=exp(-pow((abs(atelierPosition.x)-.093)*38.,2.)-pow((atelierPosition.y+.038)*50.,2.))*smoothstep(.05,.11,atelierPosition.z);
          diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.79,.30,.25),blush*.12);`:''}`);
      if(hero)s.fragmentShader=s.fragmentShader.replace('vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;',`
        vec3 artNormal=inverseTransformDirection(normal,viewMatrix);
        float facing=dot(artNormal,normalize(vec3(-.45,.85,.22)));
        float band=smoothstep(-.08,.02,facing);
        vec3 outgoingLight=totalDiffuse*mix(vec3(.82,.85,.96),vec3(1.04,1.01,.96),band)+totalSpecular*.75+totalEmissiveRadiance;
        ${skin?'outgoingLight=mix(diffuseColor.rgb*vec3(.82,.75,.79),outgoingLight,.50);':''}`);
    };
    m.customProgramCacheKey=()=>`atelier-v2-${wind}-${hero}-${wood}-${stone}-${skin}-${moss}-${slate}`;
  }

  /** Called at the SAME release marker used by GameEngine's gravity hazard. */
  release(target:THREE.Vector3,radius:number):void {
    this.halo.scale.setScalar(radius/2.665);
    for(const r of this.ribbons)r.scale.set(radius/2.55,1,radius/2.55);
    this.sparks.scale.set(radius/3,1,radius/3);
    const screen=target.clone().add(new THREE.Vector3(0,1,0)).project(this.camera.camera);
    this.distortion.uniforms.center.value.set(screen.x*.5+.5,screen.y*.5+.5);
    this.castAge=0;this.cast.position.copy(target);this.cast.visible=true;this.light.position.copy(target).add(new THREE.Vector3(0,1.5,0));
    this.camera.triggerShake(.10,.13);
  }
  setView(view:number):void {
    this.view=view%3;
    const shots=[{cameraOffset:{x:7,y:7.2,z:12.8},lookAtOffset:{x:-.7,y:2.4,z:-2}},
      {cameraOffset:{x:1.8,y:1.7,z:4.1},lookAtOffset:{x:0,y:1.05,z:0}},null];
    this.camera.setCutsceneShot(shots[this.view],this.hero.root.position);
    if(this.view===2)this.camera.snapToIsometricFollow(this.hero.root.position);
  }
  nextView():void{this.setView(this.view+1);}
  update(dt:number,state:CharacterAnimationState):void {
    this.clock+=dt;this.uniforms.time.value=this.clock;this.castAge+=dt;
    if(this.keeperArt)this.keeperArt.position.y=Math.sin(this.clock*1.7)*.065;
    this.distortion.uniforms.age.value=this.castAge;
    const winding=state.attackComboStep===4 && state.skillSlot==='skill1' && state.attackSwingProgress<.64;
    this.charge.visible=winding;
    if(winding){const palm=this.hero.getSpellEmitter(false);if(palm)this.charge.position.copy(palm);
      this.charge.scale.setScalar(.2+state.attackSwingProgress*2.4);}
    
    this.cast.visible=this.castAge<2.65;
    this.halo.material.uniforms.age.value=this.castAge;
    this.halo.rotation.z=this.castAge*.08;
    for(const r of this.ribbons){(r.material as THREE.ShaderMaterial).uniforms.age.value=this.castAge;r.rotation.y=this.castAge*.5;}
    (this.sparks.material as THREE.PointsMaterial).opacity=Math.max(0,Math.sin(this.castAge/2.6*Math.PI))*.75;
    this.sparks.rotation.y=this.castAge*.32;
    this.light.intensity=this.castAge<2.6?Math.sin(Math.min(1,this.castAge/.3)*Math.PI*.5)*14*Math.max(0,1-this.castAge/2.6):0;
    const pollen=this.root.getObjectByName('atelier_pollen');if(pollen)pollen.rotation.y=this.clock*.008;
    // Layered follow-through complements the authored hair follower and coat bones.
    for(const g of this.fitted){if(g.name==='atelier_Hair')g.rotation.z=Math.sin(this.clock*1.8)*.035;
      if(g.name==='atelier_Coat')g.rotation.x=Math.sin(this.clock*1.4)*.018+(state.isMoving?.07:0);}
  }
  render():void{
    const now=performance.now();if(this.frameAt){this.intervals.push(now-this.frameAt);if(this.intervals.length>90)this.intervals.shift();}this.frameAt=now;
    const size=this.renderer.getSize(new THREE.Vector2());
    if(size.x!==this.width||size.y!==this.height){this.width=size.x;this.height=size.y;this.composer.setSize(size.x,size.y);const ratio=this.renderer.getPixelRatio();this.antialias.uniforms.resolution.value.set(1/(size.x*ratio),1/(size.y*ratio));}
    this.renderer.info.autoReset=false;this.renderer.info.reset();
    this.composer.render();
    this.frameStats={calls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles};
    this.renderer.info.autoReset=true;
  }
  diagnostics(){return {ready:this.fitted.length>0,view:this.view,castAge:this.castAge,frameIntervalMs:this.intervals.length?this.intervals.reduce((a,b)=>a+b,0)/this.intervals.length:null,calls:this.frameStats.calls,triangles:this.frameStats.triangles};}
  dispose():void{
    if(this.disposed)return;this.disposed=true;
    if(this.keeperArt){this.keeperArt.removeFromParent();disposeObject(this.keeperArt);}
    this.hidden.forEach(o=>{o.visible=true;});this.fitted.forEach(g=>{g.removeFromParent();disposeObject(g);});
    this.hero.root.scale.setScalar(1);this.oldLights.forEach(l=>{l.visible=true;});this.scene.background=this.oldBackground;this.scene.fog=this.oldFog;
    this.renderer.toneMapping=this.oldTone;this.renderer.toneMappingExposure=1;this.camera.setCutsceneShot(null);
    this.atlas?.dispose();this.root.removeFromParent();disposeObject(this.root);this.composer.passes.forEach(p=>p.dispose());this.composer.dispose();
  }
}
