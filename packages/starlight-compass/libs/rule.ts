import type { CompassAnswer, CompassQuestion } from "./provider";

/**
 * A rule decides which questions to ask about a page and turns the answers into findings.
 *
 * @see https://starlight-compass.netlify.app/reference/rules/
 */
export interface CompassRule {
  /** A URL documenting the rule and its findings, linked from audit reports. */
  documentationUrl?: string;
  /**
   * Returns the questions to ask about a page, or `undefined` to skip the page. Returning no questions still calls
   * `getResult()`, which allows rules to report findings computed without a provider.
   */
  getQuestions(
    page: CompassPage,
    context: CompassRuleContext
  ): Record<string, CompassQuestion> | undefined;
  /** Turns the answers to the questions returned by `getQuestions()` into a result. */
  getResult(
    page: CompassPage,
    answers: Record<string, CompassAnswer>,
    context: CompassRuleContext
  ): CompassRuleResult;
  /** A unique name for the rule, e.g. `diataxis`. */
  name: string;
}

export interface CompassPage {
  /** The Markdown or MDX source of the page, without frontmatter. */
  body: string;
  /** The validated frontmatter of the page. */
  data: Record<string, unknown>;
  /** The path of the source file relative to the project root. */
  filePath: string | undefined;
  /** The text of the headings on the page. */
  headings: string[];
  /** The content collection entry ID. */
  id: string;
  /** The locale of the page, or `undefined` for sites without locales. */
  locale: string | undefined;
  /** The URL pathname of the page. */
  pathname: string;
  /** Where the page sits in the sidebar, or `undefined` if the sidebar does not link to it. */
  sidebar: CompassPageSidebar | undefined;
}

export interface CompassPageSidebar {
  /** The labels of the sidebar groups containing the page, from the outermost to the innermost group. */
  groups: string[];
  /** The labels of the other links in the innermost group. */
  siblings: string[];
}

export interface CompassRuleContext {
  /**
   * Every page known so far. Audits know all pages, while the dev toolbar only knows the pages rendered since the dev
   * server started.
   */
  pages: CompassPage[];
}

export interface CompassRuleResult {
  findings: CompassFinding[];
  /** A short sentence describing the verdict, e.g. `Reads like a how-to guide (92% confidence).` */
  summary?: string;
}

export interface CompassFinding {
  /** Audits report errors and warnings. Info findings only show up in the dev toolbar. */
  level: CompassFindingLevel;
  /** A full sentence. Wrap code in backticks. */
  message: string;
}

export type CompassFindingLevel = "error" | "info" | "warning";
