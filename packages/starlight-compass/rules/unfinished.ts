import { formatPercentage, getBooleanProbability } from "../libs/answers";
import { isReviewablePage } from "../libs/page";
import type { CompassFinding, CompassRule } from "../libs/rule";

/**
 * Finds pages with unfinished content, like TODO notes, placeholder text and stubs that announce a topic without
 * explaining it.
 *
 * @see https://starlight-compass.netlify.app/reference/rules/#unfinished
 */
export function unfinished(options?: UnfinishedOptions): CompassRule {
  const flagAbove = options?.flagAbove ?? 0.6;

  return {
    documentationUrl:
      "https://starlight-compass.netlify.app/reference/rules/#unfinished",
    name: "unfinished",
    getQuestions(page) {
      if (!isReviewablePage(page)) return;

      return {
        placeholder: {
          criteria: {
            false: "The page contains no unfinished parts.",
            true: "The page contains unfinished parts that readers would notice.",
          },
          instructions:
            "Does this documentation page contain unfinished content, like TODO or FIXME notes, lorem ipsum, empty headings, sections announced as coming soon or other placeholder text that was probably meant to be replaced before publishing?",
          type: "boolean",
        },
        stub: {
          criteria: {
            false: "The page explains its topic.",
            true: "The page only announces its topic without explaining it.",
          },
          instructions:
            "Is this documentation page a stub that only announces or introduces a topic without actually explaining it, so that a reader looking for information leaves empty-handed?",
          type: "boolean",
        },
      };
    },
    getResult(_page, answers) {
      const findings: CompassFinding[] = [];

      const placeholder = getBooleanProbability(answers, "placeholder");
      if (placeholder >= flagAbove) {
        findings.push({
          level: "warning",
          message: `Contains unfinished content or placeholder text (${formatPercentage(placeholder)} probability).`,
        });
      }

      const stub = getBooleanProbability(answers, "stub");
      if (stub >= flagAbove) {
        findings.push({
          level: "warning",
          message: `Reads like a stub that does not explain its topic yet (${formatPercentage(stub)} probability).`,
        });
      }

      return { findings };
    },
  };
}

export interface UnfinishedOptions {
  /**
   * The threshold of the probability of unfinished content above which a page is reported.
   *
   * @default 0.6
   */
  flagAbove?: number;
}
