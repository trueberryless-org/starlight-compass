import { describe, expect, test, vi } from "vitest";

import type { CompassCache } from "../../libs/cache";
import { getReviewFindings, reviewPage } from "../../libs/review";
import type { CompassRule } from "../../libs/rule";
import { diataxis } from "../../rules/diataxis";
import { getTestClient, getTestPage } from "./utils";

describe("reviewPage", () => {
  test("asks the questions of every rule in a single request", async () => {
    const client = getTestClient();
    const rule: CompassRule = {
      getQuestions: () => ({ ok: { instructions: "Is this fine?", type: "boolean" } }),
      getResult: (_page, answers) => ({ findings: [], summary: `Answered ${Object.keys(answers).join(", ")}.` }),
      name: "custom",
    };

    const review = await reviewPage(getTestPage(), { cache: new Map(), client, rules: [diataxis(), rule] });

    expect(client.ask).toHaveBeenCalledTimes(1);
    expect(Object.keys(vi.mocked(client.ask).mock.calls[0]?.[0].questions ?? {})).toEqual([
      "diataxis/mixed",
      "diataxis/type",
      "custom/ok",
    ]);
    expect(review.results.map(({ rule, summary }) => ({ rule, summary }))).toEqual([
      { rule: "diataxis", summary: "Reads like a how-to guide (90% confidence)." },
      { rule: "custom", summary: "Answered ." },
    ]);
  });

  test("sends the title, description and body as state", async () => {
    const client = getTestClient();

    await reviewPage(getTestPage({ body: "Body", data: { description: "Desc", title: "Title" } }), {
      cache: new Map(),
      client,
      rules: [diataxis()],
    });

    expect(vi.mocked(client.ask).mock.calls[0]?.[0].state).toEqual({ body: "Body", description: "Desc", title: "Title" });
  });

  test("reuses cached responses", async () => {
    const cache: CompassCache = new Map();
    const client = getTestClient();

    await reviewPage(getTestPage(), { cache, client, rules: [diataxis()] });
    await reviewPage(getTestPage(), { cache, client, rules: [diataxis()] });

    expect(client.ask).toHaveBeenCalledTimes(1);
  });

  test("does not send a request when no rule applies", async () => {
    const client = getTestClient();

    const review = await reviewPage(getTestPage({ data: { template: "splash" } }), {
      cache: new Map(),
      client,
      rules: [diataxis()],
    });

    expect(review.results).toEqual([]);
    expect(client.ask).not.toHaveBeenCalled();
  });
});

describe("getReviewFindings", () => {
  test("flattens findings with their rule name", async () => {
    const review = await reviewPage(getTestPage({ data: { diataxis: "tutorial" } }), {
      cache: new Map(),
      client: getTestClient(),
      rules: [diataxis()],
    });

    expect(getReviewFindings(review)).toEqual([
      {
        documentationUrl:
          "https://starlight-compass.netlify.app/reference/rules/#diataxis",
        level: "error",
        message: "Declared as a tutorial but reads like a how-to guide (90% confidence).",
        rule: "diataxis",
      },
    ]);
  });
});
