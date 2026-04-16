import test from "node:test";
import assert from "node:assert/strict";

import { hasLiveModelConfig, resolveProviderConfig } from "../src/briefing/provider.js";

function withEnv(
  values: Record<string, string | undefined>,
  fn: () => void
): void {
  const previous = new Map<string, string | undefined>();

  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);

    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    fn();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("resolveProviderConfig supports openai", () => {
  withEnv(
    {
      MODEL_PROVIDER: "openai",
      MODEL_API_KEY: "test-key",
      MODEL_NAME: "gpt-5",
      MODEL_BASE_URL: undefined,
      OPENAI_API_KEY: undefined,
      OPENAI_MODEL: undefined
    },
    () => {
      const result = resolveProviderConfig();
      assert.equal(result.provider, "openai");
      assert.equal(result.apiKey, "test-key");
      assert.equal(result.model, "gpt-5");
      assert.equal(result.baseURL, undefined);
    }
  );
});

test("resolveProviderConfig supports openai-compatible endpoints", () => {
  withEnv(
    {
      MODEL_PROVIDER: "openai-compatible",
      MODEL_API_KEY: "local",
      MODEL_BASE_URL: "http://localhost:11434/v1",
      MODEL_NAME: "qwen",
      OPENAI_API_KEY: undefined,
      OPENAI_MODEL: undefined
    },
    () => {
      const result = resolveProviderConfig();
      assert.equal(result.provider, "openai-compatible");
      assert.equal(result.baseURL, "http://localhost:11434/v1");
      assert.equal(result.model, "qwen");
    }
  );
});

test("resolveProviderConfig rejects openai-compatible config without a base URL", () => {
  withEnv(
    {
      MODEL_PROVIDER: "openai-compatible",
      MODEL_API_KEY: "local",
      MODEL_BASE_URL: undefined,
      MODEL_NAME: "qwen",
      OPENAI_API_KEY: undefined,
      OPENAI_MODEL: undefined
    },
    () => {
      assert.throws(() => resolveProviderConfig(), /MODEL_BASE_URL/);
    }
  );
});

test("resolveProviderConfig supports gemini", () => {
  withEnv(
    {
      MODEL_PROVIDER: "gemini",
      MODEL_API_KEY: "gemini-test-key",
      MODEL_BASE_URL: undefined,
      MODEL_NAME: "gemini-2.5-flash-lite",
      GEMINI_API_KEY: undefined,
      GEMINI_MODEL: undefined
    },
    () => {
      const result = resolveProviderConfig();
      assert.equal(result.provider, "gemini");
      assert.equal(result.apiKey, "gemini-test-key");
      assert.equal(result.model, "gemini-2.5-flash-lite");
      assert.equal(
        result.baseURL,
        "https://generativelanguage.googleapis.com/v1beta/openai/"
      );
      assert.equal(result.apiStyle, "chat");
    }
  );
});

test("hasLiveModelConfig detects gemini keys", () => {
  withEnv(
    {
      MODEL_PROVIDER: "gemini",
      MODEL_API_KEY: undefined,
      GEMINI_API_KEY: "gemini-test-key",
      MODEL_BASE_URL: undefined
    },
    () => {
      assert.equal(hasLiveModelConfig(), true);
    }
  );
});
