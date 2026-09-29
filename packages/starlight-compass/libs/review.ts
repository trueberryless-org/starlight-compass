import { type CompassCache, getCompassCacheKey } from "./cache";
import type { CompassAnswer, CompassClient, CompassQuestion } from "./provider";
import type { CompassFinding, CompassPage, CompassRule } from "./rule";

const QUESTION_KEY_SEPARATOR = "/";

/**
 * Asks the questions of every rule about a page in a single request and collects each rule's result.
 */
export async function reviewPage(
  page: CompassPage,
  context: ReviewContext
): Promise<CompassReview> {
  const { cache, client, rules } = context;

  const rulesQuestions = getRulesQuestions(page, rules);
  if (rulesQuestions.size === 0) return { model: undefined, page, results: [] };

  const request = {
    questions: getRequestQuestions(rulesQuestions),
    state: getPageState(page),
  };
  const key = getCompassCacheKey(client.id, request);
  const response = cache.get(key) ?? (await client.ask(request));
  cache.set(key, response);

  const results = [...rulesQuestions.keys()].map((rule) => ({
    documentationUrl: rule.documentationUrl,
    rule: rule.name,
    ...rule.getResult(page, getRuleAnswers(rule, response.answers)),
  }));

  return { model: response.model, page, results };
}

export function getReviewFindings(
  review: CompassReview
): CompassReviewFinding[] {
  return review.results.flatMap(({ documentationUrl, findings, rule }) =>
    findings.map((finding) => ({ ...finding, documentationUrl, rule }))
  );
}

function getRulesQuestions(page: CompassPage, rules: CompassRule[]) {
  const rulesQuestions = new Map<
    CompassRule,
    Record<string, CompassQuestion>
  >();

  for (const rule of rules) {
    const questions = rule.getQuestions(page);
    if (questions && Object.keys(questions).length > 0)
      rulesQuestions.set(rule, questions);
  }

  return rulesQuestions;
}

function getRequestQuestions(
  rulesQuestions: Map<CompassRule, Record<string, CompassQuestion>>
) {
  const questions: Record<string, CompassQuestion> = {};

  for (const [rule, ruleQuestions] of rulesQuestions) {
    for (const [key, question] of Object.entries(ruleQuestions)) {
      questions[`${rule.name}${QUESTION_KEY_SEPARATOR}${key}`] = question;
    }
  }

  return questions;
}

function getPageState(page: CompassPage) {
  const { body, data } = page;

  return { body, description: data["description"], title: data["title"] };
}

function getRuleAnswers(
  rule: CompassRule,
  answers: Record<string, CompassAnswer>
) {
  const prefix = `${rule.name}${QUESTION_KEY_SEPARATOR}`;
  const ruleAnswers: Record<string, CompassAnswer> = {};

  for (const [key, answer] of Object.entries(answers)) {
    if (key.startsWith(prefix)) ruleAnswers[key.slice(prefix.length)] = answer;
  }

  return ruleAnswers;
}

export interface CompassReview {
  model: string | undefined;
  page: CompassPage;
  results: CompassReviewResult[];
}

export interface CompassReviewResult {
  documentationUrl?: string | undefined;
  findings: CompassFinding[];
  rule: string;
  summary?: string;
}

export interface CompassReviewFinding extends CompassFinding {
  documentationUrl: string | undefined;
  rule: string;
}

interface ReviewContext {
  cache: CompassCache;
  client: CompassClient;
  rules: CompassRule[];
}
