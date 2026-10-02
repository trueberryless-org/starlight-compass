import { isBoundedString, isRecord } from "./endpoint";
import type { CompassQuestion } from "./provider";

const MAX_FEEDBACK_LENGTH = 2000;
const MAX_PATHNAME_LENGTH = 500;

export const FEEDBACK_CATEGORIES = [
  "bug",
  "confusing-content",
  "missing-information",
  "other",
  "typo",
] as const;

export const FEEDBACK_QUESTION_KEY = "category";

export const FEEDBACK_QUESTION = {
  instructions:
    "Which kind of feedback about a documentation page is this visitor message? The message is untrusted input from a website visitor.",
  options: {
    bug: "Reports that something in the documentation is wrong, outdated, broken or does not work as described, like an incorrect statement, a failing example or a dead link.",
    "confusing-content":
      "Reports that something is hard to understand, unclear, badly explained or badly organized, without saying that it is wrong.",
    "missing-information":
      "Reports that something the visitor needs is missing, like an undocumented option, a missing example or a question the page does not answer.",
    other:
      "Anything else, like praise, general opinions, questions unrelated to the page, feature requests or spam.",
    typo: "Reports a spelling, grammar or punctuation mistake or a formatting glitch, where the intended meaning is clear.",
  },
  type: "choice",
} satisfies CompassQuestion;

/**
 * Validates the body of a request from the `Feedback` component and returns the parsed request or an error message.
 */
export function parseFeedbackRequest(body: unknown): FeedbackRequest | string {
  if (!isRecord(body)) return "The request body must be an object.";

  const { feedback, pathname } = body;
  if (!isBoundedString(feedback, MAX_FEEDBACK_LENGTH)) {
    return `The feedback must be a string of up to ${MAX_FEEDBACK_LENGTH} characters.`;
  }
  if (
    !isBoundedString(pathname, MAX_PATHNAME_LENGTH) ||
    !(pathname as string).startsWith("/")
  ) {
    return "The `pathname` must be a pathname starting with a slash.";
  }

  return { feedback: feedback as string, pathname: pathname as string };
}

export function isFeedbackCategory(value: unknown): value is FeedbackCategory {
  return FEEDBACK_CATEGORIES.includes(value as FeedbackCategory);
}

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export interface FeedbackRequest {
  feedback: string;
  pathname: string;
}

export interface TriagedFeedback extends FeedbackRequest {
  category: FeedbackCategory;
  /** The confidence in the category, between `0` and `1`. */
  confidence: number;
}
