import { describe, expect, test } from "vitest";

import type { CompassAnswer } from "../../libs/provider";
import { topics } from "../../rules/topics";
import { getTestContext, getTestPage } from "./utils";

const rule = topics({
  topics: [
    { description: "Learning to use it", label: "Guides", link: "/guides/" },
    { description: "Every option", label: "Reference", link: "/reference/" },
  ],
});

describe("topics", () => {
  test("asks about the topic of pages in a topic", () => {
    const questions = rule.getQuestions(getTestPage({ pathname: "/guides/deploy/" }), getTestContext());

    expect(questions?.["topic"]).toMatchObject({
      options: { Guides: "Learning to use it", Reference: "Every option" },
      type: "choice",
    });
  });

  test("skips pages outside of every topic", () => {
    expect(rule.getQuestions(getTestPage({ pathname: "/about/" }), getTestContext())).toBeUndefined();
  });

  test("matches topic links below a base or a locale", () => {
    expect(rule.getQuestions(getTestPage({ pathname: "/docs/de/guides/x/" }), getTestContext())).toBeDefined();
  });

  test("prefers the most specific topic link", () => {
    const nested = topics({
      topics: [
        { description: "A", label: "Guides", link: "/guides/" },
        { description: "B", label: "Advanced", link: "/guides/advanced/" },
      ],
    });
    const page = getTestPage({ pathname: "/guides/advanced/x/" });

    const { findings } = nested.getResult(page, getAnswers("Advanced", 0.9), getTestContext());

    expect(findings).toEqual([]);
  });

  test("reports a confident mismatch as a warning", () => {
    const { findings } = rule.getResult(
      getTestPage({ data: { title: "Deploy" }, pathname: "/guides/deploy/" }),
      getAnswers("Reference", 0.8),
      getTestContext()
    );

    expect(findings).toEqual([
      {
        level: "warning",
        message:
          '"Deploy" sits in the topic `Guides` but reads like it belongs to the topic `Reference` (80% confidence).',
      },
    ]);
  });

  test("reports an unclear mismatch as info", () => {
    const { findings } = rule.getResult(
      getTestPage({ pathname: "/guides/deploy/" }),
      getAnswers("Reference", 0.4),
      getTestContext()
    );

    expect(findings.map(({ level }) => level)).toEqual(["info"]);
  });

  test("throws with fewer than two topics", () => {
    expect(() => topics({ topics: [{ description: "A", label: "A", link: "/a/" }] })).toThrow("at least two topics");
  });
});

function getAnswers(choice: string, confidence: number): Record<string, CompassAnswer> {
  return { topic: { choice, confidence, probabilities: { [choice]: confidence }, type: "choice" } };
}
