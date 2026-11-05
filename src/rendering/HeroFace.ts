import * as THREE from 'three';
import type { CharacterClassId } from '../types/game';
import { HERO_SYLLABLE_SECONDS, type HeroExpression, type HeroSyllable } from '../game/HeroSpeech';
import { loft } from './ArtMesh';

const SHAPES = ['Blink', 'Focus', 'Concern', 'Gaze', 'SpeakOpen', 'SpeakWide', 'SpeakRound'] as const;
type Shape = typeof SHAPES[number];
type Point = [number, number];
type Feature = 'eye' | 'pupil' | 'lash' | 'brow' | 'mouth' | 'nose';

type FaceRing = [y: number, width: number, depth: number, offset: number];

function faceRings(role: CharacterClassId): FaceRing[] {
  const cheek = role === 'mage' ? .137 : role === 'assassin' ? .142 : .145;
  const jaw = role === 'mage' ? .084 : role === 'assassin' ? .090 : .096;
  return [
    [-.148,.031,.045,.028],[-.136,.054,.076,.026],[-.111,jaw,.093,.018],
    [-.087,jaw+.024,.106,.013],[-.061,cheek-.009,.115,.009],[-.043,cheek-.003,.121,.005],
    [-.031,cheek,.124,.003],[-.019,cheek+.002,.128,.002],[-.007,cheek+.003,.131,.001],
    [.009,cheek+.004,.133,0],[.035,.149,.132,0],[.071,.15,.127,0],
    [.124,.138,.118,0],[.165,.088,.076,0],
  ];
}

function noseBridge(x: number, y: number): number {
  const bridge = .012 * Math.exp(-((y - .005) ** 2) / .00085);
  const tip = .026 * Math.exp(-((y + .025) ** 2) / .00020);
  return (bridge + tip) * Math.exp(-(x ** 2) / .00021);
}

function faceDepth(rings: readonly FaceRing[], x: number, y: number): number {
  const upper = rings.findIndex((ring, index) => index > 0 && y <= ring[0]);
  const index = upper < 0 ? rings.length - 1 : upper;
  const [lowY, lowW, lowD, lowZ] = rings[index - 1];
  const [highY, highW, highD, highZ] = rings[index];
  const t = THREE.MathUtils.clamp((y - lowY) / (highY - lowY), 0, 1);
  const width = THREE.MathUtils.lerp(lowW, highW, t);
  return THREE.MathUtils.lerp(lowZ, highZ, t) + noseBridge(x,y)
    + THREE.MathUtils.lerp(lowD, highD, t) * Math.sqrt(Math.max(0, 1 - (x / width) ** 2));
}

export function heroSkin(role: CharacterClassId): THREE.BufferGeometry {
  const geometry = loft(faceRings(role), 42);
  const positions = geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    if (positions.getZ(i) > 0) {
      positions.setZ(i, positions.getZ(i) + noseBridge(positions.getX(i), positions.getY(i)));
    }
  }
  geometry.computeVertexNormals();
  return geometry;
}

function oval(x: number, y: number, rx: number, ry: number, count = 14): Point[] {
  return Array.from({length: count}, (_, i) => {
    const angle = Math.PI * 2 * i / count;
    return [x + Math.cos(angle) * rx, y + Math.sin(angle) * ry];
  });
}

export interface FacePerformance {
  tone: HeroExpression;
  elapsed: number;
  cues: readonly HeroSyllable[];
  speaking: boolean;
  gaze: number;
}

export class HeroFace {
  readonly mesh: THREE.Mesh;
  private clock = 0;
  private readonly phase: number;

  constructor(role: CharacterClassId, material: THREE.Material) {
    this.phase = { warrior: .28, mage: 1.49, assassin: 2.67 }[role];
    const positions: number[] = [], colors: number[] = [], indices: number[] = [];
    const deltas = SHAPES.map(() => [] as number[]);
    const dark = 0x312034;
    const eyeWhite = 0xf1e9e5;
    const iris = { warrior: 0xae7139, mage: 0x438aa7, assassin: 0xb35167 }[role];
    const rings = faceRings(role);
    const expression = (x: number, y: number, shape: Shape, kind: Feature, side: number): Point => {
      const center = side * .067;
      if (kind === 'mouth') {
        const centered = y + .079;
        if (shape === 'SpeakOpen') return [x*.91, -.082+centered*5.4];
        if (shape === 'SpeakWide') return [x*1.20, -.079+centered*2.5];
        if (shape === 'SpeakRound') return [x*.59, -.083+centered*4.6];
      }
      if (kind === 'brow') {
        const inner = 1 - THREE.MathUtils.clamp((x * side - .032) / .071, 0, 1);
        if (shape === 'Focus') return [x, y - .015*inner + .003];
        if (shape === 'Concern') return [x, y + .019*inner - .003];
      }
      if (kind === 'eye' || kind === 'pupil' || kind === 'lash') {
        const tilt = role === 'assassin' ? .12 : role === 'warrior' ? .08 : -.015;
        const line = .008 + (x-center)*side*tilt;
        if (shape === 'Blink') return [x, line + (y - line) * (kind === 'lash' ? .16 : .025)];
        if (shape === 'Focus') return [x, line + (y-line) * .73 - .0015*side*(x-center)];
        if (shape === 'Concern') return [x, line + (y-line) * 1.11 + .003];
        if (shape === 'Gaze' && kind === 'pupil') return [x + .009, y + .0025];
      }
      return [x,y];
    };
    const polygon = (outline: Point[], color: number, layer: number, kind: Feature, side = 0) => {
      const points = outline.map(([x,y]) => new THREE.Vector2(x,y));
      if (THREE.ShapeUtils.isClockWise(points)) points.reverse();
      const start = positions.length / 3;
      const tint = new THREE.Color(color);
      for (const point of points) {
        const {x,y} = point;
        const z = faceDepth(rings,x,y)+layer;
        positions.push(x,y,z);
        colors.push(tint.r,tint.g,tint.b);
        for (const [i, name] of SHAPES.entries()) {
          const [u,v] = expression(x,y,name,kind,side);
          deltas[i].push(u-x,v-y,faceDepth(rings,u,v)+layer-z);
        }
      }
      for (const face of THREE.ShapeUtils.triangulateShape(points, [])) {
        const [a,b,c] = face;
        const area = (points[b].x-points[a].x)*(points[c].y-points[a].y)
          - (points[b].y-points[a].y)*(points[c].x-points[a].x);
        indices.push(start+a,start+(area > 0 ? b : c),start+(area > 0 ? c : b));
      }
    };
    for (const side of [-1,1]) {
      const center = side * .067;
      const map = (points: Point[]): Point[] => points.map(([x,y]) => [center+side*x,y]);
      const top = { warrior: .026, mage: .031, assassin: .020 }[role];
      const edge = role === 'assassin' ? .015 : .010;
      polygon(map([[-.038,.008],[-.024,top-.003],[-.006,top],[.014,top+.001],[.038,edge],
        [.028,-.004],[.012,-.011],[-.015,-.009],[-.030,-.002]]),eyeWhite,.008,'eye',side);
      const pupilX = center - side*.004;
      polygon(oval(pupilX,.009,.014,.014),iris,.010,'pupil',side);
      polygon(oval(pupilX,.010,.006,.011),dark,.011,'pupil',side);
      polygon(oval(pupilX-.004,.016,.0042,.0047,8),0xfff8f1,.012,'pupil',side);
      polygon(map([[-.041,.008],[-.027,top+.002],[-.007,top+.006],[.014,top+.005],
        [.041,edge+.006],[.034,edge-.004],[.012,top-.001],[-.007,top],[-.026,top-.006]]),
      dark,.014,'lash',side);
      polygon(map([[-.034,.047],[-.016,.054],[.009,.054],[.032,.047],[.019,.047],
        [-.015,.047],[-.032,.042]]),dark,.011,'brow',side);
    }
    if (role !== 'assassin') {
      polygon([[.008,-.016],[.014,-.031],[.008,-.038],[-.004,-.036],[.005,-.033]],
        role === 'warrior' ? 0xa57464 : 0xb78b7a,.003,'nose');
      polygon(oval(0,-.079,.024,.0046,18),0x532638,.008,'mouth');
      polygon(oval(.001,-.0761,.013,.00065,12),0xe4c8bf,.009,'mouth');
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors,3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.morphTargetsRelative = true;
    geometry.morphAttributes.position = deltas.map((delta, i) => {
      const attribute = new THREE.Float32BufferAttribute(delta,3);
      attribute.name = SHAPES[i];
      return attribute;
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = 'Hero expression controls';
  }

  update(dt: number, impact: number, effort: number, performance?: FacePerformance): void {
    this.clock += dt;
    const blinkClock = (this.clock + this.phase) % 4.28;
    const blink = blinkClock < .16 ? Math.sin(Math.PI * blinkClock / .16) ** .8 : 0;
    const tone = performance?.tone;
    const influence = this.mesh.morphTargetInfluences!;
    const set = (shape: Shape, value: number) => {
      const index = this.mesh.morphTargetDictionary![shape];
      const speed = shape === 'Blink' ? 48 : 24;
      influence[index] = THREE.MathUtils.lerp(influence[index], value, 1 - Math.exp(-dt*speed));
    };
    set('Blink',Math.max(blink, impact*.72));
    set('Focus',Math.max(effort*.82, tone === 'resolve' ? .93 : tone === 'alert' ? .48 : 0));
    set('Concern',tone === 'concern' ? .92 : 0);
    set('Gaze',performance?.gaze ?? Math.sin(this.clock*.74+this.phase)*.16);
    const cue = performance?.speaking
      ? performance.cues.find(({at}) => performance.elapsed >= at && performance.elapsed < at + HERO_SYLLABLE_SECONDS)
      : undefined;
    const mouth = cue && performance
      ? Math.sin(Math.PI * (performance.elapsed - cue.at) / HERO_SYLLABLE_SECONDS) : 0;
    set('SpeakOpen', Math.max(impact*.7, cue?.mouth === 'SpeakOpen' ? mouth : effort*.16));
    set('SpeakWide',cue?.mouth === 'SpeakWide' ? mouth : 0);
    set('SpeakRound',cue?.mouth === 'SpeakRound' ? mouth : 0);
  }
}
