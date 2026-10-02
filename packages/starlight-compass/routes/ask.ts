import type { APIContext, APIRoute } from "astro";
import { ask } from "virtual:starlight-compass/ask-config";
import { provider } from "virtual:starlight-compass/ask-provider";

import { createAskHandler } from "../handlers";
import { createRequestGuard } from "../libs/guard";

export const prerender = false;

const handler = createAskHandler({
  env: getEnv(),
  maxPages: ask.maxPages,
  minProbability: ask.minProbability,
  provider,
});
const guard = createRequestGuard({ rateLimit: ask.rateLimit });

export const POST: APIRoute = (context) =>
  guard(context.request, getClientAddress(context)) ?? handler(context.request);

/**
 * `astro dev` exposes `.env` files through `import.meta.env`, while the built server only sees variables of the host,
 * so a `.env` file next to the server is loaded too. Hosts like Netlify set variables themselves, so a missing file is
 * fine.
 */
function getEnv() {
  try {
    globalThis.process?.loadEnvFile?.();
  } catch {}

  return { ...globalThis.process?.env, ...import.meta.env } as Record<
    string,
    string | undefined
  >;
}

/** Not every adapter knows the client address, in which case reading it throws. */
function getClientAddress(context: APIContext) {
  try {
    return context.clientAddress;
  } catch {
    return undefined;
  }
}
