import { nextCampaignChapter } from './WorldRoutes';
import { CHRONICLE_CHAPTERS } from '../data/chronicle';
import { CampaignState, ChronicleChapter, ChronicleObjective } from '../types/campaign';
import { CharacterSaveData, ZoneId } from '../types/game';
import { QuestObjectiveView } from '../types/quest';

export function isChronicleRegion(zone: ZoneId): boolean {
  return CHRONICLE_CHAPTERS.some(chapter => chapter.region === zone);
}

export function ensureCampaign(character: CharacterSaveData): CampaignState {
  const raw = character.campaign;
  if (raw) { raw.worldSeeds ??= {}; raw.fieldProgress ??= {}; }
  if (raw?.version === 1) { raw.chapterProgress ??= { [CHRONICLE_CHAPTERS[raw.chapterIndex]?.id ?? CHRONICLE_CHAPTERS[0].id]: raw.objectiveIndex }; return raw; }
  const state: CampaignState = {
    version: 1, started: raw?.started ?? false,
    chapterIndex: Math.max(0, Math.min(CHRONICLE_CHAPTERS.length - 1, raw?.chapterIndex ?? 0)),
    objectiveIndex: Math.max(0, raw?.objectiveIndex ?? 0),
    completedChapterIds: [...new Set(raw?.completedChapterIds ?? [])].filter(id => CHRONICLE_CHAPTERS.some(chapter => chapter.id === id)),
    chapterProgress: raw?.chapterProgress ?? {},
    discoveries: raw?.discoveries ?? [], choices: raw?.choices ?? {}, codexEntries: raw?.codexEntries ?? [],
    journal: raw?.journal ?? [], checkpoints: raw?.checkpoints ?? {}, worldSeeds: raw?.worldSeeds ?? {}, fieldProgress: raw?.fieldProgress ?? {},
  };
  character.campaign = state;
  return state;
}

export function currentChapter(character: CharacterSaveData): ChronicleChapter {
  return CHRONICLE_CHAPTERS[ensureCampaign(character).chapterIndex];
}

export function currentObjective(character: CharacterSaveData): ChronicleObjective | null {
  const state = ensureCampaign(character);
  return CHRONICLE_CHAPTERS[state.chapterIndex].objectives[state.objectiveIndex] ?? null;
}

export function chapterUnlocked(state: CampaignState, index: number): boolean {
  return index >= 0 && index < CHRONICLE_CHAPTERS.length && CHRONICLE_CHAPTERS.slice(0, index).every(chapter => state.completedChapterIds.includes(chapter.id));
}

export function beginChapter(character: CharacterSaveData, index: number): boolean {
  const state = ensureCampaign(character);
  if (!chapterUnlocked(state, index)) return false;
  if (state.started && index === state.chapterIndex) return true;
  state.chapterProgress[CHRONICLE_CHAPTERS[state.chapterIndex].id] = state.objectiveIndex;
  state.started = true; state.chapterIndex = index;
  state.objectiveIndex = state.completedChapterIds.includes(CHRONICLE_CHAPTERS[index].id) ? CHRONICLE_CHAPTERS[index].objectives.length : state.chapterProgress[CHRONICLE_CHAPTERS[index].id] ?? 0;
  return true;
}

export function advanceChronicle(character: CharacterSaveData, objectiveId: string, selectedOption?: number): { advanced: boolean; chapterComplete: boolean; message: string } {
  const state = ensureCampaign(character);
  const chapter = CHRONICLE_CHAPTERS[state.chapterIndex];
  const objective = chapter.objectives[state.objectiveIndex];
  if (!state.started || !objective || objective.id !== objectiveId || state.discoveries.includes(objectiveId)) return { advanced: false, chapterComplete: false, message: 'This memory has already been resolved.' };
  if (objective.options) {
    if (selectedOption === undefined || selectedOption < 0 || selectedOption >= objective.options.length) return { advanced: false, chapterComplete: false, message: 'Choose a response.' };
    if (objective.kind === 'puzzle' && selectedOption !== objective.answer) return { advanced: false, chapterComplete: false, message: 'The mechanism falls silent. Read the inscription and try another interpretation.' };
    if (objective.kind === 'choice') state.choices[objective.id] = selectedOption;
  }
  state.discoveries.push(objectiveId);
  state.journal.push(`${chapter.title} — ${objective.title}${objective.kind === 'choice' ? `: ${objective.options![selectedOption!]}` : ''}`);
  state.objectiveIndex += 1;
  state.chapterProgress[chapter.id] = state.objectiveIndex;
  character.xp += objective.kind === 'battle' ? 140 : 65;
  character.aetherCrystals += objective.kind === 'puzzle' ? 8 : 3;
  const complete = state.objectiveIndex >= chapter.objectives.length;
  if (complete && !state.completedChapterIds.includes(chapter.id)) {
    state.completedChapterIds.push(chapter.id);
    state.codexEntries.push(chapter.id);
    character.gold += 180 + state.chapterIndex * 60;
    character.aetherCrystals += 30;
  }
  return { advanced: true, chapterComplete: complete, message: complete ? `${chapter.title} is complete. Follow the gold compass through the road beyond camp.` : 'A new entry has been added to your journal.' };
}

export function chronicleObjectiveView(character: CharacterSaveData, zone: ZoneId): QuestObjectiveView | null {
  const state = ensureCampaign(character);
  if (zone === 'starting_town' || zone === 'market_crossing') {
    const next = CHRONICLE_CHAPTERS[nextCampaignChapter(state)];
    return { questTitle: 'THE LONG DAWN', chapterTitle: 'THE BELLROAD', stage: 'chronicle', stepNumber: 1, totalSteps: 1, objectiveTitle: `Take the east Bellroad to ${next.title}`, objectiveHint: 'Follow the gold compass to the east gate. The north and south roads lead to the original wilderness expeditions. Rest here to refill your flasks.', progressText: `${state.completedChapterIds.length} / 12 chapters complete · Town sanctuary`, isComplete: false, targetZone: next.region, targetNpcId: null, actionButtonLabel: null, companionBanter: null };
  }
  if (!state.started || !isChronicleRegion(zone)) return null;
  const chapter = CHRONICLE_CHAPTERS[state.chapterIndex];
  const objective = chapter.objectives[state.objectiveIndex];
  const finished = !objective;
  return {
    questTitle: 'THE LONG DAWN', chapterTitle: chapter.act, stage: 'chronicle',
    stepNumber: Math.min(chapter.objectives.length, state.objectiveIndex + 1), totalSteps: chapter.objectives.length,
    objectiveTitle: objective?.title ?? (state.completedChapterIds.length === CHRONICLE_CHAPTERS.length ? 'A morning of our own' : 'The next road is waiting'),
    objectiveHint: finished ? 'Follow the gold compass to the road beyond camp. Walk through to continue; the return road leads to town.' : objective.hint,
    progressText: `CHAPTER ${state.chapterIndex + 1} / ${CHRONICLE_CHAPTERS.length} · ${state.objectiveIndex} / ${chapter.objectives.length} memories resolved`,
    isComplete: finished, targetZone: chapter.region, targetNpcId: null, actionButtonLabel: null, companionBanter: null,
  };
}

export function endingText(state: CampaignState): string {
  const returnedNames = state.choices.bark_names === 0;
  const harbor = state.choices.coastal_refuge === 1 ? 'Lyra’s seawall holds the lower harbor.' : 'Maera’s ferries bring every family to higher ground.';
  const truth = state.choices.city_truth === 1 ? 'The prisoners hear the truth in freedom.' : 'The capital hears the witness through its own bells.';
  const ending = state.choices.ending === 1 ? 'The archive stays open. Nobody is asked to feed it another life.' : 'Lost names return with the dawn. Grief arrives beside love, and both are allowed to stay.';
  const promise = state.choices.free_will === 0 ? 'The Triad keeps its promise to return what was stolen.' : 'The Triad keeps its promise to protect those still living.';
  return `${promise} ${returnedNames ? 'Families in the wood speak the recovered names aloud.' : 'Vael carries the names home, one household at a time.'} ${harbor} ${truth} ${ending}`;
}
