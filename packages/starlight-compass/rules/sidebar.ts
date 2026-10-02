import { formatPercentage, getBooleanProbability } from "../libs/answers";
import { getPageTitle, isReviewablePage } from "../libs/page";
import type { CompassPage, CompassRule } from "../libs/rule";

const BELONGS_QUESTION_KEY = "belongs";
const MAX_SIBLINGS = 12;

/**
 * Reports pages that sit in a sidebar group they don't belong to.
 *
 * @see https://starlight-compass.netlify.app/reference/rules/#sidebar
 */
export function sidebar(options?: SidebarOptions): CompassRule {
  const flagBelow = options?.flagBelow ?? 0.3;

  return {
    documentationUrl:
      "https://starlight-compass.netlify.app/reference/rules/#sidebar",
    name: "sidebar",
    getQuestions(page) {
      if (!isReviewablePage(page) || !page.sidebar?.groups.length) return;

      return {
        [BELONGS_QUESTION_KEY]: {
          criteria: {
            false: "The page fits better in another part of the sidebar.",
            true: "The page fits well with its group and the pages next to it.",
          },
          instructions: getInstructions(page),
          type: "boolean",
        },
      };
    },
    getResult(page, answers) {
      const probability = getBooleanProbability(answers, BELONGS_QUESTION_KEY);
      const group = getGroupPath(page);

      if (probability >= flagBelow) {
        return {
          findings: [],
          summary: `Fits the sidebar group ${group} (${formatPercentage(probability)} probability).`,
        };
      }

      return {
        findings: [
          {
            level: "warning",
            message: `Sits in the sidebar group \`${group}\` but does not seem to belong there (${formatPercentage(probability)} probability that it does).`,
          },
        ],
      };
    },
  };
}

function getInstructions(page: CompassPage) {
  const siblings = page.sidebar?.siblings.slice(0, MAX_SIBLINGS) ?? [];
  const neighbors = siblings.length
    ? `next to the pages ${siblings.map((label) => `"${label}"`).join(", ")}`
    : "without any other pages";

  return `The sidebar of the documentation lists this page "${getPageTitle(page)}" in the group "${getGroupPath(page)}", ${neighbors}. Does the page belong in this group?`;
}

function getGroupPath(page: CompassPage) {
  return page.sidebar?.groups.join(" > ") ?? "";
}

export interface SidebarOptions {
  /**
   * The threshold of the probability that a page belongs to its group below which the page is reported.
   *
   * @default 0.3
   */
  flagBelow?: number;
}
