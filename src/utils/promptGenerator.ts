import { PromptGeneratorState, GeneratedPrompt, Theme } from '../types';

const GLOBAL_NEGATIVE_PROMPT =
  'Do not create two cards. Do not create a pair of cards. Do not create a side-by-side layout. Do not include a background. Do not place the card in a scene. Do not crop the card. Do not change aspect ratio.';

const BASE_THEME_ID = 'default';
const BRAND_LOGO_ASSET_PATH = '/assets/images/logo-placeholder.svg';

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
  'Exact output size 800x1200 pixels',
  'Portrait ratio 2.5:3.5',
  'Rounded corners',
  'Fixed outer border + inner outline frame',
  'Cartoony, colourful style',
  'Bold outlines',
  'High contrast colours',
  'Must support white text with black outline',
  'Must support red text with white outline'
];

function isDefaultBaseTheme(theme: Theme): boolean {
  return theme.id.trim().toLowerCase() === BASE_THEME_ID || theme.name.trim().toLowerCase() === 'default';
}

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
  const defaultThemeBrandingRules = isDefaultBaseTheme(theme)
    ? [
        `Branding requirement: include the attached logo from "${BRAND_LOGO_ASSET_PATH}" clearly on the card.`,
        'Match the card colour language to the logo style (deep navy base with vivid cyan, magenta, and warm yellow accent energy).',
        'Keep logo geometry clean and legible; do not crop, stretch, or distort the logo.'
      ].join(' ')
    : '';

  return [
    'Create full card back design.',
    'Composition should be symmetrical or balanced.',
    'Strong theme visuals with clear motifs.',
    `Use theme motifs: ${theme.motifs.join(', ')}.`,
    `Use border motifs: ${theme.borderMotifs.join(', ')}.`,
    'Include the exact title text: "Pants on Fire!" and subtitle: "Find the Liar".',
    defaultThemeBrandingRules
  ].join(' ');
}

function getFrontCardInstructions(theme: Theme): string {
  const defaultThemeBrandingRules = isDefaultBaseTheme(theme)
    ? [
        `Branding requirement: include the attached logo from "${BRAND_LOGO_ASSET_PATH}" on the front as a subtle watermark/badge near an edge.`,
        'Keep the center reading area unobstructed; the logo should support the design without reducing text readability.',
        'Use logo-matching colour rhythm: dark base tones with controlled neon accents.'
      ].join(' ')
    : '';
  const frontLogoBan = isDefaultBaseTheme(theme)
    ? 'Do NOT place large mascots, dense icons, or oversized typography on the front face.'
    : 'Do NOT place characters, mascots, logos, titles, badges, explosions, or dense icons on the front face.';

  return [
    'Create front card design for prompt text overlay.',
    'Front must look like a mostly plain playing card face with maximum text room.',
    'Use a thin decorative border around the full card edge with target thickness of 0.3cm (about 3-4% of card width).',
    'Inside the border, keep one large open reading field for prompt text with no extra boxed panel.',
    'Fill the interior with a single colour or very subtle same-colour gradient from the theme palette.',
    'Add only a FADED monochrome repeating pattern made from key prop items associated with this exact theme.',
    'Background pattern props must be concrete theme-linked objects (not generic shapes), such as signature tools, accessories, symbols, or iconic items tied to the theme.',
    'Do not use unrelated motifs, generic clip-art icons, or references from other themes.',
    'Pattern texture must be low contrast, soft, and non-distracting so text stays highly readable.',
    frontLogoBan,
    'Keep decorative complexity minimal on front; reserve loud visuals for the back design.',
    `Approved prop pool for this theme: ${theme.motifs.join(', ')}.`,
    defaultThemeBrandingRules
  ].join(' ');
}

function buildPromptBody(
  theme: Theme,
  side: 'back' | 'front',
  variant: 'default' | 'adult',
  state: PromptGeneratorState
): string {
  const sideInstructions = side === 'back' ? getBackCardInstructions(theme) : getFrontCardInstructions(theme);
  const styleInstruction =
    side === 'back'
      ? 'Card art style: cartoony, colourful, bold outlines, high contrast colours.'
      : 'Front style requirement: clean and readable playing-card face, low visual noise, subtle texture only.';

  const segments = [
    `Theme: ${theme.name}`,
    `Palette: ${theme.palette.join(', ')}`,
    `Avoid these elements: ${theme.avoid.join(', ')}`,
    `Style intensity: ${getStyleIntensityDescriptor(state.styleIntensity)}`,
    `Tone: ${getToneDescriptor(state.tone)}`,
    `Resolution target: ${state.resolution}`,
    sideInstructions,
    getAdultModeInstructions(variant),
    styleInstruction,
    'Text readability requirement: leave room for white text with black outline and red text with white outline.',
    `Hard rules: ${HARD_RULES.join('; ')}.`
  ];

  if (side === 'front') {
    const defaultThemeException = isDefaultBaseTheme(theme);
    segments.push('Front-card hard layout rule: center prompt-safe panel must dominate the composition and remain unobstructed for readable text.');
    if (defaultThemeException) {
      segments.push(
        `Default base-card branding exception: include the attached logo from "${BRAND_LOGO_ASSET_PATH}" as a subtle edge watermark while preserving readability.`
      );
    } else {
      segments.push('Front-card text ban: do not render words, letters, numbers, logos, or typography on the front artwork itself.');
    }
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
