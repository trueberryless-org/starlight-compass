import { afterEach, describe, expect, test, vi } from "vitest";

import type { CompassRequest } from "../../libs/provider";
import { askTypesafe, typesafe } from "../../providers/typesafe";

const request: CompassRequest = {
  questions: {
    level: { instructions: "How advanced is this?", levels: ["Beginner", "Expert"], type: "score" },
    topic: { instructions: "Which topic?", options: { cli: null, config: "Configuration" }, type: "choice" },
    urgent: { criteria: { false: "Calm", true: "Urgent" }, instructions: "Is this urgent?", type: "boolean" },
  },
  state: "Help!",
};

const typesafeResponse = {
  answers: {
    level: {
      confidence: 0.9,
      legend: { "0": "Beginner", "1": "Expert" },
      probabilities: { "0": 0.95, "1": 0.05 },
      score: 0.05,
      type: "score",
    },
    topic: { choice: "cli", confidence: 0.8, probabilities: { cli: 0.9, config: 0.1 }, type: "choice" },
    urgent: { noul: 0.97, type: "noul" },
  },
  model: "jev-1.13.0",
  usage: { input_tokens: 300, output_tokens: 20 },
};

describe("typesafe", () => {
  test("creates a client with the API key from the environment", () => {
    expect(typesafe().createClient({ env: { TYPESAFE_API_KEY: "sk-test" } })?.id).toBe("typesafe/jev-latest");
    expect(typesafe({ model: "jev-1.13.0" }).createClient({ env: { TYPESAFE_API_KEY: "sk-test" } })?.id).toBe(
      "typesafe/jev-1.13.0"
    );
  });

  test("prefers the `apiKey` option over the environment", async () => {
    const fetch = vi.fn(async () => Response.json(typesafeResponse));
    const client = typesafe({ apiKey: "sk-option", fetch }).createClient({ env: { TYPESAFE_API_KEY: "sk-env" } });

    await client?.ask(request);

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer sk-option" }) })
    );
  });

  test("returns no client without an API key", () => {
    expect(typesafe().createClient({ env: {} })).toBeUndefined();
  });
});

describe("askTypesafe", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("maps questions and answers to and from the TypeSafe API", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => Response.json(typesafeResponse));

    const response = await askTypesafe(request, { apiKey: "sk-test", fetch, model: "jev-latest" });

    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({
      model: "jev-latest",
      questions: {
        level: { criteria: ["Beginner", "Expert"], instructions: "How advanced is this?", type: "score" },
        topic: { criteria: { cli: null, config: "Configuration" }, instructions: "Which topic?", type: "choice" },
        urgent: { criteria: { false: "Calm", true: "Urgent" }, instructions: "Is this urgent?", type: "noul" },
      },
      state: "Help!",
    });
    expect(response).toEqual({
      answers: {
        level: { confidence: 0.9, probabilities: [0.95, 0.05], score: 0.05, type: "score" },
        topic: { choice: "cli", confidence: 0.8, probabilities: { cli: 0.9, config: 0.1 }, type: "choice" },
        urgent: { probability: 0.97, type: "boolean" },
      },
      model: "jev-1.13.0",
    });
  });

  test("retries rate-limited requests", async () => {
    vi.useFakeTimers();
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 429 }))
      .mockResolvedValueOnce(Response.json(typesafeResponse));

    const response = askTypesafe(request, { apiKey: "sk-test", fetch, model: "jev-latest" });
    await vi.runAllTimersAsync();

    await expect(response).resolves.toMatchObject({ model: "jev-1.13.0" });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  test("throws a helpful error for an invalid API key", async () => {
    const fetch = vi.fn(async () => new Response("Unauthorized", { status: 401 }));

    await expect(askTypesafe(request, { apiKey: "sk-test", fetch, model: "jev-latest" })).rejects.toThrow(
      "TypeSafe rejected the API key."
    );
  });
});
