import { GeneratedArtwork, GeneratedPrompt, ImageGeneratorConfig, PromptGeneratorState } from '../types';

interface OpenAiImageItem {
  b64_json?: string;
  url?: string;
}

interface OpenAiImageResponse {
  data?: OpenAiImageItem[];
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

  const body = {
    model: config.model,
    prompt: prompt.content,
    size: promptState.resolution,
    quality: config.quality,
    response_format: 'b64_json',
    n: 1
  };

  let lastError: unknown = null;
  for (let attempt = 0; attempt <= options.maxRetries; attempt += 1) {
    try {
      const response = await fetchWithTimeout(
        config.endpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`
          },
          body: JSON.stringify(body)
        },
        options.timeoutMs
      );

      if (!response.ok) {
        const message = await response.text();
        const retryable = shouldRetryStatus(response.status);
        if (retryable && attempt < options.maxRetries) {
          const backoff = options.initialBackoffMs * 2 ** attempt;
          await sleep(backoff);
          continue;
        }
        throw new Error(`Image generation failed (${response.status}): ${message || 'Unknown error'}`);
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
