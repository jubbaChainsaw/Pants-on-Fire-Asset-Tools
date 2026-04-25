import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CardTextTone,
  GeneratedArtwork,
  GeneratedPrompt,
  ImageGeneratorConfig,
  PromptGeneratorState,
  PromptTone,
  RoundType,
  StyleIntensity,
  Theme
} from './types';
import { DEFAULT_THEMES } from './data/defaultThemes';
import { DEFAULT_ROUND_TYPES, ROUND_TYPE_ID_SET } from './data/defaultRoundTypes';
import { generateArtworkPrompts, getNegativePrompt } from './utils/promptGenerator';
import { loadFromStorage, saveToStorage, trySaveToStorage } from './utils/storage';
import {
  copyToClipboard,
  downloadJsonFile,
  downloadTextFile,
  exportDlcTemplateZip,
  RulePromptCardExport,
  rulePromptCardsToText
} from './utils/exporters';
import { generateArtworkImage } from './utils/imageGenerator';
import { Progress } from './components/ui/progress';

const STANDARD_GAME_ASSET_SIZE = '800x1200' as const;
const DEFAULT_THEME_COLOUR = '#7c3aed';

type ToolSection =
  | 'theme-creator'
  | 'category-logo-card-creator'
  | 'theme-card-generator'
  | 'game-type-logo-creator'
  | 'prompt-generator'
  | 'settings';

type ArtworkAssetTarget =
  | 'card-design'
  | 'category-card'
  | 'game-type-logo'
  | 'theme-presenter'
  | 'theme-icon-sheet'
  | 'theme-ui-banner';

type ArtworkToolContext = 'theme-card' | 'category-logo' | 'game-type-logo';

interface ArtworkPrompt extends GeneratedPrompt {
  renderContext: {
    tool: ArtworkToolContext;
    target: ArtworkAssetTarget;
    roundTypeId: string;
    themeId: string;
    categorySlug?: string;
    renderState: PromptGeneratorState;
  };
}

interface CategoryLogoCreatorState {
  themeId: string;
  categoryName: string;
  styleIntensity: StyleIntensity;
  tone: PromptTone;
}

interface GameTypeLogoCreatorState {
  themeId: string;
  roundTypeId: string;
  categoryName: string;
  styleIntensity: StyleIntensity;
  tone: PromptTone;
}

interface RulePromptGeneratorState {
  themeId: string;
  category: string;
  countPerGameType: number;
  includeAdult: boolean;
  tone: CardTextTone;
}

const STORAGE_KEYS = {
  activeTool: 'pof_active_tool_v2',
  themes: 'pof_themes_v1',
  roundTypes: 'pof_round_types_v1',
  themeCardState: 'pof_theme_card_state_v2',
  themeCardRoundTypeId: 'pof_theme_card_round_type_id_v2',
  categoryLogoState: 'pof_category_logo_state_v2',
  gameTypeLogoState: 'pof_game_type_logo_state_v2',
  imageGeneratorConfig: 'pof_image_generator_config_v1',
  generatedArtwork: 'pof_generated_artwork_v1',
  artworkGridTemplate: 'pof_artwork_grid_template_v1',
  rulePromptState: 'pof_rule_prompt_state_v2',
  rulePromptCards: 'pof_rule_prompt_cards_v2'
};

const DEFAULT_THEME_CARD_STATE: PromptGeneratorState = {
  themeId: DEFAULT_THEMES[0].id,
  cardType: 'back',
  version: 'both',
  styleIntensity: 'colourful',
  tone: 'party',
  resolution: STANDARD_GAME_ASSET_SIZE,
  strictMode: true
};

const DEFAULT_CATEGORY_LOGO_STATE: CategoryLogoCreatorState = {
  themeId: DEFAULT_THEMES[0].id,
  categoryName: 'General',
  styleIntensity: 'colourful',
  tone: 'party'
};

const DEFAULT_GAME_TYPE_LOGO_STATE: GameTypeLogoCreatorState = {
  themeId: DEFAULT_THEMES[0].id,
  roundTypeId: DEFAULT_ROUND_TYPES[0].id,
  categoryName: 'General',
  styleIntensity: 'colourful',
  tone: 'party'
};

const DEFAULT_RULE_PROMPT_STATE: RulePromptGeneratorState = {
  themeId: DEFAULT_THEMES[0].id,
  category: 'General',
  countPerGameType: 4,
  includeAdult: true,
  tone: 'party game'
};

const DEFAULT_IMAGE_GENERATOR_CONFIG: ImageGeneratorConfig = {
  provider: 'openai-compatible',
  endpoint: 'https://api.openai.com/v1/images/generations',
  apiKey: '',
  model: 'gpt-image-1',
  quality: 'high',
  timeoutMs: 45000,
  maxRetries: 2,
  batchDelayMs: 600
};

const DEFAULT_LIAR_VARIANTS = [
  'Blend in with one confident clue and avoid over-explaining.',
  'Mirror another player early, then add one subtle twist.',
  'Keep your story short and dodge specific nouns.',
  'Ask a clarifying question first to buy thinking time.'
];

const ADULT_LIAR_VARIANTS = [
  'Sell it with swagger, keep it cheeky, and stay non-explicit.',
  'Act over-confident, then pivot with a sarcastic line.',
  'Drop one bold clue and play innocent when challenged.',
  'Keep it spicy-but-safe: suggestive tone, zero explicit detail.'
];

function normalizeRoundTypes(rawRoundTypes: RoundType[]): RoundType[] {
  const byId = new Map(rawRoundTypes.map((roundType) => [roundType.id, roundType]));

  return DEFAULT_ROUND_TYPES.map((fallback) => {
    const source = byId.get(fallback.id);
    if (!source) return fallback;

    return {
      ...fallback,
      ...source,
      id: fallback.id,
      cardType: fallback.cardType,
      onlineOnly: fallback.onlineOnly,
      examples:
        Array.isArray(source.examples) && source.examples.length > 0
          ? source.examples.map((value) => value.trim()).filter(Boolean)
          : fallback.examples,
      rules:
        Array.isArray(source.rules) && source.rules.length > 0
          ? source.rules.map((value) => value.trim()).filter(Boolean)
          : fallback.rules
    };
  });
}

function normalizeToolSection(raw: unknown): ToolSection {
  const allowed: ToolSection[] = [
    'theme-creator',
    'category-logo-card-creator',
    'theme-card-generator',
    'game-type-logo-creator',
    'prompt-generator',
    'settings'
  ];
  if (typeof raw === 'string' && allowed.includes(raw as ToolSection)) {
    return raw as ToolSection;
  }
  return 'theme-creator';
}

function normalizePromptState(raw: Partial<PromptGeneratorState> | undefined): PromptGeneratorState {
  return {
    themeId: raw?.themeId || DEFAULT_THEME_CARD_STATE.themeId,
    cardType: raw?.cardType === 'front' || raw?.cardType === 'back' ? raw.cardType : DEFAULT_THEME_CARD_STATE.cardType,
    version:
      raw?.version === 'default' || raw?.version === 'adult' || raw?.version === 'both'
        ? raw.version
        : DEFAULT_THEME_CARD_STATE.version,
    styleIntensity:
      raw?.styleIntensity === 'clean' || raw?.styleIntensity === 'colourful' || raw?.styleIntensity === 'crazy'
        ? raw.styleIntensity
        : DEFAULT_THEME_CARD_STATE.styleIntensity,
    tone:
      raw?.tone === 'fun' ||
      raw?.tone === 'dark' ||
      raw?.tone === 'silly' ||
      raw?.tone === 'premium' ||
      raw?.tone === 'party' ||
      raw?.tone === 'chaotic'
        ? raw.tone
        : DEFAULT_THEME_CARD_STATE.tone,
    resolution: STANDARD_GAME_ASSET_SIZE,
    strictMode: typeof raw?.strictMode === 'boolean' ? raw.strictMode : DEFAULT_THEME_CARD_STATE.strictMode
  };
}

function normalizeImageGeneratorConfig(raw: Partial<ImageGeneratorConfig> | undefined): ImageGeneratorConfig {
  return {
    provider: 'openai-compatible',
    endpoint: raw?.endpoint?.trim() || DEFAULT_IMAGE_GENERATOR_CONFIG.endpoint,
    apiKey: raw?.apiKey || '',
    model: raw?.model?.trim() || DEFAULT_IMAGE_GENERATOR_CONFIG.model,
    quality:
      raw?.quality === 'low' || raw?.quality === 'medium' || raw?.quality === 'high'
        ? raw.quality
        : DEFAULT_IMAGE_GENERATOR_CONFIG.quality,
    timeoutMs:
      typeof raw?.timeoutMs === 'number' && Number.isFinite(raw.timeoutMs)
        ? Math.max(5000, Math.min(120000, Math.round(raw.timeoutMs)))
        : DEFAULT_IMAGE_GENERATOR_CONFIG.timeoutMs,
    maxRetries:
      typeof raw?.maxRetries === 'number' && Number.isFinite(raw.maxRetries)
        ? Math.max(0, Math.min(6, Math.round(raw.maxRetries)))
        : DEFAULT_IMAGE_GENERATOR_CONFIG.maxRetries,
    batchDelayMs:
      typeof raw?.batchDelayMs === 'number' && Number.isFinite(raw.batchDelayMs)
        ? Math.max(0, Math.min(5000, Math.round(raw.batchDelayMs)))
        : DEFAULT_IMAGE_GENERATOR_CONFIG.batchDelayMs
  };
}

function normalizeCategoryLogoState(raw: Partial<CategoryLogoCreatorState> | undefined): CategoryLogoCreatorState {
  return {
    themeId: raw?.themeId || DEFAULT_CATEGORY_LOGO_STATE.themeId,
    categoryName: raw?.categoryName?.trim() || DEFAULT_CATEGORY_LOGO_STATE.categoryName,
    styleIntensity:
      raw?.styleIntensity === 'clean' || raw?.styleIntensity === 'colourful' || raw?.styleIntensity === 'crazy'
        ? raw.styleIntensity
        : DEFAULT_CATEGORY_LOGO_STATE.styleIntensity,
    tone:
      raw?.tone === 'fun' ||
      raw?.tone === 'dark' ||
      raw?.tone === 'silly' ||
      raw?.tone === 'premium' ||
      raw?.tone === 'party' ||
      raw?.tone === 'chaotic'
        ? raw.tone
        : DEFAULT_CATEGORY_LOGO_STATE.tone
  };
}

function normalizeGameTypeLogoState(raw: Partial<GameTypeLogoCreatorState> | undefined): GameTypeLogoCreatorState {
  return {
    themeId: raw?.themeId || DEFAULT_GAME_TYPE_LOGO_STATE.themeId,
    roundTypeId:
      typeof raw?.roundTypeId === 'string' && ROUND_TYPE_ID_SET.has(raw.roundTypeId)
        ? raw.roundTypeId
        : DEFAULT_GAME_TYPE_LOGO_STATE.roundTypeId,
    categoryName: raw?.categoryName?.trim() || DEFAULT_GAME_TYPE_LOGO_STATE.categoryName,
    styleIntensity:
      raw?.styleIntensity === 'clean' || raw?.styleIntensity === 'colourful' || raw?.styleIntensity === 'crazy'
        ? raw.styleIntensity
        : DEFAULT_GAME_TYPE_LOGO_STATE.styleIntensity,
    tone:
      raw?.tone === 'fun' ||
      raw?.tone === 'dark' ||
      raw?.tone === 'silly' ||
      raw?.tone === 'premium' ||
      raw?.tone === 'party' ||
      raw?.tone === 'chaotic'
        ? raw.tone
        : DEFAULT_GAME_TYPE_LOGO_STATE.tone
  };
}

function normalizeRulePromptState(raw: Partial<RulePromptGeneratorState> | undefined): RulePromptGeneratorState {
  const tone: CardTextTone[] = ['silly', 'sarcastic', 'dark humour', 'british humour', 'party game', 'chaotic'];
  return {
    themeId: raw?.themeId || DEFAULT_RULE_PROMPT_STATE.themeId,
    category: raw?.category?.trim() || DEFAULT_RULE_PROMPT_STATE.category,
    countPerGameType:
      typeof raw?.countPerGameType === 'number' && Number.isFinite(raw.countPerGameType)
        ? Math.max(1, Math.min(24, Math.round(raw.countPerGameType)))
        : DEFAULT_RULE_PROMPT_STATE.countPerGameType,
    includeAdult: typeof raw?.includeAdult === 'boolean' ? raw.includeAdult : DEFAULT_RULE_PROMPT_STATE.includeAdult,
    tone: raw?.tone && tone.includes(raw.tone) ? raw.tone : DEFAULT_RULE_PROMPT_STATE.tone
  };
}

function normalizeGeneratedArtwork(raw: unknown): GeneratedArtwork[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const candidate = entry as Partial<GeneratedArtwork> & {
      title?: string;
      imageDataUrl?: string;
      outputPath?: string;
      filePath?: string;
      filename?: string;
      assetPath?: string;
    };
    const promptId = typeof candidate.promptId === 'string' ? candidate.promptId : '';
    const dataUrl =
      typeof candidate.dataUrl === 'string'
        ? candidate.dataUrl
        : typeof candidate.imageDataUrl === 'string'
          ? candidate.imageDataUrl
          : '';
    if (!promptId || !dataUrl) return [];

    return [
      {
        id: typeof candidate.id === 'string' ? candidate.id : `${promptId}-${Date.now()}`,
        promptId,
        promptTitle:
          typeof candidate.promptTitle === 'string'
            ? candidate.promptTitle
            : typeof candidate.title === 'string'
              ? candidate.title
              : 'Generated artwork',
        side: candidate.side === 'front' || candidate.side === 'back' ? candidate.side : 'front',
        variant: candidate.variant === 'adult' ? 'adult' : 'default',
        dataUrl,
        assetPath:
          typeof candidate.assetPath === 'string'
            ? candidate.assetPath
            : typeof candidate.filePath === 'string'
              ? candidate.filePath
              : typeof candidate.outputPath === 'string'
                ? candidate.outputPath
                : typeof candidate.filename === 'string'
                  ? candidate.filename
                  : '',
        assetKind:
          candidate.assetKind === 'card' ||
          candidate.assetKind === 'category-card' ||
          candidate.assetKind === 'game-type-logo' ||
          candidate.assetKind === 'theme-default'
            ? candidate.assetKind
            : undefined,
        createdAt:
          typeof candidate.createdAt === 'string'
            ? candidate.createdAt
            : new Date(typeof candidate.createdAt === 'number' ? candidate.createdAt : Date.now()).toISOString()
      }
    ];
  });
}

function normalizeRulePromptCards(raw: unknown): RulePromptCardExport[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const item = entry as Partial<RulePromptCardExport>;
    if (!item.id || !item.roundTypeId || !item.roundTypeName || !item.category) return [];
    if (!item.hint || !item.mainPrompt || !item.liarPrompt || !item.liarVariant) return [];
    return [
      {
        id: String(item.id),
        roundTypeId: String(item.roundTypeId),
        roundTypeName: String(item.roundTypeName),
        category: String(item.category),
        version: item.version === 'adult' ? 'adult' : 'default',
        hint: String(item.hint),
        mainPrompt: String(item.mainPrompt),
        liarPrompt: String(item.liarPrompt),
        liarVariant: String(item.liarVariant),
        bannedWords: Array.isArray(item.bannedWords) ? item.bannedWords.map((word) => String(word)).filter(Boolean) : []
      }
    ];
  });
}

function persistGeneratedArtworkForStorage(artwork: GeneratedArtwork[]): {
  ok: boolean;
  persistedCount: number;
  reason?: 'quota' | 'unavailable' | 'unknown';
} {
  let candidate = artwork;
  while (candidate.length > 0) {
    const result = trySaveToStorage(STORAGE_KEYS.generatedArtwork, candidate);
    if (result.ok) {
      return { ok: true, persistedCount: candidate.length };
    }
    if (result.reason !== 'quota') {
      return { ok: false, persistedCount: 0, reason: result.reason };
    }
    candidate = candidate.slice(0, -1);
  }
  const emptyWrite = trySaveToStorage(STORAGE_KEYS.generatedArtwork, []);
  if (emptyWrite.ok) {
    return { ok: true, persistedCount: 0 };
  }
  return { ok: false, persistedCount: 0, reason: emptyWrite.reason };
}

function slugifyThemeId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return null;
  const r = Number.parseInt(cleaned.slice(0, 2), 16);
  const g = Number.parseInt(cleaned.slice(2, 4), 16);
  const b = Number.parseInt(cleaned.slice(4, 6), 16);
  return { r, g, b };
}

function rgbToHex(value: { r: number; g: number; b: number }): string {
  const clamp = (channel: number) => Math.max(0, Math.min(255, Math.round(channel)));
  return `#${[clamp(value.r), clamp(value.g), clamp(value.b)]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')}`;
}

function shiftHexColour(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const apply = (channel: number) =>
    amount >= 0 ? channel + (255 - channel) * amount : channel * (1 + amount);
  return rgbToHex({
    r: apply(rgb.r),
    g: apply(rgb.g),
    b: apply(rgb.b)
  });
}

function normalizeThemes(rawThemes: Theme[]): Theme[] {
  const normalized = rawThemes
    .map((theme) => {
      const name = theme.name?.trim();
      if (!name || name.toLowerCase() === 'new theme') return null;
      const idBase = slugifyThemeId(theme.id?.trim() || name);
      if (!idBase) return null;
      const palette = Array.isArray(theme.palette)
        ? theme.palette.map((value) => value.trim()).filter(Boolean)
        : [];
      const primary = palette[0] || DEFAULT_THEME_COLOUR;
      return {
        id: idBase,
        name,
        palette: palette.length > 0 ? palette : [primary, shiftHexColour(primary, 0.25), shiftHexColour(primary, -0.35)],
        motifs:
          Array.isArray(theme.motifs) && theme.motifs.length > 0
            ? theme.motifs.map((value) => value.trim()).filter(Boolean)
            : ['icon pattern', 'shape accents'],
        borderMotifs:
          Array.isArray(theme.borderMotifs) && theme.borderMotifs.length > 0
            ? theme.borderMotifs.map((value) => value.trim()).filter(Boolean)
            : ['line accents'],
        avoid:
          Array.isArray(theme.avoid) && theme.avoid.length > 0
            ? theme.avoid.map((value) => value.trim()).filter(Boolean)
            : ['low readability']
      } as Theme;
    })
    .filter((theme): theme is Theme => Boolean(theme));

  const deduped: Theme[] = [];
  const usedIds = new Set<string>();
  for (const theme of normalized) {
    let nextId = theme.id;
    let suffix = 2;
    while (usedIds.has(nextId)) {
      nextId = `${theme.id}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(nextId);
    deduped.push({ ...theme, id: nextId });
  }
  return deduped.length > 0 ? deduped : DEFAULT_THEMES;
}

function mapRoundTypeToAssetKey(roundTypeId: string): string {
  return roundTypeId === 'sound' ? 'noise' : roundTypeId === 'video' ? 'meme' : roundTypeId;
}

function mapAssetTargetToArtworkKind(target: ArtworkAssetTarget): GeneratedArtwork['assetKind'] {
  if (target === 'card-design') return 'card';
  if (target === 'category-card') return 'category-card';
  if (target === 'game-type-logo') return 'game-type-logo';
  return 'theme-default';
}

function resolveArtworkAssetFilePath(params: {
  themeId: string;
  prompt: Pick<GeneratedPrompt, 'side' | 'variant'>;
  roundTypeId: string;
  target: ArtworkAssetTarget;
  categorySlug?: string;
}): string {
  const normalizedThemeId = params.themeId?.trim() || 'default';
  const mappedRoundTypeId = mapRoundTypeToAssetKey(params.roundTypeId || 'prompt');
  const categorySlug = params.categorySlug?.trim() || '';

  if (params.target === 'category-card') {
    const categorySuffix = categorySlug ? `-${categorySlug}` : '';
    if (params.prompt.side === 'back') {
      const suffix = params.prompt.variant === 'adult' ? '-back-18' : '-back';
      return `/assets/themes/${normalizedThemeId}/cards/category${categorySuffix}${suffix}.png`;
    }
    const frontSuffix = params.prompt.variant === 'adult' ? '-front-18' : '-front';
    return `/assets/themes/${normalizedThemeId}/cards/category${categorySuffix}${frontSuffix}.png`;
  }

  if (params.target === 'game-type-logo') {
    return `/assets/images/round-types/${mappedRoundTypeId}-logo.png`;
  }

  if (params.target === 'theme-presenter') {
    return `/assets/themes/${normalizedThemeId}/characters/presenter.png`;
  }

  if (params.target === 'theme-icon-sheet') {
    return `/assets/themes/${normalizedThemeId}/icons/icons-sheet.png`;
  }

  if (params.target === 'theme-ui-banner') {
    return `/assets/themes/${normalizedThemeId}/ui/banner.png`;
  }

  if (params.prompt.side === 'back') {
    const backName = params.prompt.variant === 'adult' ? 'prompt-back-18.png' : 'prompt-back.png';
    return `/assets/themes/${normalizedThemeId}/cards/${backName}`;
  }

  if (params.prompt.variant === 'adult') {
    return `/assets/themes/${normalizedThemeId}/cards/prompt-front-18.png`;
  }

  const allowedRoundTypes = new Set(['prompt', 'opinion', 'picture', 'grill', 'meme', 'noise', 'offtopic', 'chain']);
  const frontName = allowedRoundTypes.has(mappedRoundTypeId) ? `prompt-front-${mappedRoundTypeId}.png` : 'prompt-front.png';
  return `/assets/themes/${normalizedThemeId}/cards/${frontName}`;
}

function buildBaseRenderState(params: {
  themeId: string;
  styleIntensity: StyleIntensity;
  tone: PromptTone;
  cardType: 'front' | 'back';
  version: PromptGeneratorState['version'];
  strictMode: boolean;
}): PromptGeneratorState {
  return {
    themeId: params.themeId,
    cardType: params.cardType,
    version: params.version,
    styleIntensity: params.styleIntensity,
    tone: params.tone,
    resolution: STANDARD_GAME_ASSET_SIZE,
    strictMode: params.strictMode
  };
}

function buildCategoryLogoPromptBody(theme: Theme, categoryName: string, variant: 'default' | 'adult', tone: PromptTone): string {
  const adultMode =
    variant === 'adult'
      ? 'Adult 18+ version: edgy and cheeky language is allowed, but no explicit sexual content, no nudity, no minors.'
      : 'Default version: family-safe playful tone.';
  return [
    `Theme: ${theme.name}`,
    `Create a SINGLE category logo back card for "${categoryName}".`,
    'Card purpose: category-logo back card with readable category title and themed iconography.',
    `Include the exact category title text: "${categoryName}".`,
    'Use bold cartoony shapes, clear hierarchy, and balanced composition.',
    `Use motifs from theme palette: ${theme.motifs.join(', ')}.`,
    `Tone: ${tone}.`,
    adultMode,
    `Resolution target: ${STANDARD_GAME_ASSET_SIZE}.`,
    'Hard rules: one card only; no side-by-side cards; no mockup scene; no background table or hands.'
  ].join('\n');
}

function buildGameTypeLogoCardBody(theme: Theme, roundType: RoundType, categoryName: string, tone: PromptTone): string {
  return [
    `Theme: ${theme.name}`,
    `Create a SINGLE back-card logo design for game type "${roundType.name}".`,
    `Secondary category label text: "${categoryName}".`,
    `Include exact game type text: "${roundType.name}".`,
    'Add supporting thematic iconography and strong logo-style framing.',
    `Reference motifs: ${theme.motifs.join(', ')}.`,
    `Tone: ${tone}.`,
    `Resolution target: ${STANDARD_GAME_ASSET_SIZE}.`,
    'Hard rules: one card only; isolated design; no scene backgrounds; no side-by-side layout.'
  ].join('\n');
}

function buildGameTypeBannerBody(theme: Theme, roundType: RoundType, categoryName: string, tone: PromptTone): string {
  return [
    `Theme: ${theme.name}`,
    `Create a banner-style promotional image for game type "${roundType.name}" and category "${categoryName}".`,
    `Include readable title text: "${roundType.name}".`,
    'Compose as a bold banner panel within the full canvas, using punchy icon + text lockup.',
    `Motif references: ${theme.motifs.join(', ')}.`,
    `Tone: ${tone}.`,
    `Resolution target: ${STANDARD_GAME_ASSET_SIZE}.`,
    'Hard rules: single composition only; no collage of multiple cards; no cinematic scene backgrounds.'
  ].join('\n');
}

function tokenizeWords(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3);
}

function makeBannedWords(category: string, roundType: RoundType, theme: Theme, index: number): string[] {
  const seed = [
    ...tokenizeWords(category),
    ...tokenizeWords(roundType.name),
    ...tokenizeWords(roundType.cardType),
    ...theme.motifs.flatMap((item) => tokenizeWords(item))
  ];
  const rotating = ['liar', 'truth', 'prompt', 'clue', 'bluff', 'topic', 'secret', 'guess', 'imposter', 'suspicion'];
  const unique: string[] = [];
  [...seed, ...rotating.slice(index % rotating.length), ...rotating].forEach((word) => {
    if (!word || unique.includes(word)) return;
    unique.push(word);
  });
  return unique.slice(0, 5);
}

function buildRulePromptCards(state: RulePromptGeneratorState, roundTypes: RoundType[], themes: Theme[]): RulePromptCardExport[] {
  const selectedTheme = themes.find((theme) => theme.id === state.themeId) ?? themes[0] ?? DEFAULT_THEMES[0];
  const category = state.category.trim() || 'General';
  const count = Math.max(1, Math.min(24, Math.round(state.countPerGameType)));
  const cards: RulePromptCardExport[] = [];

  roundTypes.forEach((roundType, roundTypeIndex) => {
    for (let index = 0; index < count; index += 1) {
      const cardIdBase = `${slugifyThemeId(category)}-${roundType.id}-${index + 1}`;
      const clueTag = `${roundType.name} #${index + 1}`;
      const coreScenario = `${category} ${roundType.cardType} situation ${index + 1}`;
      const mainPrompt = `Truthful players receive: "${coreScenario}. Keep clues aligned with ${roundType.name} rules."`;
      const liarPrompt = `Liar receives: "${category} twist ${roundType.cardType} scenario ${index + 1}. Stay believable while off-target."`;
      const liarVariant = DEFAULT_LIAR_VARIANTS[(roundTypeIndex + index) % DEFAULT_LIAR_VARIANTS.length];
      const bannedWords = makeBannedWords(category, roundType, selectedTheme, index);

      cards.push({
        id: `${cardIdBase}-default`,
        roundTypeId: roundType.id,
        roundTypeName: roundType.name,
        category,
        version: 'default',
        hint: `${clueTag} (${state.tone})`,
        mainPrompt,
        liarPrompt,
        liarVariant,
        bannedWords
      });

      if (state.includeAdult) {
        cards.push({
          id: `${cardIdBase}-adult`,
          roundTypeId: roundType.id,
          roundTypeName: roundType.name,
          category,
          version: 'adult',
          hint: `${clueTag} 18+ (${state.tone})`,
          mainPrompt: `18+ truthful prompt: "${coreScenario}. Use cheeky, non-explicit party banter."`,
          liarPrompt: `18+ liar prompt: "${category} risky twist ${roundType.cardType} scenario ${index + 1}. Bluff boldly but keep it non-explicit."`,
          liarVariant: ADULT_LIAR_VARIANTS[(roundTypeIndex + index) % ADULT_LIAR_VARIANTS.length],
          bannedWords
        });
      }
    }
  });

  return cards;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function downloadDataUrlFile(filename: string, dataUrl: string): void {
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = filename;
  anchor.click();
}

function App(): JSX.Element {
  const [activeTool, setActiveTool] = useState<ToolSection>(
    normalizeToolSection(loadFromStorage(STORAGE_KEYS.activeTool, 'theme-creator'))
  );
  const [themes, setThemes] = useState<Theme[]>(normalizeThemes(loadFromStorage(STORAGE_KEYS.themes, DEFAULT_THEMES)));
  const [roundTypes, setRoundTypes] = useState<RoundType[]>(
    normalizeRoundTypes(loadFromStorage(STORAGE_KEYS.roundTypes, DEFAULT_ROUND_TYPES))
  );
  const [themeCardState, setThemeCardState] = useState<PromptGeneratorState>(
    normalizePromptState(loadFromStorage(STORAGE_KEYS.themeCardState, DEFAULT_THEME_CARD_STATE))
  );
  const [themeCardRoundTypeId, setThemeCardRoundTypeId] = useState<string>(
    loadFromStorage(STORAGE_KEYS.themeCardRoundTypeId, DEFAULT_ROUND_TYPES[0].id)
  );
  const [categoryLogoState, setCategoryLogoState] = useState<CategoryLogoCreatorState>(
    normalizeCategoryLogoState(loadFromStorage(STORAGE_KEYS.categoryLogoState, DEFAULT_CATEGORY_LOGO_STATE))
  );
  const [gameTypeLogoState, setGameTypeLogoState] = useState<GameTypeLogoCreatorState>(
    normalizeGameTypeLogoState(loadFromStorage(STORAGE_KEYS.gameTypeLogoState, DEFAULT_GAME_TYPE_LOGO_STATE))
  );
  const [rulePromptState, setRulePromptState] = useState<RulePromptGeneratorState>(
    normalizeRulePromptState(loadFromStorage(STORAGE_KEYS.rulePromptState, DEFAULT_RULE_PROMPT_STATE))
  );
  const [rulePromptCards, setRulePromptCards] = useState<RulePromptCardExport[]>(
    normalizeRulePromptCards(loadFromStorage(STORAGE_KEYS.rulePromptCards, []))
  );
  const [imageGeneratorConfig, setImageGeneratorConfig] = useState<ImageGeneratorConfig>(
    normalizeImageGeneratorConfig(loadFromStorage(STORAGE_KEYS.imageGeneratorConfig, DEFAULT_IMAGE_GENERATOR_CONFIG))
  );
  const [generatedArtwork, setGeneratedArtwork] = useState<GeneratedArtwork[]>(
    normalizeGeneratedArtwork(loadFromStorage(STORAGE_KEYS.generatedArtwork, []))
  );
  const [showArtworkGridTemplate, setShowArtworkGridTemplate] = useState<boolean>(
    loadFromStorage(STORAGE_KEYS.artworkGridTemplate, true)
  );

  const [themeNameDraft, setThemeNameDraft] = useState('');
  const [themeAccentColor, setThemeAccentColor] = useState(DEFAULT_THEME_COLOUR);
  const [themeCreateError, setThemeCreateError] = useState('');

  const [themeCardPrompts, setThemeCardPrompts] = useState<ArtworkPrompt[]>([]);
  const [categoryLogoPrompts, setCategoryLogoPrompts] = useState<ArtworkPrompt[]>([]);
  const [gameTypeLogoPrompts, setGameTypeLogoPrompts] = useState<ArtworkPrompt[]>([]);

  const [generatingPromptIds, setGeneratingPromptIds] = useState<string[]>([]);
  const [isGeneratingAllArtwork, setIsGeneratingAllArtwork] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ completed: 0, total: 0 });
  const [batchLabel, setBatchLabel] = useState('');
  const [batchCancelRequested, setBatchCancelRequested] = useState(false);
  const batchCancelRequestedRef = useRef(false);

  const [artworkStorageWarning, setArtworkStorageWarning] = useState('');
  const [imageGenerationError, setImageGenerationError] = useState('');
  const [copiedMessage, setCopiedMessage] = useState('');

  const artworkByPromptId = useMemo(
    () => new Map(generatedArtwork.map((artwork) => [artwork.promptId, artwork])),
    [generatedArtwork]
  );

  const rulePromptGroups = useMemo(() => {
    const grouped = new Map<string, RulePromptCardExport[]>();
    rulePromptCards.forEach((card) => {
      const bucket = grouped.get(card.roundTypeId) || [];
      bucket.push(card);
      grouped.set(card.roundTypeId, bucket);
    });
    return grouped;
  }, [rulePromptCards]);

  useEffect(() => saveToStorage(STORAGE_KEYS.activeTool, activeTool), [activeTool]);
  useEffect(() => saveToStorage(STORAGE_KEYS.themes, normalizeThemes(themes)), [themes]);
  useEffect(() => saveToStorage(STORAGE_KEYS.roundTypes, normalizeRoundTypes(roundTypes)), [roundTypes]);
  useEffect(() => saveToStorage(STORAGE_KEYS.themeCardState, normalizePromptState(themeCardState)), [themeCardState]);
  useEffect(() => saveToStorage(STORAGE_KEYS.themeCardRoundTypeId, themeCardRoundTypeId), [themeCardRoundTypeId]);
  useEffect(() => saveToStorage(STORAGE_KEYS.categoryLogoState, normalizeCategoryLogoState(categoryLogoState)), [categoryLogoState]);
  useEffect(() => saveToStorage(STORAGE_KEYS.gameTypeLogoState, normalizeGameTypeLogoState(gameTypeLogoState)), [gameTypeLogoState]);
  useEffect(() => saveToStorage(STORAGE_KEYS.rulePromptState, normalizeRulePromptState(rulePromptState)), [rulePromptState]);
  useEffect(() => saveToStorage(STORAGE_KEYS.rulePromptCards, rulePromptCards), [rulePromptCards]);
  useEffect(() => saveToStorage(STORAGE_KEYS.imageGeneratorConfig, imageGeneratorConfig), [imageGeneratorConfig]);
  useEffect(() => saveToStorage(STORAGE_KEYS.artworkGridTemplate, showArtworkGridTemplate), [showArtworkGridTemplate]);

  useEffect(() => {
    const result = persistGeneratedArtworkForStorage(generatedArtwork);
    if (!result.ok) {
      setArtworkStorageWarning(
        'Browser storage is unavailable right now. Rendered images will remain only until this tab is closed.'
      );
      return;
    }
    if (result.persistedCount < generatedArtwork.length) {
      setArtworkStorageWarning(
        `Only the ${result.persistedCount} most recent rendered image${result.persistedCount === 1 ? '' : 's'} can be kept in browser storage.`
      );
      return;
    }
    setArtworkStorageWarning('');
  }, [generatedArtwork]);

  useEffect(() => {
    if (!copiedMessage) return;
    const timeout = window.setTimeout(() => setCopiedMessage(''), 2400);
    return () => window.clearTimeout(timeout);
  }, [copiedMessage]);

  useEffect(() => {
    const firstThemeId = themes[0]?.id || DEFAULT_THEMES[0].id;
    if (!themes.some((theme) => theme.id === themeCardState.themeId)) {
      setThemeCardState((prev) => ({ ...prev, themeId: firstThemeId }));
    }
    if (!themes.some((theme) => theme.id === categoryLogoState.themeId)) {
      setCategoryLogoState((prev) => ({ ...prev, themeId: firstThemeId }));
    }
    if (!themes.some((theme) => theme.id === gameTypeLogoState.themeId)) {
      setGameTypeLogoState((prev) => ({ ...prev, themeId: firstThemeId }));
    }
    if (!themes.some((theme) => theme.id === rulePromptState.themeId)) {
      setRulePromptState((prev) => ({ ...prev, themeId: firstThemeId }));
    }
  }, [themes, themeCardState.themeId, categoryLogoState.themeId, gameTypeLogoState.themeId, rulePromptState.themeId]);

  useEffect(() => {
    const firstRoundTypeId = roundTypes[0]?.id || DEFAULT_ROUND_TYPES[0].id;
    if (!roundTypes.some((roundType) => roundType.id === themeCardRoundTypeId)) {
      setThemeCardRoundTypeId(firstRoundTypeId);
    }
    if (!roundTypes.some((roundType) => roundType.id === gameTypeLogoState.roundTypeId)) {
      setGameTypeLogoState((prev) => ({ ...prev, roundTypeId: firstRoundTypeId }));
    }
  }, [roundTypes, themeCardRoundTypeId, gameTypeLogoState.roundTypeId]);

  function getTheme(themeId: string): Theme {
    return themes.find((theme) => theme.id === themeId) ?? themes[0] ?? DEFAULT_THEMES[0];
  }

  function getRoundType(roundTypeId: string): RoundType {
    return roundTypes.find((roundType) => roundType.id === roundTypeId) ?? roundTypes[0] ?? DEFAULT_ROUND_TYPES[0];
  }

  function updateTheme(index: number, value: Partial<Theme>): void {
    setThemes((prev) => normalizeThemes(prev.map((theme, idx) => (idx === index ? { ...theme, ...value } : theme))));
  }

  function createTheme(): void {
    const name = themeNameDraft.trim();
    if (!name) {
      setThemeCreateError('Enter a theme name.');
      return;
    }
    const accent = hexToRgb(themeAccentColor)
      ? rgbToHex(hexToRgb(themeAccentColor) as { r: number; g: number; b: number })
      : DEFAULT_THEME_COLOUR;
    const baseId = slugifyThemeId(name);
    if (!baseId) {
      setThemeCreateError('Theme name must include letters or numbers.');
      return;
    }

    const existingIds = new Set(themes.map((theme) => theme.id));
    let nextId = baseId;
    let suffix = 2;
    while (existingIds.has(nextId)) {
      nextId = `${baseId}-${suffix}`;
      suffix += 1;
    }

    const createdTheme: Theme = {
      id: nextId,
      name,
      palette: [accent, shiftHexColour(accent, 0.25), shiftHexColour(accent, -0.35)],
      motifs: ['theme icons', 'pattern accents'],
      borderMotifs: ['line accents', 'corner marks'],
      avoid: ['low readability']
    };

    setThemes((prev) => normalizeThemes([...prev, createdTheme]));
    setThemeCardState((prev) => ({ ...prev, themeId: createdTheme.id }));
    setCategoryLogoState((prev) => ({ ...prev, themeId: createdTheme.id }));
    setGameTypeLogoState((prev) => ({ ...prev, themeId: createdTheme.id }));
    setRulePromptState((prev) => ({ ...prev, themeId: createdTheme.id }));
    setThemeNameDraft('');
    setThemeCreateError('');
    setCopiedMessage(`Created theme "${createdTheme.name}".`);
  }

  function deleteTheme(index: number): void {
    if (themes.length <= 1) return;
    setThemes((prev) => normalizeThemes(prev.filter((_, idx) => idx !== index)));
  }

  function getImageGenerationErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) return error.message;
    return 'Unknown image generation error.';
  }

  function removeArtworkForPromptSet(prompts: ArtworkPrompt[]): void {
    if (prompts.length === 0) return;
    const promptIds = new Set(prompts.map((prompt) => prompt.id));
    setGeneratedArtwork((prev) => prev.filter((artwork) => !promptIds.has(artwork.promptId)));
  }

  function createPromptId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function onGenerateThemeCardPrompts(): void {
    const selectedTheme = getTheme(themeCardState.themeId);
    const nextPrompts = generateArtworkPrompts(themeCardState, selectedTheme).map(
      (prompt): ArtworkPrompt => ({
        ...prompt,
        renderContext: {
          tool: 'theme-card',
          target: 'card-design',
          themeId: themeCardState.themeId,
          roundTypeId: themeCardRoundTypeId,
          renderState: normalizePromptState(themeCardState)
        }
      })
    );
    removeArtworkForPromptSet(themeCardPrompts);
    setThemeCardPrompts(nextPrompts);
    setImageGenerationError('');
  }

  function onGenerateCategoryLogoPrompts(): void {
    const selectedTheme = getTheme(categoryLogoState.themeId);
    const categoryName = categoryLogoState.categoryName.trim() || 'General';
    const categorySlug = slugifyThemeId(categoryName) || 'general';
    const variants: Array<'default' | 'adult'> = ['default', 'adult'];
    const baseRenderState = buildBaseRenderState({
      themeId: categoryLogoState.themeId,
      styleIntensity: categoryLogoState.styleIntensity,
      tone: categoryLogoState.tone,
      cardType: 'back',
      version: 'both',
      strictMode: true
    });

    const nextPrompts = variants.map(
      (variant): ArtworkPrompt => ({
        id: createPromptId(`category-${variant}`),
        themeId: selectedTheme.id,
        variant,
        side: 'back',
        title: `${variant === 'adult' ? '18+ ' : ''}${categoryName} category back`,
        content: buildCategoryLogoPromptBody(selectedTheme, categoryName, variant, categoryLogoState.tone),
        renderContext: {
          tool: 'category-logo',
          target: 'category-card',
          themeId: categoryLogoState.themeId,
          roundTypeId: 'prompt',
          categorySlug,
          renderState: baseRenderState
        }
      })
    );
    removeArtworkForPromptSet(categoryLogoPrompts);
    setCategoryLogoPrompts(nextPrompts);
    setImageGenerationError('');
  }

  function onGenerateGameTypeLogoPrompts(): void {
    const selectedTheme = getTheme(gameTypeLogoState.themeId);
    const selectedRoundType = getRoundType(gameTypeLogoState.roundTypeId);
    const categoryName = gameTypeLogoState.categoryName.trim() || 'General';
    const baseRenderState = buildBaseRenderState({
      themeId: gameTypeLogoState.themeId,
      styleIntensity: gameTypeLogoState.styleIntensity,
      tone: gameTypeLogoState.tone,
      cardType: 'back',
      version: 'default',
      strictMode: true
    });

    const logoPrompt: ArtworkPrompt = {
      id: createPromptId(`round-logo-${selectedRoundType.id}`),
      themeId: selectedTheme.id,
      variant: 'default',
      side: 'back',
      title: `${selectedRoundType.name} logo card`,
      content: buildGameTypeLogoCardBody(selectedTheme, selectedRoundType, categoryName, gameTypeLogoState.tone),
      renderContext: {
        tool: 'game-type-logo',
        target: 'game-type-logo',
        themeId: gameTypeLogoState.themeId,
        roundTypeId: selectedRoundType.id,
        renderState: baseRenderState
      }
    };

    const bannerPrompt: ArtworkPrompt = {
      id: createPromptId(`round-banner-${selectedRoundType.id}`),
      themeId: selectedTheme.id,
      variant: 'default',
      side: 'back',
      title: `${selectedRoundType.name} banner image`,
      content: buildGameTypeBannerBody(selectedTheme, selectedRoundType, categoryName, gameTypeLogoState.tone),
      renderContext: {
        tool: 'game-type-logo',
        target: 'theme-ui-banner',
        themeId: gameTypeLogoState.themeId,
        roundTypeId: selectedRoundType.id,
        renderState: baseRenderState
      }
    };

    removeArtworkForPromptSet(gameTypeLogoPrompts);
    setGameTypeLogoPrompts([logoPrompt, bannerPrompt]);
    setImageGenerationError('');
  }

  async function onGenerateArtworkForPrompt(prompt: ArtworkPrompt): Promise<void> {
    setImageGenerationError('');
    setGeneratingPromptIds((prev) => (prev.includes(prompt.id) ? prev : [...prev, prompt.id]));

    try {
      const assetFilePath = resolveArtworkAssetFilePath({
        themeId: prompt.renderContext.themeId,
        prompt,
        roundTypeId: prompt.renderContext.roundTypeId,
        target: prompt.renderContext.target,
        categorySlug: prompt.renderContext.categorySlug
      });
      const artwork = await generateArtworkImage(prompt, imageGeneratorConfig, prompt.renderContext.renderState, {
        assetPath: assetFilePath
      });
      const artworkWithPath: GeneratedArtwork = {
        ...artwork,
        assetPath: assetFilePath,
        assetKind: mapAssetTargetToArtworkKind(prompt.renderContext.target)
      };
      setGeneratedArtwork((prev) => [artworkWithPath, ...prev.filter((entry) => entry.promptId !== prompt.id)]);
    } catch (error) {
      setImageGenerationError(`Failed for "${prompt.title}": ${getImageGenerationErrorMessage(error)}`);
    } finally {
      setGeneratingPromptIds((prev) => prev.filter((id) => id !== prompt.id));
    }
  }

  async function onGenerateAllArtwork(prompts: ArtworkPrompt[], label: string): Promise<void> {
    if (prompts.length === 0) {
      setImageGenerationError('Generate prompts first.');
      return;
    }

    setImageGenerationError('');
    setBatchLabel(label);
    batchCancelRequestedRef.current = false;
    setBatchCancelRequested(false);
    setIsGeneratingAllArtwork(true);
    setBatchProgress({ completed: 0, total: prompts.length });

    for (let index = 0; index < prompts.length; index += 1) {
      if (batchCancelRequestedRef.current) {
        setImageGenerationError('Batch render canceled.');
        break;
      }
      const prompt = prompts[index];
      // eslint-disable-next-line no-await-in-loop
      await onGenerateArtworkForPrompt(prompt);
      setBatchProgress({ completed: index + 1, total: prompts.length });
      if (index < prompts.length - 1) {
        // eslint-disable-next-line no-await-in-loop
        await sleep(imageGeneratorConfig.batchDelayMs);
      }
    }

    setIsGeneratingAllArtwork(false);
    batchCancelRequestedRef.current = false;
    setBatchCancelRequested(false);
  }

  function onCancelGenerateAllArtwork(): void {
    batchCancelRequestedRef.current = true;
    setBatchCancelRequested(true);
  }

  function onDeleteArtworkForPrompt(promptId: string): void {
    setGeneratedArtwork((prev) => prev.filter((entry) => entry.promptId !== promptId));
  }

  function onDownloadArtworkForPrompt(prompt: ArtworkPrompt): void {
    const artwork = artworkByPromptId.get(prompt.id);
    if (!artwork) return;
    const fallbackPath = resolveArtworkAssetFilePath({
      themeId: prompt.renderContext.themeId,
      prompt,
      roundTypeId: prompt.renderContext.roundTypeId,
      target: prompt.renderContext.target,
      categorySlug: prompt.renderContext.categorySlug
    });
    const pathFromArtwork = artwork.assetPath?.trim() || fallbackPath;
    const normalizedPath = pathFromArtwork.replace(/^\/+/, '');
    const filename = normalizedPath.split('/').pop() || 'rendered-art.png';
    downloadDataUrlFile(filename, artwork.dataUrl);
    setCopiedMessage(`Saved as ${normalizedPath}`);
  }

  function clearGeneratedArtwork(): void {
    setGeneratedArtwork([]);
    setImageGenerationError('');
  }

  async function exportSectionDlc(
    prompts: ArtworkPrompt[],
    options: {
      packId: string;
      packLabel: string;
      themeId: string;
      roundTypeIdForLogo?: string;
      includeRulePrompts?: boolean;
    }
  ): Promise<void> {
    const promptIds = new Set(prompts.map((prompt) => prompt.id));
    const sectionArtwork = generatedArtwork.filter((artwork) => promptIds.has(artwork.promptId));
    await exportDlcTemplateZip({
      packId: options.packId,
      packLabel: options.packLabel,
      themeId: options.themeId,
      generatedArtwork: sectionArtwork,
      rulePromptCards: options.includeRulePrompts ? rulePromptCards : [],
      roundTypeIdForLogo: options.roundTypeIdForLogo
    });
    setCopiedMessage(`Exported DLC template ZIP for ${options.packLabel}.`);
  }

  async function onExportAllDlc(): Promise<void> {
    await exportDlcTemplateZip({
      packId: 'asset-tools-export',
      packLabel: 'Asset Tools Export',
      themeId: themeCardState.themeId,
      generatedArtwork,
      rulePromptCards,
      roundTypeIdForLogo: gameTypeLogoState.roundTypeId
    });
    setCopiedMessage('Exported complete DLC template ZIP.');
  }

  function onGenerateRulePrompts(): void {
    const cards = buildRulePromptCards(rulePromptState, roundTypes, themes);
    setRulePromptCards(cards);
    setCopiedMessage(`Generated ${cards.length} rule prompt cards.`);
  }

  async function onCopyRulePromptsJson(): Promise<void> {
    await copyToClipboard(JSON.stringify(rulePromptCards, null, 2));
    setCopiedMessage('Rule prompt JSON copied.');
  }

  async function onCopyRulePromptsTxt(): Promise<void> {
    await copyToClipboard(rulePromptCardsToText(rulePromptCards));
    setCopiedMessage('Rule prompt TXT copied.');
  }

  function onDownloadRulePromptsJson(): void {
    downloadJsonFile(
      `${slugifyThemeId(rulePromptState.category || 'prompt-pack')}-rule-prompts.json`,
      rulePromptCards
    );
  }

  function onDownloadRulePromptsTxt(): void {
    downloadTextFile(
      `${slugifyThemeId(rulePromptState.category || 'prompt-pack')}-rule-prompts.txt`,
      rulePromptCardsToText(rulePromptCards)
    );
  }

  const toolButtonClass =
    'tool-nav-button sticker w-full text-left px-4 py-3 text-sm md:text-base font-extrabold uppercase tracking-wide transition';

  function renderArtworkPromptCards(
    prompts: ArtworkPrompt[],
    options: { compactPromptCopy?: boolean; showGenerateButtons?: boolean; showAssetPath?: boolean }
  ): JSX.Element {
    return (
      <div className="mt-4 space-y-3">
        {prompts.length === 0 && <div className="sticker bg-black/50 p-4 text-white">No generated prompts yet.</div>}
        {prompts.map((prompt) => {
          const artwork = artworkByPromptId.get(prompt.id);
          const fallbackPath = resolveArtworkAssetFilePath({
            themeId: prompt.renderContext.themeId,
            prompt,
            roundTypeId: prompt.renderContext.roundTypeId,
            target: prompt.renderContext.target,
            categorySlug: prompt.renderContext.categorySlug
          });
          const assetPath = artwork?.assetPath?.trim() || fallbackPath;
          const compactCopy = prompt.content.length > 200 ? `${prompt.content.slice(0, 200)}...` : prompt.content;

          return (
            <article key={prompt.id} className="neon-panel p-3 bg-black/50">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-black text-lime-300">{prompt.title}</h4>
                <div className="text-xs font-bold text-white/80">
                  {prompt.side.toUpperCase()} • {prompt.variant === 'adult' ? '18+' : 'DEFAULT'}
                </div>
              </div>

              {options.compactPromptCopy ? (
                <p className="mt-2 text-xs md:text-sm text-white/90">{compactCopy}</p>
              ) : (
                <pre className="mt-2 text-xs md:text-sm whitespace-pre-wrap break-words text-white">{prompt.content}</pre>
              )}
              {options.compactPromptCopy && (
                <details className="mt-2 text-xs text-white/80">
                  <summary className="cursor-pointer">View full prompt body</summary>
                  <pre className="mt-2 whitespace-pre-wrap break-words text-white">{prompt.content}</pre>
                </details>
              )}

              {options.showAssetPath !== false && (
                <div className="mt-3 text-[11px] text-cyan-200 break-all">
                  <strong>Asset path:</strong> {assetPath.replace(/^\/+/, '')}
                </div>
              )}

              {options.showGenerateButtons !== false && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="sticker bg-lime-300 text-black px-3 py-1 font-black disabled:opacity-50"
                    disabled={generatingPromptIds.includes(prompt.id)}
                    onClick={() => void onGenerateArtworkForPrompt(prompt)}
                  >
                    {generatingPromptIds.includes(prompt.id)
                      ? 'Rendering...'
                      : artwork
                        ? 'Regenerate'
                        : 'Render Image'}
                  </button>
                  {artwork && (
                    <button
                      className="sticker bg-red-300 text-black px-3 py-1 font-black"
                      onClick={() => onDeleteArtworkForPrompt(prompt.id)}
                    >
                      Delete Image
                    </button>
                  )}
                {artwork && (
                  <button
                    className="sticker bg-violet-300 text-black px-3 py-1 font-black"
                    onClick={() => onDownloadArtworkForPrompt(prompt)}
                  >
                    Download Image
                  </button>
                )}
                </div>
              )}

              {artwork && (
                <div className="mt-3">
                  <div className="artwork-preview-frame">
                    <img src={artwork.dataUrl} alt={`${prompt.title} rendered artwork`} className="artwork-preview-image" />
                    {showArtworkGridTemplate && (
                      <>
                        <div className="card-grid-overlay" />
                        <div className="card-safe-zone-overlay" />
                      </>
                    )}
                  </div>
                  {showArtworkGridTemplate && (
                    <p className="text-[11px] text-white/80 mt-2">Guide overlay only (not included in exports).</p>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    );
  }

  return (
    <div className="px-4 py-5 sm:px-6 md:px-10 lg:px-14">
      <header className="neon-panel px-4 py-4 md:px-6 md:py-5 bg-gradient-to-r from-pink-500 via-purple-600 to-orange-500">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-4xl font-black text-black drop-shadow">Pants on Fire! Asset Tools</h1>
            <p className="text-black font-bold">Standalone admin toolchain for Pants on Fire card workflows</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="warning-label">ONE CARD ONLY 🔥</span>
            <span className="warning-label">DLC TEMPLATE EXPORT READY</span>
          </div>
        </div>
      </header>

      {copiedMessage && (
        <div className="mt-4 sticker bg-lime-300 text-black px-3 py-2 font-extrabold inline-block">{copiedMessage}</div>
      )}
      {imageGenerationError && (
        <div className="mt-4 sticker bg-red-300 text-black p-3 font-bold">{imageGenerationError}</div>
      )}
      {artworkStorageWarning && (
        <div className="mt-4 sticker bg-yellow-300 text-black p-3 font-bold">{artworkStorageWarning}</div>
      )}
      {isGeneratingAllArtwork && (
        <div className="mt-4 neon-panel p-3 bg-black/50">
          <div className="text-xs text-white/90 mb-1">
            {batchLabel ? `${batchLabel} — ` : ''}
            Batch progress: {batchProgress.completed}/{batchProgress.total}
          </div>
          <Progress value={batchProgress.total > 0 ? (batchProgress.completed / batchProgress.total) * 100 : 0} />
        </div>
      )}

      <div className="mt-5 tool-layout lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-5">
        <nav className="tool-nav-stack space-y-3">
          <button
            className={`${toolButtonClass} ${
              activeTool === 'theme-creator' ? 'bg-lime-300 text-black' : 'bg-fuchsia-500 text-black hover:bg-lime-300'
            }`}
            onClick={() => setActiveTool('theme-creator')}
          >
            Theme Creator
          </button>
          <button
            className={`${toolButtonClass} ${
              activeTool === 'category-logo-card-creator'
                ? 'bg-lime-300 text-black'
                : 'bg-fuchsia-500 text-black hover:bg-lime-300'
            }`}
            onClick={() => setActiveTool('category-logo-card-creator')}
          >
            Category Logo Card Creator
          </button>
          <button
            className={`${toolButtonClass} ${
              activeTool === 'theme-card-generator'
                ? 'bg-lime-300 text-black'
                : 'bg-fuchsia-500 text-black hover:bg-lime-300'
            }`}
            onClick={() => setActiveTool('theme-card-generator')}
          >
            Theme Card Generater
          </button>
          <button
            className={`${toolButtonClass} ${
              activeTool === 'game-type-logo-creator'
                ? 'bg-lime-300 text-black'
                : 'bg-fuchsia-500 text-black hover:bg-lime-300'
            }`}
            onClick={() => setActiveTool('game-type-logo-creator')}
          >
            Game Type Logo Creator
          </button>
          <button
            className={`${toolButtonClass} ${
              activeTool === 'prompt-generator'
                ? 'bg-lime-300 text-black'
                : 'bg-fuchsia-500 text-black hover:bg-lime-300'
            }`}
            onClick={() => setActiveTool('prompt-generator')}
          >
            Prompt Generator
          </button>
          <button
            className={`${toolButtonClass} ${
              activeTool === 'settings' ? 'bg-lime-300 text-black' : 'bg-fuchsia-500 text-black hover:bg-lime-300'
            }`}
            onClick={() => setActiveTool('settings')}
          >
            Settings
          </button>
        </nav>

        <main className="mt-5 lg:mt-0 space-y-5">
          {activeTool === 'theme-creator' && (
            <section className="neon-panel p-4 md:p-6 bg-emerald-900/65">
              <h2 className="text-xl md:text-2xl font-black text-lime-300">Theme Creator</h2>
              <p className="text-white/90 mt-1">Create themes by name + colour and auto-add them to all generators.</p>

              <div className="mt-4 neon-panel p-3 bg-black/45">
                <h3 className="font-black text-orange-300">Create New Theme</h3>
                <div className="mt-2 grid gap-3 md:grid-cols-3">
                  <label className="flex flex-col gap-1 font-bold md:col-span-2">
                    Theme name
                    <input
                      className="sticker px-3 py-2 bg-black text-lime-300"
                      value={themeNameDraft}
                      onChange={(event) => {
                        setThemeNameDraft(event.target.value);
                        if (themeCreateError) setThemeCreateError('');
                      }}
                      placeholder="Enter theme name"
                    />
                  </label>
                  <label className="flex flex-col gap-1 font-bold">
                    Theme colour
                    <input
                      className="sticker px-3 py-2 bg-black text-lime-300 h-11"
                      type="color"
                      value={themeAccentColor}
                      onChange={(event) => setThemeAccentColor(event.target.value)}
                    />
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 items-center">
                  <button className="sticker bg-lime-300 text-black px-4 py-2 font-black" onClick={createTheme}>
                    Create Theme
                  </button>
                  {themeCreateError && <span className="text-red-200 font-bold text-sm">{themeCreateError}</span>}
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {themes.map((theme, index) => (
                  <article key={theme.id} className="neon-panel p-3 bg-black/45">
                    <div className="grid gap-3 lg:grid-cols-2">
                      <label className="flex flex-col gap-1 font-bold">
                        Name
                        <input
                          className="sticker px-3 py-2 bg-black text-lime-300"
                          value={theme.name}
                          onChange={(event) => updateTheme(index, { name: event.target.value })}
                        />
                      </label>
                      <label className="flex flex-col gap-1 font-bold">
                        ID
                        <input
                          className="sticker px-3 py-2 bg-black text-lime-300"
                          value={theme.id}
                          onChange={(event) => updateTheme(index, { id: event.target.value })}
                        />
                      </label>
                      <label className="flex flex-col gap-1 font-bold lg:col-span-2">
                        Palette (comma separated)
                        <input
                          className="sticker px-3 py-2 bg-black text-lime-300"
                          value={theme.palette.join(', ')}
                          onChange={(event) =>
                            updateTheme(index, {
                              palette: event.target.value
                                .split(',')
                                .map((value) => value.trim())
                                .filter(Boolean)
                            })
                          }
                        />
                      </label>
                    </div>
                    <button
                      className="mt-3 sticker bg-red-300 text-black px-4 py-2 font-black"
                      onClick={() => deleteTheme(index)}
                    >
                      Delete Theme
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeTool === 'category-logo-card-creator' && (
            <section className="neon-panel p-4 md:p-6 bg-fuchsia-900/65">
              <h2 className="text-xl md:text-2xl font-black text-lime-300">Category Logo Card Creator</h2>
              <p className="text-white/90 mt-1">
                Generates category back card + adult back card with category title and themed imagery.
              </p>

              <div className="grid gap-4 mt-4 md:grid-cols-2 lg:grid-cols-3">
                <label className="flex flex-col gap-1 font-bold">
                  Theme
                  <select
                    className="sticker px-3 py-2 bg-black text-lime-300"
                    value={categoryLogoState.themeId}
                    onChange={(event) =>
                      setCategoryLogoState((prev) => ({
                        ...prev,
                        themeId: event.target.value
                      }))
                    }
                  >
                    {themes.map((theme) => (
                      <option key={theme.id} value={theme.id}>
                        {theme.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 font-bold">
                  Category name
                  <input
                    className="sticker px-3 py-2 bg-black text-lime-300"
                    value={categoryLogoState.categoryName}
                    onChange={(event) =>
                      setCategoryLogoState((prev) => ({
                        ...prev,
                        categoryName: event.target.value
                      }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-1 font-bold">
                  Style intensity
                  <select
                    className="sticker px-3 py-2 bg-black text-lime-300"
                    value={categoryLogoState.styleIntensity}
                    onChange={(event) =>
                      setCategoryLogoState((prev) => ({
                        ...prev,
                        styleIntensity: event.target.value as StyleIntensity
                      }))
                    }
                  >
                    <option value="clean">Clean</option>
                    <option value="colourful">Colourful</option>
                    <option value="crazy">Crazy / Wacky</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 font-bold">
                  Tone
                  <select
                    className="sticker px-3 py-2 bg-black text-lime-300"
                    value={categoryLogoState.tone}
                    onChange={(event) =>
                      setCategoryLogoState((prev) => ({
                        ...prev,
                        tone: event.target.value as PromptTone
                      }))
                    }
                  >
                    <option value="fun">Fun</option>
                    <option value="dark">Dark</option>
                    <option value="silly">Silly</option>
                    <option value="premium">Premium</option>
                    <option value="party">Party</option>
                    <option value="chaotic">Chaotic</option>
                  </select>
                </label>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button className="sticker bg-lime-300 text-black px-4 py-2 font-black" onClick={onGenerateCategoryLogoPrompts}>
                  Generate Category Prompts
                </button>
                <button
                  className="sticker bg-cyan-300 text-black px-4 py-2 font-black disabled:opacity-50"
                  disabled={categoryLogoPrompts.length === 0 || isGeneratingAllArtwork}
                  onClick={() => void onGenerateAllArtwork(categoryLogoPrompts, 'Category Logo Creator')}
                >
                  {isGeneratingAllArtwork ? 'Rendering all...' : 'Render All'}
                </button>
                <button
                  className="sticker bg-yellow-300 text-black px-4 py-2 font-black disabled:opacity-50"
                  disabled={!isGeneratingAllArtwork || batchCancelRequested}
                  onClick={onCancelGenerateAllArtwork}
                >
                  {batchCancelRequested ? 'Canceling...' : 'Cancel Batch'}
                </button>
                <button
                  className="sticker bg-violet-300 text-black px-4 py-2 font-black disabled:opacity-50"
                  disabled={categoryLogoPrompts.length === 0}
                  onClick={() =>
                    void exportSectionDlc(categoryLogoPrompts, {
                      packId: `${slugifyThemeId(categoryLogoState.categoryName || 'category')}-category-cards`,
                      packLabel: `${categoryLogoState.categoryName || 'Category'} Cards`,
                      themeId: categoryLogoState.themeId
                    })
                  }
                >
                  Export DLC Template ZIP
                </button>
              </div>

              {renderArtworkPromptCards(categoryLogoPrompts, { compactPromptCopy: false })}
            </section>
          )}

          {activeTool === 'theme-card-generator' && (
            <section className="neon-panel p-4 md:p-6 bg-purple-900/65">
              <h2 className="text-xl md:text-2xl font-black text-lime-300">Theme Card Generater</h2>
              <p className="text-white/90 mt-1">
                Front/back card designer with minimized prompt display and front-card text ban rules.
              </p>

              <div className="grid gap-4 mt-4 md:grid-cols-2 lg:grid-cols-3">
                <label className="flex flex-col gap-1 font-bold">
                  Theme
                  <select
                    className="sticker px-3 py-2 bg-black text-lime-300"
                    value={themeCardState.themeId}
                    onChange={(event) => setThemeCardState((prev) => ({ ...prev, themeId: event.target.value }))}
                  >
                    {themes.map((theme) => (
                      <option key={theme.id} value={theme.id}>
                        {theme.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 font-bold">
                  Game type (asset naming)
                  <select
                    className="sticker px-3 py-2 bg-black text-lime-300"
                    value={themeCardRoundTypeId}
                    onChange={(event) => setThemeCardRoundTypeId(event.target.value)}
                  >
                    {roundTypes.map((roundType) => (
                      <option key={roundType.id} value={roundType.id}>
                        {roundType.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 font-bold">
                  Card Type
                  <select
                    className="sticker px-3 py-2 bg-black text-lime-300"
                    value={themeCardState.cardType}
                    onChange={(event) =>
                      setThemeCardState((prev) => ({
                        ...prev,
                        cardType: event.target.value as PromptGeneratorState['cardType']
                      }))
                    }
                  >
                    <option value="back">Back then Front</option>
                    <option value="front">Front then Back</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 font-bold">
                  Version
                  <select
                    className="sticker px-3 py-2 bg-black text-lime-300"
                    value={themeCardState.version}
                    onChange={(event) =>
                      setThemeCardState((prev) => ({
                        ...prev,
                        version: event.target.value as PromptGeneratorState['version']
                      }))
                    }
                  >
                    <option value="default">Default</option>
                    <option value="adult">Adult 18+</option>
                    <option value="both">Both</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 font-bold">
                  Style Intensity
                  <select
                    className="sticker px-3 py-2 bg-black text-lime-300"
                    value={themeCardState.styleIntensity}
                    onChange={(event) =>
                      setThemeCardState((prev) => ({
                        ...prev,
                        styleIntensity: event.target.value as StyleIntensity
                      }))
                    }
                  >
                    <option value="clean">Clean</option>
                    <option value="colourful">Colourful</option>
                    <option value="crazy">Crazy / Wacky</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 font-bold">
                  Tone
                  <select
                    className="sticker px-3 py-2 bg-black text-lime-300"
                    value={themeCardState.tone}
                    onChange={(event) =>
                      setThemeCardState((prev) => ({
                        ...prev,
                        tone: event.target.value as PromptTone
                      }))
                    }
                  >
                    <option value="fun">Fun</option>
                    <option value="dark">Dark</option>
                    <option value="silly">Silly</option>
                    <option value="premium">Premium</option>
                    <option value="party">Party</option>
                    <option value="chaotic">Chaotic</option>
                  </select>
                </label>
              </div>

              <label className="mt-4 flex items-center gap-3 font-bold">
                <input
                  type="checkbox"
                  checked={themeCardState.strictMode}
                  onChange={(event) => setThemeCardState((prev) => ({ ...prev, strictMode: event.target.checked }))}
                />
                Strict Mode (front cards enforce no rendered text)
              </label>

              <div className="mt-4 neon-panel p-3 bg-black/40">
                <h3 className="font-black text-orange-300">Always-On Negative Prompt</h3>
                <p className="text-sm text-white mt-1">{getNegativePrompt()}</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button className="sticker bg-lime-300 text-black px-4 py-2 font-black" onClick={onGenerateThemeCardPrompts}>
                  Generate Theme Card Prompts
                </button>
                <button
                  className="sticker bg-cyan-300 text-black px-4 py-2 font-black disabled:opacity-50"
                  disabled={themeCardPrompts.length === 0 || isGeneratingAllArtwork}
                  onClick={() => void onGenerateAllArtwork(themeCardPrompts, 'Theme Card Generator')}
                >
                  {isGeneratingAllArtwork ? 'Rendering all...' : 'Render All'}
                </button>
                <button
                  className="sticker bg-yellow-300 text-black px-4 py-2 font-black disabled:opacity-50"
                  disabled={!isGeneratingAllArtwork || batchCancelRequested}
                  onClick={onCancelGenerateAllArtwork}
                >
                  {batchCancelRequested ? 'Canceling...' : 'Cancel Batch'}
                </button>
                <button
                  className="sticker bg-pink-300 text-black px-4 py-2 font-black"
                  onClick={() => {
                    removeArtworkForPromptSet(themeCardPrompts);
                    setThemeCardPrompts([]);
                  }}
                >
                  Clear Theme Card Prompts
                </button>
                <button
                  className="sticker bg-violet-300 text-black px-4 py-2 font-black disabled:opacity-50"
                  disabled={themeCardPrompts.length === 0}
                  onClick={() =>
                    void exportSectionDlc(themeCardPrompts, {
                      packId: `${themeCardState.themeId}-theme-cards`,
                      packLabel: `${getTheme(themeCardState.themeId).name} Theme Cards`,
                      themeId: themeCardState.themeId
                    })
                  }
                >
                  Export DLC Template ZIP
                </button>
              </div>

              {renderArtworkPromptCards(themeCardPrompts, { compactPromptCopy: true })}
            </section>
          )}

          {activeTool === 'game-type-logo-creator' && (
            <section className="neon-panel p-4 md:p-6 bg-indigo-900/65">
              <h2 className="text-xl md:text-2xl font-black text-lime-300">Game Type Logo Creator</h2>
              <p className="text-white/90 mt-1">
                Generates game-type logo back card art and matching banner image for selected round type.
              </p>

              <div className="grid gap-4 mt-4 md:grid-cols-2 lg:grid-cols-3">
                <label className="flex flex-col gap-1 font-bold">
                  Theme
                  <select
                    className="sticker px-3 py-2 bg-black text-lime-300"
                    value={gameTypeLogoState.themeId}
                    onChange={(event) => setGameTypeLogoState((prev) => ({ ...prev, themeId: event.target.value }))}
                  >
                    {themes.map((theme) => (
                      <option key={theme.id} value={theme.id}>
                        {theme.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 font-bold">
                  Game type
                  <select
                    className="sticker px-3 py-2 bg-black text-lime-300"
                    value={gameTypeLogoState.roundTypeId}
                    onChange={(event) =>
                      setGameTypeLogoState((prev) => ({
                        ...prev,
                        roundTypeId: event.target.value
                      }))
                    }
                  >
                    {roundTypes.map((roundType) => (
                      <option key={roundType.id} value={roundType.id}>
                        {roundType.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 font-bold">
                  Category text
                  <input
                    className="sticker px-3 py-2 bg-black text-lime-300"
                    value={gameTypeLogoState.categoryName}
                    onChange={(event) => setGameTypeLogoState((prev) => ({ ...prev, categoryName: event.target.value }))}
                  />
                </label>
                <label className="flex flex-col gap-1 font-bold">
                  Style intensity
                  <select
                    className="sticker px-3 py-2 bg-black text-lime-300"
                    value={gameTypeLogoState.styleIntensity}
                    onChange={(event) =>
                      setGameTypeLogoState((prev) => ({
                        ...prev,
                        styleIntensity: event.target.value as StyleIntensity
                      }))
                    }
                  >
                    <option value="clean">Clean</option>
                    <option value="colourful">Colourful</option>
                    <option value="crazy">Crazy / Wacky</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 font-bold">
                  Tone
                  <select
                    className="sticker px-3 py-2 bg-black text-lime-300"
                    value={gameTypeLogoState.tone}
                    onChange={(event) =>
                      setGameTypeLogoState((prev) => ({
                        ...prev,
                        tone: event.target.value as PromptTone
                      }))
                    }
                  >
                    <option value="fun">Fun</option>
                    <option value="dark">Dark</option>
                    <option value="silly">Silly</option>
                    <option value="premium">Premium</option>
                    <option value="party">Party</option>
                    <option value="chaotic">Chaotic</option>
                  </select>
                </label>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button className="sticker bg-lime-300 text-black px-4 py-2 font-black" onClick={onGenerateGameTypeLogoPrompts}>
                  Generate Game Type Prompts
                </button>
                <button
                  className="sticker bg-cyan-300 text-black px-4 py-2 font-black disabled:opacity-50"
                  disabled={gameTypeLogoPrompts.length === 0 || isGeneratingAllArtwork}
                  onClick={() => void onGenerateAllArtwork(gameTypeLogoPrompts, 'Game Type Logo Creator')}
                >
                  {isGeneratingAllArtwork ? 'Rendering all...' : 'Render All'}
                </button>
                <button
                  className="sticker bg-yellow-300 text-black px-4 py-2 font-black disabled:opacity-50"
                  disabled={!isGeneratingAllArtwork || batchCancelRequested}
                  onClick={onCancelGenerateAllArtwork}
                >
                  {batchCancelRequested ? 'Canceling...' : 'Cancel Batch'}
                </button>
                <button
                  className="sticker bg-violet-300 text-black px-4 py-2 font-black disabled:opacity-50"
                  disabled={gameTypeLogoPrompts.length === 0}
                  onClick={() =>
                    void exportSectionDlc(gameTypeLogoPrompts, {
                      packId: `${gameTypeLogoState.roundTypeId}-logos`,
                      packLabel: `${getRoundType(gameTypeLogoState.roundTypeId).name} Logos`,
                      themeId: gameTypeLogoState.themeId,
                      roundTypeIdForLogo: gameTypeLogoState.roundTypeId
                    })
                  }
                >
                  Export DLC Template ZIP
                </button>
              </div>

              {renderArtworkPromptCards(gameTypeLogoPrompts, { compactPromptCopy: false })}
            </section>
          )}

          {activeTool === 'prompt-generator' && (
            <section className="neon-panel p-4 md:p-6 bg-rose-900/65">
              <h2 className="text-xl md:text-2xl font-black text-lime-300">Prompt Generator</h2>
              <p className="text-white/90 mt-1">
                Creates rule-style prompt cards per game type with hints, liar variants, banned words, and 18+ mode.
              </p>

              <div className="grid gap-4 mt-4 md:grid-cols-2 lg:grid-cols-3">
                <label className="flex flex-col gap-1 font-bold">
                  Theme voice
                  <select
                    className="sticker px-3 py-2 bg-black text-lime-300"
                    value={rulePromptState.themeId}
                    onChange={(event) => setRulePromptState((prev) => ({ ...prev, themeId: event.target.value }))}
                  >
                    {themes.map((theme) => (
                      <option key={theme.id} value={theme.id}>
                        {theme.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 font-bold">
                  Category
                  <input
                    className="sticker px-3 py-2 bg-black text-lime-300"
                    value={rulePromptState.category}
                    onChange={(event) => setRulePromptState((prev) => ({ ...prev, category: event.target.value }))}
                  />
                </label>
                <label className="flex flex-col gap-1 font-bold">
                  Prompts per game type
                  <input
                    className="sticker px-3 py-2 bg-black text-lime-300"
                    type="number"
                    min={1}
                    max={24}
                    value={rulePromptState.countPerGameType}
                    onChange={(event) =>
                      setRulePromptState((prev) => ({
                        ...prev,
                        countPerGameType: Math.max(1, Math.min(24, Number(event.target.value) || 1))
                      }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-1 font-bold">
                  Tone
                  <select
                    className="sticker px-3 py-2 bg-black text-lime-300"
                    value={rulePromptState.tone}
                    onChange={(event) =>
                      setRulePromptState((prev) => ({
                        ...prev,
                        tone: event.target.value as CardTextTone
                      }))
                    }
                  >
                    <option value="silly">Silly</option>
                    <option value="sarcastic">Sarcastic</option>
                    <option value="dark humour">Dark humour</option>
                    <option value="british humour">British humour</option>
                    <option value="party game">Party game</option>
                    <option value="chaotic">Chaotic</option>
                  </select>
                </label>
                <label className="mt-7 inline-flex items-center gap-2 font-bold">
                  <input
                    type="checkbox"
                    checked={rulePromptState.includeAdult}
                    onChange={(event) => setRulePromptState((prev) => ({ ...prev, includeAdult: event.target.checked }))}
                  />
                  Include 18+ variants
                </label>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button className="sticker bg-lime-300 text-black px-4 py-2 font-black" onClick={onGenerateRulePrompts}>
                  Generate Prompt Pack
                </button>
                <button
                  className="sticker bg-pink-300 text-black px-4 py-2 font-black disabled:opacity-50"
                  disabled={rulePromptCards.length === 0}
                  onClick={() => void onCopyRulePromptsJson()}
                >
                  Copy JSON
                </button>
                <button
                  className="sticker bg-cyan-300 text-black px-4 py-2 font-black disabled:opacity-50"
                  disabled={rulePromptCards.length === 0}
                  onClick={() => void onCopyRulePromptsTxt()}
                >
                  Copy TXT
                </button>
                <button
                  className="sticker bg-orange-300 text-black px-4 py-2 font-black disabled:opacity-50"
                  disabled={rulePromptCards.length === 0}
                  onClick={onDownloadRulePromptsJson}
                >
                  Download JSON
                </button>
                <button
                  className="sticker bg-yellow-300 text-black px-4 py-2 font-black disabled:opacity-50"
                  disabled={rulePromptCards.length === 0}
                  onClick={onDownloadRulePromptsTxt}
                >
                  Download TXT
                </button>
                <button
                  className="sticker bg-violet-300 text-black px-4 py-2 font-black disabled:opacity-50"
                  disabled={rulePromptCards.length === 0}
                  onClick={() =>
                    void exportSectionDlc([], {
                      packId: `${slugifyThemeId(rulePromptState.category || 'prompt-pack')}-prompts`,
                      packLabel: `${rulePromptState.category || 'Prompt'} Prompt Pack`,
                      themeId: rulePromptState.themeId,
                      includeRulePrompts: true
                    })
                  }
                >
                  Export DLC Template ZIP
                </button>
              </div>

              <div className="mt-4 text-sm text-white/90">
                Generated cards: <strong>{rulePromptCards.length}</strong> (
                {roundTypes.length} game types × {rulePromptState.countPerGameType}
                {rulePromptState.includeAdult ? ' × 2 versions' : ''})
              </div>

              <div className="mt-4 space-y-3">
                {roundTypes.map((roundType) => {
                  const cards = rulePromptGroups.get(roundType.id) || [];
                  return (
                    <details key={roundType.id} className="neon-panel p-3 bg-black/50">
                      <summary className="cursor-pointer font-black text-lime-300">
                        {roundType.name} ({cards.length})
                      </summary>
                      <div className="mt-3 space-y-2">
                        {cards.slice(0, 30).map((card) => (
                          <article key={card.id} className="sticker bg-black/55 px-3 py-2">
                            <div className="text-xs text-cyan-200 font-bold">
                              {card.version === 'adult' ? '18+' : 'Default'} • {card.hint}
                            </div>
                            <p className="text-xs text-white mt-1">
                              <strong>Main:</strong> {card.mainPrompt}
                            </p>
                            <p className="text-xs text-white mt-1">
                              <strong>Liar:</strong> {card.liarPrompt}
                            </p>
                            <p className="text-xs text-white mt-1">
                              <strong>Liar variant:</strong> {card.liarVariant}
                            </p>
                            <p className="text-xs text-white/80 mt-1">
                              <strong>Banned words:</strong> {card.bannedWords.join(', ')}
                            </p>
                          </article>
                        ))}
                        {cards.length > 30 && (
                          <p className="text-xs text-white/70">Showing first 30 entries for this game type.</p>
                        )}
                      </div>
                    </details>
                  );
                })}
              </div>
            </section>
          )}

          {activeTool === 'settings' && (
            <section className="neon-panel p-4 md:p-6 bg-violet-900/65">
              <h2 className="text-xl md:text-2xl font-black text-lime-300">Settings</h2>
              <p className="text-white/90 mt-1">
                All API/OpenAI-compatible configuration lives here for the image render tools.
              </p>

              <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <label className="flex flex-col gap-1 font-bold text-sm">
                  Provider
                  <select
                    className="sticker px-3 py-2 bg-black text-lime-300"
                    value={imageGeneratorConfig.provider}
                    onChange={(event) =>
                      setImageGeneratorConfig((prev) => ({
                        ...prev,
                        provider: event.target.value as ImageGeneratorConfig['provider']
                      }))
                    }
                  >
                    <option value="openai-compatible">OpenAI-Compatible</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 font-bold text-sm">
                  API Endpoint
                  <input
                    className="sticker px-3 py-2 bg-black text-lime-300"
                    value={imageGeneratorConfig.endpoint}
                    onChange={(event) =>
                      setImageGeneratorConfig((prev) => ({
                        ...prev,
                        endpoint: event.target.value
                      }))
                    }
                    placeholder="https://api.openai.com/v1/images/generations"
                  />
                </label>
                <label className="flex flex-col gap-1 font-bold text-sm">
                  Model
                  <input
                    className="sticker px-3 py-2 bg-black text-lime-300"
                    value={imageGeneratorConfig.model}
                    onChange={(event) =>
                      setImageGeneratorConfig((prev) => ({
                        ...prev,
                        model: event.target.value
                      }))
                    }
                    placeholder="gpt-image-1"
                  />
                </label>
                <label className="flex flex-col gap-1 font-bold text-sm">
                  Quality
                  <select
                    className="sticker px-3 py-2 bg-black text-lime-300"
                    value={imageGeneratorConfig.quality}
                    onChange={(event) =>
                      setImageGeneratorConfig((prev) => ({
                        ...prev,
                        quality: event.target.value as ImageGeneratorConfig['quality']
                      }))
                    }
                  >
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 font-bold text-sm">
                  Timeout (ms)
                  <input
                    className="sticker px-3 py-2 bg-black text-lime-300"
                    type="number"
                    min={5000}
                    max={120000}
                    value={imageGeneratorConfig.timeoutMs}
                    onChange={(event) =>
                      setImageGeneratorConfig((prev) => ({
                        ...prev,
                        timeoutMs: Math.max(5000, Math.min(120000, Number(event.target.value) || prev.timeoutMs))
                      }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-1 font-bold text-sm">
                  Max retries
                  <input
                    className="sticker px-3 py-2 bg-black text-lime-300"
                    type="number"
                    min={0}
                    max={6}
                    value={imageGeneratorConfig.maxRetries}
                    onChange={(event) =>
                      setImageGeneratorConfig((prev) => ({
                        ...prev,
                        maxRetries: Math.max(0, Math.min(6, Number(event.target.value) || 0))
                      }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-1 font-bold text-sm">
                  Batch delay (ms)
                  <input
                    className="sticker px-3 py-2 bg-black text-lime-300"
                    type="number"
                    min={0}
                    max={5000}
                    value={imageGeneratorConfig.batchDelayMs}
                    onChange={(event) =>
                      setImageGeneratorConfig((prev) => ({
                        ...prev,
                        batchDelayMs: Math.max(0, Math.min(5000, Number(event.target.value) || 0))
                      }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-1 font-bold text-sm md:col-span-2">
                  API Key
                  <input
                    className="sticker px-3 py-2 bg-black text-lime-300"
                    type="password"
                    value={imageGeneratorConfig.apiKey}
                    onChange={(event) =>
                      setImageGeneratorConfig((prev) => ({
                        ...prev,
                        apiKey: event.target.value
                      }))
                    }
                    placeholder="Paste API key"
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <label className="sticker bg-black/65 text-white px-3 py-2 font-bold inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showArtworkGridTemplate}
                    onChange={(event) => setShowArtworkGridTemplate(event.target.checked)}
                  />
                  Gridline template overlay
                </label>
                <button className="sticker bg-pink-300 text-black px-4 py-2 font-black" onClick={clearGeneratedArtwork}>
                  Clear All Rendered Art
                </button>
                <button className="sticker bg-violet-300 text-black px-4 py-2 font-black" onClick={() => void onExportAllDlc()}>
                  Export Complete DLC Template ZIP
                </button>
              </div>

              <div className="mt-4 neon-panel p-4 bg-black/50">
                <h3 className="font-black text-orange-300">Export Policy</h3>
                <ul className="mt-2 list-disc pl-5 text-sm text-white">
                  <li>All export actions generate DLC-template-shaped ZIP bundles.</li>
                  <li>Generated files are mapped to canonical /public/assets paths.</li>
                  <li>Prompt pack export includes template-compatible promptRoundData.js scaffold.</li>
                  <li>Picture-pack manifest scaffolds are included for DLC import workflows.</li>
                </ul>
              </div>
            </section>
          )}
        </main>
      </div>

      <footer className="mt-6 text-xs text-white/75 font-bold pb-5">
        Pants on Fire! Asset Tools - one-card image constraints active.
      </footer>
    </div>
  );
}

export default App;
