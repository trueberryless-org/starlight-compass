import { describe, expect, test } from "vitest";

import type { CompassAnswer } from "../../libs/provider";
import { quality } from "../../rules/quality";
import { getTestContext, getTestPage } from "./utils";

describe("quality", () => {
  test("asks about the default rubrics", () => {
    const questions = quality().getQuestions(getTestPage({ data: { diataxis: "how-to" } }), getTestContext());

    expect(Object.keys(questions ?? {})).toEqual(["clarity", "prerequisites", "runnable-example"]);
    expect(questions?.["clarity"]).toMatchObject({ type: "score" });
  });

  test("only asks rubrics restricted to a documentation type about pages declaring it", () => {
    const rule = quality();

    expect(Object.keys(rule.getQuestions(getTestPage(), getTestContext()) ?? {})).toEqual(["clarity"]);
    expect(
      Object.keys(rule.getQuestions(getTestPage({ data: { diataxis: "reference" } }), getTestContext()) ?? {})
    ).toEqual(["clarity"]);
  });

  test("reports scores below the minimum", () => {
    const { findings } = quality({ rubrics: ["clarity", { id: "humor", instructions: "Is it funny?", level: "info" }] }).getResult(
      getTestPage(),
      { clarity: getScore(0.44), humor: getScore(0.2) },
      getTestContext()
    );

    expect(findings).toEqual([
      { level: "warning", message: 'Scores 0.4 out of 2 on the rubric "is written clearly", below the minimum of 1 (70% confidence).' },
      { level: "info", message: 'Scores 0.2 out of 2 on the rubric "humor", below the minimum of 1 (70% confidence).' },
    ]);
  });

  test("accepts scores reaching the minimum", () => {
    const { findings } = quality({ rubrics: ["clarity"] }).getResult(getTestPage(), { clarity: getScore(1.6) }, getTestContext());

    expect(findings).toEqual([]);
  });

  test("validates the rubrics", () => {
    expect(() => quality({ rubrics: [] })).toThrow("at least one rubric");
    expect(() => quality({ rubrics: ["unknown" as "clarity"] })).toThrow("Unknown quality rubric `unknown`.");
    expect(() => quality({ rubrics: ["clarity", "clarity"] })).toThrow("unique `id`");
    expect(() => quality({ rubrics: [{ id: "a", instructions: "?", minScore: 5 }] })).toThrow("must be between");
    expect(() => quality({ rubrics: [{ id: "a", instructions: "?", levels: ["Only"] }] })).toThrow("at least two levels");
  });
});

function getScore(score: number): CompassAnswer {
  return { confidence: 0.7, probabilities: [0.2, 0.5, 0.3], score, type: "score" };
}
