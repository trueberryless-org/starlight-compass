import { afterEach, describe, expect, test, vi } from "vitest";

import { createAskHandler, createFeedbackHandler } from "../../handlers";
import type { CompassAnswer, CompassClient, CompassProvider } from "../../libs/provider";

const candidates = [
  { excerpt: "Run `npm run build`.", title: "Deploy", url: "/guides/deploy/" },
  { excerpt: "All the options.", title: "Configuration", url: "/reference/configuration/" },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createAskHandler", () => {
  test("returns the pages answering the question, most likely first", async () => {
    const { ask, provider } = getProvider({
      "page:0": { probability: 0.5, type: "boolean" },
      "page:1": { probability: 0.95, type: "boolean" },
    });

    const response = await createAskHandler({ env: {}, provider })(getRequest({ candidates, question: "How to deploy?" }));

    expect(await response.json()).toEqual({
      pages: [
        { probability: 0.95, title: "Configuration", url: "/reference/configuration/" },
        { probability: 0.5, title: "Deploy", url: "/guides/deploy/" },
      ],
      status: "answered",
    });
    expect(ask.mock.calls[0]?.[0].state).toEqual({
      pages: [
        { number: 1, start: "Run `npm run build`.", title: "Deploy" },
        { number: 2, start: "All the options.", title: "Configuration" },
      ],
      question: "How to deploy?",
    });
    expect(Object.keys(ask.mock.calls[0]?.[0].questions ?? {})).toEqual(["page:0", "page:1"]);
  });

  test("limits the number of pages", async () => {
    const { provider } = getProvider({
      "page:0": { probability: 0.5, type: "boolean" },
      "page:1": { probability: 0.9, type: "boolean" },
    });

    const response = await createAskHandler({ env: {}, maxPages: 1, provider })(
      getRequest({ candidates, question: "How to deploy?" })
    );

    expect(((await response.json()) as { pages: unknown[] }).pages).toHaveLength(1);
  });

  test("says so when no page answers the question", async () => {
    const { provider } = getProvider({
      "page:0": { probability: 0.2, type: "boolean" },
      "page:1": { probability: 0.1, type: "boolean" },
    });

    const response = await createAskHandler({ env: {}, provider })(getRequest({ candidates, question: "Why?" }));

    expect(await response.json()).toEqual({ status: "unanswered" });
  });

  test("rejects invalid requests", async () => {
    const { ask, provider } = getProvider({});
    const handler = createAskHandler({ env: {}, maxCandidates: 1, provider });

    expect((await handler(getRequest({ candidates, question: "Too many?" }))).status).toBe(400);
    expect((await handler(getRequest({ candidates: [], question: "None?" }))).status).toBe(400);
    expect((await handler(getRequest({ candidates: [{ title: "No URL" }], question: "?" }))).status).toBe(400);
    expect((await handler(getRequest({ candidates, question: "" }))).status).toBe(400);
    expect((await handler(getRequest({ candidates, question: "x".repeat(301) }))).status).toBe(400);
    expect((await handler(new Request("https://example.com", { body: "nope", method: "POST" }))).status).toBe(400);
    expect((await handler(new Request("https://example.com"))).status).toBe(405);
    expect(ask).not.toHaveBeenCalled();
  });

  test("is unavailable without a configured provider", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const provider: CompassProvider = { createClient: () => undefined, name: "test", setupHint: "Set a key." };

    const response = await createAskHandler({ env: {}, provider })(getRequest({ candidates, question: "?" }));

    expect(response.status).toBe(503);
  });

  test("hides provider failures", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const client: CompassClient = { ask: vi.fn().mockRejectedValue(new Error("secret")), id: "test" };
    const provider: CompassProvider = { createClient: () => client, name: "test", setupHint: "" };

    const response = await createAskHandler({ env: {}, provider })(getRequest({ candidates, question: "?" }));

    expect(response.status).toBe(502);
    expect(JSON.stringify(await response.json())).not.toContain("secret");
  });
});

describe("createFeedbackHandler", () => {
  const answers: Record<string, CompassAnswer> = {
    category: { choice: "typo", confidence: 0.93, probabilities: { typo: 0.93 }, type: "choice" },
  };

  test("classifies the feedback and passes it to the callback", async () => {
    const { ask, provider } = getProvider(answers);
    const onFeedback = vi.fn();

    const response = await createFeedbackHandler({ env: {}, onFeedback, provider })(
      getRequest({ feedback: "Teh docs have a typo.", pathname: "/guides/deploy/" })
    );

    expect(await response.json()).toEqual({ category: "typo", confidence: 0.93 });
    expect(onFeedback).toHaveBeenCalledWith({
      category: "typo",
      confidence: 0.93,
      feedback: "Teh docs have a typo.",
      pathname: "/guides/deploy/",
    });
    expect(ask.mock.calls[0]?.[0].state).toEqual({ feedback: "Teh docs have a typo." });
    expect(Object.keys((ask.mock.calls[0]?.[0].questions["category"] as { options: object }).options)).toEqual([
      "bug",
      "confusing-content",
      "missing-information",
      "other",
      "typo",
    ]);
  });

  test("rejects invalid feedback", async () => {
    const { provider } = getProvider(answers);
    const handler = createFeedbackHandler({ env: {}, onFeedback: vi.fn(), provider });

    expect((await handler(getRequest({ feedback: "", pathname: "/" }))).status).toBe(400);
    expect((await handler(getRequest({ feedback: "Hi", pathname: "https://evil.example" }))).status).toBe(400);
  });

  test("fails when the callback fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { provider } = getProvider(answers);
    const onFeedback = vi.fn().mockRejectedValue(new Error("GitHub is down"));

    const response = await createFeedbackHandler({ env: {}, onFeedback, provider })(
      getRequest({ feedback: "Hi", pathname: "/" })
    );

    expect(response.status).toBe(502);
  });
});

function getRequest(body: unknown) {
  return new Request("https://example.com/api", { body: JSON.stringify(body), method: "POST" });
}

function getProvider(answers: Record<string, CompassAnswer>) {
  const ask = vi.fn<CompassClient["ask"]>(async () => ({ answers, model: "test-1" }));
  const provider: CompassProvider = { createClient: () => ({ ask, id: "test" }), name: "test", setupHint: "" };

  return { ask, provider };
}
