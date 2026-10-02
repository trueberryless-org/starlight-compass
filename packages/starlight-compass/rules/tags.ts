import { formatPercentage, getBooleanProbability } from "../libs/answers";
import { throwPluginError } from "../libs/error";
import { getStringListData, isReviewablePage } from "../libs/page";
import type { CompassQuestion } from "../libs/provider";
import type { CompassFinding, CompassRule } from "../libs/rule";

const TAG_KEY_PREFIX = "tag:";

/**
 * Suggests tags from a list of allowed tags, e.g. the tags defined for `starlight-tags`, and reports tags that don't
 * seem to fit the page.
 *
 * @see https://starlight-compass.netlify.app/reference/rules/#tags
 * @see https://github.com/frostybee/starlight-tags
 */
export function tags(options: TagsOptions): CompassRule {
  const allowedTags = getAllowedTags(options.tags);
  const suggestAbove = options.suggestAbove ?? 0.7;
  const flagBelow = options.flagBelow ?? 0.2;

  return {
    documentationUrl:
      "https://starlight-compass.netlify.app/reference/rules/#tags",
    name: "tags",
    getQuestions(page) {
      if (!isReviewablePage(page)) return;

      return Object.fromEntries(
        [...allowedTags].map(([tag, description]) => [
          `${TAG_KEY_PREFIX}${tag}`,
          getTagQuestion(tag, description),
        ])
      );
    },
    getResult(page, answers) {
      const declared = new Set(getStringListData(page, "tags"));
      const findings: CompassFinding[] = [];

      for (const tag of allowedTags.keys()) {
        const probability = getBooleanProbability(
          answers,
          `${TAG_KEY_PREFIX}${tag}`
        );

        if (!declared.has(tag) && probability >= suggestAbove) {
          findings.push({
            level: "warning",
            message: `Consider adding the tag \`${tag}\` to the frontmatter (${formatPercentage(probability)} probability that it fits).`,
          });
        } else if (declared.has(tag) && probability <= flagBelow) {
          findings.push({
            level: "warning",
            message: `The tag \`${tag}\` does not seem to fit this page (${formatPercentage(probability)} probability that it fits).`,
          });
        }
      }

      return { findings };
    },
  };
}

function getAllowedTags(_tags: TagsOptions["tags"]) {
  const allowedTags = new Map(
    Array.isArray(_tags)
      ? _tags.map((tag): [string, string | undefined] => [tag, undefined])
      : Object.entries(_tags)
  );

  if (allowedTags.size === 0) {
    throwPluginError("The `tags()` rule needs at least one allowed tag.");
  }

  return allowedTags;
}

function getTagQuestion(
  tag: string,
  description: string | undefined
): CompassQuestion {
  return {
    instructions: `Is "${tag}"${description ? ` (${description})` : ""} one of the main topics of this documentation page, so that a reader browsing pages by this tag would expect to find it?`,
    type: "boolean",
  };
}

export interface TagsOptions {
  /**
   * The threshold of the probability that a tag fits below which a declared tag is reported.
   *
   * @default 0.2
   */
  flagBelow?: number;
  /**
   * The threshold of the probability that a tag fits above which a missing tag is suggested.
   *
   * @default 0.7
   */
  suggestAbove?: number;
  /**
   * The allowed tags, either as a list or as a map of tags to descriptions. Descriptions help the provider
   * understand what a tag means.
   */
  tags: string[] | Record<string, string>;
}
