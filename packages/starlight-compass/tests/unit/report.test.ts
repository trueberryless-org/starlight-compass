import { describe, expect, test } from "vitest";

import { formatAuditSummary, getAuditReport } from "../../libs/report";
import type { CompassReview } from "../../libs/review";
import type { CompassFinding } from "../../libs/rule";
import { getTestPage } from "./utils";

const root = new URL("file:///project/");

describe("getAuditReport", () => {
  test("groups errors and warnings by file and skips info findings", () => {
    const report = getAuditReport(
      [
        getReview([
          { level: "error", message: "Declared as a tutorial." },
          { level: "info", message: "Add a type." },
        ]),
        getReview([{ level: "warning", message: "Mixes types." }], {
          filePath: undefined,
          pathname: "/b/",
        }),
        getReview([{ level: "info", message: "Add a type." }], {
          pathname: "/c/",
        }),
      ],
      { failOn: "error", root }
    );

    expect(report).toMatchObject({
      errorCount: 1,
      isFailing: true,
      models: ["test-1.0.0"],
      pageCount: 3,
      warningCount: 1,
    });
    expect(
      report.files.map(({ displayPath, filePath, findings }) => ({
        displayPath,
        filePath,
        messages: findings.map(({ message }) => message),
      }))
    ).toEqual([
      {
        displayPath: "src/content/docs/guides/deploy.md",
        filePath: "/project/src/content/docs/guides/deploy.md",
        messages: ["Declared as a tutorial."],
      },
      { displayPath: "/b/", filePath: undefined, messages: ["Mixes types."] },
    ]);
  });

  test("does not count pages without applicable rules", () => {
    const skipped: CompassReview = {
      model: undefined,
      page: getTestPage(),
      results: [],
    };

    expect(getAuditReport([skipped], { failOn: "error", root }).pageCount).toBe(
      0
    );
  });

  test("respects the `failOn` level", () => {
    const warnings = [
      getReview([{ level: "warning", message: "Mixes types." }]),
    ];
    const errors = [
      getReview([{ level: "error", message: "Declared as a tutorial." }]),
    ];

    expect(getAuditReport(warnings, { failOn: "error", root }).isFailing).toBe(
      false
    );
    expect(
      getAuditReport(warnings, { failOn: "warning", root }).isFailing
    ).toBe(true);
    expect(getAuditReport(errors, { failOn: "error", root }).isFailing).toBe(
      true
    );
    expect(getAuditReport(errors, { failOn: "never", root }).isFailing).toBe(
      false
    );
  });
});

describe("formatAuditSummary", () => {
  test("summarizes passing and failing audits", () => {
    const passing = getAuditReport([getReview([]), getReview([])], {
      failOn: "error",
      root,
    });
    const failing = getAuditReport(
      [
        getReview([
          { level: "error", message: "A." },
          { level: "error", message: "B." },
          { level: "warning", message: "C." },
        ]),
      ],
      { failOn: "error", root }
    );

    expect(formatAuditSummary(passing)).toBe("All 2 pages passed the audit.");
    expect(formatAuditSummary(failing)).toBe(
      "Found 2 errors and 1 warning in 1 file."
    );
  });
});

function getReview(
  findings: CompassFinding[],
  page?: Parameters<typeof getTestPage>[0]
): CompassReview {
  return {
    model: "test-1.0.0",
    page: getTestPage(page),
    results: [{ findings, rule: "diataxis" }],
  };
}
