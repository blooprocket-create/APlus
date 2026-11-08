#!/usr/bin/env node
/**
 * Phase 0: conservative static module-graph inventory.
 * Does NOT prove a module executes at runtime or is safe to delete.
 * CI runs this after npm ci and uploads the JSON evidence.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';

const base = path.resolve(process.cwd(), 'src');
const key = absolute => path.relative(process.cwd(), absolute).replaceAll(path.sep, '/');
const files = [];
function scan(folder) {
  for (const item of readdirSync(folder, { withFileTypes: true })) {
    const absolute = path.join(folder, item.name);
    if (item.isDirectory()) scan(absolute);
    else if (/\.(?:ts|tsx)$/.test(item.name) && !item.name.endsWith('.d.ts')) files.push(absolute);
  }
}
scan(base);
files.sort();
const fileSet = new Set(files);
const imports = new Map();
const graph = new Map();
const unresolved = [];
const external = new Set();

function resolveLocal(source, specifier) {
  if (!specifier.startsWith('.')) { external.add(specifier); return null; }
  const candidate = path.resolve(path.dirname(source), specifier);
  for (const absolute of [
    candidate, candidate + '.ts', candidate + '.tsx',
    candidate.replace(/\.js$/, '.ts'), candidate.replace(/\.js$/, '.tsx'),
    path.join(candidate, 'index.ts'), path.join(candidate, 'index.tsx'),
  ]) {
    if (fileSet.has(absolute)) return absolute;
  }
  unresolved.push({ importer: key(source), specifier });
  return null;
}
function isTypeOnlyImport(node) {
  const clause = node.importClause;
  return !!clause && (clause.isTypeOnly ||
    (!!clause.namedBindings && ts.isNamedImports(clause.namedBindings) &&
      clause.namedBindings.elements.length > 0 &&
      clause.namedBindings.elements.every(e => e.isTypeOnly) &&
      !clause.name));
}

for (const absolute of files) {
  const source = ts.createSourceFile(absolute, readFileSync(absolute, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const edges = [];
  function add(specifier, kind) {
    const target = resolveLocal(absolute, specifier);
    if (target) edges.push({ path: key(target), kind });
  }
  function visit(node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      add(node.moduleSpecifier.text, isTypeOnlyImport(node) ? 'type-only' : 'import');
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const typeOnly = node.isTypeOnly ||
        (node.exportClause && ts.isNamedExports(node.exportClause) &&
         node.exportClause.elements.length > 0 && node.exportClause.elements.every(x => x.isTypeOnly));
      add(node.moduleSpecifier.text, typeOnly ? 'type-only' : 'reexport');
    } else if (ts.isCallExpression(node) && node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0]) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
       (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
      add(node.arguments[0].text, 'dynamic');
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression && ts.isStringLiteral(node.moduleReference.expression)) {
      add(node.moduleReference.expression.text, node.isTypeOnly ? 'type-only' : 'import-equals');
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  imports.set(key(absolute), edges);
  graph.set(key(absolute), [...new Set(edges.filter(e => e.kind !== 'type-only').map(e => e.path))]);
}

const entrypoint = 'src/main.ts';
if (!imports.has(entrypoint)) throw new Error('Missing src/main.ts entrypoint');
const reachable = new Set();
function walk(source) {
  if (reachable.has(source)) return;
  reachable.add(source);
  for (const next of graph.get(source) ?? []) walk(next);
}
walk(entrypoint);
const incoming = new Map();
for (const [importer, edges] of imports) {
  for (const target of edges) {
    if (!incoming.has(target.path)) incoming.set(target.path, []);
    incoming.get(target.path).push({ path: importer, kind: target.kind });
  }
}
const legacyFiles = [
  'src/game/ProceduralPathGenerator.ts',
  'src/game/ChronicleWorld.ts', 'src/game/WorldRoutes.ts',
  'src/game/CampaignEngine.ts', 'src/game/QuestEngine.ts',
  'src/game/FieldActivities.ts', 'src/game/MoatSlice.ts',
  'src/rendering/ChronicleEnvironment.ts', 'src/rendering/EmberCoast.ts',
  'src/rendering/RememberingWood.ts', 'src/data/chronicle.ts',
  'src/types/campaign.ts', 'src/types/quest.ts',
];
const mixedFiles = [
  'src/game/GameEngine.ts', 'src/ui/UIManager.ts', 'src/ui/CutsceneDirector.ts',
  'src/rendering/EnvironmentBuilder.ts', 'src/persistence/PersistenceManager.ts',
  'src/types/game.ts',
];
const protectedSources = [
  'src/game/CompanionRoster.ts',
  'src/game/HearthmereStory.ts',
  'src/persistence/HearthmereSave.ts',
];
const forbiddenDirect = {
  'src/game/CompanionRoster.ts': new Set(['src/game/QuestEngine.ts', 'src/game/CampaignEngine.ts']),
  'src/game/HearthmereStory.ts': new Set(['src/game/HearthmereOpening.ts', 'src/rendering/EnvironmentBuilder.ts']),
  'src/persistence/HearthmereSave.ts': new Set(['src/game/HearthmereOpening.ts', 'src/game/QuestEngine.ts']),
};
const violations = [];
for (const [source, banned] of Object.entries(forbiddenDirect)) {
  for (const edge of imports.get(source) ?? []) {
    if (banned.has(edge.path)) violations.push(source + ' depends on ' + edge.path);
  }
}
const describe = source => ({
  path: source, exists: imports.has(source),
  staticallyReachableFromCurrentEntrypoint: reachable.has(source),
  directImporters: (incoming.get(source) ?? []).sort((a,b) => a.path.localeCompare(b.path)),
  directImports: imports.get(source) ?? [],
});
const report = {
  schemaVersion: 1, entrypoint,
  scope: 'Conservative TypeScript static dependencies, not execution-level reachability',
  sourceFiles: files.length, staticallyReachableFiles: reachable.size,
  notStaticallyReachableFiles: [...imports.keys()].filter(k => !reachable.has(k)),
  externalImports: [...external].sort(),
  unresolved, violations,
  legacy: legacyFiles.map(describe),
  mixed: mixedFiles.map(describe),
  protected: protectedSources.map(describe),
};
if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 2));
else {
  console.log('World V2 Phase 0 dependency audit');
  console.log(`Analyzed ${report.sourceFiles} source modules; ${reachable.size} conservatively reachable from ${entrypoint}.`);
  for (const e of report.legacy) {
    console.log(`  ${e.staticallyReachableFromCurrentEntrypoint ? 'BUNDLED' : 'NOT-REACHED'}  ${e.path}  <- ${e.directImporters.map(x => x.path).join(', ') || 'none'}`);
  }
  console.log(`Unresolved local imports: ${unresolved.length}; forbidden dependencies: ${violations.length}`);
}
if (unresolved.length || violations.length) {
  console.error(JSON.stringify({ unresolved, violations }, null, 2));
  process.exitCode = 1;
}
