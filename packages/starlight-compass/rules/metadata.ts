import { formatPercentage, getBooleanProbability } from "../libs/answers";
import { getStringData, isReviewablePage } from "../libs/page";
import type { CompassQuestion } from "../libs/provider";
import type { CompassFinding, CompassRule } from "../libs/rule";

const TITLE_QUESTION: CompassQuestion = {
  criteria: {
    false: "The title is vague, misleading or describes something else.",
    true: "The title tells the reader specifically what the page covers.",
  },
  instructions:
    "Does the title accurately and specifically describe what this documentation page covers?",
  type: "boolean",
};

const DESCRIPTION_QUESTION: CompassQuestion = {
  criteria: {
    false:
      "The description is generic, repeats the title or does not match the page.",
    true: "The description summarizes the page in a sentence or two without just repeating the title.",
  },
  instructions:
    "Does the frontmatter description accurately summarize this documentation page in one or two sentences, adding information beyond the title?",
  type: "boolean",
};

/**
 * Checks that the title and the description of a page match its content and that pages have a description.
 *
 * @see https://starlight-compass.netlify.app/reference/rules/#metadata
 */
export function metadata(options?: MetadataOptions): CompassRule {
  const flagBelow = options?.flagBelow ?? 0.5;

  return {
    documentationUrl:
      "https://starlight-compass.netlify.app/reference/rules/#metadata",
    name: "metadata",
    getQuestions(page) {
      if (!isReviewablePage(page)) return;

      return {
        ...(getStringData(page, "description")
          ? { description: DESCRIPTION_QUESTION }
          : undefined),
        title: TITLE_QUESTION,
      };
    },
    getResult(page, answers) {
      const findings: CompassFinding[] = [];

      if (!getStringData(page, "description")) {
        findings.push({
          level: "warning",
          message:
            "Add a `description` to the frontmatter to improve search results and link previews.",
        });
      }

      const title = getBooleanProbability(answers, "title");
      if (title < flagBelow) {
        findings.push({
          level: "warning",
          message: `The title does not seem to describe the page accurately (${formatPercentage(title)} probability that it does).`,
        });
      }

      if (answers["description"]) {
        const description = getBooleanProbability(answers, "description");
        if (description < flagBelow) {
          findings.push({
            level: "warning",
            message: `The description does not seem to summarize the page accurately (${formatPercentage(description)} probability that it does).`,
          });
        }
      }

      return { findings };
    },
  };
}

export interface MetadataOptions {
  /**
   * The threshold of the probability that the title or the description fits the page below which it is reported.
   *
   * @default 0.5
   */
  flagBelow?: number;
}
