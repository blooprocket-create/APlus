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
const outArgIndex = args.indexOf('--out');
const out = path.resolve(root, outArgIndex >= 0 ? args[outArgIndex + 1] : 'public/world-v2/preview');
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
    const { buildPlaceholderTerrainCell } = require('./WorldTerrain.js');
    const { encodeCompiledCell, validateCompiledAtlasIndex } = require('./WorldArtifacts.js');

    // The 9x9 local patch is a preview fixture, not a world extent or stream limit.
    // Canonical production data will be paged from the authored atlas/Phase 2 bake.
    const coords = [];
    for (let z = -4; z <= 4; z++) {
      for (let x = -4; x <= 4; x++) coords.push({ x, z });
    }
    if (reverse) coords.reverse();
    const generated = new Map();
    const refs = [];
    const terrainByCoord = new Map();
    for (const address of coords) {
      const cell = buildPlaceholderTerrainCell(previewAtlas, address);
      terrainByCoord.set(`${address.x}:${address.z}`, cell);
      const artifact = encodeCompiledCell(previewAtlas, cell);
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
    const index = validateCompiledAtlasIndex({
      schemaVersion: 1, profile: 'placeholder-preview-v1',
      atlas: previewAtlas, segments: 16, cells: refs,
    });
    generated.set('atlas-index.json', JSON.stringify(index, null, 2) + '\n');
    generated.set('validation-report.json', JSON.stringify({
      schemaVersion: 1,
      profile: 'placeholder-preview-v1',
      worldId: previewAtlas.worldId,
      atlasHash: previewAtlas.contentHash,
      cellCount: refs.length,
      checkedSeamVertices,
      maxSeamMismatch: 0,
      generatorVersion: previewAtlas.generatorVersion,
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
    console.log(`World V2 ${verify ? 'verify' : 'bake'} PASS: ${refs.length} cells, atlas ${previewAtlas.contentHash}, ${paths.length} artifacts, ${checkedSeamVertices} seam vertices, output ${path.relative(root, out)}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
