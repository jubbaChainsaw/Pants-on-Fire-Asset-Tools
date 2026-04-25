import Papa from 'papaparse';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { AppExportBundle, BleedSize, GeneratedCardText, GeneratedPrompt, TextStyle } from '../types';

const TRANSPARENT_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2l4m0AAAAASUVORK5CYII=';

function downloadBlobFile(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();

  // Delay cleanup so the browser has time to consume the object URL.
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
    anchor.remove();
  }, 1500);
}

export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  downloadBlobFile(filename, blob);
}

export function downloadJsonFile(filename: string, data: unknown): void {
  downloadTextFile(filename, JSON.stringify(data, null, 2));
}

export function promptsToText(prompts: GeneratedPrompt[]): string {
  return prompts
    .map((prompt, index) => `# ${index + 1} ${prompt.title}\n${prompt.content}`)
    .join('\n\n');
}

export function cardTextsToCsv(cardTexts: GeneratedCardText[]): string {
  return Papa.unparse(
    cardTexts.map((item) => ({
      id: item.id,
      text: item.text,
      roundTypeId: item.roundTypeId,
      themeId: item.themeId,
      version: item.version,
      tone: item.tone
    }))
  );
}

export function parseCardTextCsv(content: string): string[] {
  const result = Papa.parse<Record<string, string>>(content, { header: true });
  return result.data
    .map((row) => row.text?.trim())
    .filter((text): text is string => Boolean(text));
}

export function parseCardTextJson(content: string): string[] {
  const parsed = JSON.parse(content) as Array<{ text?: string }>;
  return parsed
    .map((entry) => entry.text?.trim())
    .filter((text): text is string => Boolean(text));
}

interface DeckRenderOptions {
  cardsPerPage: 8 | 9 | 10;
  bleed: boolean;
  bleedSize: BleedSize;
  cropMarks: boolean;
  safeZones: boolean;
  textStyle: TextStyle;
  frontDesignDataUrl: string;
  backDesignDataUrl: string;
}

interface PngExportOptions {
  textStyle: TextStyle;
  frontDesignDataUrl: string;
  backDesignDataUrl: string;
}

function loadImage(dataUrl: string): Promise<HTMLImageElement | null> {
  if (!dataUrl) return Promise.resolve(null);

  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = dataUrl;
  });
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function drawContainedImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const imageRatio = image.width / image.height;
  const targetRatio = width / height;

  let drawWidth = width;
  let drawHeight = height;

  if (imageRatio > targetRatio) {
    drawHeight = width / imageRatio;
  } else {
    drawWidth = height * imageRatio;
  }

  const offsetX = x + (width - drawWidth) / 2;
  const offsetY = y + (height - drawHeight) / 2;
  context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
}

function drawOutlinedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  style: TextStyle
): void {
  const isRed = style === 'red-white-outline';
  context.font = 'bold 32px Arial';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineWidth = 6;
  context.strokeStyle = isRed ? '#ffffff' : '#000000';
  context.fillStyle = isRed ? '#ff2d2d' : '#ffffff';

  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = context.measureText(testLine).width;
    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });

  if (currentLine) lines.push(currentLine);

  const lineHeight = 38;
  const startY = y - ((lines.length - 1) * lineHeight) / 2;

  lines.forEach((line, index) => {
    const lineY = startY + index * lineHeight;
    context.strokeText(line, x, lineY);
    context.fillText(line, x, lineY);
  });
}

async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to generate PNG blob'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
}

async function renderCardPng(
  text: string,
  textStyle: TextStyle,
  designImage: HTMLImageElement | null,
  isBack: boolean
): Promise<Blob> {
  const width = 1000;
  const height = 1400;
  const padding = 36;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas context unavailable');
  }

  context.clearRect(0, 0, width, height);
  drawRoundedRect(context, padding, padding, width - padding * 2, height - padding * 2, 52);
  context.fillStyle = '#171717';
  context.fill();
  context.lineWidth = 10;
  context.strokeStyle = '#ffffff';
  context.stroke();
  context.save();
  drawRoundedRect(context, padding, padding, width - padding * 2, height - padding * 2, 52);
  context.clip();

  if (designImage) {
    drawContainedImage(context, designImage, padding, padding, width - padding * 2, height - padding * 2);
  } else {
    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#56006f');
    gradient.addColorStop(0.5, '#ff2ea2');
    gradient.addColorStop(1, '#ff8c24');
    context.fillStyle = gradient;
    context.fillRect(padding, padding, width - padding * 2, height - padding * 2);
  }

  if (isBack) {
    drawOutlinedText(context, 'Pants on Fire!', width / 2, height / 2 - 80, width - 220, textStyle);
    drawOutlinedText(context, 'Find the Liar', width / 2, height / 2 + 40, width - 220, textStyle);
  } else {
    drawOutlinedText(context, text, width / 2, height / 2, width - 240, textStyle);
  }

  context.restore();
  return canvasToBlob(canvas);
}

export async function exportPngCardsZip(
  deckName: string,
  cardTexts: string[],
  options: PngExportOptions
): Promise<void> {
  const zip = new JSZip();
  const frontsFolder = zip.folder('fronts');
  const backsFolder = zip.folder('backs');

  if (!frontsFolder || !backsFolder) {
    throw new Error('Failed to initialize ZIP folders');
  }

  const [frontImage, backImage] = await Promise.all([
    loadImage(options.frontDesignDataUrl),
    loadImage(options.backDesignDataUrl)
  ]);

  for (let index = 0; index < cardTexts.length; index += 1) {
    const text = cardTexts[index];
    const frontBlob = await renderCardPng(text, options.textStyle, frontImage, false);
    const backBlob = await renderCardPng('', options.textStyle, backImage, true);
    const fileName = `card-${String(index + 1).padStart(3, '0')}.png`;
    frontsFolder.file(fileName, frontBlob);
    backsFolder.file(fileName, backBlob);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlobFile(`${deckName || 'pants-on-fire-deck'}-png-cards.zip`, blob);
}

export async function exportDeckZip(
  deckName: string,
  frontDesignDataUrl: string,
  backDesignDataUrl: string,
  cardTexts: string[],
  textStyle: TextStyle
): Promise<void> {
  const zip = new JSZip();
  const [frontImage, backImage] = await Promise.all([loadImage(frontDesignDataUrl), loadImage(backDesignDataUrl)]);

  if (frontDesignDataUrl) {
    zip.file('front-design.txt', frontDesignDataUrl);
  }

  if (backDesignDataUrl) {
    zip.file('back-design.txt', backDesignDataUrl);
  }

  zip.file('card-texts.csv', Papa.unparse(cardTexts.map((text, index) => ({ index: index + 1, text }))));

  cardTexts.forEach((text, index) => {
    zip.file(`cards/card-${String(index + 1).padStart(3, '0')}.txt`, text);
  });

  const pngFolder = zip.folder('png-cards');
  if (pngFolder) {
    for (let index = 0; index < cardTexts.length; index += 1) {
      const frontBlob = await renderCardPng(cardTexts[index], textStyle, frontImage, false);
      const backBlob = await renderCardPng('', textStyle, backImage, true);
      const basename = `card-${String(index + 1).padStart(3, '0')}`;
      pngFolder.file(`${basename}-front.png`, frontBlob);
      pngFolder.file(`${basename}-back.png`, backBlob);
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlobFile(`${deckName || 'pants-on-fire-deck'}.zip`, blob);
}

export async function exportDeckPdf(
  title: string,
  cardTexts: string[],
  includeBack: boolean,
  options: DeckRenderOptions
): Promise<void> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 10;
  const usableWidth = 190;
  const usableHeight = 277;
  const cols = options.cardsPerPage >= 9 ? 3 : 2;
  const rows = Math.ceil(options.cardsPerPage / cols);
  const cellWidth = usableWidth / cols;
  const cellHeight = usableHeight / rows;
  const bleedMm = options.bleed ? Number(options.bleedSize.replace('mm', '')) : 0;
  const safeInset = options.safeZones ? 5 : 0;

  let cardIndex = 0;
  const [frontImage, backImage] = await Promise.all([loadImage(options.frontDesignDataUrl), loadImage(options.backDesignDataUrl)]);

  async function addImageToPdf(
    image: HTMLImageElement | null,
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<void> {
    if (!image) return;
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 1400;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.fillStyle = '#000000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    drawContainedImage(context, image, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    pdf.addImage(dataUrl, 'PNG', x, y, width, height, undefined, 'FAST');
  }

  async function drawPage(isBackPage: boolean): Promise<void> {
    pdf.setFontSize(10);
    pdf.text(`${title} ${isBackPage ? 'Back' : 'Front'}`, margin, 6);

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        if (cardIndex >= cardTexts.length) return;

        const x = margin + col * cellWidth + bleedMm;
        const y = margin + row * cellHeight + bleedMm;
        const width = cellWidth - 2 - bleedMm * 2;
        const height = cellHeight - 2 - bleedMm * 2;
        pdf.rect(x, y, width, height, 'S');

        if (isBackPage) {
          await addImageToPdf(backImage, x, y, width, height);
          pdf.setFontSize(12);
          pdf.text('Pants on Fire!', x + 4, y + 12);
          pdf.setFontSize(9);
          pdf.text('Find the Liar', x + 4, y + 18);
        } else {
          await addImageToPdf(frontImage, x, y, width, height);
          const wrapped = pdf.splitTextToSize(cardTexts[cardIndex], Math.max(20, width - 8 - safeInset * 2));
          pdf.setFontSize(8);
          const textColor = options.textStyle === 'red-white-outline' ? '#ff2d2d' : '#ffffff';
          pdf.setTextColor(textColor);
          pdf.text(wrapped, x + 4 + safeInset, y + 12 + safeInset);
          pdf.setTextColor('#000000');
          cardIndex += 1;
        }

        if (options.safeZones) {
          pdf.setDrawColor(0, 255, 255);
          pdf.rect(x + safeInset, y + safeInset, width - safeInset * 2, height - safeInset * 2, 'S');
          pdf.setDrawColor(0, 0, 0);
        }
        if (options.cropMarks) {
          pdf.setDrawColor(255, 0, 255);
          const mark = 2;
          pdf.line(x - mark, y, x, y);
          pdf.line(x, y - mark, x, y);
          pdf.line(x + width, y - mark, x + width, y);
          pdf.line(x + width, y, x + width + mark, y);
          pdf.line(x - mark, y + height, x, y + height);
          pdf.line(x, y + height, x, y + height + mark);
          pdf.line(x + width, y + height, x + width + mark, y + height);
          pdf.line(x + width, y + height, x + width, y + height + mark);
          pdf.setDrawColor(0, 0, 0);
        }
      }
    }
  }

  while (cardIndex < cardTexts.length) {
    // eslint-disable-next-line no-await-in-loop
    await drawPage(false);

    if (cardIndex < cardTexts.length) {
      pdf.addPage();
    }
  }

  if (includeBack) {
    pdf.addPage();
    cardIndex = 0;
    while (cardIndex < cardTexts.length) {
      // eslint-disable-next-line no-await-in-loop
      await drawPage(true);
      for (let i = 0; i < options.cardsPerPage; i += 1) {
        cardIndex += 1;
      }
      if (cardIndex < cardTexts.length) {
        pdf.addPage();
      }
    }
  }

  pdf.save(`${title || 'pants-on-fire-deck'}.pdf`);
}

export function copyToClipboard(content: string): Promise<void> {
  return navigator.clipboard.writeText(content);
}

export function createAppExportBundle(bundle: AppExportBundle): AppExportBundle {
  return bundle;
}

export interface RulePromptCardExport {
  id: string;
  roundTypeId: string;
  roundTypeName: string;
  category: string;
  version: 'default' | 'adult';
  hint: string;
  mainPrompt: string;
  liarPrompt: string;
  liarVariant: string;
  bannedWords: string[];
}

export interface DlcTemplateExportOptions {
  packId: string;
  packLabel: string;
  themeId: string;
  generatedArtwork: Array<{ assetPath?: string; dataUrl: string }>;
  rulePromptCards: RulePromptCardExport[];
  roundTypeIdForLogo?: string;
}

function toSlug(value: string): string {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'custom-pack';
}

function toPascalCase(value: string): string {
  return toSlug(value)
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [, mime = 'image/png', payload = ''] = dataUrl.match(/^data:([^;]+);base64,(.*)$/) || [];
  if (!payload) {
    throw new Error('Invalid data URL payload.');
  }
  const binary = window.atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mime });
}

function placeholderPngBlob(): Blob {
  const binary = window.atob(TRANSPARENT_PNG_BASE64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: 'image/png' });
}

function buildPromptRoundDataModule(packId: string, packLabel: string, cards: RulePromptCardExport[]): string {
  const exportName = `${toPascalCase(packId)}PromptRoundData`;
  const promptRows = cards.map((card) => ({
    hint: `${card.roundTypeName}: ${card.hint}`,
    main: card.mainPrompt,
    imposter: card.liarPrompt,
    ...(card.version === 'adult' ? { adultOnly: true } : {})
  }));
  return [
    `export const ${exportName} = {`,
    `  id: '${toSlug(packId)}',`,
    `  name: '${packLabel.replace(/'/g, "\\'")}',`,
    "  emoji: '🔥',",
    '  prompts: [',
    ...promptRows.map((row) => `    ${JSON.stringify(row)},`),
    '  ],',
    '};',
    ''
  ].join('\n');
}

function buildPictureManifest(packId: string, cards: RulePromptCardExport[]): Record<string, unknown> {
  const normalizedPackId = toSlug(packId);
  const entries = cards.map((card, index) => {
    const base = `${card.roundTypeId}-${String(index + 1).padStart(3, '0')}`;
    return {
      entryId: `${normalizedPackId}-${base}`,
      groupId: card.roundTypeId,
      groupName: card.roundTypeName,
      hint: card.hint,
      main: card.mainPrompt,
      imposter: card.liarPrompt,
      mainMediaFile: `${base}-main.png`,
      imposterMediaFile: `${base}-imposter.png`,
      previewLabel: card.category,
      adultOnly: card.version === 'adult'
    };
  });
  return {
    id: `${normalizedPackId}-v1`,
    version: 1,
    label: `${normalizedPackId.toUpperCase()} Picture Pack`,
    category: 'picture',
    releaseChannel: 'dlc',
    enabled: true,
    basePath: `/assets/graphic-packs/picture/${normalizedPackId}-v1/images`,
    entries
  };
}

export function rulePromptCardsToText(cards: RulePromptCardExport[]): string {
  return cards
    .map((card, index) => {
      const prefix = `[${index + 1}] ${card.roundTypeName} (${card.version === 'adult' ? '18+' : 'default'})`;
      return [
        prefix,
        `Category: ${card.category}`,
        `Hint: ${card.hint}`,
        `Main: ${card.mainPrompt}`,
        `Liar: ${card.liarPrompt}`,
        `Liar variant: ${card.liarVariant}`,
        `Banned words: ${card.bannedWords.join(', ')}`
      ].join('\n');
    })
    .join('\n\n');
}

export async function exportDlcTemplateZip(options: DlcTemplateExportOptions): Promise<void> {
  const zip = new JSZip();
  const root = 'dlc-import-template';
  const normalizedPackId = toSlug(options.packId);
  const normalizedThemeId = toSlug(options.themeId || 'default');
  const artworkByPath = new Map<string, Blob>();

  options.generatedArtwork.forEach((artwork) => {
    const candidatePath = artwork.assetPath?.trim();
    if (!candidatePath || !artwork.dataUrl) return;
    try {
      const normalized = candidatePath.replace(/^\/+/, '');
      artworkByPath.set(normalized, dataUrlToBlob(artwork.dataUrl));
    } catch (error) {
      console.error(error);
    }
  });

  const fallbackPng = placeholderPngBlob();
  const writeImage = (relativePath: string): void => {
    zip.file(`${root}/public/${relativePath}`, artworkByPath.get(relativePath) || fallbackPng);
  };

  // Prompt pack JS payload compatible with template shape.
  const promptCards = options.rulePromptCards.length
    ? options.rulePromptCards
    : [
        {
          id: `${normalizedPackId}-placeholder`,
          roundTypeId: 'prompt',
          roundTypeName: 'Hot Seat',
          category: options.packLabel,
          version: 'default' as const,
          hint: `${options.packLabel} sample`,
          mainPrompt: `${options.packLabel} main`,
          liarPrompt: `${options.packLabel} liar`,
          liarVariant: `${options.packLabel} liar variant`,
          bannedWords: []
        }
      ];

  const promptRoundDataPath = `${root}/src/data/packs/${normalizedPackId}/promptRoundData.js`;
  zip.file(promptRoundDataPath, buildPromptRoundDataModule(normalizedPackId, options.packLabel, promptCards));

  // Picture pack scaffold from template docs.
  const picturePackBase = `${root}/public/assets/graphic-packs/picture/${normalizedPackId}-v1`;
  zip.file(`${picturePackBase}/manifest.json`, JSON.stringify(buildPictureManifest(normalizedPackId, promptCards), null, 2));
  zip.file(
    `${picturePackBase}/images/README.md`,
    'Generated by Pants on Fire! Asset Tools.\nReplace placeholder images with final generated artwork if needed.\n'
  );
  promptCards.forEach((card, index) => {
    const base = `${card.roundTypeId}-${String(index + 1).padStart(3, '0')}`;
    zip.file(`${picturePackBase}/images/${base}-main.png`, fallbackPng);
    zip.file(`${picturePackBase}/images/${base}-imposter.png`, fallbackPng);
  });

  // Theme assets expected by template.
  const themeBase = `assets/themes/${normalizedThemeId}`;
  [
    `${themeBase}/cards/prompt-front.png`,
    `${themeBase}/cards/prompt-back.png`,
    `${themeBase}/cards/prompt-front-18.png`,
    `${themeBase}/cards/prompt-back-18.png`,
    `${themeBase}/icons/icons-sheet.png`,
    `${themeBase}/ui/banner.png`,
    `${themeBase}/characters/presenter.png`
  ].forEach(writeImage);

  // Optional round type logo.
  if (options.roundTypeIdForLogo) {
    writeImage(`assets/images/round-types/${toSlug(options.roundTypeIdForLogo)}-logo.png`);
  }

  // Include every generated asset path under public/ so exports map to expected structure.
  artworkByPath.forEach((blob, relativePath) => {
    zip.file(`${root}/public/${relativePath}`, blob);
  });

  const bundle = await zip.generateAsync({ type: 'blob' });
  downloadBlobFile(`${normalizedPackId}-dlc-import-template.zip`, bundle);
}
