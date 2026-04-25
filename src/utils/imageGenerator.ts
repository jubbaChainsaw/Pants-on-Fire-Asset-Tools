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
  const rankedPreferred = ['800x1200', '1024x1024', '1536x1024', 'auto'];
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

      return {
        id: `${prompt.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        promptId: prompt.id,
        promptTitle: prompt.title,
        variant: prompt.variant,
        side: prompt.side,
        dataUrl: responseToDataUrl(first),
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
