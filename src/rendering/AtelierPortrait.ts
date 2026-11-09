import * as THREE from 'three';

/** The sculpt exports its front surface; feature fitting never guesses a second
 * head shape. Existing HeroFace morph weights drive this higher fidelity art. */
export interface PortraitSurface {schemaVersion:number;nx:number;ny:number;bounds:[number,number,number,number];depth:number[]}
const SHAPES=['Blink','Focus','Concern','Gaze','SpeakOpen','SpeakWide','SpeakRound'] as const;
type Feature='eye'|'brow'|'mouth'|'nose';
type Point=[number,number];

export class AtelierPortrait {
  readonly root=new THREE.Group();
  private readonly meshes:THREE.Mesh[]=[];
  private readonly gaze={value:0};
  constructor(private surface:PortraitSurface,private driver:THREE.Mesh){
    if(surface.schemaVersion!==1||surface.depth.length!==surface.nx*surface.ny)throw Error('Invalid portrait sculpt surface');
    this.root.name='Atelier expressive portrait';
    for(const side of [-1,1])this.eye(side);
    this.stroke([[-.025,-.084],[-.014,-.083],[-.004,-.082],[.006,-.082],[.016,-.083],[.025,-.084]],.0012,0x784855,'mouth',0,.003);
    this.stroke([[-.018,-.086],[-.006,-.090],[.005,-.091],[.016,-.087]],.0018,0xc47e7d,'mouth',0,.0032);
    this.stroke([[-.009,-.091],[0,-.092],[.009,-.090]],.0008,0xeab0a0,'mouth',0,.004);
    for(const side of [-1,1]){
      this.stroke([[side*.006,-.040],[side*.012,-.041],[side*.016,-.038]],.00055,0xb78170,'nose',side,.002);
    }
  }

  private depth(x:number,y:number):number{
    const {nx,ny,bounds:b,depth:d}=this.surface;
    const u=THREE.MathUtils.clamp((x-b[0])/(b[2]-b[0])*(nx-1),0,nx-1.001);
    const v=THREE.MathUtils.clamp((y-b[1])/(b[3]-b[1])*(ny-1),0,ny-1.001);
    const i=Math.floor(u),j=Math.floor(v),a=u-i,c=v-j;
    return THREE.MathUtils.lerp(THREE.MathUtils.lerp(d[j*nx+i],d[j*nx+i+1],a),THREE.MathUtils.lerp(d[(j+1)*nx+i],d[(j+1)*nx+i+1],a),c);
  }
  private expression(x:number,y:number,shape:string,feature:Feature,side:number):Point{
    if(feature==='eye'){
      const center=side*.065;const line=.007+(x-center)*side*.18;
      if(shape==='Blink')return [x,line+(y-line)*.018];
      if(shape==='Focus')return [x,line+(y-line)*.78];
      if(shape==='Concern')return [x,y+.003];
    }
    if(feature==='brow'){
      const inner=1-THREE.MathUtils.clamp((x*side-.025)/.086,0,1);
      if(shape==='Focus')return [x,y-.012*inner+.002];
      if(shape==='Concern')return [x,y+.014*inner-.002];
    }
    if(feature==='mouth'){
      if(shape==='SpeakOpen')return [x*.90,-.084+(y+.084)*3.2];
      if(shape==='SpeakRound')return [x*.62,-.084+(y+.084)*2.8];
      if(shape==='SpeakWide')return [x*1.1,-.084+(y+.084)*1.8];
    }
    return [x,y];
  }
  private geometry(points:Point[],faces:number[],feature:Feature,side:number,layer:number,uv?:number[]):THREE.BufferGeometry{
    const positions:number[]=[],morphs=SHAPES.map(()=>[] as number[]);
    for(const [x,y] of points){
      const z=this.depth(x,y)+layer;positions.push(x,y,z);
      SHAPES.forEach((shape,i)=>{const [u,v]=this.expression(x,y,shape,feature,side);morphs[i].push(u-x,v-y,this.depth(u,v)+layer-z);});
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(faces);
    if(uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    g.morphTargetsRelative=true;g.morphAttributes.position=morphs.map((a,i)=>{const attr=new THREE.Float32BufferAttribute(a,3);attr.name=SHAPES[i];return attr;});g.computeVertexNormals();return g;
  }
  private add(g:THREE.BufferGeometry,m:THREE.Material):THREE.Mesh{
    const mesh=new THREE.Mesh(g,m);mesh.frustumCulled=false;this.root.add(mesh);this.meshes.push(mesh);return mesh;
  }
  private stroke(points:Point[],width:number,color:number,feature:Feature,side:number,layer:number):void{
    const path=new THREE.CatmullRomCurve3(points.map(([x,y])=>new THREE.Vector3(x,y,0)));
    const p:Point[]=[],f:number[]=[];const samples=40;
    for(let i=0;i<=samples;i++){
      const t=i/samples,c=path.getPoint(t),tangent=path.getTangent(t);const w=width*Math.sin(Math.PI*t)**.38;
      for(const s of [-1,1])p.push([c.x-tangent.y*w*s,c.y+tangent.x*w*s]);
      if(i){const q=(i-1)*2;f.push(q,q+1,q+3,q,q+3,q+2);}
    }
    this.add(this.geometry(p,f,feature,side,layer),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));
  }
  private eye(side:number):void{
    const cx=side*.065;
    const map=(x:number,y:number):Point=>[cx+side*x,y];
    const upper:Point[]=[[-.043,.000],[-.028,.017],[-.007,.022],[.017,.022],[.045,.013]];
    const lower:Point[]=[[-.043,.000],[-.023,-.008],[.002,-.009],[.027,-.002],[.045,.013]];
    const curve=(ps:Point[])=>new THREE.CatmullRomCurve3(ps.map(([x,y])=>new THREE.Vector3(x,y,0)));
    const top=curve(upper),bottom=curve(lower);const points:Point[]=[],faces:number[]=[],uv:number[]=[];const nx=36,ny=10;
    for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
      const t=i/nx,v=j/ny,a=bottom.getPoint(t),b=top.getPoint(t);
      points.push(map(THREE.MathUtils.lerp(a.x,b.x,v),THREE.MathUtils.lerp(a.y,b.y,v)));uv.push(t,v);
      if(j&&i){const q=(j-1)*(nx+1)+i-1;faces.push(q,q+1,q+nx+2,q,q+nx+2,q+nx+1);}
    }
    const material=new THREE.ShaderMaterial({side:THREE.DoubleSide,uniforms:{gaze:this.gaze,eyeSide:{value:side}},
      vertexShader:`varying vec2 vUv;
        #include <morphtarget_pars_vertex>
        void main(){vUv=uv;#include <begin_vertex>
          #include <morphtarget_vertex>
          gl_Position=projectionMatrix*modelViewMatrix*vec4(transformed,1.);}`.replace(';#include',';\n#include'),
      fragmentShader:`varying vec2 vUv;uniform float gaze;uniform float eyeSide;
        void main(){vec2 p=vec2((vUv.x-.48-gaze*.09*eyeSide)*2.55,(vUv.y-.51)*1.08);float r=length(p);float a=atan(p.y,p.x);
          vec3 white=mix(vec3(.75,.58,.57),vec3(.96,.91,.86),smoothstep(0.,.18,min(vUv.x,1.-vUv.x)));
          white*=.82+.18*(1.-smoothstep(.45,.96,vUv.y));
          float radial=.5+.5*sin(a*51.+sin(a*19.)*.7+r*21.);float fibers=.5+.5*sin(a*103.+r*27.);
          vec3 iris=mix(vec3(.035,.14,.25),vec3(.17,.63,.67),smoothstep(.10,.43,r));
          iris+=vec3(.05,.10,.06)*radial+vec3(.035,.05,.035)*fibers;
          iris=mix(iris,vec3(.015,.047,.09),smoothstep(.37,.43,r));
          iris=mix(iris,vec3(.014,.022,.04),1.-smoothstep(.14,.18,length(p*vec2(1.1,.82))));
          iris+=vec3(.19,.13,.035)*exp(-pow((r-.20)*27.,2.));
          vec3 c=mix(white,iris,1.-smoothstep(.42,.435,r));
          float glint=1.-smoothstep(.04,.065,length(p-vec2(-.12,.17)));
          float secondary=(1.-smoothstep(.016,.036,length(p-vec2(.14,-.12))))*.75;
          c=mix(c,vec3(1.,.98,.91),max(glint,secondary));gl_FragColor=vec4(c,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`});
    this.add(this.geometry(points,faces,'eye',side,.007,uv),material);
    this.stroke(upper.map(([x,y])=>map(x,y)),.0028,0x232332,'eye',side,.008);
    this.stroke(lower.map(([x,y])=>map(x,y)),.00085,0xa36a69,'eye',side,.007);
    this.stroke(upper.slice(1).map(([x,y])=>map(x,y+.007)),.00065,0xc28b7e,'eye',side,.002);
    this.stroke([[.035,.021],[.045,.024],[.055,.030]].map(([x,y])=>map(x,y)),.0017,0x232332,'eye',side,.008);
    this.stroke([[.038,.018],[.048,.018],[.054,.021]].map(([x,y])=>map(x,y)),.0010,0x232332,'eye',side,.008);
    this.stroke([[-.037,.041],[-.015,.046],[.009,.047],[.034,.042]].map(([x,y])=>map(x,y)),.0020,0x526278,'brow',side,.004);
  }
  update():void{
    for(const mesh of this.meshes)for(const shape of SHAPES){
      const source=this.driver.morphTargetDictionary?.[shape],target=mesh.morphTargetDictionary?.[shape];
      if(source!==undefined&&target!==undefined)mesh.morphTargetInfluences![target]=this.driver.morphTargetInfluences?.[source]??0;
    }
    const gaze=this.driver.morphTargetDictionary?.Gaze;this.gaze.value=gaze===undefined?0:this.driver.morphTargetInfluences?.[gaze]??0;
  }
}
