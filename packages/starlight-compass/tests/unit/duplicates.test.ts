import { describe, expect, test } from "vitest";

import { getSimilarPages } from "../../libs/similarity";
import { duplicates } from "../../rules/duplicates";
import { getTestContext, getTestPage } from "./utils";

const deploy = getTestPage({
  body: "Deploy your site to Netlify. Build the site and upload the dist directory to Netlify.",
  data: { title: "Deploy to Netlify" },
  headings: ["Build the site", "Upload to Netlify"],
  pathname: "/guides/deploy/",
});
const hosting = getTestPage({
  body: "Host your site on Netlify. Build the site, then upload the dist directory to Netlify to publish it.",
  data: { title: "Hosting on Netlify" },
  headings: ["Build the site", "Upload to Netlify"],
  pathname: "/guides/hosting/",
});
const config = getTestPage({
  body: "Every option of the configuration file, with defaults and types for each option.",
  data: { title: "Configuration" },
  pathname: "/reference/configuration/",
});
const pages = [deploy, hosting, config];

describe("getSimilarPages", () => {
  test("ranks pages by similarity and ignores unrelated pages", () => {
    const similar = getSimilarPages(deploy, pages, { maxResults: 5, minSimilarity: 0.25 });

    expect(similar.map(({ page }) => page.pathname)).toEqual(["/guides/hosting/"]);
  });

  test("ignores pages in other locales", () => {
    const german = { ...hosting, locale: "de", pathname: "/de/guides/hosting/" };

    expect(getSimilarPages(deploy, [deploy, german], { maxResults: 5, minSimilarity: 0.1 })).toEqual([]);
  });
});

describe("duplicates", () => {
  const rule = duplicates();
  const key = "duplicate:/guides/hosting/";

  test("asks about similar pages", () => {
    const questions = rule.getQuestions(deploy, getTestContext(pages));

    expect(Object.keys(questions ?? {})).toEqual([key]);
    expect(questions?.[key]?.instructions).toContain("Title: Hosting on Netlify");
  });

  test("skips pages without similar pages", () => {
    expect(rule.getQuestions(config, getTestContext(pages))).toBeUndefined();
  });

  test("skips pages that already link to each other", () => {
    const linked = { ...deploy, body: `${deploy.body} See [hosting](/guides/hosting/).` };

    expect(rule.getQuestions(linked, getTestContext([linked, hosting, config]))).toBeUndefined();
  });

  test("reports confident duplicates", () => {
    const { findings } = rule.getResult(deploy, { [key]: { probability: 0.9, type: "boolean" } }, getTestContext(pages));

    expect(findings).toEqual([
      {
        level: "warning",
        message:
          'Covers the same topic as "Hosting on Netlify" (`/guides/hosting/`), and neither page links to the other (90% probability). Merge the pages or cross-link them.',
      },
    ]);
  });

  test("ignores unlikely duplicates", () => {
    const { findings } = rule.getResult(deploy, { [key]: { probability: 0.4, type: "boolean" } }, getTestContext(pages));

    expect(findings).toEqual([]);
  });
});
