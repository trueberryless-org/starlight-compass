import { stripVTControlCharacters } from "node:util";

import { afterEach, describe, expect, test, vi } from "vitest";

import { getAuditReport } from "../../libs/report";
import type { CompassReview } from "../../libs/review";
import { cliReporter } from "../../reporters/cli";
import { renderGitHubActionsReport } from "../../reporters/github-actions";
import { getTestPage } from "./utils";

const root = new URL("file:///project/");

const report = getAuditReport(
  [
    {
      model: "jev-1.13.0",
      page: getTestPage(),
      results: [
        {
          documentationUrl: "https://example.com/rules/#diataxis",
          findings: [
            {
              level: "error",
              message:
                "Declared as a tutorial but reads like a how-to guide (90% confidence).",
            },
            {
              level: "warning",
              message:
                "Mixes several documentation types and could be split into separate pages (72% probability).",
            },
          ],
          rule: "diataxis",
        },
      ],
    } satisfies CompassReview,
  ],
  { failOn: "error", root }
);

describe("cliReporter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("prints findings grouped by file and a summary", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    await cliReporter.report(report, { env: {}, logger: {} as never });

    expect(
      stripVTControlCharacters(error.mock.calls.flat().join("\n"))
    ).toMatchInlineSnapshot(`
      "
        ╭─ src/content/docs/guides/deploy.md
        ·
      ✗ | Declared as a tutorial but reads like a how-to guide (90% confidence).
        · ╰── diataxis
      ⚠ | Mixes several documentation types and could be split into separate pages (72% probability).
        · ╰── diataxis

      ╭─                                      ─╮
      · Found 1 error and 1 warning in 1 file. ·
      ╰─                                      ─╯
      "
    `);
  });
});

describe("renderGitHubActionsReport", () => {
  test("renders a table linking files and rules", () => {
    expect(
      renderGitHubActionsReport(report, {
        GITHUB_REPOSITORY: "org/repo",
        GITHUB_SHA: "abc",
        GITHUB_WORKSPACE: "/project",
      })
    ).toMatchInlineSnapshot(`
      "
      ## Starlight Compass

      ❌ **Documentation audit failed.**

      Found 1 error and 1 warning in 1 file. Reviewed with \`jev-1.13.0\`.

      | File | Level | Finding | Rule |
      | --- | --- | --- | --- |
      | [\`src/content/docs/guides/deploy.md\`](https://github.com/org/repo/blob/abc/src/content/docs/guides/deploy.md?plain=1) | ❌ Error | Declared as a tutorial but reads like a how-to guide (90% confidence). | [diataxis](https://example.com/rules/#diataxis) |
      | [\`src/content/docs/guides/deploy.md\`](https://github.com/org/repo/blob/abc/src/content/docs/guides/deploy.md?plain=1) | ⚠️ Warning | Mixes several documentation types and could be split into separate pages (72% probability). | [diataxis](https://example.com/rules/#diataxis) |
      "
    `);
  });
});
