import { config } from '../config.js';

// ---------------------------------------------------------------------------
// AI chat-completions client (OpenAI-compatible REST, JSON mode). The active
// provider — Groq or GLM — is selected by AI_PROVIDER in config.ts.
// All AI calls funnel through `chatJson`, which returns null on any failure so
// callers can degrade to the rule-based engine instead of failing the request.
// ---------------------------------------------------------------------------

interface ChatChoiceMessage {
  content?: string | null;
}

interface ChatCompletionResponse {
  choices?: { message?: ChatChoiceMessage }[];
}

export const aiEnabled = () => Boolean(config.ai.apiKey);

/**
 * Sends a chat completion expecting a single JSON object back.
 * Resolves null when the key is missing, the API fails, or the payload is not
 * valid JSON — the caller decides the fallback.
 */
export async function chatJson<T>(system: string, user: string): Promise<T | null> {
  if (!aiEnabled()) return null;
  try {
    const res = await fetch(`${config.ai.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.ai.apiKey}`,
      },
      body: JSON.stringify({
        model: config.ai.model,
        temperature: 0.2,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      signal: AbortSignal.timeout(config.ai.timeoutMs),
    });
    if (!res.ok) {
      console.warn(`[ai:${config.ai.provider}] HTTP ${res.status} — bascule sur le moteur local`);
      return null;
    }
    const data = (await res.json()) as ChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.warn(`[ai:${config.ai.provider}] réponse vide — bascule sur le moteur local`);
      return null;
    }
    return JSON.parse(content) as T;
  } catch (err) {
    console.warn(`[ai:${config.ai.provider}] appel échoué — bascule sur le moteur local :`, err instanceof Error ? err.message : err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Coercion helpers — LLM output is validated before it reaches the DB/API.
// ---------------------------------------------------------------------------

export function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function asStringArray(value: unknown, max = 8): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter((v) => v.length > 0)
    .slice(0, max);
}
