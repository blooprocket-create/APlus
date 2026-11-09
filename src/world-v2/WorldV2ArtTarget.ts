import * as THREE from 'three';
import { beam, piece, smoothLoft } from '../rendering/ArtMesh';
import { buildRefugeLodge } from '../rendering/HearthmereRefuge';
import { HearthmereGiant } from '../rendering/HearthmereGiant';
import { disposeObject } from '../rendering/SceneResources';
import type { WorldPosition } from './WorldCoordinates';

/**
 * Opt-in, in-engine art-direction study on the ACTUAL streamed World V2 terrain.
 * No new combat owner, story canon, world seed, collision or player saves.
 * Placement and look are temporary until reviewed. The original geometry,
 * character rigs and painted renderer are used wherever possible.
 */
export interface WorldV2ArtTarget {
  readonly root: THREE.Group;
  update(timeSeconds: number, origin: WorldPosition): void;
  setEffectsEnabled(enabled: boolean): boolean;
  dispose(): void;
}

function random(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

export function createWorldV2ArtTarget(
  scene: THREE.Scene,
  center: WorldPosition,
  groundHeight: (x: number, z: number) => number | null,
): WorldV2ArtTarget {
  const root = new THREE.Group();
  root.name = 'Hearthmere production-look target (temporary staging composition)';
  scene.add(root);
  const colors = new Map<number, THREE.MeshLambertMaterial>();
  const paint = (hex: number): THREE.MeshLambertMaterial => {
    let material = colors.get(hex);
    if (!material) {
      material = new THREE.MeshLambertMaterial({ color: hex });
      colors.set(hex, material);
    }
    return material;
  };
  const at = (x: number, z: number) => groundHeight(center.x + x, center.z + z) ?? center.y;
  const stone = [0x6b7573, 0x8b9390, 0x879482, 0xa19b8f];
  const warm = new THREE.Color(0xffd3a0);
  const shadow = paint(0x423c43);
  const brass = paint(0xc69e61);
  const bark = paint(0x574938);

  // Meandering rain-darkened stone footpath, following real terrain heights.
  // Intentional variation, no repeating square-grid tile pattern.
  const rng = random(0x71a2c3);
  for (let band = -15; band < 7; band += 1.12) {
    const xCenter = 2.4 * Math.sin(band * .14) - .5;
    for (let col = -2; col <= 2; col++) {
      if (rng() < .20) continue;
      const x = xCenter + col * .95 + (rng() - .5) * .55;
      const z = band + (rng() - .5) * .32;
      const y = at(x, z) + .015;
      const cobble = piece(root, new THREE.DodecahedronGeometry(.5, 0),
        paint(stone[(Math.floor(rng() * stone.length)) % stone.length]), x, y, z);
      cobble.scale.set(.74 + rng() * .42, .047 + rng() * .016, .81 + rng() * .47);
      cobble.rotation.y = rng() * Math.PI;
      cobble.receiveShadow = true;
    }
  }

  // A few reflective patches break the path's repetitive dry surface. They are
  // cheap presentation-only meshes with feathered, uneven boundaries.
  const wet = new THREE.MeshBasicMaterial({
    color:0x688ca9, transparent:true,opacity:.23,depthWrite:false,
    side:THREE.DoubleSide,
  });
  for(const [x,z,rx,rz] of [
    [-2.8,2.7,1.15,.53],[2.4,.3,.83,.34],
    [3.1,-7.7,1.9,.48],[-1.7,-11.3,1.17,.35],
  ]) {
    const puddle=piece(root,new THREE.CircleGeometry(1,32),wet,x,at(x,z)+.09,z);
    puddle.rotation.x=-Math.PI/2;
    puddle.scale.set(rx,rz,1);
  }

  // One actual authored Hearthmere lodge, reused rather than a billboard or
  // environment concept image; terrain-grounded and framed by foliage.
  const lodge = new THREE.Group();
  lodge.position.set(-10.8, at(-10.8, -12.0), -12.0);
  lodge.rotation.y = .18;
  buildRefugeLodge(lodge, 0, 0, 8.0, 5.6, paint);
  root.add(lodge);

  // Theatre-style distant mountain silhouettes and veiled cascades. These
  // are REAL background meshes in the 3D scene, not a flat concept-art image,
  // and do not replace walkable geographical data or collisions.
  const ridgePaint = [paint(0x45586b),paint(0x667581),paint(0x7a858b)];
  const ridges = [
    { z:-78, width:91, height:25, color:ridgePaint[0], shift:-8 },
    { z:-62, width:83, height:18, color:ridgePaint[1], shift:4 },
    { z:-53, width:77, height:12, color:ridgePaint[2], shift:9 },
  ];
  for(const [i,ridge] of ridges.entries()) {
    const profile=new THREE.Shape();
    profile.moveTo(-ridge.width/2,0);
    for(let j=0;j<=32;j++) {
      const x=-ridge.width/2+j/32*ridge.width;
      const wave=Math.abs(Math.sin(j*.57+i*1.9))*.46 +
        Math.abs(Math.sin(j*.19-i*.83))*.40 +
        Math.abs(Math.sin(j*1.39+i*.13))*.14;
      const h=ridge.height*(.33+.67*wave);
      profile.lineTo(x,h);
    }
    profile.lineTo(ridge.width/2,0);
    profile.closePath();
    const wall=piece(root,new THREE.ExtrudeGeometry(profile,{
      depth:1.8,bevelEnabled:true,bevelThickness:.6,bevelSize:.65,
      bevelSegments:1,steps:1,
    }),ridge.color,ridge.shift,center.y-4,ridge.z);
    wall.receiveShadow=true;
  }

  // Weathered stone gateway: deliberately irregular, hand-composed silhouette.
  const arch = new THREE.Group();
  arch.position.set(6.9, at(6.9, -12.9), -12.9);
  arch.rotation.y = -.13;
  root.add(arch);
  for (const side of [-1, 1]) {
    const pillar = piece(arch, smoothLoft([[0,.56,.51],[.4,.62,.55],
      [2.3,.47,.51],[3.6,.50,.48],[4.1,.63,.58]], 10),
    paint(side < 0 ? 0x9b978e : 0xb0a69a), side * 3.1, 0, 0);
    pillar.castShadow = pillar.receiveShadow = true;
    piece(arch, new THREE.BoxGeometry(1.26, .29, 1.25), shadow,
      side * 3.1, 3.91, 0).castShadow = true;
  }
  const lintel = beam(arch, paint(0x7f7773),
    new THREE.Vector3(-3.8,4.26,0), new THREE.Vector3(3.8,4.26,0), .68, .9);
  lintel.castShadow = true;
  const crest = piece(arch, new THREE.TorusGeometry(.55,.065,8,44),
    brass,0,4.44,.55);
  crest.castShadow = true;
  const bannerMaterial = new THREE.MeshLambertMaterial({ color: 0x445078, side: THREE.DoubleSide });
  for (const side of [-1, 1]) {
    const banner = piece(arch, new THREE.PlaneGeometry(.7, 2.2, 1, 5),
      bannerMaterial, side * 2.45, 2.7, .58);
    const positions = banner.geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i++) {
      positions.setZ(i, Math.sin(positions.getY(i) * 1.5 + side) * .09);
    }
    banner.geometry.computeVertexNormals();
  }

  // A few unique crooked flowering trees, not a wall of repeated cones.
  const blossoms = [0xa29abd, 0xd7b2c8, 0xf0d0d4, 0x8eaaa0, 0xe5b5d5];
  for (const [index, x, z, scale] of [
    [0, -15.3, 1.2, 1.12], [1, 12.6, 0.2, .98], [2, -14.5, -17.0, 1.23],
    [3, 15.7, -17.5, 1.35],
  ]) {
    const tree = new THREE.Group();
    tree.position.set(x, at(x,z), z);
    tree.scale.setScalar(scale);
    tree.rotation.y = index * 1.13;
    root.add(tree);
    const trunk = piece(tree, smoothLoft([
      [0,.42,.38],[.8,.39,.34],[2.2,.29,.27,.10],
      [4.1,.21,.19,.38,.15],[5.2,.10,.12,.52,.32],
    ], 16), bark);
    trunk.castShadow = true;
    for (let branch = 0; branch < 5; branch++) {
      const a = branch * Math.PI * 2 / 5 + index * .27;
      const sx = Math.cos(a) * (2.4 + (branch % 2) * .4);
      const sz = Math.sin(a) * 1.85;
      const end = new THREE.Vector3(sx, 5.5 + (branch % 3) * .28, sz);
      const wood = beam(tree, bark, new THREE.Vector3(.13,3.6,.14),
        end, .19, .17);
      wood.castShadow = true;
      for (let clump = 0; clump < 2; clump++) {
        const cx = sx + (clump ? .53 : -.33);
        const cy = end.y + (clump ? .62 : -.2);
        const cz = sz + (clump ? .12 : -.34);
        const crown = piece(tree, smoothLoft([
          [-.75,.15,.17],[-.54,.70,.69],[-.20,.94,.91],
          [.25,.95,.90],[.66,.57,.53],[.79,.11,.14],
        ],18), paint(blossoms[(branch + index + clump) % blossoms.length]),
        cx,cy,cz);
        crown.scale.set(1.45 + clump * .25,1.15,1.35);
        crown.rotation.z = Math.sin(a) * .12;
        crown.castShadow = crown.receiveShadow = true;
      }
    }
  }

  // Existing story giant used here only as distant cinematic set dressing.
  // Real giant gameplay and AI remain owned by the actual Hearthmere engine.
  const giant = new HearthmereGiant();
  giant.root.position.set(14.0,at(14,-43),-43);
  giant.root.scale.setScalar(.91);
  giant.root.rotation.y=Math.PI-.45;
  root.add(giant.root);

  // Wisps of draping wisteria-like flowers and hanging leaf trails punctuate
  // the near silhouette without filling the whole play area with particles.
  const flowering=paint(0xcab2d9);
  for(const [x,z] of [[-14.5,1.0],[12.3,.1],[-14.8,-17]]) {
    const y=at(x,z)+5.9;
    for(let j=0;j<7;j++){
      const px=x+(rng()-.5)*3.7;
      const pz=z+(rng()-.5)*2.3;
      const strand=piece(root,new THREE.CylinderGeometry(.015,.035,.7+rng()*1.5,5),
        flowering,px,y-rng()*.9,pz);
      strand.rotation.z=(rng()-.5)*.22;
      for(let p=0;p<3;p++) {
        const petal=piece(root,new THREE.SphereGeometry(.08,6,5),
          paint(blossoms[(p+j)%blossoms.length]),
          px+(rng()-.5)*.22,y-.35-p*.27,pz+(rng()-.5)*.19);
        petal.scale.set(1.0,1.7,.72);
      }
    }
  }

  // Warm lantern pools anchor the storybook mood and foreground silhouette.
  const pointLights: THREE.PointLight[] = [];
  for (const [x,z] of [[-5.6,-8.7],[5.1,-7.5],[-9.1,-3.9],[9.9,-3.2]]) {
    const y = at(x,z);
    const post = piece(root, new THREE.CylinderGeometry(.09,.12,2.4,8),
      shadow,x,y+1.2,z);
    post.castShadow = true;
    const lantern = piece(root,new THREE.OctahedronGeometry(.32,0),
      new THREE.MeshBasicMaterial({color:0xffd6a0}),x,y+2.52,z);
    lantern.scale.set(.82,1.08,.82);
    piece(root,new THREE.CylinderGeometry(.38,.38,.07,8),brass,x,y+2.89,z);
    if (pointLights.length < 2) {
      const light = new THREE.PointLight(warm,3.8,10.5,2);
      light.position.set(x,y+2.5,z);
      root.add(light);
      pointLights.push(light);
    }
  }

  // Soft vertical cascade lights give the distant cliffs a magical landmark.
  const fallMaterial=new THREE.ShaderMaterial({
    uniforms:{uTime:{value:0}},
    transparent:true,depthWrite:false,side:THREE.DoubleSide,
    vertexShader:[
      'varying vec2 vUv;',
      'void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    ].join('\n'),
    fragmentShader:[
      'uniform float uTime; varying vec2 vUv;',
      'void main(){float stream=.5+.5*sin(vUv.x*19.0+sin(vUv.y*9.0+uTime)*1.3);',
      'float fade=smoothstep(0.0,.18,vUv.x)*(1.0-smoothstep(.82,1.0,vUv.x));',
      'fade*=smoothstep(0.0,.1,vUv.y)*(1.0-smoothstep(.89,1.0,vUv.y));',
      'gl_FragColor=vec4(vec3(.58,.79,.89),fade*(.17+.14*stream));',
      '#include <tonemapping_fragment>',
      '#include <colorspace_fragment>',
      '}',
    ].join('\n'),
  });
  for(const [x,z,w,h] of [[-17,-51,3.5,15],[30,-58,5.1,20]]) {
    const fall=piece(root,new THREE.PlaneGeometry(w,h),fallMaterial,
      x,center.y-2+h*.5,z+2);
    fall.renderOrder=5;
  }

  // Painterly ground-hugging fog: intentionally faint, with a soft feathered
  // silhouette and independent animated wavelengths.
  const fogMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime:{value:0}, uColor:{value:new THREE.Color(0xa0b5cc)} },
    transparent:true, depthWrite:false, side:THREE.DoubleSide,
    vertexShader: [
      'varying vec2 vUv;',
      'void main() { vUv = uv;',
      'gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    ].join('\n'),
    fragmentShader: [
      'uniform float uTime; uniform vec3 uColor; varying vec2 vUv;',
      'void main() { vec2 p=vUv*2.0-1.0;',
      'float edge=pow(max(0.0,1.0-dot(p,p)),1.9);',
      'float waves=.68+.20*sin(p.x*10.0+uTime*.36)+.12*sin(p.y*13.0-uTime*.2);',
      'gl_FragColor=vec4(uColor,edge*waves*.095);',
      '#include <tonemapping_fragment>',
      '#include <colorspace_fragment>',
      '}',
    ].join('\n'),
  });
  const mist = piece(root,new THREE.PlaneGeometry(31,24),fogMaterial,
    0,center.y+.2,-4.0);
  mist.rotation.x = -Math.PI/2;
  mist.renderOrder = 7;

  // Soft animated motes, petals and magic glints. GPU points are budgeted:
  // atmosphere without a screen full of additive sprites.
  const count = 175;
  const particlePositions = new Float32Array(count*3);
  const phases = new Float32Array(count);
  for(let i=0;i<count;i++) {
    const a=rng()*Math.PI*2;
    const r=Math.sqrt(rng())*16;
    const px=Math.cos(a)*r, pz=Math.sin(a)*r-4;
    particlePositions[i*3]=px;
    particlePositions[i*3+1]=at(px,pz)+.6+rng()*5.0;
    particlePositions[i*3+2]=pz;
    phases[i]=rng()*6.283;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position',new THREE.BufferAttribute(particlePositions,3));
  dustGeometry.setAttribute('aPhase',new THREE.BufferAttribute(phases,1));
  const dustMaterial = new THREE.ShaderMaterial({
    uniforms:{ uTime:{value:0},uTint:{value:new THREE.Color(0xffd5ae)} },
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    vertexShader:[
      'attribute float aPhase; uniform float uTime; varying float vAlpha;',
      'void main(){vec3 p=position;',
      'p.x+=sin(uTime*.3+aPhase)*.18;',
      'p.y+=sin(uTime*.61+aPhase*1.3)*.21;',
      'vec4 mv=modelViewMatrix*vec4(p,1.0);',
      'gl_Position=projectionMatrix*mv;',
      'gl_PointSize=clamp(30.0/max(1.0,-mv.z),1.2,4.0);',
      'vAlpha=.40+.35*sin(uTime*.9+aPhase);}',
    ].join('\n'),
    fragmentShader:[
      'uniform vec3 uTint; varying float vAlpha;',
      'void main(){vec2 p=gl_PointCoord-.5;',
      'float alpha=(1.0-smoothstep(.16,.5,length(p)))*vAlpha;',
      'gl_FragColor=vec4(uTint,alpha);',
      '#include <tonemapping_fragment>',
      '#include <colorspace_fragment>',
      '}',
    ].join('\n'),
  });
  const dust = new THREE.Points(dustGeometry,dustMaterial);
  root.add(dust);

  // Original, restrained theatrical spell staging. These are ONLY
  // visual tests, not fake attacks / a duplicate combat engine.
  const magicRoot = new THREE.Group();
  root.add(magicRoot);
  const magic = new THREE.Group();
  magicRoot.add(magic);
  const purple = new THREE.MeshBasicMaterial({color:0xb494ff,
    transparent:true,opacity:.72,blending:THREE.AdditiveBlending,depthWrite:false});
  const gold = new THREE.MeshBasicMaterial({color:0xffd59b,
    transparent:true,opacity:.80,blending:THREE.AdditiveBlending,depthWrite:false});
  for(let i=0;i<3;i++){
    const orbit = piece(magic,new THREE.TorusGeometry(.85+i*.30,.018,6,96),
      i===1?gold:purple,0,i*.22,0);
    orbit.rotation.set(.4+i*.52,0,i*.45);
  }
  const core=piece(magic,new THREE.OctahedronGeometry(.17,1),gold,0,.25,0);
  const assassinArc=piece(magicRoot,new THREE.TorusGeometry(1.17,.035,6,96,Math.PI*1.42),
    purple,0,0,0);
  assassinArc.rotation.x=.64;

  // Atmospheric shafts must be feathered shader planes, not hard triangular cones.
  const shaftMaterial=new THREE.ShaderMaterial({
    uniforms:{uColor:{value:new THREE.Color(0xffd6b5)}},
    transparent:true,depthWrite:false,side:THREE.DoubleSide,
    blending:THREE.AdditiveBlending,
    vertexShader:[
      'varying vec2 vUv;',
      'void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    ].join('\n'),
    fragmentShader:[
      'uniform vec3 uColor;varying vec2 vUv;',
      'void main(){float a=pow(max(0.0,1.0-abs(vUv.x-.5)*2.0),3.0);',
      'a*=smoothstep(0.0,.32,vUv.y)*(1.0-smoothstep(.78,1.0,vUv.y));',
      'gl_FragColor=vec4(uColor,a*.052);}',
    ].join('\n'),
  });
  for(let i=0;i<3;i++){
    const shaft=piece(root,new THREE.PlaneGeometry(3.5+i*.7,23),
      shaftMaterial, -14+i*8,center.y+9,-27-i*3);
    shaft.rotation.z=-.27;
  }

  let effects=true;
  const effectsNodes: THREE.Object3D[]=[mist,dust,magicRoot];
  return {
    root,
    update(t,origin){
      root.position.set(center.x-origin.x,0,center.z-origin.z);
      fogMaterial.uniforms.uTime.value=t;
      dustMaterial.uniforms.uTime.value=t;
      fallMaterial.uniforms.uTime.value=t;
      giant.pose(Math.min(.04,1/60));
      magic.position.set(-2.6,at(-2.6,-1.9)+2.5,-1.9);
      magic.rotation.y=t*.24;
      magic.rotation.z=Math.sin(t*.32)*.12;
      core.rotation.y=t*.5;
      assassinArc.position.set(2.6,at(2.6,-1.7)+1.35,-1.7);
      assassinArc.rotation.z=t*.24;
      for(let i=0;i<pointLights.length;i++){
        pointLights[i].intensity=3.6+.25*Math.sin(t*4+i*1.4);
      }
    },
    setEffectsEnabled(enabled){
      effects=enabled;
      for(const node of effectsNodes) node.visible=effects;
      return effects;
    },
    dispose(){
      root.removeFromParent();
      disposeObject(root);
      colors.forEach(material=>material.dispose());
    },
  };
}
