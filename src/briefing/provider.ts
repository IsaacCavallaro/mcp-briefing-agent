import OpenAI from "openai";

export type ModelProvider = "openai" | "openai-compatible" | "gemini";
export type ModelApiStyle = "responses" | "chat";

export interface ResolvedProviderConfig {
  provider: ModelProvider;
  model: string;
  baseURL?: string;
  apiKey: string;
  apiStyle: ModelApiStyle;
}

function normalizeProvider(value: string | undefined): ModelProvider | null {
  if (!value) {
    return null;
  }

  if (value === "openai" || value === "openai-compatible" || value === "gemini") {
    return value;
  }

  throw new Error(
    `Unsupported MODEL_PROVIDER "${value}". Expected "openai", "openai-compatible", or "gemini".`
  );
}

export function hasLiveModelConfig(): boolean {
  const provider = normalizeProvider(process.env.MODEL_PROVIDER) ?? "openai";

  if (provider === "openai") {
    return Boolean(process.env.MODEL_API_KEY || process.env.OPENAI_API_KEY);
  }

  if (provider === "openai-compatible") {
    return Boolean(process.env.MODEL_BASE_URL);
  }

  return Boolean(process.env.MODEL_API_KEY || process.env.GEMINI_API_KEY);
}

export function resolveProviderConfig(): ResolvedProviderConfig {
  const provider = normalizeProvider(process.env.MODEL_PROVIDER) ?? "openai";
  const model =
    process.env.MODEL_NAME ||
    (provider === "gemini" ? process.env.GEMINI_MODEL : process.env.OPENAI_MODEL) ||
    (provider === "gemini" ? "gemini-2.5-flash-lite" : "gpt-5");
  const apiKey =
    process.env.MODEL_API_KEY ||
    (provider === "gemini" ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY) ||
    (provider === "openai-compatible" ? "local" : "");
  const baseURL =
    provider === "gemini"
      ? process.env.MODEL_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai/"
      : process.env.MODEL_BASE_URL;

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

  if (provider === "gemini" && !apiKey) {
    throw new Error(
      "Live mode with MODEL_PROVIDER=gemini requires MODEL_API_KEY or GEMINI_API_KEY."
    );
  }

  return {
    provider,
    model,
    baseURL: provider === "openai" ? undefined : baseURL,
    apiKey,
    apiStyle: provider === "gemini" ? "chat" : "responses"
  };
}

export function createModelClient(config: ResolvedProviderConfig): OpenAI {
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL
  });
}
