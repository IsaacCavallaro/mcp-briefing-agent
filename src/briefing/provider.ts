import OpenAI from "openai";

export type ModelProvider = "openai" | "openai-compatible";

export interface ResolvedProviderConfig {
  provider: ModelProvider;
  model: string;
  baseURL?: string;
  apiKey: string;
}

function normalizeProvider(value: string | undefined): ModelProvider | null {
  if (!value) {
    return null;
  }

  if (value === "openai" || value === "openai-compatible") {
    return value;
  }

  throw new Error(
    `Unsupported MODEL_PROVIDER "${value}". Expected "openai" or "openai-compatible".`
  );
}

export function resolveProviderConfig(): ResolvedProviderConfig {
  const provider = normalizeProvider(process.env.MODEL_PROVIDER) ?? "openai";
  const model = process.env.MODEL_NAME || process.env.OPENAI_MODEL || "gpt-5";
  const apiKey =
    process.env.MODEL_API_KEY || process.env.OPENAI_API_KEY || (provider === "openai-compatible" ? "local" : "");
  const baseURL = process.env.MODEL_BASE_URL;

  if (provider === "openai" && !apiKey) {
    throw new Error(
      "Live mode with MODEL_PROVIDER=openai requires MODEL_API_KEY or OPENAI_API_KEY."
    );
  }

  if (provider === "openai-compatible" && !baseURL) {
    throw new Error(
      "Live mode with MODEL_PROVIDER=openai-compatible requires MODEL_BASE_URL."
    );
  }

  return {
    provider,
    model,
    baseURL: provider === "openai-compatible" ? baseURL : undefined,
    apiKey
  };
}

export function createModelClient(config: ResolvedProviderConfig): OpenAI {
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL
  });
}
