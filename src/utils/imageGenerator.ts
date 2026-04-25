import { GeneratedArtwork, GeneratedPrompt, ImageGeneratorConfig, PromptGeneratorState } from '../types';

interface OpenAiImageItem {
  b64_json?: string;
  url?: string;
}

interface OpenAiImageResponse {
  data?: OpenAiImageItem[];
}

interface ApiErrorPayload {
  error?: {
    message?: string;
    param?: string;
    type?: string;
    code?: string;
  };
}

interface ParsedApiError {
  message: string;
  raw: string;
}

export interface ImageGenerationRequestOptions {
  timeoutMs?: number;
  maxRetries?: number;
  initialBackoffMs?: number;
}

const DEFAULT_REQUEST_OPTIONS: Required<ImageGenerationRequestOptions> = {
  timeoutMs: 90_000,
  maxRetries: 2,
  initialBackoffMs: 1_000
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function shouldRetryStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function responseToDataUrl(item: OpenAiImageItem): string {
  if (item.b64_json) {
    return `data:image/png;base64,${item.b64_json}`;
  }

  if (item.url) {
    return item.url;
  }

  throw new Error('Image API did not return b64_json or url.');
}

function parseResolution(resolution: string): { width: number; height: number } {
  const [widthRaw, heightRaw] = resolution.toLowerCase().split('x');
  const width = Number(widthRaw);
  const height = Number(heightRaw);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error(`Invalid resolution format: ${resolution}`);
  }
  return { width: Math.round(width), height: Math.round(height) };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Failed to convert image blob to data URL.'));
    };
    reader.onerror = () => reject(new Error('Failed to read image blob.'));
    reader.readAsDataURL(blob);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to decode generated image.'));
    image.src = dataUrl;
  });
}

async function ensureDataUrl(imageSource: string): Promise<string> {
  if (imageSource.startsWith('data:')) {
    return imageSource;
  }

  const response = await fetch(imageSource);
  if (!response.ok) {
    throw new Error(`Could not fetch generated image URL (${response.status}).`);
  }
  const blob = await response.blob();
  return blobToDataUrl(blob);
}

async function normalizeGeneratedImageSize(
  imageSource: string,
  targetWidth: number,
  targetHeight: number
): Promise<string> {
  const dataUrl = await ensureDataUrl(imageSource);
  const image = await loadImage(dataUrl);

  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight) {
    throw new Error('Generated image had invalid dimensions.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not initialize canvas context for image normalization.');
  }

  const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  const offsetX = (targetWidth - drawWidth) / 2;
  const offsetY = (targetHeight - drawHeight) / 2;

  context.clearRect(0, 0, targetWidth, targetHeight);
  context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

  return canvas.toDataURL('image/png');
}

function shouldRetryWithoutResponseFormat(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('response_format') &&
    (normalized.includes('unknown_parameter') ||
      normalized.includes('unknown parameter') ||
      normalized.includes('invalid_request_error'))
  );
}

function formatApiError(status: number, rawMessage: string): string {
  try {
    const parsed = JSON.parse(rawMessage) as ApiErrorPayload;
    const message = parsed.error?.message?.trim();
    return `Image generation failed (${status}): ${message || rawMessage || 'Unknown error'}`;
  } catch {
    return `Image generation failed (${status}): ${rawMessage || 'Unknown error'}`;
  }
}

function parseApiError(rawMessage: string): ParsedApiError {
  try {
    const parsed = JSON.parse(rawMessage) as ApiErrorPayload;
    return {
      message: parsed.error?.message?.trim() || rawMessage,
      raw: rawMessage
    };
  } catch {
    return {
      message: rawMessage,
      raw: rawMessage
    };
  }
}

function parseSupportedSizesFromMessage(message: string): string[] {
  const normalized = message.toLowerCase();
  const marker = 'supported sizes are';
  const markerIndex = normalized.indexOf(marker);
  if (markerIndex < 0) return [];

  const tail = message.slice(markerIndex + marker.length);
  const cleaned = tail.replace(/[.]/g, ' ').trim();
  return cleaned
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function chooseBestFallbackSize(supportedSizes: string[]): string | null {
  const rankedPreferred = ['800x1200', '1024x1536', '1024x1024', '1536x1024', 'auto'];
  for (const preferred of rankedPreferred) {
    if (supportedSizes.includes(preferred)) return preferred;
  }
  return supportedSizes[0] || null;
}

export async function generateArtworkImage(
  prompt: GeneratedPrompt,
  config: ImageGeneratorConfig,
  promptState: PromptGeneratorState,
  requestOptions: ImageGenerationRequestOptions = {}
): Promise<GeneratedArtwork> {
  if (!config.apiKey.trim()) {
    throw new Error('Image API key is required.');
  }

  const options: Required<ImageGenerationRequestOptions> = {
    ...DEFAULT_REQUEST_OPTIONS,
    ...requestOptions
  };

  let chosenSize = promptState.resolution;
  let includeQuality = true;
  let includeResponseFormat = true;

  let lastError: unknown = null;
  for (let attempt = 0; attempt <= options.maxRetries; attempt += 1) {
    try {
      const requestBody: Record<string, unknown> = {
        model: config.model,
        prompt: prompt.content,
        size: chosenSize,
        n: 1
      };
      if (includeQuality) requestBody.quality = config.quality;
      if (includeResponseFormat) requestBody.response_format = 'b64_json';

      const response = await fetchWithTimeout(
        config.endpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`
          },
          body: JSON.stringify(requestBody)
        },
        options.timeoutMs
      );

      if (!response.ok) {
        const message = await response.text();
        const parsedError = parseApiError(message);
        if (shouldRetryWithoutResponseFormat(parsedError.message)) {
          // Some OpenAI-compatible providers reject response_format.
          includeResponseFormat = false;
          continue;
        }
        if (parsedError.message.toLowerCase().includes('unknown parameter: quality')) {
          includeQuality = false;
          continue;
        }
        if (parsedError.message.toLowerCase().includes('invalid size')) {
          const supportedSizes = parseSupportedSizesFromMessage(parsedError.message);
          const fallbackSize = chooseBestFallbackSize(supportedSizes);
          if (fallbackSize && fallbackSize !== chosenSize) {
            chosenSize = fallbackSize;
            continue;
          }
        }
        if (parsedError.message.toLowerCase().includes('supported sizes are')) {
          const supportedSizes = parseSupportedSizesFromMessage(parsedError.message);
          const fallbackSize = chooseBestFallbackSize(supportedSizes);
          if (fallbackSize && fallbackSize !== chosenSize) {
            chosenSize = fallbackSize;
            continue;
          }
        }
        const retryable = shouldRetryStatus(response.status);
        if (retryable && attempt < options.maxRetries) {
          const backoff = options.initialBackoffMs * 2 ** attempt;
          await sleep(backoff);
          continue;
        }
        throw new Error(formatApiError(response.status, parsedError.raw));
      }

      const parsed = (await response.json()) as OpenAiImageResponse;
      const first = parsed.data?.[0];
      if (!first) {
        throw new Error('Image generation response did not include image data.');
      }

      const rawImageSource = responseToDataUrl(first);
      const { width: targetWidth, height: targetHeight } = parseResolution(promptState.resolution);
      const normalizedDataUrl = await normalizeGeneratedImageSize(rawImageSource, targetWidth, targetHeight);

      return {
        id: `${prompt.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        promptId: prompt.id,
        promptTitle: prompt.title,
        variant: prompt.variant,
        side: prompt.side,
        dataUrl: normalizedDataUrl,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      lastError = error;
      const isAbort = error instanceof DOMException && error.name === 'AbortError';
      const canRetry = attempt < options.maxRetries;
      if (canRetry) {
        const backoff = options.initialBackoffMs * 2 ** attempt;
        await sleep(backoff);
        continue;
      }

      if (isAbort) {
        throw new Error(`Image generation timed out after ${options.timeoutMs}ms.`);
      }
      throw error;
    }
  }

  throw (lastError as Error) ?? new Error('Image generation failed.');
}
