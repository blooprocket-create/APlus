import {ReconstructedHero,type ReconstructedHeroFit} from './ReconstructedHero';
import { heroReleaseProgress } from './HeroMotion';
import { AtelierSecondaryMotion } from './AtelierSecondaryMotion';
import { AtelierPortrait, type PortraitSurface } from './AtelierPortrait';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
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
  private readonly keyLight:THREE.DirectionalLight;
  private readonly depthOfField:ShaderPass;
  private reflection:THREE.WebGLRenderTarget|null=null;
  private waterReflection:Reflector|null=null;
  private readonly oldEnvironment:THREE.Texture|null;
  private readonly oldEnvironmentIntensity:number;
  private readonly distortion: ShaderPass;
  private readonly antialias: ShaderPass;
  private readonly charge: THREE.Mesh;
  private readonly impact:THREE.Mesh<THREE.PlaneGeometry,THREE.ShaderMaterial>;
  private readonly uniforms = { time: { value: 0 } };
  private readonly light = new THREE.PointLight(0x8edfff, 0, 11, 2);
  private readonly characterFill=new THREE.PointLight(0xffdfbd,4.5,7,2);
  private readonly halo: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private readonly ribbons: THREE.Mesh[] = [];
  private readonly sparks: THREE.Points;
  private readonly cast = new THREE.Group();
  private castAge = 10;
  private clock = 0;
  private view = 0;
  private combatShot=false;
  private reconstructedHero:ReconstructedHero|null=null;
  private readonly sculptTree=new URLSearchParams(location.search).get('tree')!=='growth';
  private readonly porousTree=!['sculpt','sealed','growth'].includes(new URLSearchParams(location.search).get('tree')??'');
  private readonly sculptGate=new URLSearchParams(location.search).get('gate')!=='legacy';
  private readonly sculptVista=new URLSearchParams(location.search).get('vista')!=='legacy';
  private readonly importedTextures=new Set<THREE.Texture>();
  private readonly heroImpact={value:0};private readonly keeperImpact={value:0};
  private readonly sculptHero=new URLSearchParams(location.search).get('hero')!=='couture';
  private readonly sculptKeeper=new URLSearchParams(location.search).get('keeper')!=='corolla';
  private width = 0;
  private height = 0;
  private secondary:AtelierSecondaryMotion|null=null;
  private portrait:AtelierPortrait|null=null;
  private portraitDriver:THREE.Mesh|null=null;
  private facialSculpts:THREE.Mesh[]=[];
  private loaded=false;
  private bodyFitted=false;
  private originalUnderlayer:THREE.BufferGeometry|null=null;
  private originalMaterials=new Map<THREE.Mesh,THREE.Material|THREE.Material[]>();
  private disposed=false;
  private keeperArt:THREE.Group|null=null;
  private atlas: THREE.Texture | null = null;
  private coutureAtlas:THREE.Texture|null=null;
  private leafAtlas:THREE.Texture|null=null;
  private faceAtlas:THREE.Texture|null=null;
  private skyAtlas:THREE.Texture|null=null;
  private energyAtlas:THREE.Texture|null=null;
  private coutureMaps:THREE.Texture[]=[];
  private frameAt = 0;
  private renderDirty=true;
  private readonly lastCameraPosition=new THREE.Vector3(Infinity,Infinity,Infinity);
  private readonly lastCameraRotation=new THREE.Quaternion();
  private intervals:number[] = [];
  private frameStats = {calls:0,triangles:0};
  private readonly fitted: THREE.Group[] = [];
  private readonly hidden: THREE.Object3D[] = [];
  private readonly oldLights = new Map<THREE.Light,boolean>();
  private readonly oldBackground: THREE.Scene['background'];
  private readonly oldFog: THREE.Scene['fog'];
  private readonly oldTone: THREE.ToneMapping;
  private readonly oldExposure:number;
  private readonly oldFar:number;

  constructor(private scene: THREE.Scene, private renderer: THREE.WebGLRenderer,
    private camera: IsometricCameraController, private hero: CharacterRig,
    private origin: THREE.Vector3, private keeper:THREE.Group,private keeperFacing:THREE.Object3D, readonly baseline = false) {
    this.oldFar=camera.camera.far;camera.camera.far=320;camera.camera.updateProjectionMatrix();
    this.oldEnvironment=scene.environment;this.oldEnvironmentIntensity=scene.environmentIntensity;
    this.oldBackground = scene.background; this.oldFog = scene.fog; this.oldTone = renderer.toneMapping;this.oldExposure=renderer.toneMappingExposure;
    scene.traverse(o => { if (o instanceof THREE.Light) this.oldLights.set(o,o.visible); });
    this.oldLights.forEach((_visible,l) => { l.visible = false; });
    scene.background = new THREE.Color(0x9bb6af);
    scene.fog = new THREE.FogExp2(0x87afaa, .012);
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.04;
    const hemi = new THREE.HemisphereLight(0xc5e4ec, 0x3f4655, .35);
    const sun = new THREE.DirectionalLight(0xffd59a, 4.4);
    this.keyLight=sun;sun.shadow.autoUpdate=false;sun.shadow.needsUpdate=true;
    sun.position.copy(origin).add(new THREE.Vector3(-6, 15, -12)); sun.target.position.copy(origin);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: .5, far: 60 });
    sun.shadow.bias = -.00012; sun.shadow.normalBias = .008; sun.shadow.radius = 2;
    const rim = new THREE.DirectionalLight(0x96d6eb, 1.25); rim.position.copy(origin).add(new THREE.Vector3(7,7,-10));
    const fill=new THREE.DirectionalLight(0xffe6ce,.40);fill.position.copy(origin).add(new THREE.Vector3(4,6,8));
    this.root.add(hemi, sun, sun.target, rim, fill, this.light,this.characterFill); scene.add(this.root);
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera.camera));
    // Reuse the primary scene depth. A second geometry render for portrait
    // blur was needlessly re-running the sculpture and shadow pass.
    for(const target of [this.composer.renderTarget1,this.composer.renderTarget2])target.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
    this.depthOfField=new ShaderPass({
      uniforms:{tDiffuse:{value:null},tDepth:{value:null},focus:{value:3},nearClip:{value:camera.camera.near},farClip:{value:camera.camera.far},aspect:{value:1}},
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`uniform sampler2D tDiffuse;uniform sampler2D tDepth;uniform float focus;uniform float nearClip;uniform float farClip;uniform float aspect;varying vec2 vUv;
        #include <packing>
        float distanceAt(vec2 uv){return -perspectiveDepthToViewZ(texture2D(tDepth,uv).x,nearClip,farClip);}
        void main(){float d=distanceAt(vUv);float blur=min(.005,abs(d-focus)/max(d,.1)*.009);
          vec3 c=texture2D(tDiffuse,vUv).rgb;float weight=1.;
          for(int i=0;i<12;i++){float a=float(i)*2.399963;float r=sqrt((float(i)+.5)/12.);
            vec2 uv=vUv+vec2(cos(a)/aspect,sin(a))*r*blur;float z=distanceAt(uv);
            float w=1.-step(z+.25,min(d,focus+.3));c+=texture2D(tDiffuse,uv).rgb*w;weight+=w;}
          gl_FragColor=vec4(c/weight,1.);}`
    });
    this.depthOfField.enabled=false;this.composer.addPass(this.depthOfField);
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(1,1), .24, .55, 1.25));
    this.distortion = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, age: { value: 10 }, center: { value: new THREE.Vector2(.5,.5) } },
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `uniform sampler2D tDiffuse;uniform float age;uniform vec2 center;varying vec2 vUv;
        void main(){vec2 d=vUv-center;float r=length(d);float wave=exp(-pow((r-age*.32)*35.,2.));
        float fade=1.-smoothstep(.25,.7,age);vec2 uv=vUv+normalize(d+.0001)*wave*fade*.0025;
        vec4 c=texture2D(tDiffuse,uv);c.rgb+=wave*fade*vec3(.025,.04,.055);float burst=exp(-age*35.)*exp(-r*r*35.);c.rgb+=vec3(.30,.47,.48)*burst;gl_FragColor=c;}` });
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
    // Asymmetric authored gestures, with independent growth/decay. The paint
    // supplies turbulent grain; the actual 3D strokes define the silhouette.
    const strokes=[
      {points:[[0,.10,0],[-1.0,.55,.2],[-1.6,1.8,0],[-.5,3.7,-.3],[1.4,4.8,-.4]],width:.78,delay:0,axis:[0,0,1]},
      {points:[[1.4,4.7,-.4],[2.1,3.6,.3],[1.7,1.7,.7],[.4,.5,.1],[-1.3,.3,-.2]],width:.55,delay:.15,axis:[0,0,1]},
      {points:[[-2.55,.12,0],[-1.8,.2,1.9],[0,.3,2.55],[2,.8,1.4],[2.3,1.6,-.2]],width:.45,delay:.04,axis:[0,1,0]},
      {points:[[1.4,.15,-1.7],[.8,1.0,-1.8],[-.6,2.1,-.8],[-1.4,2.8,.4],[-.7,3.4,.8]],width:.34,delay:.29,axis:[1,0,.3]},
    ];
    for (const [i,stroke] of strokes.entries()) {
      const path=new THREE.CatmullRomCurve3(stroke.points.map(p=>new THREE.Vector3(...p as [number,number,number])));
      const axis=new THREE.Vector3(...stroke.axis as [number,number,number]);
      const geo=new THREE.PlaneGeometry(1,1,100,8),pos=geo.getAttribute('position'),uv=geo.getAttribute('uv');
      for(let v=0;v<pos.count;v++){
        const t=uv.getX(v),p=path.getPoint(t),side=path.getTangent(t).cross(axis).normalize();
        const width=stroke.width*Math.sin(Math.PI*t)**.65*(.65+.35*Math.sin(t*4+i));
        p.addScaledVector(side,(uv.getY(v)-.5)*width);pos.setXYZ(v,p.x,p.y,p.z);
      }geo.computeVertexNormals();
      const m=new THREE.ShaderMaterial({side:THREE.DoubleSide,transparent:true,depthWrite:false,blending:THREE.NormalBlending,
        uniforms:{age:{value:10},offset:{value:stroke.delay},energyMap:{value:null}},
        vertexShader:`varying vec2 vUv;uniform float age;void main(){vUv=uv;
          vec3 p=position+normal*sin(uv.x*31.-age*12.)*.045*sin(uv.x*3.14159);
          gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
        fragmentShader:`varying vec2 vUv;uniform float age;uniform float offset;uniform sampler2D energyMap;
          void main(){float t=age-offset;float head=smoothstep(0.,.50,t);
            float grow=1.-smoothstep(head-.035,head+.025,vUv.x);
            float fade=smoothstep(0.,.09,t)*(1.-smoothstep(1.25,2.55,t));
            vec4 ink=texture2D(energyMap,vec2(fract(vUv.x*1.45-age*.52),vUv.y));
            float tip=exp(-pow((vUv.x-head)*55.,2.));
            vec3 c=ink.rgb*1.8+vec3(.005,.025,.055)+vec3(.35,.90,1.0)*tip;
            gl_FragColor=vec4(c,ink.a*grow*fade*.76);}`});
      const ribbon=new THREE.Mesh(geo,m);ribbon.userData.stroke=i;this.ribbons.push(ribbon);this.cast.add(ribbon);
    }
    // A single calligraphic crescent supplies the contact accent; the later
    // bloom stays translucent so its ground radius and enemy remain readable.
    this.impact=new THREE.Mesh(new THREE.PlaneGeometry(3.6,4.2),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
      uniforms:{age:{value:10}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`varying vec2 vUv;uniform float age;void main(){vec2 p=(vUv-.5)*2.;
        float outer=1.-smoothstep(.76,.80,length((p-vec2(.13,0.))*vec2(1.,.78)));
        float cut=smoothstep(.69,.72,length((p-vec2(-.17,.04))*vec2(1.,.78)));
        float ink=outer*cut;float fade=1.-smoothstep(.06,.24,age);
        gl_FragColor=vec4(vec3(.65,1.4,1.55),ink*fade);}`
    }));this.impact.position.y=1.45;this.cast.add(this.impact);
    const pts=new Float32Array(130*3); for(let i=0;i<130;i++){const a=i*2.39996,r=.4+2.5*((i*37%131)/131);pts.set([Math.cos(a)*r,(i%19)*.16,Math.sin(a)*r],i*3);}
    const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pts,3));
    this.sparks=new THREE.Points(pg,new THREE.PointsMaterial({color:0xbff6ff,size:.035,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));this.cast.add(this.sparks);this.root.add(this.cast);this.cast.visible=false;
    this.ready = this.load().catch(error=>{this.dispose();throw error;});
  }

  private async load(): Promise<void> {
    const loader=new GLTFLoader();
    this.atlas=await new THREE.TextureLoader().loadAsync('/art/observatory/pigments.png');
    this.atlas.colorSpace=THREE.SRGBColorSpace;this.atlas.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());
    this.coutureAtlas=await new THREE.TextureLoader().loadAsync('/art/observatory/couture.png');
    this.coutureAtlas.colorSpace=THREE.SRGBColorSpace;this.coutureAtlas.flipY=false;
    this.coutureAtlas.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());
    this.leafAtlas=await new THREE.TextureLoader().loadAsync('/art/observatory/leaves.png');
    this.leafAtlas.colorSpace=THREE.SRGBColorSpace;this.leafAtlas.flipY=false;this.leafAtlas.anisotropy=8;
    this.faceAtlas=await new THREE.TextureLoader().loadAsync('/art/observatory/face.png');
    this.faceAtlas.colorSpace=THREE.SRGBColorSpace;this.faceAtlas.flipY=false;this.faceAtlas.anisotropy=8;
    this.skyAtlas=await new THREE.TextureLoader().loadAsync('/art/observatory/sky.png');
    this.skyAtlas.colorSpace=THREE.SRGBColorSpace;this.skyAtlas.wrapS=THREE.RepeatWrapping;
    this.energyAtlas=await new THREE.TextureLoader().loadAsync('/art/observatory/energy.png');
    this.energyAtlas.colorSpace=THREE.SRGBColorSpace;this.energyAtlas.wrapS=THREE.RepeatWrapping;
    for(const ribbon of this.ribbons)(ribbon.material as THREE.ShaderMaterial).uniforms.energyMap.value=this.energyAtlas;
    const [garden,couture,keeper,portrait,tree,gate,cliff,flow]=await Promise.all([loader.loadAsync('/art/observatory/garden.glb'),
      this.baseline ? Promise.resolve(null) : loader.loadAsync('/art/observatory/celestia.glb'),loader.loadAsync('/art/observatory/'+(this.sculptKeeper?'keeper-sculpt.glb':'keeper.glb')),fetch('/art/observatory/portrait.json').then(r=>{if(!r.ok)throw Error('Missing portrait surface');return r.json() as Promise<PortraitSurface>;}),this.sculptTree?loader.loadAsync('/art/observatory/'+(this.porousTree?'elder-tree-porous.glb':'elder-tree.glb')):Promise.resolve(null),this.sculptGate?loader.loadAsync('/art/observatory/moon-gate.glb'):Promise.resolve(null),this.sculptVista?loader.loadAsync('/art/observatory/riven-cliff.glb'):Promise.resolve(null),this.sculptVista?fetch('/art/observatory/riven-cliff-flow.json').then(r=>{if(!r.ok)throw Error('Missing original surface path');return r.json() as Promise<{points:number[][]}>;}):Promise.resolve(null)]);
    if(this.disposed){if(cliff)disposeObject(cliff.scene);if(gate)disposeObject(gate.scene);if(tree)disposeObject(tree.scene);disposeObject(garden.scene);if(couture)disposeObject(couture.scene);disposeObject(keeper.scene);this.atlas?.dispose();this.coutureAtlas?.dispose();this.leafAtlas?.dispose();this.faceAtlas?.dispose();this.skyAtlas?.dispose();this.energyAtlas?.dispose();return;}
    garden.scene.position.copy(this.origin);this.root.add(garden.scene);
    garden.scene.traverse(o=>{
      if(!(o instanceof THREE.Mesh))return;o.castShadow=true;o.receiveShadow=true;
      const m=o.material as THREE.MeshStandardMaterial;
      if(this.sculptGate&&m.name.includes('Archived gate')){o.visible=false;return;}
      if(this.sculptTree){
        if(m.name.startsWith('Heartwood')){o.visible=false;return;}
        if(m.name.startsWith('Foliage')||m.name.startsWith('Moss')){
          const g=o.geometry,indices=g.getIndex(),p=g.getAttribute('position'),keep:number[]=[];
          if(indices){for(let i=0;i<indices.count;i+=3){const a=indices.getX(i),b=indices.getX(i+1),c=indices.getX(i+2);if(Math.max(p.getY(a),p.getY(b),p.getY(c))<5.5)keep.push(a,b,c);}g.setIndex(keep);}
        }
      }
      if(m.name.startsWith('Valley')) {o.castShadow=false;o.receiveShadow=false;o.material=new THREE.MeshBasicMaterial({color:m.color,side:THREE.DoubleSide});return;}
      m.roughness=Math.max(.45,m.roughness);
      if(m.name.startsWith('Heartwood')) m.color.multiplyScalar(.82);
      const foliage=m.name.startsWith('Foliage');m.side=foliage||m.name.startsWith('Valley')||m.name.startsWith('Banner')||m.name.startsWith('Paper')?THREE.DoubleSide:THREE.FrontSide;
      if(foliage){
        const index=Number(m.name.slice(-1)),quadrant=[0,1,2,3,1][index];const map=this.leafAtlas!.clone();this.coutureMaps.push(map);
        map.repeat.set(.25,.482);map.offset.set((quadrant%2)*.5+.125,Math.floor(quadrant/2)*.5+.009);map.needsUpdate=true;
        m.map=map;m.color.set(0xffffff);m.alphaTest=.35;m.emissive.set(0xffffff);m.emissiveMap=map;m.emissiveIntensity=.065;
      }
      this.paintMaterial(m,foliage||m.name.startsWith('Banner'),false);
    });
    if(tree){
      tree.scene.position.copy(this.origin).add(new THREE.Vector3(-5.5,-.18,-8.5));tree.scene.rotation.y=.5;this.root.add(tree.scene);
      tree.scene.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;const m=o.material as THREE.MeshStandardMaterial;
        if(m.name.startsWith('Reconstructed elder foliage')){m.side=THREE.DoubleSide;m.alphaTest=.35;m.transparent=false;m.depthWrite=true;}
        else m.name='Reconstructed elder • organic paint';
        this.paintMaterial(m,true,false);this.trackTextures(m);}});
    }
    if(gate){
      gate.scene.position.copy(this.origin).add(new THREE.Vector3(1.7,-.16,-9));gate.scene.rotation.y=.20;this.root.add(gate.scene);
      gate.scene.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;const m=o.material as THREE.MeshStandardMaterial;this.paintMaterial(m,false,false);this.trackTextures(m);}});
    }
    if(cliff&&flow){
      if(flow.points.length!==12||flow.points.some(p=>p.length!==3||!p.every(Number.isFinite)))throw Error('Invalid artist-authored watercourse');
      cliff.scene.position.copy(this.origin).add(new THREE.Vector3(-6,-25,-50));cliff.scene.rotation.y=.12;this.root.add(cliff.scene);
      cliff.scene.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=false;o.receiveShadow=false;const m=o.material as THREE.MeshStandardMaterial;this.paintMaterial(m,false,false);this.paintSurfaceFlow(m,flow.points);this.trackTextures(m);}});
    }
    for(const child of this.keeper.children){child.visible=false;this.hidden.push(child);}
    this.keeperArt=keeper.scene;this.keeper.add(keeper.scene);
    keeper.scene.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;const m=o.material as THREE.MeshStandardMaterial;m.userData.atelierKeeper=true;this.paintMaterial(m,false,true);this.trackTextures(m);
      if(m.name.startsWith('Opal')){m.emissive.set(0x58c3da);m.emissiveIntensity=.65;}}});
    if(couture&&this.sculptHero){
      const [model,fit,sourcePaint]=await Promise.all([loader.loadAsync('/art/observatory/celestia-sculpt.glb'),fetch('/art/observatory/celestia-sculpt-fit.json').then(r=>{if(!r.ok)throw Error('Missing hero rig fit');return r.json() as Promise<ReconstructedHeroFit>;}),new THREE.TextureLoader().loadAsync('/art/observatory/hero-source-paint.png')]);
      sourcePaint.colorSpace=THREE.SRGBColorSpace;sourcePaint.flipY=false;
      this.reconstructedHero=new ReconstructedHero(this.hero,model.scene,fit,couture.scene,sourcePaint,mesh=>{const m=mesh.material as THREE.MeshStandardMaterial;this.applyCouture(mesh,m);this.paintMaterial(m,false,true);});
    }
    if(couture&&!this.sculptHero){
      this.bodyFitted=true;this.hero.root.scale.set(1,1.08,1);
      // Fit the adult shoulder span while preserving every named animation joint.
      for(const side of ['L','R'])for(const part of ['UpperArm','ShoulderPlate'])this.hero.root.getObjectByName(part+'.'+side)!.position.x*=.83;
      const underlayer=this.hero.root.getObjectByName('Weighted sleeves and trousers') as THREE.SkinnedMesh;
      if(underlayer){
        this.originalUnderlayer=underlayer.geometry;underlayer.geometry=underlayer.geometry.clone();
        const g=underlayer.geometry,p=g.getAttribute('position'),indices=g.getAttribute('skinIndex');
        for(let i=0;i<p.count;i++){
          const names=[underlayer.skeleton.bones[indices.getX(i)]?.name,underlayer.skeleton.bones[indices.getY(i)]?.name];
          if(names.some(n=>n?.startsWith('UpperArm')||n?.startsWith('Forearm')||n?.startsWith('Elbow'))){const center=Math.sign(p.getX(i))*.252;p.setX(i,center+(p.getX(i)-center)*.85);}
        }p.needsUpdate=true;g.computeVertexNormals();
      }
      const hand=this.hero.root.getObjectByName('Celestia’s casting glove') as THREE.SkinnedMesh;
      if(hand){this.originalMaterials.set(hand,hand.material);const glove=new THREE.MeshStandardMaterial({name:'Couture • leather',roughness:.7});this.applyCouture(hand,glove);this.paintMaterial(glove,false,true);hand.material=glove;
        for(const child of hand.children)child.visible=false;}
      const head=this.hero.root.getObjectByName('Head')!;head.scale.setScalar(.68);head.position.y=.664;
      const driver=this.hero.root.getObjectByName('Hero expression controls') as THREE.Mesh;
      driver.visible=false;this.hidden.push(driver);this.portraitDriver=driver;
      this.portrait=new AtelierPortrait(portrait,driver);head.add(this.portrait.root);
      // Preserve every joint and the existing facial morph mesh. Replace art only.
      for(const anchor of [...couture.scene.children]) {
        if(!anchor.name.startsWith('attach__'))continue;
        const name=anchor.name.slice(8).replace(/(ShoulderPlate|UpperArm|Forearm|Shin|Foot)([LR])$/, '$1.$2');const bone=this.hero.root.getObjectByName(name);if(!bone)throw new Error('Missing couture joint '+name);
        for(const art of [...bone.children]) {
          if(art instanceof THREE.Bone||art===this.portrait?.root)continue;
          art.traverse(o=>{if(o instanceof THREE.Mesh && o.geometry.morphAttributes.position?.length) {o.visible=false;}
            if(o instanceof THREE.SkinnedMesh && o.name === 'Weighted sleeves and trousers'){this.originalMaterials.set(o,o.material);const cloth=new THREE.MeshStandardMaterial({name:'Couture • tailored navy',roughness:.85});this.applyCouture(o,cloth);this.paintMaterial(cloth,false,true);o.material=cloth;}
            if(o instanceof THREE.Mesh && !o.geometry.morphAttributes.position?.length && o.name !== 'Weighted sleeves and trousers'){o.visible=false;this.hidden.push(o);}});
        }
        const group=new THREE.Group();group.name='atelier_'+name;
        if(name==='Hips')group.scale.x=.9;else if(/^(UpperArm|Forearm|ShoulderPlate)/.test(name))group.scale.x=.85;bone.add(group);this.fitted.push(group);
        for(const child of [...anchor.children])group.add(child);
        group.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;const m=o.material as THREE.MeshStandardMaterial;m.side=THREE.DoubleSide;this.applyCouture(o,m);if(m.name==='Skin • portrait albedo')m.map=this.faceAtlas;this.paintMaterial(m,false,true);if(o.morphTargetDictionary)this.facialSculpts.push(o);}});
        if(name==='Hair')this.secondary=new AtelierSecondaryMotion(this.hero.root,bone,group);
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
    // Water follows the sculpted ravine notch; geometry remains in the live scene.
    const falls=new THREE.Mesh(new THREE.PlaneGeometry(1.3,21,8,50),new THREE.ShaderMaterial({
      transparent:true,depthWrite:false,side:THREE.DoubleSide,
      uniforms:{time:this.uniforms.time},
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`varying vec2 vUv;uniform float time;
        void main(){float x=(vUv.x-.5)*2.;float thread=sin(vUv.x*61.+sin(vUv.y*16.-time*2.)*.8);
          float width=.65+.12*sin(vUv.y*23.+sin(vUv.y*11.));
          float a=(1.-smoothstep(width-.18,width,abs(x)))*(.55+.18*thread);
          vec3 c=mix(vec3(.48,.72,.72),vec3(.88,.95,.84),.5+.5*thread);
          gl_FragColor=vec4(c,a);
#include <tonemapping_fragment>
#include <colorspace_fragment>}`
    }));falls.position.copy(this.origin).add(new THREE.Vector3(8,-2.5,-60));falls.visible=!this.sculptVista;this.root.add(falls);
    this.addAtmosphere();
    this.buildReflectionProbe();
    this.keyLight.shadow.needsUpdate=true;
    this.loaded=true;this.setView(0);
  }

  private addAtmosphere():void {
    const sky=new THREE.Mesh(new THREE.SphereGeometry(240,32,24),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,
      uniforms:{skyMap:{value:this.skyAtlas},time:this.uniforms.time},vertexShader:'varying vec3 skyDir; void main(){skyDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`uniform sampler2D skyMap;uniform float time;varying vec3 skyDir;
        void main(){vec3 d=normalize(skyDir);float u=atan(d.z,d.x)/6.283185+.5+time*.00018;
          float v=.10+.90*asin(max(0.,d.y))*2./3.141593;
          vec3 c=texture2D(skyMap,vec2(u,v)).rgb;
          c=mix(vec3(.16,.24,.20),c,smoothstep(-.35,.03,d.y));gl_FragColor=vec4(c,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>}` }));sky.name='atelier_sky';sky.renderOrder=-1000;sky.material.depthTest=false;
    sky.position.copy(this.origin);this.root.add(sky);
    const shore=new THREE.Shape();
    for(let i=0;i<=80;i++) {const a=i*Math.PI*2/80;const r=1+.08*Math.sin(a*5)+.035*Math.cos(a*9);
      const x=7.7+Math.sin(a)*2.9*r,z=1.2+Math.cos(a)*4*r;i===0?shore.moveTo(x,-z):shore.lineTo(x,-z);}
    const waterGeo=new THREE.ShapeGeometry(shore);
    // A clipped planar reflection uses this renderer/camera/scene. It captures
    // actual moving geometry, including the elder and hero, at a modest size.
    const water=new Reflector(waterGeo,{textureWidth:384,textureHeight:384,clipBias:.003,shader:{name:'Observatory reflective spring',
      uniforms:{color:{value:new THREE.Color(0x32635b)},tDiffuse:{value:null},textureMatrix:{value:new THREE.Matrix4()},time:this.uniforms.time},
      vertexShader:`varying vec2 wp;varying vec4 reflectionUv;varying float fresnel;uniform mat4 textureMatrix;
        void main(){wp=position.xy*vec2(1.,-1.);reflectionUv=textureMatrix*vec4(position,1.);
          vec3 world=(modelMatrix*vec4(position,1.)).xyz;fresnel=pow(1.-abs(normalize(cameraPosition-world).y),3.);
          gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`varying vec2 wp;varying vec4 reflectionUv;varying float fresnel;uniform float time;uniform sampler2D tDiffuse;
        void main(){vec2 p=wp;float r=length((p-vec2(7.7,1.2))/vec2(2.9,4.));
          float ripple=sin(p.x*9.+sin(p.y*4.+time*.8)+time)*sin(p.y*7.-time*.6);
          float caustic=pow(max(0.,1.-abs(ripple)*5.),7.);
          vec4 reflected=reflectionUv;reflected.xy+=vec2(sin(p.x*3.+time*.6),cos(p.y*4.-time*.4))*.0017*reflected.w;
          vec3 reflection=texture2DProj(tDiffuse,reflected).rgb;
          vec3 bed=mix(vec3(.008,.045,.055),vec3(.08,.16,.10),smoothstep(.25,1.,r));
          vec3 c=mix(bed,reflection,.38+fresnel*.45);
          c+=vec3(.17,.24,.13)*caustic*.28;
          float glint=pow(max(0.,sin(p.x*2.+p.y*5.+sin(p.x*3.-time*.7))-.94)*16.,2.);
          c+=vec3(.55,.62,.42)*glint*.25;
          c+=smoothstep(.94,1.,r)*vec3(.16,.22,.11);
          gl_FragColor=vec4(c,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
        }` }});water.rotation.x=-Math.PI/2;this.waterReflection=water;(water.material as THREE.ShaderMaterial).uniforms.time=this.uniforms.time;
    water.position.copy(this.origin).add(new THREE.Vector3(0,.14,0));this.root.add(water);
    // Broad shafts have feathered edges and depth fade, never opaque cones.
    for(let i=0;i<4;i++){
      const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
        uniforms:{},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader:'varying vec2 vUv;void main(){float edge=pow(sin(vUv.x*3.14159),3.);float fade=sin(vUv.y*3.14159);gl_FragColor=vec4(.8,.73,.44,edge*fade*.028);}'});
      const ray=new THREE.Mesh(new THREE.PlaneGeometry(.65+i*.16,13),m);ray.position.copy(this.origin).add(new THREE.Vector3(-6+i*1.8,6,-4-i*.4));ray.rotation.z=-.42;this.root.add(ray);
    }
  }

  private buildReflectionProbe():void {
    // Bake the same original painted skydome used by the scene, in linear
    // light. Metals and opals now reflect its warm clouds/cool sky palette.
    const probe=new THREE.Scene();
    const source=this.root.getObjectByName('atelier_sky') as THREE.Mesh<THREE.SphereGeometry,THREE.ShaderMaterial>;
    const dome=new THREE.Mesh(new THREE.SphereGeometry(20,24,16),source.material.clone());probe.add(dome);
    const key=new THREE.Mesh(new THREE.PlaneGeometry(8,7),new THREE.MeshBasicMaterial({color:new THREE.Color(2.2,1.65,1.05),side:THREE.DoubleSide}));
    key.position.set(-8,9,4);key.lookAt(0,0,0);probe.add(key);
    const pmrem=new THREE.PMREMGenerator(this.renderer);this.reflection=pmrem.fromScene(probe,.04,.1,100);pmrem.dispose();disposeObject(probe);
    this.scene.environment=this.reflection.texture;this.scene.environmentIntensity=.38;
  }

  /** Artist-authored UV panels keep embroidery aligned with hems and hair grain.
   * The atlas is original painted source, not a projection of a character image. */
  private applyCouture(mesh:THREE.Mesh,m:THREE.MeshStandardMaterial):void {
    if(!m.name.startsWith('Couture')||!this.coutureAtlas)return;
    if(!mesh.geometry.getAttribute('uv')) {
      const p=mesh.geometry.getAttribute('position'),uv=new Float32Array(p.count*2);
      mesh.geometry.computeBoundingBox();const box=mesh.geometry.boundingBox!;
      for(let i=0;i<p.count;i++){uv[i*2]=(p.getX(i)-box.min.x)/Math.max(.001,box.max.x-box.min.x);uv[i*2+1]=(p.getY(i)-box.min.y)/Math.max(.001,box.max.y-box.min.y);}
      mesh.geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
    }
    const map=this.coutureAtlas.clone();this.coutureMaps.push(map);
    const hair=m.name.includes('hair'),pearl=m.name.includes('pearl'),teal=m.name.includes('teal');
    map.repeat.set(.482,.482);map.offset.set((hair||pearl?.5:0)+.009,(hair||teal?.5:0)+.009);
    if(m.name.includes('tailored')||m.name.includes('leather')){map.repeat.set(.22,.13);map.offset.set(.14,.035);}
    map.needsUpdate=true;m.map=map;m.vertexColors=false;
    m.color.setScalar(m.name.includes('leather')?.29:1);
  }

  private trackTextures(m:THREE.Material):void{for(const value of Object.values(m))if(value instanceof THREE.Texture)this.importedTextures.add(value);}

  /** Flow follows a ray-fitted path on the actual original cliff surface. */
  private paintSurfaceFlow(m:THREE.MeshStandardMaterial,points:number[][]):void{
    const previous=m.onBeforeCompile,key=m.customProgramCacheKey();
    m.onBeforeCompile=(s,r)=>{
      previous(s,r);s.uniforms.atelierFlowPath={value:points.map(p=>new THREE.Vector3(...p as [number,number,number]))};s.uniforms.atelierFlowTime=this.uniforms.time;
      s.fragmentShader='uniform vec3 atelierFlowPath[12];uniform float atelierFlowTime;\n'+s.fragmentShader;
      s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
        float flowDistance=100000.;float flowAlong=0.;
        for(int i=0;i<11;i++){vec3 a=atelierFlowPath[i],b=atelierFlowPath[i+1],d=b-a;
          float t=clamp(dot(atelierPosition-a,d)/dot(d,d),0.,1.);float dist=length(atelierPosition-(a+d*t));
          if(dist<flowDistance){flowDistance=dist;flowAlong=(float(i)+t)/11.;}}
        float flowMask=1.-smoothstep(.25,.80,flowDistance);
        float thread=pow(.5+.5*sin(flowAlong*180.-atelierFlowTime*5.+sin(atelierPosition.x*15.)*.5),3.);
        diffuseColor.rgb=mix(diffuseColor.rgb,mix(vec3(.12,.34,.36),vec3(.62,.81,.76),thread),flowMask*.85);`);
      s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.25,flowMask);');
      s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(.06,.13,.12)*flowMask*(.4+thread*.6);');
    };m.customProgramCacheKey=()=>key+'-original-surface-flow-12';
  }

  private paintMaterial(m:THREE.MeshStandardMaterial,wind:boolean,hero:boolean):void {
    const elder=m.name.startsWith('Reconstructed elder'),keeper=!!m.userData.atelierKeeper;
    const wood=m.name.startsWith('Heartwood'), stone=m.name.startsWith('Limestone')||m.name.startsWith('Cliff'), skin=m.name.startsWith('Skin');
    const moss=m.name.startsWith('Moss')||m.name.startsWith('Earth'), slate=m.name.startsWith('Carved');
    const textured=wood||stone||moss||slate;
    m.onBeforeCompile=s=>{
      s.uniforms.atelierTime=this.uniforms.time;s.uniforms.atelierImpact=keeper?this.keeperImpact:this.heroImpact;
      s.uniforms.pigmentAtlas={value:this.atlas};
      s.vertexShader='varying vec3 atelierPosition; uniform float atelierTime;\n'+s.vertexShader;
      s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        ${wind?`float sway=${elder?'smoothstep(5.,9.,position.y)':'1.'};transformed.x += sin(position.x*.7+position.z*.8+atelierTime*.9)*.055*sway; transformed.y += sin(position.x*1.8+atelierTime*1.4)*.025*sway;`:''}
        atelierPosition=transformed;`);
      s.fragmentShader=`varying vec3 atelierPosition; uniform sampler2D pigmentAtlas;uniform float atelierImpact;
        vec3 pigment(vec2 p,vec2 quadrant){return texture2D(pigmentAtlas,(abs(fract(p*.5)*2.-1.)*.982+.009)*.5+quadrant).rgb;}
        vec3 triPigment(vec3 p,vec3 n,vec2 quadrant){vec3 w=pow(abs(n),vec3(5.));w/=max(.0001,w.x+w.y+w.z);
          return pigment(p.yz,quadrant)*w.x+pigment(p.xz,quadrant)*w.y+pigment(p.xy,quadrant)*w.z;}
        `+s.fragmentShader;
      s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        float wash=sin(atelierPosition.x*5.7+sin(atelierPosition.z*4.))*sin(atelierPosition.y*8.3+atelierPosition.z*6.1);
        diffuseColor.rgb *= 1. + wash * ${hero||elder?'.015':'.065'};
        ${textured?`vec3 localN=normalize(cross(dFdx(atelierPosition),dFdy(atelierPosition)));
          vec3 tex=triPigment(atelierPosition*${wood?'vec3(.38,.20,.38)':'vec3(.36)'},localN,vec2(${wood?'0.,.5':stone?'.5,.5':moss?'0.,0.':'.5,0.'}));
          diffuseColor.rgb=${moss?'mix(diffuseColor.rgb,tex*vec3(.65,.76,.62),.38)':'tex*'+(wood?'vec3(.92,.82,.86)':stone?(m.name.startsWith('Cliff')?'vec3(.40,.59,.54)':'vec3(.88,.94,.91)'):'vec3(.9)')};
          ${m.name.startsWith('Cliff')?`vec3 highland=triPigment(atelierPosition*.11,localN,vec2(0.,0.))*vec3(.35,.55,.45);
          diffuseColor.rgb=mix(diffuseColor.rgb,highland,smoothstep(.40,.80,abs(localN.y))*.8);`:''}
          ${m.name.includes('moss-carved')?`vec3 bankMoss=triPigment(atelierPosition*.38,localN,vec2(0.,0.));
          diffuseColor.rgb=mix(diffuseColor.rgb,bankMoss*vec3(.48,.68,.50),smoothstep(.35,.72,abs(localN.y))*.88);`:''}
          #ifdef USE_COLOR
          diffuseColor.rgb *= vColor.rgb;
          #endif
          `:''}
        ${m.name.startsWith('Earth')?`float slope=1.-abs(localN.y);vec3 rockPigment=triPigment(atelierPosition*.24,localN,vec2(.5,.5));
          diffuseColor.rgb=mix(diffuseColor.rgb,rockPigment*vec3(.62,.76,.71),smoothstep(.13,.45,slope))*.60;`:''}
        ${m.name==='Skin • portrait albedo'?`diffuseColor.rgb=mix(vec3(.88,.53,.40),diffuseColor.rgb,smoothstep(.025,.08,atelierPosition.z));`:''}
        ${hero?`diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.25,.75,.32),pow(atelierImpact,3.)*.42);`:''}
        ${skin?`float blush=exp(-pow((abs(atelierPosition.x)-.093)*38.,2.)-pow((atelierPosition.y+.038)*50.,2.))*smoothstep(.05,.11,atelierPosition.z);
          diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.79,.30,.25),blush*.12);`:''}`);
      if(hero)s.fragmentShader=s.fragmentShader.replace('vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;',`
        vec3 artNormal=inverseTransformDirection(normal,viewMatrix);
        float facing=dot(artNormal,normalize(vec3(-.45,.85,-.4)));
        float band=smoothstep(-.08,.02,facing);
        vec3 outgoingLight=totalDiffuse*mix(vec3(.82,.85,.96),vec3(1.04,1.01,.96),band)+totalSpecular*.75+totalEmissiveRadiance;
        ${skin?'outgoingLight=mix(diffuseColor.rgb*vec3(.82,.75,.79),outgoingLight,.88);':''}`);
    };
    m.customProgramCacheKey=()=>`atelier-v3-${wind}-${hero}-${wood}-${stone}-${skin}-${moss}-${slate}-${m.name.startsWith('Earth')}-${m.name.startsWith('Cliff')}-${m.name.includes('portrait')}-${m.name.includes('moss-carved')}-${elder}-${keeper}`;
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
  private keeperInspectionShot(){
    const d=this.keeper.position.clone().sub(this.hero.root.position);
    return {cameraOffset:{x:d.x+1.1,y:d.y+1.6,z:d.z+3.4},lookAtOffset:{x:d.x,y:d.y+1.15,z:d.z}};
  }
  setView(view:number,cut=true):void {
    this.renderDirty=true;
    this.combatShot=false;this.view=view%6;
    const shots=[{cameraOffset:{x:5.4,y:4.2,z:10.5},lookAtOffset:{x:-1.4,y:2.6,z:-3.8}},
      {cameraOffset:{x:.95,y:this.sculptHero?1.52:1.42,z:this.sculptHero?3.3:2.9},lookAtOffset:{x:0,y:this.sculptHero?1.35:1.27,z:0}},null,
      {cameraOffset:{x:.76,y:this.sculptHero?1.95:1.70,z:1.04},lookAtOffset:{x:0,y:this.sculptHero?1.80:1.55,z:0}},
      this.keeperInspectionShot(),{cameraOffset:{x:6,y:7.6,z:17},lookAtOffset:{x:-2,y:4,z:-4}}];
    this.depthOfField.enabled=this.view===1||this.view===3||this.view===4;
    this.camera.setCutsceneShot(shots[this.view],cut?this.hero.root.position:undefined);
    if(this.view===2)this.camera.snapToIsometricFollow(this.hero.root.position);
  }
  nextView():void{this.setView(this.view+1);}
  update(dt:number,state:CharacterAnimationState,enemyImpact=0):void {
    if(dt>0)this.renderDirty=true;
    this.characterFill.position.copy(this.hero.root.position).add(new THREE.Vector3(.6,2.5,2.5));
    // A review pause must not repeatedly rasterize identical shadow maps.
    // Every actual simulation frame still refreshes moving actor shadows.
    if(dt>0)this.keyLight.shadow.needsUpdate=true;
    this.heroImpact.value=THREE.MathUtils.clamp(state.hitFlashTimer/.22,0,1);this.keeperImpact.value=THREE.MathUtils.clamp(enemyImpact/.22,0,1);
    this.reconstructedHero?.update(dt,this.clock);this.portrait?.update();this.secondary?.update(dt,this.clock);
    for(const mesh of this.facialSculpts)for(const [name,index] of Object.entries(mesh.morphTargetDictionary??{})){
      const source=this.portraitDriver?.morphTargetDictionary?.[name];
      mesh.morphTargetInfluences![index]=source===undefined?0:this.portraitDriver?.morphTargetInfluences?.[source]??0;
    }
    this.clock+=dt;this.uniforms.time.value=this.clock;
    if(this.view===4)this.camera.setCutsceneShot(this.keeperInspectionShot());this.castAge+=dt;
    if(this.keeperArt){this.keeperArt.rotation.y=this.keeperFacing.rotation.y;this.keeperArt.position.y=(this.sculptKeeper?.15:0)+Math.sin(this.clock*1.7)*.065;this.keeperArt.rotation.z=this.keeperImpact.value*.08*Math.sin(this.clock*34);this.keeperArt.rotation.x=-this.keeperImpact.value*.04;}
    this.distortion.uniforms.age.value=this.castAge;
    const casting=state.attackComboStep===4 && state.skillSlot==='skill1';
    if(this.view===0&&casting&&!this.combatShot){
      this.combatShot=true;
      this.camera.setCutsceneShot({cameraOffset:{x:4.4,y:2.8,z:5.4},lookAtOffset:{x:0,y:1.2,z:-3.1}});
    }else if(this.view===0&&this.combatShot&&!casting&&this.castAge>=2.65)this.setView(0,false);
    const marker=casting?heroReleaseProgress(this.hero.classId,state):1;
    const winding=casting && state.attackSwingProgress<marker;
    this.charge.visible=winding;
    if(winding){const palm=this.hero.getSpellEmitter(false);if(palm)this.charge.position.copy(palm);
      this.charge.scale.setScalar(.2+state.attackSwingProgress/marker*1.1);}
    
    this.cast.visible=this.castAge<2.65;
    this.halo.material.uniforms.age.value=this.castAge;
    this.impact.material.uniforms.age.value=this.castAge;
    this.impact.quaternion.copy(this.camera.camera.quaternion);this.impact.rotateZ(-.45+this.castAge*1.2);
    this.impact.scale.setScalar(.65+Math.min(.24,this.castAge)*2.2);
    this.halo.rotation.z=this.castAge*.08;
    for(const r of this.ribbons){(r.material as THREE.ShaderMaterial).uniforms.age.value=this.castAge;r.rotation.y=Math.sin(this.castAge*.6+Number(r.userData.stroke))*.08;}
    (this.sparks.material as THREE.PointsMaterial).opacity=Math.max(0,Math.sin(this.castAge/2.6*Math.PI))*.75;
    this.sparks.rotation.y=this.castAge*.32;
    this.light.intensity=this.castAge<2.6?(.5+.5*Math.sin(Math.min(1,this.castAge/.3)*Math.PI*.5))*14*Math.max(0,1-this.castAge/2.6):0;
    if(winding){const palm=this.hero.getSpellEmitter(false);if(palm)this.light.position.copy(palm);this.light.distance=4;this.light.intensity=2+6*state.attackSwingProgress/marker;}
    else this.light.distance=11;
    const pollen=this.root.getObjectByName('atelier_pollen');if(pollen)pollen.rotation.y=this.clock*.008;
    // Layered follow-through complements the authored hair follower and coat bones.
    for(const g of this.fitted){
      if(g.name==='atelier_Coat')g.rotation.x=Math.sin(this.clock*1.4)*.018+(state.isMoving?.07:0);}
  }
  render():void{
    const size=this.renderer.getSize(new THREE.Vector2());
    // Freeze means freeze. Re-submitting the identical scene while the shared
    // pause owner is active only queues redundant GPU work behind screenshots.
    // Camera cuts/resizes still invalidate; live frames always render above.
    if(!this.renderDirty&&size.x===this.width&&size.y===this.height&&this.lastCameraPosition.equals(this.camera.camera.position)&&this.lastCameraRotation.equals(this.camera.camera.quaternion))return;
    this.renderDirty=false;this.lastCameraPosition.copy(this.camera.camera.position);this.lastCameraRotation.copy(this.camera.camera.quaternion);
    const now=performance.now();if(this.frameAt){this.intervals.push(now-this.frameAt);if(this.intervals.length>90)this.intervals.shift();}this.frameAt=now;
    if(this.depthOfField.enabled){const focus=(this.view===4?this.keeper:this.hero.root.getObjectByName('Head')!).getWorldPosition(new THREE.Vector3());if(this.view===4)focus.y+=1.15;(this.depthOfField.uniforms as Record<string,THREE.IUniform>).focus.value=this.camera.camera.position.distanceTo(focus);}
    if(size.x!==this.width||size.y!==this.height){this.width=size.x;this.height=size.y;this.composer.setSize(size.x,size.y);const ratio=this.renderer.getPixelRatio();this.antialias.uniforms.resolution.value.set(1/(size.x*ratio),1/(size.y*ratio));}
    this.depthOfField.uniforms.tDepth.value=this.composer.readBuffer.depthTexture;this.depthOfField.uniforms.aspect.value=size.x/size.y;
    this.renderer.info.autoReset=false;this.renderer.info.reset();
    this.composer.render();
    this.frameStats={calls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles};
    this.renderer.info.autoReset=true;
  }
  diagnostics(){return {ready:this.loaded,view:this.view,simulationTime:this.clock,tree:this.sculptTree?(this.porousTree?'sculpt-conditioned porous foliage':'original reconstructed elder'):'authored growth',hero:this.sculptHero?'original fitted reconstruction':'UV couture',keeperArt:this.sculptKeeper?'original reconstruction':'authored corolla',castAge:this.castAge,frameIntervalMs:this.intervals.length?this.intervals.reduce((a,b)=>a+b,0)/this.intervals.length:null,calls:this.frameStats.calls,triangles:this.frameStats.triangles};}
  inspectArt(){return this.reconstructedHero?.inspect();}
  dispose():void{
    if(this.disposed)return;this.disposed=true;
    this.reconstructedHero?.dispose();this.secondary?.dispose();
    if(this.portrait){this.portrait.root.removeFromParent();disposeObject(this.portrait.root);}
    if(this.keeperArt){this.keeperArt.removeFromParent();disposeObject(this.keeperArt);}
    this.hidden.forEach(o=>{o.visible=true;});this.fitted.forEach(g=>{g.removeFromParent();disposeObject(g);});
    if(this.bodyFitted){
      this.hero.root.scale.setScalar(1);for(const side of ['L','R'])for(const part of ['UpperArm','ShoulderPlate'])this.hero.root.getObjectByName(part+'.'+side)!.position.x/=.83;
      const head=this.hero.root.getObjectByName('Head')!;head.position.y=.744;head.scale.setScalar(.96);
      const underlayer=this.hero.root.getObjectByName('Weighted sleeves and trousers') as THREE.SkinnedMesh;
      if(underlayer&&this.originalUnderlayer){underlayer.geometry.dispose();underlayer.geometry=this.originalUnderlayer;}
      for(const [mesh,material] of this.originalMaterials){const current=Array.isArray(mesh.material)?mesh.material:[mesh.material];current.forEach(m=>m.dispose());mesh.material=material;}
    }
    this.oldLights.forEach((visible,l)=>{l.visible=visible;});this.scene.background=this.oldBackground;this.scene.fog=this.oldFog;
    this.camera.camera.far=this.oldFar;this.camera.camera.updateProjectionMatrix();this.renderer.toneMapping=this.oldTone;this.renderer.toneMappingExposure=this.oldExposure;this.camera.setCutsceneShot(null);
    this.scene.environment=this.oldEnvironment;this.scene.environmentIntensity=this.oldEnvironmentIntensity;this.reflection?.dispose();this.waterReflection?.getRenderTarget().dispose();
    this.importedTextures.forEach(t=>t.dispose());this.atlas?.dispose();this.coutureMaps.forEach(t=>t.dispose());this.coutureAtlas?.dispose();this.leafAtlas?.dispose();this.faceAtlas?.dispose();this.skyAtlas?.dispose();this.energyAtlas?.dispose();this.root.removeFromParent();disposeObject(this.root);this.composer.passes.forEach(p=>p.dispose());this.composer.dispose();
  }
}
