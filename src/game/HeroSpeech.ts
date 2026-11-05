export type MouthShape = 'SpeakOpen' | 'SpeakWide' | 'SpeakRound';
export type HeroExpression = 'alert' | 'resolve' | 'concern';

export interface HeroSyllable {
  at: number;
  mouth: MouthShape;
}

export const HERO_SYLLABLE_SECONDS = 0.14;

/** The local voice and the animated mouth share this cue list. */
export function heroSyllables(line: string): HeroSyllable[] {
  const syllables: HeroSyllable[] = [];
  let at = 0;
  for (const token of line.toLowerCase().match(/[aeiouy]+|[,.;!?]/g) ?? []) {
    if (/[,.!?;]/.test(token)) {
      at += token === ',' ? .07 : .14;
      continue;
    }
    const mouth: MouthShape = /^[ou]/.test(token) ? 'SpeakRound'
      : /^[iey]/.test(token) ? 'SpeakWide' : 'SpeakOpen';
    syllables.push({ at, mouth });
    at += HERO_SYLLABLE_SECONDS;
  }
  return syllables;
}
