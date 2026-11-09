#!/usr/bin/env node
/**
 * Deterministic offline Phase 1 atlas/cell preview compiler.
 *
 * TypeScript is transpiled to an isolated temp CommonJS directory using the
 * project's direct TypeScript dependency. The builder imports the exact same
 * kernel as the browser, not a second implementation of world generation.
 *
 * This is the canonical BUILD TOOL CONTRACT but produces only DEVELOPMENT
 * PREVIEW content. No final continent, coast or Hearthmere placement is baked.
 */
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync, writeFileSync, mkdirSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';

const root = process.cwd();
const args = process.argv.slice(2);
const verify = args.includes('--verify');
const reverse = args.includes('--reverse');
const geographyMode = args.includes('--geography');
const outArgIndex = args.indexOf('--out');
const out = path.resolve(root, outArgIndex >= 0 ? args[outArgIndex + 1] : (geographyMode ? 'public/world-v2/geography' : 'public/world-v2/preview'));
if (outArgIndex >= 0 && !args[outArgIndex + 1]) throw new Error('--out requires a destination');
const allowedRoot = path.join(root, 'public/world-v2');
if (!out.startsWith(allowedRoot + path.sep)) {
  throw new Error('Bake output must be a subdirectory of public/world-v2');
}
const tmp = mkdtempSync(path.join(tmpdir(), 'astral-world-v2-'));
const sourceDir = path.join(root, 'src/world-v2');
const modules = [
  'WorldCoordinates', 'WorldIdentity', 'WorldAtlas',
  'WorldTerrain', 'WorldPreviewAtlas', 'WorldArtifacts',
  'WorldGeography', 'WorldGeographyStage', 'WorldSurface', 'WorldNavigation',
];
function transcribeSharedSources() {
  writeFileSync(path.join(tmp, 'package.json'), '{"type":"commonjs"}');
  for (const moduleName of modules) {
    const source = readFileSync(path.join(sourceDir, moduleName + '.ts'), 'utf8');
    const result = ts.transpileModule(source, {
      fileName: moduleName + '.ts',
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        removeComments: true,
        esModuleInterop: true,
      },
      reportDiagnostics: true,
    });
    if (result.diagnostics?.length) throw new Error('TypeScript transform failed for ' + moduleName);
    writeFileSync(path.join(tmp, moduleName + '.js'), result.outputText);
  }
}
function checksum(content) {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}
function collect(folder, base = folder) {
  if (!existsSync(folder)) return [];
  const all = [];
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const full = path.join(folder, entry.name);
    if (entry.isDirectory()) all.push(...collect(full, base));
    else all.push(path.relative(base, full).replaceAll(path.sep, '/'));
  }
  return all.sort();
}
async function main() {
  try {
    transcribeSharedSources();
    const require = createRequire(path.join(tmp, 'bootstrap.cjs'));
    const { previewAtlas } = require('./WorldPreviewAtlas.js');
    const { stageAtlas, stageGeography } = require('./WorldGeographyStage.js');
    const { buildPlaceholderTerrainCell, buildGeographyTerrainCell } = require('./WorldTerrain.js');
    const { withTerrainNavigation } = require('./WorldNavigation.js');
    const atlas = geographyMode ? stageAtlas : previewAtlas;
    const { encodeCompiledCell, validateCompiledAtlasIndex,
      validateCompiledCellPage, WORLD_PAGE_SIZE } = require('./WorldArtifacts.js');

    // Entire finite *STAGING* atlas (continents, islands and connecting sea),
    // expanded by two cells of ocean and aligned to complete 8×8 catalog pages.
    // These are geographic bounds from the declared atlas, not hand-picked
    // "camera test patches"; future releases can expand to adjacent pages.
    const coords = [];
    if (geographyMode) {
      const reservations = atlas.landmasses.map(land => land.envelope);
      const minX = Math.min(...reservations.map(e => e.minX));
      const maxX = Math.max(...reservations.map(e => e.maxX));
      const minZ = Math.min(...reservations.map(e => e.minZ));
      const maxZ = Math.max(...reservations.map(e => e.maxZ));
      const size = atlas.cellSize, pad = 2, n = WORLD_PAGE_SIZE;
      const pMinX = Math.floor((Math.floor(minX / size) - pad) / n);
      const pMaxX = Math.floor((Math.floor(maxX / size) + pad) / n);
      const pMinZ = Math.floor((Math.floor(minZ / size) - pad) / n);
      const pMaxZ = Math.floor((Math.floor(maxZ / size) + pad) / n);
      for (let pz = pMinZ; pz <= pMaxZ; pz++) for (let px = pMinX; px <= pMaxX; px++) {
        for (let dz = 0; dz < n; dz++) for (let dx = 0; dx < n; dx++) {
          coords.push({ x: px * n + dx, z: pz * n + dz });
        }
      }
    } else {
      for (let z = -4; z <= 4; z++) for (let x = -4; x <= 4; x++) coords.push({ x, z });
    }
    if (reverse) coords.reverse();
    const generated = new Map();
    const refs = [];
    const terrainByCoord = new Map();
    const summary = { land: 0, ocean: 0, river: 0, road: 0, biomes: Array(8).fill(0),
      navWalkable: 0, navBlocked: 0 };
    for (const address of coords) {
      const cell = geographyMode
        ? withTerrainNavigation(buildGeographyTerrainCell(stageGeography, address))
        : buildPlaceholderTerrainCell(previewAtlas, address);
      if (cell.navigation) for (const value of cell.navigation.walkable) {
        if (value === 1) summary.navWalkable++;
        else summary.navBlocked++;
      }
      if (cell.geography) for (let i = 0; i < cell.heights.length; i++) {
        const g = cell.geography;
        if (g.waterKinds[i] === 1) summary.ocean++;
        else if (g.waterKinds[i] === 2) summary.river++;
        else summary.land++;
        if (g.roads[i] > 0) summary.road++;
        summary.biomes[g.biomes[i]]++;
      }
      terrainByCoord.set(`${address.x}:${address.z}`, cell);
      const artifact = encodeCompiledCell(atlas, cell);
      const relative = `cells/0/${address.x}/${address.z}.json`;
      const json = JSON.stringify(artifact) + '\n';
      generated.set(relative, json);
      refs.push({
        id: cell.id, coordinate: { ...address },
        path: relative, sha256: checksum(json),
      });
    }
    refs.sort((a, b) => a.coordinate.z - b.coordinate.z || a.coordinate.x - b.coordinate.x);
    // Fail the offline build if any adjacent cell boundary fails a strict
    // float32 seam check. No geometry should be published with visible cracks.
    let checkedSeamVertices = 0;
    for (const cell of terrainByCoord.values()) {
      const n = cell.segments;
      for (const [other, east] of [
        [terrainByCoord.get(`${cell.coordinate.x + 1}:${cell.coordinate.z}`), true],
        [terrainByCoord.get(`${cell.coordinate.x}:${cell.coordinate.z + 1}`), false],
      ]) {
        if (!other) continue;
        for (let i = 0; i <= n; i++) {
          const first = east ? cell.heights[i * (n + 1) + n] : cell.heights[n * (n + 1) + i];
          const second = east ? other.heights[i * (n + 1)] : other.heights[i];
          if (first !== second) throw new Error(`Terrain seam mismatch at ${cell.id} ${east ? 'east' : 'south'} row ${i}`);
          checkedSeamVertices++;
        }
      }
    }
    if (checkedSeamVertices === 0) throw new Error('No terrain seams validated');
    const pages = [];
    if (geographyMode) {
      const batches = new Map();
      for (const cell of refs) {
        const px = Math.floor(cell.coordinate.x / WORLD_PAGE_SIZE);
        const pz = Math.floor(cell.coordinate.z / WORLD_PAGE_SIZE);
        const key = `${px}:${pz}`;
        if (!batches.has(key)) batches.set(key, { x: px, z: pz, cells: [] });
        batches.get(key).cells.push(cell);
      }
      for (const page of batches.values()) {
        const pathName = `pages/${page.x}/${page.z}.json`;
        const payload = { schemaVersion: 1, atlasHash: atlas.contentHash,
          x: page.x, z: page.z, cells: page.cells };
        const raw = JSON.stringify(payload) + '\n';
        generated.set(pathName, raw);
        pages.push({
          x: page.x, z: page.z, path: pathName,
          sha256: checksum(raw), cellCount: page.cells.length,
        });
      }
      pages.sort((a, b) => a.z - b.z || a.x - b.x);
      if (pages.some(p => p.cellCount !== WORLD_PAGE_SIZE * WORLD_PAGE_SIZE)) {
        throw new Error('Staging full atlas must consist of complete geographic pages');
      }
    }
    const index = validateCompiledAtlasIndex({
      schemaVersion: 1,
      profile: geographyMode ? 'geography-stage-v1' : 'placeholder-preview-v1',
      atlas, segments: 16, cells: geographyMode ? [] : refs,
      ...(geographyMode ? { geography: stageGeography.definition, pages } : {}),
    });
    if (geographyMode) {
      for (const page of pages) {
        validateCompiledCellPage(JSON.parse(generated.get(page.path)), index, page);
      }
    }
    if (geographyMode) {
      if (!summary.navWalkable || !summary.navBlocked) {
        throw new Error('Geography navigation overlay has no walkable or blocked terrain');
      }
      if (!summary.land || !summary.ocean || !summary.river || !summary.road ||
        summary.biomes.filter(count => count > 0).length < 4) {
        throw new Error('Geography bake did not generate coast, river, roads and multiple biomes');
      }
      for (const river of stageGeography.rivers) {
        const source = river.points[0], mouth = river.points[river.points.length - 1];
        if (stageGeography.coastDistance(source.x, source.z) <= 0 ||
          stageGeography.coastDistance(mouth.x, mouth.z) >= 0) {
          throw new Error(`River headwater or mouth is not in land/sea: ${river.id}`);
        }
        for (let i = 1; i < river.points.length; i++) {
          if (river.points[i].waterLevel > river.points[i - 1].waterLevel + 0.00001) {
            throw new Error(`Uphill river: ${river.id}`);
          }
        }
      }
      for (const anchor of atlas.anchors) {
        const site = stageGeography.sample(anchor.position.x, anchor.position.z);
        if (site.waterKind === 1 || Math.abs(site.height - anchor.position.y) > 0.001) {
          throw new Error(`Story site is underwater or not leveled: ${anchor.id}`);
        }
      }
    }
    if (geographyMode) {
      // Lightweight precompiled world-wide locator, NOT a replacement for
      // streamed terrain/LOD. Sampling happens offline, never in the browser.
      const minX = -1780, maxX = 3700, minZ = -1090, maxZ = 1320;
      const width = 760, height = 340, columns = 230, rows = 100;
      const fill = ['#173f61', '#277692', '#dac898', '#8bb575',
        '#468465', '#878984', '#e6f0f2', '#bea773'];
      const parts = [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 340" role="img" aria-label="Staging atlas of two continents and three islands">',
        '<rect width="760" height="340" fill="#173f61"/>',
      ];
      const px = x => (x - minX) / (maxX - minX) * width;
      const py = z => (z - minZ) / (maxZ - minZ) * height;
      for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
        const x = minX + (col + 0.5) / columns * (maxX - minX);
        const z = minZ + (row + 0.5) / rows * (maxZ - minZ);
        const s = stageGeography.sample(x, z);
        let color = fill[s.biome];
        if (s.waterKind === 2) color = '#55b7c7';
        else if (s.road > 55) color = '#d1bba0';
        parts.push(`<rect x="${(col * width / columns).toFixed(2)}" y="${(row * height / rows).toFixed(2)}" width="${(width / columns + 0.02).toFixed(2)}" height="${(height / rows + 0.02).toFixed(2)}" fill="${color}"/>`);
      }
      for (const river of stageGeography.rivers) {
        const points = river.points.map(p => `${px(p.x).toFixed(1)},${py(p.z).toFixed(1)}`).join(' ');
        parts.push(`<polyline points="${points}" fill="none" stroke="#66d0d5" stroke-width="1.3" stroke-linecap="round"/>`);
      }
      const anchorById = new Map(atlas.anchors.map(a => [a.id, a]));
      const used = new Set();
      for (const anchor of atlas.anchors) for (const next of anchor.connectsTo ?? []) {
        const key = [anchor.id, next].sort().join(':');
        if (used.has(key)) continue;
        used.add(key);
        const target = anchorById.get(next);
        if (!target) continue;
        parts.push(`<path d="M${px(anchor.position.x).toFixed(2)} ${py(anchor.position.z).toFixed(2)} L${px(target.position.x).toFixed(2)} ${py(target.position.z).toFixed(2)}" fill="none" stroke="#f2db9a" stroke-width="2.2"/>`);
      }
      for (const anchor of atlas.anchors) {
        parts.push(`<circle cx="${px(anchor.position.x).toFixed(2)}" cy="${py(anchor.position.z).toFixed(2)}" r="2.5" fill="#f8d575" stroke="#344044" stroke-width="0.8"/>`);
      }
      for (const land of stageGeography.definition.landmasses) {
        parts.push(`<text x="${px(land.cx).toFixed(2)}" y="${py(land.cz).toFixed(2)}" fill="#fbfbf2" font-size="12" font-family="system-ui,sans-serif" font-weight="650" text-anchor="middle" stroke="#1b3033" stroke-width="2" paint-order="stroke">${land.id}</text>`);
      }
      parts.push('<text x="13" y="21" fill="#faf0cf" font-size="14" font-family="system-ui,sans-serif" font-weight="700">WORLD V2 • STAGING GEOGRAPHY</text>');
      parts.push('<text x="13" y="333" fill="#d3eced" font-size="11" font-family="system-ui,sans-serif">Procedural demonstration only • not final geography or approved story coordinates</text>');
      parts.push('</svg>');
      generated.set('atlas-overview.svg', parts.join('') + '\n');
    }
    generated.set('atlas-index.json', JSON.stringify(index, null, 2) + '\n');
    generated.set('validation-report.json', JSON.stringify({
      schemaVersion: 1,
      profile: geographyMode ? 'geography-stage-v1' : 'placeholder-preview-v1',
      worldId: atlas.worldId,
      atlasHash: atlas.contentHash,
      ...(geographyMode ? {
        geographySummary: summary, riversValidated: stageGeography.rivers.length,
        anchorsValidated: atlas.anchors.length, landmassesDefined: atlas.landmasses.length,
      } : {}),
      cellCount: refs.length,
      ...(geographyMode ? { pageCount: pages.length, pageSizeCells: WORLD_PAGE_SIZE,
        completeExtent: true } : {}),
      checkedSeamVertices,
      maxSeamMismatch: 0,
      generatorVersion: atlas.generatorVersion,
    }, null, 2) + '\n');
    const paths = [...generated.keys()].sort();
    if (verify) {
      const present = collect(out);
      if (JSON.stringify(present) !== JSON.stringify(paths)) {
        throw new Error('Compiled cell file set differs from source: ' + JSON.stringify({ present: present.length, expected: paths.length }));
      }
      for (const filename of paths) {
        const existing = readFileSync(path.join(out, filename), 'utf8');
        if (existing !== generated.get(filename)) throw new Error('Nondeterministic or stale atlas artifact: ' + filename);
      }
    } else {
      rmSync(out, { recursive: true, force: true });
      for (const filename of paths) {
        const fullPath = path.join(out, filename);
        mkdirSync(path.dirname(fullPath), { recursive: true });
        writeFileSync(fullPath, generated.get(filename));
      }
    }
    console.log(`World V2 ${verify ? 'verify' : 'bake'} PASS: ${refs.length} cells (${pages.length} pages), atlas ${atlas.contentHash}, ${paths.length} artifacts, ${checkedSeamVertices} seam vertices, output ${path.relative(root, out)}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
