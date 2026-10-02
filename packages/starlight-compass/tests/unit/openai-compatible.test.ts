import { describe, expect, test, vi } from "vitest";

import type { CompassRequest } from "../../libs/provider";
import { askOpenAICompatible, openaiCompatible } from "../../providers/openai-compatible";

const request: CompassRequest = {
  questions: {
    level: { instructions: "How advanced is this?", levels: ["Beginner", "Intermediate", "Expert"], type: "score" },
    topic: { instructions: "Which topic?", options: { cli: null, config: "Configuration" }, type: "choice" },
    urgent: { criteria: { false: "Calm", true: "Urgent" }, instructions: "Is this urgent?", type: "boolean" },
  },
  state: "Help!",
};

const content = JSON.stringify({
  level: { probabilities: { "0": 0.1, "1": 0.2, "2": 0.7 } },
  topic: { probabilities: { cli: 0.9, config: 0.3 } },
  urgent: { probability: 1.2 },
});

function getFetch(body: unknown = { choices: [{ message: { content } }], model: "gpt-test-1" }, status = 200) {
  return vi.fn<typeof globalThis.fetch>(async () => Response.json(body, { status }));
}

describe("openaiCompatible", () => {
  test("creates a client with the API key from the environment", () => {
    expect(openaiCompatible().createClient({ env: { OPENAI_API_KEY: "sk-test" } })?.id).toBe(
      "openai-compatible/https://api.openai.com/v1/gpt-4o-mini"
    );
  });

  test("returns no client without an API key for the default API", () => {
    expect(openaiCompatible().createClient({ env: {} })).toBeUndefined();
  });

  test("creates a client without an API key for a custom base URL", () => {
    expect(openaiCompatible({ baseUrl: "http://localhost:11434/v1/", model: "llama3" }).createClient({ env: {} })?.id).toBe(
      "openai-compatible/http://localhost:11434/v1/llama3"
    );
  });
});

describe("askOpenAICompatible", () => {
  const options = { apiKey: "sk-test", baseUrl: "https://example.com/v1", model: "gpt-test" };

  test("requests structured outputs and maps the probabilities to answers", async () => {
    const fetch = getFetch();

    const response = await askOpenAICompatible(request, { ...options, fetch });

    expect(fetch.mock.calls[0]?.[0]).toBe("https://example.com/v1/chat/completions");
    const body = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body));
    expect(body.response_format.json_schema.schema.required).toEqual(["level", "topic", "urgent"]);
    expect(body.response_format.json_schema.schema.properties.topic.properties.probabilities.required).toEqual([
      "cli",
      "config",
    ]);
    expect(response.model).toBe("gpt-test-1");
    expect(response.answers["urgent"]).toEqual({ probability: 1, type: "boolean" });
    expect(response.answers["topic"]).toMatchObject({ choice: "cli", type: "choice" });
    expect(response.answers["topic"]).toMatchObject({ confidence: 0.75 });
    expect(response.answers["level"]).toMatchObject({ confidence: 0.7, probabilities: [0.1, 0.2, 0.7], type: "score" });
    expect((response.answers["level"] as { score: number }).score).toBeCloseTo(1.6);
  });

  test("sends the API key only when there is one", async () => {
    const fetch = getFetch();

    await askOpenAICompatible(request, { ...options, apiKey: undefined, fetch });

    expect(fetch.mock.calls[0]?.[1]?.headers).not.toHaveProperty("Authorization");
  });

  test("throws when the model returns an incomplete answer", async () => {
    const fetch = getFetch({ choices: [{ message: { content: JSON.stringify({ urgent: { probability: 0.5 } }) } }] });

    await expect(askOpenAICompatible(request, { ...options, fetch })).rejects.toThrow("invalid answer for the question `level`");
  });

  test("throws when the model does not return JSON", async () => {
    const fetch = getFetch({ choices: [{ message: { content: "Sure!" } }] });

    await expect(askOpenAICompatible(request, { ...options, fetch })).rejects.toThrow("did not return valid JSON");
  });

  test("throws a helpful error for a rejected API key", async () => {
    await expect(askOpenAICompatible(request, { ...options, fetch: getFetch({}, 401) })).rejects.toThrow("rejected the API key");
  });
});
