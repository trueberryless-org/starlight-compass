import type { CompassClient, CompassProvider } from "./provider";

const MAX_BODY_LENGTH = 20_000;

/**
 * Creates a function handling POST requests with a JSON body, e.g. as an Astro endpoint. The `handle` function
 * receives the parsed body and a client, and returns the JSON response or a string with the validation error.
 */
export function createJsonHandler<T>(
  options: EndpointOptions,
  handle: (body: unknown, client: CompassClient) => Promise<T | string>
) {
  let client: CompassClient | undefined;

  return async function handler(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed." }, 405, {
        Allow: "POST",
      });
    }

    const body = await readJsonBody(request);
    if (body === undefined) {
      return jsonResponse({ error: "The request body must be JSON." }, 400);
    }

    client ??= options.provider.createClient({ env: options.env });
    if (!client) {
      console.error(
        `[starlight-compass] No \`${options.provider.name}\` provider is configured. ${options.provider.setupHint}`
      );
      return jsonResponse({ error: "The service is not available." }, 503);
    }

    try {
      const result = await handle(body, client);
      if (typeof result === "string")
        return jsonResponse({ error: result }, 400);

      return jsonResponse(result);
    } catch (error) {
      console.error("[starlight-compass] The provider failed.", error);
      return jsonResponse({ error: "The service is not available." }, 502);
    }
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isBoundedString(value: unknown, maxLength: number) {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maxLength
  );
}

async function readJsonBody(request: Request) {
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_LENGTH) return undefined;

    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function jsonResponse(body: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(body, {
    headers: { "Cache-Control": "no-store", ...headers },
    status,
  });
}

export interface EndpointOptions {
  /** Environment variables passed to the provider, e.g. `process.env`. */
  env: Record<string, string | undefined>;
  provider: CompassProvider;
}
