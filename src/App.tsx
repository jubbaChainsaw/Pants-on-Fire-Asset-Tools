import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppExportBundle,
  CardTextGeneratorState,
  DeckBuilderState,
  GeneratedCardText,
  GeneratedPrompt,
  GeneratedArtwork,
  ImageGeneratorConfig,
  PromptGeneratorState,
  RoundType,
  Theme
} from './types';
import { DEFAULT_THEMES } from './data/defaultThemes';
import { DEFAULT_ROUND_TYPES, ROUND_TYPE_ID_SET } from './data/defaultRoundTypes';
import { generateArtworkPrompts, getNegativePrompt } from './utils/promptGenerator';
import { generateCardTexts } from './utils/cardTextGenerator';
import { loadFromStorage, saveToStorage } from './utils/storage';
import {
  cardTextsToCsv,
  copyToClipboard,
  createAppExportBundle,
  downloadJsonFile,
  downloadTextFile,
  exportDeckPdf,
  exportPngCardsZip,
  exportDeckZip,
  parseCardTextCsv,
  parseCardTextJson,
  promptsToText
} from './utils/exporters';
import { generateArtworkImage } from './utils/imageGenerator';
import { Progress } from './components/ui/progress';

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

const STORAGE_KEYS = {
  themes: 'pof_themes_v1',
  roundTypes: 'pof_round_types_v1',
  promptState: 'pof_prompt_state_v1',
  generatedPrompts: 'pof_generated_prompts_v1',
  imageGeneratorConfig: 'pof_image_generator_config_v1',
  generatedArtwork: 'pof_generated_artwork_v1',
  cardTextState: 'pof_card_text_state_v1',
  generatedCardTexts: 'pof_generated_card_texts_v1',
  deckState: 'pof_deck_state_v1'
};

const STANDARD_GAME_ASSET_SIZE: PromptResolution = '1024x1536';

const DEFAULT_PROMPT_STATE: PromptGeneratorState = {
  themeId: DEFAULT_THEMES[0].id,
  cardType: 'back',
  version: 'default',
  styleIntensity: 'colourful',
  tone: 'party',
  resolution: STANDARD_GAME_ASSET_SIZE,
  strictMode: true
};

const DEFAULT_CARD_TEXT_STATE: CardTextGeneratorState = {
  version: 'default',
  themeId: DEFAULT_THEMES[0].id,
  roundTypeId: DEFAULT_ROUND_TYPES[0].id,
  count: 12,
  tone: 'party game'
};

const DEFAULT_DECK_STATE: DeckBuilderState = {
  deckName: 'Pants on Fire Deck',
  version: 'default',
  themeId: DEFAULT_THEMES[0].id,
  cardSize: 'poker',
  customWidthMm: 63,
  customHeightMm: 88,
  cardsPerPage: 9,
  bleed: true,
  bleedSize: '3mm',
  cropMarks: true,
  textStyle: 'white-black-outline',
  frontDesignDataUrl: '',
  backDesignDataUrl: '',
  textInput: '',
  safeZones: true,
  bleedGuides: true
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

function ratioForSize(deckState: DeckBuilderState): string {
  if (deckState.cardSize === 'poker') return '63mm x 88mm';
  if (deckState.cardSize === 'tarot') return '70mm x 120mm';
  return `${deckState.customWidthMm}mm x ${deckState.customHeightMm}mm`;
}

function parseDeckTextInput(raw: string): string[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function downloadDataUrlFile(filename: string, dataUrl: string): void {
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = filename;
  anchor.click();
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
        ? Math.max(5_000, Math.min(120_000, Math.round(raw.timeoutMs)))
        : DEFAULT_IMAGE_GENERATOR_CONFIG.timeoutMs,
    maxRetries:
      typeof raw?.maxRetries === 'number' && Number.isFinite(raw.maxRetries)
        ? Math.max(0, Math.min(6, Math.round(raw.maxRetries)))
        : DEFAULT_IMAGE_GENERATOR_CONFIG.maxRetries,
    batchDelayMs:
      typeof raw?.batchDelayMs === 'number' && Number.isFinite(raw.batchDelayMs)
        ? Math.max(0, Math.min(5_000, Math.round(raw.batchDelayMs)))
        : DEFAULT_IMAGE_GENERATOR_CONFIG.batchDelayMs
  };
}

function normalizePromptState(raw: Partial<PromptGeneratorState> | undefined): PromptGeneratorState {
  return {
    themeId: raw?.themeId || DEFAULT_PROMPT_STATE.themeId,
    cardType: raw?.cardType === 'front' || raw?.cardType === 'back' ? raw.cardType : DEFAULT_PROMPT_STATE.cardType,
    version:
      raw?.version === 'default' || raw?.version === 'adult' || raw?.version === 'both'
        ? raw.version
        : DEFAULT_PROMPT_STATE.version,
    styleIntensity:
      raw?.styleIntensity === 'clean' || raw?.styleIntensity === 'colourful' || raw?.styleIntensity === 'crazy'
        ? raw.styleIntensity
        : DEFAULT_PROMPT_STATE.styleIntensity,
    tone:
      raw?.tone === 'fun' ||
      raw?.tone === 'dark' ||
      raw?.tone === 'silly' ||
      raw?.tone === 'premium' ||
      raw?.tone === 'party' ||
      raw?.tone === 'chaotic'
        ? raw.tone
        : DEFAULT_PROMPT_STATE.tone,
    // Keep card image dimensions constant for game-asset consistency.
    resolution: STANDARD_GAME_ASSET_SIZE,
    strictMode: typeof raw?.strictMode === 'boolean' ? raw.strictMode : DEFAULT_PROMPT_STATE.strictMode
  };
}

function normalizeGeneratedArtwork(raw: unknown): GeneratedArtwork[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const candidate = entry as Partial<GeneratedArtwork> & { title?: string; imageDataUrl?: string };
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
        createdAt:
          typeof candidate.createdAt === 'string'
            ? candidate.createdAt
            : new Date(typeof candidate.createdAt === 'number' ? candidate.createdAt : Date.now()).toISOString()
      }
    ];
  });
}

function App(): JSX.Element {
  const [activeTab, setActiveTab] = useState(
    'prompt-generator' as
      | 'prompt-generator'
      | 'card-text-generator'
      | 'deck-builder'
      | 'theme-editor'
      | 'round-type-editor'
      | 'import-export'
  );
  const [themes, setThemes] = useState<Theme[]>(loadFromStorage(STORAGE_KEYS.themes, DEFAULT_THEMES));
  const [roundTypes, setRoundTypes] = useState<RoundType[]>(
    normalizeRoundTypes(loadFromStorage(STORAGE_KEYS.roundTypes, DEFAULT_ROUND_TYPES))
  );
  const [promptState, setPromptState] = useState<PromptGeneratorState>(
    normalizePromptState(loadFromStorage(STORAGE_KEYS.promptState, DEFAULT_PROMPT_STATE))
  );
  const [generatedPrompts, setGeneratedPrompts] = useState<GeneratedPrompt[]>(
    loadFromStorage(STORAGE_KEYS.generatedPrompts, [])
  );
  const [cardTextState, setCardTextState] = useState<CardTextGeneratorState>(
    loadFromStorage(STORAGE_KEYS.cardTextState, DEFAULT_CARD_TEXT_STATE)
  );
  const [generatedCardTexts, setGeneratedCardTexts] = useState<GeneratedCardText[]>(
    loadFromStorage(STORAGE_KEYS.generatedCardTexts, [])
  );
  const [deckState, setDeckState] = useState<DeckBuilderState>(
    loadFromStorage(STORAGE_KEYS.deckState, DEFAULT_DECK_STATE)
  );
  const [imageGeneratorConfig, setImageGeneratorConfig] = useState<ImageGeneratorConfig>(
    normalizeImageGeneratorConfig(loadFromStorage(STORAGE_KEYS.imageGeneratorConfig, DEFAULT_IMAGE_GENERATOR_CONFIG))
  );
  const [generatedArtwork, setGeneratedArtwork] = useState<GeneratedArtwork[]>(
    normalizeGeneratedArtwork(loadFromStorage(STORAGE_KEYS.generatedArtwork, []))
  );
  const [generatingPromptIds, setGeneratingPromptIds] = useState<string[]>([]);
  const [isGeneratingAllArtwork, setIsGeneratingAllArtwork] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ completed: 0, total: 0 });
  const [batchCancelRequested, setBatchCancelRequested] = useState(false);
  const [imageGenerationError, setImageGenerationError] = useState('');
  const [copiedMessage, setCopiedMessage] = useState('');
  const batchCancelRequestedRef = useRef(false);

  const currentTheme = useMemo(
    () => themes.find((theme) => theme.id === promptState.themeId) ?? themes[0],
    [themes, promptState.themeId]
  );
  const selectedTextTheme = useMemo(
    () => themes.find((theme) => theme.id === cardTextState.themeId) ?? themes[0],
    [themes, cardTextState.themeId]
  );
  const selectedRoundType = useMemo(
    () => roundTypes.find((roundType) => roundType.id === cardTextState.roundTypeId) ?? roundTypes[0],
    [roundTypes, cardTextState.roundTypeId]
  );
  const artworkByPromptId = useMemo(
    () => new Map(generatedArtwork.map((artwork) => [artwork.promptId, artwork])),
    [generatedArtwork]
  );

  useEffect(() => saveToStorage(STORAGE_KEYS.themes, themes), [themes]);
  useEffect(() => saveToStorage(STORAGE_KEYS.roundTypes, normalizeRoundTypes(roundTypes)), [roundTypes]);
  useEffect(() => saveToStorage(STORAGE_KEYS.promptState, normalizePromptState(promptState)), [promptState]);
  useEffect(() => saveToStorage(STORAGE_KEYS.generatedPrompts, generatedPrompts), [generatedPrompts]);
  useEffect(() => saveToStorage(STORAGE_KEYS.imageGeneratorConfig, imageGeneratorConfig), [imageGeneratorConfig]);
  useEffect(() => saveToStorage(STORAGE_KEYS.generatedArtwork, generatedArtwork), [generatedArtwork]);
  useEffect(() => saveToStorage(STORAGE_KEYS.cardTextState, cardTextState), [cardTextState]);
  useEffect(() => saveToStorage(STORAGE_KEYS.generatedCardTexts, generatedCardTexts), [generatedCardTexts]);
  useEffect(() => saveToStorage(STORAGE_KEYS.deckState, deckState), [deckState]);

  useEffect(() => {
    if (!themes.some((theme) => theme.id === promptState.themeId)) {
      setPromptState((prev) => ({ ...prev, themeId: themes[0]?.id ?? DEFAULT_THEMES[0].id }));
    }
    if (!themes.some((theme) => theme.id === cardTextState.themeId)) {
      setCardTextState((prev) => ({ ...prev, themeId: themes[0]?.id ?? DEFAULT_THEMES[0].id }));
    }
    if (!themes.some((theme) => theme.id === deckState.themeId)) {
      setDeckState((prev) => ({ ...prev, themeId: themes[0]?.id ?? DEFAULT_THEMES[0].id }));
    }
  }, [themes, promptState.themeId, cardTextState.themeId, deckState.themeId]);

  useEffect(() => {
    if (!roundTypes.some((roundType) => roundType.id === cardTextState.roundTypeId)) {
      setCardTextState((prev) => ({ ...prev, roundTypeId: roundTypes[0]?.id ?? DEFAULT_ROUND_TYPES[0].id }));
    }
  }, [roundTypes, cardTextState.roundTypeId]);

  useEffect(() => {
    if (!copiedMessage) return;
    const timeout = window.setTimeout(() => setCopiedMessage(''), 2200);
    return () => window.clearTimeout(timeout);
  }, [copiedMessage]);

  function onGeneratePrompts(): void {
    if (!currentTheme) return;
    const prompts = generateArtworkPrompts(promptState, currentTheme);
    const promptIds = new Set(prompts.map((prompt) => prompt.id));
    setGeneratedPrompts(prompts);
    setGeneratedArtwork((prev) => prev.filter((artwork) => promptIds.has(artwork.promptId)));
  }

  function getImageGenerationErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) return error.message;
    return 'Unknown image generation error.';
  }

  async function onGenerateArtworkForPrompt(prompt: GeneratedPrompt): Promise<void> {
    setImageGenerationError('');
    setGeneratingPromptIds((prev) => (prev.includes(prompt.id) ? prev : [...prev, prompt.id]));

    try {
      const artwork = await generateArtworkImage(prompt, imageGeneratorConfig, promptState);
      setGeneratedArtwork((prev) => [artwork, ...prev.filter((entry) => entry.promptId !== prompt.id)]);
    } catch (error) {
      setImageGenerationError(`Failed for "${prompt.title}": ${getImageGenerationErrorMessage(error)}`);
    } finally {
      setGeneratingPromptIds((prev) => prev.filter((id) => id !== prompt.id));
    }
  }

  function onDeleteArtworkForPrompt(promptId: string): void {
    setGeneratedArtwork((prev) => prev.filter((entry) => entry.promptId !== promptId));
  }

  async function onGenerateAllArtwork(): Promise<void> {
    if (generatedPrompts.length === 0) {
      setImageGenerationError('Generate prompts first.');
      return;
    }

    setImageGenerationError('');
    batchCancelRequestedRef.current = false;
    setBatchCancelRequested(false);
    setIsGeneratingAllArtwork(true);
    setBatchProgress({ completed: 0, total: generatedPrompts.length });

    for (let index = 0; index < generatedPrompts.length; index += 1) {
      if (batchCancelRequestedRef.current) {
        setImageGenerationError('Batch render canceled.');
        break;
      }
      const prompt = generatedPrompts[index];
      // eslint-disable-next-line no-await-in-loop
      await onGenerateArtworkForPrompt(prompt);
      setBatchProgress({ completed: index + 1, total: generatedPrompts.length });
      if (index < generatedPrompts.length - 1) {
        // Small delay to reduce provider rate-limit bursts in batch mode.
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
  function clearGeneratedArtwork(): void {
    setGeneratedArtwork([]);
    setImageGenerationError('');
  }

  function applyArtworkToDeckSide(artwork: GeneratedArtwork, side: 'front' | 'back'): void {
    setDeckState((prev) =>
      side === 'front' ? { ...prev, frontDesignDataUrl: artwork.dataUrl } : { ...prev, backDesignDataUrl: artwork.dataUrl }
    );
    setCopiedMessage(`${side === 'front' ? 'Front' : 'Back'} design updated from rendered artwork.`);
  }

  function onDownloadArtwork(prompt: GeneratedPrompt): void {
    const artwork = artworkByPromptId.get(prompt.id);
    if (!artwork) return;
    const safeName = prompt.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    downloadDataUrlFile(`${safeName || 'rendered-art'}.png`, artwork.dataUrl);
  }

  function onGenerateCardTexts(): void {
    if (!selectedTextTheme || !selectedRoundType) return;
    const generated = generateCardTexts(cardTextState, selectedRoundType, selectedTextTheme);
    setGeneratedCardTexts(generated);
    setDeckState((prev) => ({ ...prev, textInput: generated.map((card) => card.text).join('\n') }));
  }

  async function onCopyPrompts(): Promise<void> {
    await copyToClipboard(promptsToText(generatedPrompts));
    setCopiedMessage('Prompt output copied.');
  }

  async function onCopyCardTexts(): Promise<void> {
    await copyToClipboard(generatedCardTexts.map((card) => card.text).join('\n'));
    setCopiedMessage('Card text copied.');
  }

  function onDownloadPromptText(): void {
    downloadTextFile('pants-on-fire-prompts.txt', promptsToText(generatedPrompts));
  }

  function onDownloadPromptJson(): void {
    downloadJsonFile('pants-on-fire-prompts.json', generatedPrompts);
  }

  function onDownloadCardTextCsv(): void {
    downloadTextFile('pants-on-fire-card-texts.csv', cardTextsToCsv(generatedCardTexts));
  }

  function onDownloadCardTextJson(): void {
    downloadJsonFile('pants-on-fire-card-texts.json', generatedCardTexts);
  }

  async function onUploadDesign(which: 'front' | 'back', file: File | null): Promise<void> {
    if (!file) return;
    const dataUrl = await readDataUrl(file);
    setDeckState((prev) =>
      which === 'front' ? { ...prev, frontDesignDataUrl: dataUrl } : { ...prev, backDesignDataUrl: dataUrl }
    );
  }

  async function onImportDeckText(file: File | null): Promise<void> {
    if (!file) return;
    const content = await readTextFile(file);
    const filename = file.name.toLowerCase();
    let lines: string[] = [];
    if (filename.endsWith('.csv')) lines = parseCardTextCsv(content);
    else if (filename.endsWith('.json')) lines = parseCardTextJson(content);
    else lines = parseDeckTextInput(content);
    setDeckState((prev) => ({ ...prev, textInput: lines.join('\n') }));
  }

  function onExportFullPdf(): void {
    void exportDeckPdf(deckState.deckName, parseDeckTextInput(deckState.textInput), true, {
      cardsPerPage: deckState.cardsPerPage,
      frontDesignDataUrl: deckState.frontDesignDataUrl,
      backDesignDataUrl: deckState.backDesignDataUrl,
      textStyle: deckState.textStyle,
      bleed: deckState.bleed,
      bleedSize: deckState.bleedSize,
      cropMarks: deckState.cropMarks,
      safeZones: deckState.safeZones,
      bleedGuides: deckState.bleedGuides
    });
  }

  function onExportFrontPdf(): void {
    void exportDeckPdf(`${deckState.deckName}-front`, parseDeckTextInput(deckState.textInput), false, {
      cardsPerPage: deckState.cardsPerPage,
      frontDesignDataUrl: deckState.frontDesignDataUrl,
      backDesignDataUrl: deckState.backDesignDataUrl,
      textStyle: deckState.textStyle,
      bleed: deckState.bleed,
      bleedSize: deckState.bleedSize,
      cropMarks: deckState.cropMarks,
      safeZones: deckState.safeZones,
      bleedGuides: deckState.bleedGuides
    });
  }

  function onExportBackPdf(): void {
    void exportDeckPdf(`${deckState.deckName}-back`, parseDeckTextInput(deckState.textInput), true, {
      cardsPerPage: deckState.cardsPerPage,
      frontDesignDataUrl: deckState.frontDesignDataUrl,
      backDesignDataUrl: deckState.backDesignDataUrl,
      textStyle: deckState.textStyle,
      bleed: deckState.bleed,
      bleedSize: deckState.bleedSize,
      cropMarks: deckState.cropMarks,
      safeZones: deckState.safeZones,
      bleedGuides: deckState.bleedGuides
    });
  }

  async function onExportPngLike(): Promise<void> {
    await exportPngCardsZip(deckState.deckName, parseDeckTextInput(deckState.textInput), {
      textStyle: deckState.textStyle,
      frontDesignDataUrl: deckState.frontDesignDataUrl,
      backDesignDataUrl: deckState.backDesignDataUrl
    });
  }

  async function onExportDeckZip(): Promise<void> {
    await exportDeckZip(
      deckState.deckName,
      deckState.frontDesignDataUrl,
      deckState.backDesignDataUrl,
      parseDeckTextInput(deckState.textInput),
      deckState.textStyle
    );
  }

  function updateTheme(index: number, value: Partial<Theme>): void {
    setThemes((prev) => prev.map((theme, idx) => (idx === index ? { ...theme, ...value } : theme)));
  }

  function addTheme(): void {
    setThemes((prev) => [
      ...prev,
      {
        id: `theme-${Date.now()}`,
        name: 'New Theme',
        palette: ['#ff00ff', '#00ffaa', '#111111'],
        motifs: ['motif one', 'motif two'],
        borderMotifs: ['border motif one'],
        avoid: ['undesired element']
      }
    ]);
  }

  function deleteTheme(index: number): void {
    if (themes.length <= 1) return;
    setThemes((prev) => prev.filter((_, idx) => idx !== index));
  }

  function updateRoundType(index: number, value: Partial<RoundType>): void {
    setRoundTypes((prev) =>
      normalizeRoundTypes(prev.map((roundType, idx) => (idx === index ? { ...roundType, ...value } : roundType)))
    );
  }

  function exportAllState(): void {
    const bundle: AppExportBundle = createAppExportBundle({
      themes,
      roundTypes,
      promptState,
      generatedPrompts,
      imageGeneratorConfig,
      generatedArtwork,
      cardTextState,
      generatedCardTexts,
      deckState
    });
    downloadJsonFile('pants-on-fire-full-export.json', bundle);
  }

  async function importAllState(file: File | null): Promise<void> {
    if (!file) return;
    const parsed = JSON.parse(await readTextFile(file)) as Partial<AppExportBundle>;
    if (parsed.themes?.length) setThemes(parsed.themes);
    if (parsed.roundTypes?.length) {
      const filtered = parsed.roundTypes.filter((roundType) => ROUND_TYPE_ID_SET.has(roundType.id));
      if (filtered.length > 0) setRoundTypes(normalizeRoundTypes(filtered as RoundType[]));
    }
    if (parsed.promptState) setPromptState(normalizePromptState(parsed.promptState));
    if (parsed.generatedPrompts) setGeneratedPrompts(parsed.generatedPrompts);
    if (parsed.imageGeneratorConfig) setImageGeneratorConfig(normalizeImageGeneratorConfig(parsed.imageGeneratorConfig));
    if (parsed.generatedArtwork) setGeneratedArtwork(normalizeGeneratedArtwork(parsed.generatedArtwork));
    if (parsed.cardTextState) setCardTextState(parsed.cardTextState);
    if (parsed.generatedCardTexts) setGeneratedCardTexts(parsed.generatedCardTexts);
    if (parsed.deckState) setDeckState(parsed.deckState);
  }

  const tabButtonClass =
    'sticker px-3 py-2 text-sm sm:text-base font-extrabold uppercase tracking-wide bg-fuchsia-500 text-black hover:bg-lime-300 transition';

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
            <span className="warning-label">NO SIDE-BY-SIDE NONSENSE</span>
          </div>
        </div>
      </header>

      <nav className="mt-4 flex flex-wrap gap-2">
        <button className={tabButtonClass} onClick={() => setActiveTab('prompt-generator')}>
          Prompt Generator
        </button>
        <button className={tabButtonClass} onClick={() => setActiveTab('card-text-generator')}>
          Card Text Generator
        </button>
        <button className={tabButtonClass} onClick={() => setActiveTab('deck-builder')}>
          Deck Builder
        </button>
        <button className={tabButtonClass} onClick={() => setActiveTab('theme-editor')}>
          Theme Editor
        </button>
        <button className={tabButtonClass} onClick={() => setActiveTab('round-type-editor')}>
          Round Type Editor
        </button>
        <button className={tabButtonClass} onClick={() => setActiveTab('import-export')}>
          Import / Export
        </button>
      </nav>

      {copiedMessage && (
        <div className="mt-4 sticker bg-lime-300 text-black px-3 py-2 font-extrabold inline-block">{copiedMessage}</div>
      )}

      <main className="mt-5 space-y-5">
        {activeTab === 'prompt-generator' && (
          <section className="neon-panel p-4 md:p-6 bg-purple-900/65">
            <h2 className="text-xl md:text-2xl font-black text-lime-300">1. Prompt Generator</h2>
            <p className="text-white/90 mt-1">
              Generates strict game-ready card art prompts with hard one-card enforcement.
            </p>
            <p className="text-white/80 mt-2 text-sm">
              Generate prompts first, then use the built-in image renderer below (or export prompts for external tools).
            </p>

            <div className="grid gap-4 mt-4 md:grid-cols-2 lg:grid-cols-3">
              <label className="flex flex-col gap-1 font-bold">
                Theme
                <select
                  className="sticker px-3 py-2 bg-black text-lime-300"
                  value={promptState.themeId}
                  onChange={(event) => setPromptState((prev) => ({ ...prev, themeId: event.target.value }))}
                >
                  {themes.map((theme) => (
                    <option key={theme.id} value={theme.id}>
                      {theme.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 font-bold">
                Card Type
                <select
                  className="sticker px-3 py-2 bg-black text-lime-300"
                  value={promptState.cardType}
                  onChange={(event) =>
                    setPromptState((prev) => ({
                      ...prev,
                      cardType: event.target.value as PromptGeneratorState['cardType']
                    }))
                  }
                >
                  <option value="back">Back</option>
                  <option value="front">Front</option>
                </select>
              </label>

              <label className="flex flex-col gap-1 font-bold">
                Version
                <select
                  className="sticker px-3 py-2 bg-black text-lime-300"
                  value={promptState.version}
                  onChange={(event) =>
                    setPromptState((prev) => ({
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
                  value={promptState.styleIntensity}
                  onChange={(event) =>
                    setPromptState((prev) => ({
                      ...prev,
                      styleIntensity: event.target.value as PromptGeneratorState['styleIntensity']
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
                  value={promptState.tone}
                  onChange={(event) =>
                    setPromptState((prev) => ({ ...prev, tone: event.target.value as PromptGeneratorState['tone'] }))
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

              <label className="flex flex-col gap-1 font-bold">
                Render Size (Locked Standard)
                <input
                  className="sticker px-3 py-2 bg-black text-lime-300"
                  value={STANDARD_GAME_ASSET_SIZE}
                  readOnly
                  disabled
                />
              </label>
            </div>

            <label className="mt-4 flex items-center gap-3 font-bold">
              <input
                type="checkbox"
                checked={promptState.strictMode}
                onChange={(event) => setPromptState((prev) => ({ ...prev, strictMode: event.target.checked }))}
              />
              Strict Mode (ON by default)
            </label>

            <div className="mt-4 flex flex-wrap gap-3">
              <button className="sticker bg-lime-300 text-black px-4 py-2 font-black" onClick={onGeneratePrompts}>
                Generate Prompts
              </button>
              <button className="sticker bg-pink-300 text-black px-4 py-2 font-black" onClick={onCopyPrompts}>
                Copy
              </button>
              <button className="sticker bg-cyan-300 text-black px-4 py-2 font-black" onClick={onDownloadPromptText}>
                Download .txt
              </button>
              <button className="sticker bg-orange-300 text-black px-4 py-2 font-black" onClick={onDownloadPromptJson}>
                Export JSON
              </button>
            </div>

            <div className="mt-4 neon-panel p-3 bg-black/40">
              <h3 className="font-black text-orange-300">Always-On Negative Prompt</h3>
              <p className="text-sm text-white mt-1">{getNegativePrompt()}</p>
            </div>

            <div className="mt-4 neon-panel p-4 bg-black/50">
              <h3 className="font-black text-orange-300">Image Generation (Built In)</h3>
              <p className="text-sm text-white/90 mt-1">
                Render prompt outputs directly into card art. Your API key stays local in browser storage.
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

              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  className="sticker bg-lime-300 text-black px-4 py-2 font-black disabled:opacity-50"
                  disabled={generatedPrompts.length === 0 || isGeneratingAllArtwork}
                  onClick={() => void onGenerateAllArtwork()}
                >
                  {isGeneratingAllArtwork ? 'Rendering all...' : 'Render All Prompts'}
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
                  onClick={clearGeneratedArtwork}
                >
                  Clear Rendered Art
                </button>
              </div>
              {isGeneratingAllArtwork && (
                <div className="mt-3">
                  <div className="text-xs text-white/90 mb-1">
                    Batch progress: {batchProgress.completed}/{batchProgress.total}
                  </div>
                  <Progress
                    value={
                      batchProgress.total > 0
                        ? (batchProgress.completed / batchProgress.total) * 100
                        : 0
                    }
                  />
                </div>
              )}

              {imageGenerationError && (
                <div className="mt-3 sticker bg-red-300 text-black p-3 font-bold">{imageGenerationError}</div>
              )}
            </div>

            <div className="mt-4 space-y-3">
              {generatedPrompts.length === 0 && (
                <div className="sticker bg-black/50 p-4 text-white">No generated prompts yet.</div>
              )}
              {generatedPrompts.map((prompt) => (
                <article key={prompt.id} className="neon-panel p-3 bg-black/50">
                  <h4 className="font-black text-lime-300">{prompt.title}</h4>
                  <pre className="mt-2 text-xs md:text-sm whitespace-pre-wrap break-words text-white">{prompt.content}</pre>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      className="sticker bg-lime-300 text-black px-3 py-1 font-black disabled:opacity-50"
                      disabled={generatingPromptIds.includes(prompt.id)}
                      onClick={() => void onGenerateArtworkForPrompt(prompt)}
                    >
                      {generatingPromptIds.includes(prompt.id)
                        ? 'Rendering...'
                        : artworkByPromptId.get(prompt.id)
                          ? 'Regenerate'
                          : 'Render Image'}
                    </button>
                    {artworkByPromptId.get(prompt.id) && (
                      <>
                        <button
                          className="sticker bg-cyan-300 text-black px-3 py-1 font-black"
                          onClick={() => applyArtworkToDeckSide(artworkByPromptId.get(prompt.id) as GeneratedArtwork, 'front')}
                        >
                          Apply as Front Design
                        </button>
                        <button
                          className="sticker bg-orange-300 text-black px-3 py-1 font-black"
                          onClick={() => applyArtworkToDeckSide(artworkByPromptId.get(prompt.id) as GeneratedArtwork, 'back')}
                        >
                          Apply as Back Design
                        </button>
                        <button
                          className="sticker bg-red-300 text-black px-3 py-1 font-black"
                          onClick={() => onDeleteArtworkForPrompt(prompt.id)}
                        >
                          Delete Image
                        </button>
                        <button
                          className="sticker bg-violet-300 text-black px-3 py-1 font-black"
                          onClick={() => onDownloadArtwork(prompt)}
                        >
                          Download Image
                        </button>
                      </>
                    )}
                  </div>
                  {artworkByPromptId.get(prompt.id) && (
                    <div className="mt-3">
                      <img
                        src={(artworkByPromptId.get(prompt.id) as GeneratedArtwork).dataUrl}
                        alt={`${prompt.title} rendered artwork`}
                        className="w-full max-w-xs rounded border border-white/20"
                      />
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'card-text-generator' && (
          <section className="neon-panel p-4 md:p-6 bg-fuchsia-900/65">
            <h2 className="text-xl md:text-2xl font-black text-lime-300">4. Card Text Generator</h2>
            <p className="text-white/90 mt-1">Every output is constrained by selected round type promptStyle.</p>

            <div className="grid gap-4 mt-4 md:grid-cols-2 lg:grid-cols-3">
              <label className="flex flex-col gap-1 font-bold">
                Version
                <select
                  className="sticker px-3 py-2 bg-black text-lime-300"
                  value={cardTextState.version}
                  onChange={(event) =>
                    setCardTextState((prev) => ({
                      ...prev,
                      version: event.target.value as CardTextGeneratorState['version']
                    }))
                  }
                >
                  <option value="default">Default</option>
                  <option value="adult">Adult 18+</option>
                </select>
              </label>

              <label className="flex flex-col gap-1 font-bold">
                Theme
                <select
                  className="sticker px-3 py-2 bg-black text-lime-300"
                  value={cardTextState.themeId}
                  onChange={(event) => setCardTextState((prev) => ({ ...prev, themeId: event.target.value }))}
                >
                  {themes.map((theme) => (
                    <option key={theme.id} value={theme.id}>
                      {theme.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 font-bold">
                Round Type (Required)
                <select
                  className="sticker px-3 py-2 bg-black text-lime-300"
                  value={cardTextState.roundTypeId}
                  onChange={(event) => setCardTextState((prev) => ({ ...prev, roundTypeId: event.target.value }))}
                >
                  {roundTypes.map((roundType) => (
                    <option key={roundType.id} value={roundType.id}>
                      {roundType.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 font-bold">
                Number of cards
                <input
                  className="sticker px-3 py-2 bg-black text-lime-300"
                  type="number"
                  min={1}
                  max={500}
                  value={cardTextState.count}
                  onChange={(event) => {
                    const nextValue = Number(event.target.value);
                    setCardTextState((prev) => ({
                      ...prev,
                      count: Number.isFinite(nextValue) ? Math.max(1, Math.min(500, nextValue)) : 1
                    }));
                  }}
                />
              </label>

              <label className="flex flex-col gap-1 font-bold">
                Tone
                <select
                  className="sticker px-3 py-2 bg-black text-lime-300"
                  value={cardTextState.tone}
                  onChange={(event) => setCardTextState((prev) => ({ ...prev, tone: event.target.value as CardTextGeneratorState['tone'] }))}
                >
                  <option value="silly">Silly</option>
                  <option value="sarcastic">Sarcastic</option>
                  <option value="dark humour">Dark humour</option>
                  <option value="british humour">British humour</option>
                  <option value="party game">Party game</option>
                  <option value="chaotic">Chaotic</option>
                </select>
              </label>
            </div>

            <div className="mt-4 neon-panel p-3 bg-black/40">
              <h3 className="font-black text-orange-300">Round Type Structure Lock</h3>
              <p className="text-white text-sm mt-1">{selectedRoundType?.description}</p>
              <p className="text-white/90 text-sm mt-1">
                <strong>Card Type:</strong> {selectedRoundType?.cardType}
                {selectedRoundType?.onlineOnly ? ' (online-only)' : ' (offline/pass-the-phone ready)'}
              </p>
              <p className="text-white/90 text-sm mt-1">
                <strong>Prompt Style:</strong> {selectedRoundType?.promptStyle}
              </p>
              <ul className="mt-2 list-disc pl-5 text-xs text-white">
                {selectedRoundType?.rules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button className="sticker bg-lime-300 text-black px-4 py-2 font-black" onClick={onGenerateCardTexts}>
                Generate Card Text
              </button>
              <button className="sticker bg-pink-300 text-black px-4 py-2 font-black" onClick={onCopyCardTexts}>
                Copy
              </button>
              <button className="sticker bg-cyan-300 text-black px-4 py-2 font-black" onClick={onDownloadCardTextCsv}>
                CSV
              </button>
              <button className="sticker bg-orange-300 text-black px-4 py-2 font-black" onClick={onDownloadCardTextJson}>
                JSON
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {generatedCardTexts.length === 0 && (
                <div className="sticker bg-black/50 p-4 text-white">No generated card text yet.</div>
              )}
              {generatedCardTexts.map((card) => (
                <article key={card.id} className="neon-panel p-3 bg-black/50">
                  <h4 className="font-black text-lime-300">{selectedRoundType?.name}</h4>
                  <p className="text-white mt-1">{card.text}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'deck-builder' && (
          <section className="neon-panel p-4 md:p-6 bg-indigo-900/65">
            <h2 className="text-xl md:text-2xl font-black text-lime-300">5. Printable Deck Builder</h2>
            <p className="text-white/90 mt-1">Build print-ready decks while preserving ratio and safe text zones.</p>
            <div className="grid gap-4 mt-4 md:grid-cols-2 lg:grid-cols-3">
              <label className="flex flex-col gap-1 font-bold">
                Deck name
                <input
                  className="sticker px-3 py-2 bg-black text-lime-300"
                  value={deckState.deckName}
                  onChange={(event) => setDeckState((prev) => ({ ...prev, deckName: event.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1 font-bold">
                Version
                <select
                  className="sticker px-3 py-2 bg-black text-lime-300"
                  value={deckState.version}
                  onChange={(event) => setDeckState((prev) => ({ ...prev, version: event.target.value as DeckBuilderState['version'] }))}
                >
                  <option value="default">Default</option>
                  <option value="adult">Adult</option>
                  <option value="mixed">Mixed</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 font-bold">
                Theme
                <select
                  className="sticker px-3 py-2 bg-black text-lime-300"
                  value={deckState.themeId}
                  onChange={(event) => setDeckState((prev) => ({ ...prev, themeId: event.target.value }))}
                >
                  {themes.map((theme) => (
                    <option key={theme.id} value={theme.id}>
                      {theme.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 font-bold">
                Card size
                <select
                  className="sticker px-3 py-2 bg-black text-lime-300"
                  value={deckState.cardSize}
                  onChange={(event) => setDeckState((prev) => ({ ...prev, cardSize: event.target.value as DeckBuilderState['cardSize'] }))}
                >
                  <option value="poker">Poker</option>
                  <option value="tarot">Tarot</option>
                  <option value="custom">Custom</option>
                </select>
              </label>
              {deckState.cardSize === 'custom' && (
                <>
                  <label className="flex flex-col gap-1 font-bold">
                    Custom width (mm)
                    <input
                      className="sticker px-3 py-2 bg-black text-lime-300"
                      type="number"
                      min={10}
                      value={deckState.customWidthMm}
                      onChange={(event) => setDeckState((prev) => ({ ...prev, customWidthMm: Number(event.target.value) || 63 }))}
                    />
                  </label>
                  <label className="flex flex-col gap-1 font-bold">
                    Custom height (mm)
                    <input
                      className="sticker px-3 py-2 bg-black text-lime-300"
                      type="number"
                      min={10}
                      value={deckState.customHeightMm}
                      onChange={(event) => setDeckState((prev) => ({ ...prev, customHeightMm: Number(event.target.value) || 88 }))}
                    />
                  </label>
                </>
              )}
              <label className="flex flex-col gap-1 font-bold">
                Cards per page
                <select
                  className="sticker px-3 py-2 bg-black text-lime-300"
                  value={deckState.cardsPerPage}
                  onChange={(event) => setDeckState((prev) => ({ ...prev, cardsPerPage: Number(event.target.value) as DeckBuilderState['cardsPerPage'] }))}
                >
                  <option value={8}>8</option>
                  <option value={9}>9</option>
                  <option value={10}>10</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 font-bold">
                Bleed
                <select
                  className="sticker px-3 py-2 bg-black text-lime-300"
                  value={String(deckState.bleed)}
                  onChange={(event) => setDeckState((prev) => ({ ...prev, bleed: event.target.value === 'true' }))}
                >
                  <option value="true">On</option>
                  <option value="false">Off</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 font-bold">
                Bleed size
                <select
                  className="sticker px-3 py-2 bg-black text-lime-300"
                  value={deckState.bleedSize}
                  onChange={(event) => setDeckState((prev) => ({ ...prev, bleedSize: event.target.value as DeckBuilderState['bleedSize'] }))}
                >
                  <option value="3mm">3mm</option>
                  <option value="5mm">5mm</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 font-bold">
                Crop marks
                <select
                  className="sticker px-3 py-2 bg-black text-lime-300"
                  value={String(deckState.cropMarks)}
                  onChange={(event) => setDeckState((prev) => ({ ...prev, cropMarks: event.target.value === 'true' }))}
                >
                  <option value="true">On</option>
                  <option value="false">Off</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 font-bold">
                Text style
                <select
                  className="sticker px-3 py-2 bg-black text-lime-300"
                  value={deckState.textStyle}
                  onChange={(event) => setDeckState((prev) => ({ ...prev, textStyle: event.target.value as DeckBuilderState['textStyle'] }))}
                >
                  <option value="white-black-outline">White w/ black outline</option>
                  <option value="red-white-outline">Red w/ white outline</option>
                </select>
              </label>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <label className="flex flex-col gap-1 font-bold">
                Upload front design
                <input
                  className="sticker px-3 py-2 bg-black text-lime-300"
                  type="file"
                  accept="image/*"
                  onChange={(event) => onUploadDesign('front', event.target.files?.[0] ?? null)}
                />
              </label>
              <label className="flex flex-col gap-1 font-bold">
                Upload back design
                <input
                  className="sticker px-3 py-2 bg-black text-lime-300"
                  type="file"
                  accept="image/*"
                  onChange={(event) => onUploadDesign('back', event.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            <label className="mt-4 block font-bold">
              Import text (Paste / CSV / JSON)
              <textarea
                className="sticker w-full mt-1 min-h-[170px] p-3 bg-black text-lime-300"
                value={deckState.textInput}
                onChange={(event) => setDeckState((prev) => ({ ...prev, textInput: event.target.value }))}
              />
            </label>

            <label className="mt-3 inline-flex items-center gap-2 font-bold mr-4">
              <input
                type="checkbox"
                checked={deckState.safeZones}
                onChange={(event) => setDeckState((prev) => ({ ...prev, safeZones: event.target.checked }))}
              />
              Safe zones
            </label>
            <label className="mt-3 inline-flex items-center gap-2 font-bold">
              <input
                type="checkbox"
                checked={deckState.bleedGuides}
                onChange={(event) => setDeckState((prev) => ({ ...prev, bleedGuides: event.target.checked }))}
              />
              Bleed guides
            </label>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="neon-panel p-3 bg-black/45">
                <h3 className="font-black text-orange-300">Preview Grid</h3>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {parseDeckTextInput(deckState.textInput)
                    .slice(0, deckState.cardsPerPage)
                    .map((text, index) => (
                      <div key={`preview-${index}`} className="card-preview text-xs">
                        <div>
                          <strong>Front</strong>
                          <p>{text}</p>
                        </div>
                      </div>
                    ))}
                </div>
                <p className="text-xs text-white/80 mt-3">Ratio locked at 2.5:3.5 equivalent framing. Size: {ratioForSize(deckState)}.</p>
              </div>
              <div className="neon-panel p-3 bg-black/45">
                <h3 className="font-black text-orange-300">Deck Compliance</h3>
                <ul className="mt-2 list-disc pl-5 text-sm text-white">
                  <li>Maintain ratio and no stretching</li>
                  <li>Front = text / Back = repeated design</li>
                  <li>Safe text zone preserved</li>
                  <li>{deckState.bleed ? `Bleed enabled (${deckState.bleedSize})` : 'Bleed disabled'}</li>
                  <li>{deckState.cropMarks ? 'Crop marks enabled' : 'Crop marks disabled'}</li>
                </ul>
                <label className="mt-3 flex flex-col gap-1 font-bold">
                  Import card text file
                  <input
                    className="sticker px-3 py-2 bg-black text-lime-300"
                    type="file"
                    accept=".csv,.json,.txt"
                    onChange={(event) => onImportDeckText(event.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button className="sticker bg-lime-300 text-black px-4 py-2 font-black" onClick={onExportFullPdf}>
                Full PDF
              </button>
              <button className="sticker bg-pink-300 text-black px-4 py-2 font-black" onClick={onExportFrontPdf}>
                Front PDF
              </button>
              <button className="sticker bg-cyan-300 text-black px-4 py-2 font-black" onClick={onExportBackPdf}>
                Back PDF
              </button>
              <button className="sticker bg-orange-300 text-black px-4 py-2 font-black" onClick={onExportPngLike}>
                PNG cards
              </button>
              <button className="sticker bg-violet-300 text-black px-4 py-2 font-black" onClick={onExportDeckZip}>
                ZIP deck
              </button>
            </div>
          </section>
        )}

        {activeTab === 'theme-editor' && (
          <section className="neon-panel p-4 md:p-6 bg-emerald-900/65">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-lime-300">2. Theme Editor</h2>
                <p className="text-white/90 mt-1">Add, edit, delete themes saved to localStorage.</p>
              </div>
              <button className="sticker bg-lime-300 text-black px-4 py-2 font-black" onClick={addTheme}>
                Add Theme
              </button>
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
                    <label className="flex flex-col gap-1 font-bold">
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
                    <label className="flex flex-col gap-1 font-bold">
                      Motifs (comma separated)
                      <input
                        className="sticker px-3 py-2 bg-black text-lime-300"
                        value={theme.motifs.join(', ')}
                        onChange={(event) =>
                          updateTheme(index, {
                            motifs: event.target.value
                              .split(',')
                              .map((value) => value.trim())
                              .filter(Boolean)
                          })
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-1 font-bold">
                      Border motifs (comma separated)
                      <input
                        className="sticker px-3 py-2 bg-black text-lime-300"
                        value={theme.borderMotifs.join(', ')}
                        onChange={(event) =>
                          updateTheme(index, {
                            borderMotifs: event.target.value
                              .split(',')
                              .map((value) => value.trim())
                              .filter(Boolean)
                          })
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-1 font-bold">
                      Avoid list (comma separated)
                      <input
                        className="sticker px-3 py-2 bg-black text-lime-300"
                        value={theme.avoid.join(', ')}
                        onChange={(event) =>
                          updateTheme(index, {
                            avoid: event.target.value
                              .split(',')
                              .map((value) => value.trim())
                              .filter(Boolean)
                          })
                        }
                      />
                    </label>
                  </div>
                  <button className="mt-3 sticker bg-red-300 text-black px-4 py-2 font-black" onClick={() => deleteTheme(index)}>
                    Delete Theme
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'round-type-editor' && (
          <section className="neon-panel p-4 md:p-6 bg-rose-900/65">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-lime-300">3. Round Type Editor</h2>
                <p className="text-white/90 mt-1">
                  Only defined gameplay round types are editable. No custom gameplay formats.
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {roundTypes.map((roundType, index) => (
                <article key={roundType.id} className="neon-panel p-3 bg-black/45">
                  <div className="grid gap-3 lg:grid-cols-2">
                    <label className="flex flex-col gap-1 font-bold">
                      Name
                      <input
                        className="sticker px-3 py-2 bg-black text-lime-300"
                        value={roundType.name}
                        onChange={(event) => updateRoundType(index, { name: event.target.value })}
                      />
                    </label>
                    <label className="flex flex-col gap-1 font-bold">
                      ID
                      <input
                        className="sticker px-3 py-2 bg-black text-lime-300"
                        value={roundType.id}
                        disabled
                        readOnly
                      />
                    </label>
                    <label className="flex flex-col gap-1 font-bold">
                      Card Type
                      <input
                        className="sticker px-3 py-2 bg-black text-lime-300"
                        value={roundType.cardType}
                        disabled
                        readOnly
                      />
                    </label>
                    <label className="flex flex-col gap-1 font-bold">
                      Online-only
                      <input
                        className="sticker px-3 py-2 bg-black text-lime-300"
                        value={roundType.onlineOnly ? 'Yes' : 'No'}
                        disabled
                        readOnly
                      />
                    </label>
                    <label className="flex flex-col gap-1 font-bold lg:col-span-2">
                      Description
                      <textarea
                        className="sticker px-3 py-2 bg-black text-lime-300"
                        value={roundType.description}
                        onChange={(event) => updateRoundType(index, { description: event.target.value })}
                      />
                    </label>
                    <label className="flex flex-col gap-1 font-bold lg:col-span-2">
                      Prompt Style
                      <textarea
                        className="sticker px-3 py-2 bg-black text-lime-300"
                        value={roundType.promptStyle}
                        onChange={(event) => updateRoundType(index, { promptStyle: event.target.value })}
                      />
                    </label>
                    <label className="flex flex-col gap-1 font-bold">
                      Examples (one per line)
                      <textarea
                        className="sticker px-3 py-2 bg-black text-lime-300"
                        value={roundType.examples.join('\n')}
                        onChange={(event) =>
                          updateRoundType(index, {
                            examples: event.target.value
                              .split('\n')
                              .map((value) => value.trim())
                              .filter(Boolean)
                          })
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-1 font-bold">
                      Rules (one per line)
                      <textarea
                        className="sticker px-3 py-2 bg-black text-lime-300"
                        value={roundType.rules.join('\n')}
                        onChange={(event) =>
                          updateRoundType(index, {
                            rules: event.target.value
                              .split('\n')
                              .map((value) => value.trim())
                              .filter(Boolean)
                          })
                        }
                      />
                    </label>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'import-export' && (
          <section className="neon-panel p-4 md:p-6 bg-violet-900/65">
            <h2 className="text-xl md:text-2xl font-black text-lime-300">6. Import / Export</h2>
            <p className="text-white/90 mt-1">Move complete local-first project data in and out safely.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button className="sticker bg-lime-300 text-black px-4 py-2 font-black" onClick={exportAllState}>
                Export Full App JSON
              </button>
              <label className="sticker bg-cyan-300 text-black px-4 py-2 font-black cursor-pointer">
                Import Full App JSON
                <input
                  type="file"
                  className="hidden"
                  accept=".json"
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    importAllState(event.target.files?.[0] ?? null).catch((error: unknown) => console.error(error))
                  }
                />
              </label>
            </div>
            <div className="mt-4 neon-panel p-4 bg-black/50">
              <h3 className="font-black text-orange-300">Strict Enforcement Summary</h3>
              <ul className="mt-2 list-disc pl-5 text-sm text-white">
                <li>ONE card per image enforced in every prompt output.</li>
                <li>No side-by-side, no mockups, no background scenes, transparent isolation required.</li>
                <li>Card text generation always tied to selected round type structure.</li>
                <li>Deck builder keeps card ratio safe and export-ready for print workflows.</li>
                <li>All editable systems persist to localStorage for local-first operation.</li>
              </ul>
            </div>
          </section>
        )}
      </main>

      <footer className="mt-6 text-xs text-white/75 font-bold pb-5">
        Pants on Fire! Asset Tools - one-card image constraints active.
      </footer>
    </div>
  );
}

export default App;
