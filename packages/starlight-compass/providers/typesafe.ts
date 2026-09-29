import { throwPluginError } from "../libs/error";
import type {
  CompassAnswer,
  CompassProvider,
  CompassQuestion,
  CompassRequest,
  CompassResponse,
} from "../libs/provider";

const TYPESAFE_ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const TYPESAFE_API_KEY_ENV = "TYPESAFE_API_KEY";
const MAX_ATTEMPTS = 4;
const RETRYABLE_STATUSES = new Set([429, 529]);

/**
 * Answers questions with a TypeSafe System One model, like Jev.
 *
 * @see https://starlight-compass.netlify.app/reference/providers/#typesafe
 * @see https://docs.typesafe.ai
 */
export function typesafe(options?: TypesafeOptions): CompassProvider {
  const model = options?.model ?? "jev-latest";

  return {
    name: "typesafe",
    setupHint: `Set the \`${TYPESAFE_API_KEY_ENV}\` environment variable, e.g. in a \`.env\` file, or pass the \`apiKey\` option to \`typesafe()\`.`,
    createClient({ env }) {
      const apiKey = options?.apiKey ?? env[TYPESAFE_API_KEY_ENV];
      if (!apiKey) return;

      return {
        ask: (request) =>
          askTypesafe(request, { apiKey, fetch: options?.fetch, model }),
        id: `typesafe/${model}`,
      };
    },
  };
}

export async function askTypesafe(
  request: CompassRequest,
  options: AskTypesafeOptions
): Promise<CompassResponse> {
  const { apiKey, fetch: _fetch = fetch, model } = options;

  const body = JSON.stringify({
    model,
    questions: Object.fromEntries(
      Object.entries(request.questions).map(([key, question]) => [
        key,
        toTypesafeQuestion(question),
      ])
    ),
    state: request.state,
  });

  for (let attempt = 1; ; attempt++) {
    const response = await _fetch(TYPESAFE_ENDPOINT, {
      body,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (response.ok)
      return fromTypesafeResponse((await response.json()) as TypesafeResponse);

    if (RETRYABLE_STATUSES.has(response.status) && attempt < MAX_ATTEMPTS) {
      await wait(500 * 2 ** (attempt - 1));
      continue;
    }

    throwTypesafeError(response.status, await response.text());
  }
}

function toTypesafeQuestion(question: CompassQuestion) {
  switch (question.type) {
    case "boolean":
      return {
        criteria: question.criteria,
        instructions: question.instructions,
        type: "noul",
      };
    case "choice":
      return {
        criteria: question.options,
        instructions: question.instructions,
        type: "choice",
      };
    case "score":
      return {
        criteria: question.levels,
        instructions: question.instructions,
        type: "score",
      };
  }
}

function fromTypesafeResponse(response: TypesafeResponse): CompassResponse {
  return {
    answers: Object.fromEntries(
      Object.entries(response.answers).map(([key, answer]) => [
        key,
        fromTypesafeAnswer(answer),
      ])
    ),
    model: response.model,
  };
}

function fromTypesafeAnswer(answer: TypesafeAnswer): CompassAnswer {
  switch (answer.type) {
    case "noul":
      return { probability: answer.noul, type: "boolean" };
    case "choice":
      return answer;
    case "score":
      return {
        confidence: answer.confidence,
        probabilities: Object.keys(answer.legend).map(
          (level) => answer.probabilities[level] ?? 0
        ),
        score: answer.score,
        type: "score",
      };
  }
}

function wait(delay: number) {
  return new Promise((resolve) => setTimeout(resolve, delay));
}

function throwTypesafeError(status: number, body: string): never {
  if (status === 401) {
    throwPluginError(
      "TypeSafe rejected the API key.",
      `Check the \`${TYPESAFE_API_KEY_ENV}\` environment variable or the \`apiKey\` option of \`typesafe()\`. You can create a key at https://console.typesafe.ai/settings/keys.`
    );
  }

  throwPluginError(`TypeSafe responded with status \`${status}\`: ${body}`);
}

export interface TypesafeOptions {
  /**
   * The TypeSafe API key. Prefer the `TYPESAFE_API_KEY` environment variable to keep the key out of your repository.
   *
   * @default process.env.TYPESAFE_API_KEY
   */
  apiKey?: string;
  /** A custom `fetch` implementation, e.g. to route requests through a proxy. */
  fetch?: typeof fetch;
  /**
   * The model to query. Pin a version like `jev-1.13.0` for reproducible results.
   *
   * @default "jev-latest"
   * @see https://docs.typesafe.ai/models
   */
  model?: string;
}

interface AskTypesafeOptions {
  apiKey: string;
  fetch: typeof fetch | undefined;
  model: string;
}

type TypesafeAnswer =
  | {
      choice: string;
      confidence: number;
      probabilities: Record<string, number>;
      type: "choice";
    }
  | { noul: number; type: "noul" }
  | {
      confidence: number;
      legend: Record<string, string>;
      probabilities: Record<string, number>;
      score: number;
      type: "score";
    };

interface TypesafeResponse {
  answers: Record<string, TypesafeAnswer>;
  model: string;
}
