import { describe, expect, test } from "vitest";

import { blog } from "../../rules/blog";
import { metadata } from "../../rules/metadata";
import { unfinished } from "../../rules/unfinished";
import { getTestContext, getTestPage } from "./utils";

const yes = { probability: 0.9, type: "boolean" } as const;
const no = { probability: 0.1, type: "boolean" } as const;

describe("metadata", () => {
  const rule = metadata();

  test("asks about the title and the description", () => {
    const page = getTestPage({ data: { description: "How to deploy.", title: "Deploy" } });

    expect(Object.keys(rule.getQuestions(page, getTestContext()) ?? {})).toEqual(["description", "title"]);
  });

  test("reports a missing description without asking about it", () => {
    const page = getTestPage();

    expect(Object.keys(rule.getQuestions(page, getTestContext()) ?? {})).toEqual(["title"]);
    expect(rule.getResult(page, { title: yes }, getTestContext()).findings.map(({ level }) => level)).toEqual(["warning"]);
  });

  test("reports a title and a description that do not fit", () => {
    const page = getTestPage({ data: { description: "Stuff.", title: "Misc" } });

    const { findings } = rule.getResult(page, { description: no, title: no }, getTestContext());

    expect(findings.map(({ message }) => message)).toEqual([
      "The title does not seem to describe the page accurately (10% probability that it does).",
      "The description does not seem to summarize the page accurately (10% probability that it does).",
    ]);
  });

  test("skips splash pages", () => {
    expect(rule.getQuestions(getTestPage({ data: { template: "splash" } }), getTestContext())).toBeUndefined();
  });
});

describe("blog", () => {
  const rule = blog();

  test("only reviews pages below the prefix", () => {
    expect(rule.getQuestions(getTestPage({ id: "guides/deploy" }), getTestContext())).toBeUndefined();
    expect(rule.getQuestions(getTestPage({ id: "blog/hello" }), getTestContext())).toBeDefined();
    expect(blog({ prefix: "/news/" }).getQuestions(getTestPage({ id: "news/hello" }), getTestContext())).toBeDefined();
  });

  test("asks about the teaser of the excerpt or the description", () => {
    const page = getTestPage({ data: { excerpt: "Teaser", title: "Hello" }, id: "blog/hello" });

    expect(Object.keys(rule.getQuestions(page, getTestContext()) ?? {})).toEqual(["teaser", "title"]);
  });

  test("reports missing metadata", () => {
    const { findings } = rule.getResult(getTestPage({ id: "blog/hello" }), { title: yes }, getTestContext());

    expect(findings.map(({ level }) => level)).toEqual(["warning", "info"]);
  });

  test("reports a weak title and teaser", () => {
    const page = getTestPage({ data: { description: "Read on!", tags: ["news"] }, id: "blog/hello" });

    const { findings } = rule.getResult(page, { teaser: no, title: no }, getTestContext());

    expect(findings.map(({ message }) => message)).toEqual([
      "The title does not seem informative or specific (10% probability that it is).",
      "The teaser does not work well as a preview of the post (10% probability that it does).",
    ]);
  });
});

describe("unfinished", () => {
  const rule = unfinished();

  test("reports placeholder content and stubs", () => {
    const { findings } = rule.getResult(getTestPage(), { placeholder: yes, stub: yes }, getTestContext());

    expect(findings.map(({ message }) => message)).toEqual([
      "Contains unfinished content or placeholder text (90% probability).",
      "Reads like a stub that does not explain its topic yet (90% probability).",
    ]);
  });

  test("reports nothing for finished pages", () => {
    expect(rule.getResult(getTestPage(), { placeholder: no, stub: no }, getTestContext()).findings).toEqual([]);
  });
});
