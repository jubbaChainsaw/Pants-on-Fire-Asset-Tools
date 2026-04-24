export type VersionMode = 'default' | 'adult' | 'both';
export type CardType = 'back' | 'front';
export type StyleIntensity = 'clean' | 'colourful' | 'crazy';
export type PromptTone = 'fun' | 'dark' | 'silly' | 'premium' | 'party' | 'chaotic';
export type PromptResolution = '1024x1536';

export interface Theme {
  id: string;
  name: string;
  palette: string[];
  motifs: string[];
  borderMotifs: string[];
  avoid: string[];
}

export interface RoundType {
  id: string;
  name: string;
  cardType: 'prompt' | 'opinion' | 'picture' | 'grill' | 'sound' | 'video';
  description: string;
  promptStyle: string;
  examples: string[];
  rules: string[];
  onlineOnly: boolean;
}

export interface PromptGeneratorState {
  themeId: string;
  cardType: CardType;
  version: VersionMode;
  styleIntensity: StyleIntensity;
  tone: PromptTone;
  resolution: PromptResolution;
  strictMode: boolean;
}

export interface GeneratedPrompt {
  id: string;
  variant: 'default' | 'adult';
  side: CardType;
  title: string;
  content: string;
}

export type ImageProvider = 'openai-compatible';
export type ImageQuality = 'low' | 'medium' | 'high';

export interface ImageGeneratorConfig {
  provider: ImageProvider;
  endpoint: string;
  apiKey: string;
  model: string;
  quality: ImageQuality;
  timeoutMs: number;
  maxRetries: number;
  batchDelayMs: number;
}

export interface GeneratedArtwork {
  id: string;
  promptId: string;
  promptTitle: string;
  side: CardType;
  variant: 'default' | 'adult';
  dataUrl: string;
  createdAt: string;
}

export type CardTextVersion = 'default' | 'adult';
export type CardTextTone = 'silly' | 'sarcastic' | 'dark humour' | 'british humour' | 'party game' | 'chaotic';

export interface CardTextGeneratorState {
  version: CardTextVersion;
  themeId: string;
  roundTypeId: string;
  count: number;
  tone: CardTextTone;
}

export interface GeneratedCardText {
  id: string;
  text: string;
  roundTypeId: string;
  themeId: string;
  version: CardTextVersion;
  tone: CardTextTone;
}

export type DeckVersion = 'default' | 'adult' | 'mixed';
export type CardSizePreset = 'poker' | 'tarot' | 'custom';
export type BleedSize = '3mm' | '5mm';
export type TextStyle = 'white-black-outline' | 'red-white-outline';

export interface DeckBuilderState {
  deckName: string;
  version: DeckVersion;
  themeId: string;
  cardSize: CardSizePreset;
  customWidthMm: number;
  customHeightMm: number;
  cardsPerPage: 8 | 9 | 10;
  bleed: boolean;
  bleedSize: BleedSize;
  cropMarks: boolean;
  textStyle: TextStyle;
  frontDesignDataUrl: string;
  backDesignDataUrl: string;
  textInput: string;
  safeZones: boolean;
  bleedGuides: boolean;
}

export interface AppExportBundle {
  themes: Theme[];
  roundTypes: RoundType[];
  promptState: PromptGeneratorState;
  generatedPrompts: GeneratedPrompt[];
  imageGeneratorConfig?: ImageGeneratorConfig;
  generatedArtwork?: GeneratedArtwork[];
  cardTextState: CardTextGeneratorState;
  generatedCardTexts: GeneratedCardText[];
  deckState: DeckBuilderState;
}
