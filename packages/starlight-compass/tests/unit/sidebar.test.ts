import { describe, expect, test } from "vitest";

import { getPageSidebar } from "../../libs/sidebar";
import { sidebar } from "../../rules/sidebar";
import { getTestContext, getTestPage } from "./utils";

describe("getPageSidebar", () => {
  test("returns the groups and siblings of the current page", () => {
    expect(
      getPageSidebar([
        { isCurrent: false, label: "Home", type: "link" },
        {
          entries: [
            {
              entries: [
                { isCurrent: false, label: "Cache", type: "link" },
                { isCurrent: true, label: "Deploy", type: "link" },
              ],
              label: "Advanced",
              type: "group",
            },
          ],
          label: "Guides",
          type: "group",
        },
      ])
    ).toEqual({ groups: ["Guides", "Advanced"], siblings: ["Cache"] });
  });

  test("returns undefined without a current page", () => {
    expect(getPageSidebar([{ isCurrent: false, label: "Home", type: "link" }])).toBeUndefined();
  });
});

describe("sidebar", () => {
  const rule = sidebar();
  const page = getTestPage({ sidebar: { groups: ["Guides"], siblings: ["Cache", "Deploy"] } });

  test("describes the group and its siblings", () => {
    const questions = rule.getQuestions(page, getTestContext());

    expect(questions?.["belongs"]?.instructions).toBe(
      'The sidebar of the documentation lists this page "Deploy" in the group "Guides", next to the pages "Cache", "Deploy". Does the page belong in this group?'
    );
  });

  test("skips pages outside of a group", () => {
    expect(rule.getQuestions(getTestPage(), getTestContext())).toBeUndefined();
    expect(rule.getQuestions(getTestPage({ sidebar: { groups: [], siblings: [] } }), getTestContext())).toBeUndefined();
  });

  test("reports pages unlikely to belong to their group", () => {
    const result = rule.getResult(page, { belongs: { probability: 0.1, type: "boolean" } }, getTestContext());

    expect(result.findings).toEqual([
      {
        level: "warning",
        message: "Sits in the sidebar group `Guides` but does not seem to belong there (10% probability that it does).",
      },
    ]);
  });

  test("accepts pages likely to belong to their group", () => {
    const result = rule.getResult(page, { belongs: { probability: 0.9, type: "boolean" } }, getTestContext());

    expect(result.findings).toEqual([]);
  });
});
