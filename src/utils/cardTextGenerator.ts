import { CardTextGeneratorState, GeneratedCardText, RoundType, Theme } from '../types';

const TONE_HELPERS: Record<CardTextGeneratorState['tone'], string> = {
  silly: 'absurd and playful',
  sarcastic: 'dry and witty',
  'dark humour': 'edgy but still game-safe',
  'british humour': 'cheeky, awkward, UK-flavoured banter',
  'party game': 'big-energy party table vibe',
  chaotic: 'high-chaos, unpredictable, loud punchline energy'
};

function pick<T>(items: T[], index: number): T {
  return items[index % items.length];
}

function getThemePhrase(theme: Theme, index: number): string {
  const motif = pick(theme.motifs, index);
  return `theme flair: ${motif}`;
}

function getDefaultLine(
  state: CardTextGeneratorState,
  roundType: RoundType,
  theme: Theme,
  index: number
): string {
  const example = pick(roundType.examples, index);
  const tone = TONE_HELPERS[state.tone];
  return `${roundType.name} — ${example} (${getThemePhrase(theme, index)}; tone: ${tone}; clean teen-safe).`;
}

function getAdultLine(
  state: CardTextGeneratorState,
  roundType: RoundType,
  theme: Theme,
  index: number
): string {
  const examples = [
    `Drop a bold line using ${pick(theme.motifs, index)} as your alibi`,
    `Blame the chaos on ${pick(theme.borderMotifs, index)} and stick to one punchy sentence`,
    `Confess with swagger, then deflect with a joke about ${pick(theme.motifs, index + 1)}`
  ];
  const tone = TONE_HELPERS[state.tone];
  return `${roundType.name} — ${pick(examples, index)} (adult mode: edgy, swearing allowed, suggestive only, no explicit sexual acts, no hate speech, no minors, no harm instructions; tone: ${tone}).`;
}

export function generateCardTexts(
  state: CardTextGeneratorState,
  roundType: RoundType,
  theme: Theme
): GeneratedCardText[] {
  return Array.from({ length: state.count }, (_, index) => {
    const text =
      state.version === 'adult'
        ? getAdultLine(state, roundType, theme, index)
        : getDefaultLine(state, roundType, theme, index);

    return {
      id: `${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
      roundTypeId: roundType.id,
      themeId: theme.id,
      version: state.version,
      tone: state.tone,
      text
    };
  });
}
