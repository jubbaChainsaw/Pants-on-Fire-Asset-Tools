import { PromptGeneratorState, GeneratedPrompt, Theme } from '../types';

const GLOBAL_NEGATIVE_PROMPT =
  'Do not create two cards. Do not create a pair of cards. Do not create a side-by-side layout. Do not include a background. Do not place the card in a scene. Do not crop the card. Do not change aspect ratio.';

const HARD_RULES = [
  'ONE card only',
  'No multiple cards',
  'No side-by-side layouts',
  'No mockups',
  'No hands',
  'No table',
  'No background scenes',
  'Transparent background',
  'Card centered and isolated',
  'Portrait ratio 2.5:3.5',
  'Rounded corners',
  'Cartoony, colourful style',
  'Bold outlines',
  'High contrast colours',
  'Must support white text with black outline',
  'Must support red text with white outline'
];

function getStyleIntensityDescriptor(intensity: PromptGeneratorState['styleIntensity']): string {
  if (intensity === 'clean') return 'clean composition, tidy layers, less clutter';
  if (intensity === 'colourful') return 'rich colours, energetic accents, extra pop';
  return 'maximal wacky chaos, eccentric motifs, loud visual punch';
}

function getToneDescriptor(tone: PromptGeneratorState['tone']): string {
  return {
    fun: 'lighthearted and playful',
    dark: 'moody but still party-safe',
    silly: 'goofy and absurd',
    premium: 'polished, premium finish and crisp detail',
    party: 'rowdy party-game energy',
    chaotic: 'wild, frantic, over-the-top chaos'
  }[tone];
}

function getAdultModeInstructions(variant: 'default' | 'adult'): string {
  if (variant === 'default') {
    return 'Teen-safe tone. Avoid explicit themes.';
  }

  return [
    'Adult 18+ mode: edgy, chaotic, party-game tone.',
    'Slightly risqué and suggestive only.',
    'NO nudity, NO explicit sex, NO porn, NO minors.'
  ].join(' ');
}

function getBackCardInstructions(theme: Theme): string {
  return [
    'Create full card back design.',
    'Composition should be symmetrical or balanced.',
    'Strong theme visuals with clear motifs.',
    `Use theme motifs: ${theme.motifs.join(', ')}.`,
    `Use border motifs: ${theme.borderMotifs.join(', ')}.`,
    'Include the exact title text: "Pants on Fire!" and subtitle: "Find the Liar".'
  ].join(' ');
}

function getFrontCardInstructions(theme: Theme): string {
  return [
    'Create front card design for prompt text overlay.',
    'Reserve a VERY LARGE centered text-safe panel (rounded rectangle) that uses roughly 75-80% card width and 56-64% card height.',
    'The safe panel must stay clean and visually quiet for long multi-line prompts.',
    'Do NOT place characters, icons, logos, heavy textures, or high-contrast patterns inside the text-safe panel.',
    'Push all decorative artwork to the outer frame, corners, and border only.',
    'Use matching border style from back card while keeping the center area open.',
    'If a logo is included, keep it tiny and on the border edge so it never reduces text room.',
    `Visual motifs should still reference: ${theme.motifs.join(', ')}.`
  ].join(' ');
}

function buildPromptBody(
  theme: Theme,
  side: 'back' | 'front',
  variant: 'default' | 'adult',
  state: PromptGeneratorState
): string {
  const sideInstructions = side === 'back' ? getBackCardInstructions(theme) : getFrontCardInstructions(theme);

  const segments = [
    `Theme: ${theme.name}`,
    `Palette: ${theme.palette.join(', ')}`,
    `Avoid these elements: ${theme.avoid.join(', ')}`,
    `Style intensity: ${getStyleIntensityDescriptor(state.styleIntensity)}`,
    `Tone: ${getToneDescriptor(state.tone)}`,
    `Resolution target: ${state.resolution}`,
    sideInstructions,
    getAdultModeInstructions(variant),
    'Card art style: cartoony, colourful, bold outlines, high contrast colours.',
    'Text readability requirement: leave room for white text with black outline and red text with white outline.',
    `Hard rules: ${HARD_RULES.join('; ')}.`
  ];

  if (side === 'front') {
    segments.push(
      'Front-card hard layout rule: center prompt-safe panel must dominate the composition and remain unobstructed for readable text.'
    );
  }

  if (state.strictMode) {
    segments.push('Strict Mode enabled: enforce every hard rule with zero exceptions.');
  }

  segments.push(`Negative prompt: ${GLOBAL_NEGATIVE_PROMPT}`);

  return segments.join('\n');
}

function resolveVariants(version: PromptGeneratorState['version']): Array<'default' | 'adult'> {
  if (version === 'default') return ['default'];
  if (version === 'adult') return ['adult'];
  return ['default', 'adult'];
}

function resolveSides(cardType: PromptGeneratorState['cardType']): Array<'back' | 'front'> {
  return cardType === 'back' ? ['back', 'front'] : ['front', 'back'];
}

export function generateArtworkPrompts(state: PromptGeneratorState, theme: Theme): GeneratedPrompt[] {
  const variants = resolveVariants(state.version);
  const sides = resolveSides(state.cardType);

  const prompts: GeneratedPrompt[] = [];

  for (const variant of variants) {
    for (const side of sides) {
      prompts.push({
        id: `${variant}-${side}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        variant,
        side,
        title: `${variant.toUpperCase()} ${side.toUpperCase()} prompt`,
        content: buildPromptBody(theme, side, variant, state)
      });
    }
  }

  return prompts;
}

export function getNegativePrompt(): string {
  return GLOBAL_NEGATIVE_PROMPT;
}
