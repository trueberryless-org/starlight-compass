import { formatPercentage, getChoiceAnswer } from "../libs/answers";
import { throwPluginError } from "../libs/error";
import { getPageTitle, isReviewablePage } from "../libs/page";
import type { CompassRule } from "../libs/rule";

const TOPIC_QUESTION_KEY = "topic";

/**
 * Checks that every page belongs to the topic of its section, e.g. the topics defined for `starlight-sidebar-topics`.
 *
 * @see https://starlight-compass.netlify.app/reference/rules/#topics
 * @see https://github.com/HiDeoo/starlight-sidebar-topics
 */
export function topics(options: TopicsOptions): CompassRule {
  const minConfidence = options.minConfidence ?? 0.6;
  const topicList = getTopicList(options.topics);

  return {
    documentationUrl:
      "https://starlight-compass.netlify.app/reference/rules/#topics",
    name: "topics",
    getQuestions(page) {
      if (
        !isReviewablePage(page) ||
        !getDeclaredTopic(topicList, page.pathname)
      )
        return;

      return {
        [TOPIC_QUESTION_KEY]: {
          instructions:
            "Which topic of the documentation does this page belong to?",
          options: Object.fromEntries(
            topicList.map(({ description, label }) => [label, description])
          ),
          type: "choice",
        },
      };
    },
    getResult(page, answers) {
      const declared = getDeclaredTopic(topicList, page.pathname);
      const { choice: detected, confidence } = getChoiceAnswer(
        answers,
        TOPIC_QUESTION_KEY
      );
      const summary = `Fits the topic ${detected} (${formatPercentage(confidence)} confidence).`;

      if (!declared || detected === declared.label) {
        return { findings: [], summary };
      }

      return {
        findings: [
          confidence >= minConfidence
            ? {
                level: "warning",
                message: `"${getPageTitle(page)}" sits in the topic \`${declared.label}\` but reads like it belongs to the topic \`${detected}\` (${formatPercentage(confidence)} confidence).`,
              }
            : {
                level: "info",
                message: `Does not clearly match its topic \`${declared.label}\`. The best guess is \`${detected}\` (${formatPercentage(confidence)} confidence).`,
              },
        ],
        summary,
      };
    },
  };
}

function getTopicList(_topics: Topic[]) {
  if (_topics.length < 2) {
    throwPluginError("The `topics()` rule needs at least two topics.");
  }

  // The longest link is the most specific one, e.g. `/guides/advanced/` before `/guides/`.
  return _topics.toSorted((a, b) => b.link.length - a.link.length);
}

/**
 * Topics don't know their base or locale, so a link matches anywhere in the pathname.
 */
function getDeclaredTopic(topicList: Topic[], pathname: string) {
  return topicList.find(({ link }) => pathname.includes(ensureSlashes(link)));
}

function ensureSlashes(link: string) {
  return `/${link.replace(/^\/+|\/+$/g, "")}/`;
}

export interface Topic {
  /** Helps the provider understand what belongs to the topic. */
  description: string;
  /** The label of the topic, e.g. `Guides`. */
  label: string;
  /** The pathname prefix of the pages in the topic, e.g. `/guides/`. */
  link: string;
}

export interface TopicsOptions {
  /**
   * The confidence below which a mismatch is reported as unclear (`info`) instead of as a warning.
   *
   * @default 0.6
   */
  minConfidence?: number;
  /** The topics of the documentation, at least two. */
  topics: Topic[];
}
