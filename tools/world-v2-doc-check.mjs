#!/usr/bin/env node
/**
 * World V2 documentation contract check.
 * Fails CI on broken local links, missing agent entrypoints, or drift between
 * the live 13-step opening and the Phase 3 test inventory.
 *
 * This cannot approve creative decisions or infer implementation status.
 * Human review must still update the decision/status ledger on every PR.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const tracked = [
  'AGENTS.md',
  'CLAUDE.md',
  'README.md',
  'docs/WORLD_V2_STATUS.md',
  'docs/WORLD_V2_DECISIONS.md',
  'docs/WORLD_V2_ARCHITECTURE.md',
  'docs/WORLD_V2_PHASE3_HANDOFF.md',
  'docs/PRODUCTION_ROADMAP.md',
  'docs/DESIGN_DIRECTION.md',
  'docs/DESIGN_OVERVIEW.md',
];
const errors = [];
const read = name => {
  const file = path.join(root, name);
  if (!existsSync(file)) {
    errors.push('Missing required doc: ' + name);
    return '';
  }
  return readFileSync(file, 'utf8');
};
const docs = new Map(tracked.map(name => [name, read(name)]));

for (const [name, text] of docs) {
  // Only local Markdown links are checked; web URLs, named fragments, and
  // app-relative runtime routes aren't source files.
  const markdownLinks = /!?\[[^\]]+\]\(([^)]+)\)/g;
  for (const match of text.matchAll(markdownLinks)) {
    let target = match[1].trim();
    if (!target || /^(?:https?:|mailto:|#|\/)/i.test(target)) continue;
    // Links with optional Markdown title: (path "title").
    target = target.split(/\s+["']/)[0].split('#')[0].split('?')[0];
    try { target = decodeURIComponent(target); }
    catch { errors.push(name + ': invalid URL encoding: ' + target); continue; }
    const resolved = path.resolve(root, path.dirname(name), target);
    if (!resolved.startsWith(root + path.sep)) {
      errors.push(name + ': local link escapes repository: ' + match[1]);
    } else if (!existsSync(resolved)) {
      errors.push(name + ': broken local link: ' + match[1]);
    }
  }
}

function mustContain(file, phrase, description) {
  if (!docs.get(file)?.includes(phrase)) errors.push(file + ': missing ' + description);
}
mustContain('AGENTS.md', 'WORLD_V2_DECISIONS.md', 'decision register link');
mustContain('AGENTS.md', 'WORLD_V2_STATUS.md', 'status source of truth');
mustContain('AGENTS.md', 'WORLD_V2_PHASE3_HANDOFF.md', 'next-work handoff');
mustContain('CLAUDE.md', 'AGENTS.md', 'delegated common agent instructions');
mustContain('docs/WORLD_V2_STATUS.md', 'staging', 'staging/prod distinction');
if (!/not implemented|not yet|future/i.test(docs.get('docs/WORLD_V2_STATUS.md') ?? '')) {
  errors.push('docs/WORLD_V2_STATUS.md: missing unshipped-system distinction');
}
mustContain('docs/WORLD_V2_DECISIONS.md', 'LOCKED', 'explicit decision statuses');
mustContain('docs/PRODUCTION_ROADMAP.md', 'Phase 3', 'current phase plan');

const design = docs.get('docs/WORLD_V2_DECISIONS.md') ?? '';
for (let d = 155; d <= 165; d++) {
  if (!new RegExp('D' + d + '\\b').test(design)) errors.push('Missing World V2 decision D' + d);
}

const story = readFileSync(path.join(root, 'src/game/HearthmereStory.ts'), 'utf8');
const declared = story.match(/export const OPENING_STEPS\s*=\s*\[([\s\S]*?)\]/);
if (!declared) errors.push('Cannot locate authoritative opening machine steps');
else {
  const ids = [...declared[1].matchAll(/'([^']+)'/g)].map(match => match[1]);
  const handoff = docs.get('docs/WORLD_V2_PHASE3_HANDOFF.md') ?? '';
  if (ids.length !== 13) errors.push('Opening step count changed from 13; revisit Phase 3 handoff');
  for (const id of ids) {
    if (!handoff.includes('`' + id + '`') && !handoff.includes(id)) {
      errors.push('Phase 3 handoff missing existing opening step: ' + id);
    }
  }
}

const baseModuleList = [
  'src/world-v2/WorldAtlas.ts',
  'src/world-v2/WorldSurface.ts',
  'src/world-v2/WorldNavigation.ts',
  'src/world-v2/WorldV2GameplayBridge.ts',
  'src/world-v2/WorldGeographyStage.ts',
  'src/world-v2/geography-lab.ts',
  'src/game/HearthmereOpening.ts',
  'src/rendering/IsometricCamera.ts',
];
for (const modulePath of baseModuleList) {
  if (!existsSync(path.join(root, modulePath))) {
    errors.push('Agent handoff source reference missing: ' + modulePath);
  }
}

if (errors.length) {
  for (const error of errors) console.error('DOC CONTRACT FAIL:', error);
  console.error('Documentation contract FAILED (' + errors.length + ' issue(s))');
  process.exit(1);
}
console.log('World V2 documentation contract PASS: ' + tracked.length +
  ' entrypoint/roadmap docs, local links, D155–D165 and opening step inventory.');
