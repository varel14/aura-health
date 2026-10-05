import 'dotenv/config';

// ---------------------------------------------------------------------------
// AI providers — both expose an OpenAI-compatible chat-completions endpoint,
// so a single REST client (services/aiClient.ts) serves whichever is selected.
// ---------------------------------------------------------------------------
const AI_PROVIDERS = {
  groq: {
    apiKey: process.env.GROQ_API_KEY || '',
    model: process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b',
    baseUrl: process.env.GROQ_BASE_URL ?? 'https://api.groq.com/openai/v1',
  },
  glm: {
    apiKey: process.env.GLM_API_KEY || '',
    model: process.env.GLM_MODEL ?? 'glm-4.6',
    baseUrl: process.env.GLM_BASE_URL ?? 'https://open.bigmodel.cn/api/paas/v4',
  },
} as const;

const AI_PROVIDER_RAW = process.env.AI_PROVIDER ?? 'groq';
const AI_PROVIDER: keyof typeof AI_PROVIDERS = AI_PROVIDER_RAW in AI_PROVIDERS ? (AI_PROVIDER_RAW as keyof typeof AI_PROVIDERS) : 'groq';

export const config = {
  port: Number(process.env.PORT ?? 4001),
  database: {
    host: process.env.PGHOST ?? '/run/postgresql',
    port: Number(process.env.PGPORT ?? 5432),
    database: process.env.PGDATABASE ?? 'aura_health',
    user: process.env.PGUSER ?? 'varel',
    password: process.env.PGPASSWORD || undefined,
  },
  /** Demo account PIN, seeded for the mock patient and doctor. */
  demoPin: process.env.DEMO_PIN ?? '1234',
  /** Groq or GLM powers the AI symptom analysis and the AI consultation
   * summary (AI_PROVIDER selects the provider). Without a key the routes
   * transparently fall back to the rule-based engine. */
  ai: {
    provider: AI_PROVIDER,
    ...AI_PROVIDERS[AI_PROVIDER],
    timeoutMs: 30_000,
  },
  /** Delivery fee in FCFA, mirrors the mobile checkout constant. */
  deliveryFee: 1000,
  sessionTtlDays: 30,
};
