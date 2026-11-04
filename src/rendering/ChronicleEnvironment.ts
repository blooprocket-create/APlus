import * as THREE from 'three';
import { ChronicleChapter, ChronicleSite } from '../types/campaign';
import { ProceduralPathLayout } from '../types/world';
import { createAnimeToonMaterial } from './AnimeMaterials';

export function buildChronicleEnvironment(scene: THREE.Scene, chapter: ChronicleChapter, layout: ProceduralPathLayout, sites: ChronicleSite[]): THREE.Group {
  const group = new THREE.Group();
  group.name = `chronicle_${chapter.id}`;
  scene.background = new THREE.Color(chapter.palette.sky);
  scene.fog = new THREE.FogExp2(chapter.palette.sky, 0.014);
  const stone = createAnimeToonMaterial({ color: chapter.palette.stone });
  const earth = createAnimeToonMaterial({ color: chapter.palette.ground });
  const leaves = createAnimeToonMaterial({ color: chapter.palette.foliage });
  const glow = new THREE.MeshBasicMaterial({ color: chapter.palette.glow });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(180, 400), earth);
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.6, -130); ground.receiveShadow = true; group.add(ground);
  const roadMaterial = createAnimeToonMaterial({ color: chapter.palette.stone, emissive: chapter.palette.ground, emissiveIntensity: 0.12 });
  const edges = layout.connections ?? [];
  const paving: THREE.Matrix4[] = [];
  edges.forEach(([ai, bi]) => {
    const a = layout.waypoints[ai]; const b = layout.waypoints[bi];
    const distance = Math.hypot(a.x - b.x, a.z - b.z);
    const road = new THREE.Mesh(new THREE.BoxGeometry(layout.corridorHalfWidth * 2, 0.45, distance + 1.5), roadMaterial);
    road.position.set((a.x + b.x) / 2, -0.22, (a.z + b.z) / 2);
    road.rotation.y = Math.atan2(b.x - a.x, b.z - a.z); road.receiveShadow = true; group.add(road);
    const steps = Math.floor(distance / 1.55);
    for (let step = 0; step < steps; step++) {
      const t = (step + 0.5) / steps;
      for (const side of [-1, 0, 1]) {
        const position = new THREE.Vector3(THREE.MathUtils.lerp(a.x, b.x, t) + Math.cos(road.rotation.y) * side * 1.12, 0.018, THREE.MathUtils.lerp(a.z, b.z, t) - Math.sin(road.rotation.y) * side * 1.12);
        paving.push(new THREE.Matrix4().compose(position, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), road.rotation.y), new THREE.Vector3(1, 1, 1)));
      }
    }
  });
  const pavingMaterial = createAnimeToonMaterial({ color: new THREE.Color(chapter.palette.stone).lerp(new THREE.Color(chapter.palette.ground), 0.45).getHex() });
  const pavingMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1.03, 0.035, 1.35), pavingMaterial, paving.length);
  paving.forEach((matrix, i) => pavingMesh.setMatrixAt(i, matrix)); pavingMesh.receiveShadow = true; group.add(pavingMesh);
  const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.4, 4, 6);
  const crownGeometry = chapter.region === 'frostmarch' ? new THREE.ConeGeometry(1.8, 4, 7) : new THREE.DodecahedronGeometry(1.8, 1);
  const rockGeometry = new THREE.DodecahedronGeometry(1.1, 0);
  layout.waypoints.forEach((point, i) => {
    const clearing = new THREE.Mesh(new THREE.CylinderGeometry(point.radius, point.radius + 0.2, 0.4, 32), roadMaterial);
    clearing.position.set(point.x, -0.2, point.z); clearing.receiveShadow = true; group.add(clearing);
    for (const side of [-1, 1]) {
      const x = point.x + side * (point.radius + 3);
      const z = point.z + Math.sin(i) * 3;
      if (chapter.region === 'whispering_woods' || chapter.region === 'frostmarch') {
        const trunk = new THREE.Mesh(trunkGeometry, stone); trunk.position.set(x, 1.4, z); trunk.castShadow = true;
        const crown = new THREE.Mesh(crownGeometry, leaves); crown.position.set(x, 4.1, z); crown.castShadow = true; crown.scale.set(1.2, 1.3, 1.2);
        group.add(trunk, crown);
      } else if (chapter.region === 'glass_desert' || chapter.region === 'world_heart') {
        const shard = new THREE.Mesh(new THREE.OctahedronGeometry(1.4), stone);
        shard.position.set(x, 2, z); shard.scale.y = 2.3; shard.rotation.z = side * 0.2; shard.castShadow = true; group.add(shard);
        const halo = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.025, 5, 32), glow);
        halo.position.set(x, 2.5, z); halo.rotation.x = Math.PI / 3; group.add(halo);
      } else {
        const ruin = new THREE.Mesh(new THREE.BoxGeometry(2, 5 + i % 3, 2), stone);
        ruin.position.set(x, 2, z); ruin.rotation.z = side * 0.06; ruin.castShadow = true; group.add(ruin);
        const arch = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.45, 2.3), stone);
        arch.position.set(x - side * 1.2, 4.8 + (i % 3) * 0.5, z); group.add(arch);
      }
      for (let j = 0; j < 4; j++) {
        const rock = new THREE.Mesh(rockGeometry, j % 2 ? leaves : stone);
        rock.position.set(x + side * j * 2.5, -0.1, z - 4 + j * 2.5); rock.scale.set(0.5 + j * 0.2, 0.3, 0.7); group.add(rock);
      }
    }
    if (i < 13) {
      const torch = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 1.4, 6), stone);
      torch.position.set(point.x - 3.5, 0.7, point.z); group.add(torch);
      const flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.15), glow);
      flame.position.set(point.x - 3.5, 1.5, point.z); group.add(flame);
    }
  });
  // The guardian occupies an architectural arena, distinct from the route encounters.
  const arena = layout.waypoints[11];
  for (let i = 0; i < 12; i++) {
    const angle = i / 12 * Math.PI * 2;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 5, 6), stone);
    pillar.position.set(arena.x + Math.sin(angle) * 10, 2.5, arena.z + Math.cos(angle) * 10); pillar.castShadow = true;
    group.add(pillar);
  }
  const arenaRing = new THREE.Mesh(new THREE.TorusGeometry(9, 0.035, 6, 96), glow);
  arenaRing.rotation.x = -Math.PI / 2; arenaRing.position.set(arena.x, 0.04, arena.z); group.add(arenaRing);
  sites.filter(site => site.kind !== 'battle').forEach(site => {
    const marker = new THREE.Group(); marker.name = `site_${site.id}`; marker.position.set(site.position.x, 0, site.position.z);
    if (site.kind === 'conversation' || site.kind === 'choice') {
      const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 1.1, 10), leaves); robe.position.y = 0.65;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 12), createAnimeToonMaterial({ color: 0xd2b8a2 })); head.position.y = 1.45;
      const hood = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), stone); hood.position.y = 1.5;
      const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 1.9, 5), stone); staff.position.set(0.48, 0.95, 0);
      const lantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), glow); lantern.position.set(0.48, 1.9, 0);
      marker.add(robe, head, hood, staff, lantern); group.add(marker); return;
    }
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.95, 0.5, 6), stone); pedestal.position.y = 0.25;
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(site.kind === 'echo' ? 0.28 : 0.5), glow);
    crystal.position.y = 1.5;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(site.kind === 'echo' ? 0.8 : 1.2, 0.025, 5, 48), glow);
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05;
    marker.add(pedestal, crystal, ring); group.add(marker);
  });
  // A broken bell is a geographical landmark and the visible source of the region's binding.
  const bellSite = layout.waypoints[6];
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 2.2, 3.5, 16, 1, true), new THREE.MeshStandardMaterial({ color: chapter.palette.glow, metalness: 0.7, roughness: 0.6, side: THREE.DoubleSide }));
  bell.position.set(bellSite.x - 16, 3.6, bellSite.z); bell.rotation.z = 0.12; group.add(bell);
  for (const side of [-1, 1]) {
    const support = new THREE.Mesh(new THREE.BoxGeometry(1.2, 7, 1.4), stone);
    support.position.set(bellSite.x - 16 + side * 3.2, 3, bellSite.z); support.castShadow = true; group.add(support);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(8, 0.9, 2), stone); lintel.position.set(bellSite.x - 16, 6.7, bellSite.z); group.add(lintel);
  if (chapter.region === 'ember_coast') {
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(400, 500), new THREE.MeshStandardMaterial({ color: 0x244c5c, metalness: 0.45, roughness: 0.35, transparent: true, opacity: 0.8 }));
    sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.65, -130); group.add(sea);
  }
  scene.add(group);
  return group;
}
