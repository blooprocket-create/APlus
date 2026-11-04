import { CharacterClassId } from '../types/game';

export const FINISHER_DURATION = 12.4;
export type FinisherPhase = 'silence' | 'awakening' | 'execution' | 'impact' | 'requiem';
export interface FinisherFrame {
  time: number;
  progress: number;
  phase: FinisherPhase;
  phaseProgress: number;
  title: string;
  subtitle: string;
  bossName: string;
  lastWords: string;
  flash: number;
}

export const FINISHER_SIGNATURES: Record<CharacterClassId, { title: string; subtitle: string; color: number }> = {
  warrior: { title: 'HEAVEN, BREAK.', subtitle: 'SUNDERING OF THE GOLDEN OATH', color: 0xffcf75 },
  mage: { title: 'LET THE STARS REMEMBER.', subtitle: 'REQUIEM OF THE NINTH CONSTELLATION', color: 0x91dfff },
  assassin: { title: 'NOT EVEN A SHADOW.', subtitle: 'ONE THOUSAND ENDS. ONE SILENCE.', color: 0xe899ff },
};

export function sampleFinisher(time: number, classId: CharacterClassId, bossName: string, lastWords: string): FinisherFrame {
  const t = Math.max(0, Math.min(FINISHER_DURATION, time));
  const bounds = [0, 1.6, 4.2, 7.2, 8.6, FINISHER_DURATION];
  const phases: FinisherPhase[] = ['silence', 'awakening', 'execution', 'impact', 'requiem'];
  let index = 0;
  while (index < 4 && t >= bounds[index + 1]) index += 1;
  return {
    time: t, progress: t / FINISHER_DURATION, phase: phases[index],
    phaseProgress: (t - bounds[index]) / (bounds[index + 1] - bounds[index]),
    title: FINISHER_SIGNATURES[classId].title, subtitle: FINISHER_SIGNATURES[classId].subtitle,
    bossName, lastWords,
    flash: t >= 7.2 && t < 7.65 ? Math.pow(1 - (t - 7.2) / 0.45, 3) : 0,
  };
}
