import type { CompassAnswer, CompassQuestion } from "../libs/provider";
import type { CompassFinding, CompassPage, CompassRule } from "../libs/rule";

export const DIATAXIS_TYPES = [
  "explanation",
  "how-to",
  "reference",
  "tutorial",
] as const;

const DIATAXIS_TYPE_LABELS: Record<DiataxisType, string> = {
  explanation: "an explanation",
  "how-to": "a how-to guide",
  reference: "reference",
  tutorial: "a tutorial",
};

const MIXED_THRESHOLD = 0.5;

const DIATAXIS_QUESTIONS = {
  mixed: {
    instructions:
      "Does this documentation page mix several Diátaxis documentation types in a way that would read better as separate pages? For example, a tutorial that stops for long background discussions, or a how-to guide that embeds a full reference of every option.",
    type: "boolean",
  },
  type: {
    instructions:
      "Which Diátaxis documentation type best describes this documentation page?",
    options: {
      explanation:
        "Understanding-oriented discussion that gives context, background, reasoning and alternatives about a topic. Answers why, and is read away from the work.",
      "how-to":
        "Goal-oriented directions that help an already competent user solve a specific real-world problem or complete a task. Assumes the reader knows what they want to achieve.",
      reference:
        "Information-oriented, austere technical description of the machinery, like APIs, options, commands or components. Structured to be consulted rather than read.",
      tutorial:
        "Learning-oriented lesson that takes a beginner by the hand through a series of steps to build something, focused on acquiring skills and confidence rather than on a real task.",
    },
    type: "choice",
  },
} satisfies Record<string, CompassQuestion>;

/**
 * Classifies every page as a tutorial, how-to guide, reference or explanation, and reports pages that differ from
 * their declared `diataxis` frontmatter type or mix several types.
 *
 * @see https://starlight-compass.netlify.app/reference/rules/#diataxis
 * @see https://diataxis.fr
 */
export function diataxis(options?: DiataxisOptions): CompassRule {
  const minConfidence = options?.minConfidence ?? 0.6;

  return {
    documentationUrl:
      "https://starlight-compass.netlify.app/reference/rules/#diataxis",
    name: "diataxis",
    getQuestions(page) {
      const { body, data } = page;
      if (
        data["template"] === "splash" ||
        data["diataxis"] === false ||
        !body.trim()
      )
        return;

      return DIATAXIS_QUESTIONS;
    },
    getResult(page, answers) {
      return getDiataxisResult(getDeclaredType(page), answers, {
        minConfidence,
      });
    },
  };
}

export function isDiataxisType(value: unknown): value is DiataxisType {
  return DIATAXIS_TYPES.includes(value as DiataxisType);
}

export function getDiataxisResult(
  declared: DiataxisType | undefined,
  answers: Record<string, CompassAnswer>,
  options: Required<DiataxisOptions>
) {
  const { mixed, type } = answers;
  if (type?.type !== "choice" || !isDiataxisType(type.choice)) {
    throw new Error(
      "The provider returned an unexpected answer for the Diátaxis type."
    );
  }

  const { choice: detected, confidence } = type;
  const findings: CompassFinding[] = [];

  if (confidence < options.minConfidence) {
    findings.push({
      level: "info",
      message: `Does not clearly match one documentation type. The best guess is ${DIATAXIS_TYPE_LABELS[detected]} (${formatPercentage(confidence)} confidence).`,
    });
  } else if (declared && declared !== detected) {
    findings.push({
      level: "error",
      message: `Declared as ${DIATAXIS_TYPE_LABELS[declared]} but reads like ${DIATAXIS_TYPE_LABELS[detected]} (${formatPercentage(confidence)} confidence).`,
    });
  } else if (!declared) {
    findings.push({
      level: "info",
      message: `Add \`diataxis: ${detected}\` to the frontmatter to catch future drift.`,
    });
  }

  if (mixed?.type === "boolean" && mixed.probability >= MIXED_THRESHOLD) {
    findings.push({
      level: "warning",
      message: `Mixes several documentation types and could be split into separate pages (${formatPercentage(mixed.probability)} probability).`,
    });
  }

  return {
    findings,
    summary: `Reads like ${DIATAXIS_TYPE_LABELS[detected]} (${formatPercentage(confidence)} confidence).`,
  };
}

function getDeclaredType(page: CompassPage) {
  const declared = page.data["diataxis"];

  return isDiataxisType(declared) ? declared : undefined;
}

function formatPercentage(value: number) {
  return `${Math.round(value * 100)}%`;
}

export type DiataxisType = (typeof DIATAXIS_TYPES)[number];

export interface DiataxisOptions {
  /**
   * The confidence below which a classification is reported as unclear instead of as a mismatch.
   *
   * @default 0.6
   */
  minConfidence?: number;
}
