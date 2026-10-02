import { formatPercentage, getBooleanProbability } from "../libs/answers";
import { getPageTitle, getStringData, isReviewablePage } from "../libs/page";
import type { CompassQuestion } from "../libs/provider";
import type {
  CompassFinding,
  CompassPage,
  CompassRule,
  CompassRuleContext,
} from "../libs/rule";
import { getSimilarPages } from "../libs/similarity";

const KEY_PREFIX = "duplicate:";
const EXCERPT_LENGTH = 600;
const TRAILING_SLASHES_RE = /\/+$/;
const REGEXP_SPECIAL_CHARACTERS_RE = /[.*+?^${}()|[\]\\]/g;

/**
 * Finds pages covering the same topic that should be merged or cross-linked. A text similarity shortlists the
 * candidates, so the provider only decides about a few pairs per page.
 *
 * @see https://starlight-compass.netlify.app/reference/rules/#duplicates
 */
export function duplicates(options?: DuplicatesOptions): CompassRule {
  const flagAbove = options?.flagAbove ?? 0.8;
  const maxCandidates = options?.maxCandidates ?? 3;
  const minSimilarity = options?.minSimilarity ?? 0.25;

  function getCandidates(page: CompassPage, context: CompassRuleContext) {
    return getSimilarPages(page, context.pages.filter(isReviewablePage), {
      maxResults: maxCandidates,
      minSimilarity,
    })
      .map(({ page: candidate }) => candidate)
      .filter(
        (candidate) =>
          !linksTo(page, candidate.pathname) &&
          !linksTo(candidate, page.pathname)
      );
  }

  return {
    documentationUrl:
      "https://starlight-compass.netlify.app/reference/rules/#duplicates",
    name: "duplicates",
    getQuestions(page, context) {
      if (!isReviewablePage(page)) return;

      const candidates = getCandidates(page, context);
      if (candidates.length === 0) return;

      return Object.fromEntries(
        candidates.map((candidate) => [
          `${KEY_PREFIX}${candidate.pathname}`,
          getCandidateQuestion(candidate),
        ])
      );
    },
    getResult(page, answers, context) {
      const findings: CompassFinding[] = [];

      for (const candidate of getCandidates(page, context)) {
        const probability = getBooleanProbability(
          answers,
          `${KEY_PREFIX}${candidate.pathname}`
        );
        if (probability < flagAbove) continue;

        findings.push({
          level: "warning",
          message: `Covers the same topic as "${getPageTitle(candidate)}" (\`${candidate.pathname}\`), and neither page links to the other (${formatPercentage(probability)} probability). Merge the pages or cross-link them.`,
        });
      }

      return { findings };
    },
  };
}

function getCandidateQuestion(candidate: CompassPage): CompassQuestion {
  const description = getStringData(candidate, "description");
  const excerpt = candidate.body.trim().slice(0, EXCERPT_LENGTH);

  return {
    criteria: {
      false: "The pages cover different topics, even if they share some terms.",
      true: "The pages cover the same topic and a reader would be served by one page or by links between them.",
    },
    instructions: [
      "Does the documentation page in the state cover the same topic as the following other page, so much that both pages should be merged or link to each other?",
      `Title: ${getPageTitle(candidate)}`,
      description ? `Description: ${description}` : undefined,
      candidate.headings.length
        ? `Headings: ${candidate.headings.join("; ")}`
        : undefined,
      `Start of the page:\n${excerpt}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    type: "boolean",
  };
}

/** Whether the body of a page contains a link to a pathname, with or without trailing slash. */
function linksTo(page: CompassPage, pathname: string) {
  const path = pathname.replace(TRAILING_SLASHES_RE, "");
  if (!path) return false;

  const escaped = path.replace(REGEXP_SPECIAL_CHARACTERS_RE, "\\$&");

  return new RegExp(`${escaped}(?:[/#)"'\\s]|$)`).test(page.body);
}

export interface DuplicatesOptions {
  /**
   * The threshold of the probability that two pages cover the same topic above which they are reported.
   *
   * @default 0.8
   */
  flagAbove?: number;
  /**
   * The maximum number of similar pages to ask the provider about for every page.
   *
   * @default 3
   */
  maxCandidates?: number;
  /**
   * The text similarity between two pages, between `0` and `1`, below which the provider is not asked about them.
   * Lower it to find more distant duplicates at the cost of more questions.
   *
   * @default 0.25
   */
  minSimilarity?: number;
}
