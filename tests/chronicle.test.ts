import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { BossFinisher } from '../src/rendering/BossFinisher';
import { CharacterRig } from '../src/rendering/CharacterMeshBuilder';
import { buildEnemyMesh } from '../src/rendering/EnemyMeshBuilder';
import { CHAPTER_ECHOES, CHRONICLE_CHAPTERS } from '../src/data/chronicle';
import { advanceChronicle, beginChapter, chapterUnlocked, endingText, ensureCampaign } from '../src/game/CampaignEngine';
import { buildChronicleLayout } from '../src/game/ChronicleWorld';
import { FINISHER_DURATION, FINISHER_SIGNATURES, sampleFinisher } from '../src/game/FinisherTimeline';
import { clampToProceduralPath } from '../src/game/ProceduralPathGenerator';
import { getGuardianPattern, isInsideAttack } from '../src/game/CombatRules';
import { PersistenceManager } from '../src/persistence/PersistenceManager';
import { InMemoryStorageAdapter } from '../src/persistence/StorageAdapter';

async function hero() {
  const persistence = new PersistenceManager(new InMemoryStorageAdapter());
  await persistence.init();
  const account = await persistence.loginOrCreateAccount('chronicle', 'Reader');
  return persistence.createCharacter({ accountId: account.id, classId: 'warrior', name: 'Reader' });
}

describe('The Long Dawn content and progression', () => {
  it('contains twelve distinct chapters across six regions, with solvable puzzles and named guardians', () => {
    expect(CHRONICLE_CHAPTERS).toHaveLength(12);
    expect(new Set(CHRONICLE_CHAPTERS.map(chapter => chapter.region)).size).toBe(6);
    const ids: string[] = [];
    for (const chapter of CHRONICLE_CHAPTERS) {
      expect(chapter.guardian.lastWords.length).toBeGreaterThan(30);
      expect(chapter.objectives.some(objective => objective.kind === 'battle')).toBe(true);
      expect(chapter.objectives.some(objective => objective.kind === 'puzzle')).toBe(true);
      for (const objective of chapter.objectives) {
        ids.push(objective.id);
        if (objective.kind === 'puzzle') {
          expect(objective.clue).toBeTruthy();
          expect(objective.options![objective.answer!]).toBeTruthy();
        }
      }
    }
    expect(new Set(ids).size).toBe(ids.length);
    const echoes = Object.values(CHAPTER_ECHOES).flat();
    expect(echoes).toHaveLength(36);
    expect(new Set(echoes.map(echo => echo.text)).size).toBe(36);
  });
  it('prevents chapter skips, wrong puzzle answers, and duplicate rewards', async () => {
    const character = await hero();
    expect(beginChapter(character, 1)).toBe(false);
    expect(beginChapter(character, 0)).toBe(true);
    const chapter = CHRONICLE_CHAPTERS[0];
    const startXp = character.xp;
    expect(advanceChronicle(character, chapter.objectives[0].id).advanced).toBe(true);
    const afterXp = character.xp;
    expect(afterXp).toBeGreaterThan(startXp);
    expect(advanceChronicle(character, chapter.objectives[0].id).advanced).toBe(false);
    expect(character.xp).toBe(afterXp);
    advanceChronicle(character, chapter.objectives[1].id);
    const puzzle = chapter.objectives[2];
    expect(advanceChronicle(character, puzzle.id, (puzzle.answer! + 1) % 3).advanced).toBe(false);
    expect(ensureCampaign(character).objectiveIndex).toBe(2);
    expect(advanceChronicle(character, puzzle.id, puzzle.answer).advanced).toBe(true);
    expect(beginChapter(character, 1)).toBe(false);
  });
  it('plays every authored objective through the ending and persists choices and histories', async () => {
    const character = await hero();
    for (let i = 0; i < CHRONICLE_CHAPTERS.length; i++) {
      expect(beginChapter(character, i)).toBe(true);
      for (const objective of CHRONICLE_CHAPTERS[i].objectives) {
        const result = advanceChronicle(character, objective.id, objective.kind === 'puzzle' ? objective.answer : objective.kind === 'choice' ? 0 : undefined);
        expect(result.advanced).toBe(true);
      }
      expect(chapterUnlocked(ensureCampaign(character), i + 1)).toBe(i + 1 < 12);
    }
    const state = ensureCampaign(character);
    expect(state.completedChapterIds).toHaveLength(12);
    expect(state.codexEntries).toHaveLength(12);
    expect(state.journal.length).toBeGreaterThanOrEqual(48);
    expect(Object.keys(state.choices)).toHaveLength(5);
    expect(endingText(state)).toContain('Lost names return');
    state.choices.ending = 1;
    expect(endingText(state)).toContain('Nobody is asked to feed it another life');
    const snapshot = structuredClone(character);
    expect(ensureCampaign(snapshot).completedChapterIds).toHaveLength(12);
  });
  it('preserves unfinished chapter progress when revisiting a completed region', async () => {
    const character = await hero();
    beginChapter(character, 0);
    for (const objective of CHRONICLE_CHAPTERS[0].objectives) advanceChronicle(character, objective.id, objective.answer ?? (objective.options ? 0 : undefined));
    beginChapter(character, 1);
    advanceChronicle(character, CHRONICLE_CHAPTERS[1].objectives[0].id);
    expect(ensureCampaign(character).objectiveIndex).toBe(1);
    beginChapter(character, 0);
    beginChapter(character, 1);
    expect(ensureCampaign(character).objectiveIndex).toBe(1);
  });
  it('connects all landmarks and side routes in every region', () => {
    for (const chapter of CHRONICLE_CHAPTERS) {
      const { layout, sites } = buildChronicleLayout(chapter);
      const visited = new Set([0]);
      let previous = -1;
      while (previous !== visited.size) {
        previous = visited.size;
        for (const [a, b] of layout.connections!) {
          if (visited.has(a)) visited.add(b);
          if (visited.has(b)) visited.add(a);
        }
      }
      expect(visited.size).toBe(layout.waypoints.length);
      expect(sites.filter(site => site.kind === 'echo')).toHaveLength(3);
      for (const site of sites) {
        const clamped = clampToProceduralPath(site.position.x, site.position.z, layout);
        expect(clamped.x).toBeCloseTo(site.position.x);
        expect(clamped.z).toBeCloseTo(site.position.z);
      }
    }
  });
});

describe('guardian execution timeline', () => {
  it('completes naturally and restores actors, lighting, lens, and owned resources exactly once', () => {
    vi.stubGlobal('window', { innerWidth: 1280, innerHeight: 800 });
    const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(44, 1.6);
    const hero = new CharacterRig('warrior'); const boss = buildEnemyMesh('boss_knight');
    hero.root.position.set(3, 0, 4); scene.add(hero.root, boss.root);
    const light = new THREE.AmbientLight(0xffffff, 2); scene.add(light);
    const complete = vi.fn();
    const sequence = new BossFinisher(scene, camera, { hero, boss, classId: 'warrior', bossName: 'Avel', lastWords: 'Remember.' }, vi.fn(), vi.fn(), complete);
    expect(boss.hpBarGroup.visible).toBe(false);
    expect(light.intensity).toBeLessThan(2);
    sequence.update(7.3);
    sequence.update(6);
    sequence.finish();
    expect(complete).toHaveBeenCalledOnce();
    expect(hero.root.position.toArray()).toEqual([3, 0, 4]);
    expect(boss.root.visible).toBe(true);
    expect(boss.hpBarGroup.visible).toBe(true);
    expect(camera.fov).toBe(44);
    expect(light.intensity).toBe(2);
    expect(scene.children).toHaveLength(3);
    vi.unstubAllGlobals();
  });
  it('has ordered anticipation, buildup, execution, impact, and requiem phases', () => {
    expect(sampleFinisher(0, 'warrior', 'Avel', '').phase).toBe('silence');
    expect(sampleFinisher(1.6, 'warrior', 'Avel', '').phase).toBe('awakening');
    expect(sampleFinisher(4.2, 'warrior', 'Avel', '').phase).toBe('execution');
    expect(sampleFinisher(7.2, 'warrior', 'Avel', '').flash).toBe(1);
    expect(sampleFinisher(8.6, 'warrior', 'Avel', '').phase).toBe('requiem');
    expect(sampleFinisher(FINISHER_DURATION + 5, 'warrior', 'Avel', '').progress).toBe(1);
    for (let time = 0; time <= FINISHER_DURATION; time += 0.01) {
      const frame = sampleFinisher(time, 'mage', 'Avel', 'Remember.');
      expect(frame.phaseProgress).toBeGreaterThanOrEqual(0);
      expect(frame.phaseProgress).toBeLessThanOrEqual(1);
    }
    expect(new Set(Object.values(FINISHER_SIGNATURES).map(signature => signature.title)).size).toBe(3);
  });
  it('gives ring guardians a genuinely safe inner area and coast guardians ranged attacks', () => {
    const winter = getGuardianPattern('frostmarch', false);
    expect(isInsideAttack({ x: 0, z: 0 }, { x: 0, z: 0 }, winter.radius, winter.innerRadius)).toBe(false);
    expect(isInsideAttack({ x: 3, z: 0 }, { x: 0, z: 0 }, winter.radius, winter.innerRadius)).toBe(true);
    expect(getGuardianPattern('ember_coast', false).reach).toBeGreaterThan(getGuardianPattern('crown_of_night', false).reach);
  });
});
