import { describe, expect, test } from "vitest";

import type { CompassAnswer } from "../../libs/provider";
import { tags } from "../../rules/tags";
import { getTestContext, getTestPage } from "./utils";

describe("tags", () => {
  test("asks about every allowed tag", () => {
    const rule = tags({ tags: { cli: "Command line", config: "Configuration" } });

    const questions = rule.getQuestions(getTestPage(), getTestContext());

    expect(Object.keys(questions ?? {})).toEqual(["tag:cli", "tag:config"]);
    expect(questions?.["tag:cli"]?.instructions).toContain("(Command line)");
  });

  test("skips splash pages", () => {
    expect(tags({ tags: ["a"] }).getQuestions(getTestPage({ data: { template: "splash" } }), getTestContext())).toBeUndefined();
  });

  test("suggests missing tags and flags tags that do not fit", () => {
    const rule = tags({ tags: ["cli", "config", "api"] });
    const page = getTestPage({ data: { tags: ["config", "api"] } });

    const { findings } = rule.getResult(page, getAnswers({ api: 0.9, cli: 0.85, config: 0.1 }), getTestContext());

    expect(findings).toEqual([
      { level: "warning", message: "Consider adding the tag `cli` to the frontmatter (85% probability that it fits)." },
      { level: "warning", message: "The tag `config` does not seem to fit this page (10% probability that it fits)." },
    ]);
  });

  test("reports nothing for fitting tags", () => {
    const rule = tags({ tags: ["cli", "api"] });

    const { findings } = rule.getResult(
      getTestPage({ data: { tags: ["cli"] } }),
      getAnswers({ api: 0.4, cli: 0.9 }),
      getTestContext()
    );

    expect(findings).toEqual([]);
  });

  test("throws without allowed tags", () => {
    expect(() => tags({ tags: [] })).toThrow("needs at least one allowed tag");
  });
});

function getAnswers(probabilities: Record<string, number>): Record<string, CompassAnswer> {
  return Object.fromEntries(
    Object.entries(probabilities).map(([tag, probability]) => [`tag:${tag}`, { probability, type: "boolean" }])
  );
}
