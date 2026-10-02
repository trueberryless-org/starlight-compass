import { formatPercentage, getScoreAnswer } from "../libs/answers";
import { throwPluginError } from "../libs/error";
import { isReviewablePage } from "../libs/page";
import type { CompassFindingLevel, CompassRule } from "../libs/rule";
import { type DiataxisType, isDiataxisType } from "./diataxis";

const DEFAULT_LEVELS = [
  "The page does not do this at all.",
  "The page does this partially or only implicitly.",
  "The page does this clearly and completely.",
];

export const QUALITY_RUBRICS = {
  clarity: {
    instructions:
      "Is this documentation page written clearly? Sentences are direct, terms are explained or linked when first used, and the reader never has to guess what is meant.",
    label: "is written clearly",
  },
  "next-steps": {
    diataxis: ["how-to", "tutorial"],
    instructions:
      "Does this documentation page end by telling the reader what to do or read next, e.g. with a summary of what they achieved and links to related pages?",
    label: "points to next steps",
  },
  prerequisites: {
    diataxis: ["how-to", "tutorial"],
    instructions:
      "Does this documentation page state what the reader needs before starting, e.g. required tools, versions, accounts or knowledge, or link to the pages that explain them?",
    label: "states its prerequisites",
  },
  "runnable-example": {
    diataxis: ["how-to", "tutorial"],
    instructions:
      "Does this documentation page contain a complete example that a reader can copy and run as is, e.g. a full code block or command sequence instead of fragments with omitted parts?",
    label: "has a runnable example",
  },
  scannable: {
    instructions:
      "Is this documentation page easy to scan? It uses descriptive headings, short paragraphs, lists or tables where they help, and puts the most important information first.",
    label: "is easy to scan",
  },
} as const satisfies Record<string, Omit<QualityRubric, "id">>;

/**
 * Rates pages against rubrics like "states its prerequisites" or "has a runnable example" and reports pages scoring
 * below a minimum.
 *
 * @see https://starlight-compass.netlify.app/reference/rules/#quality
 */
export function quality(options?: QualityOptions): CompassRule {
  const rubrics = resolveRubrics(
    options?.rubrics ?? ["clarity", "prerequisites", "runnable-example"]
  );

  return {
    documentationUrl:
      "https://starlight-compass.netlify.app/reference/rules/#quality",
    name: "quality",
    getQuestions(page) {
      if (!isReviewablePage(page)) return;

      return Object.fromEntries(
        rubrics
          .filter((rubric) => isRubricApplicable(rubric, page.data["diataxis"]))
          .map(({ id, instructions, levels }) => [
            id,
            { instructions, levels, type: "score" },
          ])
      );
    },
    getResult(page, answers) {
      const findings = [];

      for (const rubric of rubrics) {
        if (!isRubricApplicable(rubric, page.data["diataxis"])) continue;

        const { confidence, score } = getScoreAnswer(answers, rubric.id);
        if (score >= rubric.minScore) continue;

        findings.push({
          level: rubric.level,
          message: `Scores ${formatScore(score)} out of ${rubric.levels.length - 1} on the rubric "${rubric.label}", below the minimum of ${rubric.minScore} (${formatPercentage(confidence)} confidence).`,
        });
      }

      return { findings };
    },
  };
}

function resolveRubrics(
  rubrics: (QualityRubric | QualityRubricId)[]
): ResolvedRubric[] {
  const resolved = rubrics.map((rubric): ResolvedRubric => {
    const { id, ...definition } =
      typeof rubric === "string" ? getPresetRubric(rubric) : rubric;
    const levels = definition.levels ?? DEFAULT_LEVELS;
    const minScore = definition.minScore ?? 1;

    if (levels.length < 2)
      throwPluginError(
        `The quality rubric \`${id}\` needs at least two levels.`
      );
    if (minScore < 0 || minScore > levels.length - 1)
      throwPluginError(
        `The \`minScore\` of the quality rubric \`${id}\` must be between \`0\` and \`${levels.length - 1}\`.`
      );

    return {
      diataxis: definition.diataxis,
      id,
      instructions: definition.instructions,
      label: definition.label ?? id,
      level: definition.level ?? "warning",
      levels,
      minScore,
    };
  });

  if (resolved.length === 0)
    throwPluginError("The `quality()` rule needs at least one rubric.");
  if (new Set(resolved.map(({ id }) => id)).size !== resolved.length)
    throwPluginError("Every quality rubric must have a unique `id`.");

  return resolved;
}

function getPresetRubric(id: string): QualityRubric {
  if (!Object.hasOwn(QUALITY_RUBRICS, id)) {
    throwPluginError(
      `Unknown quality rubric \`${id}\`.`,
      `Use one of ${Object.keys(QUALITY_RUBRICS)
        .map((name) => `\`${name}\``)
        .join(", ")} or define your own rubric.`
    );
  }

  const preset: Omit<QualityRubric, "id"> =
    QUALITY_RUBRICS[id as QualityRubricId];

  return { ...preset, id };
}

/** Rubrics restricted to documentation types only apply to pages declaring one of them. */
function isRubricApplicable(rubric: ResolvedRubric, declared: unknown) {
  return (
    !rubric.diataxis ||
    (isDiataxisType(declared) && rubric.diataxis.includes(declared))
  );
}

function formatScore(score: number) {
  return (Math.round(score * 10) / 10).toString();
}

export type QualityRubricId = keyof typeof QUALITY_RUBRICS;

export interface QualityRubric {
  /**
   * Restricts the rubric to pages declaring one of these `diataxis` frontmatter types.
   * Without it, the rubric applies to every page.
   */
  diataxis?: readonly DiataxisType[];
  /** A unique identifier of the rubric. */
  id: string;
  /** What the provider scores, phrased as a question about the page. */
  instructions: string;
  /**
   * A short verb phrase describing what the page does when it meets the rubric, used in findings, e.g. `states its
   * prerequisites`.
   *
   * @default the `id`
   */
  label?: string;
  /**
   * The level of the finding reported for pages below `minScore`.
   *
   * @default "warning"
   */
  level?: CompassFindingLevel;
  /**
   * Descriptions of the score levels, from the lowest to the highest. The score is the probability-weighted index of
   * the levels.
   *
   * @default ["The page does not do this at all.", "The page does this partially or only implicitly.", "The page does this clearly and completely."]
   */
  levels?: string[];
  /**
   * The lowest score that passes, as an index into `levels`.
   *
   * @default 1
   */
  minScore?: number;
}

export interface QualityOptions {
  /**
   * The rubrics rating every page. Use the name of a built-in rubric or define your own.
   *
   * @default ["clarity", "prerequisites", "runnable-example"]
   */
  rubrics?: (QualityRubric | QualityRubricId)[];
}

interface ResolvedRubric extends Required<Omit<QualityRubric, "diataxis">> {
  diataxis: readonly DiataxisType[] | undefined;
}
