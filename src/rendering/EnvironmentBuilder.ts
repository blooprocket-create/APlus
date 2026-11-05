import * as THREE from 'three';
import { getViewportProfile } from '../platform/Viewport';
import { ChronicleChapter, ChronicleSite } from '../types/campaign';
import { buildChronicleEnvironment } from './ChronicleEnvironment';
import { disposeObject } from './SceneResources';
import { worldLabel } from './WorldLabel';
import { FieldPlan } from '../game/FieldActivities';
import { FieldProgress } from '../types/campaign';
import { ZoneId } from '../types/game';
import { NpcActor, PortalTrigger, ProceduralPathLayout } from '../types/world';
import { attachAnimeOutline, createAnimeToonMaterial } from './AnimeMaterials';

export const SAFE_ZONE_RADIUS = 18.5;

export interface BuiltZoneResult {
  portals: PortalTrigger[];
  npcs: NpcActor[];
}

export class EnvironmentBuilder {
  private zoneGroup: THREE.Group | null = null;
  private floatingCrystals: THREE.Object3D[] = [];
  private portalVortexMeshes: THREE.Object3D[] = [];
  private starParticles: THREE.Points | null = null;
  private time = 0;
  private lightsInitialized = false;
  private fieldGroup: THREE.Group | null = null;
  private fieldMarkers: THREE.Object3D[] = [];
  private escortActor: THREE.Object3D | null = null;

  private clearZone(scene: THREE.Scene): void {
    if (!this.zoneGroup) return;
    scene.remove(this.zoneGroup);
    disposeObject(this.zoneGroup);
    this.floatingCrystals = [];
    this.portalVortexMeshes = [];
    this.starParticles = null;
    this.fieldGroup = null; this.fieldMarkers = []; this.escortActor = null;
  }

  public addTravelGate(portal: PortalTrigger): void {
    if (!this.zoneGroup) return;
    if (portal.id === 'bellroad_outbound' || portal.id === 'bellroad_town_link') {
      const road = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(portal.position.x), .035, 3.8), createAnimeToonMaterial({ color: 0x59675a }));
      road.position.set(portal.position.x / 2, .025, portal.position.z); road.receiveShadow = true; this.zoneGroup.add(road);
    }
    this.addPortalGatewayMesh(this.zoneGroup, portal);
  }

  public showFieldActivity(plan: FieldPlan, progress: FieldProgress): void {
    if (!this.zoneGroup) return;
    this.fieldGroup = new THREE.Group(); this.zoneGroup.add(this.fieldGroup);
    const escort = plan.definition.kind === 'escort';
    const points = escort ? [progress.actor ?? plan.route[0]] : plan.points;
    points.forEach((point, i) => {
      const marker = new THREE.Group(); marker.position.set(point.x, 0, point.z);
      const material = createAnimeToonMaterial({ color: escort ? 0xc4c4b0 : 0xd7bb86, emissive: 0x938345, emissiveIntensity: .35 });
      if (escort) {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(.24, .45, 1.2, 8), material); body.position.y = .7;
        const head = new THREE.Mesh(new THREE.SphereGeometry(.25, 10, 10), material); head.position.y = 1.6;
        marker.add(body, head); this.escortActor = marker;
      } else {
        const base = new THREE.Mesh(new THREE.CylinderGeometry(.7, 1, .55, 8), material); base.position.y = .3;
        const core = new THREE.Mesh(new THREE.OctahedronGeometry(.42), new THREE.MeshBasicMaterial({ color: 0xffd78c })); core.position.y = 1.3;
        marker.add(base, core);
      }
      const ring = new THREE.Mesh(new THREE.TorusGeometry(plan.definition.kind === 'defend' ? 7 : 1.8, .045, 5, 48), new THREE.MeshBasicMaterial({ color: 0xe5c678 }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = .06; marker.add(ring);
      marker.add(worldLabel(plan.definition.labels[i] ?? plan.definition.title));
      this.fieldGroup!.add(marker); this.fieldMarkers.push(marker);
    });
    this.updateFieldActivity(progress, true);
  }

  public updateFieldActivity(progress: FieldProgress, active: boolean): void {
    if (!this.fieldGroup) return;
    this.fieldGroup.visible = active;
    this.fieldMarkers.forEach((marker, i) => { marker.visible = !progress.collected.includes(i); });
    if (this.escortActor && progress.actor) this.escortActor.position.set(progress.actor.x, 0, progress.actor.z);
  }

  public buildChronicle(scene: THREE.Scene, chapter: ChronicleChapter, layout: ProceduralPathLayout, sites: ChronicleSite[]): BuiltZoneResult {
    this.initBaseLighting(scene); this.clearZone(scene);
    this.zoneGroup = buildChronicleEnvironment(scene, chapter, layout, sites);
    return { portals: [], npcs: [] };
  }

  public buildPreviewScene(scene: THREE.Scene): void {
    this.initBaseLighting(scene);
    this.clearZone(scene);
    scene.background = new THREE.Color(0x0b1921);
    scene.fog = new THREE.FogExp2(0x0b1921, 0.035);
    const group = new THREE.Group();
    this.zoneGroup = group;
    scene.add(group);
    const stone = createAnimeToonMaterial({ color: 0x203b40 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xb5a278, roughness: 0.7, metalness: 0.6, emissive: 0x4c4323, emissiveIntensity: 0.2 });
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(16, 17, 0.7, 64), stone);
    floor.position.y = -0.65;
    floor.receiveShadow = true;
    group.add(floor);
    for (let i = 0; i < 3; i++) {
      const platform = new THREE.Mesh(new THREE.CylinderGeometry(3.5 - i * 0.3, 3.65 - i * 0.3, 0.13, 64), stone);
      platform.position.y = -0.3 + i * 0.13;
      platform.receiveShadow = true;
      group.add(platform);
      const inlay = new THREE.Mesh(new THREE.TorusGeometry(3.42 - i * 0.3, 0.012, 4, 64), gold);
      inlay.rotation.x = -Math.PI / 2;
      inlay.position.y = platform.position.y + 0.07;
      group.add(inlay);
    }
    // A broken astrolabe forms a recognizable silhouette behind the triad.
    for (const [radius, tube] of [[2.5, 0.09], [2.72, 0.025], [3.1, 0.018]]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 96), gold);
      ring.position.set(0, 2.6, -3.2);
      group.add(ring);
    }
    const moon = new THREE.Mesh(new THREE.CircleGeometry(2.46, 64), new THREE.MeshBasicMaterial({ color: 0x122c35 }));
    moon.position.set(0, 2.6, -3.25);
    group.add(moon);
    for (let i = 0; i < 12; i++) {
      const angle = i / 12 * Math.PI * 2;
      const marker = new THREE.Mesh(new THREE.OctahedronGeometry(i % 3 === 0 ? 0.11 : 0.05), gold);
      marker.position.set(Math.cos(angle) * 2.86, 2.6 + Math.sin(angle) * 2.86, -3.2);
      group.add(marker);
    }
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.48, 5.5 + i, 5), stone);
        pillar.position.set(side * (4.7 + i * 2.2), 2.3, -4 - i * 1.5);
        pillar.castShadow = true;
        group.add(pillar);
        const cap = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), gold);
        cap.position.copy(pillar.position); cap.position.y += 3 + i * 0.5;
        group.add(cap);
      }
    }
    this.addSkyMotes(group, 0xc7c8a0, 12);
  }

  public initBaseLighting(scene: THREE.Scene): void {
    if (this.lightsInitialized) return;
    this.lightsInitialized = true;

    scene.background = new THREE.Color(0x0b0e1d);
    scene.fog = new THREE.FogExp2(0x0b0e1d, 0.011);

    const ambient = new THREE.HemisphereLight(0xc2d5dc, 0x17292e, 1.25);
    scene.add(ambient);

    const sunLight = new THREE.DirectionalLight(0xffe2b1, 2.0);
    sunLight.position.set(16, 32, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = getViewportProfile().touchUI ? 512 : 1024;
    sunLight.shadow.mapSize.height = sunLight.shadow.mapSize.width;
    sunLight.shadow.camera.near = 5;
    sunLight.shadow.camera.far = 140;
    const d = 40;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0004;
    sunLight.shadow.normalBias = 0.025;
    scene.add(sunLight);
  }

  public buildZone(
    scene: THREE.Scene,
    zoneId: ZoneId,
    proceduralLayout?: ProceduralPathLayout
  ): BuiltZoneResult {
    this.initBaseLighting(scene);

    this.clearZone(scene);
    this.zoneGroup = new THREE.Group();
    this.zoneGroup.name = `zone_${zoneId}`;
    scene.add(this.zoneGroup);

    this.floatingCrystals = [];
    this.portalVortexMeshes = [];
    this.starParticles = null;

    if (zoneId === 'starting_town') {
      scene.background = new THREE.Color(0x101830);
      scene.fog = new THREE.FogExp2(0x101830, 0.012);
      return this.buildStartingTown(this.zoneGroup);
    } else if (zoneId === 'stomping_grounds' && proceduralLayout) {
      scene.background = new THREE.Color(0x090b18);
      scene.fog = new THREE.FogExp2(0x090b18, 0.013);
      return this.buildStompingGrounds(this.zoneGroup, proceduralLayout);
    } else if (zoneId === 'sunken_ruins' && proceduralLayout) {
      scene.background = new THREE.Color(0x051824);
      scene.fog = new THREE.FogExp2(0x051824, 0.013);
      return this.buildSunkenRuins(this.zoneGroup, proceduralLayout);
    } else if (zoneId === 'abyssal_sanctum') {
      scene.background = new THREE.Color(0x16071f);
      scene.fog = new THREE.FogExp2(0x16071f, 0.012);
      return this.buildAbyssalSanctum(this.zoneGroup);
    } else {
      scene.background = new THREE.Color(0x18112e);
      scene.fog = new THREE.FogExp2(0x18112e, 0.012);
      return this.buildMarketCrossing(this.zoneGroup);
    }
  }

  public buildSlice(scene: THREE.Scene, group: THREE.Group): void {
    this.initBaseLighting(scene);
    this.clearZone(scene);
    this.zoneGroup = group;
    scene.add(group);
    scene.background = new THREE.Color(0x526875);
    scene.fog = new THREE.Fog(0x526875, 26, 92);
  }

  private buildStartingTown(group: THREE.Group): BuiltZoneResult {
    // Cobblestone Safe-Zone Plaza
    const floorGeo = new THREE.CylinderGeometry(SAFE_ZONE_RADIUS, SAFE_ZONE_RADIUS * 0.94, 1.4, 48);
    const floorMat = createAnimeToonMaterial({
      color: 0x263b40,
      emissive: 0x111830,
      emissiveIntensity: 0.25,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.7;
    floor.receiveShadow = true;
    attachAnimeOutline(floor, 1.02);
    group.add(floor);

    // Decorative sanctuary rings
    for (const r of [4.2, 10.5, SAFE_ZONE_RADIUS - 0.5]) {
      const ringGeo = new THREE.RingGeometry(r - 0.18, r, 48);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x4cc9f0,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.42,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 0.02;
      group.add(ring);
    }

    // North-South stone walkway leading to the Stomping Grounds Portal
    const roadGeo = new THREE.PlaneGeometry(3.6, 26);
    roadGeo.rotateX(-Math.PI / 2);
    const roadMat = createAnimeToonMaterial({ color: 0x3b4c4d });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.position.set(0, 0.01, -1.5);
    group.add(road);

    // Central Aether Healing Fountain at (0, -5.2) so the center (0,0) plaza is open
    const fountainGroup = new THREE.Group();
    fountainGroup.position.set(0, 0, -5.2);
    const basin = new THREE.Mesh(
      new THREE.CylinderGeometry(1.85, 2.05, 0.65, 16),
      createAnimeToonMaterial({ color: 0x3d4e78 })
    );
    basin.position.y = 0.32;
    attachAnimeOutline(basin, 1.05);
    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(1.65, 1.65, 0.55, 16),
      createAnimeToonMaterial({
        color: 0x4cc9f0,
        emissive: 0x4cc9f0,
        emissiveIntensity: 0.65,
      })
    );
    water.position.y = 0.42;
    const spire = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.65, 0),
      createAnimeToonMaterial({
        color: 0x72efdd,
        emissive: 0x4cc9f0,
        emissiveIntensity: 0.85,
      })
    );
    spire.position.y = 2.1;
    attachAnimeOutline(spire, 1.08);
    this.floatingCrystals.push(spire);
    fountainGroup.add(basin, water, spire);
    group.add(fountainGroup);

    // Anime Town Houses & Guild Pavilions around the perimeter
    this.addAnimeBuilding(group, -10.5, 4.5, 0.4, 0xff758f, 0x2b3152);
    this.addAnimeBuilding(group, 10.5, 4.5, -0.4, 0x4cc9f0, 0x2b3152);
    this.addAnimeBuilding(group, -9.5, -6.5, 0.8, 0xffd166, 0x2b3152);
    this.addAnimeBuilding(group, 9.5, -6.5, -0.8, 0x9d4edd, 0x2b3152);

    // Sakura Blossom Trees & Warm Street Lanterns
    for (const pos of [
      { x: -6.5, z: 9.5 },
      { x: 6.5, z: 9.5 },
      { x: -13.5, z: -8.5 },
      { x: 13.5, z: -8.5 },
      { x: -5.5, z: -12.0 },
      { x: 5.5, z: -12.0 },
    ]) {
      this.addSakuraTree(group, pos.x, pos.z, 0x879d8b);
    }

    for (const lPos of [
      { x: -2.4, z: 4.5 },
      { x: 2.4, z: 4.5 },
      { x: -2.4, z: -7.5 },
      { x: 2.4, z: -7.5 },
    ]) {
      this.addLanternPost(group, lPos.x, lPos.z, 0xffd166);
    }

    // Friendly Town NPCs
    const npcs: NpcActor[] = [
      {
        id: 'npc_commander_vael',
        name: 'Commander Vael',
        role: 'Outpost Quest Giver',
        dialogue:
          'Step through the North Rift Gate to enter the Stomping Grounds. Its path shifts with every expedition!',
        position: { x: -2.1, z: -4.2 },
        colorHex: 0xffd166,
      },
      {
        id: 'npc_blacksmith_kora',
        name: 'Artisan Kora',
        role: 'Starforge Smith',
        dialogue:
          'Clear the Stomping Grounds path to reach Market Crossing on the far side!',
        position: { x: 4.2, z: 1.5 },
        colorHex: 0x4cc9f0,
      },
    ];
    for (const npc of npcs) {
      this.addNpcMesh(group, npc);
    }

    // Portal to Stomping Grounds at North Gate (0, -14.2)
    const portal: PortalTrigger = {
      id: 'portal_town_to_stomping',
      label: 'Enter Stomping Grounds',
      subtitle: 'Procedural Combat Wilds (Path to Market Crossing)',
      targetZone: 'stomping_grounds',
      targetSpawnTag: 'from_town',
      position: { x: 0, z: -14.2 },
      radius: 2.3,
      colorHex: 0xff3e6c,
    };
    this.addPortalGatewayMesh(group, portal);

    this.addSkyMotes(group, 0x90e0ef, SAFE_ZONE_RADIUS + 8);
    return { portals: [portal], npcs };
  }

  private buildStompingGrounds(
    group: THREE.Group,
    layout: ProceduralPathLayout
  ): BuiltZoneResult {
    const roadMat = createAnimeToonMaterial({
      color: 0x2a3b42,
      emissive: 0x0d1124,
      emissiveIntensity: 0.3,
    });
    const borderMat = new THREE.MeshBasicMaterial({
      color: 0x4cc9f0,
      transparent: true,
      opacity: 0.45,
    });
    const cliffMat = createAnimeToonMaterial({ color: 0x26353c });
    const crystalMat = createAnimeToonMaterial({
      color: 0xff3e6c,
      emissive: 0xff2a6d,
      emissiveIntensity: 0.7,
    });

    // Render each waypoint clearing disc
    for (const wp of layout.waypoints) {
      const discGeo = new THREE.CylinderGeometry(wp.radius, wp.radius * 0.94, 1.2, 28);
      const disc = new THREE.Mesh(discGeo, roadMat);
      disc.position.set(wp.x, -0.6, wp.z);
      disc.receiveShadow = true;
      attachAnimeOutline(disc, 1.03);
      group.add(disc);

      const runeColor =
        wp.index === 0
          ? 0x4cc9f0
          : wp.index === layout.waypoints.length - 1
            ? 0xffd166
            : wp.index === layout.waypoints.length - 2
              ? 0xff0054
              : 0x699585;
      const ringGeo = new THREE.RingGeometry(wp.radius - 0.55, wp.radius - 0.25, 32);
      ringGeo.rotateX(-Math.PI / 2);
      const ring = new THREE.Mesh(
        ringGeo,
        new THREE.MeshBasicMaterial({
          color: runeColor,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.55,
        })
      );
      ring.position.set(wp.x, 0.02, wp.z);
      group.add(ring);
      this.addRuinsDetail(group, wp.x, wp.z, wp.index);
    }

    // Render each connecting single-path road segment + flanking boundary cliffs/trees
    for (let i = 0; i < layout.waypoints.length - 1; i++) {
      const a = layout.waypoints[i];
      const b = layout.waypoints[i + 1];
      const midX = (a.x + b.x) / 2;
      const midZ = (a.z + b.z) / 2;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const segLen = Math.hypot(dx, dz);
      const yaw = Math.atan2(dx, dz);

      const width = layout.corridorHalfWidth * 2;
      const slabGeo = new THREE.BoxGeometry(width, 1.15, segLen + 1.5);
      const slab = new THREE.Mesh(slabGeo, roadMat);
      slab.position.set(midX, -0.58, midZ);
      slab.rotation.y = yaw;
      slab.receiveShadow = true;
      group.add(slab);

      // Glowing edge rails on left and right of the single path
      for (const side of [-1, 1]) {
        const railGeo = new THREE.PlaneGeometry(0.22, segLen);
        railGeo.rotateX(-Math.PI / 2);
        const rail = new THREE.Mesh(railGeo, borderMat);
        rail.position.set(
          midX + Math.cos(yaw) * side * (layout.corridorHalfWidth - 0.2),
          0.025,
          midZ - Math.sin(yaw) * side * (layout.corridorHalfWidth - 0.2)
        );
        rail.rotation.y = yaw;
        group.add(rail);

        // Flanking obelisks / crystals outside the path corridor
        const pillarOffset = layout.corridorHalfWidth + 1.8;
        const px = midX + Math.cos(yaw) * side * pillarOffset;
        const pz = midZ - Math.sin(yaw) * side * pillarOffset;

        if (i % 2 === 0) {
          const rock = new THREE.Mesh(
            new THREE.DodecahedronGeometry(1.15, 0),
            cliffMat
          );
          rock.position.set(px, 0.7, pz);
          rock.scale.set(1, 1.65, 1);
          attachAnimeOutline(rock, 1.05);
          group.add(rock);

          const shard = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.36, 0),
            crystalMat
          );
          shard.position.set(px, 2.6, pz);
          this.floatingCrystals.push(shard);
          group.add(shard);
        } else {
          this.addSakuraTree(group, px, pz, 0x5e887a);
        }
      }
    }

    // Two Portals at opposite ends of the single path:
    // 1. South Entrance Portal -> Starting Town (Safe Zone)
    const startPortal: PortalTrigger = {
      id: 'portal_stomping_to_town',
      label: 'Return to Starting Town',
      subtitle: 'Aetherhaven Outpost (Safe Zone)',
      targetZone: 'starting_town',
      targetSpawnTag: 'from_stomping_south',
      position: { x: layout.startPortalPos.x, z: layout.startPortalPos.z + 1.8 },
      radius: 2.2,
      colorHex: 0x4cc9f0,
    };
    this.addPortalGatewayMesh(group, startPortal);

    // 2. North Exit Portal -> Market Crossing (Safe Zone)
    const endPortal: PortalTrigger = {
      id: 'portal_stomping_to_market',
      label: 'Enter Market Crossing',
      subtitle: 'Starlight Bazaar (Safe Zone)',
      targetZone: 'market_crossing',
      targetSpawnTag: 'from_stomping_north',
      position: { x: layout.endPortalPos.x, z: layout.endPortalPos.z - 1.8 },
      radius: 2.4,
      colorHex: 0xffd166,
    };
    this.addPortalGatewayMesh(group, endPortal);

    return { portals: [startPortal, endPortal], npcs: [] };
  }

  private buildMarketCrossing(group: THREE.Group): BuiltZoneResult {
    // Starlight Bazaar Safe-Zone Plaza
    const floorGeo = new THREE.CylinderGeometry(SAFE_ZONE_RADIUS, SAFE_ZONE_RADIUS * 0.94, 1.4, 48);
    const floorMat = createAnimeToonMaterial({
      color: 0x26353c,
      emissive: 0x18102e,
      emissiveIntensity: 0.3,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.7;
    floor.receiveShadow = true;
    attachAnimeOutline(floor, 1.02);
    group.add(floor);

    // Golden mosaic rings
    for (const r of [4.8, 11.2, SAFE_ZONE_RADIUS - 0.5]) {
      const ringGeo = new THREE.RingGeometry(r - 0.22, r, 48);
      ringGeo.rotateX(-Math.PI / 2);
      const ring = new THREE.Mesh(
        ringGeo,
        new THREE.MeshBasicMaterial({
          color: 0xffd166,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.5,
        })
      );
      ring.position.y = 0.02;
      group.add(ring);
    }

    // Central Grand Starlight Astrolabe Monument
    const monument = new THREE.Group();
    monument.position.set(0, 0, -1.5);
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 2.0, 0.8, 12),
      createAnimeToonMaterial({ color: 0x3c2f5e })
    );
    pedestal.position.y = 0.4;
    attachAnimeOutline(pedestal, 1.05);

    const goldStar = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.85, 0),
      createAnimeToonMaterial({
        color: 0xffd166,
        emissive: 0xffbe0b,
        emissiveIntensity: 0.85,
      })
    );
    goldStar.position.y = 2.4;
    attachAnimeOutline(goldStar, 1.07);
    this.floatingCrystals.push(goldStar);
    monument.add(pedestal, goldStar);
    group.add(monument);

    // Anime Market Stalls around the Bazaar
    this.addMarketStall(group, -8.5, -5.5, 0.45, 0xff3e6c);
    this.addMarketStall(group, 8.5, -5.5, -0.45, 0x4cc9f0);
    this.addMarketStall(group, -9.5, 3.0, 1.1, 0xffbe0b);
    this.addMarketStall(group, 9.5, 3.0, -1.1, 0x9d4edd);

    // Golden Blossom Trees & Lanterns
    for (const pos of [
      { x: -5.5, z: -11.5 },
      { x: 5.5, z: -11.5 },
      { x: -12.0, z: 8.0 },
      { x: 12.0, z: 8.0 },
    ]) {
      this.addSakuraTree(group, pos.x, pos.z, 0xffd166);
    }

    for (const lPos of [
      { x: -3.2, z: 6.5 },
      { x: 3.2, z: 6.5 },
      { x: -3.2, z: -6.5 },
      { x: 3.2, z: -6.5 },
    ]) {
      this.addLanternPost(group, lPos.x, lPos.z, 0xff3e6c);
    }

    const npcs: NpcActor[] = [
      {
        id: 'npc_merchant_lyra',
        name: 'Grand Merchant Lyra',
        role: 'Market Quest Envoy',
        dialogue:
          'Welcome to Market Crossing! Your journey through the Stomping Grounds has made you stronger.',
        position: { x: -2.1, z: 5.2 },
        colorHex: 0xffd166,
      },
      {
        id: 'npc_artificer_sol',
        name: 'Artificer Sol',
        role: 'Sunken Ruins Gatekeeper',
        dialogue:
          'Speak with me when you are ready to unseal the North Portal into the Sunken Astral Ruins!',
        position: { x: 2.2, z: -5.8 },
        colorHex: 0x00f5d4,
      },
    ];
    for (const npc of npcs) {
      this.addNpcMesh(group, npc);
    }

    // 1. South Portal at (0, 14.2) -> Stomping Grounds (toward Starting Town)
    const southPortal: PortalTrigger = {
      id: 'portal_market_to_stomping',
      label: 'Enter Stomping Grounds',
      subtitle: 'Procedural Path toward Starting Town',
      targetZone: 'stomping_grounds',
      targetSpawnTag: 'from_market',
      position: { x: 0, z: 14.2 },
      radius: 2.3,
      colorHex: 0x4cc9f0,
    };
    this.addPortalGatewayMesh(group, southPortal);

    // 2. North Portal at (0, -14.2) -> Sunken Astral Ruins (Act II Procedural Zone)
    const northPortal: PortalTrigger = {
      id: 'portal_market_to_ruins',
      label: 'Enter Sunken Astral Ruins',
      subtitle: 'Act II Procedural Temple Path toward Abyssal Sanctum',
      targetZone: 'sunken_ruins',
      targetSpawnTag: 'from_market_north',
      position: { x: 0, z: -14.2 },
      radius: 2.4,
      colorHex: 0x00f5d4,
    };
    this.addPortalGatewayMesh(group, northPortal);

    this.addSkyMotes(group, 0xffd166, SAFE_ZONE_RADIUS + 8);
    return { portals: [southPortal, northPortal], npcs };
  }

  private buildSunkenRuins(
    group: THREE.Group,
    layout: ProceduralPathLayout
  ): BuiltZoneResult {
    const roadMat = createAnimeToonMaterial({
      color: 0x113247,
      emissive: 0x072130,
      emissiveIntensity: 0.35,
    });
    const borderMat = new THREE.MeshBasicMaterial({
      color: 0x00f5d4,
      transparent: true,
      opacity: 0.55,
    });
    const obeliskMat = createAnimeToonMaterial({ color: 0x1a435c });
    const crystalMat = createAnimeToonMaterial({
      color: 0x00f5d4,
      emissive: 0x00bbf9,
      emissiveIntensity: 0.8,
    });

    for (const wp of layout.waypoints) {
      const discGeo = new THREE.CylinderGeometry(wp.radius, wp.radius * 0.94, 1.2, 28);
      const disc = new THREE.Mesh(discGeo, roadMat);
      disc.position.set(wp.x, -0.6, wp.z);
      disc.receiveShadow = true;
      attachAnimeOutline(disc, 1.03);
      group.add(disc);

      const ringGeo = new THREE.RingGeometry(wp.radius - 0.55, wp.radius - 0.22, 32);
      ringGeo.rotateX(-Math.PI / 2);
      const ring = new THREE.Mesh(
        ringGeo,
        new THREE.MeshBasicMaterial({
          color: wp.index === layout.waypoints.length - 1 ? 0xff0054 : 0x00f5d4,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.6,
        })
      );
      ring.position.set(wp.x, 0.02, wp.z);
      group.add(ring);
    }

    for (let i = 0; i < layout.waypoints.length - 1; i++) {
      const a = layout.waypoints[i];
      const b = layout.waypoints[i + 1];
      const midX = (a.x + b.x) / 2;
      const midZ = (a.z + b.z) / 2;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const segLen = Math.hypot(dx, dz);
      const yaw = Math.atan2(dx, dz);

      const width = layout.corridorHalfWidth * 2;
      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(width, 1.15, segLen + 1.5),
        roadMat
      );
      slab.position.set(midX, -0.58, midZ);
      slab.rotation.y = yaw;
      slab.receiveShadow = true;
      group.add(slab);

      for (const side of [-1, 1]) {
        const railGeo = new THREE.PlaneGeometry(0.24, segLen);
        railGeo.rotateX(-Math.PI / 2);
        const rail = new THREE.Mesh(railGeo, borderMat);
        rail.position.set(
          midX + Math.cos(yaw) * side * (layout.corridorHalfWidth - 0.2),
          0.025,
          midZ - Math.sin(yaw) * side * (layout.corridorHalfWidth - 0.2)
        );
        rail.rotation.y = yaw;
        group.add(rail);

        const pillarOffset = layout.corridorHalfWidth + 1.85;
        const px = midX + Math.cos(yaw) * side * pillarOffset;
        const pz = midZ - Math.sin(yaw) * side * pillarOffset;

        const column = new THREE.Mesh(
          new THREE.CylinderGeometry(0.45, 0.58, 3.2, 8),
          obeliskMat
        );
        column.position.set(px, 1.6, pz);
        attachAnimeOutline(column, 1.05);
        group.add(column);

        const shard = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.38, 0),
          crystalMat
        );
        shard.position.set(px, 3.65, pz);
        this.floatingCrystals.push(shard);
        group.add(shard);
      }
    }

    const startPortal: PortalTrigger = {
      id: 'portal_ruins_to_market',
      label: 'Return to Market Crossing',
      subtitle: 'Starlight Bazaar (Safe Zone)',
      targetZone: 'market_crossing',
      targetSpawnTag: 'from_ruins_south',
      position: { x: layout.startPortalPos.x, z: layout.startPortalPos.z + 1.8 },
      radius: 2.2,
      colorHex: 0x00f5d4,
    };
    this.addPortalGatewayMesh(group, startPortal);

    const endPortal: PortalTrigger = {
      id: 'portal_ruins_to_sanctum',
      label: 'Enter Abyssal Sanctum',
      subtitle: 'Act III Citadel of the Eclipse Sovereign',
      targetZone: 'abyssal_sanctum',
      targetSpawnTag: 'from_ruins_north',
      position: { x: layout.endPortalPos.x, z: layout.endPortalPos.z - 1.8 },
      radius: 2.4,
      colorHex: 0xff0054,
    };
    this.addPortalGatewayMesh(group, endPortal);

    this.addSkyMotes(group, 0x00f5d4, 45);
    return { portals: [startPortal, endPortal], npcs: [] };
  }

  private buildAbyssalSanctum(group: THREE.Group): BuiltZoneResult {
    const floorGeo = new THREE.CylinderGeometry(SAFE_ZONE_RADIUS, SAFE_ZONE_RADIUS * 0.92, 1.6, 48);
    const floorMat = createAnimeToonMaterial({
      color: 0x220e2e,
      emissive: 0x14051e,
      emissiveIntensity: 0.35,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.8;
    floor.receiveShadow = true;
    attachAnimeOutline(floor, 1.02);
    group.add(floor);

    for (const cfg of [
      { r: 4.5, color: 0xff0054 },
      { r: 10.5, color: 0xffbe0b },
      { r: SAFE_ZONE_RADIUS - 0.5, color: 0x9d4edd },
    ]) {
      const ringGeo = new THREE.RingGeometry(cfg.r - 0.24, cfg.r, 48);
      ringGeo.rotateX(-Math.PI / 2);
      const ring = new THREE.Mesh(
        ringGeo,
        new THREE.MeshBasicMaterial({
          color: cfg.color,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.62,
        })
      );
      ring.position.y = 0.02;
      group.add(ring);
    }

    // Perimeter Obsidian Eclipse Pillars
    const pillarMat = createAnimeToonMaterial({ color: 0x2d1642 });
    const rubyMat = createAnimeToonMaterial({
      color: 0xff0054,
      emissive: 0xff0054,
      emissiveIntensity: 0.85,
    });
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const px = Math.cos(angle) * (SAFE_ZONE_RADIUS - 1.2);
      const pz = Math.sin(angle) * (SAFE_ZONE_RADIUS - 1.2);

      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.95, 3.8, 0.95), pillarMat);
      pillar.position.set(px, 1.9, pz);
      attachAnimeOutline(pillar, 1.06);
      group.add(pillar);

      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.48, 0), rubyMat);
      crystal.position.set(px, 4.4, pz);
      this.floatingCrystals.push(crystal);
      group.add(crystal);
    }

    // Grand Eclipse Seal Altar at North end (0, -9.2)
    const altar = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.6, 0.7, 16),
      createAnimeToonMaterial({ color: 0x3b1c54, emissive: 0xffbe0b, emissiveIntensity: 0.25 })
    );
    altar.position.set(0, 0.35, -9.2);
    attachAnimeOutline(altar, 1.04);
    group.add(altar);

    const npcs: NpcActor[] = [
      {
        id: 'npc_sage_orin',
        name: 'High Sage Orin',
        role: 'Keeper of the Eclipse Seal',
        dialogue:
          'When the Eclipse Sovereign falls, speak with me to seal the Riftscar with the Triad\'s three weapons!',
        position: { x: 0, z: -7.5 },
        colorHex: 0xffbe0b,
      },
    ];
    for (const npc of npcs) {
      this.addNpcMesh(group, npc);
    }

    const returnPortal: PortalTrigger = {
      id: 'portal_sanctum_to_market',
      label: 'Return to Market Crossing',
      subtitle: 'Waygate back to Starlight Bazaar (Safe Zone)',
      targetZone: 'market_crossing',
      targetSpawnTag: 'from_sanctum',
      position: { x: 0, z: 14.2 },
      radius: 2.4,
      colorHex: 0xffbe0b,
    };
    this.addPortalGatewayMesh(group, returnPortal);

    this.addSkyMotes(group, 0xff0054, SAFE_ZONE_RADIUS + 8);
    return { portals: [returnPortal], npcs };
  }

  private addPortalGatewayMesh(group: THREE.Group, portal: PortalTrigger): void {
    const portalGroup = new THREE.Group();
    portalGroup.position.set(portal.position.x, 0, portal.position.z);
    portalGroup.add(worldLabel(portal.label));

    // Base rune pad
    const padGeo = new THREE.RingGeometry(0.4, portal.radius, 32);
    padGeo.rotateX(-Math.PI / 2);
    const padMat = new THREE.MeshBasicMaterial({
      color: portal.colorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
    });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.y = 0.04;
    portalGroup.add(pad);

    // Outer Stone Arch Torus
    const archGeo = new THREE.TorusGeometry(1.75, 0.2, 12, 32, Math.PI * 1.15);
    const archMat = createAnimeToonMaterial({
      color: 0x242947,
      emissive: portal.colorHex,
      emissiveIntensity: 0.35,
    });
    const arch = new THREE.Mesh(archGeo, archMat);
    arch.position.y = 1.65;
    arch.rotation.z = -0.22;
    attachAnimeOutline(arch, 1.06);
    portalGroup.add(arch);

    // Swirling Inner Dimensional Vortex
    const vortexGeo = new THREE.RingGeometry(0.25, 1.55, 24);
    const vortexMat = new THREE.MeshBasicMaterial({
      color: portal.colorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
    });
    const vortex = new THREE.Mesh(vortexGeo, vortexMat);
    vortex.position.y = 1.65;
    portalGroup.add(vortex);
    this.portalVortexMeshes.push(vortex);

    group.add(portalGroup);
  }

  private addNpcMesh(group: THREE.Group, npc: NpcActor): void {
    const g = new THREE.Group();
    g.position.set(npc.position.x, 0, npc.position.z);

    // Ground interaction halo ring around NPC
    const ringGeo = new THREE.RingGeometry(0.72, 0.92, 28);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: npc.colorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.03;
    g.add(ring);

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.32, 0.85, 10),
      createAnimeToonMaterial({
        color: 0x222a4a,
        emissive: npc.colorHex,
        emissiveIntensity: 0.25,
      })
    );
    body.position.y = 0.65;
    attachAnimeOutline(body, 1.07);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 12, 12),
      createAnimeToonMaterial({ color: 0xffe5d9 })
    );
    head.position.y = 1.28;
    attachAnimeOutline(head, 1.07);

    // 3D Exclamation Mark (!) Quest Indicator above NPC head
    const markerGroup = new THREE.Group();
    markerGroup.position.y = 2.15;
    const bar = new THREE.Mesh(
      new THREE.ConeGeometry(0.13, 0.42, 6),
      new THREE.MeshBasicMaterial({ color: npc.colorHex })
    );
    bar.rotation.x = Math.PI;
    bar.position.y = 0.16;
    attachAnimeOutline(bar, 1.12);
    const dot = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.09, 0),
      new THREE.MeshBasicMaterial({ color: npc.colorHex })
    );
    dot.position.y = -0.18;
    markerGroup.add(bar, dot);
    this.floatingCrystals.push(markerGroup);

    g.add(body, head, markerGroup);
    group.add(g);
  }

  private addAnimeBuilding(
    group: THREE.Group,
    x: number,
    z: number,
    rotY: number,
    roofColor: number,
    wallColor: number
  ): void {
    const bGroup = new THREE.Group();
    bGroup.position.set(x, 0, z);
    bGroup.rotation.y = rotY;

    const walls = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 2.3, 2.6),
      createAnimeToonMaterial({ color: wallColor })
    );
    walls.position.y = 1.15;
    attachAnimeOutline(walls, 1.04);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(2.8, 1.5, 4),
      createAnimeToonMaterial({
        color: roofColor,
        emissive: roofColor,
        emissiveIntensity: 0.2,
      })
    );
    roof.position.y = 3.05;
    roof.rotation.y = Math.PI / 4;
    attachAnimeOutline(roof, 1.04);

    // Glowing anime window
    const win = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.7),
      new THREE.MeshBasicMaterial({ color: 0xffe66d, side: THREE.DoubleSide })
    );
    win.position.set(0, 1.25, 1.32);

    bGroup.add(walls, roof, win);
    group.add(bGroup);
  }

  private addMarketStall(
    group: THREE.Group,
    x: number,
    z: number,
    rotY: number,
    canopyColor: number
  ): void {
    const stall = new THREE.Group();
    stall.position.set(x, 0, z);
    stall.rotation.y = rotY;

    const counter = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.9, 1.3),
      createAnimeToonMaterial({ color: 0x4a354f })
    );
    counter.position.y = 0.45;
    attachAnimeOutline(counter, 1.05);

    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(2.1, 1.1, 4),
      createAnimeToonMaterial({
        color: canopyColor,
        emissive: canopyColor,
        emissiveIntensity: 0.3,
      })
    );
    canopy.position.y = 2.4;
    canopy.rotation.y = Math.PI / 4;
    attachAnimeOutline(canopy, 1.05);

    stall.add(counter, canopy);
    group.add(stall);
  }

  private addRuinsDetail(group: THREE.Group, x: number, z: number, index: number): void {
    const stone = createAnimeToonMaterial({ color: 0x425558 });
    const moss = createAnimeToonMaterial({ color: 0x5b7a60 });
    for (const side of [-1, 1]) {
      const column = new THREE.Group();
      column.position.set(x + side * 5.4, 0, z - 1);
      const height = index % 3 === 0 ? 3.3 : 1.2 + (index % 3) * 0.65;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.45, height, 6), stone);
      shaft.position.y = height / 2; shaft.castShadow = true;
      const foot = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.25, 1.1), stone);
      foot.position.y = 0.1; foot.receiveShadow = true;
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.2, 0.95), moss);
      cap.position.y = height;
      column.add(shaft, foot, cap);
      group.add(column);
      for (let i = 0; i < 5; i++) {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18 + i * 0.05, 0), i % 2 ? stone : moss);
        rock.position.set(x + side * (4.6 + (i % 2) * 0.4), 0.12, z + (i - 2) * 1.2);
        rock.scale.y = 0.45; rock.rotation.y = i * 1.8;
        rock.castShadow = true;
        group.add(rock);
      }
    }
    // A stone causeway, with visible seams leading through each arena.
    const tileGeometry = new THREE.BoxGeometry(1.1, 0.025, 0.65);
    for (let i = -2; i <= 2; i++) {
      for (const side of [-1, 1]) {
        const tile = new THREE.Mesh(tileGeometry, stone);
        tile.position.set(x + side * 0.58, 0.012, z + i * 0.76);
        tile.receiveShadow = true;
        group.add(tile);
      }
    }
  }

  private addSakuraTree(group: THREE.Group, x: number, z: number, leafColor: number): void {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, 0, z);

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.38, 2.4, 8),
      createAnimeToonMaterial({ color: 0x3d2645 })
    );
    trunk.position.y = 1.2;
    attachAnimeOutline(trunk, 1.06);
    treeGroup.add(trunk);

    const foliageMat = createAnimeToonMaterial({
      color: leafColor,
      emissive: leafColor,
      emissiveIntensity: 0.22,
    });
    for (const c of [
      { x: 0, y: 2.9, z: 0, r: 1.35 },
      { x: -0.8, y: 2.45, z: 0.35, r: 0.98 },
      { x: 0.78, y: 2.55, z: -0.3, r: 1.02 },
    ]) {
      const dome = new THREE.Mesh(new THREE.DodecahedronGeometry(c.r, 1), foliageMat);
      dome.position.set(c.x, c.y, c.z);
      attachAnimeOutline(dome, 1.05);
      treeGroup.add(dome);
    }
    group.add(treeGroup);
  }

  private addLanternPost(group: THREE.Group, x: number, z: number, glowColor: number): void {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 2.2, 6),
      createAnimeToonMaterial({ color: 0x1f243a })
    );
    pole.position.set(x, 1.1, z);
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 10, 10),
      new THREE.MeshBasicMaterial({ color: glowColor })
    );
    orb.position.set(x, 2.25, z);
    group.add(pole, orb);
  }

  private addSkyMotes(group: THREE.Group, colorHex: number, radius: number): void {
    const starCount = 130;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 3 + Math.random() * radius;
      const theta = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(theta) * r;
      positions[i * 3 + 1] = 0.5 + Math.random() * 10;
      positions[i * 3 + 2] = Math.sin(theta) * r;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: colorHex,
      size: 0.065,
      transparent: true,
      opacity: 0.45,
    });
    this.starParticles = new THREE.Points(particleGeo, particleMat);
    group.add(this.starParticles);
  }

  public update(dt: number): void {
    this.time += dt;
    for (let i = 0; i < this.floatingCrystals.length; i++) {
      const c = this.floatingCrystals[i];
      c.rotation.y += dt * 1.4;
      c.position.y += Math.sin(this.time * 2.5 + i) * 0.003;
    }
    for (const v of this.portalVortexMeshes) {
      v.rotation.z -= dt * 2.8;
    }
    if (this.starParticles) {
      this.starParticles.rotation.y += dt * 0.04;
    }
  }
}
