import * as THREE from 'three';

/** A short exposure of the existing animated instrument, never a new motion path. */
export class AtelierWeaponTrail {
  readonly mesh:THREE.Mesh<THREE.BufferGeometry,THREE.ShaderMaterial>;
  private readonly samples:{time:number;tip:THREE.Vector3;base:THREE.Vector3}[]=[];
  private readonly positions=new Float32Array(24*2*3);
  private readonly uv=new Float32Array(24*2*2);
  private readonly fade=new Float32Array(24*2);
  private readonly tip=new THREE.Vector3();
  private readonly base=new THREE.Vector3();
  private readonly lifetime=.20;

  constructor(private readonly instrument:THREE.Object3D,texture:THREE.Texture){
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(this.positions,3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('uv',new THREE.BufferAttribute(this.uv,2).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('exposure',new THREE.BufferAttribute(this.fade,1).setUsage(THREE.DynamicDrawUsage));
    const indices:number[]=[];for(let i=0;i<23;i++){const a=i*2;indices.push(a,a+1,a+3,a,a+3,a+2);}
    geometry.setIndex(indices);geometry.setDrawRange(0,0);
    this.mesh=new THREE.Mesh(geometry,new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
      uniforms:{ink:{value:texture}},vertexShader:`attribute float exposure;varying vec2 trailUv;varying float opacity;
        void main(){trailUv=uv;opacity=exposure;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`uniform sampler2D ink;varying vec2 trailUv;varying float opacity;
        void main(){vec4 stroke=texture2D(ink,vec2(trailUv.x*.8,trailUv.y));
          float feather=smoothstep(0.,.12,trailUv.y)*(1.-smoothstep(.85,1.,trailUv.y));
          gl_FragColor=vec4(stroke.rgb*vec3(.7,1.,1.1),stroke.a*opacity*feather*.48);}`
    }));
    this.mesh.name='Celestia • instrument motion exposure';this.mesh.frustumCulled=false;this.mesh.visible=false;
  }

  update(time:number,dt:number,active:boolean):void {
    if(dt<=0)return;
    this.instrument.updateWorldMatrix(true,false);this.mesh.updateWorldMatrix(true,false);
    // The authored crescent's throat and tip in the original glTF, transformed
    // by the canonical Weapon joint after the game animator runs.
    this.tip.set(.01,0,1.59).applyMatrix4(this.instrument.matrixWorld);this.mesh.worldToLocal(this.tip);
    this.base.set(.01,0,.92).applyMatrix4(this.instrument.matrixWorld);this.mesh.worldToLocal(this.base);
    let prior=this.samples.at(-1);
    if(prior&&(time<prior.time||this.tip.distanceTo(prior.tip)>2.5)){this.samples.length=0;prior=undefined;}
    while(this.samples.length&&time-this.samples[0].time>this.lifetime)this.samples.shift();
    if(active&&(!prior||this.tip.distanceToSquared(prior.tip)>.000025||this.base.distanceToSquared(prior.base)>.000025)){
      this.samples.push({time,tip:this.tip.clone(),base:this.base.clone()});if(this.samples.length>24)this.samples.shift();
    }
    const count=this.samples.length;this.mesh.visible=count>1;this.mesh.geometry.setDrawRange(0,Math.max(0,count-1)*6);
    for(let i=0;i<count;i++){
      const sample=this.samples[i],alpha=Math.pow(Math.max(0,1-(time-sample.time)/this.lifetime),1.6);
      sample.base.toArray(this.positions,i*6);sample.tip.toArray(this.positions,i*6+3);
      this.uv.set([i/Math.max(1,count-1),0,i/Math.max(1,count-1),1],i*4);this.fade[i*2]=this.fade[i*2+1]=alpha;
    }
    for(const name of ['position','uv','exposure'])this.mesh.geometry.getAttribute(name).needsUpdate=true;
  }

  dispose():void{this.mesh.removeFromParent();this.mesh.geometry.dispose();this.mesh.material.dispose();}
}
