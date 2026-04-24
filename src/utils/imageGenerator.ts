import { GeneratedArtwork, GeneratedPrompt, ImageGeneratorConfig, PromptGeneratorState } from '../types';

interface OpenAiImageItem {
  b64_json?: string;
  url?: string;
}

interface OpenAiImageResponse {
  data?: OpenAiImageItem[];
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
  promptState: PromptGeneratorState
): Promise<GeneratedArtwork> {
  if (!config.apiKey.trim()) {
    throw new Error('Image API key is required.');
  }

  const body = {
    model: config.model,
    prompt: prompt.content,
    size: promptState.resolution,
    quality: config.quality,
    response_format: 'b64_json',
    n: 1
  };

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const message = await response.text();
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
}
