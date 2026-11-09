import { describe, expect, it } from 'vitest';
import type { TerrainCell } from '../src/world-v2/WorldTerrain';
import { buildGeographyTerrainCell } from '../src/world-v2/WorldTerrain';
import { stageGeography, stageAtlas } from '../src/world-v2/WorldGeographyStage';
import { sampleGroundTriangle, sampleTerrainSurface, surfaceAt, traverseTerrain,
  type TerrainCellStore } from '../src/world-v2/WorldSurface';
import { withTerrainNavigation, findTerrainPath, findShoreApproach } from '../src/world-v2/WorldNavigation';
import { decodeCompiledCell, encodeCompiledCell } from '../src/world-v2/WorldArtifacts';

function flatCell(x: number, z: number, height = 0, ocean = false): TerrainCell {
  const n = 4, m = (n + 1) ** 2;
  return {
    id: `test/${x}:${z}`, coordinate: { x, z },
    corner: { x: x * 16, z: z * 16 },
    segments: n, cellSize: 16,
    heights: new Float32Array(m).fill(height),
    geography: {
      waterLevels: new Float32Array(m).fill(0),
      waterKinds: new Uint8Array(m).fill(ocean ? 1 : 0),
      biomes: new Uint8Array(m).fill(ocean ? 0 : 3),
      roads: new Uint8Array(m),
    },
  };
}
function store(...cells: TerrainCell[]): TerrainCellStore {
  const found = new Map(cells.map(c => [`${c.coordinate.x}:${c.coordinate.z}`, c]));
  return { cellSize: cells[0].cellSize,
    getCell: address => found.get(`${address.x}:${address.z}`) };
}
describe('World V2 Phase 2 runtime — triangle terrain collision', () => {
  it('matches THREE PlaneGeometry diagonal instead of the former bilinear collision', () => {
    const tile = flatCell(0, 0);
    tile.heights[1 * 5 + 1] = 8;
    // At (3,3) in a 4-unit quad, the upper triangle has barycentric weight
    // (3/4 + 3/4 - 1)=1/2 on the elevated fourth vertex => 4 units.
    const p = sampleGroundTriangle(tile, 3, 3);
    expect(p.height).toBe(4);
    expect(p.dx).toBe(2);
    expect(p.dz).toBe(2);
    const normal = sampleTerrainSurface(tile, 3, 3);
    expect(normal.normal.y).toBeGreaterThan(0);
    expect(normal.slopeDegrees).toBeGreaterThan(40);
    expect(normal.walkable).toBe(false);
  });
  it('keeps float32 edge heights equal across negative and positive cell boundaries', () => {
    for (const origin of [{ x: 0, z: 0 }, { x: -1, z: -1 }, { x: 8, z: 3 }]) {
      const west = buildGeographyTerrainCell(stageGeography, origin);
      const east = buildGeographyTerrainCell(stageGeography, { x: origin.x + 1, z: origin.z });
      for (let row = 0; row <= 16; row++) {
        const wz = (origin.z + row / 16) * 64;
        expect(sampleGroundTriangle(west, west.corner.x + 64, wz).height)
          .toBeCloseTo(sampleGroundTriangle(east, east.corner.x, wz).height, 6);
      }
    }
  });
  it('blocks actual sea, steep slopes, and missing streamed tiles without y=0 teleportation', () => {
    const land = withTerrainNavigation(flatCell(0,0,7));
    const ocean = flatCell(1,0,-3,true);
    const world = store(land, ocean);
    const beginning = { x: 14, y: 7, z: 8 };
    const landMove = traverseTerrain(world, beginning, 1, 0);
    expect(landMove.position).toEqual({ x: 15, y: 7, z: 8 });
    const seaMove = traverseTerrain(world, beginning, 4, 0);
    expect(seaMove.moved).toBe(false);
    expect(seaMove.blockedBy).toBe('sea');
    const missing = traverseTerrain(world, beginning, -18, 0);
    expect(missing.moved).toBe(false);
    expect(missing.blockedBy).toBe('missing-terrain');
    expect(missing.position.y).toBe(7);
  });
  it('rejects river water and supports distinct water/ground queries', () => {
    const tile = flatCell(0,0,1);
    tile.geography!.waterKinds.fill(2);
    tile.geography!.waterLevels.fill(3);
    const surface = sampleTerrainSurface(tile,8,8);
    expect(surface.y).toBe(1);
    expect(surface.waterKind).toBe(2);
    expect(surface.waterLevel).toBe(3);
    expect(surface.walkable).toBe(false);
    const allowed = sampleTerrainSurface(tile,8,8, {
      maxSlopeDegrees: 40, maxRisePerUnit: .73, maxStepUp: .9, allowRiver: true,
    });
    expect(allowed.walkable).toBe(true);
  });
  it('bakes and preserves nav bits through versioned binary-compatible JSON tiles', () => {
    const tile = withTerrainNavigation(buildGeographyTerrainCell(stageGeography,{ x:0,z:0 }));
    expect(tile.navigation!.walkable.length).toBe(tile.segments ** 2);
    expect(tile.navigation!.walkable.some(value => value === 1)).toBe(true);
    const raw = encodeCompiledCell(stageAtlas, tile);
    const decoded = decodeCompiledCell(raw, stageAtlas, {
      id:tile.id,coordinate:tile.coordinate,path:'cells/0/0/0.json',sha256:'a'.repeat(64),
    },tile.segments);
    expect(decoded.navigation).toEqual(tile.navigation);
    const tampered = {...raw,navigation:{gridSize:16,walkable:[3]}};
    expect(()=>decodeCompiledCell(tampered,stageAtlas,{
      id:tile.id,coordinate:tile.coordinate,path:'cells/0/0/0.json',sha256:'a'.repeat(64),
    },tile.segments)).toThrow(/navigation/);
  });
});
describe('World V2 Phase 2 runtime — terrain navigation and future shoreline access', () => {
  it('finds a deterministic cross-cell path on continuous traversable ground', () => {
    const cells = [-1,0,1,2].map(x => withTerrainNavigation(flatCell(x,0,8)));
    const nav = store(...cells);
    const start={x:-9,z:7}, goal={x:39,z:7};
    const result = findTerrainPath(nav,start,goal);
    expect(result.status).toBe('complete');
    expect(result.waypoints.length).toBeGreaterThan(8);
    for (const p of result.waypoints) {
      expect(p.y).toBe(8);
      expect(surfaceAt(nav,p.x,p.z)?.walkable).toBe(true);
    }
    expect(findTerrainPath(nav,start,goal).waypoints).toEqual(result.waypoints);
  });
  it('returns awaiting-cells for an unloaded neighbor, never routes across ocean', () => {
    const left = withTerrainNavigation(flatCell(0,0,5));
    const right = withTerrainNavigation(flatCell(1,0,-2,true));
    expect(findTerrainPath(store(left), { x: 5,z:5 }, { x: 25,z:5 }).status).toBe('awaiting-cells');
    expect(findTerrainPath(store(left,right),{x:5,z:5},{x:25,z:5}).status).toBe('unreachable');
    expect(() => findTerrainPath(store(left,right),{x:5,z:5},{x:7,z:5},{maxVisited:0}))
      .toThrow(/search budget/);
  });
  it('rejects diagonal corner cuts and returns a bounded search result', () => {
    const tile = withTerrainNavigation(flatCell(0,0,4));
    tile.navigation!.walkable[1] = 0; // x+1 neighbor blocked
    tile.navigation!.walkable[4] = 0; // z+1 neighbor blocked
    const p=findTerrainPath(store(tile),{x:2,z:2},{x:6,z:6});
    expect(p.status).not.toBe('complete');
    const cap=findTerrainPath(store(withTerrainNavigation(flatCell(0,0,4))),{x:2,z:2},{x:14,z:14},{maxVisited:1});
    expect(cap.status).toBe('budget-exhausted');
  });
  it('provides physical candidate shore access without dock markers', () => {
    const tile = flatCell(0,0,-1,true);
    for (let row=0;row<=4;row++)for(let col=0;col<=4;col++) {
      const i=row*5+col;
      const h=col<=2 ? -1 : col===3 ? 1 : 2;
      tile.heights[i]=h;
      tile.geography!.waterKinds[i]=col<=2?1:0;
    }
    const nav=store(withTerrainNavigation(tile));
    const candidate=findShoreApproach(nav,{x:5,z:8},14,32);
    expect(candidate).not.toBeNull();
    expect(candidate!.y).toBeGreaterThan(0);
    expect(surfaceAt(nav,candidate!.x,candidate!.z)?.walkable).toBe(true);
    expect(findShoreApproach(nav,{x:15,z:8})).toBeNull();
  });
});
