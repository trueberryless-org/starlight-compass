import { formatPercentage, getBooleanProbability } from "../libs/answers";
import {
  getStringData,
  getStringListData,
  isReviewablePage,
} from "../libs/page";
import type { CompassFinding, CompassPage, CompassRule } from "../libs/rule";

/**
 * Reviews the metadata of blog posts, e.g. the ones created with `starlight-blog`: the title, the teaser shown in
 * lists and previews, and the tags.
 *
 * @see https://starlight-compass.netlify.app/reference/rules/#blog
 * @see https://github.com/HiDeoo/starlight-blog
 */
export function blog(options?: BlogOptions): CompassRule {
  const flagBelow = options?.flagBelow ?? 0.5;
  const prefix = `${(options?.prefix ?? "blog").replace(/^\/+|\/+$/g, "")}/`;

  return {
    documentationUrl:
      "https://starlight-compass.netlify.app/reference/rules/#blog",
    name: "blog",
    getQuestions(page) {
      if (!isReviewablePage(page) || !isBlogPost(page.id, prefix)) return;

      return {
        ...(getTeaser(page)
          ? {
              teaser: {
                criteria: {
                  false:
                    "The teaser is generic, misleading, clickbait or gives away everything.",
                  true: "The teaser makes readers curious about the post and accurately reflects it.",
                },
                instructions:
                  "Does the excerpt or description of this blog post work as a teaser in a list of posts? It accurately reflects the post, is specific and makes a reader want to continue, without being clickbait.",
                type: "boolean",
              } as const,
            }
          : undefined),
        title: {
          criteria: {
            false: "The title is vague, generic or does not match the post.",
            true: "The title is specific and matches the post.",
          },
          instructions:
            "Is the title of this blog post informative and specific, and does it match what the post is about?",
          type: "boolean",
        },
      };
    },
    getResult(page, answers) {
      const findings: CompassFinding[] = [];

      if (!getTeaser(page)) {
        findings.push({
          level: "warning",
          message:
            "Add an `excerpt` or a `description` to the frontmatter, which blog lists and link previews show as a teaser.",
        });
      }
      if (getStringListData(page, "tags").length === 0) {
        findings.push({
          level: "info",
          message:
            "Add `tags` to the frontmatter to help readers find related posts.",
        });
      }

      const title = getBooleanProbability(answers, "title");
      if (title < flagBelow) {
        findings.push({
          level: "warning",
          message: `The title does not seem informative or specific (${formatPercentage(title)} probability that it is).`,
        });
      }

      if (answers["teaser"]) {
        const teaser = getBooleanProbability(answers, "teaser");
        if (teaser < flagBelow) {
          findings.push({
            level: "warning",
            message: `The teaser does not work well as a preview of the post (${formatPercentage(teaser)} probability that it does).`,
          });
        }
      }

      return { findings };
    },
  };
}

function isBlogPost(id: string, prefix: string) {
  return id.startsWith(prefix);
}

function getTeaser(page: CompassPage) {
  return getStringData(page, "excerpt") ?? getStringData(page, "description");
}

export interface BlogOptions {
  /**
   * The threshold of the probability that the title or the teaser is good below which it is reported.
   *
   * @default 0.5
   */
  flagBelow?: number;
  /**
   * The content collection ID prefix of the blog posts, matching the `prefix` option of `starlight-blog`.
   *
   * @default "blog"
   */
  prefix?: string;
}
