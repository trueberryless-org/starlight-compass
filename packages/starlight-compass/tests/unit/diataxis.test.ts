import { describe, expect, test } from "vitest";

import type { CompassAnswer } from "../../libs/provider";
import { diataxis, getDiataxisResult } from "../../rules/diataxis";
import { getTestPage } from "./utils";

const options = { minConfidence: 0.6 };

describe("diataxis", () => {
  test("asks about the type and mixing of documentation types", () => {
    expect(Object.keys(diataxis().getQuestions(getTestPage()) ?? {})).toEqual(["mixed", "type"]);
  });

  test("skips splash pages, excluded pages and empty pages", () => {
    const rule = diataxis();

    expect(rule.getQuestions(getTestPage({ data: { template: "splash" } }))).toBeUndefined();
    expect(rule.getQuestions(getTestPage({ data: { diataxis: false } }))).toBeUndefined();
    expect(rule.getQuestions(getTestPage({ body: "  \n" }))).toBeUndefined();
  });

  test("reads the declared type from the frontmatter", () => {
    const result = diataxis().getResult(getTestPage({ data: { diataxis: "tutorial" } }), getAnswers("how-to", 0.9));

    expect(result.findings.map(({ level }) => level)).toEqual(["error"]);
  });
});

describe("getDiataxisResult", () => {
  test("summarizes a matching page without findings", () => {
    expect(getDiataxisResult("how-to", getAnswers("how-to", 0.92), options)).toEqual({
      findings: [],
      summary: "Reads like a how-to guide (92% confidence).",
    });
  });

  test("suggests declaring the type of undeclared pages", () => {
    expect(getDiataxisResult(undefined, getAnswers("reference", 0.8), options).findings).toEqual([
      { level: "info", message: "Add `diataxis: reference` to the frontmatter to catch future drift." },
    ]);
  });

  test("reports a confident mismatch as an error", () => {
    expect(getDiataxisResult("tutorial", getAnswers("how-to", 0.84), options).findings).toEqual([
      { level: "error", message: "Declared as a tutorial but reads like a how-to guide (84% confidence)." },
    ]);
  });

  test("reports an unclear classification instead of a mismatch", () => {
    expect(getDiataxisResult("tutorial", getAnswers("explanation", 0.41), options).findings).toEqual([
      {
        level: "info",
        message: "Does not clearly match one documentation type. The best guess is an explanation (41% confidence).",
      },
    ]);
  });

  test("warns about pages mixing several documentation types", () => {
    expect(getDiataxisResult("reference", getAnswers("reference", 0.9, 0.72), options).findings).toEqual([
      {
        level: "warning",
        message: "Mixes several documentation types and could be split into separate pages (72% probability).",
      },
    ]);
  });

  test("throws on an unexpected answer", () => {
    expect(() => getDiataxisResult(undefined, getAnswers("changelog", 0.9), options)).toThrow(
      "The provider returned an unexpected answer for the Diátaxis type."
    );
  });
});

function getAnswers(choice: string, confidence: number, mixed = 0.1): Record<string, CompassAnswer> {
  return {
    mixed: { probability: mixed, type: "boolean" },
    type: { choice, confidence, probabilities: { [choice]: confidence }, type: "choice" },
  };
}
