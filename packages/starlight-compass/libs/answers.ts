import type { CompassAnswer } from "./provider";

export function formatPercentage(value: number) {
  return `${Math.round(value * 100)}%`;
}

/** Returns the probability of a yes to a boolean question. */
export function getBooleanProbability(
  answers: Record<string, CompassAnswer>,
  key: string
) {
  const answer = answers[key];
  if (answer?.type !== "boolean") throwUnexpectedAnswer(key);

  return answer.probability;
}

export function getChoiceAnswer(
  answers: Record<string, CompassAnswer>,
  key: string
) {
  const answer = answers[key];
  if (answer?.type !== "choice") throwUnexpectedAnswer(key);

  return answer;
}

export function getScoreAnswer(
  answers: Record<string, CompassAnswer>,
  key: string
) {
  const answer = answers[key];
  if (answer?.type !== "score") throwUnexpectedAnswer(key);

  return answer;
}

function throwUnexpectedAnswer(key: string): never {
  throw new Error(`The provider returned an unexpected answer for \`${key}\`.`);
}
